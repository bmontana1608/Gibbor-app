'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, CheckCheck, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

// ─── Mensajes por etapa del pipeline ────────────────────────────────────────
const GUIA_VENTAS: Record<string, { color: string; emoji: string; tip: string; mensajes: { titulo: string; texto: string }[] }> = {
  'Prospecto': {
    color: 'slate',
    emoji: '🔍',
    tip: 'Aún no has contactado a este lead. El objetivo es romper el hielo de forma natural, sin vender todavía.',
    mensajes: [
      {
        titulo: 'El enfoque del "Ego" + Problema (Recomendado)',
        texto: `¡Hola [Nombre]! 👋 Vi las fotos de [Nombre de su Academia] en redes, ¡qué buen trabajo están haciendo con los chicos! ⚽ Soy [Tu nombre]. Te escribo porque actualmente estoy trabajando con directores de academias en la zona ayudándoles a que dejen de perder dinero por mensualidades atrasadas. ¿Actualmente siguen llevando el control de pagos manualmente o ya usan algún sistema?`
      },
      {
        titulo: 'Apertura de Permiso',
        texto: `Hola [Nombre], ¡buenos días! 😊 Disculpa que te escriba directo a tu WhatsApp. Soy [Tu nombre] y ayudo a escuelas de fútbol a quitarse de encima el estrés de cuadrar cobros y asistencias en Excel o papel. Sé que debes estar a mil con los entrenamientos, ¿me das permiso de enviarte un audio de 1 minutito contándote cómo lo estamos resolviendo para otras academias?`
      },
      {
        titulo: 'Curiosidad por pares (FOMO)',
        texto: `Hola [Nombre]. Hablando con otros directores de clubes de la zona, me cuentan que a fin de mes pasan hasta 10 horas persiguiendo papás por WhatsApp para cobrar y cuadrando cuentas. Nosotros les ayudamos a automatizar eso para que el celular trabaje por ellos. ¿En tu caso también te toca hacer toda esa cobranza a mano?`
      }
    ]
  },
  'Primer contacto': {
    color: 'blue',
    emoji: '👋',
    tip: 'Ya hablaste con el lead. Ahora tu objetivo es entender su situación actual y despertar curiosidad, NO vender todavía.',
    mensajes: [
      {
        titulo: 'Preguntas de descubrimiento (Recomendado)',
        texto: `¡Genial poder hablar contigo! Para entender mejor si los podemos ayudar, cuéntame: ¿cómo manejan actualmente los pagos y la asistencia de los jugadores? ¿Siguen usando Excel, planillas de papel o WhatsApp? 🤔`
      },
      {
        titulo: 'Generar curiosidad',
        texto: `Justo ayer estaba hablando con otro director de academia que tardaba 3 horas cada fin de mes cuadrando cobros en Excel... ahora lo hace en 15 minutos desde el celular con nuestro sistema. ¿A ti también te toca hacer toda la revisión manualmente? 😅`
      },
      {
        titulo: 'Follow-up si no respondió',
        texto: `Hola [Nombre], ¿cómo estás? Solo quería retomar nuestra conversación 😊 Sé que el día a día de una academia es intenso. Si me das 5 minutos esta semana te muestro algo que creo que te va a quitar un gran peso administrativo de encima. ¿Qué día te queda bien?`
      }
    ]
  },
  'Seguimiento': {
    color: 'amber',
    emoji: '🔄',
    tip: 'El lead mostró interés pero no ha tomado acción. Tu objetivo es mantenerlo "tibio" y resolver sus dudas sin presionar.',
    mensajes: [
      {
        titulo: 'Compartir valor (Recomendado)',
        texto: `Hola [Nombre]! Te comparto algo que creo que te va a gustar 👇\n\nCon Master Club Manager (MCM), academias como la tuya pueden:\n✅ Automatizar el cobro de mensualidades\n✅ Registrar asistencia desde la cancha con el celular\n✅ Tener perfiles separados para directores, entrenadores y padres\n✅ Evaluar el rendimiento de cada jugador\n\n¿Cuál de esas cosas te generaría más alivio a ti hoy?`
      },
      {
        titulo: 'Caso de éxito (Social Proof)',
        texto: `[Nombre], te cuento algo: otra academia de la zona tenía exactamente el mismo reto que tú — llevar todo en grupos de WhatsApp y cuadernos. En su primer mes con MCM recuperaron el control total de su cartera de pagos y se ahorraron horas de trabajo administrativo. ¿Te gustaría ver cómo funciona el sistema por dentro?`
      },
      {
        titulo: 'Re-activar un lead frío',
        texto: `Hola [Nombre], buen día! Hace un tiempo hablamos y no quería que se me perdiera el contacto 😊 ¿Cómo van las cosas con la academia? ¿Siguen llevando la administración de manera manual o ya encontraron alguna solución tecnológica?`
      }
    ]
  },
  'Demo': {
    color: 'violet',
    emoji: '📺',
    tip: 'Ya agendaste o estás por hacer una demo. El objetivo es mostrar el software en acción y conectarlo con el dolor específico del lead.',
    mensajes: [
      {
        titulo: 'Confirmación de demo (Recomendado)',
        texto: `¡Perfecto [Nombre]! Quedamos entonces el [día] a las [hora] para la demostración 🙌\n\nVoy a mostrarte específicamente cómo funciona MCM para gestionar los pagos y la asistencia, y que veas lo fácil que es para los entrenadores y papás.\n\nTe llega el link por aquí mismo. ¿Alguna pregunta antes de la sesión?`
      },
      {
        titulo: 'Pre-demo (calentar el terreno)',
        texto: `[Nombre], antes de nuestra reunión de mañana, cuéntame: ¿cuántos jugadores tienen activos actualmente en el club? Y ¿cuál es el dolor de cabeza más grande que tienen hoy en la administración? Así llego a la demo con ejemplos que apliquen directamente a tu caso 💪`
      },
      {
        titulo: 'Post-demo (recoger feedback)',
        texto: `[Nombre], ¡gracias por tu tiempo hoy! 🙏 ¿Qué fue lo que más te llamó la atención de Master Club Manager? Y si hay algo que no quedó claro o quieres que profundice, con mucho gusto. ¿Ves cómo podría modernizar la gestión de tu academia?`
      }
    ]
  },
  'Negociación': {
    color: 'orange',
    emoji: '🤝',
    tip: 'El lead está casi listo. Aquí se maneja precio, condiciones y objeciones. Escucha más, habla menos. No des descuentos sin razón.',
    mensajes: [
      {
        titulo: 'Manejar objeción de precio (Recomendado)',
        texto: `Entiendo perfectamente [Nombre], el tema del precio siempre es importante 💯 Déjame preguntarte algo: si con MCM recuperas aunque sea 3 o 4 mensualidades que hoy se te escapan o se olvidan cobrar, ¿eso cubriría el costo de la plataforma? La mayoría de clubes lo ven como una inversión que se paga sola desde el primer mes.`
      },
      {
        titulo: 'Manejar objeción "lo pienso"',
        texto: `Claro, no hay afán [Nombre]! Solo me ayuda saber: ¿hay algo puntual que te genera duda sobre el sistema? A veces hay una pregunta detrás del "lo pienso" y prefiero resolvértela directamente antes de que pase tiempo 😊`
      },
      {
        titulo: 'Crear urgencia suave',
        texto: `[Nombre], te cuento que tenemos una promoción de arranque para clubes nuevos que se activan este mes — nosotros mismos nos encargamos de importar a tus jugadores y crear tu escuela en el sistema sin costo adicional. Si quieres aprovechar, sería esta semana. ¿Te interesa que avancemos?`
      },
      {
        titulo: 'Cierre directo',
        texto: `¡Perfecto [Nombre]! Entonces te confirmo: arrancamos con MCM y centralizamos toda tu operación deportiva. El próximo paso es activar tu cuenta y yo mismo te acompaño en la capacitación para que tu equipo quede listo. ¿Cuándo te queda bien que iniciemos?`
      }
    ]
  },
  'Cliente': {
    color: 'emerald',
    emoji: '🎉',
    tip: '¡Felicitaciones! Este lead se convirtió en cliente. Ahora tu objetivo es garantizar una experiencia de onboarding excelente para que renueve y te refiera.',
    mensajes: [
      {
        titulo: 'Bienvenida oficial (Recomendado)',
        texto: `¡Bienvenido a Master Club Manager, [Nombre]! 🎉🏆\n\nEs un placer tener a tu academia en nuestra familia. Estamos seguros de que el orden y el control lo vas a sentir desde la primera semana.\n\nEn los próximos días te estaré acompañando en el proceso de configuración y capacitación. Cualquier duda que tengas, escríbeme por aquí.\n\n¡Mucho éxito en la cancha! ⚽`
      },
      {
        titulo: 'Check-in semana 1',
        texto: `Hola [Nombre], ¿cómo va todo con la plataforma? ¿Tus entrenadores ya pudieron tomar la primera asistencia desde el celular? Si necesitan ayuda con algo o tienen alguna pregunta, aquí estoy 😊`
      },
      {
        titulo: 'Pedir referido',
        texto: `[Nombre], ¡qué bueno saber que todo va excelente con el sistema! Una cosita: ¿conoces a algún otro director de academia de fútbol que también necesite dejar el Excel y organizarse mejor? Si me das un contacto y se activa en MCM, hay un beneficio especial para ti también 🙌`
      }
    ]
  },
  'Perdido': {
    color: 'rose',
    emoji: '💔',
    tip: 'El lead no avanzó. No lo abandones del todo — un "no" hoy puede ser un "sí" en 3 meses. El objetivo es despedirse bien y dejar la puerta abierta.',
    mensajes: [
      {
        titulo: 'Cierre con puerta abierta (Recomendado)',
        texto: `Hola [Nombre], entiendo perfectamente que por ahora no sea el momento indicado 😊 No hay ningún problema. Si en algún momento deciden dejar atrás el Excel y los procesos manuales, aquí voy a estar.\n\n¡Mucho éxito con la academia, sigan haciendo ese gran trabajo con los chicos! ⚽`
      },
      {
        titulo: 'Entender el motivo (para aprender)',
        texto: `[Nombre], una última pregunta si me lo permites: ¿hubo algo específico que los llevó a no implementar MCM ahora mismo? ¿Fue el presupuesto, el momento, o algo de las funciones que no convenció? Tu respuesta me ayuda muchísimo a mejorar 🙏`
      },
      {
        titulo: 'Reactivación a futuro (para enviar en 90 días)',
        texto: `Hola [Nombre], ¡buen día! Han pasado unos meses desde que hablamos y quería retomar el contacto. Hemos lanzado nuevas funciones en la plataforma para entrenadores y padres. ¿El tema de organizar la administración sigue estando en la mira para ustedes? 😊`
      }
    ]
  }
};

