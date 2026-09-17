'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Briefcase, CreditCard, X, Printer, UserCircle, CheckCircle, Smartphone, Trash2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { Settings } from 'lucide-react';
import { useTenant } from '@/lib/hooks/useTenant';
import { useTranslation } from '@/lib/i18n/LanguageContext';

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
  const { t } = useTranslation();
  const router = useRouter();
  const [entrenadores, setEntrenadores] = useState<any[]>([]);
  const [historialPagos, setHistorialPagos] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { slug: tenantSlug } = useTenant();
  const [cargando, setCargando] = useState(true);
  
  // Modal de Pago
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entrenadorPago, setEntrenadorPago] = useState<any>(null);
  const [documento, setDocumento] = useState('');
  
  const sigContainerRef = useRef<HTMLDivElement>(null);
  const [sigDims, setSigDims] = useState({ width: 340, height: 160 });

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        if (sigContainerRef.current) {
          setSigDims({
            width: sigContainerRef.current.clientWidth - 4,
            height: 160
          });
        }
      }, 50);
    }
  }, [isModalOpen]);
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('Pago de Nómina - Mes de Abril');
  const sigCanvas = useRef<any>(null);

  // Configuración de Director
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [ciudadEmision, setCiudadEmision] = useState('');
  const [telefonoEmision, setTelefonoEmision] = useState('');
  const [firmaDirector, setFirmaDirector] = useState<string | null>(null);

  // Estados para Modal de Recibo (Impresión)
  const [reciboGenerado, setReciboGenerado] = useState<any>(null);

  useEffect(() => {
    async function init() {
      setCargando(true);
      
      // 1. Obtener Tenant
      if (!tenantSlug) return;
      const resTenant = await fetch(`/api/tenant?slug=${tenantSlug}`);
      const tenantData = await resTenant.json();
      setTenant(tenantData);

      // 2. Obtener Sesión y Perfil
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single();
      setUserProfile(perfil);

      // 3. SEGURIDAD
      if (perfil?.rol !== 'SuperAdmin' && perfil?.club_id !== tenantData.id) {
        toast.error(t('nomina.noTienesPermiso'));
        if (perfil?.club_id) {
          const { data: c } = await supabase.from('clubes').select('slug').eq('id', perfil.club_id).single();
          if (c) router.push(`/${c.slug}/director`);
        } else {
          router.push('/login');
        }
        return;
      }

      // 4. Cargar datos filtrados
      if (tenantData.id) {
        cargarDatos(tenantData.id);
      }
    }
    init();
  }, [tenantSlug]);

  const cargarDatos = async (clubId: string) => {
    setCargando(true);
    
    // Cargar config local - MODIFICADO PARA USAR SUPABASE EN LUGAR DE LOCALSTORAGE
    // Obtenemos la configuracion_wa para este club
    const { data: configWa } = await supabase.from('configuracion_wa').select('ciudad_emision, telefono_emision, firma_director').eq('club_id', clubId).maybeSingle();

    if (configWa) {
      setCiudadEmision(configWa.ciudad_emision || '');
      setTelefonoEmision(configWa.telefono_emision || (tenant?.dialCode ? `(${tenant.dialCode}) 000 000 0000` : ''));
      setFirmaDirector(configWa.firma_director || null);
    } else {
      setCiudadEmision('');
      setTelefonoEmision(tenant?.dialCode ? `(${tenant.dialCode}) 000 000 0000` : '');
      setFirmaDirector(null);
    }

    // Traemos a los entrenadores (FILTRADO POR CLUB)
    const { data: entData, error: entError } = await supabase
      .from('perfiles')
      .select('*')
      .eq('club_id', clubId)
      .eq('rol', 'Entrenador')
      .order('nombres', { ascending: true });

    if (entError) {
      toast.error(`${t('nomina.errorCargarEntrenadores')}${entError.message}`);
    } else if (entData) {
      setEntrenadores(entData);
    }

    // Traemos el historial de pagos (FILTRADO POR CLUB)
    const { data: pagosData } = await supabase
      .from('pagos_nomina')
      .select('*, entrenador:perfiles(*)')
      .eq('club_id', clubId)
      .order('fecha', { ascending: false });

    if (pagosData) {
      setHistorialPagos(pagosData);
    }

    setCargando(false);
  };

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

  const guardarConfiguracion = async () => {
    const toastId = toast.loading(t('nomina.guardandoConfig'));
    try {
      const payload = {
        club_id: tenant.id,
        ciudad_emision: ciudadEmision,
        telefono_emision: telefonoEmision,
        firma_director: firmaDirector
      };

      const { data: existing } = await supabase.from('configuracion_wa').select('id').eq('club_id', tenant.id).maybeSingle();
      if (existing?.id) {
        await supabase.from('configuracion_wa').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('configuracion_wa').insert([payload]);
      }

      setIsConfigOpen(false);
      toast.success(t('nomina.configActualizada'), { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const cerrarModalPago = () => {
    setIsModalOpen(false);
    setEntrenadorPago(null);
  };

  const limpiarFirma = () => {
    if (sigCanvas.current) sigCanvas.current.clear();
  };

  const eliminarPago = async (id: string, consecutivo: number) => {
    if (window.confirm(`${t('nomina.eliminarComprobante')}${String(consecutivo).padStart(4, '0')}?`)) {
      const toastId = toast.loading(t('nomina.eliminandoRegistro'));
      const { error } = await supabase.from('pagos_nomina').delete().eq('id', id);
      
      if (error) {
        toast.error(`${t('nomina.errorEliminar')}${error.message}`, { id: toastId });
      } else {
        toast.success(t('nomina.comprobanteEliminado'), { id: toastId });
        cargarDatos(tenant.id);
      }
    }
  };

  const procesarPago = async () => {
    if (!monto || parseFloat(monto) <= 0) {
      return toast.error(t('nomina.ingresaMontoValido'));
    }
    if (!documento) {
      return toast.error(t('nomina.ingresaCC'));
    }
    if (!concepto) {
      return toast.error(t('nomina.ingresaConcepto'));
    }
    if (sigCanvas.current && sigCanvas.current.isEmpty()) {
      return toast.error(t('nomina.firmaObligatoria'));
    }

    const firmaBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

    const toastId = toast.loading(t('nomina.registrandoPago'));

    const payload: any = {
      monto: parseFloat(monto),
      concepto: concepto,
      firma_base64: firmaBase64,
      documento_beneficiario: documento
    };

    if (entrenadorPago.id === 'externo') {
      if (!entrenadorPago.nombres) return toast.error(t('nomina.ingresaNombreProveedor'));
      payload.beneficiario_externo = entrenadorPago.nombres;
    } else {
      payload.entrenador_id = entrenadorPago.id;
    }

    payload.club_id = tenant.id; // INYECTAR CLUB ID EN EL PAGO

    // Insertar en Base de Datos
    const { data, error } = await supabase
      .from('pagos_nomina')
      .insert([payload])
      .select()
      .single();

    if (error) {
      toast.error(`${t('nomina.errorRegistrarPago')}${error.message}${t('nomina.crearTabla')}`, { id: toastId });
    } else {
      toast.success(t('nomina.pagoExitoso'), { id: toastId });
      cerrarModalPago();
      cargarDatos(tenant.id); // Recargar historial
      setReciboGenerado({
        ...data,
        entrenador: entrenadorPago,
        ciudad_emision: ciudadEmision,
        telefono_emision: telefonoEmision,
        firma_director: firmaDirector // Snapshot current device director sig
      });
    }
  };

  const imprimirRecibo = async () => {
    if (!reciboGenerado) return;
    const toastId = toast.loading("Generando comprobante de egreso...");
    try {
      // Necesitamos generarReciboNominaPDFBase64
      const { generarReciboNominaPDFBase64 } = await import('@/lib/recibo-utils');
      
      const pdfBase64 = await generarReciboNominaPDFBase64({
        nombres: reciboGenerado.entrenador?.nombres || reciboGenerado.beneficiario_externo || '',
        apellidos: reciboGenerado.entrenador?.apellidos || '',
        documento: reciboGenerado.documento_beneficiario,
        cargo: reciboGenerado.entrenador ? 'Entrenador' : 'Proveedor',
        monto: parseFloat(reciboGenerado.monto),
        periodo: new Date(reciboGenerado.fecha).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
        consecutivo: reciboGenerado.consecutivo,
        fecha: reciboGenerado.fecha,
        concepto: reciboGenerado.concepto,
        firma_director: firmaDirector || undefined,
        firma_recibe: reciboGenerado.firma_base64 || undefined,
        empresa: {
          nombre_club: tenant?.config?.nombre || 'Club',
          direccion: tenant?.config?.direccion || '',
          ciudad: ciudadEmision || tenant?.pais || 'Sede Principal',
          logo_url: tenant?.config?.logo || tenant?.logo_url,
          pais: tenant?.pais,
          moneda: tenant?.moneda
        }
      });
      
      const byteArray = new Uint8Array(atob(pdfBase64).split('').map(c => c.charCodeAt(0)));
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const filename = `Comprobante_Egreso_${reciboGenerado.consecutivo}.pdf`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      
      toast.success("Comprobante generado correctamente", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Error al generar PDF", { id: toastId });
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">{t('nomina.cargandoNomina')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 font-sans text-slate-800 dark:text-slate-100 relative transition-colors">
      
      {/* HTML template has been replaced by jsPDF */}


      <div className="print:hidden">
        {/* HEADER */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Briefcase className="text-brand w-7 h-7" /> {t('nomina.nominaYEgresos')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{t('nomina.controlPagos')}</p>
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
               <CreditCard className="w-4 h-4" /> {t('nomina.pagoProveedor')}
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
            <h2 className="text-xl font-bold text-slate-700">{t('nomina.noHayEntrenadores')}</h2>
            <p className="text-slate-500 mt-2">{t('nomina.creaPerfiles')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entrenadores.map(entrenador => (
              <div key={entrenador.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between transition-all hover:shadow-md">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-brand/10 w-14 h-14 rounded-full flex items-center justify-center shrink-0">
                    <UserCircle className="text-brand" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{entrenador.nombres} {entrenador.apellidos}</h3>
                    <p className="text-sm text-slate-500">{entrenador.email_contacto}</p>
                    <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-md mt-2">
                      Rol: {t('nomina.entrenador')}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => abrirModalPago(entrenador)}
                  className="w-full bg-brand/10 hover:bg-brand/10 border border-brand/40 text-brand font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
                >
                  <CreditCard className="w-5 h-5" /> {t('nomina.registrarPago')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TABLA HISTORIAL PAGOS */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-10">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t('nomina.historialComprobantes')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('nomina.registrosPasados')}</p>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4 md:px-6">{t('nomina.comprobanteNum')}</th>
                    <th className="p-4 md:px-6">{t('nomina.fecha')}</th>
                    <th className="p-4 md:px-6">{t('nomina.entrenador')}</th>
                    <th className="p-4 md:px-6">{t('nomina.concepto')}</th>
                    <th className="p-4 md:px-6 text-right">{t('nomina.montoAcordado')}</th>
                    <th className="p-4 md:px-6 text-right">{t('nomina.accion')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {cargando ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">{t('nomina.cargandoHistorial')}</td></tr>
                  ) : historialPagos.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-medium">{t('nomina.noHayEgresos')}</td></tr>
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
                          <button onClick={() => setReciboGenerado(pago)} className="bg-white border border-slate-300 text-slate-600 hover:text-brand hover:border-brand/40 hover:bg-brand/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                            <Printer className="w-3.5 h-3.5" /> {t('nomina.verImprimir')}
                          </button>
                          <button onClick={() => eliminarPago(pago.id, pago.consecutivo)} className="bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white px-2 py-1.5 rounded-lg transition-all shadow-sm flex items-center justify-center p-1.5" title={t('nomina.eliminarRegistroPerma')}>
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
            
            <div className="text-brand px-6 py-5 flex justify-between items-center relative overflow-hidden">
              <div className="text-brand w-24 h-24 rounded-full opacity-50 blur-xl"></div>
              <h2 className="text-white text-xl font-bold flex items-center gap-2 relative z-10"><Briefcase className="w-6 h-6" /> {t('nomina.liquidarPago')}</h2>
              <button onClick={cerrarModalPago} className="bg-brand/10 hover:text-white transition-colors p-1 relative z-10"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              {entrenadorPago.id === 'externo' ? (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t('nomina.nombreProveedor')}</label>
                  <input 
                    type="text" 
                    value={entrenadorPago.nombres} 
                    onChange={(e) => setEntrenadorPago({ ...entrenadorPago, nombres: e.target.value })} 
                    placeholder={t('nomina.ejConfecciones')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold text-lg text-slate-800 bg-amber-50"
                  />
                </div>
              ) : (
                <div className="bg-brand/10 border bg-brand/10 p-4 rounded-xl flex items-center gap-4">
                  <UserCircle className="text-brand" />
                  <div>
                    <p className="text-xs text-brand font-bold uppercase tracking-wider mb-1">{t('nomina.entrenador')}</p>
                    <p className="font-black text-slate-800 text-lg uppercase leading-none">{entrenadorPago.nombres} {entrenadorPago.apellidos}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('nomina.montoLiquidar')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input 
                    type="number" 
                    value={monto} 
                    onChange={(e) => setMonto(e.target.value)} 
                    placeholder={t('nomina.ej500000')}
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:text-brand font-bold text-lg text-slate-800"
                  />
                </div>
                {monto && parseFloat(monto) > 0 && (
                  <p className="text-xs text-slate-500 font-bold mt-2 uppercase">{numeroEnLetras(parseFloat(monto))}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('nomina.ccNitBeneficiario')}</label>
                <input 
                  type="text" 
                  value={documento} 
                  onChange={(e) => setDocumento(e.target.value)} 
                  placeholder={t('nomina.ejCedula')}
                  className="text-brand font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('nomina.conceptoPago')}</label>
                <input 
                  type="text" 
                  value={concepto} 
                  onChange={(e) => setConcepto(e.target.value)} 
                  placeholder={t('nomina.mesAbril')}
                  className="text-brand font-medium text-slate-700"
                />
              </div>

              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-slate-700">{t('nomina.firmaEntrenador')}</label>
                  <button onClick={limpiarFirma} className="text-[10px] bg-red-50 text-red-500 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center gap-1.5 shadow-sm border border-red-100">
                    <Trash2 className="w-3 h-3" /> {t('nomina.limpiarFirma')}
                  </button>
                </div>
                <div ref={sigContainerRef} className="border-2 border-dashed border-slate-300 rounded-xl bg-white relative w-full overflow-hidden shadow-inner flex justify-center">
                  <SignatureCanvas 
                    ref={sigCanvas}
                    canvasProps={{ 
                      width: sigDims.width, 
                      height: sigDims.height, 
                      className: 'cursor-crosshair' 
                    }}
                  />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xl">{t('nomina.firmarAqui')}</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
              <button 
                onClick={cerrarModalPago}
                className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {t('nomina.cancelar')}
              </button>
              <button 
                onClick={procesarPago}
                className="flex-1 bg-brand text-white font-bold py-3.5 rounded-xl hover:text-brand shadow-md shadow-brand/15 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" /> {t('nomina.guardarPDF')}
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
            <h3 className="text-2xl font-black text-slate-800 mb-2">{t('nomina.pagoExitosoModal')}</h3>
            <p className="text-slate-500 mb-8">{t('nomina.comprobanteGenero')}<strong>{reciboGenerado.beneficiario_externo || (reciboGenerado.entrenador ? reciboGenerado.entrenador.nombres : t('nomina.elProveedor'))}</strong>.</p>
            
            <div className="flex flex-col gap-3">
              <button onClick={imprimirRecibo} className="w-full bg-brand text-white font-bold py-3.5 rounded-xl hover:text-brand shadow-md shadow-brand/15 transition-all flex items-center justify-center gap-2">
                <Printer className="w-5 h-5" /> {t('nomina.imprimirComprobante')}
              </button>
              <button onClick={() => setReciboGenerado(null)} className="w-full bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors">
                {t('nomina.cerrar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN DIRECTOR */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col p-6">
            <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2"><Settings className="w-5 h-5" /> {t('nomina.configurarEmitidos')}</h3>
            <p className="text-sm text-slate-500 mb-6">{t('nomina.ajustaFirma')}</p>
            
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('nomina.ciudadEmision')}</label>
                <input type="text" value={ciudadEmision} onChange={(e) => setCiudadEmision(e.target.value)} placeholder={t('nomina.ejValledupar')} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none font-medium" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('nomina.celularTelefono')}</label>
                <input type="text" value={telefonoEmision} onChange={(e) => setTelefonoEmision(e.target.value)} placeholder={t('nomina.ejTelefono')} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none font-medium" />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700">{t('nomina.tuFirmaDigital')}</label>
                {firmaDirector && (
                  <button onClick={() => setFirmaDirector(null)} className="text-xs text-red-500 font-bold hover:underline">{t('nomina.eliminarImagen')}</button>
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
                    <p className="text-slate-600 font-bold mb-1">{t('nomina.cargarArchivo')}</p>
                    <p className="text-xs text-slate-400">{t('nomina.tocaAqui')}</p>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-300 rounded-xl bg-slate-50 h-32 flex items-center justify-center relative overflow-hidden p-2">
                  <img src={firmaDirector} className="max-h-full mix-blend-multiply object-contain" alt="Firma Cargada" />
                </div>
              )}
            </div>
            
            <button onClick={guardarConfiguracion} className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-900 shadow-sm transition-all flex justify-center gap-2">
              {t('nomina.guardarConfiguracion')}
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
