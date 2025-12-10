import React, { useState, useEffect, useRef } from 'react';
import ParticleStage from './components/ParticleStage';
import { ParticleMode, Point, Team, RegionType } from './types';
import { sampleTeamLayout } from './utils/logoSampler';
import { sampleStatsLayout } from './utils/statsSampler';
import { samplePlayersLayout } from './utils/playersSampler';
import { samplePlayerStatsLayout } from './utils/playerStatsSampler';
import { sampleGridLayout } from './utils/gridSampler';
import { SIMULATION_WIDTH, TEAMS } from './constants';
import { Player } from './data/nbaData';
import { useNBAData } from './contexts/NBADataContext';

const App: React.FC = () => {
  const { teamStats, rosters, getRoster, getPlayerStats, prefetchPlayerStats, loading: dataLoading, error: dataError } = useNBAData();

  const [mode, setMode] = useState<ParticleMode>(ParticleMode.SHAPE);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [targetPoints, setTargetPoints] = useState<Point[]>([]);
  const initialLoadRef = useRef(false);

  const [currentView, setCurrentView] = useState<'grid' | 'team_home' | 'stats' | 'players' | 'player_stats'>('grid');
  const [statsPage, setStatsPage] = useState(1);
  const [playersPage, setPlayersPage] = useState(1);

  const [selectedPlayer, setSelectedPlayer] = useState<{player: Player, index: number} | null>(null);
  const [playerStatsPage, setPlayerStatsPage] = useState(1);

  const [gravityReturnView, setGravityReturnView] = useState<{
    view: 'team_home' | 'stats' | 'players' | 'player_stats';
    page: number;
    player?: {player: Player, index: number};
  } | null>(null);

  const getSimulationDims = () => {
    const windowAspect = window.innerWidth / window.innerHeight;
    const simWidth = SIMULATION_WIDTH;
    const simHeight = Math.floor(simWidth / windowAspect);
    return { w: simWidth, h: simHeight };
  };

  useEffect(() => {
     if (!initialLoadRef.current && !dataLoading && !dataError) {
         initialLoadRef.current = true;
         loadGridView();
     }
  }, [dataLoading, dataError]);

  const loadGridView = async () => {
      setCurrentView('grid');
      setSelectedTeam(null);
      const { w, h } = getSimulationDims();
      try {
          const points = await sampleGridLayout(w, h);
          setTargetPoints(points);
          setMode(ParticleMode.SHAPE);
      } catch(e) {
          console.error(e);
      }
  };

  const handleSelectTeam = async (team: Team) => {
    setSelectedTeam(team);
    setCurrentView('team_home');
    setStatsPage(1);
    setPlayersPage(1);
    setSelectedPlayer(null);

    const { w, h } = getSimulationDims();

    try {
      const points = await sampleTeamLayout(team.logoUrl, team.colorPrimary, w, h);
      setTargetPoints(points);
      setMode(ParticleMode.SHAPE);
    } catch (error) {
      console.error("Failed to generate logo points", error);
    }
  };

  const loadStatsView = async (page: number) => {
      if (!selectedTeam) return;
      const { w, h } = getSimulationDims();
      try {
          const stats = teamStats[selectedTeam.id];
          const points = await sampleStatsLayout(selectedTeam, page, w, h, stats);
          setTargetPoints(points);
          setMode(ParticleMode.SHAPE);
      } catch (e) {
          console.error(e);
      }
  };

  const loadPlayersView = async (page: number) => {
      if (!selectedTeam) return;
      const { w, h } = getSimulationDims();
      try {
          const roster = await getRoster(selectedTeam.id);
          prefetchPlayerStats?.(selectedTeam.id);
          const points = await samplePlayersLayout(selectedTeam, page, w, h, roster);
          setTargetPoints(points);
          setMode(ParticleMode.SHAPE);
      } catch (e) {
          console.error(e);
      }
  };

  const loadPlayerStatsView = async (playerData: {player: Player, index: number}, page: number) => {
      if (!selectedTeam) return;
      const { w, h } = getSimulationDims();
      try {
          const realStats = await getPlayerStats(playerData.player.name, selectedTeam.id, playerData.index);
          const points = await samplePlayerStatsLayout(
             selectedTeam,
             playerData.player,
             playerData.index,
             page,
             w,
             h,
             realStats
          );
          setTargetPoints(points);
          setMode(ParticleMode.SHAPE);
      } catch (e) {
          console.error(e);
      }
  };

  const handleRegionClick = async (region: RegionType) => {
      if (mode === ParticleMode.GRAVITY && gravityReturnView) {
          const { view, page, player } = gravityReturnView;
          setGravityReturnView(null);
          if (view === 'team_home' && selectedTeam) {
              setCurrentView('team_home');
              await handleSelectTeam(selectedTeam);
          } else if (view === 'stats') {
              setCurrentView('stats');
              setStatsPage(page);
              await loadStatsView(page);
          } else if (view === 'players') {
              setCurrentView('players');
              setPlayersPage(page);
              await loadPlayersView(page);
          } else if (view === 'player_stats' && player) {
              setCurrentView('player_stats');
              setSelectedPlayer(player);
              setPlayerStatsPage(page);
              await loadPlayerStatsView(player, page);
          }
          return;
      }

      if (region === 'logo' && currentView === 'team_home') {
          setGravityReturnView({ view: 'team_home', page: 1 });
          setMode(ParticleMode.GRAVITY);
          return;
      }

      if (region === 'badge') {
          if (currentView === 'stats') {
              setGravityReturnView({ view: 'stats', page: statsPage });
          } else if (currentView === 'players') {
              setGravityReturnView({ view: 'players', page: playersPage });
          } else if (currentView === 'player_stats' && selectedPlayer) {
              setGravityReturnView({ view: 'player_stats', page: playerStatsPage, player: selectedPlayer });
          } else {
              return;
          }
          setMode(ParticleMode.GRAVITY);
          return;
      }

      if (currentView === 'grid' && typeof region === 'string' && region.startsWith('team_')) {
          const index = parseInt(region.split('_')[1]);
          const team = TEAMS[index];
          if (team) {
              handleSelectTeam(team);
          }
          return;
      }

      if (region === 'back_home') {
          loadGridView();
          return;
      }

      if (!selectedTeam) return;

      if (region === 'stats') {
          setCurrentView('stats');
          setStatsPage(1);
          await loadStatsView(1);
      } else if (region === 'players') {
          setCurrentView('players');
          setPlayersPage(1);
          await loadPlayersView(1);
      } else if (typeof region === 'string' && region.startsWith('player_')) {
          const rowIndex = parseInt(region.split('_')[1]);
          const roster = rosters[selectedTeam.id] || [];
          const ITEMS_PER_PAGE = 5;
          const actualIndex = (playersPage - 1) * ITEMS_PER_PAGE + rowIndex;

          if (roster[actualIndex]) {
              const p = roster[actualIndex];
              const pData = { player: p, index: actualIndex };
              setSelectedPlayer(pData);
              setPlayerStatsPage(1);
              setCurrentView('player_stats');
              await loadPlayerStatsView(pData, 1);
          }
      } else if (region === 'arrow_next') {
          if (currentView === 'stats') {
              const nextPage = 2;
              setStatsPage(nextPage);
              await loadStatsView(nextPage);
          } else if (currentView === 'players') {
              const nextPage = playersPage + 1;
              if (nextPage <= 3) {
                  setPlayersPage(nextPage);
                  await loadPlayersView(nextPage);
              }
          } else if (currentView === 'player_stats' && selectedPlayer) {
              const nextPage = playerStatsPage + 1;
              if (nextPage <= 3) {
                  setPlayerStatsPage(nextPage);
                  await loadPlayerStatsView(selectedPlayer, nextPage);
              }
          }
      } else if (region === 'arrow_prev') {
          if (currentView === 'stats') {
              if (statsPage === 2) {
                  setStatsPage(1);
                  await loadStatsView(1);
              } else {
                  setCurrentView('team_home');
                  handleSelectTeam(selectedTeam);
              }
          } else if (currentView === 'players') {
              if (playersPage > 1) {
                  const prevPage = playersPage - 1;
                  setPlayersPage(prevPage);
                  await loadPlayersView(prevPage);
              } else {
                  setCurrentView('team_home');
                  handleSelectTeam(selectedTeam);
              }
          } else if (currentView === 'player_stats' && selectedPlayer) {
              if (playerStatsPage > 1) {
                  const prevPage = playerStatsPage - 1;
                  setPlayerStatsPage(prevPage);
                  await loadPlayerStatsView(selectedPlayer, prevPage);
              } else {
                  setCurrentView('players');
                  await loadPlayersView(playersPage);
              }
          }
      }
  };

  if (dataError) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 text-6xl mb-4">!</div>
          <p className="text-red-400 text-lg font-semibold mb-2">Failed to load NBA data</p>
          <p className="text-slate-400 text-sm">{dataError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <div className="relative flex-1 h-full w-full">
        <ParticleStage
            mode={mode}
            targetPoints={targetPoints}
            onRegionClick={handleRegionClick}
        />
        <div className="md:hidden absolute top-0 left-0 right-0 z-30 p-3 bg-slate-900/90 backdrop-blur-md flex justify-between items-center border-b border-slate-700 shadow-lg pointer-events-none">
           <span className="font-bold text-amber-500 tracking-tight">NBA Particles</span>
        </div>
      </div>
    </div>
  );
};

export default App;
