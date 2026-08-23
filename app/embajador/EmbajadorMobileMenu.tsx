'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import SidebarNav from './SidebarNav';

export default function EmbajadorMobileMenu({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-2 text-slate-400 hover:text-white">
        <Menu className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex flex-col w-64 max-w-sm bg-slate-900 h-full border-r border-slate-800 p-4 shadow-xl">
            <button 
              onClick={() => setOpen(false)} 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="mt-8">
              <span className="text-xs font-black uppercase tracking-widest text-green-500 mb-4 block px-4">
                Menú
              </span>
              <div onClick={() => setOpen(false)}>
                <SidebarNav isSuperAdmin={isSuperAdmin} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
