"use client";

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import Image from 'next/image';

const THEME = {
  sky:      [[0, "#2b1f52"], [0.55, "#6b3f7a"], [1, "#d98a6a"]] as [number, string][],
  sea:      [[0, "#3a6d8c"], [1, "#1c3a52"]] as [number, string][],
  seaGlow:  "rgba(140, 235, 255, 0.25)",
  beach:    [[0, "#e8c896"], [1, "#c9a06a"]] as [number, string][],
  wetSand:  "#a98452",
};

const MOLD_DATA = {
  1: { fillColor: "#ffd98a", outlineSrc: "/molds/outlines/cone.svg", maskSrc: "/molds/masks/cone.png", aspectRatio: "482 / 559" }, // Cone
  2: { fillColor: "#e8c896", outlineSrc: "/molds/outlines/tower.svg", maskSrc: "/molds/masks/tower.png", aspectRatio: "394 / 513" }, // Tower
  3: { fillColor: "#dcb87e", outlineSrc: "/molds/outlines/castle.svg", maskSrc: "/molds/masks/castle.png", aspectRatio: "645 / 592" }, // Castle
  4: { fillColor: "#f3b96a", outlineSrc: "/molds/outlines/bucket.svg", maskSrc: "/molds/masks/bucket.png", aspectRatio: "590 / 559" }, // Bucket
  5: { fillColor: "#f0c77a", outlineSrc: "/molds/outlines/house.svg", maskSrc: "/molds/masks/house.png", aspectRatio: "758 / 559" }, // House
} as Record<number, { fillColor: string, outlineSrc: string, maskSrc: string, aspectRatio: string }>;

