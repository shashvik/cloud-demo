
import React, { useState, useRef, useEffect } from 'react';
import { useOllama, Message } from '../hooks/useOllama';
import TypewriterEffect from './TypewriterEffect';
import { Send, RefreshCw } from 'lucide-react';

const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [currentlyTypingMessage, setCurrentlyTypingMessage] = useState<Message | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, isStreaming, sendMessage, clearChat, checkConnection, isConnected } = useOllama();

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, showTyping]);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userInput = input.trim();
    // Clear input immediately before sending to ensure it's cleared
    setInput('');
    await sendMessage(userInput);
  };

  // Message bubble component
  const MessageBubble = ({ message, index }: { message: Message, index: number }) => {
    const isUser = message.role === 'user';
    
    // Don't render system messages
    if (message.role === 'system') return null;
    
    // Check if this is a streaming message
    const isStreamingMessage = !isUser && message.isStreaming === true;
    
    // Only the last assistant message can be typing (for non-streaming messages)
    const isLastAssistantMessage = !isUser && 
      index === messages.filter(m => m.role !== 'system').length - 1 &&
      message.role === 'assistant' &&
      !isStreamingMessage;
    
    // If this is an assistant message that's currently being typed out
    const isCurrentlyTyping = isLastAssistantMessage && 
                             currentlyTypingMessage?.content === message.content && 
                             showTyping;
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div 
          className={`max-w-[80%] p-3 rounded-lg ${
            isUser 
              ? 'bg-cyber-blue/10 text-white border border-cyber-blue/20' 
              : 'bg-black/50 text-gray-200 border border-white/5'
          }`}
          style={{ wordBreak: 'break-word' }}
        >
          {isStreamingMessage ? (
            // For streaming messages, just show the content as it updates
            <div className="whitespace-pre-wrap streaming-text">
              {message.content}
              <span className="streaming-cursor">▋</span>
            </div>
          ) : isCurrentlyTyping ? (
            // For non-streaming messages that use the typewriter effect
            <TypewriterEffect 
              text={message.content} 
              speed={20} 
              onComplete={() => {
                // Only mark typing as complete, but don't remove the message
                setShowTyping(false);
                setCurrentlyTypingMessage(null);
              }}
            />
          ) : (
            // For regular messages
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
      </div>
    );
  };

  // Track processed messages to avoid re-processing
  const processedMessagesRef = useRef<Set<string>>(new Set());
  
  // When a new assistant message comes in, show typing effect (only for non-streaming messages)
  useEffect(() => {
    // Find the last assistant message that hasn't been processed yet and is not a streaming message
    const lastAssistantMessage = [...messages].reverse().find(m => 
      m.role === 'assistant' && 
      !m.isStreaming && 
      !processedMessagesRef.current.has(m.content)
    );
    
    if (lastAssistantMessage && !showTyping && !currentlyTypingMessage && !isStreaming) {
      // Mark this message as processed
      processedMessagesRef.current.add(lastAssistantMessage.content);
      setCurrentlyTypingMessage(lastAssistantMessage);
      setShowTyping(true);
    }
  }, [messages, showTyping, currentlyTypingMessage, isStreaming]);

  return (
    <section id="chat" className="min-h-screen py-10 px-4 relative">
      {/* Ambient light effects */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyber-blue/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-cyber-purple/5 rounded-full filter blur-[80px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative">
        {/* Glow effect around chat box */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyber-blue/5 to-cyber-purple/5 rounded-xl blur-xl transform scale-105 -z-10"></div>
        <div className="absolute inset-0 animate-pulse-glow opacity-30 -z-10"></div>

        <div className="bg-black/80 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.8)] relative">
          {/* Chat header */}
          <div className="bg-black/80 p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-lg font-medium text-white">MSRIT AI Assistant</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-400">
                {isConnected ? 'Connected to Ollama' : 'Disconnected'}
              </span>
              <button 
                onClick={clearChat} 
                className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white"
                title="Clear chat"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
          
          {/* Chat messages area */}
          <div 
            ref={chatContainerRef}
            className="h-[60vh] overflow-y-auto p-4 scrollbar-none bg-black/90"
          >
            {messages.length <= 1 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                <p className="text-lg text-gray-400 mb-2">Start a conversation with the AI</p>
                <p className="text-sm text-gray-500">Super cool MSRIT college project</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <MessageBubble key={`${message.role}-${index}`} message={message} index={index} />
            ))}
            
            {/* Loading indicator is only shown when loading but not streaming or typing */}
            {isLoading && !showTyping && !isStreaming && (
              <div className="flex justify-start mb-4">
                <div className="max-w-[80%] p-3 rounded-lg bg-black/50 text-gray-200 border border-white/5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input area */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-white/5 bg-black/90">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="w-full bg-black/80 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-cyber-blue/50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`cyber-button flex items-center justify-center ${
                  isLoading || !input.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Send size={18} />
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-2 text-center">
              Requires Ollama running locally
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ChatInterface;