const COLOR_MAP: Record<string, { bg: string; border: string; badge: string; btn: string }> = {
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700',   btn: 'bg-slate-800 hover:bg-slate-900' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-700',     btn: 'bg-blue-600 hover:bg-blue-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700',   btn: 'bg-amber-600 hover:bg-amber-700' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',badge: 'bg-violet-100 text-violet-700', btn: 'bg-violet-600 hover:bg-violet-700' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200',badge:'bg-emerald-100 text-emerald-700',btn:'bg-emerald-600 hover:bg-emerald-700' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',  badge: 'bg-rose-100 text-rose-700',     btn: 'bg-rose-600 hover:bg-rose-700' },
};

interface SalesGuideProps {
  etapaActual: string | null;       // estado actual del lead
  onUseMessage: (text: string) => void; // callback: insertar en el chat
}

export default function SalesGuide({ etapaActual, onUseMessage }: SalesGuideProps) {
  const [open, setOpen] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [selectedEtapa, setSelectedEtapa] = useState<string | null>(null);

  // Determinar qué etapa mostrar: la del lead o la seleccionada manualmente
  const etapaEfectiva = selectedEtapa || etapaActual || 'Prospecto';
  const guia = GUIA_VENTAS[etapaEfectiva];
  if (!guia) return null;

  const colors = COLOR_MAP[guia.color];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      toast.success('Mensaje copiado al portapapeles');
      setTimeout(() => setCopiedIdx(null), 2500);
    });
  };

  const handleUse = (text: string) => {
    onUseMessage(text);
    toast.success('Mensaje cargado en el chat ✍️');
  };

  return (
    <div className={`mx-4 mb-2 rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-sm font-bold text-slate-800">Guía de Ventas</span>
          {etapaActual && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
              {guia.emoji} {etapaEfectiva}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 max-h-[35vh] overflow-y-auto">
          {/* Selector de etapa manual */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(GUIA_VENTAS).map(([etapa, info]) => (
              <button
                key={etapa}
                onClick={() => setSelectedEtapa(etapa === etapaActual ? null : etapa)}
                className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${
                  etapaEfectiva === etapa
                    ? `${COLOR_MAP[info.color].badge} border-current`
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                }`}
              >
                {info.emoji} {etapa}
              </button>
            ))}
          </div>

          {/* Tip de la etapa */}
          <div className="flex items-start gap-2 bg-white/70 rounded-lg px-3 py-2 border border-current/10">
            <span className="text-base shrink-0">{guia.emoji}</span>
            <p className="text-xs text-slate-600 leading-relaxed">{guia.tip}</p>
          </div>

          {/* Mensajes listos */}
          <div className="space-y-2">
            {guia.mensajes.map((msg, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700">
                    {msg.titulo}
                    {msg.titulo.includes('Recomendado') && (
                      <span className="ml-1 text-[9px] bg-lime-100 text-lime-700 px-1.5 py-0.5 rounded-full">★ Top</span>
                    )}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCopy(msg.texto, idx)}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition"
                    >
                      {copiedIdx === idx
                        ? <><CheckCheck className="w-3 h-3 text-lime-600" /> Copiado</>
                        : <><Copy className="w-3 h-3" /> Copiar</>
                      }
                    </button>
                    <button
                      onClick={() => handleUse(msg.texto)}
                      className={`flex items-center gap-1 text-[10px] font-bold text-white px-2 py-1 rounded-lg transition ${colors.btn}`}
                    >
                      Usar →
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 px-3 py-2 leading-relaxed whitespace-pre-wrap">
                  {msg.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
