'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { X, Send, LifeBuoy, Loader2, AlertCircle, HelpCircle, MessageSquare, CreditCard } from 'lucide-react';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  directorId: string;
}

export default function SupportTicketModal({ isOpen, onClose, clubId, directorId }: SupportTicketModalProps) {
  const [asunto, setAsunto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const categorias = [
    { id: 'Duda Técnica', icon: <HelpCircle className="w-5 h-5 text-blue-500" /> },
    { id: 'Reportar un Error', icon: <AlertCircle className="w-5 h-5 text-red-500" /> },
    { id: 'Sugerencia de Mejora', icon: <MessageSquare className="w-5 h-5 text-emerald-500" /> },
    { id: 'Facturación / Pagos', icon: <CreditCard className="w-5 h-5 text-amber-500" /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asunto.trim() || !categoria || !mensaje.trim()) {
      toast.error('Por favor, completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          directorId,
          asunto,
          categoria,
          mensaje
        })
      });

      if (!res.ok) {
        throw new Error('Error al enviar el ticket');
      }

      toast.success('¡Ticket enviado con éxito! Nuestro equipo lo revisará pronto.');
      setAsunto('');
      setCategoria('');
      setMensaje('');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudo enviar el ticket. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] animate-in fade-in" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[101] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand to-purple-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
              <LifeBuoy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg tracking-tight leading-none">Soporte Técnico</h3>
              <p className="text-white/80 font-bold text-[10px] uppercase tracking-widest mt-1">Crear nuevo ticket</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Asunto del ticket</label>
              <input
                type="text"
                placeholder="Ej. Problema al cobrar mensualidad"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand/50 text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Categoría</label>
              <div className="grid grid-cols-2 gap-2">
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoria(cat.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      categoria === cat.id 
                        ? 'border-brand bg-brand/5 ring-1 ring-brand shadow-sm' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {cat.icon}
                    <span className={`text-xs font-bold ${categoria === cat.id ? 'text-brand' : 'text-slate-600 dark:text-slate-400'}`}>
                      {cat.id}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Descripción Detallada</label>
              <textarea
                rows={4}
                placeholder="Explícanos tu problema o duda con la mayor cantidad de detalles posible..."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand/50 text-slate-800 dark:text-white resize-none custom-scrollbar"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !asunto.trim() || !categoria || !mensaje.trim()}
              className="px-5 py-2.5 bg-brand hover:bg-brand/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/30 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
