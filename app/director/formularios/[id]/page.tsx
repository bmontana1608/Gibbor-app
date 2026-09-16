'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
  FileSpreadsheet, Edit3, Eye, Copy, ArrowLeft, 
  Share2, CheckCircle2, RefreshCw, Loader2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import FormBuilder, { FormField } from '@/components/formularios/FormBuilder';
import FormResponses from '@/components/formularios/FormResponses';
import { useTenant } from '@/lib/hooks/useTenant';

export default function FormularioDetallePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { route } = useTenant();

  const formId = params?.id as string;
  const initialTab = searchParams?.get('tab') === 'respuestas' ? 'respuestas' : 'editor';

  const [activeTab, setActiveTab] = useState<'editor' | 'respuestas'>(initialTab);
  const [formulario, setFormulario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargarFormulario = async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/formularios/${formId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar formulario');
      setFormulario(data.formulario);
    } catch (err: any) {
      toast.error(err.message || 'Error al obtener datos del formulario');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (formId) {
      cargarFormulario();
    }
  }, [formId]);

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/f/${formId}` : '';

  const copiarEnlace = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('¡Enlace público copiado al portapapeles!');
  };

  const handleGuardarCambios = async (formData: {
    titulo: string;
    descripcion: string;
    estado: string;
    campos: FormField[];
    logo_url?: string;
    banner_url?: string;
  }) => {
    setGuardando(true);
    try {
      const res = await fetch(`/api/formularios/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar formulario');

      setFormulario(data.formulario);
      toast.success('¡Formulario actualizado con éxito!');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar cambios');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand mx-auto" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (!formulario) {
    return (
      <div className="min-h-screen p-8 bg-slate-50 dark:bg-slate-950 text-center flex flex-col items-center justify-center">
        <p className="text-base font-bold text-slate-700 dark:text-slate-200 mb-4">Formulario no encontrado o eliminado.</p>
        <button
          onClick={() => router.push(route('/director/formularios'))}
          className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-wider"
        >
          Volver a Formularios
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-100 transition-colors pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabecera Principal con Pestañas y Compartir */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(route('/director/formularios'))}
                className="p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                title="Volver a la lista"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                  Gestión de Formulario
                </span>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {formulario.titulo}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copiarEnlace}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                title="Copiar enlace para compartir"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Enlace
              </button>

              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand/10 text-brand hover:bg-brand/20 text-xs font-bold transition-all"
                title="Ver cómo lo ven los usuarios"
              >
                <Eye className="w-3.5 h-3.5" /> Abrir Formulario
              </a>
            </div>
          </div>

          {/* Selector de Pestañas (Editor vs Respuestas) */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 gap-6">
            <button
              onClick={() => setActiveTab('editor')}
              className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'editor'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Edit3 className="w-4 h-4" /> Editor de Preguntas
            </button>

            <button
              onClick={() => setActiveTab('respuestas')}
              className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'respuestas'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Respuestas Recibidas
            </button>
          </div>
        </div>

        {/* Contenido de la pestaña activa */}
        {activeTab === 'editor' ? (
          <FormBuilder
            initialData={{
              id: formulario.id,
              titulo: formulario.titulo,
              descripcion: formulario.descripcion,
              estado: formulario.estado,
              logo_url: formulario.logo_url,
              banner_url: formulario.banner_url,
              campos: formulario.campos || []
            }}
            clubId={formulario.club_id}
            onSave={handleGuardarCambios}
            saving={guardando}
            publicUrl={publicUrl}
          />
        ) : (
          <FormResponses
            formularioId={formId}
          />
        )}
      </div>
    </div>
  );
}
