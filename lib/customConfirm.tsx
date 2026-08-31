'use client';

import { createRoot } from 'react-dom/client';
import { AlertTriangle } from 'lucide-react';

export const customConfirm = (message: string, title: string = 'Confirmar Acción'): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = () => {
      root.unmount();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    root.render(
      <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border-8 border-white shadow-sm">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">{title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              {message}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row bg-slate-50 p-4 gap-3 border-t border-slate-100">
            <button
              onClick={handleCancel}
              className="flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-rose-500 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
            >
              Sí, proceder
            </button>
          </div>
        </div>
      </div>
    );
  });
};
