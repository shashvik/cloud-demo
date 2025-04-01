import json
import requests
from typing import Dict, List, Optional, TypedDict
from langgraph.graph import StateGraph, END

# Define the state structure
class ChatState(TypedDict):
    history: List[Dict[str, any]]
    current_response: str

# Initialize the state
initial_state: ChatState = {
    "history": [{"role": "system", "content": "You are a helpful AI assistant."}],
    "current_response": ""
}

# Define the nodes
def user_input_node(state: ChatState):
    user_input = input("You: ")
    return {"history": state["history"] + [{"role": "user", "content": user_input}], "current_response": ""}

def stream_ollama_response(state: ChatState):
    url = "http://localhost:11434/api/generate"
    prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in state["history"]])
    
    payload = {
        "model": "llama3",
        "prompt": prompt,
        "stream": True
    }
    
    print("Assistant: ", end="", flush=True)
    full_response = ""
    
    try:
        with requests.post(url, json=payload, stream=True) as response:
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line.decode('utf-8'))
                        chunk = data.get("response", "")
                        print(chunk, end="", flush=True)
                        full_response += chunk
                        
                        if data.get("done", False):
                            print()  # New line when done
                            break
                    except json.JSONDecodeError:
                        print("\nError decoding JSON response", flush=True)
    
    except requests.exceptions.RequestException as e:
        print(f"\nAn error occurred: {e}", flush=True)
        full_response = f"[Error: {str(e)}]"
    
    return {
        "history": state["history"] + [{"role": "assistant", "content": full_response}],
        "current_response": full_response
    }

# Define the graph workflow
def should_continue(state: ChatState):
    last_message = state["history"][-1]["content"].lower()
    if any(word in last_message for word in ["goodbye", "exit"]):
        return END
    return "get_user_input"

# Build the graph
workflow = StateGraph(ChatState)

# Add nodes
workflow.add_node("get_user_input", user_input_node)
workflow.add_node("generate_response", stream_ollama_response)

# Set entry point
workflow.set_entry_point("get_user_input")

# Add edges
workflow.add_edge("get_user_input", "generate_response")
workflow.add_conditional_edges(
    "generate_response",
    should_continue,
    {
        "get_user_input": "get_user_input",
        END: END
    }
)

# Compile the graph
app = workflow.compile()

# Run the chat
if __name__ == "__main__":
    print("Starting chat with Ollama. Type 'exit' or 'goodbye' to end.")
    
    try:
        for output in app.stream(initial_state):
            for key, value in output.items():
                if key == "__end__":
                    break
                
    except KeyboardInterrupt:
        print("\nConversation ended by user.")