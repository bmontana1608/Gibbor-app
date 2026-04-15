'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Wallet, Settings, Flame, Calendar, Search, CheckCircle, Smartphone, UserCircle, CreditCard, Printer, ClipboardCheck, Trash2, PlusCircle, X } from 'lucide-react';

export default function ModuloCobranza() {
  const router = useRouter();
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');

  // Estados para Modal de Pago Detallado (Controla.club style)
  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<any>(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [recargo, setRecargo] = useState(0);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [notas, setNotas] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);

  // Historial de Pagos (Ingresos)
  const [historialPagos, setHistorialPagos] = useState<any[]>([]);

  // Recibo Generado para impresión
  const [reciboGenerado, setReciboGenerado] = useState<any>(null);

  const hoy = new Date();
  const diaActual = hoy.getDate();
  const esProntoPago = diaActual <= 5; 

  const calcularTarifa = (tipoPlan: string) => {
    const plan = (tipoPlan || 'Regular').trim();
    if (plan === 'Beca 100%') return 0;
    if (plan === 'Beca 50%') return esProntoPago ? 30000 : 35000;
    if (plan === 'Fin de semana') return esProntoPago ? 50000 : 60000;
    return esProntoPago ? 60000 : 70000;
  };

  const cargarDatos = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .not('rol', 'in', '("Director","Entrenador")')
      .neq('estado_miembro', 'Pendiente')
      .order('nombres', { ascending: true });

    if (error) {
      toast.error(`Error al cargar datos: ${error.message}`);
    } else if (data) {
      setJugadores(data);
    }
    setCargando(false);
    
    const { data: histData } = await supabase
      .from('pagos_ingresos')
      .select('*')
      .order('fecha', { ascending: false });
    
    if (histData) setHistorialPagos(histData);
  };

  const eliminarPagoHistorial = async (id: string, numero: number) => {
    if (window.confirm(`¿Estás seguro de eliminar el registro del recibo № ${numero}? Esto no cambiará el estado de deuda del alumno.`)) {
      const { error } = await supabase.from('pagos_ingresos').delete().eq('id', id);
      if (error) toast.error("Error al eliminar: " + error.message);
      else {
        toast.success("Registro eliminado");
        cargarDatos();
      }
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const actualizarPlan = async (id: string, nuevoPlan: string, nombreCompleto: string) => {
    const { error } = await supabase.from('perfiles').update({ tipo_plan: nuevoPlan }).eq('id', id);
    if (error) { 
      toast.error(`Error al cambiar el plan: ${error.message}`); 
    } else {
      toast.success(`Plan de ${nombreCompleto} actualizado a ${nuevoPlan}`);
      cargarDatos();
    }
  };

  const abrirModalPago = (jugador: any) => {
    setJugadorSeleccionado(jugador);
    setMontoRecibido('');
    setDescuento(0);
    setRecargo(0);
    setMetodoPago('Efectivo');
    setNotas('');
    setIsModalPagoOpen(true);
  };

  const confirmarPago = async () => {
    if (!jugadorSeleccionado) return;
    
    const tarifaBase = calcularTarifa(jugadorSeleccionado.tipo_plan);
    const total = tarifaBase - descuento + recargo;

    const toastId = toast.loading(`Confirmando pago de ${jugadorSeleccionado.nombres}...`);

    const { error } = await supabase
      .from('perfiles')
      .update({ estado_pago: 'Al día' })
      .eq('id', jugadorSeleccionado.id);

    if (error) {
      toast.error('Error al registrar pago: ' + error.message, { id: toastId });
    } else {
      const payloadHistorial = {
        jugador_id: jugadorSeleccionado.id,
        nombres: jugadorSeleccionado.nombres,
        apellidos: jugadorSeleccionado.apellidos,
        grupo: jugadorSeleccionado.grupos || 'Sin grupo',
        monto_base: tarifaBase,
        descuento,
        recargo,
        total,
        metodo_pago: metodoPago,
        notas,
        fecha: fechaPago
      };

      const { data: dataHist } = await supabase
        .from('pagos_ingresos')
        .insert([payloadHistorial])
        .select()
        .single();

      toast.success('¡Pago registrado con éxito!', { id: toastId });
      
      setReciboGenerado({
        nombres: jugadorSeleccionado.nombres,
        apellidos: jugadorSeleccionado.apellidos,
        telefono: jugadorSeleccionado.telefono,
        grupo: jugadorSeleccionado.grupos || 'Sin grupo',
        fecha: fechaPago,
        metodo: metodoPago,
        montoBase: tarifaBase,
        descuento,
        recargo,
        total,
        consecutivo: dataHist?.consecutivo || Math.floor(Math.random() * 1000)
      });
      setIsModalPagoOpen(false);
      cargarDatos();
    }
  };

  const enviarRecordatorio = (telefono: string, nombreJugador: string, deuda: number) => {
    if (!telefono) return toast.error(`No hay teléfono registrado para ${nombreJugador}.`);
    let celLimpio = telefono.replace(/\D/g, '');
    if (!celLimpio.startsWith('57')) celLimpio = '57' + celLimpio; 
    const mensaje = encodeURIComponent(`Hola! ⚽ Te escribimos de EFD Gibbor. Te recordamos amablemente que el pago de la mensualidad de ${nombreJugador} ($${deuda.toLocaleString('es-CO')}) se encuentra pendiente. ¡Gracias por hacer parte de nuestro club!`);
    window.open(`https://wa.me/${celLimpio}?text=${mensaje}`, '_blank');
  };

  const ingresosRecaudados = historialPagos.reduce((acc, pago) => acc + parseFloat(pago.total || 0), 0);
  let ingresosPendientes = 0;
  let totalAlDia = 0; 
  let totalMora = 0;

  jugadores.forEach(j => {
    const tarifa = calcularTarifa(j.tipo_plan);
    const est = (j.estado_pago || '').trim().toLowerCase();
    const esAlDia = est === 'al día' || est === 'al dia';
    if (esAlDia) { if (tarifa > 0) totalAlDia++; } 
    else { ingresosPendientes += tarifa; if (tarifa > 0) totalMora++; }
  });

  const totalJugadoresCobrales = totalAlDia + totalMora;
  const porcentajeRecaudo = totalJugadoresCobrales > 0 ? Math.round((totalAlDia / totalJugadoresCobrales) * 100) : 0;

  const jugadoresFiltrados = jugadores.filter(jugador => {
    const est = (jugador.estado_pago || '').trim().toLowerCase();
    const esAlDia = est === 'al día' || est === 'al dia';
    const estadoActual = esAlDia ? 'Al día' : 'Pendiente';
    const coincideEstado = estadoFiltro === 'Todos' || estadoFiltro === estadoActual;
    const coincideBusqueda = `${jugador.nombres} ${jugador.apellidos}`.toLowerCase().includes(busqueda.toLowerCase());
    return coincideEstado && coincideBusqueda;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      <div className="p-4 md:p-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="text-emerald-500 w-7 h-7" /> Cobranza y Finanzas
            </h1>
            <p className="text-sm text-slate-500 mt-1">Control de pagos, planes dinámicos y recordatorios.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/director/cobranza/planes')} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2">
              <Settings className="w-4 h-4" /> Gestión de Planes
            </button>
          </div>
        </div>

        {esProntoPago ? (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
            <Flame className="w-6 h-6 text-orange-500" />
            <div><p className="font-bold text-sm">¡Pronto Pago Activo!</p><p className="text-xs">Hoy es día {diaActual}. Descuentos aplicados hasta el día 5.</p></div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-500" />
            <div><p className="font-bold text-sm">Período Regular</p><p className="text-xs">Estamos fuera de la fecha de pronto pago.</p></div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recaudo Actual</p>
            <h3 className="text-2xl font-black text-emerald-600">${ingresosRecaudados.toLocaleString('es-CO')}</h3>
            <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
               <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${porcentajeRecaudo}%` }}></div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Por Cobrar</p>
            <h3 className="text-2xl font-black text-red-500">${ingresosPendientes.toLocaleString('es-CO')}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Efectividad</p>
            <h3 className="text-2xl font-black text-slate-800">{porcentajeRecaudo}%</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Al Día</p>
            <h3 className="text-2xl font-black text-slate-800">{totalAlDia} / {totalJugadoresCobrales}</h3>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Buscar alumno por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
            </div>
            <div className="flex gap-2">
              {['Todos', 'Pendiente', 'Al día'].map(label => (
                <button key={label} onClick={() => setEstadoFiltro(label)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${estadoFiltro === label ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                  <th className="p-4 md:px-6">Alumno</th>
                  <th className="p-4 md:px-6">Categoría</th>
                  <th className="p-4 md:px-6">Plan</th>
                  <th className="p-4 md:px-6">Valor</th>
                  <th className="p-4 md:px-6">Estado</th>
                  <th className="p-4 md:px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {cargando ? (
                  <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">Cargando futbolistas...</td></tr>
                ) : jugadoresFiltrados.length === 0 ? (
                  <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">No se encontraron resultados.</td></tr>
                ) : (
                  jugadoresFiltrados.map((jugador) => {
                    const tarifaExacta = calcularTarifa(jugador.tipo_plan);
                    const est = (jugador.estado_pago || '').trim().toLowerCase();
                    const esAlDia = est === 'al día' || est === 'al dia';
                    return (
                      <tr key={jugador.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 md:px-6">
                          <p className="font-bold text-slate-800 uppercase tracking-tight">{jugador.nombres} {jugador.apellidos}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{jugador.email_contacto || 'Sin correo'}</p>
                        </td>
                        <td className="p-4 md:px-6 font-medium text-slate-600 uppercase text-xs">{jugador.grupos || 'Ninguna'}</td>
                        <td className="p-4 md:px-6">
                          <select value={jugador.tipo_plan || 'Regular'} onChange={(e) => actualizarPlan(jugador.id, e.target.value, `${jugador.nombres} ${jugador.apellidos}`)} className="bg-slate-100 border-none text-[11px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer focus:ring-1 focus:ring-slate-300">
                             <option value="Regular">Regular (70k)</option>
                             <option value="Fin de semana">Fin de semana (60k)</option>
                             <option value="Beca 50%">Beca 50% (35k)</option>
                             <option value="Beca 100%">Beca 100% (Gratis)</option>
                          </select>
                        </td>
                        <td className="p-4 md:px-6 font-black text-slate-700">${tarifaExacta.toLocaleString('es-CO')}</td>
                        <td className="p-4 md:px-6">
                          {tarifaExacta === 0 ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">Beca</span>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${esAlDia ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                              {esAlDia ? 'Al día' : 'Pendiente'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 md:px-6 text-right">
                          <div className="flex justify-end gap-2">
                            {tarifaExacta === 0 ? (
                              <span className="text-slate-400 text-xs font-medium italic">No requiere cobro</span>
                            ) : !esAlDia ? (
                              <>
                                <button onClick={() => enviarRecordatorio(jugador.telefono, jugador.nombres, tarifaExacta)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 text-xs font-bold" title="Enviar WhatsApp">
                                  <Smartphone className="w-4 h-4" /> Avisar
                                </button>
                                <button onClick={() => abrirModalPago(jugador)} className="bg-white border border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                                  Pagar
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-1.5">
                                  <CheckCircle className="w-4 h-4" /> Pagado
                                </span>
                                <button onClick={() => abrirModalPago(jugador)} className="text-slate-300 hover:text-emerald-500 transition-colors p-1" title="Registrar otro pago">
                                  <PlusCircle className="w-4 h-4" />
                                </button>
                              </div>
                             )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-20">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="text-emerald-500 w-6 h-6" /> Historial de Pagos Recibidos
              </h2>
              <p className="text-sm text-slate-500 mt-1">Consulta y re-imprime recibos de mensualidades anteriores.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4 md:px-6">№ Recibo</th>
                  <th className="p-4 md:px-6">Alumno</th>
                  <th className="p-4 md:px-6">Fecha de Pago</th>
                  <th className="p-4 md:px-6">Método</th>
                  <th className="p-4 md:px-6 text-right">Monto Total</th>
                  <th className="p-4 md:px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {historialPagos.length === 0 ? (
                  <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">No hay historial de ingresos registrado.</td></tr>
                ) : (
                  historialPagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 md:px-6 font-black text-slate-900">№ {pago.consecutivo.toString().padStart(3, '0')}</td>
                      <td className="p-4 md:px-6 font-bold text-slate-800 uppercase tracking-tight">{pago.nombres} {pago.apellidos}</td>
                      <td className="p-4 md:px-6 text-slate-600 font-medium">{new Date(pago.fecha).toLocaleDateString('es-CO')}</td>
                      <td className="p-4 md:px-6 uppercase font-bold text-[10px] text-slate-500">{pago.metodo_pago}</td>
                      <td className="p-4 md:px-6 text-right font-black text-emerald-600">${parseFloat(pago.total || "0").toLocaleString('es-CO')}</td>
                      <td className="p-4 md:px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setReciboGenerado({ ...pago, montoBase: pago.monto_base, metodo: pago.metodo_pago }); }} className="bg-white border border-slate-300 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2">
                            <Printer className="w-3.5 h-3.5" /> Reimprimir
                          </button>
                          <button onClick={() => eliminarPagoHistorial(pago.id, pago.consecutivo)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
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

      {reciboGenerado && (
        <div className="hidden print:flex fixed inset-0 bg-white z-[9999] justify-center pt-8 font-sans pb-10">
          <div className="w-[21.5cm] h-[14cm] border-2 border-emerald-800 p-6 relative flex flex-col outline outline-4 outline-offset-2 outline-emerald-50 bg-white shadow-none">
            <div className="flex justify-between items-start mb-4">
               <div className="flex items-center gap-4">
                <img src="/logo.png" alt="Gibbor" className="w-20 h-20 object-contain rounded-full border border-slate-200" />
                <div>
                  <h1 className="text-2xl font-black text-orange-600 tracking-tight uppercase">EFD GIBBOR</h1>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Comprobante de Ingreso</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-800 uppercase italic">Recibo Oficial</p>
                <p className="text-2xl font-black text-slate-900">№ {reciboGenerado.consecutivo.toString().padStart(3, '0')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-6 border-y border-slate-200 py-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Recibido de:</p>
                <p className="text-sm font-black text-slate-800 uppercase">{reciboGenerado.nombres} {reciboGenerado.apellidos}</p>
                <p className="text-xs text-slate-500 mt-1">Categoría: {reciboGenerado.grupo}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Fecha de pago:</p>
                <p className="text-sm font-bold text-slate-800 uppercase">{new Date(reciboGenerado.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric'})}</p>
                <p className="text-xs text-slate-500 mt-1">Método: {reciboGenerado.metodo}</p>
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Monto Base:</span>
                  <span>${reciboGenerado.montoBase.toLocaleString('es-CO')}</span>
                </div>
                {reciboGenerado.descuento > 0 && (
                  <div className="flex justify-between text-xs font-bold text-red-500">
                    <span>Descuento:</span>
                    <span>- ${reciboGenerado.descuento.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-2 flex justify-between text-lg font-black text-slate-900">
                  <span>TOTAL PAGADO:</span>
                  <span>${reciboGenerado.total.toLocaleString('es-CO')}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between items-end">
              <div className="text-[10px] text-slate-400 max-w-xs italic">* Este documento es un comprobante digital de pago emitido por la Escuela Deportiva Gibbor. Consérvelo para cualquier reclamación.</div>
              <div className="border-t border-slate-400 w-48 text-center pt-1"><p className="text-[10px] font-bold text-slate-600 uppercase">Firma Autorizada</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de confirmación post-pago */}
      {reciboGenerado && !isModalPagoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col text-center p-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">¡Pago Exitoso!</h3>
            <p className="text-slate-500 mb-8 text-sm">El pago de <strong>{reciboGenerado.nombres}</strong> por ${reciboGenerado.total.toLocaleString('es-CO')} se registró correctamente.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => window.print()} className="w-full bg-emerald-600 text-white font-black py-3.5 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
                <Printer className="w-5 h-5" /> Imprimir Recibo
              </button>
              <button 
                onClick={() => {
                  let tel = (reciboGenerado.telefono || '').replace(/\D/g, '');
                  if (tel && !tel.startsWith('57')) tel = '57' + tel;
                  const msg = encodeURIComponent(`¡Hola! ⚽ EFD Gibbor te confirma el recibo de tu pago № ${reciboGenerado.consecutivo.toString().padStart(3, '0')} por un total de $${reciboGenerado.total.toLocaleString('es-CO')}. ¡Muchas gracias!`);
                  window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
                }} 
                className="w-full bg-emerald-100 text-emerald-700 font-bold py-3.5 rounded-xl hover:bg-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                <Smartphone className="w-5 h-5" /> Confirmar por WhatsApp
              </button>
              <button onClick={() => setReciboGenerado(null)} className="w-full bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors">
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalPagoOpen && jugadorSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[95vh] relative">
            <button onClick={() => setIsModalPagoOpen(false)} className="absolute top-4 right-4 z-10 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 p-6 space-y-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-blue-600"><UserCircle className="w-5 h-5" /><p className="text-xs font-bold uppercase tracking-wider">Cliente</p></div>
                <p className="font-black text-slate-800 text-sm">{jugadorSeleccionado.nombres} {jugadorSeleccionado.apellidos}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-orange-500"><CreditCard className="w-5 h-5" /><p className="text-xs font-bold uppercase tracking-wider">Plan</p></div>
                <p className="text-sm font-bold text-slate-800">${calcularTarifa(jugadorSeleccionado.tipo_plan).toLocaleString('es-CO')}</p>
              </div>
            </div>
            <div className="flex-1 p-6 md:p-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Fecha de Pago</label>
                  <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Método de Pago</label>
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-white">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Nequi / Daviplata">Nequi / Daviplata</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Descuento</label>
                  <input type="number" value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg font-bold text-red-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Recargo</label>
                  <input type="number" value={recargo} onChange={(e) => setRecargo(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg font-bold text-emerald-600" />
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-8 flex justify-between items-center">
                 <p className="text-emerald-800 font-black text-lg">Total a Cobrar:</p>
                 <p className="text-3xl font-black text-emerald-600">${(calcularTarifa(jugadorSeleccionado.tipo_plan) - descuento + recargo).toLocaleString('es-CO')}</p>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsModalPagoOpen(false)} className="px-8 py-3.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 border border-slate-200">Cancelar</button>
                <button onClick={confirmarPago} className="px-10 py-3.5 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200">Confirmar Pago</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; }
          .print\:hidden { display: none !important; }
          @page { margin: 0; size: letter portrait; }
        }
      `}} />
    </div>
  );
}