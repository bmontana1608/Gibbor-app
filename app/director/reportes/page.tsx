'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertCircle, Calendar, 
  ArrowUpRight, ArrowDownRight, CreditCard, RefreshCw, Wallet, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/lib/hooks/useTenant';
import * as XLSX from 'xlsx';

export default function ModuloReportes() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const { slug: tenantSlug } = useTenant();
  
  // Data State
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [egresos, setEgresos] = useState<any[]>([]);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [abonos, setAbonos] = useState<any[]>([]);
  
  // Filter State
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(new Date().getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(new Date().getFullYear());
  const [pestañaTabla, setPestañaTabla] = useState<'Ingresos' | 'Egresos' | 'Cartera'>('Ingresos');

  useEffect(() => {
    async function init() {
      setCargando(true);
      if (!tenantSlug) return;
      
      const resTenant = await fetch(`/api/tenant?slug=${tenantSlug}`);
      const tenantData = await resTenant.json();
      setTenant(tenantData);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // SEGURIDAD: Verificar que el usuario pertenece al club logueado
      const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single();
      
      if (perfil?.rol !== 'SuperAdmin' && perfil?.club_id !== tenantData.id) {
        toast.error("No tienes permiso para acceder a los reportes de este club.");
        if (perfil?.club_id) {
          const { data: c } = await supabase.from('clubes').select('slug').eq('id', perfil.club_id).single();
          if (c) router.push(`/${c.slug}/director/reportes`);
        } else {
          router.push('/login');
        }
        return;
      }

      if (tenantData.id) {
        cargarDatos(tenantData.id);
      }
    }
    init();
  }, [tenantSlug]);

  const cargarDatos = async (clubId: string) => {
    setCargando(true);
    
    // Obtener todos los ingresos
    const { data: ingresosData } = await supabase.from('pagos_ingresos').select('*').eq('club_id', clubId).order('fecha', { ascending: false });
    if (ingresosData) setIngresos(ingresosData);

    // Obtener todos los egresos
    const { data: egresosData } = await supabase.from('pagos_egresos').select('*').eq('club_id', clubId).order('fecha', { ascending: false });
    if (egresosData) setEgresos(egresosData);

    // Obtener perfiles para cartera
    const { data: perfilesData } = await supabase.from('perfiles').select('*').eq('club_id', clubId).eq('rol', 'Futbolista');
    if (perfilesData) setPerfiles(perfilesData);

    // Obtener planes
    const { data: planesData } = await supabase.from('planes').select('*').eq('club_id', clubId);
    if (planesData) setPlanes(planesData);

      const { data: abonosData } = await supabase.from('abonos').select('*').eq('club_id', clubId);
      if (abonosData) setAbonos(abonosData);

    setCargando(false);
  };

  const actualizarDatos = async () => {
    const toastId = toast.loading("Actualizando métricas...");
    if (tenant?.id) await cargarDatos(tenant.id);
    toast.success("Métricas financieras actualizadas", { id: toastId });
  };

  const calcularTarifa = (planId: string) => {
    const plan = planes.find(p => p.nombre === planId);
    return plan ? Number(plan.precio_base) : 0;
  };

  // --- FILTROS DE FECHA ---
  // Extraemos YYYY-MM directamente de la cadena ISO (ej: 2026-07-01T00:00:00+00:00 -> 2026 y 07)
  const getYearStr = (f: string) => Number(f.substring(0, 4));
  const getMonthStr = (f: string) => Number(f.substring(5, 7)) - 1;

  const esDelMes = (fechaStr: string) => {
    if (!fechaStr) return false;
    return getMonthStr(fechaStr) === mesSeleccionado && getYearStr(fechaStr) === anioSeleccionado;
  };

  const ingresosMes = ingresos.filter(i => esDelMes(i.fecha));
  const egresosMes = egresos.filter(e => esDelMes(e.fecha));

  // --- KPIs FINANCIEROS ---
  const totalIngresosMes = ingresosMes.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  const totalEgresosMes = egresosMes.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
  const flujoCaja = totalIngresosMes - totalEgresosMes;

  // Cartera (Deuda en la calle) - Lógica exacta copiada de Cobranza
  const normalizeDate = (d: string) => {
    if (!d) return '';
    const base = d.split(' ')[0];
    const separator = base.includes('-') ? '-' : '/';
    const parts = base.split(separator);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return base;
  };

  const calcularCarteraExacta = () => {
    if (!perfiles.length || !planes.length) return { deudaTotalGlobal: 0, morososFiltrados: [] };
    
    // Mes actual para pendiente según el filtro
    const periodoActual = `${anioSeleccionado}-${String(mesSeleccionado + 1).padStart(2, '0')}`;

    let deudaTotalMes = 0;
    const morososList: any[] = [];

    const jugadoresActivos = perfiles.filter(p => p.estado_miembro === 'Activo' && p.rol === 'Futbolista');

    jugadoresActivos.forEach(j => {
      const currentPlanName = (j.tipo_plan || 'Regular').toLowerCase();
      const planBuscado = planes.find(p => p.nombre.toLowerCase() === currentPlanName);
      const esBeca100 = (planBuscado?.precio_base === 0) || currentPlanName.includes('100');
      
      let tarifaBase = Number(planBuscado?.precio_base || 0);
      const descuentoProntoPago = Number(planBuscado?.descuento_pronto_pago || 0);
      const limiteProntoPago = Number(planBuscado?.dias_limite_pronto_pago || 5);
      const precioConDescuento = tarifaBase - descuentoProntoPago;

      // Emular la lógica de Cobranza: si estamos en el mismo mes y hoy <= limite,
      // la tarifa esperada (tarifaObjetivo) es el precio con descuento.
      const hoy = new Date();
      const [anioSel, mesSel] = periodoActual.split('-');
      const esMismoPeriodo = hoy.getFullYear() === Number(anioSel) && (hoy.getMonth() + 1) === Number(mesSel);
      
      let tarifaObjetivo = tarifaBase;
      if (esMismoPeriodo && hoy.getDate() <= limiteProntoPago && !esBeca100) {
        tarifaObjetivo = precioConDescuento;
      }

      // Si el jugador ya tiene una tarifa personalizada (j.tarifa), la usamos,
      // a menos que sea 0, en cuyo caso usamos la tarifaObjetivo calculada.
      const tarifaFinal = j.tarifa || tarifaObjetivo;

      if (esBeca100 || tarifaFinal === 0) return;

      // Pendiente del mes seleccionado
      const pagadoEsteMes = ingresos
        .filter(p => {
          const concepto = String(p.concepto || '').toLowerCase();
          if (concepto.startsWith('aporte:') || concepto.includes('aporte extra')) return false;
          const notas = String(p.notas || '').toLowerCase();
          if (notas.startsWith('aporte extra')) return false;
          if (p.jugador_id === j.id && String(p.fecha).startsWith(periodoActual)) return true;
          return false;
        })
        .reduce((acc, p) => acc + parseFloat(p.total || 0), 0);
      
      const abonosEsteMes = abonos
        .filter(a => a.perfil_id === j.id && String(a.periodo).startsWith(periodoActual))
        .reduce((acc, a) => acc + parseFloat(a.monto || 0), 0);

      const totalMesActual = pagadoEsteMes + abonosEsteMes;
      const pendienteActual = totalMesActual < tarifaActual ? (tarifaActual - totalMesActual) : 0;

      if (pendienteActual > 0) {
        deudaTotalMes += pendienteActual;
        morososList.push({ ...j, deudaTotal: pendienteActual, tarifa: tarifaActual });
      }
    });

    return { deudaTotalGlobal: deudaTotalMes, morososFiltrados: morososList };
  };

  const carteraData = calcularCarteraExacta();
  const deudaPendiente = carteraData ? carteraData.deudaTotalGlobal : 0;
  const morosos = carteraData ? carteraData.morososFiltrados : [];

  // --- DATOS PARA GRÁFICOS ---
  // 1. Ingresos por Concepto (Pie Chart)
  const ingresosPorConcepto = ingresosMes.reduce((acc: any, curr) => {
    const concepto = curr.concepto || 'Mensualidad';
    acc[concepto] = (acc[concepto] || 0) + Number(curr.total || 0);
    return acc;
  }, {});
  
  const dataPieIngresos = Object.keys(ingresosPorConcepto).map(k => ({
    name: k, value: ingresosPorConcepto[k]
  })).sort((a, b) => b.value - a.value);

  // 2. Egresos por Categoría (Pie Chart)
  const egresosPorCategoria = egresosMes.reduce((acc: any, curr) => {
    const cat = curr.categoria || 'Otros';
    acc[cat] = (acc[cat] || 0) + Number(curr.monto || 0);
    return acc;
  }, {});
  
  const dataPieEgresos = Object.keys(egresosPorCategoria).map(k => ({
    name: k, value: egresosPorCategoria[k]
  })).sort((a, b) => b.value - a.value);

  // 3. Flujo Anual (Bar Chart)
  const mesesAbreviados = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const flujoAnual = Array.from({ length: 12 }).map((_, idx) => {
    const isThisYear = (f: string) => getYearStr(f) === anioSeleccionado;
    const isThisMonth = (f: string) => getMonthStr(f) === idx;

    const inM = ingresos.filter(i => isThisYear(i.fecha) && isThisMonth(i.fecha)).reduce((sum, curr) => sum + Number(curr.total || 0), 0);
    const outM = egresos.filter(e => isThisYear(e.fecha) && isThisMonth(e.fecha)).reduce((sum, curr) => sum + Number(curr.monto || 0), 0);

    return {
      mes: mesesAbreviados[idx],
      Ingresos: inM,
      Egresos: outM,
      Flujo: inM - outM
    };
  });

  const COLORS_IN = ['#10b981', '#34d399', '#6ee7b7', '#059669', '#a7f3d0'];
  const COLORS_OUT = ['#ef4444', '#f87171', '#fca5a5', '#dc2626', '#fecaca'];

  const formatearDinero = (valor: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

  // --- EXPORTAR A EXCEL ---
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Resumen
    const resumenData = [
      { Métrica: "Ingresos del Mes", Valor: totalIngresosMes },
      { Métrica: "Egresos del Mes", Valor: totalEgresosMes },
      { Métrica: "Flujo de Caja", Valor: flujoCaja },
      { Métrica: "Deuda Pendiente", Valor: deudaPendiente }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenData), "Resumen Financiero");

    // Ingresos
    if (ingresosMes.length > 0) {
      const dataIn = ingresosMes.map(i => ({
        Fecha: i.fecha, Jugador: `${i.nombres} ${i.apellidos}`, Concepto: i.concepto || 'Mensualidad', Monto: i.total, Método: i.metodo_pago
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataIn), "Ingresos");
    }

    // Egresos
    if (egresosMes.length > 0) {
      const dataOut = egresosMes.map(e => ({
        Fecha: e.fecha, Descripción: e.descripcion, Categoría: e.categoria, Monto: e.monto
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataOut), "Egresos");
    }

    XLSX.writeFile(wb, `Reporte_Financiero_${mesesAbreviados[mesSeleccionado]}_${anioSeleccionado}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="p-4 md:p-6 pb-24">
        
        {/* CABECERA Y FILTROS */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-emerald-500" />
              Reportes Financieros
            </h1>
            <p className="text-sm text-slate-500 mt-1">Visión general del estado económico y flujo de caja del club.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 flex-1 lg:flex-none">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select 
                value={mesSeleccionado} 
                onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full"
              >
                {mesesAbreviados.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 w-24">
              <select 
                value={anioSeleccionado} 
                onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={exportarExcel} 
              className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-lg transition-colors shadow-sm"
              title="Exportar Reporte a Excel"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={actualizarDatos} 
              className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 p-2.5 rounded-lg transition-colors"
              title="Actualizar Datos"
            >
              <RefreshCw className={`w-4 h-4 \${cargando ? 'animate-spin text-brand' : ''}`} />
            </button>
          </div>
        </div>

        {/* --- TARJETAS KPIs --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Ingresos */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ingresos del Mes</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{formatearDinero(totalIngresosMes)}</h3>
          </div>

          {/* Egresos */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 text-rose-600" />
              </div>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Egresos del Mes</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{formatearDinero(totalEgresosMes)}</h3>
          </div>

          {/* Flujo Neto */}
          <div className={`bg-white rounded-2xl border \${flujoCaja >= 0 ? 'border-emerald-200' : 'border-rose-200'} p-5 shadow-sm relative overflow-hidden group`}>
            <div className={`absolute -right-4 -top-4 w-24 h-24 \${flujoCaja >= 0 ? 'bg-emerald-50' : 'bg-rose-50'} rounded-full group-hover:scale-110 transition-transform`}></div>
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className={`w-10 h-10 \${flujoCaja >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} rounded-xl flex items-center justify-center`}>
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Flujo de Caja</p>
            <h3 className={`text-2xl font-black mt-1 \${flujoCaja >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {flujoCaja > 0 ? '+' : ''}{formatearDinero(flujoCaja)}
            </h3>
          </div>

          {/* Deuda Pendiente */}
          <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cartera por Cobrar</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{formatearDinero(deudaPendiente)}</h3>
          </div>
        </div>

        {/* --- GRÁFICOS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Gráfico Barras Flujo Anual */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-6">Flujo de Caja Anual ({anioSeleccionado})</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flujoAnual} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `\${val / 1000}k`} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    formatter={(value: any) => formatearDinero(Number(value))}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Charts */}
          <div className="grid grid-rows-2 gap-6">
            
            {/* Pie: Ingresos por Concepto */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Ingresos por Concepto</h3>
              {dataPieIngresos.length > 0 ? (
                <div className="h-[140px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dataPieIngresos} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                        {dataPieIngresos.map((entry, index) => <Cell key={`cell-\${index}`} fill={COLORS_IN[index % COLORS_IN.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => formatearDinero(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400">Total</span>
                    <span className="text-sm font-black text-slate-800">${(totalIngresosMes / 1000).toFixed(0)}k</span>
                  </div>
                </div>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-xs text-slate-400 font-bold">Sin ingresos registrados</div>
              )}
            </div>

            {/* Pie: Egresos por Categoría */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Egresos por Categoría</h3>
              {dataPieEgresos.length > 0 ? (
                <div className="h-[140px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dataPieEgresos} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                        {dataPieEgresos.map((entry, index) => <Cell key={`cell-\${index}`} fill={COLORS_OUT[index % COLORS_OUT.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => formatearDinero(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400">Total</span>
                    <span className="text-sm font-black text-slate-800">${(totalEgresosMes / 1000).toFixed(0)}k</span>
                  </div>
                </div>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-xs text-slate-400 font-bold">Sin egresos registrados</div>
              )}
            </div>

          </div>
        </div>

        {/* --- TABLAS SEPARADAS --- */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          <div className="flex border-b border-slate-200">
            <button 
              onClick={() => setPestañaTabla('Ingresos')}
              className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors \${pestañaTabla === 'Ingresos' ? 'border-b-2 border-emerald-500 text-emerald-600 bg-emerald-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Historial de Ingresos
            </button>
            <button 
              onClick={() => setPestañaTabla('Egresos')}
              className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors \${pestañaTabla === 'Egresos' ? 'border-b-2 border-rose-500 text-rose-600 bg-rose-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Historial de Egresos
            </button>
            <button 
              onClick={() => setPestañaTabla('Cartera')}
              className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors \${pestañaTabla === 'Cartera' ? 'border-b-2 border-amber-500 text-amber-600 bg-amber-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Cartera Morosos
            </button>
          </div>

          <div className="p-0 overflow-x-auto">
            {pestañaTabla === 'Ingresos' && (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-black">
                  <tr>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Jugador</th>
                    <th className="px-6 py-4">Concepto</th>
                    <th className="px-6 py-4">Método</th>
                    <th className="px-6 py-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ingresosMes.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No hay ingresos este mes.</td></tr>
                  ) : (
                    ingresosMes.map(i => (
                      <tr key={i.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-slate-800">{i.fecha}</td>
                        <td className="px-6 py-3 font-bold">{i.nombres} {i.apellidos}</td>
                        <td className="px-6 py-3"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">{i.concepto || 'Mensualidad'}</span></td>
                        <td className="px-6 py-3 text-xs">{i.metodo_pago}</td>
                        <td className="px-6 py-3 text-right font-black text-emerald-600">{formatearDinero(Number(i.total))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {pestañaTabla === 'Egresos' && (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-black">
                  <tr>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Descripción</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {egresosMes.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay egresos este mes.</td></tr>
                  ) : (
                    egresosMes.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-slate-800">{e.fecha}</td>
                        <td className="px-6 py-3">{e.descripcion}</td>
                        <td className="px-6 py-3"><span className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-xs font-bold">{e.categoria}</span></td>
                        <td className="px-6 py-3 text-right font-black text-rose-600">{formatearDinero(Number(e.monto))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {pestañaTabla === 'Cartera' && (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs uppercase font-black">
                  <tr>
                    <th className="px-6 py-4">Jugador</th>
                    <th className="px-6 py-4">Grupo</th>
                    <th className="px-6 py-4">Plan Actual</th>
                    <th className="px-6 py-4 text-right">Monto Adeudado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {morosos.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Excelente, no hay cartera pendiente.</td></tr>
                  ) : (
                    morosos.map(m => (
                      <tr key={m.id} className="hover:bg-amber-50/30">
                        <td className="px-6 py-3 font-bold text-slate-800">{m.nombres} {m.apellidos}</td>
                        <td className="px-6 py-3 text-xs">{m.grupos || 'N/A'}</td>
                        <td className="px-6 py-3"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">{m.tipo_plan}</span></td>
                        <td className="px-6 py-3 text-right font-black text-amber-600">{formatearDinero(m.tarifa || calcularTarifa(m.tipo_plan))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}