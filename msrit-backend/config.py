"""
Configuration settings for the Flask backend and Ollama integration.
"""

# Flask server configuration
FLASK_HOST = "0.0.0.0"
FLASK_PORT = 5000
FLASK_DEBUG = True

# Ollama configuration
OLLAMA_HOST = "ollama-service.msrit-chatbot.svc.cluster.local"
OLLAMA_PORT = 11434
OLLAMA_MODEL = "gemma3:1b"  # Default model
OLLAMA_API_BASE = f"http://{OLLAMA_HOST}:{OLLAMA_PORT}/api"

# CORS configuration
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React frontend default port
    "http://127.0.0.1:3000",
    "http://localhost:3001",  # React frontend default port
    "http://127.0.0.1:3001",
    "http://localhost:8081",  # Vite dev server port
    "http://127.0.0.1:8081",
    "http://localhost:8080",  # Another possible Vite dev server port
    "http://127.0.0.1:8080"
]
