"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import Image from "next/image";

type MoldStyle = CSSProperties & {
  "--fill-color": string;
  "--mold-mask": string;
};

export type FillingMoldProps = {
  name: string;
  description: string;
  outlineSrc: string;
  maskSrc: string;
  aspectRatio: string;
  fillColor: string;
  fillDurationMs?: number;
};

export function FillingMold({
  name,
  description,
  outlineSrc,
  maskSrc,
  aspectRatio,
  fillColor,
  fillDurationMs = 2600,
}: FillingMoldProps) {
  const [progress, setProgress] = useState(0);
  const [isFilling, setIsFilling] = useState(false);
  const progressRef = useRef(0);

  const updateProgress = useCallback((nextProgress: number) => {
    progressRef.current = nextProgress;
    setProgress(nextProgress);
  }, []);

  const startFilling = useCallback(() => {
    if (progressRef.current < 100) {
      setIsFilling(true);
    }
  }, []);

  const stopFilling = useCallback(() => {
    setIsFilling(false);
  }, []);

  const reset = useCallback(() => {
    setIsFilling(false);
    updateProgress(0);
  }, [updateProgress]);

  useEffect(() => {
    if (!isFilling) {
      return;
    }

    let animationFrame = 0;
    let previousTime: number | undefined;

    const fill = (time: number) => {
      if (previousTime === undefined) {
        previousTime = time;
      }

      const elapsed = time - previousTime;
      previousTime = time;
      const nextProgress = Math.min(
        100,
        progressRef.current + (elapsed / fillDurationMs) * 100,
      );

      updateProgress(nextProgress);

      if (nextProgress < 100) {
        animationFrame = requestAnimationFrame(fill);
      } else {
        setIsFilling(false);
      }
    };

    animationFrame = requestAnimationFrame(fill);

    return () => cancelAnimationFrame(animationFrame);
  }, [fillDurationMs, isFilling, updateProgress]);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    startFilling();
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopFilling();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      startFilling();
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      stopFilling();
    }
  };

  const roundedProgress = Math.round(progress);
  const isComplete = roundedProgress === 100;
  const status = isComplete
    ? "Mold ready"
    : isFilling
      ? "Scooping sand…"
      : progress > 0
        ? `${roundedProgress}% filled · hold to continue`
        : "Press and hold to fill";
  const moldStyle: MoldStyle = {
    "--fill-color": fillColor,
    "--mold-mask": `url("${maskSrc}")`,
  };

  return (
    <article className={`mold-card${isComplete ? " is-complete" : ""}`}>
      <div className="mold-card__heading">
        <div>
          <p className="mold-card__eyebrow">Sand mold</p>
          <h2>{name}</h2>
        </div>
        <span className="mold-card__number" aria-hidden="true">
          {String(roundedProgress).padStart(3, "0")}
        </span>
      </div>

      <button
        className="mold-stage"
        type="button"
        aria-label={`${status} ${name} mold`}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onPointerCancel={stopFilling}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <span
          className="mold-art"
          style={{ aspectRatio, ...moldStyle }}
          aria-hidden="true"
        >
          <span
            className="mold-art__reveal"
            style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }}
          >
            <span className="mold-art__fill" />
          </span>
          <Image
            className="mold-art__outline"
            src={outlineSrc}
            alt=""
            draggable={false}
            fill
            sizes="245px"
            unoptimized
          />
        </span>
        <span className="mold-stage__hint">{status}</span>
      </button>

      <div className="mold-card__footer">
        <p>{description}</p>
        <button
          className="reset-button"
          type="button"
          onClick={reset}
          disabled={progress === 0}
        >
          Reset
        </button>
      </div>

      <div
        className="mold-progress"
        role="progressbar"
        aria-label={`${name} fill level`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={roundedProgress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
    </article>
  );
}
