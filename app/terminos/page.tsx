import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-20 px-6 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
        <Link href="/" className="inline-flex items-center gap-2 text-green-600 font-bold hover:text-green-700 transition-colors mb-8">
          <ArrowLeft className="w-5 h-5" /> Volver al inicio
        </Link>
        
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Términos de Servicio</h1>
            <p className="text-slate-500 font-medium">Última actualización: Junio de 2026</p>
          </div>
        </div>

        <div className="prose prose-slate prose-blue max-w-none">
          <h3>1. Aceptación de los Términos</h3>
          <p>
            Al acceder o utilizar la plataforma Master Club Manager (MCM), usted acepta estar sujeto a estos Términos de Servicio y a todas las leyes y regulaciones aplicables. Si no está de acuerdo con alguno de estos términos, tiene prohibido usar o acceder a esta plataforma.
          </p>

          <h3>2. Descripción del Servicio</h3>
          <p>
            MCM es un software como servicio (SaaS) diseñado para facilitar la gestión deportiva, financiera y administrativa de academias y clubes de fútbol. El servicio se proporciona "tal cual" y "según disponibilidad".
          </p>

          <h3>3. Cuentas de Usuario</h3>
          <p>
            Usted es responsable de salvaguardar la contraseña que utiliza para acceder al servicio y de cualquier actividad o acción bajo su contraseña, ya sea que su contraseña sea con nuestro servicio o con un servicio de terceros. MCM no será responsable por ninguna pérdida o daño derivado de su incumplimiento de los requisitos de seguridad.
          </p>

          <h3>4. Suscripciones y Pagos</h3>
          <ul>
            <li>Los clubes están sujetos al pago de una suscripción recurrente (mensual o anual) según el plan seleccionado y el volumen de jugadores activos.</li>
            <li>La falta de pago resultará en la suspensión temporal del servicio para el club y todos sus integrantes (entrenadores y jugadores) hasta que se regularice la cuenta.</li>
            <li>No se realizan reembolsos por periodos de facturación parciales no utilizados.</li>
          </ul>

          <h3>5. Propiedad Intelectual</h3>
          <p>
            La plataforma MCM, su código fuente, diseño, logotipos y todo el material original proporcionado por la plataforma son propiedad exclusiva de Master Club Manager y están protegidos por las leyes de propiedad intelectual y derechos de autor.
          </p>

          <h3>6. Limitación de Responsabilidad</h3>
          <p>
            En ningún caso MCM o sus proveedores serán responsables de ningún daño (incluyendo, entre otros, daños por pérdida de datos o beneficios, o debido a la interrupción del negocio) que surjan del uso o la incapacidad de usar los materiales en la plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}
