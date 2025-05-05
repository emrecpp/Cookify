import React, { useCallback, useEffect, useRef, useState } from 'react';

interface LongPressButtonProps {
  onLongPress: () => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  longPressTime?: number;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  progressClassName?: string;
  progressPosition?: 'bottom' | 'top';
}

export function LongPressButton({
  onLongPress,
  onClick,
  longPressTime = 3000,
  disabled = false,
  children,
  className = '',
  progressClassName = '',
  progressPosition = 'bottom',
}: LongPressButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  const animateProgress = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const newProgress = (elapsed / longPressTime) * 100;
    
    if (newProgress >= 100) {
      setProgress(100);
      cancelAnimationFrame(animationRef.current!);
      animationRef.current = null;
      
      // Tamamlandığında işlemi çalıştır ve sıfırla
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      onLongPress();
      setTimeout(() => {
        setIsPressed(false);
        setProgress(0);
      }, 100);
      return;
    }
    
    setProgress(newProgress);
    animationRef.current = requestAnimationFrame(animateProgress);
  }, [longPressTime, onLongPress]);

  const handlePressStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    setIsPressed(true);
    setProgress(0);
    startTimeRef.current = Date.now();
    
    // İlerleme animasyonu için requestAnimationFrame kullan
    animationRef.current = requestAnimationFrame(animateProgress);
    
    // Tamamlanma için timer
    timerRef.current = window.setTimeout(() => {
      // Timer sonunda sadece onLongPress çağrısını yapmak için requestAnimationFrame kullanıyoruz
      // onLongPress'i animateProgress içinde çağırıyoruz
    }, longPressTime);
  }, [disabled, longPressTime, animateProgress]);

  const handlePressEnd = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    const wasLongPressing = isPressed;
    const wasLongPressCompleted = progress >= 100;
    
    if (!wasLongPressCompleted) {
      setIsPressed(false);
      setProgress(0);
      
      // Uzun basılmadıysa ve normal tıklama varsa onu çalıştır
      if (wasLongPressing && onClick && (Date.now() - startTimeRef.current < longPressTime)) {
        onClick(e as React.MouseEvent<HTMLDivElement>);
      }
    }
  }, [isPressed, onClick, longPressTime, progress]);

  // Component unmount olduğunda intervali temizle
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`relative select-none ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onClick={(e) => onClick && !isPressed && onClick(e)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
      
      {isPressed && (
        <div className={`absolute left-0 right-0 h-1 overflow-hidden ${progressPosition === 'bottom' ? 'bottom-0' : 'top-0'}`}>
          <div 
            className={`h-full bg-red-500 ${progressClassName}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
} 