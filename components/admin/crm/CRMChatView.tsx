'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, Send, User, MessageSquare, Clock, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface CRMChatViewProps {
  role: 'superadmin' | 'embajador';
}

export default function CRMChatView({ role }: CRMChatViewProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
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

    // Fetch leads based on role
    let leadsQuery = supabase.from('atlas_academias').select('id, nombre, telefono, embajador_id');
    if (role === 'embajador' && user) {
      leadsQuery = leadsQuery.eq('embajador_id', user.id);
    }
    const { data: leads } = await leadsQuery;

    // Fetch distinct numbers from messages to show in the sidebar
    // Supabase RPC or just fetching all and grouping for MVP
    const { data: allMsgs, error } = await supabase
      .from('crm_whatsapp_messages')
      .select('numero_telefono, mensaje, created_at, leido, es_saliente')
      .order('created_at', { ascending: false });

    if (error && error.code !== '42P01') {
      toast.error('Error al cargar chats');
    }

    if (allMsgs) {
      // Group by number
      const grouped = allMsgs.reduce((acc: any, msg: any) => {
        if (!acc[msg.numero_telefono]) {
          acc[msg.numero_telefono] = { ...msg, unread: 0 };
        }
        if (!msg.es_saliente && !msg.leido) {
          acc[msg.numero_telefono].unread += 1;
        }
        return acc;
      }, {});

      let chatList = Object.keys(grouped).map(num => {
        const lead = leads?.find(l => l.telefono?.includes(num) || num.includes(l.telefono));
        return {
          numero_telefono: num,
          lastMessage: grouped[num].mensaje,
          lastMessageTime: grouped[num].created_at,
          unread: grouped[num].unread,
          lead: lead || null
        };
      });

      // Filter for embajador
      if (role === 'embajador') {
        chatList = chatList.filter(c => c.lead);
      }

      setChats(chatList.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()));
    }
    
    setLoading(false);
  };

  const handleNewMessage = (msg: any) => {
    // Update active chat messages
    setMessages(prev => {
      if (activeChat && msg.numero_telefono === activeChat.numero_telefono) {
        // Mark as read if active
        if (!msg.es_saliente) markAsRead(msg.numero_telefono);
        return [...prev, msg];
      }
      return prev;
    });

    // Refresh chat list (simplified)
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
          lead_id: activeChat.lead?.id || null
        })
      });

      if (!res.ok) throw new Error('Error al enviar');
      
      setNewMessage('');
    } catch (error) {
      toast.error('No se pudo enviar el mensaje');
    }
    setSending(false);
  };

  const filteredChats = chats.filter(c => 
    c.numero_telefono.includes(searchTerm) || 
    (c.lead && c.lead.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar prospecto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map(chat => (
              <div 
                key={chat.numero_telefono}
                onClick={() => setActiveChat(chat)}
                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors flex items-start gap-3 ${activeChat?.numero_telefono === chat.numero_telefono ? 'bg-slate-50 border-l-4 border-l-lime-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="w-10 h-10 rounded-full bg-lime-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-lime-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm text-slate-900 truncate">{chat.lead ? chat.lead.nombre : chat.numero_telefono}</h3>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(chat.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
                </div>
                {chat.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {chat.unread}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        {activeChat ? (
          <div className="w-2/3 flex flex-col bg-slate-50">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-lime-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-lime-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">{activeChat.lead ? activeChat.lead.nombre : 'Prospecto Nuevo'}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Phone className="w-3 h-3" /> {activeChat.numero_telefono}
                  </div>
                </div>
              </div>
              {role === 'superadmin' && !activeChat.lead && (
                <button className="text-xs font-bold text-lime-600 bg-lime-50 px-3 py-1.5 rounded-lg hover:bg-lime-100 transition-colors">
                  Vincular Lead
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-200">
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
