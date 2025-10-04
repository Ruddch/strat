'use client';

import React, { useEffect, useState } from 'react';

interface OrientationLockProps {
  children: React.ReactNode;
}

export function OrientationLock({ children }: OrientationLockProps) {
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                            ('ontouchstart' in window) ||
                            (navigator.maxTouchPoints > 0);
      
      setIsMobile(isMobileDevice);
      
      if (isMobileDevice) {
        const isCurrentlyLandscape = window.innerWidth > window.innerHeight;
        setIsLandscape(isCurrentlyLandscape);
      }
    };

    // Проверяем при загрузке
    checkOrientation();

    // Слушаем изменения ориентации
    const handleOrientationChange = () => {
      setTimeout(checkOrientation, 100); // Небольшая задержка для корректного получения размеров
    };

    // Слушаем изменения размера окна
    const handleResize = () => {
      checkOrientation();
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Если это мобильное устройство и экран в горизонтальном положении, показываем сообщение
  if (isMobile && isLandscape) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(1, 27, 35, 1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          color: 'white',
          fontFamily: 'var(--font-avenue-mono)',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            fontSize: '48px',
            marginBottom: '20px',
            animation: 'rotate 2s linear infinite',
          }}
        >
          📱
        </div>
        <h2
          style={{
            fontSize: '24px',
            marginBottom: '16px',
            color: 'var(--color-text-accent)',
            fontFamily: 'var(--font-random-grotesque)',
          }}
        >
          Rotate your device
        </h2>
        <p
          style={{
            fontSize: '16px',
            color: '#9CA3AF',
            fontFamily: 'var(--font-martian-mono)',
            maxWidth: '300px',
            lineHeight: '1.5',
          }}
        >
          For the best app experience, please rotate your device to portrait mode
        </p>
        
        <style jsx>{`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(90deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
