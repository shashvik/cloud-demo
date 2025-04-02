import json
import requests
from typing import Dict, List, Optional, TypedDict, Callable, Any, AsyncGenerator, Generator
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import config
from langgraph.graph import StateGraph, END

# Flask app setup
app = Flask(__name__, static_folder='static')
CORS(app, origins=config.ALLOWED_ORIGINS)

# Define the state structure
class ChatState(TypedDict):
    messages: List[Dict[str, any]]  # Chat messages in the format expected by Ollama
    current_response: str           # Current response being generated
    model: str                      # Model to use for generation
    stream_handler: Optional[Callable[[str], None]]  # Optional handler for streaming

# Initialize the state
def create_initial_state(system_message: str = "You are a helpful AI assistant.", model: str = config.OLLAMA_MODEL) -> ChatState:
    return {
        "messages": [{"role": "system", "content": system_message}],
        "current_response": "",
        "model": model,
        "stream_handler": None
    }

# Define the nodes for the graph
def add_user_message(state: ChatState, user_message: str) -> ChatState:
    """Add a user message to the chat history"""
    return {
        **state,
        "messages": state["messages"] + [{"role": "user", "content": user_message}],
        "current_response": ""
    }

def generate_ollama_response(state: ChatState) -> ChatState:
    """Generate a response from Ollama"""
    url = f"{config.OLLAMA_API_BASE}/chat"
    
    payload = {
        "model": state["model"],
        "messages": state["messages"],
        "stream": False
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        if "message" in data and "content" in data["message"]:
            assistant_message = data["message"]
            return {
                **state,
                "messages": state["messages"] + [assistant_message],
                "current_response": assistant_message["content"]
            }
        else:
            error_message = {"role": "assistant", "content": "Sorry, I couldn't generate a response."}
            return {
                **state,
                "messages": state["messages"] + [error_message],
                "current_response": error_message["content"]
            }
    
    except Exception as e:
        error_message = {"role": "assistant", "content": f"Error: {str(e)}"}
        return {
            **state,
            "messages": state["messages"] + [error_message],
            "current_response": error_message["content"]
        }

def stream_ollama_response(state: ChatState) -> Generator[ChatState, None, None]:
    """Stream a response from Ollama, yielding updated states"""
    url = f"{config.OLLAMA_API_BASE}/chat"
    
    payload = {
        "model": state["model"],
        "messages": state["messages"],
        "stream": True
    }
    
    full_response = ""
    assistant_message = {"role": "assistant", "content": ""}
    
    try:
        with requests.post(url, json=payload, stream=True) as response:
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line.decode('utf-8'))
                        
                        # Extract content from the message
                        if "message" in data and "content" in data["message"]:
                            chunk = data["message"]["content"]
                            full_response += chunk
                            assistant_message["content"] = full_response
                            
                            # Update state with the current response
                            current_state = {
                                **state,
                                "current_response": full_response
                            }
                            
                            # Call the stream handler if provided
                            if state["stream_handler"]:
                                state["stream_handler"](json.dumps({
                                    "message": {"content": chunk},
                                    "done": False
                                }))
                            
                            yield current_state
                        
                        # Check if streaming is complete
                        if data.get("done", False):
                            break
                    
                    except json.JSONDecodeError:
                        pass
    
    except Exception as e:
        error_message = f"Error: {str(e)}"
        full_response = error_message
        assistant_message["content"] = error_message
        
        if state["stream_handler"]:
            state["stream_handler"](json.dumps({
                "error": error_message,
                "done": True
            }))
    
    # Final state with the complete response
    final_state = {
        **state,
        "messages": state["messages"] + [assistant_message],
        "current_response": full_response
    }
    
    # Signal completion to the stream handler
    if state["stream_handler"]:
        state["stream_handler"](json.dumps({"done": True}))
    
    yield final_state

# Build the graph for non-streaming chat
def build_chat_graph():
    workflow = StateGraph(ChatState)
    
    # Add nodes
    workflow.add_node("generate_response", generate_ollama_response)
    
    # Set entry point
    workflow.set_entry_point("generate_response")
    
    # Add edges (in this simple case, we just end after generating a response)
    workflow.add_edge("generate_response", END)
    
    return workflow.compile()

# Build the graph for streaming chat
def build_streaming_chat_graph():
    workflow = StateGraph(ChatState)
    
    # Add nodes
    workflow.add_node("stream_response", stream_ollama_response)
    
    # Set entry point
    workflow.set_entry_point("stream_response")
    
    # Add edges (in this simple case, we just end after streaming a response)
    workflow.add_edge("stream_response", END)
    
    return workflow.compile()

# Create the compiled graphs
chat_graph = build_chat_graph()
streaming_chat_graph = build_streaming_chat_graph()

# Flask routes
@app.route('/')
def index():
    """Serve the index page"""
    return app.send_static_file('index.html')

