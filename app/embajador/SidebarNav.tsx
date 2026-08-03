'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { PieChart, Target, Wallet, Users, MessageSquare, ShieldCheck } from 'lucide-react';

export default function SidebarNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const suffix = isSuperAdmin && id ? `?id=${id}` : '';

  const menu = [
    { name: 'Dashboard', path: '/embajador', icon: <PieChart className="w-5 h-5" /> },
    { name: 'Prospección', path: '/embajador/leads', icon: <Target className="w-5 h-5" /> },
    { name: 'Comisiones', path: '/embajador/comisiones', icon: <Wallet className="w-5 h-5" /> },
    { name: 'Mis Referidos', path: '/embajador/clubes', icon: <Users className="w-5 h-5" /> },
    { name: 'Chat CRM', path: '/embajador/chat', icon: <MessageSquare className="w-5 h-5" /> },
  ];

  return (
    <nav className="flex-1 p-4 space-y-2">
      {menu.map((item) => {
        const activo = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={`${item.path}${suffix}`}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activo
                ? 'bg-green-500/10 text-green-400'
                : 'hover:bg-slate-800 hover:text-white text-slate-400'
            }`}
          >
            {item.icon} {item.name}
          </Link>
        );
      })}

      {isSuperAdmin && (
        <Link
          href="/admin"
          className="flex items-center gap-3 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors mt-6"
        >
          <ShieldCheck className="w-5 h-5" /> Volver Panel Admin
        </Link>
      )}
    </nav>
  );
}
