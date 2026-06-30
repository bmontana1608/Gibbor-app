import Image from 'next/image';

export default function MCMLogo({ className = '', width = 220, height = 60 }: { className?: string, width?: number, height?: number }) {
  return (
    <div className={`relative flex items-center ${className}`} style={{ width, height }}>
      <Image
        src="/mcm-logo.png"
        alt="Master Club Manager Logo"
        fill
        className="object-contain object-left"
        priority
      />
    </div>
  );
}
