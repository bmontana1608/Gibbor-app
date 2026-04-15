'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Briefcase, CreditCard, X, Printer, UserCircle, CheckCircle, Smartphone, Trash2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { Settings } from 'lucide-react';

// === LÓGICA CONVERSOR DE NÚMEROS A LETRAS ===
function Unidades(num: number) { switch (num) { case 1: return "UN"; case 2: return "DOS"; case 3: return "TRES"; case 4: return "CUATRO"; case 5: return "CINCO"; case 6: return "SEIS"; case 7: return "SIETE"; case 8: return "OCHO"; case 9: return "NUEVE"; } return ""; }
function DecenasY(strSin: string, numUnidades: number) { if (numUnidades > 0) return strSin + " Y " + Unidades(numUnidades); return strSin; }
function Decenas(num: number) {
    let decena = Math.floor(num / 10); let unidad = num - (decena * 10);
    switch (decena) {
        case 1: switch (unidad) { case 0: return "DIEZ"; case 1: return "ONCE"; case 2: return "DOCE"; case 3: return "TRECE"; case 4: return "CATORCE"; case 5: return "QUINCE"; default: return "DIECI" + Unidades(unidad); }
        case 2: switch (unidad) { case 0: return "VEINTE"; default: return "VEINTI" + Unidades(unidad); }
        case 3: return DecenasY("TREINTA", unidad); case 4: return DecenasY("CUARENTA", unidad); case 5: return DecenasY("CINCUENTA", unidad); case 6: return DecenasY("SESENTA", unidad); case 7: return DecenasY("SETENTA", unidad); case 8: return DecenasY("OCHENTA", unidad); case 9: return DecenasY("NOVENTA", unidad); case 0: return Unidades(unidad);
    } return "";
}
function Centenas(num: number) {
    let centenas = Math.floor(num / 100); let decenas = num - (centenas * 100);
    switch (centenas) {
        case 1: if (decenas > 0) return "CIENTO " + Decenas(decenas); return "CIEN";
        case 2: return "DOSCIENTOS " + Decenas(decenas); case 3: return "TRESCIENTOS " + Decenas(decenas); case 4: return "CUATROCIENTOS " + Decenas(decenas); case 5: return "QUINIENTOS " + Decenas(decenas); case 6: return "SEISCIENTOS " + Decenas(decenas); case 7: return "SETECIENTOS " + Decenas(decenas); case 8: return "OCHOCIENTOS " + Decenas(decenas); case 9: return "NOVECIENTOS " + Decenas(decenas);
    } return Decenas(decenas);
}
function Millares(num: number) {
    let divisor = 1000; let cientos = Math.floor(num / divisor); let resto = num - (cientos * divisor);
    let strMillares = "";
    if (cientos > 0) { if (cientos > 1) strMillares = Centenas(cientos) + " MIL"; else strMillares = "UN MIL"; }
    return strMillares + " " + Centenas(resto);
}
function Millones(num: number) {
    let divisor = 1000000; let cientos = Math.floor(num / divisor); let resto = num - (cientos * divisor);
    let strMillones = "";
    if (cientos > 0) { if (cientos > 1) strMillones = Centenas(cientos) + " MILLONES"; else strMillones = "UN MILLION"; }
    return strMillones + " " + Millares(resto);
}
function numeroEnLetras(num: number) {
    if (!num || num === 0) return "CERO PESOS M/CTE";
    if (num === 1) return Millones(num) + " PESO M/CTE";
    return Millones(num).trim() + " PESOS M/CTE";
}
// ============================================

