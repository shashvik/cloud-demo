
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// Define API endpoints
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
      toast.error('Failed to connect to backend API. Is the Flask server running on localhost:5000?');
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
      
      // Use non-streaming endpoint first to avoid CORS issues with EventSource
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: historyForPrompt,
          model: 'gemma3:1b', // Using default model from backend config
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Update the message with the response
      if (responseData.message) {
        const content = responseData.message.content || '';
        
        // Update the streaming message in the messages array
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage && lastMessage.isStreaming) {
            lastMessage.content = content;
            lastMessage.isStreaming = false;
          }
          
          return newMessages;
        });
      } else if (responseData.error) {
        throw new Error(responseData.error);
      }
      
      // Finalize
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
