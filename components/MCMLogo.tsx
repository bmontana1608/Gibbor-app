import Image from 'next/image';

export default function MCMLogo({ className = '', width = 220, height = 60, variant = 'light' }: { className?: string, width?: number, height?: number, variant?: 'light' | 'dark' }) {
  // 'light' -> para fondos oscuros (texto blanco) [mcm-logo.png]
  // 'dark' -> para fondos claros (texto negro) [mcm-logo-black.png]
  const src = variant === 'dark' ? '/mcm-logo-black.png' : '/mcm-logo.png';

  return (
    <div className={`relative flex items-center ${className}`} style={{ width, height }}>
      <Image
        src={src}
        alt="Master Club Manager Logo"
        fill
        className="object-contain object-left"
        priority
      />
    </div>
  );
}