export default function ModuloNomina() {
  const [entrenadores, setEntrenadores] = useState<any[]>([]);
  const [historialPagos, setHistorialPagos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Modal de Pago
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entrenadorPago, setEntrenadorPago] = useState<any>(null);
  const [documento, setDocumento] = useState('');
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('Pago de Nómina - Mes de Abril');
  const sigCanvas = useRef<any>(null);

  // Configuración de Director
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [ciudadEmision, setCiudadEmision] = useState('Valledupar');
  const [telefonoEmision, setTelefonoEmision] = useState('(+57) 300 000 0000');
  const [firmaDirector, setFirmaDirector] = useState<string | null>(null);

  // Estados para Modal de Recibo (Impresión)
  const [reciboGenerado, setReciboGenerado] = useState<any>(null);

  const cargarDatos = async () => {
    setCargando(true);
    
    // Cargar config local
    const cLocal = localStorage.getItem('gibbor_ciudad');
    if (cLocal) setCiudadEmision(cLocal);
    const tLocal = localStorage.getItem('gibbor_telefono');
    if (tLocal) setTelefonoEmision(tLocal);
    const fLocal = localStorage.getItem('gibbor_firma_director');
    if (fLocal) setFirmaDirector(fLocal);
    // Traemos a los entrenadores
    const { data: entData, error: entError } = await supabase
      .from('perfiles')
      .select('*')
      .eq('rol', 'Entrenador')
      .order('nombres', { ascending: true });

    if (entError) {
      toast.error(`Error al cargar entrenadores: ${entError.message}`);
    } else if (entData) {
      setEntrenadores(entData);
    }

    // Traemos el historial de pagos
    const { data: pagosData } = await supabase
      .from('pagos_nomina')
      .select('*, entrenador:perfiles(*)')
      .order('fecha', { ascending: false });

    if (pagosData) {
      setHistorialPagos(pagosData);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirModalPago = (entrenador: any) => {
    setEntrenadorPago(entrenador);
    setMonto('');
    setDocumento('');
    setConcepto('Pago de Nómina');
    setIsModalOpen(true);
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const abrirConfiguracion = () => {
    setIsConfigOpen(true);
  };

  const guardarConfiguracion = () => {
    if (firmaDirector !== null) {
      localStorage.setItem('gibbor_firma_director', firmaDirector);
    } else {
      localStorage.removeItem('gibbor_firma_director');
    }
    localStorage.setItem('gibbor_ciudad', ciudadEmision);
    localStorage.setItem('gibbor_telefono', telefonoEmision);
    setIsConfigOpen(false);
    toast.success("Configuración actualizada para recibos");
  };

  const cerrarModalPago = () => {
    setIsModalOpen(false);
    setEntrenadorPago(null);
  };

  const limpiarFirma = () => {
    if (sigCanvas.current) sigCanvas.current.clear();
  };

  const eliminarPago = async (id: string, consecutivo: number) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el comprobante N-${String(consecutivo).padStart(4, '0')}?`)) {
      const toastId = toast.loading("Eliminando registro...");
      const { error } = await supabase.from('pagos_nomina').delete().eq('id', id);
      
      if (error) {
        toast.error(`Error al eliminar: ${error.message}`, { id: toastId });
      } else {
        toast.success("Comprobante eliminado de la base de datos", { id: toastId });
        cargarDatos();
      }
    }
  };

  const procesarPago = async () => {
    if (!monto || parseFloat(monto) <= 0) {
      return toast.error("Ingresa un monto válido");
    }
    if (!documento) {
      return toast.error("Ingresa el C.C / NIT");
    }
    if (!concepto) {
      return toast.error("Ingresa el concepto del pago");
    }
    if (sigCanvas.current && sigCanvas.current.isEmpty()) {
      return toast.error("La firma del entrenador es obligatoria para el recibo");
    }

    const firmaBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

    const toastId = toast.loading("Registrando pago y generando recibo...");

    const payload: any = {
      monto: parseFloat(monto),
      concepto: concepto,
      firma_base64: firmaBase64,
      documento_beneficiario: documento
    };

    if (entrenadorPago.id === 'externo') {
      if (!entrenadorPago.nombres) return toast.error("Ingresa el nombre del proveedor o beneficiario externo");
      payload.beneficiario_externo = entrenadorPago.nombres;
    } else {
      payload.entrenador_id = entrenadorPago.id;
    }

    // Insertar en Base de Datos
    const { data, error } = await supabase
      .from('pagos_nomina')
      .insert([payload])
      .select()
      .single();

    if (error) {
      toast.error(`Error al registrar el pago: ${error.message} - ¿Creaste la tabla pagos_nomina en Supabase?`, { id: toastId });
    } else {
      toast.success("Pago registrado exitosamente", { id: toastId });
      cerrarModalPago();
      cargarDatos(); // Recargar historial
      setReciboGenerado({
        ...data,
        entrenador: entrenadorPago,
        ciudad_emision: ciudadEmision,
        telefono_emision: telefonoEmision,
        firma_director: firmaDirector // Snapshot current device director sig
      });
    }
  };

  const imprimirRecibo = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      
      {/* ---------------- RECIBO PARA IMPRESIÓN (Solo visible al imprimir) ---------------- */}
      {reciboGenerado && (
        <div className="hidden print:flex absolute top-0 left-0 w-full bg-white z-[9999] justify-center pt-8 font-sans pb-10">
          {/* Contenedor Media Carta (aprox 21.5cm ancho x 14cm alto) */}
          <div className="w-[21.5cm] h-[14cm] border-2 border-slate-800 p-6 relative flex flex-col outline outline-4 outline-offset-2 outline-slate-100 bg-white print:shadow-none">
            
            {/* Cabecera */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <img src="/logo.png" alt="Gibbor" className="w-20 h-20 object-contain rounded-full border border-slate-200 shadow-sm" />
                <div>
                  <h1 className="text-2xl font-black text-orange-600 tracking-tight uppercase">EFD GIBBOR</h1>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Escuela de Formación Deportiva</p>
                  <p className="text-xs text-slate-600 mt-1 font-medium">Cel: {telefonoEmision}</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <div className="bg-orange-50 border border-orange-200 px-6 py-2 rounded-t-lg text-center min-w-[220px]">
                  <p className="text-xs font-bold text-orange-800 uppercase tracking-widest">Comprobante de Egreso</p>
                </div>
                <div className="border border-t-0 border-orange-200 bg-white px-6 py-2 rounded-b-lg text-center w-full flex items-center justify-center gap-2 shadow-sm">
                  <span className="text-slate-500 font-bold">Nº</span>
                  <span className="text-2xl font-black text-red-600">{String(reciboGenerado.consecutivo).padStart(4, '0')}</span>
                </div>
              </div>
            </div>

            {/* Info de pago (Monto y Fecha) */}
            <div className="flex justify-between items-end border-b-2 border-slate-800 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700">Ciudad y Fecha:</span>
                <span className="text-sm text-slate-800 border-b border-dashed border-slate-400 px-6 pb-1 uppercase">
                  {ciudadEmision}, {new Date(reciboGenerado.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric'})}
                </span>
              </div>
              <div className="flex items-center bg-slate-100 border border-slate-300 rounded px-6 py-2 shadow-inner">
                <span className="text-sm font-bold text-slate-700 mr-3">POR LA SUMA DE:</span>
                <span className="text-xl font-black text-slate-900">
                  ${parseFloat(reciboGenerado.monto).toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            {/* Cuerpo del Recibo */}
            <div className="space-y-4 flex-1 mt-2">
              <div className="flex items-end gap-2">
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Pagado a:</span>
                <span className="text-sm text-slate-800 border-b border-slate-400 flex-1 px-4 pb-1 uppercase font-black tracking-wide">
                  {reciboGenerado.beneficiario_externo || (reciboGenerado.entrenador ? `${reciboGenerado.entrenador.nombres} ${reciboGenerado.entrenador.apellidos}` : '')}
                </span>
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap ml-2">C.C / NIT:</span>
                <span className="text-sm text-slate-800 border-b border-slate-400 w-48 px-2 pb-1 font-bold tracking-widest text-center">
                  {reciboGenerado.documento_beneficiario}
                </span>
              </div>
              
              <div className="flex items-end gap-2">
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">La suma de (Letras):</span>
                <span className="text-sm text-slate-800 border-b border-slate-400 flex-1 px-4 pb-1 bg-slate-50 font-bold uppercase tracking-wide">
                  {numeroEnLetras(parseFloat(reciboGenerado.monto))}
                </span>
              </div>

              <div className="flex gap-2 h-16 pt-2">
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap pt-1">Por concepto de:</span>
                <div className="text-sm text-slate-800 border border-slate-300 bg-slate-50/50 rounded p-3 flex-1 items-start leading-relaxed">
                  {reciboGenerado.concepto}
                </div>
              </div>
            </div>

            {/* Firmas a usar en la parte inferior */}
            <div className="grid grid-cols-2 gap-12 mt-8">
              <div className="border border-slate-200 bg-slate-50 rounded p-3 h-28 flex flex-col justify-end relative overflow-hidden">
                {firmaDirector && (
                  <img src={firmaDirector} alt="Firma Director" className="absolute bottom-6 left-1/2 -translate-x-1/2 max-h-24 mix-blend-multiply opacity-90" />
                )}
                <div className="border-t-2 border-slate-400 pt-2 text-center mx-4 relative z-10 bg-white/40">
                  <p className="text-xs font-bold text-slate-700 uppercase">Aprobado por / Dirección</p>
                </div>
              </div>

              <div className="border border-slate-200 bg-slate-50 rounded p-3 h-28 flex flex-col justify-end relative overflow-hidden">
                {reciboGenerado.firma_base64 && (
                  <img src={reciboGenerado.firma_base64} alt="Firma" className="absolute bottom-6 left-1/2 -translate-x-1/2 max-h-24 mix-blend-multiply opacity-90" />
                )}
                <div className="border-t-2 border-slate-400 pt-2 text-center mx-4 relative z-10 bg-white/40 ">
                  <p className="text-xs font-bold text-slate-700 uppercase">Firma y C.C. Quien Recibe</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* ---------------- FIN RECIBO ---------------- */}


      <div className="print:hidden">
        {/* HEADER */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Briefcase className="text-orange-500 w-7 h-7" /> Nómina y Egresos
            </h1>
            <p className="text-sm text-slate-500 mt-1">Control de pagos a personal, proveedores y descarga de comprobantes.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
               onClick={abrirConfiguracion}
               className="bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center">
               <Settings className="w-5 h-5" />
            </button>
            <button 
               onClick={() => {
                 setEntrenadorPago({ id: 'externo', nombres: '' });
                 setMonto('');
                 setDocumento('');
                 setConcepto('');
                 setIsModalOpen(true);
                 if (sigCanvas.current) sigCanvas.current.clear();
               }}
               className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2">
               <CreditCard className="w-4 h-4" /> Pago a Proveedor / Externo
            </button>
          </div>
        </div>

        {cargando ? (
           <div className="animate-pulse flex flex-col gap-4">
           {Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="h-24 bg-slate-200 rounded-xl w-full"></div>
           ))}
         </div>
        ) : entrenadores.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl text-center border border-slate-200">
            <UserCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-700">No hay Entrenadores</h2>
            <p className="text-slate-500 mt-2">Crea perfiles con el rol "Entrenador" para gestionar su nómina.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entrenadores.map(entrenador => (
              <div key={entrenador.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between transition-all hover:shadow-md">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-orange-50 w-14 h-14 rounded-full flex items-center justify-center shrink-0">
                    <UserCircle className="w-8 h-8 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{entrenador.nombres} {entrenador.apellidos}</h3>
                    <p className="text-sm text-slate-500">{entrenador.email_contacto}</p>
                    <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-md mt-2">
                      Rol: Entrenador
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => abrirModalPago(entrenador)}
                  className="w-full bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
                >
                  <CreditCard className="w-5 h-5" /> Registrar Pago
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TABLA HISTORIAL PAGOS */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-10">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Historial de Comprobantes Emitidos</h2>
              <p className="text-sm text-slate-500 mt-1">Registros pasados y reimpresiones de comprobantes de nómina.</p>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4 md:px-6">Comprobante Nº</th>
                    <th className="p-4 md:px-6">Fecha</th>
                    <th className="p-4 md:px-6">Entrenador</th>
                    <th className="p-4 md:px-6">Concepto</th>
                    <th className="p-4 md:px-6 text-right">Monto Acordado</th>
                    <th className="p-4 md:px-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {cargando ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Cargando historial...</td></tr>
                  ) : historialPagos.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-medium">No hay egresos o comprobantes registrados aún.</td></tr>
                  ) : historialPagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 md:px-6 font-black text-slate-800 tracking-wider">N-{String(pago.consecutivo).padStart(4, '0')}</td>
                      <td className="p-4 md:px-6 text-slate-600 font-medium">{new Date(pago.fecha).toLocaleDateString('es-CO')} {new Date(pago.fecha).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}</td>
                      <td className="p-4 md:px-6 font-bold text-slate-800 uppercase tracking-tight">
                        {pago.beneficiario_externo ? (
                          <span className="text-amber-600 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {pago.beneficiario_externo}</span>
                        ) : (
                          <span className="flex items-center gap-1.5"><UserCircle className="w-3.5 h-3.5" /> {pago.entrenador?.nombres} {pago.entrenador?.apellidos}</span>
                        )}
                      </td>
                      <td className="p-4 md:px-6 text-slate-600 truncate max-w-[200px]">{pago.concepto}</td>
                      <td className="p-4 md:px-6 text-right font-black text-slate-800">${parseFloat(pago.monto).toLocaleString('es-CO')}</td>
                      <td className="p-4 md:px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setReciboGenerado(pago)} className="bg-white border border-slate-300 text-slate-600 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                            <Printer className="w-3.5 h-3.5" /> Ver / Imprimir
                          </button>
                          <button onClick={() => eliminarPago(pago.id, pago.consecutivo)} className="bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white px-2 py-1.5 rounded-lg transition-all shadow-sm flex items-center justify-center p-1.5" title="Eliminar registro permanentemente">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL DE DE PAGO */}
      {isModalOpen && entrenadorPago && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-orange-600 px-6 py-5 flex justify-between items-center relative overflow-hidden">
              <div className="absolute -right-6 -top-6 bg-orange-500 w-24 h-24 rounded-full opacity-50 blur-xl"></div>
              <h2 className="text-white text-xl font-bold flex items-center gap-2 relative z-10"><Briefcase className="w-6 h-6" /> Liquidar Pago</h2>
              <button onClick={cerrarModalPago} className="text-orange-100 hover:text-white transition-colors p-1 relative z-10"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              {entrenadorPago.id === 'externo' ? (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Proveedor / Beneficiario Externo</label>
                  <input 
                    type="text" 
                    value={entrenadorPago.nombres} 
                    onChange={(e) => setEntrenadorPago({ ...entrenadorPago, nombres: e.target.value })} 
                    placeholder="Ej: Confecciones El Campeón SAS"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold text-lg text-slate-800 bg-amber-50"
                  />
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center gap-4">
                  <UserCircle className="w-12 h-12 text-orange-500" />
                  <div>
                    <p className="text-xs text-orange-500 font-bold uppercase tracking-wider mb-1">Entrenador</p>
                    <p className="font-black text-slate-800 text-lg uppercase leading-none">{entrenadorPago.nombres} {entrenadorPago.apellidos}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Monto a liquidar ($ COP)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input 
                    type="number" 
                    value={monto} 
                    onChange={(e) => setMonto(e.target.value)} 
                    placeholder="Ej: 500000"
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-lg text-slate-800"
                  />
                </div>
                {monto && parseFloat(monto) > 0 && (
                  <p className="text-xs text-slate-500 font-bold mt-2 uppercase">{numeroEnLetras(parseFloat(monto))}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">C.C / NIT del Beneficiario</label>
                <input 
                  type="text" 
                  value={documento} 
                  onChange={(e) => setDocumento(e.target.value)} 
                  placeholder="Ej: 1.000.000.000-0"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Concepto del pago</label>
                <input 
                  type="text" 
                  value={concepto} 
                  onChange={(e) => setConcepto(e.target.value)} 
                  placeholder="Mes de Abril / Transporte / Viáticos"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-700"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-slate-700">Firma del Entrenador</label>
                  <button onClick={limpiarFirma} className="text-xs text-red-500 font-bold hover:underline">Limpiar firma</button>
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 relative">
                  <SignatureCanvas 
                    ref={sigCanvas}
                    canvasProps={{ className: 'w-full h-40 cursor-crosshair' }}
                  />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                    <p className="text-slate-400 font-medium">Firmar Aquí</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
              <button 
                onClick={cerrarModalPago}
                className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={procesarPago}
                className="flex-1 bg-orange-600 text-white font-bold py-3.5 rounded-xl hover:bg-orange-700 shadow-md shadow-orange-200 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" /> Guardar y Generar PDF
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* MODAL RECIBO EXITO */}
      {reciboGenerado && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col text-center p-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">¡Pago Exitoso!</h3>
            <p className="text-slate-500 mb-8">El comprobante se generó correctamente para <strong>{reciboGenerado.beneficiario_externo || (reciboGenerado.entrenador ? reciboGenerado.entrenador.nombres : 'el proveedor')}</strong>.</p>
            
            <div className="flex flex-col gap-3">
              <button onClick={imprimirRecibo} className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-xl hover:bg-orange-700 shadow-md shadow-orange-200 transition-all flex items-center justify-center gap-2">
                <Printer className="w-5 h-5" /> Imprimir Comprobante
              </button>
              <button onClick={() => setReciboGenerado(null)} className="w-full bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN DIRECTOR */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col p-6">
            <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2"><Settings className="w-5 h-5" /> Configurar Emitidos</h3>
            <p className="text-sm text-slate-500 mb-6">Ajusta tu firma de aprobación, ciudad y número base de contacto.</p>
            
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">Ciudad de Emisión</label>
                <input type="text" value={ciudadEmision} onChange={(e) => setCiudadEmision(e.target.value)} placeholder="Ej: Valledupar" className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none font-medium" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">Celular / Teléfono</label>
                <input type="text" value={telefonoEmision} onChange={(e) => setTelefonoEmision(e.target.value)} placeholder="Ej: 300 000 0000" className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none font-medium" />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700">Tu Firma Digital (Aprobador)</label>
                {firmaDirector && (
                  <button onClick={() => setFirmaDirector(null)} className="text-xs text-red-500 font-bold hover:underline">Eliminar Imagen</button>
                )}
              </div>
              
              {!firmaDirector ? (
                <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden transition-colors hover:bg-slate-100">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFirmaDirector(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className="text-center">
                    <p className="text-slate-600 font-bold mb-1">Cargar Archivo PNG/JPG</p>
                    <p className="text-xs text-slate-400">Toca aquí para seleccionar tu firma</p>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-300 rounded-xl bg-slate-50 h-32 flex items-center justify-center relative overflow-hidden p-2">
                  <img src={firmaDirector} className="max-h-full mix-blend-multiply object-contain" alt="Firma Cargada" />
                </div>
              )}
            </div>
            
            <button onClick={guardarConfiguracion} className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-900 shadow-sm transition-all flex justify-center gap-2">
              Guardar Configuración
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        
        @media print {
          body { 
            background: white !important; 
            margin: 0;
            padding: 0;
          }
          @page {
            margin: 0.5cm;
            size: letter portrait;
          }
          /* Ensure backgrounds print correctly on Chrome/Safari */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
}