export default function SandcastleBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [mode, setMode] = useState<'idle' | 'scooping' | 'carrying'>('idle');
  const [fillLevel, setFillLevel] = useState(0);
  
  const mouseRef = useRef({ x: 0, y: 0, down: false });
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 });
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const shapesRef = useRef<any[]>([]);
  const renderLoopRef = useRef<number>(0);

  // Load images
  useEffect(() => {
    const loadedImages: Record<string, HTMLImageElement> = {};
    let loadedCount = 0;
    
    // We only need the Sand shapes for physics
    [1, 2, 3, 4, 5].forEach(id => {
      const sandImg = new window.Image();
      sandImg.src = `/Sand-${id}.png`;
      sandImg.onload = () => {
        loadedImages[`sand-${id}`] = sandImg;
        loadedCount++;
        if (loadedCount === 5) setImages(loadedImages);
      };
    });
  }, []);

  // Initialize Physics & Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = Matter.Engine.create();
    engine.gravity.y = 1.2;
    engineRef.current = engine;
    
    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      setWindowSize({ w, h });
      
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasRef.current.width = w * dpr;
      canvasRef.current.height = h * dpr;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      
      const beachY = h * 0.66;
      Matter.World.clear(engine.world, false);
      const ground = Matter.Bodies.rectangle(w / 2, h + 50, w * 2, 100, { 
        isStatic: true,
        friction: 0.8
      });
      const firmSand = Matter.Bodies.rectangle(w / 2, beachY + (h - beachY) * 0.52 + 50, w * 2, 100, {
        isStatic: true,
        friction: 0.8
      });
      Matter.World.add(engine.world, [ground, firmSand]);
      Matter.World.add(engine.world, shapesRef.current);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, []);

  // Render Loop
  useEffect(() => {
    if (!canvasRef.current || Object.keys(images).length === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      const { w, h } = windowSize;
      if (w === 0 || h === 0) return;
      const beachY = h * 0.66;
      const pile = { x: w * 0.13, y: beachY + (h - beachY) * 0.45, r: Math.min(w * 0.09, 110) };
      
      // Backgrounds
      const skyGrad = ctx.createLinearGradient(0, 0, 0, beachY);
      THEME.sky.forEach(([t, c]) => skyGrad.addColorStop(t, c as string));
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, beachY);
      
      const seaH = 34;
      const seaGrad = ctx.createLinearGradient(0, beachY - seaH, 0, beachY);
      THEME.sea.forEach(([t, c]) => seaGrad.addColorStop(t, c as string));
      ctx.fillStyle = seaGrad;
      ctx.fillRect(0, beachY - seaH, w, seaH);
      
      ctx.fillStyle = THEME.seaGlow;
      ctx.fillRect(0, beachY - 3, w, 3);
      
      const beachGrad = ctx.createLinearGradient(0, beachY, 0, h);
      THEME.beach.forEach(([t, c]) => beachGrad.addColorStop(t, c as string));
      ctx.fillStyle = beachGrad;
      ctx.fillRect(0, beachY, w, h - beachY);
      
      ctx.fillStyle = THEME.wetSand;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, beachY, w, 14);
      ctx.globalAlpha = 1;
      
      // Draw Pile
      ctx.fillStyle = "#c49a5e"; // pileShadow
      ctx.beginPath();
      ctx.ellipse(pile.x, pile.y + pile.r * 0.42, pile.r * 1.1, pile.r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e2bd85"; // pile
      ctx.beginPath();
      ctx.ellipse(pile.x, pile.y, pile.r, pile.r * 0.62, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      // Draw Shapes
      shapesRef.current.forEach(body => {
        const img = images[`sand-${body.label}`];
        if (img) {
          ctx.save();
          ctx.translate(body.position.x, body.position.y);
          ctx.rotate(body.angle);
          const displayWidth = 100;
          const displayHeight = (img.height / img.width) * displayWidth;
          ctx.drawImage(img, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight);
          ctx.restore();
        }
      });
      
      // Draw ghost if carrying
      if (mode === 'carrying' && selectedBucket) {
        const img = images[`sand-${selectedBucket}`];
        if (img) {
          ctx.save();
          ctx.globalAlpha = 0.6;
          const displayWidth = 100;
          const displayHeight = (img.height / img.width) * displayWidth;
          ctx.drawImage(img, mouseRef.current.x - displayWidth / 2, mouseRef.current.y - displayHeight / 2, displayWidth, displayHeight);
          ctx.restore();
        }
      }
      
      renderLoopRef.current = requestAnimationFrame(render);
    };
    
    renderLoopRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(renderLoopRef.current);
  }, [windowSize, images, mode, fillLevel, selectedBucket]);

  // Update Scooping logic
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;
    
    const update = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      
      if (mode === 'scooping' && mouseRef.current.down) {
        setFillLevel(f => {
          const next = f + (0.4 * dt); // scoop rate (takes ~2.5s)
          if (next >= 1) {
            setMode('carrying');
            return 1;
          }
          return next;
        });
      }
      
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [mode]);

  const handlePointerDown = (e: React.PointerEvent) => {
    mouseRef.current.down = true;
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
    
    if (mode === 'carrying' && selectedBucket && engineRef.current) {
      const img = images[`sand-${selectedBucket}`];
      if (img) {
        const displayWidth = 100;
        const displayHeight = (img.height / img.width) * displayWidth;
        
        const body = Matter.Bodies.rectangle(e.clientX, e.clientY, displayWidth * 0.8, displayHeight * 0.9, {
          friction: 0.8,
          restitution: 0.1,
          density: 0.04,
          label: selectedBucket.toString()
        });
        
        Matter.Body.setInertia(body, Infinity); // prevent rotation for clean stacking
        
        shapesRef.current.push(body);
        Matter.World.add(engineRef.current.world, body);
        setMode('idle');
        setFillLevel(0);
        setSelectedBucket(null);
      }
      return;
    }
    
    const { w, h } = windowSize;
    
    // Increase hit detection area to the entire bottom-left quadrant so they can click the bucket animation itself
    const isOverPileArea = e.clientX < w * 0.35 && e.clientY > h * 0.3;
    
    if (selectedBucket && isOverPileArea) {
      setMode('scooping');
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  };

  const handlePointerUp = () => {
    mouseRef.current.down = false;
    if (mode === 'scooping') {
      setMode('idle');
      setFillLevel(0);
    }
  };

  const pileLeft = windowSize.w * 0.13;
  const pileTop = windowSize.h * 0.66 + (windowSize.h - windowSize.h * 0.66) * 0.45;
  const selectedMold = selectedBucket ? MOLD_DATA[selectedBucket] : null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full cursor-crosshair z-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 pointer-events-none text-[var(--ui-text)] z-10">
        <h1 className="text-lg tracking-widest opacity-90 font-[Georgia]">tide<em className="italic text-[var(--sand)] font-[Georgia]">line</em></h1>
      </div>
      
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 italic text-[var(--ink-dim)] pointer-events-none text-center opacity-80 z-10 font-[Georgia]">
        {mode === 'idle' && !selectedBucket && 'choose a bucket to begin'}
        {mode === 'idle' && selectedBucket && 'hold on the sand pile to fill your bucket'}
        {mode === 'scooping' && 'keep scooping…'}
        {mode === 'carrying' && 'click anywhere on the beach to drop it'}
      </div>

      {/* CSS Animation over sand pile */}
      {selectedMold && (mode === 'scooping' || (mode === 'idle' && fillLevel > 0)) && (
        <div 
          className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ 
            left: pileLeft, 
            top: pileTop - 40,
            width: '180px'
          }}
        >
          <span
            className="mold-art w-full"
            style={{ 
              aspectRatio: selectedMold.aspectRatio,
              "--fill-color": selectedMold.fillColor, 
              "--mold-mask": `url("${selectedMold.maskSrc}")` 
            } as any}
            aria-hidden="true"
          >
            <span
              className="mold-art__reveal"
              style={{ clipPath: `inset(${100 - (fillLevel * 100)}% 0 0 0)` }}
            >
              <span className="mold-art__fill" />
            </span>
            <Image
              className="mold-art__outline"
              src={selectedMold.outlineSrc}
              alt=""
              draggable={false}
              fill
              sizes="180px"
              unoptimized
            />
          </span>
        </div>
      )}
      
      {/* Mold Palette */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3 p-3 bg-[var(--ui-panel)] rounded-2xl backdrop-blur-md z-10">
        {[1, 2, 3, 4, 5].map(id => (
          <button
            key={id}
            className={`w-16 h-16 rounded-xl border-2 transition-all p-1 
              ${selectedBucket === id ? 'border-[var(--sand)] bg-[rgba(255,217,138,0.12)]' : 'border-transparent bg-[rgba(255,255,255,0.07)] hover:-translate-y-1'}`}
            onClick={() => {
              if (mode === 'carrying') return;
              setSelectedBucket(id);
              setFillLevel(0);
            }}
          >
            <Image
              src={`/Bucket-${id}.png`}
              alt={`Bucket ${id}`}
              width={64}
              height={64}
              className="w-full h-full object-contain pointer-events-none"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
