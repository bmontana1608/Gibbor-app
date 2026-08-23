'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Loader2, Search, Send, User, MessageSquare, Phone, Sparkles, Bot,
  Building2, Paperclip, Mic, MicOff, FileText, Download, X, Play, Pause,
  Image as ImageIcon, Film
} from 'lucide-react';
import { toast } from 'sonner';
import SalesGuide from './SalesGuide';

interface CRMChatViewProps {
  role: 'superadmin' | 'embajador';
}

// ─── Media Bubble ───────────────────────────────────────────────────────────
function MediaBubble({ msg, isSaliente }: { msg: any; isSaliente: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const bubble = isSaliente
    ? 'bg-lime-500 text-white rounded-tr-sm'
    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm';

  const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const timeColor = isSaliente ? 'text-lime-100' : 'text-slate-400';

  if (msg.media_type === 'image' && msg.media_url) {
    return (
      <>
        <div className={`max-w-[70%] rounded-2xl overflow-hidden ${isSaliente ? 'rounded-tr-sm' : 'rounded-tl-sm shadow-sm'}`}>
          <img
            src={msg.media_url}
            alt="Imagen"
            className="max-w-xs max-h-64 object-cover cursor-pointer hover:opacity-90 transition"
            onClick={() => setImgOpen(true)}
          />
          {msg.mensaje && <p className={`text-sm px-4 py-2 ${isSaliente ? 'bg-lime-500 text-white' : 'bg-white text-slate-800'}`}>{msg.mensaje}</p>}
          <div className={`px-4 pb-2 text-[10px] flex justify-end ${isSaliente ? 'bg-lime-500' : 'bg-white'} ${timeColor}`}>{timeStr}</div>
        </div>
        {imgOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setImgOpen(false)}>
            <img src={msg.media_url} alt="Imagen" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" />
            <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"><X className="w-5 h-5" /></button>
          </div>
        )}
      </>
    );
  }

  if (msg.media_type === 'audio' && msg.media_url) {
    const togglePlay = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio(msg.media_url);
        audioRef.current.onended = () => setPlaying(false);
      }
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play(); setPlaying(true); }
    };

    return (
      <div className={`max-w-[60%] rounded-2xl px-4 py-3 ${bubble} flex items-center gap-3`}>
        <button onClick={togglePlay} className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSaliente ? 'bg-lime-600' : 'bg-slate-100'}`}>
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <div className="flex-1">
          <div className="h-1 bg-current/30 rounded-full w-full opacity-40 mb-1" />
          <span className="text-[11px] opacity-70">Nota de voz</span>
        </div>
        <div className={`text-[10px] self-end ${timeColor}`}>{timeStr}</div>
      </div>
    );
  }

  if (msg.media_type === 'document' && msg.media_url) {
    const filename = msg.mensaje || 'Documento';
    return (
      <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${bubble} flex items-center gap-3`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSaliente ? 'bg-lime-600' : 'bg-slate-100'}`}>
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{filename}</p>
          <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className={`text-xs flex items-center gap-1 mt-1 ${isSaliente ? 'text-lime-100 hover:text-white' : 'text-lime-600 hover:text-lime-700'}`}>
            <Download className="w-3 h-3" /> Descargar
          </a>
        </div>
        <div className={`text-[10px] self-end ${timeColor}`}>{timeStr}</div>
      </div>
    );
  }

  if (msg.media_type === 'video' && msg.media_url) {
    return (
      <div className={`max-w-[70%] rounded-2xl overflow-hidden ${isSaliente ? 'rounded-tr-sm' : 'rounded-tl-sm shadow-sm'}`}>
        <video src={msg.media_url} controls className="max-w-xs max-h-64 object-cover" />
        <div className={`px-4 pb-2 text-[10px] flex justify-end ${isSaliente ? 'bg-lime-500' : 'bg-white'} ${timeColor}`}>{timeStr}</div>
      </div>
    );
  }

  // Plain text fallback
  return (
    <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${bubble}`}>
      <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
      <div className={`text-[10px] mt-1 flex justify-end ${timeColor}`}>{timeStr}</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CRMChatView({ role }: CRMChatViewProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'leads' | 'clubes'>('leads');
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'document' | 'video' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  useEffect(() => {
    initChat();
    const channel = supabase
      .channel('crm-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_whatsapp_messages' }, (payload) => {
        handleNewMessage(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (activeChat) fetchMessages(activeChat.numero_telefono);
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initChat = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    let leadsQuery = supabase.from('atlas_academias').select('id, nombre, telefono, embajador_id');
    let clubesQuery = supabase.from('clubes').select('id, nombre, telefono_contacto, embajador_id');
    let msgsQuery = supabase.from('crm_whatsapp_messages')
      .select('numero_telefono, mensaje, created_at, leido, es_saliente')
      .order('created_at', { ascending: false });

    if (role === 'embajador' && user) {
      const { data: embajador } = await supabase.from('embajadores').select('id').eq('user_id', user.id).maybeSingle();
      if (embajador) {
        leadsQuery = leadsQuery.eq('embajador_id', embajador.id);
        clubesQuery = clubesQuery.eq('embajador_id', embajador.id);
        msgsQuery = msgsQuery.eq('instancia', `embajador-${embajador.id}`);
      } else {
        leadsQuery = leadsQuery.eq('embajador_id', '00000000-0000-0000-0000-000000000000');
        clubesQuery = clubesQuery.eq('embajador_id', '00000000-0000-0000-0000-000000000000');
        msgsQuery = msgsQuery.eq('instancia', 'NONE');
      }
    }

    const { data: leads } = await leadsQuery;
    const { data: clubes } = await clubesQuery;
    const { data: allMsgs, error } = await msgsQuery;

    if (error && error.code !== '42P01') toast.error('Error al cargar chats');

    if (allMsgs || leads || clubes) {
      const grouped = (allMsgs || []).reduce((acc: any, msg: any) => {
        if (!acc[msg.numero_telefono]) acc[msg.numero_telefono] = { ...msg, unread: 0 };
        if (!msg.es_saliente && !msg.leido) acc[msg.numero_telefono].unread += 1;
        return acc;
      }, {});

      // Build full list including leads WITHOUT phone (shown grayed out)
      const buildList = (items: any[], phoneField: string, type: string) =>
        (items || []).map(item => {
          const numNorm = item[phoneField] ? item[phoneField].replace(/\D/g, '') : '';
          let msgMatch = null, matchedPhone = item[phoneField];
          for (const num in grouped) {
            const n = num.replace(/\D/g, '');
            if (numNorm && n && (numNorm.includes(n) || n.includes(numNorm))) {
              msgMatch = grouped[num]; matchedPhone = num; break;
            }
          }
          return {
            numero_telefono: matchedPhone?.replace(/\D/g, '') || '',
            hasPhone: numNorm.length > 5,
            lastMessage: msgMatch ? msgMatch.mensaje : '',
            lastMessageTime: msgMatch ? msgMatch.created_at : new Date(0).toISOString(),
            unread: msgMatch ? msgMatch.unread : 0,
            entity: item, type
          };
        }); // No filter — show ALL assigned leads

      const leadsList = buildList(leads || [], 'telefono', 'lead');
      const clubesList = buildList(clubes || [], 'telefono_contacto', 'club');
      const allKnownNorm = [...leadsList, ...clubesList]
        .filter(c => c.hasPhone)
        .map(c => c.numero_telefono);
      const orphanedList = Object.keys(grouped)
        .filter(num => !allKnownNorm.some(k => k.includes(num.replace(/\D/g, '')) || num.replace(/\D/g, '').includes(k)))
        .map(num => ({
          numero_telefono: num, hasPhone: true, lastMessage: grouped[num].mensaje,
          lastMessageTime: grouped[num].created_at, unread: grouped[num].unread,
          entity: null, type: 'orphaned'
        }));

      // Sort: chats with messages first (by recency), then no-message leads alphabetically
      let chatList = [...leadsList, ...clubesList, ...orphanedList].sort((a, b) => {
        const aHasMsg = a.lastMessageTime !== new Date(0).toISOString();
        const bHasMsg = b.lastMessageTime !== new Date(0).toISOString();
        if (aHasMsg && !bHasMsg) return -1;
        if (!aHasMsg && bHasMsg) return 1;
        if (aHasMsg && bHasMsg) return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        return (a.entity?.nombre || '').localeCompare(b.entity?.nombre || '');
      });

      const params = new URLSearchParams(window.location.search);
      let phoneParam = params.get('phone');
      if (phoneParam) {
        if (phoneParam.startsWith(' ')) phoneParam = '+' + phoneParam.slice(1);
        const pNum = phoneParam.replace(/\D/g, '');
        let existing = chatList.find(c => { const cn = c.numero_telefono.replace(/\D/g, ''); return cn && pNum && (cn.includes(pNum) || pNum.includes(cn)); });
        if (!existing) {
          existing = { numero_telefono: phoneParam, hasPhone: true, lastMessage: '', lastMessageTime: new Date().toISOString(), unread: 0, entity: { nombre: 'Prospecto' } as any, type: 'orphaned' };
          chatList = [existing, ...chatList];
        }
        if (existing.type === 'club') setActiveTab('clubes'); else setActiveTab('leads');
        setActiveChat(existing);
        window.history.replaceState({}, '', window.location.pathname);
      }
      setChats(chatList);
    }
    setLoading(false);
  };

  const handleNewMessage = (msg: any) => {
    setMessages(prev => {
      const cur = activeChatRef.current;
      if (cur && msg.numero_telefono === cur.numero_telefono) {
        if (!msg.es_saliente) markAsRead(msg.numero_telefono);
        return [...prev, msg];
      }
      return prev;
    });
    initChat();
  };

  const fetchMessages = async (numero: string) => {
    try {
      const res = await fetch(`/api/admin/crm/whatsapp/messages?phone=${numero}`);
      if (!res.ok) throw new Error();
      setMessages(await res.json() || []);
      markAsRead(numero);
    } catch { /* silent */ }
  };

  const markAsRead = async (numero: string) => {
    await supabase.from('crm_whatsapp_messages').update({ leido: true }).eq('numero_telefono', numero).eq('es_saliente', false);
    setChats(prev => prev.map(c => c.numero_telefono === numero ? { ...c, unread: 0 } : c));
  };

  // ─── Upload media to Supabase ─────────────────────────────────────────────
  const uploadMedia = async (file: File | Blob, type: string, filename?: string): Promise<string> => {
    const ext = type === 'audio' ? 'ogg' : (file as File).name?.split('.').pop() || 'bin';
    const path = `chat-media/${Date.now()}_${filename || 'audio'}.${ext}`;
    const { error } = await supabase.storage.from('chat_media').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('chat_media').getPublicUrl(path);
    return data.publicUrl;
  };

  // ─── File picker handler ──────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast.error('El archivo no puede superar 15 MB'); return; }
    setMediaFile(file);
    let t: 'image' | 'document' | 'video' = 'document';
    if (file.type.startsWith('image/')) { t = 'image'; setMediaPreview(URL.createObjectURL(file)); }
    else if (file.type.startsWith('video/')) { t = 'video'; setMediaPreview(URL.createObjectURL(file)); }
    else setMediaPreview(null);
    setMediaType(t);
    e.target.value = '';
  };

  const clearMedia = () => { setMediaFile(null); setMediaPreview(null); setMediaType(null); };

  // ─── Voice recording ──────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      toast.error('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  const stopAndSendRecording = async () => {
    if (!mediaRecorderRef.current || !activeChat) return;
    clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current.stop();
    setIsRecording(false);

    await new Promise(r => setTimeout(r, 300));
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
    if (blob.size < 500) { toast.error('La grabación fue demasiado corta'); return; }

    setSending(true);
    try {
      const audioUrl = await uploadMedia(blob, 'audio', 'nota_voz');
      await sendMedia(audioUrl, 'audio', 'Nota de voz');
    } catch {
      toast.error('Error al enviar nota de voz');
    }
    setSending(false);
  };

  const cancelRecording = () => {
    clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // ─── Send media helper ─────────────────────────────────────────────────────
  const sendMedia = async (mediaUrl: string, type: string, caption?: string) => {
    if (!activeChat) return;
    const res = await fetch('/api/admin/crm/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: activeChat.numero_telefono,
        mensaje: caption || '',
        media_url: mediaUrl,
        media_type: type,
        lead_id: activeChat.type === 'lead' && activeChat.entity ? activeChat.entity.id : null
      })
    });
    if (!res.ok) throw new Error('Error al enviar');
    const sentMsg = {
      id: crypto.randomUUID(),
      numero_telefono: activeChat.numero_telefono,
      mensaje: caption || '',
      media_url: mediaUrl,
      media_type: type,
      es_saliente: true, leido: true,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, sentMsg]);
    setChats(prev => prev.map(c => c.numero_telefono === activeChat.numero_telefono
      ? { ...c, lastMessage: caption || `[${type}]`, lastMessageTime: sentMsg.created_at } : c));
  };

  // ─── Main send ────────────────────────────────────────────────────────────
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat) return;
    if (isRecording) { await stopAndSendRecording(); return; }

    setSending(true);
    setUploading(!!mediaFile);
    try {
      if (mediaFile) {
        const url = await uploadMedia(mediaFile, mediaType!, mediaFile.name);
        await sendMedia(url, mediaType!, newMessage || mediaFile.name);
        clearMedia();
        setNewMessage('');
      } else {
        if (!newMessage.trim()) { setSending(false); return; }
        const res = await fetch('/api/admin/crm/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero: activeChat.numero_telefono,
            mensaje: newMessage,
            lead_id: activeChat.type === 'lead' && activeChat.entity ? activeChat.entity.id : null
          })
        });
        if (!res.ok) throw new Error('Error al enviar');
        const sentMsg = {
          id: crypto.randomUUID(), numero_telefono: activeChat.numero_telefono,
          mensaje: newMessage, es_saliente: true, leido: true,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, sentMsg]);
        setChats(prev => prev.map(c => c.numero_telefono === activeChat.numero_telefono
          ? { ...c, lastMessage: newMessage, lastMessageTime: sentMsg.created_at } : c));
        setNewMessage('');
      }
    } catch {
      toast.error('No se pudo enviar el mensaje');
    }
    setSending(false);
    setUploading(false);
  };

  const handleNewManualChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = newPhone.replace(/\D/g, '');
    if (cleanNum.length < 8) { toast.error('Número inválido. Usa código de país ej: 573012345678'); return; }
    let existing = chats.find(c => c.numero_telefono.includes(cleanNum) || cleanNum.includes(c.numero_telefono));
    if (existing) {
      setActiveChat(existing);
      if (existing.type === 'club') setActiveTab('clubes'); else setActiveTab('leads');
    } else {
      const { data } = await supabase.from('atlas_academias').insert({ nombre: newName || 'Prospecto Manual', telefono: cleanNum }).select().single();
      const newChat: any = { numero_telefono: cleanNum, hasPhone: true, lastMessage: '', lastMessageTime: new Date().toISOString(), unread: 0, entity: data || { nombre: newName || 'Prospecto Manual' }, type: 'lead' };
      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat);
      setActiveTab('leads');
    }
    setNewPhone(''); setNewName('');
  };

  const askCopilot = async () => {
    if (!activeChat || messages.length === 0) return;
    setLoadingAI(true); setAiSuggestion('');
    try {
      const res = await fetch('/api/admin/crm/ai-copilot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: messages.slice(-10), leadName: activeChat.entity?.nombre || 'Prospecto' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiSuggestion(data.reply);
    } catch { toast.error('No se pudo generar la sugerencia IA'); }
    setLoadingAI(false);
  };

  const filteredChats = chats.filter(c => {
    if (activeTab === 'clubes' && c.type !== 'club') return false;
    if (activeTab === 'leads' && c.type === 'club') return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!((c.entity?.nombre || '').toLowerCase().includes(term) || c.numero_telefono.includes(searchTerm))) return false;
    }
    return true;
  });

  if (loading) return <div className="flex h-[calc(100vh-100px)] items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-lime-500" /></div>;

  return (
    <div className="flex h-[calc(100vh-100px)] bg-slate-50 p-4 md:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex w-full max-w-6xl mx-auto overflow-hidden">

        {/* ── Sidebar ── */}
        <div className="w-1/3 border-r border-slate-200 flex flex-col bg-white">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 mb-3">Chat CRM</h2>
            <form onSubmit={handleNewManualChat} className="flex flex-col gap-2 mb-3">
              <input type="text" placeholder="Nombre del prospecto..." value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-lime-500" />
              <div className="flex gap-2">
                <input type="text" placeholder="Teléfono (ej: 57301...)" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-lime-500" />
                <button type="submit" className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition whitespace-nowrap">+ Iniciar</button>
              </div>
            </form>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar contacto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500" />
            </div>
            <div className="flex bg-slate-100 rounded-lg p-1">
              {(['leads', 'clubes'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === tab ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab === 'leads' ? 'Prospectos' : 'Academias'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 && <div className="text-center p-6 text-slate-400 text-xs font-bold">No hay contactos disponibles</div>}
            {filteredChats.map(chat => {
              const isActive = activeChat?.numero_telefono === chat.numero_telefono && activeChat?.entity?.id === chat.entity?.id;
              const noPhone = !chat.hasPhone;
              const hasMsg = chat.lastMessageTime !== new Date(0).toISOString();
              return (
                <div
                  key={`${chat.type}-${chat.entity?.id || chat.numero_telefono}`}
                  onClick={() => !noPhone && setActiveChat(chat)}
                  className={`p-4 border-b border-slate-50 flex items-start gap-3 transition-colors
                    ${noPhone ? 'opacity-50 cursor-default' : 'cursor-pointer hover:bg-slate-50'}
                    ${isActive ? 'bg-slate-50 border-l-4 border-l-lime-500' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${chat.type === 'club' ? 'bg-blue-100' : 'bg-lime-100'}`}>
                    {chat.type === 'club' ? <Building2 className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-lime-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-sm text-slate-900 truncate">{chat.entity ? chat.entity.nombre : chat.numero_telefono}</h3>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {hasMsg ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : noPhone ? '—' : 'Nuevo'}
                      </span>
                    </div>
                    {noPhone ? (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Sin teléfono</span>
                    ) : (
                      <p className="text-xs text-slate-500 truncate">{chat.lastMessage || 'Iniciar conversación...'}</p>
                    )}
                  </div>
                  {chat.unread > 0 && <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{chat.unread}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Chat Area ── */}
        {activeChat ? (
          <div className="w-2/3 flex flex-col bg-slate-50">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeChat.type === 'club' ? 'bg-blue-100' : 'bg-lime-100'}`}>
                {activeChat.type === 'club' ? <Building2 className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-lime-600" />}
              </div>
              <div>
                <h3 className="font-black text-slate-900">{activeChat.entity ? activeChat.entity.nombre : 'Prospecto Nuevo'}</h3>
                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium"><Phone className="w-3 h-3" /> {activeChat.numero_telefono}</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-bold">Aún no hay mensajes.</p>
                  <p className="text-xs">¡Escribe abajo para iniciar la conversación!</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id || msg.created_at} className={`flex ${msg.es_saliente ? 'justify-end' : 'justify-start'}`}>
                  <MediaBubble msg={msg} isSaliente={msg.es_saliente} />
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Copilot */}
            {(aiSuggestion || loadingAI) && (
              <div className="mx-4 mt-2 mb-0 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2"><Bot className="w-4 h-4 text-indigo-600" /><span className="text-xs font-bold text-indigo-900">Copiloto IA sugiere:</span></div>
                {loadingAI ? (
                  <div className="flex items-center gap-2 text-indigo-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Analizando conversación...</div>
                ) : (
                  <div>
                    <p className="text-sm text-indigo-800 whitespace-pre-wrap mb-3">{aiSuggestion}</p>
                    <div className="flex gap-2">
                      <button onClick={() => { setNewMessage(aiSuggestion); setAiSuggestion(''); }} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition">Usar esta respuesta</button>
                      <button onClick={() => setAiSuggestion('')} className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-lg font-medium border border-indigo-200 hover:bg-indigo-50 transition">Descartar</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sales Guide (Only for Embajadores chatting with leads) */}
            {role === 'embajador' && activeChat.type === 'lead' && (
              <div className="mt-2">
                <SalesGuide 
                  etapaActual={activeChat.entity?.estado} 
                  onUseMessage={(text) => setNewMessage(text)} 
                />
              </div>
            )}

            {/* Media Preview */}
            {mediaFile && (
              <div className="mx-4 mt-2 p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-3">
                {mediaPreview && mediaType === 'image' && <img src={mediaPreview} alt="preview" className="h-14 w-14 object-cover rounded-lg" />}
                {mediaPreview && mediaType === 'video' && <Film className="w-8 h-8 text-slate-500" />}
                {mediaType === 'document' && <FileText className="w-8 h-8 text-slate-500" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{mediaFile.name}</p>
                  <p className="text-[10px] text-slate-500">{(mediaFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={clearMedia} className="p-1 hover:bg-slate-200 rounded-lg transition"><X className="w-4 h-4 text-slate-500" /></button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex justify-between mb-2">
                <button onClick={askCopilot} disabled={loadingAI || messages.length === 0}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50">
                  <Sparkles className="w-3.5 h-3.5" /> ✨ Sugerir Respuesta IA
                </button>
              </div>

              {isRecording ? (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-bold text-red-600 flex-1">Grabando... {recordingSeconds}s</span>
                  <button onClick={cancelRecording} className="text-slate-500 hover:text-slate-800 p-1"><X className="w-5 h-5" /></button>
                  <button onClick={stopAndSendRecording} disabled={sending}
                    className="bg-lime-500 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-lime-600 transition disabled:opacity-50">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <form onSubmit={sendMessage} className="flex items-end gap-2">
                  {/* Hidden file input */}
                  <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="hidden" onChange={handleFileChange} />

                  {/* Attach button */}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-slate-500 hover:text-slate-800 shrink-0">
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as any); } }}
                    placeholder={mediaFile ? 'Escribe un pie de foto (opcional)...' : 'Escribe un mensaje...'}
                    rows={1}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 resize-none"
                    style={{ maxHeight: '120px', overflowY: 'auto' }}
                  />

                  {/* Mic button */}
                  {!mediaFile && !newMessage.trim() ? (
                    <button type="button" onClick={startRecording}
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 text-white hover:bg-slate-700 transition shrink-0">
                      <Mic className="w-5 h-5" />
                    </button>
                  ) : (
                    <button type="submit" disabled={sending || uploading || (!newMessage.trim() && !mediaFile)}
                      className="bg-lime-500 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-lime-600 transition-colors disabled:opacity-50 shrink-0">
                      {(sending || uploading) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="w-2/3 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-black text-slate-300">WhatsApp CRM</h3>
            <p className="text-sm">Selecciona una conversación para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
}
