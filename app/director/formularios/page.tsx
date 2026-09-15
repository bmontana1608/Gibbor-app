'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileSpreadsheet, Plus, Sparkles, Copy, Eye, 
  Trash2, ExternalLink, Users, Calendar, CheckCircle2, 
  AlertCircle, RefreshCw, BookOpen, MessageSquareShare
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import { useTranslation } from '@/lib/i18n/LanguageContext';

export default function FormulariosDirectorPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { route, slug: tenantSlug } = useTenant();

  const [formularios, setFormularios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setCargando(true);
      if (!tenantSlug) return;

      try {
        const resTenant = await fetch('/api/tenant?slug=' + tenantSlug);
        const tenantData = await resTenant.json();
        setTenant(tenantData);

        if (tenantData?.id) {
          await cargarFormularios(tenantData.id);
        }
      } catch (err: any) {
        toast.error(`${t('formularios.error_starting')} ${err.message}`);
      } finally {
        setCargando(false);
      }
    }
    init();
  }, [tenantSlug]);

  const cargarFormularios = async (clubId: string) => {
    try {
      const res = await fetch(`/api/formularios?clubId=${clubId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('formularios.error_loading_forms'));
      setFormularios(data.formularios || []);
    } catch (err: any) {
      toast.error(`${t('formularios.error_loading_forms')} ${err.message}`);
    }
  };

  const copiarEnlace = (formId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/f/${formId}`;
    navigator.clipboard.writeText(url);
    toast.success(t('formularios.public_link_copied'));
  };

  const eliminarFormulario = async (id: string, titulo: string) => {
    if (!confirm(`${t('formularios.sure_delete_form')} "${titulo}"? ${t('formularios.also_delete_associated_responses')}`)) {
      return;
    }

    setEliminandoId(id);
    try {
      const res = await fetch(`/api/formularios/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('formularios.error_deleting'));

      setFormularios(prev => prev.filter(f => f.id !== id));
      toast.success(t('formularios.form_deleted_success'));
    } catch (err: any) {
      toast.error(err.message || t('formularios.error_deleting_form'));
    } finally {
      setEliminandoId(null);
    }
  };

  // KPIs
  const totalRespuestas = formularios.reduce((acc, f) => acc + (f.total_respuestas || 0), 0);
  const activos = formularios.filter(f => f.estado === 'activo').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-100 transition-colors pb-24">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-3">
            <FileSpreadsheet className="text-brand w-8 h-8" /> {t('formularios.dynamic_forms')}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {t('formularios.create_forms_ai_description')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={route('/director/formularios/nuevo')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            {t('formularios.new_form_ai')}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* KPIS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('formularios.created_forms')}</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{formularios.length}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">{t('formularios.in_this_academy')}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('formularios.active_forms')}</p>
            <h3 className="text-3xl font-black text-emerald-500">{activos}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">{t('formularios.receiving_responses')}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('formularios.total_responses')}</p>
            <h3 className="text-3xl font-black text-indigo-500">{totalRespuestas}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">{t('formularios.collected_until_today')}</p>
          </div>
        </div>

        {/* LISTA / TABLA DE FORMULARIOS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {t('formularios.your_forms')}
            </h2>
            <button
              onClick={() => tenant?.id && cargarFormularios(tenant.id)}
              className="p-2 text-slate-400 hover:text-brand rounded-xl transition-all"
              title="Recargar"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-widest font-black text-slate-400">
                  <th className="p-5 font-black">{t('formularios.title_and_description')}</th>
                  <th className="p-5 font-black text-center">{t('formularios.status')}</th>
                  <th className="p-5 font-black text-center">{t('formularios.fields')}</th>
                  <th className="p-5 font-black text-center">{t('formularios.responses')}</th>
                  <th className="p-5 font-black text-center">{t('formularios.date')}</th>
                  <th className="p-5 font-black text-right">{t('formularios.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {cargando ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-5"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-48 mb-2" /><div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-64" /></td>
                      <td className="p-5"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full w-20 mx-auto" /></td>
                      <td className="p-5"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-10 mx-auto" /></td>
                      <td className="p-5"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-12 mx-auto" /></td>
                      <td className="p-5"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-20 mx-auto" /></td>
                      <td className="p-5"><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : formularios.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center">
                      <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500 font-bold text-sm">{t('formularios.no_forms_created_yet')}</p>
                      <p className="text-slate-400 text-xs mt-1 mb-4">
                        {t('formularios.use_ai_describe_idea')}
                      </p>
                      <Link
                        href={route('/director/formularios/nuevo')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" /> {t('formularios.create_first_form')}
                      </Link>
                    </td>
                  </tr>
                ) : (
                  formularios.map(form => (
                    <tr key={form.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="p-5">
                        <Link href={route(`/director/formularios/${form.id}`)} className="font-black text-slate-900 dark:text-white hover:text-brand transition-colors text-sm block">
                          {form.titulo}
                        </Link>
                        {form.descripcion && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {form.descripcion}
                          </p>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          form.estado === 'activo'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : form.estado === 'cerrado'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {form.estado === 'activo' ? t('formularios.active_status') : form.estado === 'cerrado' ? t('formularios.closed_status') : t('formularios.draft_status')}
                        </span>
                      </td>
                      <td className="p-5 text-center font-bold text-xs text-slate-600 dark:text-slate-300">
                        {form.total_campos || 0}
                      </td>
                      <td className="p-5 text-center">
                        <Link
                          href={route(`/director/formularios/${form.id}?tab=respuestas`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" /> {form.total_respuestas || 0}
                        </Link>
                      </td>
                      <td className="p-5 text-center text-xs text-slate-400 whitespace-nowrap">
                        {new Date(form.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => copiarEnlace(form.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            title={t('formularios.copy_public_link')}
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <a
                            href={`/f/${form.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            title={t('formularios.view_public_form')}
                          >
                            <Eye className="w-4 h-4" />
                          </a>

                          <Link
                            href={route(`/director/formularios/${form.id}?tab=respuestas`)}
                            className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            title={t('formularios.view_responses_download_excel')}
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => eliminarFormulario(form.id, form.titulo)}
                            disabled={eliminandoId === form.id}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                            title={t('formularios.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
