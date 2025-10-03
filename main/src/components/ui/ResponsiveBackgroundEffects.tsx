"use client";

import { useState, useEffect } from "react";
import { BackgroundEffects } from "./BackgroundEffects";

interface ResponsiveBackgroundEffectsProps {
  message?: string;
  mobileFontSize?: number;
  desktopFontSize?: number;
  fontColor?: [number, number, number, number];
  density?: number;
  mobileDensity?: number;
  repelThreshold?: number;
  mobileRepelThreshold?: number;
}

export function ResponsiveBackgroundEffects({ 
  message = 'PENGU STRATEGY',
  mobileFontSize = 50,
  desktopFontSize = 200,
  fontColor = [13, 48, 55, 130],
  density = 1,
  mobileDensity = 2,
  repelThreshold = 100,
  mobileRepelThreshold = 50,
}: ResponsiveBackgroundEffectsProps) {
  const [fontSize, setFontSize] = useState(desktopFontSize);
  const [finalDensity, setFinalDensity] = useState(density);
  const [finalRepelThreshold, setFinalRepelThreshold] = useState(repelThreshold);

  useEffect(() => {
    const updateFontSize = () => {
      if (typeof window !== 'undefined') {
        const isMobile = window.innerWidth < 1024; // lg breakpoint
        setFontSize(isMobile ? mobileFontSize : desktopFontSize);
        setFinalDensity(isMobile ? mobileDensity : density);
        setFinalRepelThreshold(isMobile ? mobileRepelThreshold : repelThreshold);
      }
    };

    updateFontSize();
    window.addEventListener('resize', updateFontSize);
    
    return () => {
      window.removeEventListener('resize', updateFontSize);
    };
  }, [mobileFontSize, desktopFontSize, mobileDensity, density, mobileRepelThreshold, repelThreshold]);

  return (
    <BackgroundEffects 
      message={message}
      fontSize={fontSize}
      fontColor={fontColor}
      density={finalDensity}
      repelThreshold={finalRepelThreshold}
    />
  );
}
