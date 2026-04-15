'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Definición de los planes base de Gibbor
const PLANES_CONFIG = [
  { nombre: 'Regular', precio: 70000, descuento: 10000, tipo: 'Mensualidad' },
  { nombre: 'Fin de semana', precio: 60000, descuento: 10000, tipo: 'Mensualidad' },
  { nombre: 'Beca 50%', precio: 35000, descuento: 5000, tipo: 'Beca Parcial' },
  { nombre: 'Beca 100%', precio: 0, descuento: 0, tipo: 'Beca Total' }
];

export default function GestionDePlanes() {
  const router = useRouter();
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    async function cargarDatos() {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombres, apellidos, tipo_plan')
        .neq('rol', 'Entrenador')
        .order('nombres', { ascending: true });

      if (!error && data) {
        setJugadores(data);
      }
      setCargando(false);
    }
    cargarDatos();
  }, []);

  // Agrupar jugadores por plan para mostrarlos en las tarjetas
  const getJugadoresPorPlan = (nombrePlan: string) => {
    // Si el plan es Regular, incluimos a los que tienen "Regular" o los que tienen el campo vacío/null
    return jugadores.filter(j => {
      const planJugador = j.tipo_plan || 'Regular';
      return planJugador === nombrePlan;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      
      {/* 1. CABECERA Y BOTÓN VOLVER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div className="flex gap-4 items-start">
          <button 
            onClick={() => router.back()}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2 mt-1"
          >
            ← Volver
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestión de Planes de Acceso</h1>
            <p className="text-sm text-slate-500 mt-1">Visualiza y edita los planes existentes y los alumnos asociados a cada uno.</p>
          </div>
        </div>
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
          <span>👥</span> Crear Miembro con Acceso
        </button>
      </div>

      {/* 2. ALERTA INFORMATIVA (Réplica del diseño) */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 shadow-sm">
        <h3 className="text-amber-800 font-bold text-sm mb-2 flex items-center gap-2">
          <span>⚠️</span> Importante: Diferencia entre Planes y Alumnos Asociados
        </h3>
        <ul className="text-sm text-amber-700 space-y-1.5 ml-6 list-disc marker:text-amber-400">
          <li><strong className="font-bold">Planes de Acceso:</strong> Definen los precios base y los descuentos por pronto pago.</li>
          <li><strong className="font-bold">Alumnos Asociados:</strong> Cada alumno hereda el precio del plan al que pertenece.</li>
          <li><strong className="font-bold">Asignación Rápida:</strong> Para cambiar a un alumno de plan, puedes hacerlo desde la tabla principal de Cobranza o editando su perfil.</li>
        </ul>
      </div>

      {/* 3. BUSCADOR Y KPIs */}
      <div className="mb-6">
        <div className="relative mb-6 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar planes..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total de Planes</p>
              <p className="text-2xl font-black text-slate-800">{PLANES_CONFIG.length}</p>
            </div>
            <span className="text-orange-500 text-3xl">🛡️</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Planes Activos</p>
              <p className="text-2xl font-black text-purple-600">{PLANES_CONFIG.length}</p>
            </div>
            <span className="text-purple-500 text-3xl">📈</span>
          </div>
        </div>
      </div>

      {/* 4. GRID DE TARJETAS DE PLANES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {PLANES_CONFIG.map((plan, index) => {
          const alumnosEnPlan = getJugadoresPorPlan(plan.nombre);
          
          return (
            <div key={index} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
              
              {/* Título de la Tarjeta */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-800">{plan.nombre}</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">{plan.tipo}</p>
              </div>

              {/* Detalles de Precio */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>👥</span> Entradas ilimitadas
                </div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-emerald-500">💲</span> 
                  Precio: <span className="font-bold text-slate-800">${plan.precio.toLocaleString('es-CO')}</span>
                  <span className="text-slate-400 text-xs ml-1">({alumnosEnPlan.length} alumnos)</span>
                </div>
              </div>

              {/* Lista de Alumnos Asociados (Scrollable) */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-5 flex-1">
                <h4 className="text-xs font-bold text-slate-800 mb-3">Alumnos Asociados ({alumnosEnPlan.length})</h4>
                
                {cargando ? (
                  <p className="text-xs text-slate-400">Cargando...</p>
                ) : alumnosEnPlan.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay alumnos en este plan.</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                    {alumnosEnPlan.map(a => (
                      <div key={a.id} className="flex justify-between items-center border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                        <span className="text-xs text-slate-600 truncate mr-2">{a.nombres} {a.apellidos}</span>
                        <span className="text-xs font-bold text-slate-800 shrink-0">${plan.precio.toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Configuración de Fechas */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-blue-500">⏱️</span> Día de cobro: 1 de cada mes
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-purple-500">🛡️</span> Periodo de gracia: 5 días
                </div>
                {plan.descuento > 0 && (
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit mt-2">
                    <span>✅</span> Pronto pago: ${plan.descuento.toLocaleString('es-CO')} descuento
                  </div>
                )}
              </div>

              {/* Botonera de Acción (Visuales) */}
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button className="border border-slate-200 text-slate-600 hover:bg-slate-50 py-1.5 rounded-lg text-xs font-bold transition-colors">
                  ✏️ Editar
                </button>
                <button className="border border-emerald-200 text-emerald-600 hover:bg-emerald-50 py-1.5 rounded-lg text-xs font-bold transition-colors">
                  💲 Precio
                </button>
                <button className="border border-blue-200 text-blue-600 hover:bg-blue-50 py-1.5 rounded-lg text-xs font-bold transition-colors">
                  ⏱️ Días
                </button>
                <button className="border border-purple-200 text-purple-600 hover:bg-purple-50 py-1.5 rounded-lg text-xs font-bold transition-colors">
                  🛡️ Gracia
                </button>
                <button className="border border-orange-200 text-orange-600 hover:bg-orange-50 py-1.5 rounded-lg text-xs font-bold transition-colors col-span-2">
                  ✅ Configurar Pronto Pago
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}