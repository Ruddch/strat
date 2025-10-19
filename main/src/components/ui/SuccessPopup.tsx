"use client";

import React, { useEffect, useState } from 'react';
import AnimatedValue from './AnimatedValue';

interface SuccessPopupProps {
  isVisible: boolean;
  onClose: () => void;
  claimAmount: string;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({
  isVisible,
  onClose,
  claimAmount,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      console.log('should render');
      // Небольшая задержка для плавной анимации появления
      setTimeout(() => setIsAnimating(true), 10);
      
    } else {
      setIsAnimating(false);
      // Задержка перед удалением из DOM для завершения анимации
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleShare = () => {
    const tweetText = `Just claimed my ${claimAmount} PENGU rewards for holding $PST this week

@PudgyInvest perpetual machine keeps printing`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 backdrop-blur-sm ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(1, 27, 35, 0.9)' }}
      onClick={handleBackdropClick}
    >
      
      {/* Popup content */}
      <div 
        className={`relative bg-[rgba(1, 27, 35, 0.95)] border-2 border-[var(--color-border-accent)] p-8 lg:p-12 max-w-md w-full mx-4 transform transition-all duration-300 ${
          isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        style={{
          boxShadow: '0 0 50px rgba(0, 255, 251, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200"
          style={{ fontSize: '24px' }}
        >
          ×
        </button>

        {/* Success icon */}
        <div className="text-center mb-6">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full mb-4"
            style={{
              backgroundColor: 'rgba(0, 255, 251, 0.1)',
              border: '2px solid rgba(0, 255, 251, 0.5)'
            }}
          >
            <span 
              className="text-3xl lg:text-4xl"
              style={{ color: 'rgba(0, 255, 251, 1)' }}
            >
              ✓
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 
          className="text-center text-2xl lg:text-3xl font-normal mb-4 font-[family-name:var(--font-random-grotesque)]"
          style={{ color: 'rgba(0, 255, 251, 1)' }}
        >
          Congratulations!
        </h2>

        {/* Subtitle */}
        <p className="text-center text-white text-sm lg:text-base mb-6 font-[family-name:var(--font-martian-mono)]">
          You have successfully claimed your dividends
        </p>

        {/* Claim amount */}
        <div className="text-center mb-6">
          <div 
            className="text-4xl lg:text-5xl font-normal font-[family-name:var(--font-random-grotesque)]"
            style={{ color: 'rgba(0, 255, 251, 1)' }}
          >
            <AnimatedValue
              isLoading={false}
              value={claimAmount}
            />
          </div>
          <div className="text-white text-sm lg:text-base mt-2 font-[family-name:var(--font-martian-mono)]">
            PENGU
          </div>
        </div>

        {/* Decorative elements */}
        <div className="flex justify-center space-x-2 mb-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full animate-pulse"
              style={{ 
                backgroundColor: 'rgba(0, 255, 251, 0.6)',
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>

        {/* Action button */}
        <div className="text-center">
          <button
            onClick={handleShare}
            className="px-6 py-3 text-sm lg:text-base font-[family-name:var(--font-martian-mono)] transition-all duration-200 hover:opacity-80 flex items-center justify-center gap-2 mx-auto"
            style={{
              backgroundColor: 'rgba(0, 255, 251, 0.12)',
              border: '1px solid rgba(0, 255, 251, 0.5)',
              color: 'rgba(0, 255, 251, 1)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share
          </button>
        </div>

        {/* Glow effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 255, 251, 0.1) 0%, transparent 70%)',
            borderRadius: 'inherit'
          }}
        />
      </div>
    </div>
  );
};

export default SuccessPopup;