@app.route('/api/models', methods=['GET'])
def get_models():
    """Get available models from Ollama"""
    try:
        response = requests.get(f"{config.OLLAMA_API_BASE}/tags")
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": f"Failed to fetch models: {response.text}"}), 500
    except Exception as e:
        return jsonify({"error": f"Error connecting to Ollama: {str(e)}"}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """Chat endpoint for non-streaming responses using LangGraph"""
    data = request.json
    
    if not data or 'messages' not in data:
        return jsonify({"error": "Invalid request. 'messages' field is required."}), 400
    
    model = data.get('model', config.OLLAMA_MODEL)
    
    try:
        # Create initial state with user's messages
        system_message = next((msg["content"] for msg in data['messages'] if msg["role"] == "system"), "You are a helpful AI assistant.")
        initial_state = create_initial_state(system_message, model)
        
        # Add all non-system messages to the state
        state = initial_state.copy()
        state["messages"] = [msg for msg in data['messages']]
        
        # Run the graph
        result = chat_graph.invoke(state)
        
        # Return the final result
        return jsonify({
            "message": result["messages"][-1],
            "model": model
        })
    
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500

@app.route('/api/chat/stream', methods=['POST'])
def stream_chat():
    """Chat endpoint for streaming responses using LangGraph"""
    data = request.json
    
    if not data or 'messages' not in data:
        return jsonify({"error": "Invalid request. 'messages' field is required."}), 400
    
    model = data.get('model', config.OLLAMA_MODEL)
    
    def generate():
        try:
            # Create initial state with user's messages
            system_message = next((msg["content"] for msg in data['messages'] if msg["role"] == "system"), "You are a helpful AI assistant.")
            initial_state = create_initial_state(system_message, model)
            
            # Add all non-system messages to the state
            state = initial_state.copy()
            state["messages"] = [msg for msg in data['messages']]
            
            # Define a stream handler to yield SSE events
            def stream_handler(data_str):
                yield f"data: {data_str}\n\n"
            
            # Set up the stream handler in the state
            state["stream_handler"] = lambda data: None  # Placeholder, will be replaced in the loop
            
            # Run the streaming graph
            for output in streaming_chat_graph.stream(state):
                # Check for the stream_handler output
                if "__end__" in output:
                    break
                
                # The actual streaming happens through the stream_handler callback
                # which is called inside the stream_ollama_response node
                pass
            
        except Exception as e:
            error_msg = {'error': str(e)}
            yield f"data: {json.dumps(error_msg)}\n\n"
    
    # Create a custom generator that wraps the LangGraph streaming with SSE
    def sse_generator():
        try:
            # Create initial state with user's messages
            system_message = next((msg["content"] for msg in data['messages'] if msg["role"] == "system"), "You are a helpful AI assistant.")
            initial_state = create_initial_state(system_message, model)
            
            # Add all messages to the state
            state = initial_state.copy()
            state["messages"] = [msg for msg in data['messages']]
            
            # Create a buffer for the stream handler to send data through
            buffer = []
            event_ready = False
            
            # Define a stream handler that adds data to the buffer
            def stream_handler(data_str):
                nonlocal event_ready
                buffer.append(data_str)
                event_ready = True
            
            # Set the stream handler in the state
            state["stream_handler"] = stream_handler
            
            # Start the streaming graph in a separate thread
            import threading
            thread = threading.Thread(target=lambda: list(streaming_chat_graph.stream(state)))
            thread.daemon = True
            thread.start()
            
            # Yield data from the buffer as it becomes available
            while True:
                if event_ready and buffer:
                    data_str = buffer.pop(0)
                    yield f"data: {data_str}\n\n"
                    
                    # Check if we're done
                    try:
                        data = json.loads(data_str)
                        if data.get("done", False):
                            break
                    except:
                        pass
                    
                    # Reset the event flag if buffer is empty
                    if not buffer:
                        event_ready = False
                else:
                    # Small sleep to prevent CPU spinning
                    import time
                    time.sleep(0.01)
                    
                    # Check if thread is still alive
                    if not thread.is_alive() and not buffer:
                        # If thread died and buffer is empty, we're done
                        yield f"data: {{\"done\": true}}\n\n"
                        break
        
        except Exception as e:
            error_msg = {'error': str(e)}
            yield f"data: {json.dumps(error_msg)}\n\n"
            yield f"data: {{\"done\": true}}\n\n"
    
    return Response(stream_with_context(sse_generator()), content_type='text/event-stream')

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get the current configuration"""
    return jsonify({
        "ollama_model": config.OLLAMA_MODEL,
        "ollama_api_base": config.OLLAMA_API_BASE
    })

# Run the server
if __name__ == "__main__":
    print(f"Starting Flask server on {config.FLASK_HOST}:{config.FLASK_PORT}")
    print(f"Using Ollama at {config.OLLAMA_API_BASE} with model {config.OLLAMA_MODEL}")
    app.run(host=config.FLASK_HOST, port=config.FLASK_PORT, debug=config.FLASK_DEBUG)