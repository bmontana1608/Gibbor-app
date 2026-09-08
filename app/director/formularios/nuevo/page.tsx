'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import FormBuilder, { FormField } from '@/components/formularios/FormBuilder';
import { useTenant } from '@/lib/hooks/useTenant';

export default function NuevoFormularioPage() {
  const router = useRouter();
  const { route, slug: tenantSlug } = useTenant();
  const [tenant, setTenant] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function getTenantData() {
      if (!tenantSlug) return;
      try {
        const res = await fetch('/api/tenant?slug=' + tenantSlug);
        const data = await res.json();
        setTenant(data);
      } catch (err) {
        console.error('Error cargando tenant:', err);
      }
    }
    getTenantData();
  }, [tenantSlug]);

  const handleGuardar = async (formData: {
    titulo: string;
    descripcion: string;
    estado: string;
    campos: FormField[];
    logo_url?: string;
  }) => {
    if (!tenant?.id) {
      toast.error('No se pudo identificar la academia.');
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch('/api/formularios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: tenant.id,
          ...formData
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar formulario');

      toast.success('¡Formulario creado con éxito!');
      router.push(route(`/director/formularios/${data.formulario.id}`));
    } catch (err: any) {
      toast.error(err.message || 'Error al crear formulario');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      <FormBuilder
        clubId={tenant?.id || ''}
        onSave={handleGuardar}
        saving={guardando}
        onBack={() => router.push(route('/director/formularios'))}
      />
    </div>
  );
}
