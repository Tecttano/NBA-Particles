import { Point, RegionType } from '../types';
import { PARTICLE_COUNT } from '../constants';
import { createVirtualCanvas, drawArrow, sampleCanvasPoints } from './samplerHelpers';

export const sampleTeamLayout = (
  imageUrl: string,
  primaryColor: string,
  maxWidth: number,
  maxHeight: number
): Promise<Point[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvasWidth = 600;
      const canvasHeight = 900;
      const { ctx } = createVirtualCanvas(canvasWidth, canvasHeight);
      if (!ctx) { resolve([]); return; }

      const logoSize = 400;
      const logoY = 20;

      const aspect = img.width / img.height;
      let drawW = logoSize;
      let drawH = logoSize;
      if (aspect > 1) drawH = logoSize / aspect;
      else drawW = logoSize * aspect;

      const finalLogoX = (canvasWidth - drawW) / 2;
      const finalLogoY = logoY + (logoSize - drawH) / 2;

      ctx.drawImage(img, finalLogoX, finalLogoY, drawW, drawH);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const drawMenuText = (text: string, y: number) => {
         ctx.font = '900 80px Inter, system-ui, sans-serif';
         ctx.strokeStyle = '#FFFFFF';
         ctx.lineWidth = 12;
         ctx.lineJoin = 'round';
         ctx.strokeText(text, canvasWidth / 2, y);
         ctx.fillStyle = primaryColor;
         ctx.fillText(text, canvasWidth / 2, y);
      };

      drawMenuText('TEAM STATS', 550);
      drawMenuText('PLAYERS', 680);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(canvasWidth / 2 - 52, 608, 104, 8);
      ctx.fillStyle = primaryColor;
      ctx.fillRect(canvasWidth / 2 - 50, 610, 100, 4);

      drawArrow(ctx, canvasWidth/2, 820, 'left', primaryColor);

      const points = sampleCanvasPoints(
        ctx,
        canvasWidth,
        canvasHeight,
        maxWidth,
        maxHeight,
        PARTICLE_COUNT,
        (x, y) => {
             if (y > 480 && y < 615) return 'stats';
             else if (y >= 615 && y < 750) return 'players';
             else if (y >= 750) return 'back_home';
             return 'logo';
        }
      );

      resolve(points);
    };

    img.onerror = () => {
        console.error("Failed to load logo image");
        resolve([]);
    };

    img.src = imageUrl;
  });
};
