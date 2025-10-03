'use client';

import React, { useCallback, useLayoutEffect, useState } from 'react';

interface ProgressBarProps {
  percentage: number; // 0-100
  className?: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function ProgressBar({ percentage, className = '', containerRef }: ProgressBarProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [totalDashes, setTotalDashes] = useState(1);

  const calculateDashes = useCallback(() => {
    if (containerRef?.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const dashWidth = 2.5;
      const gap = 5;
      const availableWidth = containerWidth - 15;
      const dashes = Math.floor(availableWidth / (dashWidth + gap));
      setTotalDashes(Math.max(dashes, 10));
    }
  }, [containerRef?.current]);

  useLayoutEffect(() => {
    calculateDashes();
    
    const handleResize = () => {
      calculateDashes();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateDashes]);

  useLayoutEffect(() => {
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentPercentage = percentage * easeOut;
      
      setAnimatedPercentage(currentPercentage);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    setAnimatedPercentage(0);
    requestAnimationFrame(animate);
  }, [percentage]);

  const animatedActiveDashes = Math.round((animatedPercentage / 100) * totalDashes);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex gap-1 justify-center">
        {Array.from({ length: totalDashes }, (_, index) => {
          const isActive = index < animatedActiveDashes;
          return (
            <div
              key={index}
              className={`transition-colors duration-200 ${
                isActive 
                  ? 'w-0.5 h-[61px] bg-[var(--color-text-accent)]' 
                  : 'w-0.5 h-[61px] bg-[var(--color-border-accent)]' 
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
