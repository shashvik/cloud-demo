from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import requests
import json
import config

app = Flask(__name__, static_folder='static')
CORS(app, origins=config.ALLOWED_ORIGINS)

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
    """Chat endpoint for non-streaming responses"""
    data = request.json
    
    if not data or 'messages' not in data:
        return jsonify({"error": "Invalid request. 'messages' field is required."}), 400
    
    model = data.get('model', config.OLLAMA_MODEL)
    
    try:
        # Format the conversation history for Ollama
        payload = {
            "model": model,
            "messages": data['messages'],
            "stream": False
        }
        
        # Optional parameters
        if 'temperature' in data:
            payload['temperature'] = data['temperature']
        if 'top_p' in data:
            payload['top_p'] = data['top_p']
        if 'top_k' in data:
            payload['top_k'] = data['top_k']
        
        response = requests.post(
            f"{config.OLLAMA_API_BASE}/chat",
            json=payload
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": f"Ollama API error: {response.text}"}), response.status_code
    
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500

@app.route('/api/chat/stream', methods=['POST'])
def stream_chat():
    """Chat endpoint for streaming responses"""
    data = request.json
    
    if not data or 'messages' not in data:
        return jsonify({"error": "Invalid request. 'messages' field is required."}), 400
    
    model = data.get('model', config.OLLAMA_MODEL)
    
    def generate():
        try:
            # Format the conversation history for Ollama
            payload = {
                "model": model,
                "messages": data['messages'],
                "stream": True
            }
            
            # Optional parameters
            if 'temperature' in data:
                payload['temperature'] = data['temperature']
            if 'top_p' in data:
                payload['top_p'] = data['top_p']
            if 'top_k' in data:
                payload['top_k'] = data['top_k']
            
            with requests.post(
                f"{config.OLLAMA_API_BASE}/chat",
                json=payload,
                stream=True
            ) as response:
                if response.status_code != 200:
                    error_msg = {'error': f'Ollama API error: {response.text}'}
                    yield f"data: {json.dumps(error_msg)}\n\n"
                    return
                
                for line in response.iter_lines():
                    if line:
                        yield f"data: {line.decode('utf-8')}\n\n"
        
        except Exception as e:
            error_msg = {'error': str(e)}
            yield f"data: {json.dumps(error_msg)}\n\n"
    
    return Response(stream_with_context(generate()), content_type='text/event-stream')

@app.route('/api/generate', methods=['POST'])
def generate():
    """Generate endpoint for non-streaming text generation"""
    data = request.json
    
    if not data or 'prompt' not in data:
        return jsonify({"error": "Invalid request. 'prompt' field is required."}), 400
    
    model = data.get('model', config.OLLAMA_MODEL)
    
    try:
        payload = {
            "model": model,
            "prompt": data['prompt'],
            "stream": False
        }
        
        # Optional parameters
        if 'temperature' in data:
            payload['temperature'] = data['temperature']
        if 'top_p' in data:
            payload['top_p'] = data['top_p']
        if 'top_k' in data:
            payload['top_k'] = data['top_k']
        
        response = requests.post(
            f"{config.OLLAMA_API_BASE}/generate",
            json=payload
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": f"Ollama API error: {response.text}"}), response.status_code
    
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500

@app.route('/api/generate/stream', methods=['POST'])
def stream_generate():
    """Generate endpoint for streaming text generation"""
    data = request.json
    
    if not data or 'prompt' not in data:
        return jsonify({"error": "Invalid request. 'prompt' field is required."}), 400
    
    model = data.get('model', config.OLLAMA_MODEL)
    
    def generate_stream():
        try:
            payload = {
                "model": model,
                "prompt": data['prompt'],
                "stream": True
            }
            
            # Optional parameters
            if 'temperature' in data:
                payload['temperature'] = data['temperature']
            if 'top_p' in data:
                payload['top_p'] = data['top_p']
            if 'top_k' in data:
                payload['top_k'] = data['top_k']
            
            with requests.post(
                f"{config.OLLAMA_API_BASE}/generate",
                json=payload,
                stream=True
            ) as response:
                if response.status_code != 200:
                    error_msg = {'error': f'Ollama API error: {response.text}'}
                    yield f"data: {json.dumps(error_msg)}\n\n"
                    return
                
                for line in response.iter_lines():
                    if line:
                        yield f"data: {line.decode('utf-8')}\n\n"
        
        except Exception as e:
            error_msg = {'error': str(e)}
            yield f"data: {json.dumps(error_msg)}\n\n"
    
    return Response(stream_with_context(generate_stream()), content_type='text/event-stream')

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get the current configuration"""
    return jsonify({
        "ollama_model": config.OLLAMA_MODEL,
        "ollama_host": config.OLLAMA_HOST,
        "ollama_port": config.OLLAMA_PORT
    })

if __name__ == '__main__':
    print(f"Starting Flask server on {config.FLASK_HOST}:{config.FLASK_PORT}")
    print(f"Using Ollama at {config.OLLAMA_API_BASE} with model {config.OLLAMA_MODEL}")
    app.run(host=config.FLASK_HOST, port=config.FLASK_PORT, debug=config.FLASK_DEBUG)