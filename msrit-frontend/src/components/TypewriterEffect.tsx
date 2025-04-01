
import React, { useState, useEffect, useRef } from 'react';

interface TypewriterEffectProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

const TypewriterEffect: React.FC<TypewriterEffectProps> = ({ 
  text, 
  speed = 40, 
  className = "", 
  onComplete 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset when text changes
    setDisplayText('');
    setCurrentIndex(0);
    setIsComplete(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [text]);

  useEffect(() => {
    if (currentIndex <= text.length) {
      timeoutRef.current = setTimeout(() => {
        setDisplayText(text.substring(0, currentIndex));
        setCurrentIndex(prevIndex => prevIndex + 1);
        
        // Check if typing is complete
        if (currentIndex === text.length) {
          setIsComplete(true);
          // Ensure the full text is displayed before calling onComplete
          setDisplayText(text);
          // Small delay before calling onComplete to ensure state updates
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 50);
        }
      }, speed);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex, speed, text, onComplete]);

  return (
    <span className={`typing-container ${className}`}>
      <span className={`typing-text ${isComplete ? 'border-transparent' : ''}`}>
        {displayText}
      </span>
    </span>
  );
};

export default TypewriterEffect;
