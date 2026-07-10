'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Trash2, Save, Eraser, Pen, Circle, 
  Download, RefreshCw, Layers, Users as UsersIcon, X, Undo2, Settings,
  Play, Pause, Plus, Video, Target, Navigation
} from 'lucide-react';
import { toast } from 'sonner';

type ItemType = 'player_red' | 'player_blue' | 'ball' | 'cone';

interface BoardItem {
  id: string;
  type: ItemType;
  label?: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

interface Frame {
  id: string;
  items: BoardItem[];
  duration: number; // in ms, how long it takes to transition to this frame from the previous
}

export default function PizarraTactica() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // -- State --
  const [fullScreen, setFullScreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  // Animation State
  const [frames, setFrames] = useState<Frame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Interpolated items used ONLY during playback
  const [renderedItems, setRenderedItems] = useState<BoardItem[]>([]);
  
  // Dragging State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Tools
  const [showToolbox, setShowToolbox] = useState(true);

  // Canvas Drawing (Global for notes)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasFondoRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [history, setHistory] = useState<string[]>([]);

  // Initialize
  useEffect(() => {
    // Check orientation
    const checkOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth);
    const handleResize = () => {
      checkOrientation();
      drawField();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Initial setup: 11 red, 11 blue, 1 ball
    if (frames.length === 0) {
      const initialItems: BoardItem[] = [];
      for (let i = 1; i <= 11; i++) {
        initialItems.push({ id: `red-${i}`, type: 'player_red', label: `${i}`, x: i > 6 ? 30 : 15, y: 15 + ((i > 6 ? i-6 : i) * 10) });
        initialItems.push({ id: `blue-${i}`, type: 'player_blue', label: `${i}`, x: i > 6 ? 70 : 85, y: 15 + ((i > 6 ? i-6 : i) * 10) });
      }
      initialItems.push({ id: 'ball-1', type: 'ball', x: 50, y: 50 });
      setFrames([{ id: 'frame-1', items: initialItems, duration: 1000 }]);
      setRenderedItems(initialItems);
    }
  }, [frames]);

  // Sync rendered items when not playing
  useEffect(() => {
    if (!isPlaying && frames.length > 0 && frames[currentFrameIndex]) {
      setRenderedItems(frames[currentFrameIndex].items);
    }
  }, [currentFrameIndex, frames, isPlaying]);

  // -- Drawing Logic --
  const drawField = () => {
    const canvas = canvasFondoRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(2, w / 500);
    
    const margin = w * 0.03;
    const fw = w - margin * 2;
    const fh = h - margin * 2;
    
    ctx.strokeRect(margin, margin, fw, fh);
    
    ctx.beginPath();
    ctx.moveTo(w / 2, margin);
    ctx.lineTo(w / 2, h - margin);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, fh * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
    
    const agW = fw * 0.16;
    const agH = fh * 0.60;
    const apW = fw * 0.06;
    const apH = fh * 0.30;
    
    ctx.strokeRect(margin, h/2 - agH/2, agW, agH);
    ctx.strokeRect(margin, h/2 - apH/2, apW, apH);
    
    ctx.strokeRect(w - margin - agW, h/2 - agH/2, agW, agH);
    ctx.strokeRect(w - margin - apW, h/2 - apH/2, apW, apH);

    ctx.beginPath();
    ctx.arc(margin + agW, h / 2, fh * 0.1, -Math.PI/2, Math.PI/2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(w - margin - agW, h / 2, fh * 0.1, Math.PI/2, -Math.PI/2);
    ctx.stroke();
  };

  // Setup drawing canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
       canvas.width = canvas.offsetWidth;
       canvas.height = canvas.offsetHeight;
    }
  }, [fullScreen]);

  const getCanvasCoords = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const handlePointerDownCanvas = (e: React.PointerEvent) => {
    // Only draw if no item is being dragged
    if (draggedItemId || isPlaying) return;
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
        setHistory(prev => [...prev.slice(-20), canvas.toDataURL()]);
    }

    const coords = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    
    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 30;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveCanvas = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.lineTo(coords.x, coords.y); ctx.stroke(); }
  };

  const handlePointerUpCanvas = (e: React.PointerEvent) => {
    setIsDrawing(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // -- Dragging Logic --
  const getPitchPercentage = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    let xPerc = ((clientX - rect.left) / rect.width) * 100;
    let yPerc = ((clientY - rect.top) / rect.height) * 100;
    
    xPerc = Math.max(0, Math.min(100, xPerc));
    yPerc = Math.max(0, Math.min(100, yPerc));
    
    return { x: xPerc, y: yPerc };
  };

  const handleItemPointerDown = (e: React.PointerEvent, id: string) => {
    if (isPlaying) return;
    e.stopPropagation(); 
    setDraggedItemId(id);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleItemPointerMove = (e: React.PointerEvent) => {
    if (!draggedItemId || isPlaying) return;
    e.stopPropagation();
    
    const { x, y } = getPitchPercentage(e.clientX, e.clientY);
    
    const updatedFrames = [...frames];
    const currentItems = [...updatedFrames[currentFrameIndex].items];
    const itemIndex = currentItems.findIndex(i => i.id === draggedItemId);
    
    if (itemIndex > -1) {
      currentItems[itemIndex] = { ...currentItems[itemIndex], x, y };
      updatedFrames[currentFrameIndex].items = currentItems;
      setFrames(updatedFrames);
      setRenderedItems(currentItems);
    }
  };

  const handleItemPointerUp = (e: React.PointerEvent) => {
    if (!draggedItemId) return;
    setDraggedItemId(null);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // -- Add New Items --
  const addNewItem = (type: ItemType) => {
    if (isPlaying) return;
    const newItem: BoardItem = {
      id: `${type}-${Date.now()}`,
      type,
      x: 50,
      y: 50,
      label: type.includes('player') ? '?' : undefined
    };
    
    const updatedFrames = [...frames];
    for (let i = currentFrameIndex; i < updatedFrames.length; i++) {
        updatedFrames[i].items = [...updatedFrames[i].items, { ...newItem }];
    }
    setFrames(updatedFrames);
  };

  // -- Animation Timeline --
  const addFrame = () => {
    if (isPlaying) return;
    const newItems = frames[currentFrameIndex].items.map(i => ({ ...i }));
    const newFrame: Frame = {
      id: `frame-${Date.now()}`,
      items: newItems,
      duration: 1000 
    };
    
    const newFrames = [...frames.slice(0, currentFrameIndex + 1), newFrame, ...frames.slice(currentFrameIndex + 1)];
    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
  };

  const removeFrame = (idx: number) => {
    if (frames.length <= 1 || isPlaying) return;
    const newFrames = frames.filter((_, i) => i !== idx);
    setFrames(newFrames);
    if (currentFrameIndex >= newFrames.length) {
      setCurrentFrameIndex(newFrames.length - 1);
    }
  };

  const playAnimation = async () => {
    if (frames.length <= 1) {
      toast.error('Agrega más escenas (Frames) para animar');
      return;
    }
    setIsPlaying(true);
    setCurrentFrameIndex(0);
    setRenderedItems(frames[0].items);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 1; i < frames.length; i++) {
        await sleep(50);
        setCurrentFrameIndex(i);
        setRenderedItems(frames[i].items);
        await sleep(frames[i].duration);
    }

    setIsPlaying(false);
  };

  return (
    <div className={`flex flex-col bg-slate-900 ${fullScreen ? 'fixed inset-0 z-50' : 'min-h-screen'} transition-all`}>
      
      {/* Header */}
      {!fullScreen && (
        <div className="bg-[#020617] border-b border-white/5 p-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-white transition-colors" onClick={() => window.history.back()}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                <Video className="w-6 h-6 text-emerald-500" />
                Playbook Pro <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full not-italic">Beta</span>
              </h1>
            </div>
          </div>
          <button 
            onClick={() => setFullScreen(true)}
            className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all"
          >
            Pantalla Completa
          </button>
        </div>
      )}

      {/* Main Board Area */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        
        {/* Toolbox Sidebar */}
        <div className={`absolute md:relative z-30 ${showToolbox ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform w-16 md:w-20 bg-[#020617]/90 backdrop-blur-md border-r border-white/5 flex flex-col items-center py-4 gap-4 shadow-2xl h-full`}>
            
            <button className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors group relative" onClick={() => addNewItem('ball')}>
                ⚽
                <span className="absolute left-14 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Añadir Balón</span>
            </button>
            <button className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors group relative" onClick={() => addNewItem('cone')}>
                🔺
                <span className="absolute left-14 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Añadir Cono</span>
            </button>
            <button className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors group relative" onClick={() => addNewItem('player_red')}>
                🔴
                <span className="absolute left-14 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Añadir Atacante</span>
            </button>
            <button className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors group relative" onClick={() => addNewItem('player_blue')}>
                🔵
                <span className="absolute left-14 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Añadir Defensor</span>
            </button>
            
            <div className="w-12 h-px bg-white/10 my-2"></div>
            
            <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${tool === 'pen' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`} onClick={() => setTool('pen')}>
                <Pen className="w-4 h-4" />
            </button>
            
            <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${tool === 'eraser' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`} onClick={() => setTool('eraser')}>
                <Eraser className="w-4 h-4" />
            </button>
            
            <button className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors mt-auto" onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx?.clearRect(0, 0, canvas.width, canvas.height);
                }
            }}>
                <Trash2 className="w-4 h-4" />
            </button>

            {fullScreen && (
                <button className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors" onClick={() => setFullScreen(false)}>
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>

        {/* Pitch Container */}
        <div className="flex-1 flex items-center justify-center p-2 md:p-8 bg-slate-900 overflow-hidden relative">
            
            {/* Mobile Toolbox Toggle */}
            <button className="md:hidden absolute top-4 left-4 z-40 bg-white/10 p-2 rounded-xl backdrop-blur-md" onClick={() => setShowToolbox(!showToolbox)}>
                <Settings className="w-5 h-5 text-white" />
            </button>

            <div 
                ref={containerRef} 
                className={`relative bg-emerald-600 rounded-3xl shadow-[0_0_100px_rgba(16,185,129,0.15)] border-4 border-emerald-700/50 overflow-hidden ${isPortrait ? 'w-full aspect-[2/3]' : 'w-full max-w-5xl aspect-[3/2]'}`}
                style={{ touchAction: 'none' }}
            >
                {/* Background Field Lines */}
                <canvas ref={canvasFondoRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-50" />
                
                {/* Drawing Layer */}
                <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 w-full h-full z-10 touch-none"
                    onPointerDown={handlePointerDownCanvas}
                    onPointerMove={handlePointerMoveCanvas}
                    onPointerUp={handlePointerUpCanvas}
                    onPointerCancel={handlePointerUpCanvas}
                />

                {/* Items Layer */}
                <div className="absolute inset-0 w-full h-full z-20 pointer-events-none">
                    {renderedItems.map(item => (
                        <div 
                            key={item.id}
                            onPointerDown={(e) => handleItemPointerDown(e, item.id)}
                            onPointerMove={handleItemPointerMove}
                            onPointerUp={handleItemPointerUp}
                            onPointerCancel={handleItemPointerUp}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex items-center justify-center shadow-2xl
                                ${isPlaying ? 'transition-all ease-linear' : (draggedItemId === item.id ? 'scale-125 z-50 cursor-grabbing' : 'cursor-grab hover:scale-110')}
                            `}
                            style={{ 
                                left: `${item.x}%`, 
                                top: `${item.y}%`,
                                transitionDuration: isPlaying && frames[currentFrameIndex] ? `${frames[currentFrameIndex].duration}ms` : '0ms',
                                width: item.type.includes('player') ? 'clamp(24px, 4%, 40px)' : item.type === 'ball' ? 'clamp(16px, 2%, 24px)' : 'clamp(20px, 3%, 30px)',
                                height: item.type.includes('player') ? 'clamp(24px, 4%, 40px)' : item.type === 'ball' ? 'clamp(16px, 2%, 24px)' : 'clamp(20px, 3%, 30px)',
                            }}
                        >
                            {item.type === 'player_red' && (
                                <div className="w-full h-full bg-red-500 rounded-full border-2 border-white/80 flex items-center justify-center shadow-lg">
                                    <span className="text-[10px] md:text-xs font-black text-white">{item.label}</span>
                                </div>
                            )}
                            {item.type === 'player_blue' && (
                                <div className="w-full h-full bg-blue-500 rounded-full border-2 border-white/80 flex items-center justify-center shadow-lg">
                                    <span className="text-[10px] md:text-xs font-black text-white">{item.label}</span>
                                </div>
                            )}
                            {item.type === 'ball' && (
                                <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xs md:text-sm drop-shadow-md">
                                    ⚽
                                </div>
                            )}
                            {item.type === 'cone' && (
                                <div className="w-full h-full flex items-center justify-center text-xs md:text-sm drop-shadow-md">
                                    🔺
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Timeline Controls (Footer) */}
      <div className="bg-[#020617] border-t border-white/5 p-4 z-20 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {frames.map((frame, idx) => (
                <div key={frame.id} className="relative group shrink-0">
                    <button 
                        onClick={() => { if(!isPlaying) setCurrentFrameIndex(idx); }}
                        className={`w-16 h-12 rounded-lg border-2 flex items-center justify-center font-black text-xs transition-colors
                            ${currentFrameIndex === idx ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-white/10 bg-white/5 text-slate-500 hover:border-white/30'}
                        `}
                    >
                        Paso {idx + 1}
                    </button>
                    {frames.length > 1 && !isPlaying && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); removeFrame(idx); }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            ))}
            <button 
                onClick={addFrame}
                disabled={isPlaying}
                className="w-12 h-12 shrink-0 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white/50 transition-colors disabled:opacity-50"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>

        <div className="flex items-center gap-3">
            <button 
                onClick={isPlaying ? () => setIsPlaying(false) : playAnimation}
                className={`px-8 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-xl transition-all
                    ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'}
                `}
            >
                {isPlaying ? <><Pause className="w-4 h-4" /> Detener</> : <><Play className="w-4 h-4" /> Animar Jugada</>}
            </button>
            <button className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors" title="Guardar Jugada">
                <Save className="w-5 h-5" />
            </button>
        </div>

      </div>

    </div>
  );
}
