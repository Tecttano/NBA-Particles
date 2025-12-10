import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { TeamStats, Player } from '../data/nbaData';
import { fetchAllESPNData, fetchTeamRoster, fetchPlayerStats as fetchESPNPlayerStats } from '../services/espnApi';
import { SimulatedPlayerStats } from '../utils/dataHelpers';

interface NBADataContextValue {
  teamStats: Record<string, TeamStats>;
  rosters: Record<string, Player[]>;
  getRoster: (teamId: string) => Promise<Player[]>;
  getPlayerStats: (playerName: string, teamId: string, rosterIndex: number) => Promise<SimulatedPlayerStats | null>;
  prefetchPlayerStats: (teamId: string) => void;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

const NBADataContext = createContext<NBADataContextValue | null>(null);

interface NBADataProviderProps {
  children: ReactNode;
}

export const NBADataProvider: React.FC<NBADataProviderProps> = ({ children }) => {
  const [teamStats, setTeamStats] = useState<Record<string, TeamStats>>({});
  const [rosters, setRosters] = useState<Record<string, Player[]>>({});
  const [playerStatsCache, setPlayerStatsCache] = useState<Record<string, Record<string, SimulatedPlayerStats>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAllESPNData();
      setTeamStats(data.teamStats);
      setRosters(data.rosters);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch NBA data'));
      console.error('Failed to fetch NBA data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRoster = useCallback(async (teamId: string): Promise<Player[]> => {
    if (rosters[teamId] && rosters[teamId].length > 0) {
      return rosters[teamId];
    }

    try {
      const roster = await fetchTeamRoster(teamId);
      setRosters(prev => ({ ...prev, [teamId]: roster }));
      return roster;
    } catch (err) {
      console.error(`Failed to fetch roster for ${teamId}:`, err);
      throw err;
    }
  }, [rosters]);

  const getPlayerStats = useCallback(async (
    playerName: string,
    teamId: string,
    rosterIndex: number
  ): Promise<SimulatedPlayerStats | null> => {
    if (playerStatsCache[teamId]) {
      const searchName = playerName.toLowerCase();
      if (playerStatsCache[teamId][searchName]) {
        return playerStatsCache[teamId][searchName];
      }
      const lastName = searchName.split(' ').pop() || searchName;
      const teamCache = playerStatsCache[teamId];
      for (const [name, stats] of Object.entries(teamCache) as [string, SimulatedPlayerStats][]) {
        if (name.includes(lastName)) {
          return stats;
        }
      }
    }

    try {
      const teamPlayerStats = await fetchESPNPlayerStats(teamId);
      setPlayerStatsCache(prev => ({ ...prev, [teamId]: teamPlayerStats }));

      const searchName = playerName.toLowerCase();
      if (teamPlayerStats[searchName]) {
        return teamPlayerStats[searchName];
      }
      const lastName = searchName.split(' ').pop() || searchName;
      for (const [name, stats] of Object.entries(teamPlayerStats)) {
        if (name.includes(lastName)) {
          return stats;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch player stats for ${teamId}:`, err);
    }

    return null;
  }, [playerStatsCache]);

  const prefetchPlayerStats = useCallback((teamId: string) => {
    if (playerStatsCache[teamId]) return;
    fetchESPNPlayerStats(teamId)
      .then(stats => setPlayerStatsCache(prev => ({ ...prev, [teamId]: stats })))
      .catch(() => {});
  }, [playerStatsCache]);

  const value: NBADataContextValue = {
    teamStats,
    rosters,
    getRoster,
    getPlayerStats,
    prefetchPlayerStats,
    loading,
    error,
    refetch: fetchData,
  };

  return (
    <NBADataContext.Provider value={value}>
      {children}
    </NBADataContext.Provider>
  );
};

export const useNBAData = (): NBADataContextValue => {
  const context = useContext(NBADataContext);
  if (!context) {
    throw new Error('useNBAData must be used within an NBADataProvider');
  }
  return context;
};
