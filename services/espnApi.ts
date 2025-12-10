import { TeamStats, Player } from '../data/nbaData';
import { SimulatedPlayerStats } from '../utils/dataHelpers';

const ESPN_TO_APP: Record<string, string> = {
  '1': 'atl', '2': 'bos', '17': 'bkn', '30': 'cha', '4': 'chi',
  '5': 'cle', '6': 'dal', '7': 'den', '8': 'det', '9': 'gsw',
  '10': 'hou', '11': 'ind', '12': 'lac', '13': 'lal', '29': 'mem',
  '14': 'mia', '15': 'mil', '16': 'min', '3': 'nop', '18': 'nyk',
  '25': 'okc', '19': 'orl', '20': 'phi', '21': 'phx', '22': 'por',
  '23': 'sac', '24': 'sas', '28': 'tor', '26': 'uta', '27': 'was',
};

const APP_TO_ESPN: Record<string, string> = Object.fromEntries(
  Object.entries(ESPN_TO_APP).map(([k, v]) => [v, k])
);

const ESPN_BASE = 'https://site.api.espn.com/apis';
const ESPN_WEB_BASE = 'https://site.web.api.espn.com/apis';
const CURRENT_SEASON_YEAR = 2026;

interface ESPNStatistic {
  name: string;
  displayValue: string;
  value?: number;
}

interface ESPNAthlete {
  id: string;
  fullName: string;
  displayName: string;
  jersey?: string;
  position?: { abbreviation: string };
}

interface ESPNAthleteStatsResponse {
  categories?: Array<{
    name: string;
    labels: string[];
    statistics: Array<{
      season: { year: number };
      stats: string[];
    }>;
  }>;
}

export const fetchTeamStats = async (): Promise<Record<string, TeamStats>> => {
  const response = await fetch(`${ESPN_BASE}/v2/sports/basketball/nba/standings`);
  if (!response.ok) throw new Error(`ESPN API error: ${response.status}`);

  const data = await response.json();
  const result: Record<string, TeamStats> = {};

  for (const conference of data.children || []) {
    for (const entry of conference.standings?.entries || []) {
      const espnId = entry.team?.id;
      const appId = ESPN_TO_APP[espnId];
      if (!appId) continue;

      const getStatValue = (name: string): string => {
        const stat = entry.stats?.find((s: ESPNStatistic) => s.name === name);
        return stat?.displayValue || '0';
      };

      const getStatNum = (name: string): number => {
        const stat = entry.stats?.find((s: ESPNStatistic) => s.name === name);
        return stat?.value ?? 0;
      };

      const wins = getStatNum('wins');
      const losses = getStatNum('losses');
      const ppg = getStatValue('avgPointsFor');
      const oppPpg = getStatValue('avgPointsAgainst');
      const diff = getStatNum('differential');

      const offRtg = (parseFloat(ppg) * 1.02).toFixed(1);
      const defRtg = (parseFloat(oppPpg) * 1.02).toFixed(1);

      result[appId] = {
        wins,
        losses,
        ppg,
        offRtg,
        defRtg,
        netRtg: diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1),
        efg: '53.0%',
        oppEfg: '53.0%',
        threeP: '36.0%',
      };
    }
  }

  return result;
};

export const fetchTeamRoster = async (teamId: string): Promise<Player[]> => {
  const espnId = APP_TO_ESPN[teamId];
  if (!espnId) return [];

  const response = await fetch(`${ESPN_BASE}/site/v2/sports/basketball/nba/teams/${espnId}/roster`);
  if (!response.ok) throw new Error(`ESPN roster API error: ${response.status}`);

  const data = await response.json();
  const athletes: ESPNAthlete[] = data.athletes || [];

  return athletes.slice(0, 10).map(athlete => {
    const name = athlete.displayName || athlete.fullName || 'Unknown';
    return {
      name: name.length > 15 ? name.split(' ').map((n, i) => i === 0 ? n[0] + '.' : n).join(' ') : name,
      pos: athlete.position?.abbreviation || 'F',
      num: athlete.jersey || '0',
    };
  });
};

const fetchAthleteStats = async (athleteId: string): Promise<SimulatedPlayerStats | null> => {
  try {
    const response = await fetch(`${ESPN_WEB_BASE}/common/v3/sports/basketball/nba/athletes/${athleteId}/stats`);
    if (!response.ok) return null;

    const data: ESPNAthleteStatsResponse = await response.json();
    const averages = data.categories?.find(c => c.name === 'averages');
    if (!averages) return null;

    const currentSeason = averages.statistics?.find(s => s.season?.year === CURRENT_SEASON_YEAR);
    if (!currentSeason) return null;

    const labels = averages.labels;
    const stats = currentSeason.stats;

    const getStat = (label: string): string => {
      const idx = labels.indexOf(label);
      return idx >= 0 && stats[idx] ? stats[idx] : '0.0';
    };

    const getStatWithPercent = (label: string): string => {
      const val = getStat(label);
      return val.includes('%') ? val : `${val}%`;
    };

    const parseAttempts = (label: string): number => {
      const val = getStat(label);
      const parts = val.split('-');
      return parts.length === 2 ? parseFloat(parts[1]) || 0 : 0;
    };

    const pts = parseFloat(getStat('PTS')) || 0;
    const fga = parseAttempts('FG');
    const fta = parseAttempts('FT');
    const tsValue = fga + fta > 0 ? (pts / (2 * (fga + 0.44 * fta))) * 100 : 0;
    const ts = tsValue > 0 ? `${tsValue.toFixed(1)}%` : '—';

    return {
      mpg: getStat('MIN'),
      ppg: getStat('PTS'),
      apg: getStat('AST'),
      rpg: getStat('REB'),
      bpg: getStat('BLK'),
      spg: getStat('STL'),
      tov: getStat('TO'),
      pf: getStat('PF'),
      fg: getStatWithPercent('FG%'),
      threeP: getStatWithPercent('3P%'),
      ft: getStatWithPercent('FT%'),
      per: '—',
      ts,
      vorp: '—',
      ws: '—',
      ows: '—',
      dws: '—',
    };
  } catch {
    return null;
  }
};

export const fetchPlayerStats = async (teamId: string): Promise<Record<string, SimulatedPlayerStats>> => {
  const espnId = APP_TO_ESPN[teamId];
  if (!espnId) return {};

  const rosterResponse = await fetch(`${ESPN_BASE}/site/v2/sports/basketball/nba/teams/${espnId}/roster`);
  if (!rosterResponse.ok) return {};

  const rosterData = await rosterResponse.json();
  const athletes: ESPNAthlete[] = rosterData.athletes || [];
  const result: Record<string, SimulatedPlayerStats> = {};

  const fetchPromises = athletes.slice(0, 10).map(async (athlete) => {
    const name = (athlete.displayName || athlete.fullName || '').toLowerCase();
    if (!name || !athlete.id) return;

    const stats = await fetchAthleteStats(athlete.id);
    if (stats) result[name] = stats;
  });

  await Promise.all(fetchPromises);
  return result;
};

export interface ESPNData {
  teamStats: Record<string, TeamStats>;
  rosters: Record<string, Player[]>;
}

export const fetchAllESPNData = async (): Promise<ESPNData> => {
  const teamStats = await fetchTeamStats();
  const rosters: Record<string, Player[]> = {};
  return { teamStats, rosters };
};
