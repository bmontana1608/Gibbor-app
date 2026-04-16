'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Search, MessageSquare, 
  Send, User, Clock, CheckCheck, Bot, FileText, Wifi
} from 'lucide-react';

export default function HistorialChats() {
  const router = useRouter();
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [conversaciones, setConversaciones] = useState<any[]>([]);
  const [perfiles, setPerfiles] = useState<Record<string, any>>({});
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [enVivo, setEnVivo] = useState(false);
  const mensajesFinalRef = useRef<HTMLDivElement>(null);

  // Función para construir la lista de conversaciones agrupadas por número
  const buildConversaciones = (data: any[], profiles: Record<string, any>) => {
    const uniqueNums = Array.from(new Set(data.map(m => m.destinatario_numero)));
    return uniqueNums.map(num => {
      const lastMsg = data.find(m => m.destinatario_numero === num);
      // Buscar nombre en perfiles por número de teléfono
      const perfil = Object.values(profiles).find((p: any) => {
        const tel = String(p.telefono || '').replace(/\D/g, '');
        const numLimpio = String(num || '').replace(/\D/g, '');
        return tel === numLimpio || `57${tel}` === numLimpio || tel === `57${numLimpio}`;
      });
      return {
        numero: num,
        nombre: perfil ? `${perfil.nombres} ${perfil.apellidos}` : num,
        grupo: perfil?.grupos || '',
        ultimoMensaje: lastMsg?.mensaje_texto || '',
        tipoUltimo: lastMsg?.tipo_mensaje || 'Notificación',
        fecha: lastMsg?.created_at,
        sinLeer: data.filter(m => m.destinatario_numero === num).length
      };
    }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  };

  useEffect(() => {
    async function init() {
      setCargando(true);

      // Cargar perfiles para cruzar números con nombres
      const { data: perfilesData } = await supabase
        .from('perfiles')
        .select('id, nombres, apellidos, telefono, grupos')
        .eq('rol', 'Futbolista');

      const profilesMap: Record<string, any> = {};
      perfilesData?.forEach(p => { profilesMap[p.id] = p; });
      setPerfiles(profilesMap);

      // Cargar todos los mensajes históricos
      const { data, error } = await supabase
        .from('mensajes_wa')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setMensajes(data);
        const convs = buildConversaciones(data, profilesMap);
        setConversaciones(convs);
        if (convs.length > 0) setSelectedChat(convs[0].numero);
      }

      setCargando(false);
    }
    init();
  }, []);

  // Suscripción en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('mensajes_wa_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_wa' },
        (payload) => {
          const nuevoMensaje = payload.new;
          setMensajes(prev => {
            const updated = [nuevoMensaje, ...prev];
            setConversaciones(buildConversaciones(updated, perfiles));
            return updated;
          });
          setEnVivo(true);
          setTimeout(() => setEnVivo(false), 3000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [perfiles]);

  // Scroll al último mensaje al abrir un chat
  useEffect(() => {
    mensajesFinalRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat, mensajes]);

  const chatActual = mensajes
    .filter(m => m.destinatario_numero === selectedChat)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const convsFiltradas = busqueda
    ? conversaciones.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : conversaciones;

  const chatInfo = conversaciones.find(c => c.numero === selectedChat);

  const getIconoTipo = (tipo: string) => {
    if (tipo === 'Recibo') return <FileText className="w-3 h-3" />;
    return <MessageSquare className="w-3 h-3" />;
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden font-sans">
      
      {/* SIDEBAR IZQUIERDO: Conversaciones */}
      <div className="w-[380px] bg-white border-r border-[#d1d7db] flex flex-col shrink-0">
        {/* Cabecera */}
        <div className="bg-[#f0f2f5] py-3 px-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#54656f]" />
            </button>
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#111b21]">Gibbor WA</p>
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${enVivo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <p className="text-[9px] text-[#667781] font-bold uppercase tracking-widest">
                  {enVivo ? 'Nuevo mensaje' : 'En vivo'}
                </p>
              </div>
            </div>
          </div>
          <Wifi className={`w-4 h-4 ${enVivo ? 'text-emerald-500' : 'text-slate-300'} transition-colors`} />
        </div>

        {/* Buscador */}
        <div className="p-2 border-b border-slate-100">
          <div className="bg-[#f0f2f5] rounded-lg flex items-center px-4 py-1.5">
            <Search className="w-4 h-4 text-[#54656f] mr-3 shrink-0" />
            <input 
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar contacto..."
              className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="px-4 py-2 border-b border-slate-50 flex gap-4">
          <div className="text-center">
            <p className="text-xs font-black text-slate-800">{conversaciones.length}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Contactos</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-slate-800">{mensajes.length}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Mensajes</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-emerald-600">{mensajes.filter(m => m.tipo_mensaje === 'Recibo').length}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Recibos</p>
          </div>
        </div>

        {/* Lista de Chats */}
        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            [1,2,3,4,5].map(i => (
              <div key={i} className="p-4 border-b border-slate-50 flex gap-3 animate-pulse">
                <div className="w-12 h-12 bg-slate-100 rounded-full shrink-0"></div>
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                </div>
              </div>
            ))
          ) : convsFiltradas.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-sm font-bold text-slate-400">
                {busqueda ? 'No se encontró el contacto' : 'No hay mensajes enviados'}
              </p>
              <p className="text-xs text-slate-300 mt-1">
                {busqueda ? 'Intenta con otro nombre' : 'Las notificaciones que envíes aparecerán aquí.'}
              </p>
            </div>
          ) : (
            convsFiltradas.map(conv => (
              <div 
                key={conv.numero} 
                onClick={() => setSelectedChat(conv.numero)}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[#f5f6f6] transition-colors border-b border-[#f0f2f5] ${selectedChat === conv.numero ? 'bg-[#f0f2f5]' : ''}`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-white font-black text-sm">
                    {conv.nombre ? conv.nombre.charAt(0).toUpperCase() : '#'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-[#111b21] text-sm truncate">{conv.nombre}</span>
                    <span className="text-[10px] text-[#667781] font-medium shrink-0 ml-2">
                      {new Date(conv.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCheck className="w-3 h-3 text-[#53bdeb] shrink-0" />
                    <span className="text-xs text-[#667781] truncate">{conv.ultimoMensaje}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ÁREA DE CHAT DERECHA */}
      <div className="flex-1 flex flex-col relative">
        {/* Fondo sutil estilo WA */}
        <div className="absolute inset-0 bg-[#efeae2]" />

        {selectedChat && chatInfo ? (
          <>
            {/* Cabecera Chat */}
            <div className="bg-[#f0f2f5] py-3 px-4 flex items-center gap-3 border-b border-[#d1d7db] z-10 relative shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-black">
                  {chatInfo.nombre ? chatInfo.nombre.charAt(0).toUpperCase() : '#'}
                </span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[#111b21] leading-none">{chatInfo.nombre}</h4>
                <p className="text-[10px] text-[#667781] mt-0.5">
                  {chatInfo.grupo || `+${chatInfo.numero}`} · {chatActual.length} mensaje{chatActual.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Historial Activo</span>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 z-10 relative flex flex-col">
              {chatActual.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-slate-400 italic">No hay mensajes en esta conversación.</p>
                </div>
              ) : (
                <>
                  {chatActual.map((msg, idx) => (
                    <div 
                      key={msg.id || idx} 
                      className="flex justify-end"
                    >
                      <div className="max-w-[75%] bg-[#dcf8c6] rounded-lg rounded-tr-none shadow-sm p-2 px-3 relative">
                        {/* Badge tipo de mensaje */}
                        {msg.tipo_mensaje && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                              msg.tipo_mensaje === 'Recibo' 
                                ? 'bg-blue-100 text-blue-600' 
                                : msg.tipo_mensaje === 'Cobranza'
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {getIconoTipo(msg.tipo_mensaje)}
                              {msg.tipo_mensaje}
                            </span>
                          </div>
                        )}
                        <p className="text-[13px] text-[#111b21] whitespace-pre-wrap leading-relaxed pr-10">
                          {msg.mensaje_texto}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[9px] text-[#667781]">
                            {new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={mensajesFinalRef} />
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-[#f0f2f5] py-3 px-4 flex items-center gap-3 z-10 relative border-t border-[#d1d7db]">
              <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-slate-400 border border-slate-200 italic shadow-sm">
                Modo historial. Para enviar mensajes usa el Dashboard o Cobranza.
              </div>
              <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center shadow-lg opacity-40">
                <Send className="w-5 h-5 text-white" />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10 relative">
            <div className="w-64 h-64 bg-white/30 rounded-full flex items-center justify-center mb-10 shadow-inner border border-white/50">
              <Bot className="w-28 h-28 text-[#54656f] opacity-30" />
            </div>
            <h2 className="text-2xl font-light text-[#54656f] mb-3">Gibbor WA Historial</h2>
            <p className="max-w-sm text-sm text-[#667781] leading-relaxed">
              Aquí puedes auditar todos los mensajes enviados.<br/>
              Selecciona una conversación para ver el detalle.
            </p>
            <div className="mt-10 flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full shadow-sm border border-white">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#667781]">
                Sincronización en tiempo real activa
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
