# MSRIT Backend API for Ollama Chat

This is a Flask backend that provides a comprehensive API for interacting with Ollama LLM models. It serves as the backend for the MSRIT chat application and can be called from the frontend.

## Features

- Configurable Ollama model and port settings
- Both streaming and non-streaming API endpoints
- Support for both chat and completion APIs
- Server-Sent Events (SSE) for real-time streaming responses
- CORS support for frontend integration
- Simple HTML interface for testing

## Setup Instructions

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Make sure Ollama is installed and running on your machine.

3. Configure the settings in `config.py` if needed:
   - Change the Ollama model
   - Adjust port numbers
   - Configure CORS settings

4. Run the Flask server:
   ```
   python app.py
   ```

   The server will run on http://localhost:5000 by default.

## API Endpoints

### Get Available Models
```
GET /api/models
```
Returns a list of available models from Ollama.

### Chat (Non-streaming)
```
POST /api/chat
```
Sends a message to Ollama and returns the complete response.

Request body:
```json
{
  "model": "llama3",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "temperature": 0.7
}
```

### Chat (Streaming)
```
POST /api/chat/stream
```
Sends a message to Ollama and streams the response back using Server-Sent Events.

Request body: Same as the non-streaming endpoint.

### Generate Text (Non-streaming)
```
POST /api/generate
```
Generates text using Ollama's completion API.

Request body:
```json
{
  "model": "llama3",
  "prompt": "Write a poem about artificial intelligence",
  "temperature": 0.7
}
```

### Generate Text (Streaming)
```
POST /api/generate/stream
```
Generates text using Ollama's completion API and streams the response back.

Request body: Same as the non-streaming endpoint.

### Get Configuration
```
GET /api/config
```
Returns the current configuration settings for Ollama.

## Configuration

The `config.py` file allows you to customize:

- Flask server host and port
- Ollama host, port, and default model
- CORS allowed origins

## Using with the Frontend

The frontend can connect to this API using standard fetch or axios requests for non-streaming endpoints, and EventSource for streaming endpoints.

Example for streaming chat:
```javascript
const eventSource = new EventSource('/api/chat/stream');

fetch('/api/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      {role: 'system', content: 'You are a helpful assistant.'},
      {role: 'user', content: 'Hello, how are you?'}
    ],
    model: 'llama3'
  })
});

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  // Process the streaming response...
};
```
