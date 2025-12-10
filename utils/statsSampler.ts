import { Point, RegionType, Team } from '../types';
import { PARTICLE_COUNT } from '../constants';
import { TeamStats } from '../data/nbaData';
import { createVirtualCanvas, drawArrow, drawTeamBadge, sampleCanvasPoints } from './samplerHelpers';

export const sampleStatsLayout = (
  team: Team,
  page: number,
  maxWidth: number,
  maxHeight: number,
  stats?: TeamStats
): Promise<Point[]> => {
  return new Promise((resolve) => {
    const canvasWidth = 800;
    const canvasHeight = 1000;
    const { ctx } = createVirtualCanvas(canvasWidth, canvasHeight);
    if (!ctx) { resolve([]); return; }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const teamStats = stats || {
        wins: 0, losses: 0, ppg: '0', offRtg: '0', defRtg: '0', netRtg: '0', efg: '0%', oppEfg: '0%', threeP: '0%'
    };

    const startY = 150;
    const gap = 190;

    if (page === 1) {
        drawStatRow(ctx, canvasWidth, startY, 'RECORD', `${teamStats.wins}-${teamStats.losses}`, '#ffffff');
        drawStatRow(ctx, canvasWidth, startY + gap, 'PPG', teamStats.ppg, '#ffffff');
        drawStatRow(ctx, canvasWidth, startY + gap * 2, 'OFF RTG', teamStats.offRtg, '#ffffff');
        drawStatRow(ctx, canvasWidth, startY + gap * 3, 'DEF RTG', teamStats.defRtg, '#ffffff');
        drawArrow(ctx, canvasWidth - 100, 920, 'right', team.colorPrimary);
    } else {
        const netVal = parseFloat(teamStats.netRtg);
        const netColor = netVal > 0 ? '#4ade80' : (netVal < 0 ? '#f87171' : '#ffffff');

        drawStatRow(ctx, canvasWidth, startY, 'NET RTG', teamStats.netRtg, netColor);
        drawStatRow(ctx, canvasWidth, startY + gap, 'EFF FG%', teamStats.efg, '#ffffff');
        drawStatRow(ctx, canvasWidth, startY + gap * 2, 'OPP EFF FG%', teamStats.oppEfg, '#ffffff');
        drawStatRow(ctx, canvasWidth, startY + gap * 3, '3PT %', teamStats.threeP, '#ffffff');
    }

    drawArrow(ctx, 100, 920, 'left', team.colorPrimary);

    const badgeW = 90;
    const badgeX = (canvasWidth - badgeW) / 2;
    const badgeY = 890;
    drawTeamBadge(ctx, badgeX, badgeY, badgeW, 60, team.colorPrimary, team.colorSecondary);

    const points = sampleCanvasPoints(
        ctx,
        canvasWidth,
        canvasHeight,
        maxWidth,
        maxHeight,
        PARTICLE_COUNT,
        (x, y) => {
           if (y >= badgeY && y <= badgeY + 60 && x >= badgeX && x <= badgeX + badgeW) return 'badge';
           if (y > 850) {
              if (page === 1 && x > canvasWidth - 200) return 'arrow_next';
              if (x < 200) return 'arrow_prev';
           }
           return 'none';
        }
    );

    resolve(points);
  });
};

const drawStatRow = (
    ctx: CanvasRenderingContext2D,
    width: number,
    y: number,
    label: string,
    value: string,
    valueColor: string
) => {
    ctx.font = '700 40px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.letterSpacing = '2px';
    ctx.fillText(label, width / 2, y - 50);

    ctx.font = '900 130px Inter, system-ui, sans-serif';
    ctx.fillStyle = valueColor;
    ctx.letterSpacing = '-4px';
    ctx.fillText(value, width / 2, y + 40);

    ctx.letterSpacing = '0px';
};
