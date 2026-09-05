'use client';

import { useEffect, useRef } from 'react';

import { ramps } from '@tradetoken/design-tokens';

/**
 * The ambient field from the native app, ported honestly.
 *
 * Mobile runs an ordered-dither Skia shader. Rather than fake that with a
 * blurred CSS gradient, this does the same thing the same way: a slow value
 * noise field quantised against a 4x4 Bayer matrix into a three-stop ramp.
 *
 * It renders at one pixel per dither cell and is scaled up with
 * `image-rendering: pixelated`, so a 1440x380 banner costs about 60k pixels a
 * frame rather than 550k, and the cells stay crisp squares instead of being
 * smoothed by the browser.
 *
 * Atmosphere, never information — it sits behind figures, is `aria-hidden`, and
 * holds a single static frame under `prefers-reduced-motion`.
 */

/** Normalised 4x4 Bayer threshold matrix. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/** Cheap smooth value noise — enough structure to read as weather, not static. */
function field(x: number, y: number, t: number) {
  const a = Math.sin(x * 0.9 + t) * Math.cos(y * 0.8 - t * 0.7);
  const b = Math.sin((x + y) * 0.5 - t * 1.3);
  const c = Math.cos(x * 0.35 - y * 0.45 + t * 0.5);
  return (a + b * 0.7 + c * 0.9) / 2.6;
}

export type DitherFieldProps = {
  /** Which ramp to draw. Names the screen, not the hue. */
  ramp?: keyof typeof ramps;
  /** Dither cell size in CSS pixels. */
  cell?: number;
  /** Drift rate. Lower is calmer. */
  speed?: number;
  /** Overall opacity of the field against the page background. */
  intensity?: number;
  className?: string;
};

export function DitherField({
  ramp = 'portfolio',
  cell = 3,
  speed = 0.06,
  intensity = 1,
  className,
}: DitherFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const stops = ramps[ramp].map(hexToRgb);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let frame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.ceil(rect.width / cell));
      height = Math.max(1, Math.ceil(rect.height / cell));
      canvas.width = width;
      canvas.height = height;
    };

    const draw = (time: number) => {
      if (width === 0 || height === 0) return;
      const t = time * 0.001 * speed;
      const image = context.createImageData(width, height);
      const { data } = image;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          // Fade out toward the bottom so the field dissolves into the page
          // rather than ending at a hard edge.
          const falloff = 1 - y / height;
          const value = (field(x * 0.08, y * 0.08, t) * 0.5 + 0.5) * falloff * falloff;

          // Quantise against the Bayer threshold: this is what produces the
          // stippled banding instead of a smooth gradient.
          const threshold = BAYER[y % 4]![x % 4]!;
          const level = Math.min(
            stops.length - 1,
            Math.max(0, Math.floor(value * stops.length + threshold - 0.5)),
          );
          const [r, g, b] = stops[level]!;

          const index = (y * width + x) * 4;
          data[index] = r;
          data[index + 1] = g;
          data[index + 2] = b;
          // Darker levels stay sparse so the field reads as depth, not a wash.
          data[index + 3] = Math.round(255 * intensity * Math.min(1, value * 1.6));
        }
      }

      context.putImageData(image, 0, 0);
    };

    const loop = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(loop);
    };

    resize();
    if (reduceMotion) {
      draw(0);
    } else {
      frame = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(0);
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ramp, cell, speed, intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' }}
    />
  );
}
