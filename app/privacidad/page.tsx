import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-20 px-6 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
        <Link href="/" className="inline-flex items-center gap-2 text-green-600 font-bold hover:text-green-700 transition-colors mb-8">
          <ArrowLeft className="w-5 h-5" /> Volver al inicio
        </Link>
        
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Política de Privacidad</h1>
            <p className="text-slate-500 font-medium">Última actualización: Junio de 2026</p>
          </div>
        </div>

        <div className="prose prose-slate prose-green max-w-none">
          <h3>1. Información que recopilamos</h3>
          <p>
            Master Club Manager (MCM) recopila información personal como nombres, correos electrónicos, números de teléfono y datos relacionados con la gestión de clubes deportivos, entrenadores y jugadores con el propósito de brindar nuestro servicio SaaS.
          </p>

          <h3>2. Uso de la información</h3>
          <p>
            La información recopilada se utiliza exclusivamente para:
          </p>
          <ul>
            <li>Proveer, operar y mantener nuestra plataforma.</li>
            <li>Mejorar, personalizar y expandir nuestros servicios.</li>
            <li>Comprender y analizar cómo se utiliza nuestra plataforma.</li>
            <li>Desarrollar nuevos productos, servicios, características y funcionalidades.</li>
            <li>Comunicarnos con los clubes y usuarios para servicio al cliente, actualizaciones y fines promocionales autorizados.</li>
          </ul>

          <h3>3. Protección de Datos</h3>
          <p>
            Mantenemos rigurosas medidas de seguridad técnicas y organizativas (como cifrado de bases de datos y control de acceso basado en roles) para proteger tu información personal contra accesos no autorizados, alteraciones, divulgación o destrucción.
          </p>

          <h3>4. Compartir información con terceros</h3>
          <p>
            No vendemos, alquilamos ni compartimos información personal de nuestros usuarios con terceros, excepto cuando sea estrictamente necesario para proveer el servicio (por ejemplo, pasarelas de pago como Mercado Pago) o cuando la ley lo exija.
          </p>

          <h3>5. Derechos del usuario</h3>
          <p>
            Los directores de club, entrenadores y jugadores tienen el derecho de acceder, corregir, actualizar o solicitar la eliminación de sus datos personales en cualquier momento a través de los canales de soporte de MCM.
          </p>
        </div>
      </div>
    </div>
  );
}
