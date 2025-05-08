import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface LongPressButtonProps {
  onLongPress: () => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  longPressTime?: number;
  threshold?: number;
  disabled?: boolean;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  tooltipText?: string;
  className?: string;
  progressClassName?: string;
  progressPosition?: 'bottom' | 'top';
}

export function LongPressButton({
  onLongPress,
  onClick,
  longPressTime = 3000,
  threshold = 500,
  disabled = false,
  children,
  icon,
  tooltipText,
  className = '',
  progressClassName = '',
  progressPosition = 'bottom',
}: LongPressButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isProgressing, setIsProgressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const thresholdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  const animateProgress = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current - threshold;
    const newProgress = Math.max(0, (elapsed / (longPressTime - threshold)) * 100);
    
    if (newProgress >= 100) {
      setProgress(100);
      cancelAnimationFrame(animationRef.current!);
      animationRef.current = null;
      
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      onLongPress();
      setTimeout(() => {
        setIsPressed(false);
        setIsProgressing(false);
        setProgress(0);
      }, 100);
      return;
    }
    
    setProgress(newProgress);
    animationRef.current = requestAnimationFrame(animateProgress);
  }, [longPressTime, threshold, onLongPress]);

  const handlePressStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    setIsPressed(true);
    setProgress(0);
    startTimeRef.current = Date.now();
    
    // Threshold timer - only start progress after threshold time
    thresholdTimerRef.current = window.setTimeout(() => {
      setIsProgressing(true);
      animationRef.current = requestAnimationFrame(animateProgress);
    }, threshold);
    
    // We use requestAnimationFrame to call onLongPress at the end of the timer
    timerRef.current = window.setTimeout(() => {}, longPressTime);
  }, [disabled, longPressTime, threshold, animateProgress]);

  const handlePressEnd = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (thresholdTimerRef.current !== null) {
      clearTimeout(thresholdTimerRef.current);
      thresholdTimerRef.current = null;
    }
    
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    const wasLongPressing = isPressed;
    const wasLongPressCompleted = progress >= 100;
    
    if (!wasLongPressCompleted) {
      setIsPressed(false);
      setIsProgressing(false);
      setProgress(0);
      
      if (wasLongPressing && onClick && (Date.now() - startTimeRef.current < longPressTime)) {
        onClick(e as React.MouseEvent<HTMLDivElement>);
      }
    }
  }, [isPressed, onClick, longPressTime, progress]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      if (thresholdTimerRef.current !== null) {
        clearTimeout(thresholdTimerRef.current);
      }
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const buttonContent = (
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
      {children || icon}
      
      {isPressed && isProgressing && (
        <div className={`absolute left-0 right-0 h-1 overflow-hidden ${progressPosition === 'bottom' ? 'bottom-0' : 'top-0'}`}>
          <div 
            className={`h-full bg-red-500 ${progressClassName}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );

  if (tooltipText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
}