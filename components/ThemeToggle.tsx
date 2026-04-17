'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar errores de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="p-2 w-9 h-9" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95 group"
      aria-label="Cambiar modo"
    >
      <div className="relative w-5 h-5 overflow-hidden">
        <Sun 
          className={`absolute inset-0 w-5 h-5 text-orange-500 transition-all duration-300 ${isDark ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} 
        />
        <Moon 
          className={`absolute inset-0 w-5 h-5 text-blue-400 transition-all duration-300 ${isDark ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`} 
        />
      </div>
      
      {/* Tooltip opcional */}
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        Modo {isDark ? 'Día' : 'Noche'}
      </span>
    </button>
  );
}
