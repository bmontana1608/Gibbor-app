'use client';

import React, { useState } from 'react';
import { 
  Sparkles, Plus, Trash2, ArrowUp, ArrowDown, Copy, 
  FileText, AlignLeft, Hash, 
  Mail, Phone, Calendar, ChevronDown, CheckSquare, 
  Radio, UploadCloud, Save, Eye, Loader2, ArrowLeft,
  Image as ImageIcon, X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export type TipoCampo = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'email' 
  | 'tel' 
  | 'date' 
  | 'select' 
  | 'radio' 
  | 'checkbox' 
  | 'file';

export interface FormField {
  id: string;
  label: string;
  tipo: TipoCampo;
  placeholder?: string;
  requerido: boolean;
  opciones?: string[];
  archivoTipos?: 'imagen' | 'pdf' | 'todos';
}

interface FormBuilderProps {
  initialData?: {
    id?: string;
    titulo: string;
    descripcion?: string;
    estado?: 'activo' | 'inactivo' | 'cerrado';
    logo_url?: string;
    campos: FormField[];
  };
  clubId: string;
  onSave: (data: { titulo: string; descripcion: string; estado: string; campos: FormField[]; logo_url?: string }) => Promise<void>;
  saving?: boolean;
  onBack?: () => void;
  publicUrl?: string;
}

const TIPOS_INFO: Record<TipoCampo, { label: string; icon: React.ReactNode }> = {
  text: { label: 'Texto corto', icon: <FileText className="w-4 h-4" /> },
  textarea: { label: 'Párrafo / Texto largo', icon: <AlignLeft className="w-4 h-4" /> },
  number: { label: 'Número', icon: <Hash className="w-4 h-4" /> },
  email: { label: 'Correo electrónico', icon: <Mail className="w-4 h-4" /> },
  tel: { label: 'Teléfono / WhatsApp', icon: <Phone className="w-4 h-4" /> },
  date: { label: 'Fecha', icon: <Calendar className="w-4 h-4" /> },
  select: { label: 'Menú desplegable', icon: <ChevronDown className="w-4 h-4" /> },
  radio: { label: 'Opción múltiple (Única)', icon: <Radio className="w-4 h-4" /> },
  checkbox: { label: 'Casillas de verificación', icon: <CheckSquare className="w-4 h-4" /> },
  file: { label: 'Subir Archivo (Foto / PDF)', icon: <UploadCloud className="w-4 h-4" /> },
};

const SUGERENCIAS_IA = [
  'Carnetización oficial para torneo (con foto y PDF documento)',
  'Inscripción a nueva temporada deportiva',
  'Ficha médica deportiva y antecedentes de salud',
  'Consentimiento de padres y datos de contacto de emergencia'
];

export default function FormBuilder({
  initialData,
  clubId,
  onSave,
  saving = false,
  onBack,
  publicUrl
}: FormBuilderProps) {
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '');
  const [estado, setEstado] = useState<'activo' | 'inactivo' | 'cerrado'>(initialData?.estado || 'activo');
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url || '');
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [campos, setCampos] = useState<FormField[]>(
    initialData?.campos && initialData.campos.length > 0 
      ? initialData.campos 
      : [
          { id: 'c_1', label: 'Nombre Completo', tipo: 'text', requerido: true, placeholder: 'Ej: Juan Pérez' },
          { id: 'c_2', label: 'Número de Contacto / WhatsApp', tipo: 'tel', requerido: true, placeholder: 'Ej: 3123456789' }
        ]
  );

  // Estado para la IA
  const [aiPrompt, setAiPrompt] = useState('');
  const [generandoIA, setGenerandoIA] = useState(false);
  const [mostrarIA, setMostrarIA] = useState(!initialData?.id);

  // Manejadores de campos
  const agregarCampo = (tipo: TipoCampo = 'text') => {
    const nuevoCampo: FormField = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: 'Nuevo Campo',
      tipo,
      placeholder: '',
      requerido: false,
      opciones: ['select', 'radio', 'checkbox'].includes(tipo) ? ['Opción 1', 'Opción 2'] : undefined,
      archivoTipos: tipo === 'file' ? 'todos' : undefined
    };
    setCampos([...campos, nuevoCampo]);
  };

  const actualizarCampo = (id: string, updates: Partial<FormField>) => {
    setCampos(campos.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...updates };

      if (updates.tipo) {
        if (['select', 'radio', 'checkbox'].includes(updates.tipo) && (!updated.opciones || updated.opciones.length === 0)) {
          updated.opciones = ['Opción 1', 'Opción 2'];
        }
        if (updates.tipo === 'file' && !updated.archivoTipos) {
          updated.archivoTipos = 'todos';
        }
      }

      return updated;
    }));
  };

  const eliminarCampo = (id: string) => {
    if (campos.length <= 1) {
      toast.error('El formulario debe tener al menos un campo.');
      return;
    }
    setCampos(campos.filter(c => c.id !== id));
  };

  const duplicarCampo = (campo: FormField) => {
    const nuevo: FormField = {
      ...campo,
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: `${campo.label} (Copia)`
    };
    const index = campos.findIndex(c => c.id === campo.id);
    const nuevosCampos = [...campos];
    nuevosCampos.splice(index + 1, 0, nuevo);
    setCampos(nuevosCampos);
  };

  const moverCampo = (index: number, direccion: 'up' | 'down') => {
    if (direccion === 'up' && index === 0) return;
    if (direccion === 'down' && index === campos.length - 1) return;

    const nuevos = [...campos];
    const targetIndex = direccion === 'up' ? index - 1 : index + 1;
    const temp = nuevos[index];
    nuevos[index] = nuevos[targetIndex];
    nuevos[targetIndex] = temp;
    setCampos(nuevos);
  };

  // Opciones de selección
  const agregarOpcion = (campoId: string) => {
    setCampos(campos.map(c => {
      if (c.id !== campoId) return c;
      const opts = c.opciones || [];
      return { ...c, opciones: [...opts, `Opción ${opts.length + 1}`] };
    }));
  };

  const actualizarOpcion = (campoId: string, index: number, valor: string) => {
    setCampos(campos.map(c => {
      if (c.id !== campoId) return c;
      const opts = [...(c.opciones || [])];
      opts[index] = valor;
      return { ...c, opciones: opts };
    }));
  };

  const eliminarOpcion = (campoId: string, index: number) => {
    setCampos(campos.map(c => {
      if (c.id !== campoId) return c;
      const opts = (c.opciones || []).filter((_, i) => i !== index);
      return { ...c, opciones: opts.length > 0 ? opts : ['Opción 1'] };
    }));
  };

  // Generación con IA
  const generarConGemini = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Por favor escribe la descripción de tu formulario.');
      return;
    }

    setGenerandoIA(true);
    try {
      const res = await fetch('/api/ai/generar-formulario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, clubId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al generar formulario con IA');
      }

      if (data.formulario) {
        if (data.formulario.titulo) setTitulo(data.formulario.titulo);
        if (data.formulario.descripcion) setDescripcion(data.formulario.descripcion);
        if (data.formulario.campos && Array.isArray(data.formulario.campos) && data.formulario.campos.length > 0) {
          setCampos(data.formulario.campos);
        }
        toast.success('¡Formulario creado por la IA de Gemini con éxito!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al conectar con la IA');
    } finally {
      setGenerandoIA(false);
    }
  };

  // Subir logo personalizado del formulario
  const handleSubirLogo = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5MB.');
      return;
    }

    setSubiendoLogo(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const cleanFileName = `logos/${clubId || 'general'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;

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

      setLogoUrl(publicUrl);
      toast.success('¡Logo personalizado cargado con éxito!');
    } catch (err: any) {
      console.error('Error subiendo logo:', err);
      toast.error('Error al subir el logo: ' + err.message);
    } finally {
      setSubiendoLogo(false);
    }
  };

  // Guardar formulario
  const handleGuardar = async () => {
    if (!titulo.trim()) {
      toast.error('El título del formulario es obligatorio.');
      return;
    }
    if (campos.length === 0) {
      toast.error('Agrega al menos un campo al formulario.');
      return;
    }

    await onSave({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      estado,
      campos,
      logo_url: logoUrl || undefined
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Barra Superior con Navegación y Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-4 z-20 backdrop-blur-md bg-white/90 dark:bg-slate-900/90">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {initialData?.id ? 'Editar Formulario' : 'Nuevo Formulario'}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {campos.length} {campos.length === 1 ? 'campo configurado' : 'campos configurados'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> Vista Pública
            </a>
          )}

          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as any)}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-none outline-none cursor-pointer ${
              estado === 'activo' 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                : estado === 'cerrado'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <option value="activo">● Activo (Recibiendo)</option>
            <option value="inactivo">○ Borrador (Inactivo)</option>
            <option value="cerrado">✕ Cerrado</option>
          </select>

          <button
            onClick={handleGuardar}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-black text-xs uppercase tracking-wider hover:opacity-90 shadow-md shadow-brand/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {initialData?.id ? 'Guardar Cambios' : 'Publicar Formulario'}
          </button>
        </div>
      </div>

      {/* SECCIÓN IA (GEMINI FORM GENERATOR) */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 rounded-[2.5rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-500/30">
        <div className="absolute -right-10 -bottom-10 w-52 h-52 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-52 h-52 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                Generador Inteligente con Gemini AI
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">
                  IA Mágica
                </span>
              </h3>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Describe lo que necesitas en lenguaje natural y la inteligencia artificial construirá todos los campos en segundos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMostrarIA(!mostrarIA)}
            className="text-xs text-indigo-300 hover:text-white font-bold underline transition-colors"
          >
            {mostrarIA ? 'Ocultar' : 'Abrir'}
          </button>
        </div>

        {mostrarIA && (
          <div className="space-y-4 relative z-10 mt-4 pt-4 border-t border-white/10">
            <div className="relative">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                placeholder="Ej: Necesito un formulario para la carnetización de la Copa Llaneros, debe llevar nombre completo, apellidos, tipo de documento, número de documento, fecha de nacimiento, adjuntar foto tipo documento y adjuntar PDF del documento de identidad por ambas caras..."
                className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm text-white placeholder:text-indigo-200/50 outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 items-center text-xs">
                <span className="text-indigo-300/70 font-semibold text-[11px]">Ejemplos rápidos:</span>
                {SUGERENCIAS_IA.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAiPrompt(sug)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-indigo-200 hover:text-white text-[11px] font-medium transition-colors"
                  >
                    {sug.split('(')[0]}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={generarConGemini}
                disabled={generandoIA || !aiPrompt.trim()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {generandoIA ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gemini está pensando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    Generar Formulario
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CABECERA DEL FORMULARIO (TÍTULO, DESCRIPCIÓN Y LOGO) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 border-t-4 border-t-brand">
        {/* SECCIÓN LOGO PERSONALIZADO */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative group w-20 h-20 rounded-2xl bg-white p-2 border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                <img src={logoUrl} alt="Logo Formulario" className="max-w-full max-h-full object-contain" />
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full shadow hover:bg-rose-600 transition-colors"
                  title="Eliminar logo personalizado (usar el del club)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-200/70 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0">
                <ImageIcon className="w-7 h-7 stroke-[1.5]" />
              </div>
            )}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                Logo del Formulario / Torneo
                {logoUrl && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    Personalizado
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-snug">
                {logoUrl
                  ? 'Este logo se mostrará de forma destacada en la parte superior del formulario público.'
                  : 'Opcional. Si no subes ninguno, se mostrará automáticamente el escudo oficial de tu academia.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm cursor-pointer transition-all">
              {subiendoLogo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 text-brand" />
                  {logoUrl ? 'Cambiar Logo' : 'Subir Logo Propio'}
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={subiendoLogo}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSubirLogo(file);
                }}
              />
            </label>

            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl('')}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                Quitar
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Título del Formulario *
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Carnetización Copa Llaneros 2026"
            className="w-full text-xl md:text-2xl font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Descripción / Instrucciones
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Explica brevemente a los jugadores o padres el propósito de este formulario..."
            className="w-full text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all resize-none"
          />
        </div>
      </div>

      {/* LISTA DE CAMPOS (TIPO GOOGLE FORMS) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Campos del Formulario ({campos.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Puedes reordenar o personalizar cada pregunta
          </span>
        </div>

        {campos.map((campo, index) => (
          <div
            key={campo.id}
            className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
          >
            {/* Cabecera del campo: Orden y Tipo */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">
                  {index + 1}
                </span>

                <div className="relative">
                  <select
                    value={campo.tipo}
                    onChange={(e) => actualizarCampo(campo.id, { tipo: e.target.value as TipoCampo })}
                    className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-9 pr-8 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-brand"
                  >
                    {Object.entries(TIPOS_INFO).map(([tipoKey, info]) => (
                      <option key={tipoKey} value={tipoKey}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {TIPOS_INFO[campo.tipo]?.icon}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Acciones de reordenar y eliminar */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moverCampo(index, 'up')}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                  title="Subir campo"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moverCampo(index, 'down')}
                  disabled={index === campos.length - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                  title="Bajar campo"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => duplicarCampo(campo)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  title="Duplicar"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => eliminarCampo(campo.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inputs de Label y Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Pregunta / Etiqueta del Campo *
                </label>
                <input
                  type="text"
                  value={campo.label}
                  onChange={(e) => actualizarCampo(campo.id, { label: e.target.value })}
                  placeholder="Ej: Nombre del Jugador"
                  className="w-full text-sm font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Texto de Ayuda / Ejemplo (Placeholder)
                </label>
                <input
                  type="text"
                  value={campo.placeholder || ''}
                  onChange={(e) => actualizarCampo(campo.id, { placeholder: e.target.value })}
                  placeholder="Ej: Ingrese nombres completos sin abreviaturas"
                  className="w-full text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand transition-all"
                />
              </div>
            </div>

            {/* Configuraciones específicas según el tipo */}
            {['select', 'radio', 'checkbox'].includes(campo.tipo) && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Opciones de Respuesta
                </label>
                <div className="space-y-2">
                  {(campo.opciones || []).map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs font-bold w-5">{optIndex + 1}.</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => actualizarOpcion(campo.id, optIndex, e.target.value)}
                        className="flex-1 text-xs font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand"
                      />
                      {(campo.opciones || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarOpcion(campo.id, optIndex)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => agregarOpcion(campo.id)}
                  className="text-xs font-bold text-brand hover:underline flex items-center gap-1 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar otra opción
                </button>
              </div>
            )}

            {campo.tipo === 'file' && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Formatos de Archivo Permitidos</p>
                  <p className="text-[11px] text-slate-400">Define qué tipo de archivo puede adjuntar el usuario</p>
                </div>
                <select
                  value={campo.archivoTipos || 'todos'}
                  onChange={(e) => actualizarCampo(campo.id, { archivoTipos: e.target.value as any })}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="todos">Cualquiera (Imágenes y PDFs)</option>
                  <option value="imagen">Solo Fotos / Imágenes (.jpg, .png)</option>
                  <option value="pdf">Solo Documentos PDF (.pdf)</option>
                </select>
              </div>
            )}

            {/* Switch de Obligatorio */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>¿Campo Obligatorio?</span>
                <input
                  type="checkbox"
                  checked={campo.requerido}
                  onChange={(e) => actualizarCampo(campo.id, { requerido: e.target.checked })}
                  className="w-4 h-4 rounded text-brand focus:ring-brand border-slate-300 cursor-pointer"
                />
              </label>
            </div>
          </div>
        ))}

        {/* Botón flotante para agregar campo */}
        <div className="flex flex-wrap gap-2 justify-center pt-4">
          <button
            type="button"
            onClick={() => agregarCampo('text')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-brand" />
            Agregar Pregunta / Campo
          </button>
        </div>
      </div>
    </div>
  );
}
