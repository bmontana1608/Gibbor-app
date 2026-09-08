'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  CheckCircle2, AlertCircle, UploadCloud, FileText, 
  Loader2, ArrowRight, ShieldCheck
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function FormularioPublicoPage() {
  const params = useParams();
  const formId = params?.id as string;

  const [formulario, setFormulario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);

  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [archivosEstado, setArchivosEstado] = useState<Record<string, { subiendo: boolean; url: string; nombre: string }>>({});

  useEffect(() => {
    async function cargar() {
      if (!formId) return;
      setCargando(true);
      try {
        const res = await fetch(`/api/formularios/${formId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el formulario');
        setFormulario(data.formulario);
      } catch (err: any) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [formId]);

  const handleInputChange = (campoId: string, valor: any) => {
    setRespuestas(prev => ({ ...prev, [campoId]: valor }));
  };

  const handleCheckboxChange = (campoId: string, opcion: string, checked: boolean) => {
    const actuales: string[] = Array.isArray(respuestas[campoId]) ? respuestas[campoId] : [];
    if (checked) {
      setRespuestas(prev => ({ ...prev, [campoId]: [...actuales, opcion] }));
    } else {
      setRespuestas(prev => ({ ...prev, [campoId]: actuales.filter(o => o !== opcion) }));
    }
  };

  const handleSubirArchivo = async (campoId: string, file: File) => {
    if (!file) return;

    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`El archivo es demasiado grande. El límite máximo es de ${MAX_SIZE_MB}MB.`);
      return;
    }

    setArchivosEstado(prev => ({
      ...prev,
      [campoId]: { subiendo: true, url: '', nombre: file.name }
    }));

    try {
      const extension = file.name.split('.').pop() || 'bin';
      const cleanFileName = `${formId}/${campoId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${extension}`;

      const { data, error } = await supabase.storage
        .from('formularios_adjuntos')
        .upload(cleanFileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('formularios_adjuntos')
        .getPublicUrl(cleanFileName);

      setArchivosEstado(prev => ({
        ...prev,
        [campoId]: { subiendo: false, url: publicUrl, nombre: file.name }
      }));

      handleInputChange(campoId, publicUrl);
      toast.success(`Archivo "${file.name}" cargado con éxito`);
    } catch (err: any) {
      console.error('Error subiendo archivo:', err);
      toast.error('Error al subir el archivo: ' + err.message);
      setArchivosEstado(prev => ({
        ...prev,
        [campoId]: { subiendo: false, url: '', nombre: '' }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const campos: any[] = formulario?.campos || [];
    for (const campo of campos) {
      if (campo.requerido) {
        const val = respuestas[campo.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          toast.error(`Por favor completa el campo obligatorio: "${campo.label}"`);
          return;
        }
      }
    }

    const hayArchivosSubiendo = Object.values(archivosEstado).some(a => a.subiendo);
    if (hayArchivosSubiendo) {
      toast.error('Por favor espera a que terminen de subirse todos los archivos.');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/formularios/${formId}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respuestas,
          archivos: Object.values(archivosEstado).filter(a => Boolean(a.url)).map(a => ({ nombre: a.nombre, url: a.url }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar formulario');

      setEnviadoExitoso(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast.error(err.message || 'No se pudo enviar el formulario');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-slate-800 mx-auto" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (!formulario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-200">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-black text-slate-900 uppercase">Formulario No Disponible</h2>
          <p className="text-xs text-slate-500 mt-2">
            El formulario que intentas abrir no existe o ha sido retirado.
          </p>
        </div>
      </div>
    );
  }

  if (formulario.estado !== 'activo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-200">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-black text-slate-900 uppercase">Formulario Cerrado</h2>
          <p className="text-xs text-slate-500 mt-2">
            Este formulario ya no está recibiendo más respuestas en este momento.
          </p>
        </div>
      </div>
    );
  }

  const club = formulario.clubes;
  const brandColor = club?.color_primario || '#0f172a';
  const logoMostrar = formulario.logo_url || club?.logo_url;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 py-8 px-4 font-sans flex flex-col items-center justify-start">
      <Toaster position="top-center" richColors />

      <div className="max-w-2xl w-full space-y-6">
        <div className="flex flex-col items-center justify-center gap-2 py-3">
          {logoMostrar && (
            <div className="bg-white p-3 md:p-4 rounded-3xl shadow-sm border border-slate-200/80 flex items-center justify-center">
              <img 
                src={logoMostrar} 
                alt={formulario.titulo || club?.nombre || 'Logo'} 
                className="h-20 md:h-24 max-w-[280px] object-contain" 
              />
            </div>
          )}
          {club && (
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 mt-1">
              {club.nombre}
            </span>
          )}
        </div>

        {enviadoExitoso ? (
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 text-center shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
              ¡Respuesta Enviada!
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Tu información y documentos adjuntos se han registrado exitosamente en la academia.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  setRespuestas({});
                  setArchivosEstado({});
                  setEnviadoExitoso(false);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer"
              >
                Enviar otra respuesta
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div 
              className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-200 border-t-8"
              style={{ borderTopColor: brandColor }}
            >
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
                {formulario.titulo}
              </h1>
              {formulario.descripcion && (
                <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                  {formulario.descripcion}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-rose-500">
                <span>* Los campos marcados con asterisco son obligatorios</span>
              </div>
            </div>

            {(formulario.campos || []).map((campo: any, index: number) => {
              const valor = respuestas[campo.id] || '';
              const archivoInfo = archivosEstado[campo.id];

              return (
                <div 
                  key={campo.id}
                  className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 space-y-3"
                >
                  <label className="block text-sm font-black text-slate-900 leading-snug">
                    {campo.label}
                    {campo.requerido && <span className="text-rose-500 ml-1">*</span>}
                  </label>

                  {['text', 'number', 'email', 'tel'].includes(campo.tipo) && (
                    <input
                      type={campo.tipo}
                      required={campo.requerido}
                      value={valor}
                      onChange={(e) => handleInputChange(campo.id, e.target.value)}
                      placeholder={campo.placeholder || 'Escribe tu respuesta aquí...'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  )}

                  {campo.tipo === 'date' && (
                    <input
                      type="date"
                      required={campo.requerido}
                      value={valor}
                      onChange={(e) => handleInputChange(campo.id, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  )}

                  {campo.tipo === 'textarea' && (
                    <textarea
                      rows={3}
                      required={campo.requerido}
                      value={valor}
                      onChange={(e) => handleInputChange(campo.id, e.target.value)}
                      placeholder={campo.placeholder || 'Escribe tu respuesta detallada...'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition-all resize-none"
                    />
                  )}

                  {campo.tipo === 'select' && (
                    <select
                      required={campo.requerido}
                      value={valor}
                      onChange={(e) => handleInputChange(campo.id, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer"
                    >
                      <option value="">Selecciona una opción...</option>
                      {(campo.opciones || []).map((opt: string, i: number) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {campo.tipo === 'radio' && (
                    <div className="space-y-2 pt-1">
                      {(campo.opciones || []).map((opt: string, i: number) => (
                        <label key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                          <input
                            type="radio"
                            name={campo.id}
                            value={opt}
                            required={campo.requerido && !valor}
                            checked={valor === opt}
                            onChange={(e) => handleInputChange(campo.id, e.target.value)}
                            className="w-4 h-4 text-slate-900 focus:ring-slate-900 border-slate-300"
                          />
                          <span className="text-sm font-medium text-slate-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {campo.tipo === 'checkbox' && (
                    <div className="space-y-2 pt-1">
                      {(campo.opciones || []).map((opt: string, i: number) => {
                        const seleccionados: string[] = Array.isArray(valor) ? valor : [];
                        const isChecked = seleccionados.includes(opt);
                        return (
                          <label key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleCheckboxChange(campo.id, opt, e.target.checked)}
                              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                            />
                            <span className="text-sm font-medium text-slate-700">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {campo.tipo === 'file' && (
                    <div className="space-y-2 pt-1">
                      <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-6 text-center transition-all bg-slate-50/50 relative">
                        <input
                          type="file"
                          accept={
                            campo.archivoTipos === 'imagen' 
                              ? 'image/*' 
                              : campo.archivoTipos === 'pdf' 
                              ? 'application/pdf,.pdf' 
                              : 'image/*,application/pdf,.pdf'
                          }
                          required={campo.requerido && !valor}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleSubirArchivo(campo.id, f);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />

                        {archivoInfo?.subiendo ? (
                          <div className="flex flex-col items-center gap-2 py-2">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
                            <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                              Subiendo {archivoInfo.nombre}...
                            </p>
                          </div>
                        ) : valor ? (
                          <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-wider py-1">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Archivo cargado: {archivoInfo?.nombre || 'Ver Documento'}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <UploadCloud className="w-8 h-8 text-slate-400" />
                            <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                              Haz clic para seleccionar o arrastra el archivo aquí
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {campo.archivoTipos === 'imagen' 
                                ? 'Formatos permitidos: JPG, PNG (Máx 5MB)' 
                                : campo.archivoTipos === 'pdf' 
                                ? 'Formato permitido: Documento PDF (Máx 5MB)' 
                                : 'Formatos permitidos: Imágenes y PDFs (Máx 5MB)'}
                            </p>
                          </div>
                        )}
                      </div>

                      {valor && (
                        <div className="flex justify-end">
                          <a
                            href={valor}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> Previsualizar archivo subido
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="pt-4">
              <button
                type="submit"
                disabled={enviando}
                className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-wider hover:bg-slate-800 shadow-xl shadow-slate-900/10 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: brandColor }}
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando respuestas...
                  </>
                ) : (
                  <>
                    <span>Enviar Formulario</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center py-6 text-slate-400 text-xs flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              Formulario seguro alojado en Gibbor Multiclub
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
