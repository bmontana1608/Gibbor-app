'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
  tenant: {
    slug?: string;
    id?: string;
    config: {
      nombre: string;
      logo: string;
      color: string;
    }
  }
}

export default function LoginForm({ tenant }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionCargada, setSessionCargada] = useState(false);

  // EFECTO DE PERSISTENCIA: Si ya hay sesión VÁLIDA en el navegador, brincar el login
  useEffect(() => {
    let mounted = true;
    async function chequearSession() {
      let debeRedirigir = false;
      try {
        // getUser() valida contra el servidor (no usa caché local)
        // Evita loops infinitos con tokens expirados
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          // No hay sesión válida → mostrar formulario
          return;
        }

        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol, club_id, clubes(slug)')
          .eq('id', user.id)
          .single();

        if (perfil) {
          const clubSlug = (perfil.clubes as any)?.slug;
          const rol = perfil.rol?.toLowerCase();
          
          if (perfil.rol === 'SuperAdmin') {
            debeRedirigir = true;
            window.location.href = tenant?.slug && tenant.slug !== 'master' ? `/director` : '/admin';
            return;
          } else if (clubSlug) {
            debeRedirigir = true;
            const destino = `/${clubSlug}/${rol === 'director' ? 'director' : rol === 'entrenador' ? 'entrenador' : 'futbolista'}`;
            window.location.href = destino;
            return;
          }
        }
      } catch (error) {
        console.warn("Error en chequearSession, mostrando formulario:", error);
      }

      if (!debeRedirigir && mounted) {
        setSessionCargada(true);
      }
    }
    chequearSession();
    return () => { mounted = false; };
  }, []);

  if (!sessionCargada) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      alert('Error: Correo o contraseña incorrectos.');
      setLoading(false);
      return;
    }

    const { data: perfilData, error: perfilError } = await supabase
      .from('perfiles')
      .select('rol, club_id, clubes(slug)')
      .eq('id', authData.user.id)
      .single();

    if (perfilError || !perfilData) {
      alert('Error: Este usuario no tiene un perfil asignado.');
      setLoading(false);
      return;
    }

    const clubSlug = (perfilData.clubes as any)?.slug;
    const rol = perfilData.rol?.toLowerCase();

    if (perfilData.rol === 'SuperAdmin') {
      if (tenant?.slug && tenant.slug !== 'master') {
        router.push(`/director`);
      } else {
        router.push('/admin');
      }
    } else if (clubSlug) {
      // Redirección dinámica basada en Club y Rol
      const destino = `/${clubSlug}/${rol === 'director' ? 'director' : rol === 'entrenador' ? 'entrenador' : 'futbolista'}`;
      router.push(destino);
    } else {
      // Fallback si no tiene club asignado (pero no es SuperAdmin)
      router.push('/' + (rol || ''));
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4">
      <div className="bg-zinc-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-800">
        
        <div className="flex justify-center mb-6">
          <img 
            src={tenant.config.logo} 
            alt="Club Logo" 
            className="h-32 w-auto drop-shadow-md" 
          />
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2 tracking-tight">{tenant.config.nombre}</h1>
        <p className="text-zinc-400 text-center mb-8">Ingresa a tu portal deportivo</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              style={{ '--tw-ring-color': tenant.config.color } as any}
              placeholder="ejemplo@correo.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              style={{ '--tw-ring-color': tenant.config.color } as any}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-lg disabled:opacity-50"
            style={{ backgroundColor: tenant.config.color }}
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="#" className="text-sm hover:opacity-80 transition-opacity" style={{ color: tenant.config.color }}>
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>
    </div>
  );
}
