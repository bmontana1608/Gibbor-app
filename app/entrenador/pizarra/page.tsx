'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Trash2, Save, Eraser, Pen, Circle, 
  Download, RefreshCw, Layers, Users as UsersIcon, X, Undo2
} from 'lucide-react';
import { toast } from 'sonner';

export default function PizarraTactica() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasFondoRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [isPortrait, setIsPortrait] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [fullScreen, setFullScreen] = useState(false);
  const [showFloatingTools, setShowFloatingTools] = useState(false);
  const [floatingPos, setFloatingPos] = useState({ x: window.innerWidth - 80, y: 20 });
  const [isDraggingTools, setIsDraggingTools] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [jugadores, setJugadores] = useState<any[]>([]);

  useEffect(() => {
    inicializarPizzara();
  }, [fullScreen]);

  useEffect(() => {
    inicializarPizzara();
    
    // Check orientation
    const checkOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth);
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    
    const initialPlayers = [];
    for(let i=1; i<=11; i++) initialPlayers.push({ id: `R-${i}`, x: 50, y: 50 + (i*40), color: '#ef4444', label: `${i}` });
    for(let i=1; i<=11; i++) initialPlayers.push({ id: `B-${i}`, x: 120, y: 50 + (i*40), color: '#3b82f6', label: `${i}` });
    setJugadores(initialPlayers);
  }, []);

  const inicializarPizzara = () => {
    const canvas = canvasRef.current;
    const canvasFondo = canvasFondoRef.current;
    if (!canvas || !canvasFondo) return;
    
    // Ajustar tamaños
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    canvasFondo.width = canvasFondo.offsetWidth;
    canvasFondo.height = canvasFondo.offsetHeight;
    
    const ctxFondo = canvasFondo.getContext('2d');
    if (ctxFondo) dibujarCampo(ctxFondo, canvasFondo.width, canvasFondo.height);
  };

  const dibujarCampo = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(2, w / 500);
    
    const margin = w * 0.03;
    const fw = w - margin * 2;
    const fh = h - margin * 2;
    
    // Rectángulo principal
    ctx.strokeRect(margin, margin, fw, fh);
    
    // Línea media
    ctx.beginPath();
    ctx.moveTo(w / 2, margin);
    ctx.lineTo(w / 2, h - margin);
    ctx.stroke();
    
    // Círculo central
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, fh * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    
    // Punto central
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
    
    // Áreas Izquierda
    const agW = fw * 0.16;
    const agH = fh * 0.60;
    const apW = fw * 0.06;
    const apH = fh * 0.30;
    
    ctx.strokeRect(margin, h/2 - agH/2, agW, agH);
    ctx.strokeRect(margin, h/2 - apH/2, apW, apH);
    
    // Áreas Derecha
    ctx.strokeRect(w - margin - agW, h/2 - agH/2, agW, agH);
    ctx.strokeRect(w - margin - apW, h/2 - apH/2, apW, apH);

    // Semicírculos de las áreas
    ctx.beginPath();
    ctx.arc(margin + agW, h / 2, fh * 0.1, -Math.PI/2, Math.PI/2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(w - margin - agW, h / 2, fh * 0.1, Math.PI/2, -Math.PI/2);
    ctx.stroke();
  };

  const obtenerCoordenadas = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    // Coordenadas relativas al elemento visible, ajustadas al tamaño interno del canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let rx = (clientX - rect.left) * scaleX;
    let ry = (clientY - rect.top) * scaleY;

    if (isPortrait && window.innerWidth < 1024) {
        // Si hay rotación CSS de 90deg:
        // El eje X del mouse ahora es el eje Y negativo de la cancha ?
        // Depende de cómo aplique el transform origin.
        // Por defecto es center. 
        // Es más seguro usar OFFSET relativo al elemento si no estuviera rotado.
        // Pero como está rotado, invertimos:
        const xPerc = rx / rect.width;
        const yPerc = ry / rect.height;
        
        // Mapeo 90deg CW: 
        // originalX = yPerc * canvas.width
        // originalY = (1 - xPerc) * canvas.height
        return {
            x: yPerc * canvas.width,
            y: (1 - xPerc) * canvas.height
        };
    }
    
    return { x: rx, y: ry };
  };

  const startDrawing = (e: any) => {
    const coords = obtenerCoordenadas(e);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // Guardar estado previo para UNDO
    const canvas = canvasRef.current;
    if (canvas) {
        setHistory(prev => [...prev.slice(-20), canvas.toDataURL()]);
    }

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    
    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 30;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const coords = obtenerCoordenadas(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.lineTo(coords.x, coords.y); ctx.stroke(); }
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    if (!window.confirm("¿Limpiar todos los dibujos? (La cancha se mantendrá)")) return;
    const canvas = canvasRef.current;
    if (canvas) {
        setHistory(prev => [...prev.slice(-20), canvas.toDataURL()]);
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    const img = new Image();
    img.src = lastState;
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
  };

  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const startDragging = (id: string) => () => setDraggedPlayerId(id);

  const onDragMove = (e: any) => {
    if (!draggedPlayerId) return;
    const coords = obtenerCoordenadas(e);
    setJugadores(prev => prev.map(p => p.id === draggedPlayerId ? { ...p, x: coords.x, y: coords.y } : p));
  };

  const stopDragging = () => setDraggedPlayerId(null);

  const guardarCaptura = async () => {
    const canvas = canvasRef.current;
    const canvasFondo = canvasFondoRef.current;
    if (!canvas || !canvasFondo) return;
    
    const toastId = toast.loading("Generando imagen final...");
    
    // Crear un canvas temporal para combinar fondo verde, líneas y dibujos
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const fctx = finalCanvas.getContext('2d');
    if (fctx) {
        // 1. Fondo verde
        fctx.fillStyle = '#10b981';
        fctx.fillRect(0,0, finalCanvas.width, finalCanvas.height);
        // 2. Dibujar fondo (líneas)
        fctx.drawImage(canvasFondo, 0, 0);
        // 3. Dibujar dibujos del profesor
        fctx.drawImage(canvas, 0, 0);
        
        // 4. Dibujar jugadores (circles)
        const playerRadius = finalCanvas.width / 60;
        jugadores.forEach(p => {
            fctx.beginPath();
            fctx.arc(p.x, p.y, playerRadius, 0, Math.PI * 2);
            fctx.fillStyle = p.color;
            fctx.fill();
            fctx.strokeStyle = '#ffffff';
            fctx.lineWidth = 1;
            fctx.stroke();
            fctx.fillStyle = '#ffffff';
            fctx.font = `bold ${playerRadius * 0.8}px Arial`;
            fctx.textAlign = 'center';
            fctx.textBaseline = 'middle';
            fctx.fillText(p.label, p.x, p.y);
        });
    }
    
    const dataURL = finalCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `estrategia-gibbor-${new Date().getTime()}.png`;
    link.href = dataURL;
    link.click();
    
    toast.success("Estrategia guardada con jugadores!", { id: toastId });
  };

  const startDragTools = (e: any) => {
    setIsDraggingTools(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    setDragOffset({
        x: clientX - floatingPos.x,
        y: clientY - floatingPos.y
    });
    e.stopPropagation();
  };

  const onDragTools = (e: any) => {
    if (!isDraggingTools) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    // Boundary checks
    const newX = Math.max(10, Math.min(window.innerWidth - 60, clientX - dragOffset.x));
    const newY = Math.max(10, Math.min(window.innerHeight - 60, clientY - dragOffset.y));
    
    setFloatingPos({ x: newX, y: newY });
  };

  const stopDragTools = () => setIsDraggingTools(false);

  return (
    <div className={`h-screen bg-slate-900 flex flex-col font-sans text-white overflow-hidden select-none ${fullScreen ? 'fixed inset-0 z-[100]' : ''}`}>
      
      {!fullScreen && (
        <div className="bg-slate-800 border-b border-white/10 p-2 lg:p-4 flex items-center justify-between shadow-2xl z-20 gap-2">
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            <button onClick={() => window.location.href = '/entrenador/planificador'} className="p-1.5 lg:p-2 hover:bg-slate-700 rounded-xl transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[10px] lg:text-sm font-black uppercase tracking-widest text-emerald-400 truncate">Pizarra Táctica</h1>
              <p className="text-[8px] lg:text-[10px] font-bold text-slate-400 hidden sm:block">MULTI-CAPA</p>
            </div>
          </div>

          <div className="flex items-center gap-1 lg:gap-2 bg-slate-900/50 p-1 rounded-2xl border border-white/5 shrink-0">
             <button onClick={() => setTool('pen')} className={`p-2 lg:p-3 rounded-xl transition-all ${tool === 'pen' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><Pen className="w-4 h-4 lg:w-5 lg:h-5" /></button>
             <button onClick={() => setTool('eraser')} className={`p-2 lg:p-3 rounded-xl transition-all ${tool === 'eraser' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><Eraser className="w-4 h-4 lg:w-5 lg:h-5" /></button>
             <div className="w-px h-5 bg-white/10 mx-0.5"></div>
             <button onClick={undo} disabled={history.length === 0} title="Deshacer" className={`p-2 lg:p-3 rounded-xl transition-all ${history.length > 0 ? 'text-slate-300 hover:text-white' : 'text-slate-700 pointer-events-none'}`}>
                <Undo2 className="w-4 h-4 lg:w-5 lg:h-5" />
             </button>
             <button onClick={clearCanvas} title="Limpiar dibujos" className="p-2 lg:p-3 text-slate-500 hover:text-red-400 rounded-xl transition-colors"><RefreshCw className="w-4 h-4 lg:w-5 lg:h-5" /></button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex gap-1 lg:gap-2">
              {['#ffffff', '#ef4444', '#3b82f6'].map(c => (
                  <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 transition-all ${color === c ? 'scale-110 border-white' : 'border-transparent opacity-50'}`} style={{ backgroundColor: c }}></button>
              ))}
            </div>
            <button onClick={() => setFullScreen(true)} className="lg:hidden p-2.5 bg-slate-700 rounded-xl text-white"><Layers className="w-4 h-4" /></button>
            <button onClick={guardarCaptura} title="Guardar Imagen" className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 lg:px-5 lg:py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition-all">
              <Save className="w-4 h-4" /> <span className="hidden lg:inline">GUARDAR IMAGEN</span>
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 relative flex items-center justify-center bg-slate-950 ${fullScreen ? 'p-0' : 'p-4'}`} 
        onMouseMove={(e) => { onDragMove(e); onDragTools(e); }} 
        onMouseUp={() => { stopDragging(); stopDragTools(); }} 
        onMouseLeave={() => { stopDragging(); stopDragTools(); }}
        onTouchMove={(e) => { e.preventDefault(); onDragMove(e); onDragTools(e); }} 
        onTouchEnd={() => { stopDragging(); stopDragTools(); }}
      >
        
        {fullScreen && (
          <div 
            style={{ left: floatingPos.x, top: floatingPos.y }}
            className="fixed z-[110] flex flex-col items-end gap-2 transition-shadow"
          >
              <button 
                onMouseDown={startDragTools}
                onTouchStart={startDragTools}
                onClick={(e) => { e.stopPropagation(); setShowFloatingTools(!showFloatingTools); }} 
                className={`p-4 rounded-full border border-white/20 shadow-2xl transition-all cursor-move active:scale-110 ${showFloatingTools ? 'bg-orange-600' : 'bg-slate-800/95 backdrop-blur-md'}`}
              >
                {showFloatingTools ? <X className="w-6 h-6" /> : <Settings className="w-6 h-6 text-emerald-400" />}
              </button>

              {showFloatingTools && (
                <div className="bg-slate-800/90 backdrop-blur-xl p-3 rounded-[30px] border border-white/10 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in slide-in-from-top-4 duration-300">
                    <div className="flex flex-col gap-2">
                        <button onClick={() => { setTool('pen'); setShowFloatingTools(false); }} className={`p-4 rounded-2xl ${tool === 'pen' ? 'bg-emerald-500 text-white shadow-emerald-900/40' : 'text-slate-400 bg-slate-900/50'}`}><Pen className="w-6 h-6" /></button>
                        <button onClick={() => { setTool('eraser'); setShowFloatingTools(false); }} className={`p-4 rounded-2xl ${tool === 'eraser' ? 'bg-emerald-500 text-white shadow-emerald-900/40' : 'text-slate-400 bg-slate-900/50'}`}><Eraser className="w-6 h-6" /></button>
                        <div className="h-px w-full bg-white/10 my-1"></div>
                        <button onClick={() => { undo(); setShowFloatingTools(false); }} className="p-3 text-slate-400 hover:text-white transition-colors"><Undo2 className="w-6 h-6" /></button>
                        <button onClick={() => { setFullScreen(false); setShowFloatingTools(false); }} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-2xl"><Layers className="w-6 h-6" /></button>
                    </div>
                    <div className="w-full h-px bg-white/10"></div>
                    <div className="flex flex-col gap-3 items-center">
                        {['#ffffff', '#ef4444', '#3b82f6'].map(c => (
                        <button key={c} onClick={() => { setColor(c); setShowFloatingTools(false); }} className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-125' : 'border-transparent opacity-60'}`} style={{ backgroundColor: c }}></button>
                        ))}
                    </div>
                </div>
              )}
          </div>
        )}
        
        <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-slate-800/80 border border-white/10 p-4 rounded-3xl backdrop-blur-md hidden lg:flex flex-col gap-4 shadow-2xl z-30">
           <div className="text-[8px] font-black text-slate-500 text-center uppercase tracking-widest mb-1">Equipos</div>
           <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600 border-2 border-white/20 shadow-lg shadow-red-900/20"></div>
              <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white/20 shadow-lg shadow-blue-900/20"></div>
           </div>
        </div>

        {/* Cancha */}
        <div ref={containerRef} className={`pizarra-container relative mx-auto aspect-[3/2] ${fullScreen ? 'w-screen h-[calc(screen*2/3)] max-h-screen' : 'w-full max-w-[calc(1.5*(100vh-100px))] lg:max-w-5xl'} bg-emerald-600 rounded-[10px] lg:rounded-[40px] shadow-[0_0_100px_rgba(16,185,129,0.3)] border-[4px] lg:border-[12px] border-emerald-700 overflow-hidden cursor-crosshair transition-all duration-500`}>
          
          {/* Capa 1: Cancha (Inmune a borrador) */}
          <canvas ref={canvasFondoRef} className="absolute inset-0 w-full h-full" />
          
          {/* Capa 2: Dibujos (Transparente) */}
          <canvas 
            ref={canvasRef} 
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={(e) => { e.preventDefault(); draw(e); }}
            onTouchEnd={stopDrawing}
            className="absolute inset-0 w-full h-full z-10"
          />
          
          {/* Capa 3: Jugadores Draggables */}
          {jugadores.map((p) => (
             <div 
               key={p.id}
               onMouseDown={startDragging(p.id)}
               onTouchStart={startDragging(p.id)}
               className="absolute w-5 h-5 lg:w-11 lg:h-11 rounded-full border border-white shadow-2xl flex items-center justify-center font-black text-[8px] lg:text-sm cursor-grab active:cursor-grabbing transition-transform hover:scale-110"
               style={{ 
                 backgroundColor: p.color, 
                 left: p.x, 
                 top: p.y, 
                 transform: 'translate(-50%, -50%)',
                 zIndex: draggedPlayerId === p.id ? 100 : 50
               }}
             >
               {p.label}
             </div>
          ))}
        </div>

        <div className="absolute bottom-2 left-6 text-white/40 text-[8px] lg:text-[10px] font-bold uppercase flex gap-4">
            <span className="text-emerald-500/60 font-black">? Tip:</span> El borrador no afecta las líneas del campo.
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 1024px) and (orientation: portrait) {
          .pizarra-container {
            transform: rotate(90deg);
            width: 90vh !important;
            height: 90vw !important;
            max-width: none !important;
          }
          .mobile-rotate-hint {
            display: flex !important;
          }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}} />
      
      {/* Aviso de Rotación en Móvil */}
      <div className="mobile-rotate-hint hidden fixed inset-0 bg-slate-900/95 z-[200] flex-col items-center justify-center p-8 text-center pointer-events-none md:hidden">
         <div className="bg-emerald-500/10 p-8 rounded-[40px] border border-emerald-500/20 mb-6 backdrop-blur-md">
            <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin-slow mb-4 mx-auto" />
            <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Pizarra Inteligente</h2>
            <p className="text-slate-400 text-sm max-w-[200px] mx-auto">Gira tu teléfono para planificar con más espacio o usa la vista vertical.</p>
         </div>
      </div>

    </div>
  );
}
