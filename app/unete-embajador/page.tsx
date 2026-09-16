import MCMLogo from '@/components/MCMLogo';
import { Shield, Sparkles, Building2, User, Phone, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function UneteEmbajadorPage({ searchParams }: any) {
  const { success, error } = await searchParams;

  return (
    <div className="min-h-screen bg-[#0F172A] flex text-slate-300 font-sans">
      
      {/* ── SECCIÓN IZQUIERDA: INFORMACIÓN ────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #020617 0%, #064e3b 100%)' }}>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-green-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <MCMLogo width={180} height={48} />
          
          <div className="mt-20">
            <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-black px-3 py-1.5 rounded-full mb-6 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> Ecosistema MCM
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6">
              Gana dinero recomendando Master Club Manager
            </h1>
            <p className="text-lg text-slate-300 mb-10 max-w-md">
              Únete a nuestra red de Embajadores Oficiales. Si eres proveedor de uniformes, organizador de torneos o entrenador, puedes generar ingresos recurrentes digitalizando clubes de fútbol.
            </p>
            
            <div className="space-y-6">
              {[
                { title: 'Comisiones Altas', desc: 'Gana el 100% del primer mes y un 10% de comisión recurrente mes a mes por cada cliente activo.' },
                { title: 'Directorio Comercial', desc: 'Los Embajadores Destacados aparecen en el directorio interno de MCM visible para todos los clubes.' },
                { title: 'Código y QR Único', desc: 'Te entregamos herramientas tecnológicas para que referir sea tan fácil como compartir un enlace.' }
              ].map((b, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{b.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-green-500 font-medium">
          © {new Date().getFullYear()} Master Club Manager.
        </div>
      </div>

      {/* ── SECCIÓN DERECHA: FORMULARIO ───────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24 relative overflow-y-auto">
        <Link href="/" className="absolute top-8 left-6 lg:left-12 flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>

        <div className="max-w-md w-full mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-3">Postúlate como Embajador</h2>
            <p className="text-slate-400 text-sm">Completa tus datos y nuestro equipo evaluará tu solicitud para activar tu código de referido.</p>
          </div>

          <form action="/api/embajadores/registro" method="POST" className="space-y-5">
            {/* TIPO DE EMBAJADOR */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                ¿A qué te dedicas? <span className="text-green-500">*</span>
              </label>
              <select name="tipo" required className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors appearance-none font-medium">
                <option value="">Selecciona tu perfil...</option>
                <option value="Proveedor">Proveedor (Uniformes, Balones, etc.)</option>
                <option value="Organizador">Organizador de Torneos</option>
                <option value="Entrenador">Entrenador independiente</option>
                <option value="Escuela Aliada">Director de Escuela Aliada</option>
                <option value="Vendedor Independiente">Vendedor Independiente</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* NOMBRE */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Nombre Completo <span className="text-green-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" name="nombre_completo" required className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors font-medium placeholder-slate-600" placeholder="Ej. Juan Pérez" />
              </div>
            </div>

            {/* EMPRESA */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Nombre de Empresa / Marca <span className="text-slate-500 font-normal lowercase">(Opcional)</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" name="empresa" className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors font-medium placeholder-slate-600" placeholder="Ej. Uniformes Golazo" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* CORREO */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Correo Electrónico <span className="text-green-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input type="email" name="email" required className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors font-medium placeholder-slate-600" placeholder="tu@correo.com" />
                </div>
              </div>

              {/* TELÉFONO */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  WhatsApp <span className="text-green-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input type="tel" name="telefono" required className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors font-medium placeholder-slate-600" placeholder="Ej. 3001234567" />
                </div>
              </div>
            </div>

            {/* CIUDAD */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Ciudad / País <span className="text-green-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" name="ciudad" required className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors font-medium placeholder-slate-600" placeholder="Ej. Bogotá, Colombia" />
              </div>
            </div>

            <button type="submit" className="w-full bg-green-500 hover:bg-green-400 text-slate-900 py-4 rounded-xl font-black text-lg transition-all shadow-lg shadow-green-500/20 mt-4">
              Enviar Postulación
            </button>
            {success && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 text-sm text-center font-bold">
                ¡Tu postulación ha sido enviada con éxito! Nuestro equipo la evaluará pronto.
              </div>
            )}
            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-bold">
                Ocurrió un error al enviar tu postulación. Intenta de nuevo.
              </div>
            )}
          </form>
        </div>
      </div>

    </div>
  );
}
