"use client";

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import Image from 'next/image';

const THEME = {
  sky: [[0, "#2b1f52"], [0.55, "#6b3f7a"], [1, "#d98a6a"]] as [number, string][],
  sea: [[0, "#3a6d8c"], [1, "#1c3a52"]] as [number, string][],
  seaGlow: "rgba(140, 235, 255, 0.25)",
  beach: [[0, "#e8c896"], [1, "#c9a06a"]] as [number, string][],
  wetSand: "#a98452",
};

const MOLD_DATA = {
  1: { fillColor: "#ffd98a", outlineSrc: "/molds/outlines/cone.svg", maskSrc: "/molds/masks/cone.png", aspectRatio: "482 / 559" }, // Cone
  2: { fillColor: "#e8c896", outlineSrc: "/molds/outlines/tower.svg", maskSrc: "/molds/masks/tower.png", aspectRatio: "394 / 513" }, // Tower
  3: { fillColor: "#dcb87e", outlineSrc: "/molds/outlines/castle.svg", maskSrc: "/molds/masks/castle.png", aspectRatio: "645 / 592" }, // Castle
  4: { fillColor: "#f3b96a", outlineSrc: "/molds/outlines/bucket.svg", maskSrc: "/molds/masks/bucket.png", aspectRatio: "590 / 559" }, // Bucket
  5: { fillColor: "#f0c77a", outlineSrc: "/molds/outlines/house.svg", maskSrc: "/molds/masks/house.png", aspectRatio: "758 / 559" }, // House
} as Record<number, { fillColor: string, outlineSrc: string, maskSrc: string, aspectRatio: string }>;

const PART_DISPLAY_WIDTH = 180;

