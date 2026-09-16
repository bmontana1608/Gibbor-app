'use client';
import { Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className={`w-full font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
        copied ? 'bg-green-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
      }`}
    >
      {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? '¡Copiado!' : 'Copiar Link'}
    </button>
  );
}
