'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { translate } from './index';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  t: (key) => key,
  loading: true,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { slug } = useTenant();
  const [language, setLanguageState] = useState('es');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLanguage() {
      try {
        if (!slug || slug === 'master') {
          setLoading(false);
          return;
        }

        // Try to get language from localStorage first for faster load
        const cached = localStorage.getItem(`lang_${slug}`);
        if (cached) {
          setLanguageState(cached);
          setLoading(false);
        }

        // Fetch from DB
        const { data } = await supabase
          .from('clubes')
          .select('idioma')
          .eq('slug', slug)
          .single();

        if (data && data.idioma) {
          const lang = data.idioma.toLowerCase();
          setLanguageState(lang);
          localStorage.setItem(`lang_${slug}`, lang);
        }
      } catch (err) {
        console.error('Error loading language', err);
      } finally {
        setLoading(false);
      }
    }

    loadLanguage();
  }, [slug]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    if (slug) localStorage.setItem(`lang_${slug}`, lang);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    return translate(key, language, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
