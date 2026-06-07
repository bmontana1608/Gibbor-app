// Logo oficial de Master Club Manager en SVG puro (fondo transparente)
export default function MCMLogo({ className = '', width = 220, height = 60 }: { className?: string, width?: number, height?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 280 80"
      width={width}
      height={height}
      className={className}
      aria-label="Master Club Manager"
    >
      {/* ─── ESCUDO ─── */}
      <g transform="translate(4, 4)">
        {/* Sombra sutil del escudo */}
        <path
          d="M32,2 L56,10 L56,36 C56,52 32,64 32,64 C32,64 8,52 8,36 L8,10 Z"
          fill="rgba(0,0,0,0.2)"
          transform="translate(1,2)"
        />
        {/* Cuerpo del escudo — lime green */}
        <path
          d="M32,2 L56,10 L56,36 C56,52 32,64 32,64 C32,64 8,52 8,36 L8,10 Z"
          fill="#84cc16"
        />
        {/* Borde interior blanco */}
        <path
          d="M32,6 L52,13 L52,36 C52,49 32,60 32,60 C32,60 12,49 12,36 L12,13 Z"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.6"
        />
        {/* Parte inferior del escudo (cancha) — verde oscuro */}
        <path
          d="M12,40 L12,36 L52,36 L52,40 C48,52 38,58 32,60 C26,58 16,52 12,40 Z"
          fill="#166534"
        />
        {/* Línea de cancha */}
        <line x1="32" y1="36" x2="32" y2="60" stroke="white" strokeWidth="1" opacity="0.4" />
        <circle cx="32" cy="36" r="5" fill="none" stroke="white" strokeWidth="1" opacity="0.4" />

        {/* Texto MCM dentro del escudo */}
        <text
          x="32"
          y="34"
          textAnchor="middle"
          fontFamily="'Arial Black', 'Impact', sans-serif"
          fontWeight="900"
          fontSize="13"
          fill="white"
          letterSpacing="0.5"
        >
          MCM
        </text>

        {/* Balón de fútbol encima del escudo */}
        <circle cx="32" cy="4" r="7" fill="white" />
        {/* Pentagono central del balón */}
        <polygon points="32,1 34,3 33,5.5 30,5.5 29,3" fill="#1a1a1a" />
        {/* Líneas del balón */}
        <line x1="32" y1="1" x2="32" y2="-3" stroke="#1a1a1a" strokeWidth="0.7" />
        <line x1="34" y1="3" x2="38" y2="2" stroke="#1a1a1a" strokeWidth="0.7" />
        <line x1="33" y1="5.5" x2="36" y2="8" stroke="#1a1a1a" strokeWidth="0.7" />
        <line x1="30" y1="5.5" x2="27" y2="8" stroke="#1a1a1a" strokeWidth="0.7" />
        <line x1="29" y1="3" x2="25" y2="2" stroke="#1a1a1a" strokeWidth="0.7" />
      </g>

      {/* ─── TEXTO A LA DERECHA ─── */}
      {/* Línea 1: "Master" */}
      <text
        x="72"
        y="35"
        fontFamily="'Arial Black', 'Impact', 'Helvetica Neue', sans-serif"
        fontWeight="900"
        fontSize="24"
        fill="white"
        letterSpacing="-0.5"
      >
        Master
      </text>
      {/* Línea 2: "Club" verde + "Manager" blanco */}
      <text
        x="72"
        y="58"
        fontFamily="'Arial Black', 'Impact', 'Helvetica Neue', sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="#84cc16"
        letterSpacing="-0.5"
      >
        Club
      </text>
      <text
        x="123"
        y="58"
        fontFamily="'Arial Black', 'Impact', 'Helvetica Neue', sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="white"
        letterSpacing="-0.5"
      >
        Manager
      </text>
    </svg>
  );
}
