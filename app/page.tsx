'use client';

import { useState } from 'react';
import { createClient } from '../lib/supabase/client';
const supabase = createClient();
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      .select('rol')
      .eq('id', authData.user.id)
      .single();

    if (perfilError || !perfilData) {
      alert('Error: Este usuario no tiene un perfil asignado.');
      setLoading(false);
      return;
    }

    if (perfilData.rol === 'Director') {
      router.push('/director');
    } else if (perfilData.rol === 'Entrenador') {
      router.push('/entrenador');
    } else if (perfilData.rol === 'Futbolista') {
      router.push('/futbolista');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4">
      {/* Tarjeta de Login */}
      <div className="bg-zinc-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-800">
        
        {/* Logo de Gibbor */}
        <div className="flex justify-center mb-6">
          <img 
            src="https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png" 
            alt="Gibbor App Logo" 
            className="h-32 w-auto drop-shadow-md" 
          />
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2 tracking-tight">Gibbor App</h1>
        <p className="text-zinc-400 text-center mb-8">Ingresa a tu portal deportivo</p>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
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
              placeholder="••••••••"
              required
            />
          </div>
          
          {/* Botón de Ingresar Naranja */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-lg shadow-orange-900/50 disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

      </div>
    </div>
  );
}