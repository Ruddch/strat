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
  finalValueDelay = 500
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Определяем, что мы на клиенте
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Не запускаем анимацию на сервере
    if (!isClient) return;

    if (isLoading) {
      // Начинаем анимацию загрузки
      setIsAnimating(true);
      setDisplayValue('');
      
      const interval = setInterval(() => {
        setDisplayValue(() => {
          // Генерируем случайные символы для эффекта матрицы
          const randomChars = Array.from({ length: 4 }, () => 
            matrixChars[Math.floor(Math.random() * matrixChars.length)]
          ).join('');
          return randomChars;
        });
      }, animationDuration);

      return () => clearInterval(interval);
    } else if (value && !isLoading) {
      // Переход к финальному значению
      setIsAnimating(false);
      
      // Небольшая задержка перед началом анимации к финальному значению
      setTimeout(() => {
        animateToFinalValue(value);
      }, finalValueDelay);
    }
  }, [isClient, isLoading, value, matrixChars, animationDuration, finalValueDelay]);

  const animateToFinalValue = (finalValue: string) => {
    const finalValueNum = parseFloat(finalValue.replace(/[^\d.]/g, ''));
    if (isNaN(finalValueNum)) {
      setDisplayValue(finalValue);
      return;
    }

    // Анимация от 0 до финального значения
    const startValue = 0;
    const duration = 1000; // 1 секунда анимации
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
      } else {
        // Форматируем число как в оригинальном значении
        const formattedValue = formatValue(currentValue, finalValue);
        setDisplayValue(formattedValue);
      }
    }, stepDuration);
  };

  const formatValue = (num: number, originalValue: string) => {
    // Определяем формат на основе оригинального значения
    if (originalValue.includes('.')) {
      const decimalPlaces = originalValue.split('.')[1]?.length || 2;
      return num.toFixed(decimalPlaces);
    }
    return Math.floor(num).toString();
  };

  return (
    <span className={className}>
      {!isClient ? (value || '0') : (isLoading || isAnimating ? displayValue : value)}
    </span>
  );
};

export default AnimatedValue;
