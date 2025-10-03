"use client";

import { useState, useEffect } from "react";
import { BackgroundEffects } from "./BackgroundEffects";

interface ResponsiveBackgroundEffectsProps {
  message?: string;
  mobileFontSize?: number;
  desktopFontSize?: number;
  fontColor?: [number, number, number, number];
  density?: number;
}

export function ResponsiveBackgroundEffects({ 
  message = 'PENGU STRATEGY',
  mobileFontSize = 50,
  desktopFontSize = 200,
  fontColor = [13, 48, 55, 130],
  density = 1
}: ResponsiveBackgroundEffectsProps) {
  const [fontSize, setFontSize] = useState(desktopFontSize);

  useEffect(() => {
    const updateFontSize = () => {
      if (typeof window !== 'undefined') {
        const isMobile = window.innerWidth < 1024; // lg breakpoint
        setFontSize(isMobile ? mobileFontSize : desktopFontSize);
      }
    };

    updateFontSize();
    window.addEventListener('resize', updateFontSize);
    
    return () => {
      window.removeEventListener('resize', updateFontSize);
    };
  }, [mobileFontSize, desktopFontSize]);

  return (
    <BackgroundEffects 
      message={message}
      fontSize={fontSize}
      fontColor={fontColor}
      density={density}
    />
  );
}
