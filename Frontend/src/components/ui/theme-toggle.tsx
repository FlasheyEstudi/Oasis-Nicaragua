'use client';

import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("size-10 rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 dark:border-white/5 shrink-0", className)} />
    );
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme;
  const isDark = currentTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Alternar modo de color"
      className={cn(
        "relative size-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200/60 dark:bg-zinc-900 dark:hover:bg-white/[0.05] border border-slate-200/50 dark:border-white/5 shadow-inner transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 shrink-0",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="sun"
            initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.5, rotate: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-amber-400"
          >
            <Sun className="size-5 fill-amber-400/20" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ scale: 0.5, rotate: 90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.5, rotate: -90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-indigo-600"
          >
            <Moon className="size-5 fill-indigo-600/10" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
