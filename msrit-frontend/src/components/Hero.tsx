
import React, { useEffect, useRef } from 'react';
import TypewriterEffect from './TypewriterEffect';

interface HeroProps {
  onStartChat: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStartChat }) => {
  const heroRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      const scrollPosition = window.scrollY;
      const heroElement = heroRef.current;
      
      // Apply parallax effect to different elements
      const title = heroElement.querySelector('.title');
      const subtitle = heroElement.querySelector('.subtitle');
      const button = heroElement.querySelector('.cta-button');
      
      if (title) {
        (title as HTMLElement).style.transform = `translateY(${scrollPosition * 0.2}px)`;
      }
      
      if (subtitle) {
        (subtitle as HTMLElement).style.transform = `translateY(${scrollPosition * 0.1}px)`;
      }
      
      if (button) {
        (button as HTMLElement).style.transform = `translateY(${scrollPosition * -0.1}px)`;
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section 
      ref={heroRef}
      className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
    >
      <div className="z-10 text-center max-w-4xl mx-auto">
        <h1 className="title text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-cyber-gradient">
          <TypewriterEffect 
            text="MSRIT Chat Assistant" 
            speed={80} 
          />
        </h1>
        
        <p className="subtitle text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Powered by advanced AI, seamlessly connected to your local Ollama instance.
        </p>
        
        <button 
          onClick={onStartChat}
          className="cta-button cyber-button group hover-scale animate-pulse-glow"
        >
          <span className="relative z-10">Start Chatting</span>
          <span className="absolute inset-0 bg-gradient-to-r from-cyber-blue/20 to-cyber-purple/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
        </button>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyber-blue/20 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyber-purple/10 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-cyber-bg to-transparent"></div>
      
      {/* Animated code snippets floating in background */}
      <div className="parallax-layer" style={{ transform: 'translateY(10%)' }}>
        <div className="absolute top-1/3 right-20 p-4 cyber-panel text-xs text-cyber-teal/70 opacity-30 rotate-6 animate-float">
          <pre className="font-mono">
            {`async function chatResponse() {
  const data = await model.generate();
  return data.response;
}`}
          </pre>
        </div>
      </div>
      
      <div className="parallax-layer" style={{ transform: 'translateY(-5%)' }}>
        <div className="absolute bottom-1/4 left-10 p-3 cyber-panel text-xs text-cyber-pink/70 opacity-20 -rotate-3" style={{ animationDelay: '1s', animationDuration: '4s' }}>
          <pre className="font-mono">
            {`const state = {
  history: [],
  thinking: true,
  response: ""
}`}
          </pre>
        </div>
      </div>
    </section>
  );
};

export default Hero;
