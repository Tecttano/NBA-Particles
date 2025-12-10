import { Point, RegionType, Team } from '../types';
import { PARTICLE_COUNT } from '../constants';
import { Player } from '../data/nbaData';
import { SimulatedPlayerStats } from './dataHelpers';
import { createVirtualCanvas, drawArrow, drawTeamBadge, sampleCanvasPoints } from './samplerHelpers';

export const samplePlayerStatsLayout = (
  team: Team,
  player: Player,
  rosterIndex: number,
  page: number,
  maxWidth: number,
  maxHeight: number,
  playerStats?: SimulatedPlayerStats | null
): Promise<Point[]> => {
  return new Promise((resolve) => {
    const canvasWidth = 800;
    const canvasHeight = 1000;
    const { ctx } = createVirtualCanvas(canvasWidth, canvasHeight);
    if (!ctx) { resolve([]); return; }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let fontSize = 60;
    const maxHeaderWidth = 700;
    ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;

    let textMetrics = ctx.measureText(player.name.toUpperCase());
    while (textMetrics.width > maxHeaderWidth && fontSize > 30) {
        fontSize -= 4;
        ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
        textMetrics = ctx.measureText(player.name.toUpperCase());
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillText(player.name.toUpperCase(), canvasWidth / 2, 80);

    if (!playerStats) {
        ctx.font = '700 50px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('STATS', canvasWidth / 2, canvasHeight / 2 - 40);
        ctx.fillText('UNAVAILABLE', canvasWidth / 2, canvasHeight / 2 + 40);
    } else {
        const startY = 220;
        const gap = 170;

        const drawRow = (label: string, value: string, color: string = '#ffffff', yOffset: number) => {
            ctx.font = '700 35px Inter, system-ui, sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.letterSpacing = '2px';
            ctx.fillText(label, canvasWidth / 2, yOffset - 40);

            ctx.font = '900 110px Inter, system-ui, sans-serif';
            ctx.fillStyle = color;
            ctx.letterSpacing = '-4px';
            ctx.fillText(value, canvasWidth / 2, yOffset + 40);
            ctx.letterSpacing = '0px';
        };

        if (page === 1) {
            drawRow('PTS / GAME', playerStats.ppg, '#ffffff', startY);
            drawRow('REB / GAME', playerStats.rpg, '#ffffff', startY + gap);
            drawRow('AST / GAME', playerStats.apg, '#ffffff', startY + gap * 2);
            drawRow('MIN / GAME', playerStats.mpg, '#ffffff', startY + gap * 3);
        } else if (page === 2) {
            drawRow('FG %', playerStats.fg, '#ffffff', startY);
            drawRow('3PT %', playerStats.threeP, '#ffffff', startY + gap);
            drawRow('FT %', playerStats.ft, '#ffffff', startY + gap * 2);
            drawRow('TRUE SHOOTING', playerStats.ts, '#ffffff', startY + gap * 3);
        } else if (page === 3) {
            drawRow('STL / GAME', playerStats.spg, '#ffffff', startY);
            drawRow('BLK / GAME', playerStats.bpg, '#ffffff', startY + gap);
            drawRow('TOV / GAME', playerStats.tov, '#ef4444', startY + gap * 2);
            drawRow('FOULS / GAME', playerStats.pf, '#f59e0b', startY + gap * 3);
        }
    }

    const arrowY = 940;
    if (playerStats && page < 3) drawArrow(ctx, canvasWidth - 100, arrowY, 'right', team.colorPrimary);
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
              if (page < 3 && x > canvasWidth - 200) return 'arrow_next';
              if (x < 200) return 'arrow_prev';
           }
           return 'none';
        }
    );

    resolve(points);
  });
};
