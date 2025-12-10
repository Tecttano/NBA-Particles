import { Point, RegionType } from '../types';
import { PARTICLE_COUNT, TEAMS } from '../constants';
import { createVirtualCanvas, sampleCanvasPoints } from './samplerHelpers';

const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${url}`));
        img.src = url;
    });
};

export const sampleGridLayout = (maxWidth: number, maxHeight: number): Promise<Point[]> => {
  return new Promise(async (resolve) => {
    const cols = 5;
    const rows = 6;
    const cellW = 200;
    const cellH = 200;
    const canvasWidth = cols * cellW;
    const canvasHeight = rows * cellH;

    const { ctx } = createVirtualCanvas(canvasWidth, canvasHeight);
    if (!ctx) { resolve([]); return; }

    const imagePromises = TEAMS.map(t => loadImage(t.logoUrl).catch(() => null));
    const images = await Promise.all(imagePromises);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    images.forEach((img, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;

        if (!img) {
            ctx.fillStyle = TEAMS[index].colorPrimary;
            ctx.font = '900 60px Inter, system-ui, sans-serif';
            ctx.fillText(TEAMS[index].abbreviation, cx, cy);
            return;
        }

        const size = 140;
        const aspect = img.width / img.height;
        let dw = size;
        let dh = size;
        if (aspect > 1) dh = size / aspect;
        else dw = size * aspect;

        ctx.drawImage(img, cx - dw/2, cy - dh/2, dw, dh);
    });

    const points = sampleCanvasPoints(
        ctx,
        canvasWidth,
        canvasHeight,
        maxWidth,
        maxHeight,
        PARTICLE_COUNT,
        (x, y) => {
           const c = Math.floor(x / cellW);
           const rIdx = Math.floor(y / cellH);
           const teamIndex = rIdx * cols + c;
           if (teamIndex >= 0 && teamIndex < TEAMS.length) return `team_${teamIndex}`;
           return 'none';
        },
        100
    );

    resolve(points);
  });
};
