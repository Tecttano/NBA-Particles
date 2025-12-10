import { Point, RegionType } from '../types';

export const createVirtualCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx };
};

export const drawArrow = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: 'left' | 'right',
  color: string
) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  const size = 25;
  const width = 20;
  if (dir === 'right') {
      ctx.moveTo(cx - width, cy - size);
      ctx.lineTo(cx + width + 10, cy);
      ctx.lineTo(cx - width, cy + size);
  } else {
      ctx.moveTo(cx + width, cy - size);
      ctx.lineTo(cx - width - 10, cy);
      ctx.lineTo(cx + width, cy + size);
  }
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = 8;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
};

export const drawTeamBadge = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    primary: string,
    secondary: string
) => {
    ctx.fillStyle = primary;
    ctx.fillRect(x, y, w / 3, h);
    ctx.fillStyle = secondary;
    ctx.fillRect(x + w / 3, y, w / 3, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + (w / 3) * 2, y, w / 3, h);
};

export const sampleCanvasPoints = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  maxWidth: number,
  maxHeight: number,
  particleCount: number,
  getRegion: (x: number, y: number) => RegionType,
  threshold: number = 128,
  step: number = 2
): Point[] => {
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const data = imageData.data;
    const points: Point[] = [];

    const scaleX = maxWidth / canvasWidth;
    const scaleY = maxHeight / canvasHeight;
    const scale = Math.min(scaleX, scaleY) * 0.95;
    const offsetX = maxWidth / 2;
    const offsetY = maxHeight / 2;

    for (let y = 0; y < canvasHeight; y += step) {
      for (let x = 0; x < canvasWidth; x += step) {
        const index = (y * canvasWidth + x) * 4;
        const alpha = data[index + 3];

        if (alpha > threshold) {
           const r = data[index];
           const g = data[index + 1];
           const b = data[index + 2];
           const color32 = (255 << 24) | (b << 16) | (g << 8) | r;
           const region = getRegion(x, y);

           points.push({
             x: (x - canvasWidth / 2) * scale + offsetX,
             y: (y - canvasHeight / 2) * scale + offsetY,
             color32: color32,
             region: region
           });
        }
      }
    }

    if (points.length > particleCount) {
        const result: Point[] = [];
        const ratio = particleCount / points.length;
        for (let i = 0; i < points.length; i++) {
            if (Math.random() < ratio && result.length < particleCount) {
                result.push(points[i]);
            }
        }
        return result;
    }

    return points;
};
