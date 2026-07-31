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
  pile:        "#e2bd85",
  pileShadow:  "#c49a5e",
};

const BUCKETS = [1, 2, 3, 4, 5];

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
    const totalImages = BUCKETS.length * 2;
    
    BUCKETS.forEach(id => {
      const bucketImg = new window.Image();
      bucketImg.src = `/Bucket-${id}.png`;
      bucketImg.onload = () => {
        loadedImages[`bucket-${id}`] = bucketImg;
        loadedCount++;
        if (loadedCount === totalImages) setImages(loadedImages);
      };
      
      const sandImg = new window.Image();
      sandImg.src = `/Sand-${id}.png`;
      sandImg.onload = () => {
        loadedImages[`sand-${id}`] = sandImg;
        loadedCount++;
        if (loadedCount === totalImages) setImages(loadedImages);
      };
    });
  }, []);

  // Initialize Physics & Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = Matter.Engine.create();
    // Tune gravity
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
      
      // Update floor
      const beachY = h * 0.66;
      Matter.World.clear(engine.world, false);
      const ground = Matter.Bodies.rectangle(w / 2, h + 50, w * 2, 100, { 
        isStatic: true,
        friction: 0.8
      });
      // A firm sand line higher up
      const firmSand = Matter.Bodies.rectangle(w / 2, beachY + (h - beachY) * 0.52 + 50, w * 2, 100, {
        isStatic: true,
        friction: 0.8
      });
      Matter.World.add(engine.world, [ground, firmSand]);
      
      // Re-add shapes
      Matter.World.add(engine.world, shapesRef.current);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Engine runner
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
      ctx.fillStyle = THEME.pileShadow;
      ctx.beginPath();
      ctx.ellipse(pile.x, pile.y + pile.r * 0.42, pile.r * 1.1, pile.r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = THEME.pile;
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
          // Standard width is roughly 100 for display
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
      
      // Fill meter
      if (mode === 'scooping' || mode === 'carrying') {
        const mx = pile.x, my = pile.y - pile.r * 0.9;
        const barW = 74, barH = 8;
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath(); ctx.roundRect(mx - barW / 2, my, barW, barH, 4); ctx.fill();
        ctx.fillStyle = THEME.pile;
        ctx.beginPath(); ctx.roundRect(mx - barW / 2, my, barW * fillLevel, barH, 4); ctx.fill();
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
          const next = f + (1.2 * dt); // scoop rate
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
        
        // Physics body slightly smaller than image for better overlap
        const body = Matter.Bodies.rectangle(e.clientX, e.clientY, displayWidth * 0.8, displayHeight * 0.9, {
          friction: 0.8,
          restitution: 0.1,
          density: 0.04,
          label: selectedBucket.toString()
        });
        
        // Constraint to keep it somewhat upright
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
    const beachY = h * 0.66;
    const pile = { x: w * 0.13, y: beachY + (h - beachY) * 0.45, r: Math.min(w * 0.09, 110) };
    const dx = e.clientX - pile.x;
    const dy = (e.clientY - pile.y) * 1.6;
    const isOverPile = dx * dx + dy * dy < pile.r * pile.r;
    
    if (selectedBucket && isOverPile) {
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

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas 
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 pointer-events-none text-[var(--ui-text)]">
        <h1 className="text-lg tracking-widest opacity-90">tide<em className="italic text-[var(--ui-accent)]">line</em></h1>
      </div>
      
      {/* Coach */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 italic text-[var(--ui-text-dim)] pointer-events-none text-center opacity-80">
        {mode === 'idle' && !selectedBucket && 'choose a bucket to begin'}
        {mode === 'idle' && selectedBucket && 'hold on the sand pile to fill your bucket'}
        {mode === 'scooping' && 'keep scooping…'}
        {mode === 'carrying' && 'click to drop it on the beach'}
      </div>
      
      {/* Palette */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3 p-3 bg-[var(--ui-panel)] rounded-2xl backdrop-blur-md">
        {BUCKETS.map(id => (
          <button
            key={id}
            className={`w-16 h-16 rounded-xl border-2 transition-all p-1 
              ${selectedBucket === id ? 'border-[var(--ui-accent)] bg-[rgba(255,217,138,0.12)]' : 'border-transparent bg-[rgba(255,255,255,0.07)] hover:-translate-y-1'}`}
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
