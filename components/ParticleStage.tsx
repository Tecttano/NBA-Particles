import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ParticleMode, Point, RegionType } from '../types';
import { PARTICLE_COUNT, GRAVITY, FRICTION, SAND_COLOR_VARIANTS, SIMULATION_WIDTH } from '../constants';

interface ParticleStageProps {
  mode: ParticleMode;
  targetPoints: Point[];
  onRegionClick: (region: RegionType) => void;
}

const hexToUint32 = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (255 << 24) | (b << 16) | (g << 8) | r;
};

const BG_COLOR_32 = (255 << 24) | (0x2a << 16) | (0x17 << 8) | 0x0f;

const ParticleStage: React.FC<ParticleStageProps> = ({ mode, targetPoints, onRegionClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  const count = PARTICLE_COUNT;
  const xRef = useRef(new Float32Array(count));
  const yRef = useRef(new Float32Array(count));
  const vxRef = useRef(new Float32Array(count));
  const vyRef = useRef(new Float32Array(count));
  const colorRef = useRef(new Uint32Array(count));
  const baseColorRef = useRef(new Uint32Array(count));
  const easeRef = useRef(new Float32Array(count));
  const regionRef = useRef<RegionType[]>(new Array(count).fill('none'));

  const indicesRef = useRef(new Int32Array(count));
  const gridRef = useRef<Int32Array | null>(null);

  const targetXRef = useRef(new Float32Array(count));
  const targetYRef = useRef(new Float32Array(count));
  const targetColorRef = useRef(new Uint32Array(count));

  const sandColorsRef = useRef<number[]>([]);
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const widthRef = useRef(SIMULATION_WIDTH);
  const heightRef = useRef(600);

  useEffect(() => {
    sandColorsRef.current = SAND_COLOR_VARIANTS.map(hexToUint32);
    for (let i = 0; i < count; i++) indicesRef.current[i] = i;
  }, []);

  const resetSimulation = useCallback((w: number, h: number, fullReset: boolean) => {
    widthRef.current = w;
    heightRef.current = h;
    gridRef.current = new Int32Array(w * h);

    if (fullReset) {
        const x = xRef.current;
        const y = yRef.current;
        const vx = vxRef.current;
        const vy = vyRef.current;
        const color = colorRef.current;
        const baseColor = baseColorRef.current;
        const ease = easeRef.current;
        const regions = regionRef.current;

        const colors = sandColorsRef.current.length > 0 ? sandColorsRef.current : [0xFFFFFFFF];

        for (let i = 0; i < count; i++) {
          x[i] = Math.random() * w;
          y[i] = Math.random() * h * 0.5;
          vx[i] = (Math.random() - 0.5) * 2;
          vy[i] = (Math.random() - 0.5) * 2;

          const c = colors[Math.floor(Math.random() * colors.length)];
          color[i] = c;
          baseColor[i] = c;

          ease[i] = 0.05 + Math.random() * 0.05;
          regions[i] = 'none';
        }
    }
  }, [count]);

  useEffect(() => {
    if (mode === ParticleMode.GRAVITY) {
       const vx = vxRef.current;
       const vy = vyRef.current;
       const regions = regionRef.current;
       for(let i=0; i<count; i++) {
          vy[i] = (Math.random() * 2) - 1;
          vx[i] = (Math.random() * 2) - 1;
          regions[i] = 'none';
       }
    }
  }, [mode, count]);

  useEffect(() => {
    if (targetPoints.length === 0) return;

    const tx = targetXRef.current;
    const ty = targetYRef.current;
    const tc = targetColorRef.current;
    const regions = regionRef.current;
    const len = targetPoints.length;

    for (let i = 0; i < count; i++) {
        const p = targetPoints[i % len];
        tx[i] = p.x;
        ty[i] = p.y;
        tc[i] = p.color32;
        regions[i] = p.region;
    }
  }, [targetPoints, count]);

  const handleInteraction = useCallback((e: React.MouseEvent, type: 'click' | 'move') => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = widthRef.current / rect.width;
    const scaleY = heightRef.current / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const x = xRef.current;
    const y = yRef.current;
    const regions = regionRef.current;

    const radius = 15;
    let hitRegion: RegionType = 'none';

    for (let i = 0; i < count; i++) {
        const dx = mouseX - x[i];
        const dy = mouseY - y[i];
        if (dx * dx + dy * dy < radius * radius) {
            const r = regions[i];
            if (r !== 'none') {
                hitRegion = r;
                break;
            }
        }
    }

    if (type === 'click') {
        if (mode === ParticleMode.GRAVITY || hitRegion !== 'none') {
            onRegionClick(hitRegion);
        }
    } else if (type === 'move') {
        canvasRef.current.style.cursor = (mode === ParticleMode.GRAVITY || hitRegion !== 'none') ? 'pointer' : 'default';
    }
  }, [mode, count, onRegionClick]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const now = performance.now();
    frameCountRef.current++;
    if (now - lastTimeRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    const width = widthRef.current;
    const height = heightRef.current;

    if (!gridRef.current || gridRef.current.length !== width * height) {
        gridRef.current = new Int32Array(width * height);
    }
    const grid = gridRef.current;
    grid.fill(0);

    const x = xRef.current;
    const y = yRef.current;
    const vx = vxRef.current;
    const vy = vyRef.current;
    const color = colorRef.current;
    const indices = indicesRef.current;
    const ease = easeRef.current;

    const tx = targetXRef.current;
    const ty = targetYRef.current;
    const tc = targetColorRef.current;

    const isShapeMode = mode === ParticleMode.SHAPE && targetPoints.length > 0;

    if (!isShapeMode) {
        indices.sort((a, b) => y[b] - y[a]);
    }

    const imageData = ctx.createImageData(width, height);
    const buf32 = new Uint32Array(imageData.data.buffer);
    buf32.fill(BG_COLOR_32);

    for (let k = 0; k < count; k++) {
       const i = isShapeMode ? k : indices[k];

       if (isShapeMode) {
          const destX = tx[i];
          const destY = ty[i];
          const dx = destX - x[i];
          const dy = destY - y[i];

          vx[i] += dx * ease[i];
          vy[i] += dy * ease[i];

          vx[i] *= 0.60;
          vy[i] *= 0.60;

          x[i] += vx[i];
          y[i] += vy[i];

          if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
             color[i] = tc[i];
          }

       } else {
          vy[i] += GRAVITY;
          vx[i] *= FRICTION;
          if (vy[i] > 9) vy[i] = 9;

          let nextX = x[i] + vx[i];
          let nextY = y[i] + vy[i];

          if (nextX < 0) { nextX = 0; vx[i] *= -0.5; }
          if (nextX >= width - 1) { nextX = width - 1; vx[i] *= -0.5; }
          if (nextY >= height - 1) {
              nextY = height - 1;
              vy[i] = 0;
              vx[i] *= 0.5;
          }

          let iX = Math.round(nextX);
          let iY = Math.round(nextY);

          if (iX < 0) iX = 0; if (iX >= width) iX = width - 1;
          if (iY < 0) iY = 0; if (iY >= height) iY = height - 1;

          const idx = iY * width + iX;

          if (grid[idx] !== 0) {
              const canSlideLeft = (iX > 0) && (grid[iY * width + (iX - 1)] === 0);
              const canSlideRight = (iX < width - 1) && (grid[iY * width + (iX + 1)] === 0);

              let slid = false;
              if (canSlideLeft && canSlideRight) {
                  if (Math.random() < 0.5) { iX--; vx[i] -= 0.5; } else { iX++; vx[i] += 0.5; }
                  slid = true;
              } else if (canSlideLeft) {
                  iX--; vx[i] -= 0.5; slid = true;
              } else if (canSlideRight) {
                  iX++; vx[i] += 0.5; slid = true;
              }

              if (slid) {
                  x[i] = iX; y[i] = iY;
              } else {
                  x[i] = Math.round(x[i]); y[i] = Math.round(y[i]);
                  vx[i] = 0; vy[i] = 0;
                  iX = Math.round(x[i]); iY = Math.round(y[i]);
              }
          } else {
              x[i] = nextX; y[i] = nextY;
          }

          if (iX >= 0 && iX < width && iY >= 0 && iY < height) {
              grid[iY * width + iX] = 1;
          }
       }

       const px = Math.round(x[i]);
       const py = Math.round(y[i]);

       if (px >= 0 && px < width && py >= 0 && py < height) {
           buf32[py * width + px] = color[i];
       }
    }

    ctx.putImageData(imageData, 0, 0);
    requestRef.current = requestAnimationFrame(animate);

  }, [mode, targetPoints, count]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width: clientWidth, height: clientHeight } = containerRef.current.getBoundingClientRect();
        if (clientWidth === 0) return;
        const simWidth = SIMULATION_WIDTH;
        const aspect = clientHeight / clientWidth;
        const simHeight = Math.floor(simWidth * aspect);
        if (Math.abs(simHeight - heightRef.current) > 2) {
            resetSimulation(simWidth, simHeight, false);
            canvasRef.current.width = simWidth;
            canvasRef.current.height = simHeight;
        }
      }
    };
    handleResize();
    resetSimulation(SIMULATION_WIDTH, 600, true);
    setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resetSimulation]);

  useEffect(() => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full bg-slate-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        onClick={(e) => handleInteraction(e, 'click')}
        onMouseMove={(e) => handleInteraction(e, 'move')}
        className="block w-full h-full [image-rendering:pixelated]"
      />
      <div className="absolute top-4 right-4 text-xs font-mono text-slate-500 bg-slate-900/50 p-1 rounded pointer-events-none z-50">
        FPS: {fps} | Particles: {PARTICLE_COUNT}
      </div>
    </div>
  );
};

export default ParticleStage;
