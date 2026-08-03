'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Map, Upload, KanbanSquare, PieChart, Search, Filter, 
  MapPin, Phone, Globe, Star, ArrowRight, Loader2, Target, Plus, Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Vistas Internas del CRM
import AtlasLeadsView from './crm/AtlasLeadsView';
import ImportadorView from './crm/ImportadorView';
import PipelineView from './crm/PipelineView';
import AnalyticsView from './crm/AnalyticsView';

// Reutilizamos el componente existente de Embajadores (lo importaremos dinámicamente o lo pasaremos)
import EmbajadoresAdminView from './EmbajadoresAdminView';
import ClientesView from './crm/ClientesView'; // Crearemos este

type TabType = 'leads' | 'pipeline' | 'clientes' | 'embajadores' | 'analytics' | 'importar';

export default function CRMAdminView() {
  const [activeTab, setActiveTab] = useState<TabType>('leads');

  return (
    <div className="space-y-6">
      {/* Header del CRM */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            CRM <span className="text-sm font-bold bg-lime-100 text-lime-700 px-3 py-1 rounded-full uppercase tracking-widest">Master</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Gestión integral de prospección, embudo de ventas y red comercial.
          </p>
        </div>
      </div>

      {/* Navegación Interna */}
      <div className="flex overflow-x-auto hide-scrollbar bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
        <TabButton id="leads" label="Leads (Atlas)" icon={<Map size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton id="pipeline" label="Pipeline" icon={<KanbanSquare size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton id="clientes" label="Clientes" icon={<Users size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton id="embajadores" label="Embajadores" icon={<Target size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="w-px bg-slate-200 mx-2 my-2"></div>
        <TabButton id="analytics" label="Analytics" icon={<PieChart size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton id="importar" label="Importar .xlsx" icon={<Upload size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Contenedor de Vistas */}
      <div className="bg-slate-50 rounded-3xl min-h-[600px]">
        {activeTab === 'leads' && <AtlasLeadsView />}
        {activeTab === 'pipeline' && <PipelineView />}
        {activeTab === 'clientes' && <ClientesView />}
        {activeTab === 'embajadores' && <div className="p-6 bg-white rounded-3xl"><EmbajadoresAdminView /></div>}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'importar' && <ImportadorView onImportComplete={() => setActiveTab('leads')} />}
      </div>
    </div>
  );
}

function TabButton({ id, label, icon, activeTab, setActiveTab }: { id: TabType, label: string, icon: React.ReactNode, activeTab: TabType, setActiveTab: (t: TabType) => void }) {
  const active = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
        active 
          ? 'bg-slate-900 text-white shadow-md' 
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
