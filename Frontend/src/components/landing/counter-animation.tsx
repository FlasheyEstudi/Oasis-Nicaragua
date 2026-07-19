'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

interface CounterAnimationProps {
  value: number;
  suffix?: string;
  duration?: number;
}

export function CounterAnimation({ value, suffix = '', duration = 2 }: CounterAnimationProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = value;
    const totalMiliseconds = duration * 1000;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 15);
    
    const startTime = Date.now();

    const timer = setInterval(() => {
      const timePassed = Date.now() - startTime;
      const progress = Math.min(timePassed / totalMiliseconds, 1);
      
      // Smooth easeOutQuad function for realistic counting speed deceleration
      const easeProgress = progress * (2 - progress);
      const nextCount = Math.floor(easeProgress * end);

      setCount(nextCount);

      if (progress >= 1) {
        setCount(end);
        clearInterval(timer);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration, isInView]);

  return (
    <span ref={ref} className="font-extrabold tabular-nums">
      {count}
      {suffix}
    </span>
  );
}
