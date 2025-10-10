"use client";

import React, { useState, useEffect } from 'react';

interface AnimatedValueProps {
  isLoading: boolean;
  value: string;
  className?: string;
  matrixChars?: string;
  animationDuration?: number;
  finalValueDelay?: number;
}

const AnimatedValue: React.FC<AnimatedValueProps> = ({
  isLoading,
  value,
  className = '',
  matrixChars = '0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()',
  animationDuration = 100,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [animationTimer, setAnimationTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    return () => {
      if (animationTimer) {
        clearInterval(animationTimer);
      }
    };
  }, [animationTimer]);

  useEffect(() => {
    if (!isClient) return;

    if (isLoading) {
      const interval = setInterval(() => {
        setDisplayValue(() => {
          const randomChars = Array.from({ length: 4 }, () => 
            matrixChars[Math.floor(Math.random() * matrixChars.length)]
          ).join('');
          return randomChars;
        });
      }, animationDuration);

      return () => clearInterval(interval);
    } else if (value && !isLoading) {
      
        animateToFinalValue(value);
    }
  }, [isClient, isLoading, value, matrixChars, animationDuration]);

  const animateToFinalValue = (finalValue: string) => {
    if (animationTimer) {
      clearInterval(animationTimer);
    }

    const finalValueNum = parseFloat(finalValue.replace(/[^\d.]/g, ''));
    if (isNaN(finalValueNum)) {
      return;
    }

    const startValue = 0;
    const duration = 2000; 
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = (finalValueNum - startValue) / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const currentValue = startValue + (increment * currentStep);
      
      if (currentStep >= steps) {
        setDisplayValue(finalValue);
        clearInterval(timer);
        setAnimationTimer(null);
      } else {
        const formattedValue = formatValue(currentValue, finalValue);
        setDisplayValue(formattedValue);
      }
    }, stepDuration);
    
    setAnimationTimer(timer);
  };

  const formatValue = (num: number, originalValue: string) => {
    if (originalValue.includes('.')) {
      const decimalPlaces = originalValue.split('.')[1]?.length || 2;
      return num.toFixed(decimalPlaces);
    }
    return Math.floor(num).toString();
  };

  return (
    <span className={className}>
      {!isClient ? (value || '0') : displayValue || value}
    </span>
  );
};

export default AnimatedValue;