export default function SandcastleBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);

  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [mode, setMode] = useState<'idle' | 'scooping' | 'carrying'>('idle');
  const [fillLevel, setFillLevel] = useState(0);

  // Onboarding Tutorial State
  const [step1Completed, setStep1Completed] = useState(false); // Select bucket
  const [step2Completed, setStep2Completed] = useState(false); // Fill bucket
  const [step3Completed, setStep3Completed] = useState(false); // Drop shape

  const mouseRef = useRef({ x: 0, y: 0, down: false });
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 });
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const shapesRef = useRef<any[]>([]);
  const renderLoopRef = useRef<number>(0);

  // Load images
  useEffect(() => {
    const loadedImages: Record<string, HTMLImageElement> = {};
    let loadedCount = 0;
    const totalToLoad = 11;

    [1, 2, 3, 4, 5].forEach(id => {
      const sandImg = new window.Image();
      sandImg.src = `/Sand-${id}.png`;
      sandImg.onload = () => {
        loadedImages[`sand-${id}`] = sandImg;
        loadedCount++;
        if (loadedCount === totalToLoad) setImages(loadedImages);
      };
      const bucketImg = new window.Image();
      bucketImg.src = `/Bucket-${id}.png`;
      bucketImg.onload = () => {
        loadedImages[`bucket-${id}`] = bucketImg;
        loadedCount++;
        if (loadedCount === totalToLoad) setImages(loadedImages);
      };
    });

    const pileImg = new window.Image();
    pileImg.src = '/image 12.png';
    pileImg.onload = () => {
      loadedImages['pile'] = pileImg;
      loadedCount++;
      if (loadedCount === totalToLoad) setImages(loadedImages);
    };
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

      ctx.clearRect(0, 0, w, h);

      // Draw Pile
      const pileImg = images.pile;
      if (pileImg) {
        const pileWidth = pile.r * 2.2;
        const pileHeight = (pileImg.height / pileImg.width) * pileWidth;
        ctx.drawImage(pileImg, pile.x - pileWidth / 2, pile.y - pileHeight / 2, pileWidth, pileHeight);
      }

      // Draw Shapes
      shapesRef.current.forEach(body => {
        const img = images[`sand-${body.label}`];
        if (img) {
          ctx.save();
          ctx.translate(body.position.x, body.position.y);
          ctx.rotate(body.angle);
          const displayWidth = PART_DISPLAY_WIDTH;
          const displayHeight = (img.height / img.width) * displayWidth;
          ctx.drawImage(img, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight);
          ctx.restore();
        }
      });

      // Draw bucket cursor if idle and bucket selected
      if (mode === 'idle' && selectedBucket) {
        const img = images[`bucket-${selectedBucket}`];
        if (img) {
          ctx.save();
          ctx.globalAlpha = 0.9;
          const displayWidth = 85;
          const displayHeight = (img.height / img.width) * displayWidth;
          ctx.drawImage(img, mouseRef.current.x - displayWidth / 2, mouseRef.current.y - displayHeight / 2, displayWidth, displayHeight);
          ctx.restore();
        }
      }

      // Draw ghost if carrying
      if (mode === 'carrying' && selectedBucket) {
        const img = images[`sand-${selectedBucket}`];
        if (img) {
          ctx.save();
          ctx.globalAlpha = 0.85;
          const displayWidth = PART_DISPLAY_WIDTH;
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
            setStep2Completed(true);
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

        setStep3Completed(true);
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

  const handleKnockOver = () => {
    if (engineRef.current) {
      shapesRef.current.forEach(body => {
        Matter.Body.setStatic(body, false);
        Matter.Body.setInertia(body, 500);
        const forceMagnitude = 0.08 * body.mass;
        Matter.Body.applyForce(body, body.position, {
          x: (Math.random() - 0.5) * forceMagnitude * 1.5,
          y: -Math.random() * forceMagnitude - 0.04
        });
        Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.15);
      });
    }
  };

  const handleKnockOverRef = useRef(handleKnockOver);
  handleKnockOverRef.current = handleKnockOver;

  const KNOCKOVER_INTERVAL = 15;
  const [knockoverCountdown, setKnockoverCountdown] = useState(KNOCKOVER_INTERVAL);

  // Automatically knock over the castle every 15 seconds, ticking a visible countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setKnockoverCountdown(prev => {
        if (prev <= 1) {
          handleKnockOverRef.current();
          return KNOCKOVER_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        src="/Stylized Wave Loop.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      <canvas
        ref={canvasRef}
        className={`absolute inset-0 block w-full h-full z-10 ${selectedBucket ? 'cursor-none' : 'cursor-crosshair'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Onboarding / Tutorial Card */}
      <div className="onboarding-card">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-2.5">
            <span className="font-bold text-xs uppercase tracking-wider text-[var(--sand)] font-sans">Getting Started</span>
            <span className="text-[10px] font-mono text-[var(--ink-dim)]">Tutorial</span>
          </div>

          <div className="flex flex-col gap-4 font-sans text-left">
            {/* Step 1 */}
            <div className={`flex items-start gap-3 transition-opacity duration-300 ${step1Completed ? 'opacity-40' : 'opacity-100'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[11px] font-mono shrink-0 transition-all duration-300
                ${step1Completed ? 'bg-[var(--sand)] border-[var(--sand)] text-[#1a1430] font-bold' : 'border-[var(--ink-dim)] text-[var(--ink-dim)]'}`}>
                {step1Completed ? '✓' : '1'}
              </div>
              <div className="flex flex-col">
                <span className={`font-semibold text-sm leading-none transition-colors ${step1Completed ? 'line-through text-[var(--ink-dim)]' : 'text-[var(--ink)]'}`}>Select a bucket</span>
                <span className="text-[11px] text-[var(--ink-dim)] leading-tight mt-1">Pick a style from the options at the top.</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`flex items-start gap-3 transition-opacity duration-300 ${step2Completed ? 'opacity-40' : step1Completed ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[11px] font-mono shrink-0 transition-all duration-300
                ${step2Completed ? 'bg-[var(--sand)] border-[var(--sand)] text-[#1a1430] font-bold' : 'border-[var(--ink-dim)] text-[var(--ink-dim)]'}`}>
                {step2Completed ? '✓' : '2'}
              </div>
              <div className="flex flex-col">
                <span className={`font-semibold text-sm leading-none transition-colors ${step2Completed ? 'line-through text-[var(--ink-dim)]' : 'text-[var(--ink)]'}`}>Fill with sand</span>
                <span className="text-[11px] text-[var(--ink-dim)] leading-tight mt-1">Press and hold on the sand pile at the bottom-left.</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`flex items-start gap-3 transition-opacity duration-300 ${step3Completed ? 'opacity-40' : step2Completed ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[11px] font-mono shrink-0 transition-all duration-300
                ${step3Completed ? 'bg-[var(--sand)] border-[var(--sand)] text-[#1a1430] font-bold' : 'border-[var(--ink-dim)] text-[var(--ink-dim)]'}`}>
                {step3Completed ? '✓' : '3'}
              </div>
              <div className="flex flex-col">
                <span className={`font-semibold text-sm leading-none transition-colors ${step3Completed ? 'line-through text-[var(--ink-dim)]' : 'text-[var(--ink)]'}`}>Place it down</span>
                <span className="text-[11px] text-[var(--ink-dim)] leading-tight mt-1">Click anywhere on the beach to drop the sand shape.</span>
              </div>
            </div>
          </div>

          <div
            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border transition-colors duration-300 ${
              knockoverCountdown <= 5
                ? 'bg-[rgba(255,157,122,0.14)] border-[rgba(255,157,122,0.45)]'
                : 'bg-[rgba(255,217,138,0.08)] border-[rgba(255,217,138,0.25)]'
            }`}
          >
            <p
              className={`text-xs font-semibold leading-tight ${
                knockoverCountdown <= 5 ? 'text-[var(--ui-danger)]' : 'text-[var(--sand)]'
              }`}
            >
              ⚠ Every 15s the castle gets knocked over!
            </p>
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm font-mono font-bold shrink-0 transition-colors duration-300 ${
                knockoverCountdown <= 5
                  ? 'border-[var(--ui-danger)] text-[var(--ui-danger)] animate-pulse'
                  : 'border-[var(--sand)] text-[var(--sand)]'
              }`}
            >
              {knockoverCountdown}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 pointer-events-none text-[var(--ui-text)] z-20">
        <h1 className="text-lg tracking-widest opacity-90">tide<em className="italic text-[var(--sand)]">line</em></h1>

        <button
          className="pointer-events-auto px-4 py-2 bg-[var(--ui-accent)] text-[#1a1430] rounded-lg uppercase tracking-wider text-sm transition-all hover:scale-105 active:scale-95 shadow-lg"
          onClick={() => {
            handleKnockOver();
            setKnockoverCountdown(KNOCKOVER_INTERVAL);
          }}
        >
          Knock Over
        </button>
      </div>

      {/* <div className="absolute bottom-28 left-1/2 -translate-x-1/2 italic text-[var(--ink-dim)] pointer-events-none text-center opacity-80 z-20">
        {mode === 'idle' && !selectedBucket && 'choose a bucket to begin'}
        {mode === 'idle' && selectedBucket && 'hold on the sand pile to fill your bucket'}
        {mode === 'scooping' && 'keep scooping…'}
        {mode === 'carrying' && 'click anywhere on the beach to drop it'}
      </div> */}

      {/* CSS Animation over sand pile */}
      {selectedMold && (mode === 'scooping' || (mode === 'idle' && fillLevel > 0)) && (
        <div
          className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full"
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
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-3 p-3 bg-[var(--ui-panel)] rounded-2xl backdrop-blur-md z-20">
        {[1, 2, 3, 4, 5].map(id => (
          <button
            key={id}
            className={`w-16 h-16 rounded-xl border-2 transition-all p-1 
              ${selectedBucket === id ? 'border-[var(--sand)] bg-[rgba(255,217,138,0.12)]' : 'border-transparent bg-[rgba(255,255,255,0.07)] hover:-translate-y-1'}`}
            onClick={() => {
              setSelectedBucket(id);
              setMode('idle');
              setFillLevel(0);
              if (step3Completed) {
                setStep2Completed(false);
                setStep3Completed(false);
              }
              setStep1Completed(true);
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
