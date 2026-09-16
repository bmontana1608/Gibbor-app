'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ImportadorViewProps {
  onImportComplete: () => void;
}

export default function ImportadorView({ onImportComplete }: ImportadorViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ total: number; insertados: number; actualizados: number; errores: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls') && !selectedFile.name.endsWith('.csv')) {
      toast.error('Formato no soportado', { description: 'Por favor, sube un archivo Excel (.xlsx) o CSV.' });
      return;
    }
    setFile(selectedFile);
    setResults(null);
  };

  const procesarArchivo = async () => {
    if (!file) return;
    setIsProcessing(true);
    setResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error('Archivo vacío');
        setIsProcessing(false);
        return;
      }

      let insertados = 0;
      let actualizados = 0;
      let errores = 0;

      for (const row of jsonData) {
        // Extraer y normalizar campos (Apify format)
        const nombre = row.title || row.nombre || row.Name || '';
        if (!nombre) {
          errores++;
          continue;
        }

        const telefono = row.phone || row.telefono || row.Phone || '';
        const website = row.website || row.sitio_web || row.Website || '';
        const direccion = row.address || row.direccion || row.Address || '';
        const ciudad = row.city || row.ciudad || row.City || '';
        const categoria = row.categoryName || row.categoria || row.Category || '';
        const rating = parseFloat(row.totalScore || row.rating || row.Rating) || 0;
        const reviews = parseInt(row.reviewsCount || row.reviews || row.Reviews) || 0;
        const latitud = parseFloat(row.latitude || row.latitud || row.Lat) || null;
        const longitud = parseFloat(row.longitude || row.longitud || row.Lng) || null;

        // Limpiar URL para validación
        const cleanWebsite = website ? website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';

        // Buscar duplicados: 1. Website, 2. Teléfono, 3. Nombre + Ciudad
        let query = supabase.from('atlas_academias').select('id');
        
        if (cleanWebsite) {
          query = query.ilike('website', `%${cleanWebsite}%`);
        } else if (telefono) {
          query = query.eq('telefono', telefono);
        } else {
          query = query.ilike('nombre', nombre).ilike('ciudad', ciudad);
        }

        const { data: posiblesDuplicados, error: searchError } = await query;

        if (searchError) {
          console.error("Error buscando duplicados:", searchError);
          errores++;
          continue;
        }

        // Calcular Score (0 - 100)
        let score = 0;
        if (website) score += 20;
        if (telefono) score += 20;
        if (rating >= 4.5) score += 20;
        if (reviews > 20) score += 20;
        if (categoria.toLowerCase().includes('futbol') || categoria.toLowerCase().includes('soccer') || categoria.toLowerCase().includes('football') || categoria.toLowerCase().includes('fútbol')) score += 20;

        // Calcular Prioridad
        let prioridad = 'Baja';
        if (score >= 90) prioridad = 'Muy Alta';
        else if (score >= 70) prioridad = 'Alta';
        else if (score >= 50) prioridad = 'Media';

        const record = {
          nombre,
          telefono,
          website,
          direccion,
          ciudad,
          categoria,
          rating,
          reviews,
          latitud,
          longitud,
          score,
          prioridad
        };

        if (posiblesDuplicados && posiblesDuplicados.length > 0) {
          // Existe: Actualizar (No sobrescribir estado, etc)
          const { error: updateError } = await supabase
            .from('atlas_academias')
            .update(record)
            .eq('id', posiblesDuplicados[0].id);
          
          if (updateError) errores++;
          else actualizados++;
        } else {
          // No existe: Insertar
          const { error: insertError } = await supabase
            .from('atlas_academias')
            .insert({ ...record, estado: 'Prospecto', fecha_importacion: new Date().toISOString() });
          
          if (insertError) errores++;
          else insertados++;
        }
      }

      setResults({ total: jsonData.length, insertados, actualizados, errores });
      toast.success(`Proceso completado: ${insertados} insertados, ${actualizados} actualizados.`);

    } catch (err) {
      console.error(err);
      toast.error('Error procesando el archivo', { description: 'Verifica que el archivo no esté corrupto y tenga los encabezados correctos.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-slate-900 mb-2">Importador Apify / Excel</h2>
          <p className="text-slate-500">Sube tus archivos de bases de datos externas. El sistema calculará el Score de cada academia y eliminará duplicados automáticamente.</p>
        </div>

        {!results ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center transition-all hover:border-slate-400 hover:bg-slate-50">
            <div 
              onDragOver={handleDragOver} 
              onDragLeave={handleDragLeave} 
              onDrop={handleDrop}
              className={`w-full h-full ${isDragging ? 'opacity-50' : ''}`}
            >
              <FileSpreadsheet className="w-16 h-16 text-slate-300 mx-auto mb-6" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">Arrastra tu archivo aquí</h3>
              <p className="text-slate-400 text-sm mb-6">Archivos soportados: .xlsx, .csv</p>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileChange}
              />
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                  disabled={isProcessing}
                >
                  Seleccionar Archivo
                </button>
                {file && (
                  <button 
                    onClick={procesarArchivo}
                    className="bg-slate-900 text-white font-bold py-3 px-6 rounded-xl hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2"
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                    {isProcessing ? 'Procesando...' : `Importar ${file.name}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center mb-8">Importación Completada</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Total</p>
                <p className="text-3xl font-black text-slate-900">{results.total}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
                <p className="text-green-600/60 text-sm font-bold uppercase tracking-wider mb-1">Nuevos</p>
                <p className="text-3xl font-black text-green-600">{results.insertados}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                <p className="text-blue-600/60 text-sm font-bold uppercase tracking-wider mb-1">Actualizados</p>
                <p className="text-3xl font-black text-blue-600">{results.actualizados}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                <p className="text-red-600/60 text-sm font-bold uppercase tracking-wider mb-1">Errores</p>
                <p className="text-3xl font-black text-red-600">{results.errores}</p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button 
                onClick={() => { setFile(null); setResults(null); }}
                className="bg-white border border-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                Importar Otro
              </button>
              <button 
                onClick={onImportComplete}
                className="bg-slate-900 text-white font-bold py-3 px-6 rounded-xl hover:bg-slate-800 transition-colors shadow-md"
              >
                Ir al Atlas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
