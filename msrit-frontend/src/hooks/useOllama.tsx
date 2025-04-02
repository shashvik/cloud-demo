
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// Define API endpoints
// Use relative URL which will be proxied to the backend service
const API_BASE_URL = 'http://localhost:5000/api';

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
};

export const useOllama = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'You are a helpful AI assistant.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Use a ref to track the current streaming message
  const streamingMessageRef = useRef<string>('');

  // Check connection to backend server
  const checkConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/models`, {
        method: 'GET',
      });
      
      if (response.ok) {
        setIsConnected(true);
        return true;
      } else {
        setIsConnected(false);
        setError('Could not connect to backend server');
        toast.error('Could not connect to backend server. Make sure the Flask server is running.');
        return false;
      }
    } catch (err) {
      setIsConnected(false);
      setError('Failed to connect to backend server');
      toast.error('Failed to connect to backend API. Is the Flask server running?');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send message to backend with streaming support
  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;
    
    // Add user message to chat
    const newUserMessage: Message = { role: 'user', content: userMessage };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Check connection first
      const connected = await checkConnection();
      if (!connected) return;
      
      // Prepare full conversation history
      const historyForPrompt = [...messages, newUserMessage];
      
      // Reset streaming state
      streamingMessageRef.current = '';
      
      // Create an initial empty streaming message
      const initialStreamingMessage: Message = {
        role: 'assistant',
        content: '',
        isStreaming: true
      };
      
      // Add the initial empty message that will be updated during streaming
      setMessages(prevMessages => [...prevMessages, initialStreamingMessage]);
      setIsStreaming(true);
      
      // Prepare the request payload
      const payload = {
        messages: historyForPrompt,
        model: 'gemma3:1b', // Using default model from backend config
      };
      
      // Create a controller to abort the fetch if needed
      const controller = new AbortController();
      const { signal } = controller;
      
      // Make the POST request to the streaming endpoint
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }
      
      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is null');
      }
      
      let fullResponse = '';
      
      // Read the stream
      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Stream is complete
              break;
            }
            
            // Decode the chunk
            const chunk = new TextDecoder().decode(value);
            
            // Process each line in the chunk (server-sent events format)
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  // Extract the JSON data
                  const jsonStr = line.substring(6); // Remove 'data: ' prefix
                  const data = JSON.parse(jsonStr);
                  
                  // Handle message content
                  if (data.message) {
                    const content = data.message.content || '';
                    
                    // Update the full response
                    fullResponse += content;
                    streamingMessageRef.current = fullResponse;
                    
                    // Update the streaming message in the messages array
                    setMessages(prevMessages => {
                      const newMessages = [...prevMessages];
                      const lastMessage = newMessages[newMessages.length - 1];
                      
                      if (lastMessage && lastMessage.isStreaming) {
                        lastMessage.content = fullResponse;
                      }
                      
                      return newMessages;
                    });
                  }
                  
                  // Handle completion
                  if (data.done) {
                    // Finalize the message when streaming is complete
                    setMessages(prevMessages => {
                      const newMessages = [...prevMessages];
                      const lastMessage = newMessages[newMessages.length - 1];
                      
                      if (lastMessage && lastMessage.isStreaming) {
                        lastMessage.isStreaming = false;
                      }
                      
                      return newMessages;
                    });
                    
                    setIsStreaming(false);
                    setIsLoading(false);
                    break;
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e, line);
                }
              }
            }
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
            console.error('Error reading stream:', e);
            throw e;
          }
        } finally {
          reader.releaseLock();
        }
      };
      
      // Start processing the stream
      await processStream();
      
      // Clean up
      controller.abort();
      setIsStreaming(false);
      setIsLoading(false);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
      
      // Add error message from AI
      setMessages(prevMessages => {
        // Check if the last message is a streaming message
        const lastMessage = prevMessages[prevMessages.length - 1];
        
        if (lastMessage && lastMessage.isStreaming) {
          // Replace the streaming message with an error message
          const newMessages = prevMessages.slice(0, -1);
          return [
            ...newMessages,
            {
              role: 'assistant',
              content: 'Sorry, I encountered an error while trying to respond. Please check if the backend server is running.',
            },
          ];
        } else {
          // Add a new error message
          return [
            ...prevMessages,
            {
              role: 'assistant',
              content: 'Sorry, I encountered an error while trying to respond. Please check if the backend server is running.',
            },
          ];
        }
      });
      
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, [messages, checkConnection]);

  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([{ role: 'system', content: 'You are a helpful AI assistant.' }]);
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    isConnected,
    sendMessage,
    clearChat,
    checkConnection,
  };
};
