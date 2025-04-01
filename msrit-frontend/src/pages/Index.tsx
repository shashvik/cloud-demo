
import React, { useRef } from 'react';
import ParticleBackground from '../components/ParticleBackground';
import Hero from '../components/Hero';
import ChatInterface from '../components/ChatInterface';

const Index = () => {
  const chatSectionRef = useRef<HTMLDivElement>(null);

  const scrollToChat = () => {
    chatSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-cyber-bg min-h-screen relative overflow-hidden">
      {/* Particle background */}
      <ParticleBackground />
      
      {/* Main content */}
      <div className="relative z-10">
        {/* Hero section */}
        <Hero onStartChat={scrollToChat} />
        
        {/* Chat interface */}
        <div ref={chatSectionRef}>
          <ChatInterface />
        </div>
      </div>
      
      {/* Fixed decorative elements */}
      <div className="fixed top-0 left-0 w-full h-20 bg-gradient-to-b from-cyber-bg to-transparent z-0"></div>
      <div className="fixed bottom-0 left-0 w-full h-20 bg-gradient-to-t from-cyber-bg to-transparent z-0"></div>
    </div>
  );
};

export default Index;
