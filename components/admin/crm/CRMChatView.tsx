'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, Send, User, MessageSquare, Phone, Sparkles, Bot, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface CRMChatViewProps {
  role: 'superadmin' | 'embajador';
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initChat();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crm_whatsapp_messages' },
        (payload) => {
          handleNewMessage(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.numero_telefono);
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initChat = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // Fetch leads and clubes based on role
    let leadsQuery = supabase.from('atlas_academias').select('id, nombre, telefono, embajador_id');
    let clubesQuery = supabase.from('clubes').select('id, nombre, telefono_contacto, embajador_id');

    if (role === 'embajador' && user) {
      const { data: embajador } = await supabase.from('embajadores').select('id').eq('user_id', user.id).maybeSingle();
      if (embajador) {
        leadsQuery = leadsQuery.eq('embajador_id', embajador.id);
        clubesQuery = clubesQuery.eq('embajador_id', embajador.id);
      } else {
        leadsQuery = leadsQuery.eq('embajador_id', '00000000-0000-0000-0000-000000000000');
        clubesQuery = clubesQuery.eq('embajador_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const { data: leads } = await leadsQuery;
    const { data: clubes } = await clubesQuery;

    // Fetch distinct numbers from messages to show in the sidebar
    const { data: allMsgs, error } = await supabase
      .from('crm_whatsapp_messages')
      .select('numero_telefono, mensaje, created_at, leido, es_saliente')
      .order('created_at', { ascending: false });

    if (error && error.code !== '42P01') {
      toast.error('Error al cargar chats');
    }

    if (allMsgs || leads || clubes) {
      // Group by number
      const grouped = (allMsgs || []).reduce((acc: any, msg: any) => {
        if (!acc[msg.numero_telefono]) {
          acc[msg.numero_telefono] = { ...msg, unread: 0 };
        }
        if (!msg.es_saliente && !msg.leido) {
          acc[msg.numero_telefono].unread += 1;
        }
        return acc;
      }, {});

      // Build Leads List
      const leadsList = (leads || []).map(l => {
        const lNumNorm = l.telefono ? l.telefono.replace(/\D/g, '') : '';
        let msgMatch = null;
        let matchedPhone = l.telefono;
        for (const num in grouped) {
           const numNorm = num.replace(/\D/g, '');
           if (lNumNorm && numNorm && (lNumNorm.includes(numNorm) || numNorm.includes(lNumNorm))) {
              msgMatch = grouped[num];
              matchedPhone = num;
              break;
           }
        }
        
        return {
          numero_telefono: matchedPhone,
          lastMessage: msgMatch ? msgMatch.mensaje : '',
          lastMessageTime: msgMatch ? msgMatch.created_at : new Date(0).toISOString(),
          unread: msgMatch ? msgMatch.unread : 0,
          entity: l,
          type: 'lead'
        };
      }).filter(c => c.numero_telefono && c.numero_telefono.length > 5);

      // Build Clubes List
      const clubesList = (clubes || []).map(c => {
        const cNumNorm = c.telefono_contacto ? c.telefono_contacto.replace(/\D/g, '') : '';
        let msgMatch = null;
        let matchedPhone = c.telefono_contacto;
        for (const num in grouped) {
           const numNorm = num.replace(/\D/g, '');
           if (cNumNorm && numNorm && (cNumNorm.includes(numNorm) || numNorm.includes(cNumNorm))) {
              msgMatch = grouped[num];
              matchedPhone = num;
              break;
           }
        }
        
        return {
          numero_telefono: matchedPhone,
          lastMessage: msgMatch ? msgMatch.mensaje : '',
          lastMessageTime: msgMatch ? msgMatch.created_at : new Date(0).toISOString(),
          unread: msgMatch ? msgMatch.unread : 0,
          entity: c,
          type: 'club'
        };
      }).filter(c => c.numero_telefono && c.numero_telefono.length > 5);

      // Add orphaned chats
      const allKnownNorm = [...leadsList, ...clubesList].map(c => c.numero_telefono.replace(/\D/g, ''));
      const orphanedList = Object.keys(grouped).filter(num => {
        const numNorm = num.replace(/\D/g, '');
        return !allKnownNorm.some(k => k.includes(numNorm) || numNorm.includes(k));
      }).map(num => ({
        numero_telefono: num,
        lastMessage: grouped[num].mensaje,
        lastMessageTime: grouped[num].created_at,
        unread: grouped[num].unread,
        entity: null,
        type: 'orphaned'
      }));

      let chatList = [...leadsList, ...clubesList, ...orphanedList];

      // Sort by recent message first
      chatList = chatList.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

      // Check URL for phone param to auto-select
      const params = new URLSearchParams(window.location.search);
      let phoneParam = params.get('phone');
      
      if (phoneParam) {
        if (phoneParam.startsWith(' ')) {
          phoneParam = '+' + phoneParam.slice(1);
        }
        const pNum = phoneParam.replace(/\D/g, '');
        
        let existing = chatList.find(c => {
          const cNum = c.numero_telefono.replace(/\D/g, '');
          return cNum && pNum && (cNum.includes(pNum) || pNum.includes(cNum));
        });
        
        if (!existing) {
          existing = {
            numero_telefono: phoneParam,
            lastMessage: '',
            lastMessageTime: new Date().toISOString(),
            unread: 0,
            entity: { nombre: 'Prospecto' } as any,
            type: 'orphaned'
          };
          chatList = [existing, ...chatList];
        }
        
        if (existing.type === 'club') setActiveTab('clubes');
        else setActiveTab('leads');
        
        setActiveChat(existing);
        window.history.replaceState({}, '', window.location.pathname);
      }

      setChats(chatList);
    }
    
    setLoading(false);
  };

  const handleNewMessage = (msg: any) => {
    // Update active chat messages
    setMessages(prev => {
      if (activeChat && msg.numero_telefono === activeChat.numero_telefono) {
        if (!msg.es_saliente) markAsRead(msg.numero_telefono);
        return [...prev, msg];
      }
      return prev;
    });

    // Refresh chat list to bump the chat
    initChat();
  };

  const fetchMessages = async (numero: string) => {
    const { data } = await supabase
      .from('crm_whatsapp_messages')
      .select('*')
      .eq('numero_telefono', numero)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
    markAsRead(numero);
  };

  const markAsRead = async (numero: string) => {
    await supabase.from('crm_whatsapp_messages').update({ leido: true }).eq('numero_telefono', numero).eq('es_saliente', false);
    setChats(prev => prev.map(c => c.numero_telefono === numero ? { ...c, unread: 0 } : c));
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    setSending(true);
    try {
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
      
      setNewMessage('');
    } catch (error) {
      toast.error('No se pudo enviar el mensaje');
    }
    setSending(false);
  };

  const askCopilot = async () => {
    if (!activeChat || messages.length === 0) return;
    setLoadingAI(true);
    setAiSuggestion('');
    try {
      const history = messages.slice(-10);
      const res = await fetch('/api/admin/crm/ai-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          leadName: activeChat.entity ? activeChat.entity.nombre : 'Prospecto'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error AI');
      setAiSuggestion(data.reply);
    } catch (e) {
      toast.error('No se pudo generar la sugerencia IA');
    }
    setLoadingAI(false);
  };

  const filteredChats = chats.filter(c => {
    // Tab filter
    if (activeTab === 'clubes' && c.type !== 'club') return false;
    if (activeTab === 'leads' && c.type === 'club') return false; // Leads + Orphaned show in leads

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = c.entity && c.entity.nombre.toLowerCase().includes(term);
      const matchPhone = c.numero_telefono.includes(searchTerm);
      if (!matchName && !matchPhone) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex h-[calc(100vh-100px)] items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-lime-500" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-100px)] bg-slate-50 p-6 overflow-hidden">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex w-full max-w-6xl mx-auto overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-1/3 border-r border-slate-200 flex flex-col bg-white">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 mb-4">Chat CRM</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar contacto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
            </div>
            {/* TABS */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => setActiveTab('leads')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'leads' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Prospectos
              </button>
              <button 
                onClick={() => setActiveTab('clubes')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'clubes' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Academias
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 && (
              <div className="text-center p-6 text-slate-400 text-xs font-bold">
                No hay contactos disponibles
              </div>
            )}
            {filteredChats.map(chat => {
              const hasMessages = chat.lastMessageTime !== new Date(0).toISOString();
              return (
                <div 
                  key={chat.numero_telefono}
                  onClick={() => setActiveChat(chat)}
                  className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors flex items-start gap-3 ${activeChat?.numero_telefono === chat.numero_telefono ? 'bg-slate-50 border-l-4 border-l-lime-500' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${chat.type === 'club' ? 'bg-blue-100' : 'bg-lime-100'}`}>
                    {chat.type === 'club' ? <Building2 className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-lime-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-sm text-slate-900 truncate">{chat.entity ? chat.entity.nombre : chat.numero_telefono}</h3>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {hasMessages ? new Date(chat.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Nuevo'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{hasMessages ? chat.lastMessage : 'Iniciar conversación...'}</p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {chat.unread}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        {activeChat ? (
          <div className="w-2/3 flex flex-col bg-slate-50">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeChat.type === 'club' ? 'bg-blue-100' : 'bg-lime-100'}`}>
                  {activeChat.type === 'club' ? <Building2 className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-lime-600" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900">{activeChat.entity ? activeChat.entity.nombre : 'Prospecto Nuevo'}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Phone className="w-3 h-3" /> {activeChat.numero_telefono}
                  </div>
                </div>
              </div>
              {role === 'superadmin' && activeChat.type === 'orphaned' && (
                <button className="text-xs font-bold text-lime-600 bg-lime-50 px-3 py-1.5 rounded-lg hover:bg-lime-100 transition-colors">
                  Vincular Lead
                </button>
              )}
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
                <div key={msg.id} className={`flex ${msg.es_saliente ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.es_saliente ? 'bg-lime-500 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                    <div className={`text-[10px] mt-1 flex justify-end ${msg.es_saliente ? 'text-lime-100' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Copilot Box */}
            {(aiSuggestion || loadingAI) && (
              <div className="mx-4 mt-2 mb-0 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-900">Copiloto IA sugiere:</span>
                </div>
                {loadingAI ? (
                  <div className="flex items-center gap-2 text-indigo-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Analizando conversación...
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-indigo-800 whitespace-pre-wrap mb-3">{aiSuggestion}</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setNewMessage(aiSuggestion); setAiSuggestion(''); }}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition"
                      >
                        Usar esta respuesta
                      </button>
                      <button 
                        onClick={() => setAiSuggestion('')}
                        className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-lg font-medium border border-indigo-200 hover:bg-indigo-50 transition"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex justify-between mb-2">
                <button 
                  onClick={askCopilot}
                  disabled={loadingAI || messages.length === 0}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" /> ✨ Sugerir Respuesta IA
                </button>
              </div>
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="bg-lime-500 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-lime-600 transition-colors disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
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
