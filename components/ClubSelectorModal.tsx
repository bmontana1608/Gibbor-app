'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight, Shield, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Club {
  id: string;
  nombre: string;
  slug: string;
  logo_url: string | null;
  color_primario: string | null;
}

interface ClubSelectorModalProps {
  onClose: () => void;
}

export default function ClubSelectorModal({ onClose }: ClubSelectorModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Club | null>(null);
  const [currentHost, setCurrentHost] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentHost(window.location.host);
    inputRef.current?.focus();
    fetch('/api/clubes-publicos')
      .then(r => r.json())
      .then(data => setClubs(Array.isArray(data) ? data : []))
      .catch(() => setClubs([]))
      .finally(() => setLoading(false));
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = clubs.filter(c =>
    c.nombre.toLowerCase().includes(query.toLowerCase()) ||
    c.slug.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (club: Club) => {
    setSelected(club);
    setTimeout(() => {
      router.push(`/${club.slug}/login`);
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">

        {/* Header */}
        <div className="px-6 pt-7 pb-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Selecciona tu Academia</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Busca tu club por nombre para ingresar</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all mt-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search input */}
          <div className="relative mt-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Nombre de tu academia..."
              className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 focus:border-green-500 rounded-2xl text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Club list */}
        <div className="px-3 pb-5 max-h-80 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-semibold">Cargando academias...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold text-sm">
                {query ? `No encontramos "${query}"` : 'No hay academias disponibles'}
              </p>
              {query && (
                <p className="text-slate-400 text-xs mt-1">Verifica el nombre de tu academia</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(club => {
                const isSelected = selected?.id === club.id;
                const brandColor = club.color_primario || '#16a34a';
                return (
                  <button
                    key={club.id}
                    onClick={() => handleSelect(club)}
                    disabled={!!selected}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-left group ${
                      isSelected
                        ? 'bg-green-50 border-2 border-green-500'
                        : 'hover:bg-slate-50 border-2 border-transparent'
                    }`}
                  >
                    {/* Club logo or placeholder */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 overflow-hidden shadow-sm"
                      style={{ borderColor: `${brandColor}30`, background: `${brandColor}10` }}
                    >
                      {club.logo_url ? (
                        <img
                          src={club.logo_url}
                          alt={club.nombre}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Shield className="w-6 h-6" style={{ color: brandColor }} />
                      )}
                    </div>

                    {/* Club info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate">{club.nombre}</p>
                      <p className="text-xs text-slate-400 font-mono font-medium">{currentHost}/{club.slug}</p>
                    </div>

                    {/* Arrow or spinner */}
                    <div className={`flex-shrink-0 transition-all ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isSelected ? (
                        <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-green-600 group-hover:translate-x-0.5 transition-all" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 pb-5 pt-2 border-t border-slate-50">
          <p className="text-xs text-slate-400 text-center font-medium">
            ¿Aún no tienes una academia?{' '}
            <a href="/unete-gibbor" className="text-green-600 font-bold hover:underline">Regístrate gratis</a>
          </p>
        </div>
      </div>
    </div>
  );
}
