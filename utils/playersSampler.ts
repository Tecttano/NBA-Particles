import { Point, RegionType, Team } from '../types';
import { PARTICLE_COUNT } from '../constants';
import { Player } from '../data/nbaData';
import { createVirtualCanvas, drawArrow, drawTeamBadge, sampleCanvasPoints } from './samplerHelpers';

export const samplePlayersLayout = (
  team: Team,
  page: number,
  maxWidth: number,
  maxHeight: number,
  roster?: Player[]
): Promise<Point[]> => {
  return new Promise((resolve) => {
    const canvasWidth = 800;
    const canvasHeight = 1000;
    const { ctx } = createVirtualCanvas(canvasWidth, canvasHeight);
    if (!ctx) { resolve([]); return; }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const teamRoster = roster || [];
    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.ceil(teamRoster.length / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = teamRoster.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const startY = 140;
    const gap = 175;

    pageItems.forEach((player, index) => {
        const y = startY + (index * gap);

        ctx.textAlign = 'right';
        ctx.font = '900 85px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText(`#${player.num}`, 130, y);

        ctx.textAlign = 'left';
        const maxNameWidth = 600;
        let fontSize = 95;
        ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.letterSpacing = '-4px';

        let textMetrics = ctx.measureText(player.name);

        while (textMetrics.width > maxNameWidth && fontSize > 40) {
            fontSize -= 5;
            ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.letterSpacing = fontSize < 70 ? '-2px' : '-4px';
            textMetrics = ctx.measureText(player.name);
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillText(player.name, 150, y);

        ctx.font = '700 45px Inter, system-ui, sans-serif';
        ctx.fillStyle = team.colorPrimary;
        ctx.letterSpacing = '1px';
        ctx.fillText(player.pos, 155, y + 55);

        ctx.letterSpacing = '0px';
    });

    const arrowY = 940;
    if (page < totalPages) drawArrow(ctx, canvasWidth - 100, arrowY, 'right', team.colorPrimary);
    drawArrow(ctx, 100, arrowY, 'left', team.colorPrimary);

    const badgeW = 90;
    const badgeX = (canvasWidth - badgeW) / 2;
    const badgeY = 915;
    drawTeamBadge(ctx, badgeX, badgeY, badgeW, 50, team.colorPrimary, team.colorSecondary);

    const points = sampleCanvasPoints(
        ctx,
        canvasWidth,
        canvasHeight,
        maxWidth,
        maxHeight,
        PARTICLE_COUNT,
        (x, y) => {
           if (y >= badgeY && y <= badgeY + 50 && x >= badgeX && x <= badgeX + badgeW) return 'badge';
           if (y > 880) {
              if (page < totalPages && x > canvasWidth - 200) return 'arrow_next';
              if (x < 200) return 'arrow_prev';
           } else {
              const relativeY = y - (startY - 80);
              if (relativeY >= 0) {
                  const rowIndex = Math.floor(relativeY / gap);
                  if (rowIndex >= 0 && rowIndex < ITEMS_PER_PAGE && rowIndex < pageItems.length) {
                      if (rowIndex === 0) return 'player_0';
                      else if (rowIndex === 1) return 'player_1';
                      else if (rowIndex === 2) return 'player_2';
                      else if (rowIndex === 3) return 'player_3';
                      else if (rowIndex === 4) return 'player_4';
                  }
              }
           }
           return 'none';
        }
    );

    resolve(points);
  });
};
