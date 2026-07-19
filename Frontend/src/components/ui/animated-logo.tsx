'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  className?: string;
  onClick?: () => void;
  priority?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'giant';
}

export function AnimatedLogo({ className, onClick, priority = true, showLabel = true, size = 'md' }: AnimatedLogoProps) {
  const [error, setError] = useState(false);

  const containerSizes = {
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-14 h-14 rounded-2xl',
    lg: 'w-20 h-20 rounded-[1.2rem]',
    xl: 'w-28 h-28 rounded-[1.5rem]',
    giant: 'w-40 h-40 rounded-[2.2rem]',
  };

  const labelSizes = {
    sm: 'text-sm font-bold tracking-wider',
    md: 'text-base md:text-lg font-black tracking-widest',
    lg: 'text-lg md:text-xl font-extrabold tracking-widest',
    xl: 'text-xl md:text-2xl font-black tracking-[0.2em]',
    giant: 'text-3xl md:text-4xl font-black tracking-[0.3em]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        duration: 0.8,
      }}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 cursor-pointer select-none group focus:outline-none',
        size === 'giant' || size === 'xl' ? 'flex-col justify-center text-center' : 'flex-row',
        className
      )}
    >
      <div 
        className={cn(
          'relative shrink-0 transition-all duration-700 ease-out group-hover:scale-110 flex items-center justify-center p-0.5',
          containerSizes[size]
        )}
      >
        {!error ? (
          <Image
            src="/images/nuevo-logo-y-mascota/logo.png"
            alt="Oasis Logo"
            width={160}
            height={160}
            priority={priority}
            className="object-contain w-full h-full scale-100 group-hover:scale-105 transition-transform duration-500"
            onError={() => setError(true)}
            sizes="(max-width: 640px) 48px, (max-width: 1024px) 96px, 160px"
          />
        ) : (
          // Premium backup emblem
          <div className="w-full h-full bg-gradient-to-tr from-teal-500 to-cyan-600 flex items-center justify-center text-white font-black text-lg leading-none rounded-2xl">
            O
          </div>
        )}
      </div>
      
      {showLabel && (
        <span className={cn(
          'bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-600 dark:from-teal-400 dark:via-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity font-black select-none uppercase tracking-widest',
          labelSizes[size]
        )}>
          OASIS
        </span>
      )}
    </motion.div>
  );
}
