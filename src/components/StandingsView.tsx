import React, { useState } from 'react';
import {
  DriverPublic,
  PointsConfig,
  RallyRound,
  Team,
  UserRole,
} from '../types/aerc';
import {
  calculateDriverStandings,
  calculateTeamStandings,
} from '../utils/championshipEngine';
import { Share2, Download, ChevronRight, SlidersHorizontal, ArrowUpRight } from 'lucide-react';

interface StandingsViewProps {
  drivers: DriverPublic[];
  teams: Team[];
  rounds: RallyRound[];
  pointsConfig: PointsConfig;
  onUpdatePointsConfig: (cfg: PointsConfig) => void;
  onSelectDriver: (driverId: string) => void;
  onNavigateToRound: (roundId: string) => void;
  onNavigateToRegister: () => void;
  onNavigateToControl: () => void;
  onOpenShareGraphics: (roundId?: string) => void;
  currentRole: UserRole;
}

export const StandingsView: React.FC<StandingsViewProps> = ({
  drivers,
  teams,
  rounds,
  pointsConfig,
  onUpdatePointsConfig,
  onSelectDriver,
  onNavigateToRound,
  onNavigateToRegister,
  onNavigateToControl,
  onOpenShareGraphics,
}) => {
  const [championshipTab, setChampionshipTab] = useState<'drivers' | 'teams'>('drivers');
  const [platformFilter, setPlatformFilter] = useState<string>('All');
  const [controlsFilter, setControlsFilter] = useState<string>('All');
  const [nationalityFilter, setNationalityFilter] = useState<string>('All');
  const [showRulesDrawer, setShowRulesDrawer] = useState<boolean>(false);

  const completedRounds = rounds
    .filter((r) => r.status === 'Completed')
    .sort((a, b) => a.roundNumber - b.roundNumber);

  const nextOpenRound = rounds.find((r) => r.status === 'Registration Open') || rounds[rounds.length - 1];

  const driverStandings = calculateDriverStandings(
    drivers,
    teams,
    rounds,
    pointsConfig,
    {
      platform: platformFilter,
      controls: controlsFilter,
      nationality: nationalityFilter,
    }
  );

  const teamStandings = calculateTeamStandings(drivers, teams, rounds, pointsConfig);

  const uniqueCountries = Array.from(new Set(drivers.map((d) => d.nationality))).sort();

  const handleExportStandingsCsv = () => {
    const headers = [
      'Pos',
      'CarNumber',
      'Driver',
      'RacenetID',
      'Nationality',
      'Team',
      'Platform',
      'Controls',
      'Starts',
      'Wins',
      'Podiums',
      'PowerStageWins',
      'PenaltyPts',
      'NetPoints',
    ];
    const rows = driverStandings.map((r) =>
      [
        r.rank,
        `#${r.driver.number}`,
        `"${r.driver.fullName}"`,
        r.driver.racenetName,
        r.driver.nationality,
        `"${r.teamName}"`,
        r.driver.platform,
        `"${r.driver.controls}"`,
        r.roundsEntered,
        r.wins,
        r.podiums,
        r.powerStageWins,
        r.penaltyPoints,
        r.totalPoints,
      ].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'AERC_2026_Drivers_Standings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Motorsport Asphalt Editorial Hero */}
      <section className="relative overflow-hidden rounded-lg border border-[#222731] bg-[#12161D]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Column: Championship Briefing & Primary Actions */}
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#9CA3AF] mb-3">
                <span className="text-[#F59E0B] font-semibold">Esports Commission Pilot</span>
                <span aria-hidden="true">·</span>
                <span>Sim Racing Kenya</span>
                <span aria-hidden="true">·</span>
                <span>EA Sports WRC (Rally1 Hybrid)</span>
              </div>

              <h1
                className="font-display text-4xl sm:text-5xl lg:text-[54px] font-extrabold uppercase tracking-tight text-[#F4F5F7] leading-[1.03]"
                style={{ textWrap: 'balance' }}
              >
                African Esports Rally Championship
              </h1>

              <p className="mt-4 text-sm sm:text-base text-[#9CA3AF] max-w-2xl leading-relaxed">
                Unified championship timing, automated EA Racenet CSV ingestion, and permanent career records. Replaces manual spreadsheets, manual name matching, and fragile hidden columns with verified stage telemetry.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-[#222731] flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                New Driver Onboarding ({nextOpenRound.name})
              </button>
              <button
                type="button"
                onClick={onNavigateToControl}
                className="px-4 py-2.5 text-xs sm:text-sm font-medium text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#374151] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Import EA Racenet CSV
              </button>
              <button
                type="button"
                onClick={() => onOpenShareGraphics(completedRounds[completedRounds.length - 1]?.id)}
                className="px-4 py-2.5 text-xs sm:text-sm font-medium text-[#9CA3AF] hover:text-[#F4F5F7] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#F59E0B]" />
                <span>Generate Social Result Cards</span>
              </button>
            </div>
          </div>

          {/* Right Column: Custom SVG Rally1 Telemetry Visual & Next Round Card */}
          <div className="lg:col-span-5 relative bg-[#0D1016] border-t lg:border-t-0 lg:border-l border-[#222731] p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
            {/* Subtle Technical Stage Elevation SVG Art */}
            <svg
              className="w-full h-36 text-[#E11D48] opacity-90"
              viewBox="0 0 500 150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Zambia Gravel Stage Elevation Telemetry Profile"
            >
              <defs>
                <linearGradient id="stageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E11D48" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#222731" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#222731" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#222731" strokeDasharray="3 3" />
              {/* Elevation Area */}
              <path
                d="M0 120 L45 102 L95 108 L150 68 L210 82 L270 38 L335 55 L395 24 L455 48 L500 32 L500 145 L0 145 Z"
                fill="url(#stageGrad)"
              />
              {/* Elevation Line */}
              <path
                d="M0 120 L45 102 L95 108 L150 68 L210 82 L270 38 L335 55 L395 24 L455 48 L500 32"
                stroke="#E11D48"
                strokeWidth="2.5"
              />
              {/* Sector timing markers */}
              <circle cx="150" cy="68" r="4" fill="#F59E0B" />
              <circle cx="270" cy="38" r="4" fill="#F59E0B" />
              <circle cx="395" cy="24" r="4" fill="#10B981" />
              <text x="140" y="55" fill="#9CA3AF" fontSize="10" fontFamily="JetBrains Mono">
                SS4 SPLIT
              </text>
              <text x="325" y="15" fill="#F4F5F7" fontSize="10" fontFamily="JetBrains Mono">
                POWER STAGE PEAK (1,340m)
              </text>
            </svg>

            <div className="mt-4 pt-4 border-t border-[#222731]">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF] mb-1">
                <span>Active Event Spotlight</span>
                <span className="font-mono text-[#F59E0B]">
                  Entries Close: {nextOpenRound.entryDeadline}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                  {nextOpenRound.name}
                </h2>
                <span className="font-mono text-xs text-[#10B981] shrink-0">
                  {nextOpenRound.registeredDriverIds.length} Registered
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#9CA3AF] font-mono">
                <span>{nextOpenRound.startDate} to {nextOpenRound.endDate}</span>
                <span aria-hidden="true">·</span>
                <span>{nextOpenRound.stagesCount} Stages</span>
                <span aria-hidden="true">·</span>
                <span>{nextOpenRound.totalDistanceKm.toFixed(1)} km ({nextOpenRound.surface})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Telemetry Strip Below Hero Split */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-[#222731] bg-[#0D1016]/90 divide-y sm:divide-y-0 sm:divide-x divide-[#222731]">
          <div className="p-4 sm:px-6">
            <div className="text-xs text-[#9CA3AF]">Publish Turnaround Time</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-xl sm:text-2xl font-bold text-[#F4F5F7] tabular-nums">
                2m 15s
              </span>
              <span className="text-xs text-[#10B981]">down from 3.5 hrs</span>
            </div>
          </div>
          <div className="p-4 sm:px-6">
            <div className="text-xs text-[#9CA3AF]">Championship Leader</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-xl sm:text-2xl font-bold uppercase text-[#F4F5F7]">
                {driverStandings[0]?.driver.fullName || 'Karan Patel'}
              </span>
              <span className="font-mono text-xs text-[#F59E0B] tabular-nums">
                {driverStandings[0]?.totalPoints || 53} PTS
              </span>
            </div>
          </div>
          <div className="p-4 sm:px-6">
            <div className="text-xs text-[#9CA3AF]">Leading Constructor Team</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-xl sm:text-2xl font-bold uppercase text-[#F4F5F7] truncate">
                {teamStandings[0]?.team.name || 'Rift Valley Simworks'}
              </span>
              <span className="font-mono text-xs text-[#E11D48] tabular-nums shrink-0">
                {teamStandings[0]?.totalPoints || 86} PTS
              </span>
            </div>
          </div>
          <div className="p-4 sm:px-6">
            <div className="text-xs text-[#9CA3AF]">Registered Rally1 Drivers</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-xl sm:text-2xl font-bold text-[#F4F5F7] tabular-nums">
                {drivers.length} Drivers
              </span>
              <span className="text-xs text-[#9CA3AF]">
                across {uniqueCountries.length} African nations
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Standings Control Toolbar */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#222731]">
          {/* Segmented Championship Mode Switcher */}
          <div className="flex items-center gap-3">
            <div
              role="tablist"
              aria-label="Championship Classification Type"
              className="inline-flex p-1 bg-[#12161D] border border-[#222731] rounded-md"
            >
              <button
                type="button"
                role="tab"
                aria-selected={championshipTab === 'drivers'}
                onClick={() => setChampionshipTab('drivers')}
                className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  championshipTab === 'drivers'
                    ? 'bg-[#E11D48] text-white'
                    : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
                }`}
              >
                Drivers' Championship ({driverStandings.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={championshipTab === 'teams'}
                onClick={() => setChampionshipTab('teams')}
                className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  championshipTab === 'teams'
                    ? 'bg-[#E11D48] text-white'
                    : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
                }`}
              >
                Teams' Championship ({teamStandings.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowRulesDrawer(!showRulesDrawer)}
              className="px-3 py-2 text-xs font-medium text-[#9CA3AF] hover:text-[#F4F5F7] bg-[#12161D] border border-[#222731] rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Scoring & Dropped Rounds</span>
            </button>
          </div>

          {/* Class Table Filters (Platform, Controls, Country) + Export */}
          {championshipTab === 'drivers' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="filter-platform" className="text-xs text-[#9CA3AF]">
                  Platform:
                </label>
                <select
                  id="filter-platform"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="bg-[#12161D] border border-[#222731] rounded px-2.5 py-1.5 text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                >
                  <option value="All">All Platforms</option>
                  <option value="PC">PC</option>
                  <option value="PlayStation">PlayStation</option>
                  <option value="Xbox">Xbox</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="filter-controls" className="text-xs text-[#9CA3AF]">
                  Controls:
                </label>
                <select
                  id="filter-controls"
                  value={controlsFilter}
                  onChange={(e) => setControlsFilter(e.target.value)}
                  className="bg-[#12161D] border border-[#222731] rounded px-2.5 py-1.5 text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                >
                  <option value="All">All Controls</option>
                  <option value="Wheel & Pedals">Wheel & Pedals</option>
                  <option value="Controller">Controller</option>
                  <option value="Keyboard">Keyboard</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="filter-country" className="text-xs text-[#9CA3AF]">
                  Country:
                </label>
                <select
                  id="filter-country"
                  value={nationalityFilter}
                  onChange={(e) => setNationalityFilter(e.target.value)}
                  className="bg-[#12161D] border border-[#222731] rounded px-2.5 py-1.5 text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                >
                  <option value="All">All Nations</option>
                  {uniqueCountries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportStandingsCsv}
                className="px-3 py-1.5 text-xs font-medium text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#374151] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          )}
        </div>

        {/* Configurable Points & Dropped Rounds Panel */}
        {showRulesDrawer && (
          <div className="p-5 bg-[#12161D] border border-[#222731] rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#222731]">
              <div>
                <h3 className="text-sm font-semibold text-[#F4F5F7]">
                  AERC Championship Points & Tiebreaker Configuration
                </h3>
                <p className="text-xs text-[#9CA3AF]">
                  FIA WRC Rally1 scale with Power Stage bonus points (Top 5), steward penalties, and configurable dropped rounds.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="dropped-rounds-select" className="text-xs text-[#9CA3AF]">
                  Dropped Rounds Rule:
                </label>
                <select
                  id="dropped-rounds-select"
                  value={pointsConfig.droppedRoundsCount}
                  onChange={(e) =>
                    onUpdatePointsConfig({
                      ...pointsConfig,
                      droppedRoundsCount: parseInt(e.target.value, 10),
                    })
                  }
                  className="bg-[#090B0E] border border-[#222731] rounded px-3 py-1.5 text-xs font-mono text-[#F59E0B]"
                >
                  <option value={0}>0 Dropped Rounds (All Rounds Count)</option>
                  <option value={1}>Drop 1 Worst Round Score</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[#9CA3AF] mb-1">Overall Classification Points (P1–P10)</div>
                <div className="font-mono text-[#F4F5F7] tabular-nums">
                  {pointsConfig.positionPoints.map((pts, i) => `P${i + 1}:${pts}`).join(' · ')}
                </div>
              </div>
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[#9CA3AF] mb-1">Wolf Power Stage Bonus (PS1–PS5)</div>
                <div className="font-mono text-[#F59E0B] tabular-nums">
                  {pointsConfig.powerStagePoints.map((pts, i) => `PS${i + 1}:+${pts}`).join(' · ')}
                </div>
              </div>
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[#9CA3AF] mb-1">Teams' Championship Rule</div>
                <div className="text-[#F4F5F7]">
                  Up to <span className="font-mono text-[#10B981]">3 drivers</span> registered per team; top{' '}
                  <span className="font-mono text-[#10B981]">
                    {pointsConfig.scoringDriversPerTeamRound} finishers
                  </span>{' '}
                  score team points per round.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DRIVERS' STANDINGS TABLE */}
        {championshipTab === 'drivers' ? (
          <div className="bg-[#12161D] border border-[#222731] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#222731] bg-[#0D1016] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    <th className="py-3.5 px-4 w-14">Pos</th>
                    <th className="py-3.5 px-4">Driver & EA Racenet ID</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Team & Rally1 Car</th>
                    <th className="py-3.5 px-4 hidden lg:table-cell">Rig & Nation</th>
                    {completedRounds.map((rnd) => (
                      <th key={rnd.id} className="py-3.5 px-3 text-right font-mono">
                        <button
                          type="button"
                          onClick={() => onNavigateToRound(rnd.id)}
                          className="hover:text-[#F4F5F7] underline decoration-[#222731] underline-offset-4 cursor-pointer"
                        >
                          R{rnd.roundNumber} ({rnd.countryCode})
                        </button>
                      </th>
                    ))}
                    <th className="py-3.5 px-3 text-right hidden sm:table-cell">Wins</th>
                    <th className="py-3.5 px-3 text-right hidden sm:table-cell">PS Wins</th>
                    <th className="py-3.5 px-5 text-right text-[#F4F5F7]">Net Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222731] text-sm">
                  {driverStandings.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[#9CA3AF]">
                        No drivers match the selected class filters.{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setPlatformFilter('All');
                            setControlsFilter('All');
                            setNationalityFilter('All');
                          }}
                          className="text-[#E11D48] underline ml-1 cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    driverStandings.map((row) => {
                      const isTop3 = row.rank <= 3;
                      return (
                        <tr
                          key={row.driver.id}
                          onClick={() => onSelectDriver(row.driver.id)}
                          className="hover:bg-[#181D26] transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold tabular-nums">
                            <span
                              className={
                                row.rank === 1
                                  ? 'text-[#F59E0B]'
                                  : row.rank === 2
                                  ? 'text-[#E5E7EB]'
                                  : row.rank === 3
                                  ? 'text-[#D97706]'
                                  : 'text-[#9CA3AF]'
                              }
                            >
                              {String(row.rank).padStart(2, '0')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded flex items-center justify-center font-mono text-xs font-bold text-white shrink-0"
                                style={{ backgroundColor: row.driver.avatarColor }}
                              >
                                #{row.driver.number}
                              </div>
                              <div>
                                <div className="font-semibold text-[#F4F5F7] group-hover:text-[#E11D48] transition-colors flex items-center gap-1.5">
                                  <span>{row.driver.fullName}</span>
                                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#E11D48]" />
                                </div>
                                <div className="text-xs text-[#9CA3AF] font-mono">
                                  {row.driver.racenetName}
                                  {row.driver.claimedAccount ? ' · Verified ID' : ' · Unclaimed'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 hidden md:table-cell">
                            <div className="text-[#F4F5F7] text-xs font-medium">
                              {row.teamName}
                            </div>
                            <div className="text-xs text-[#9CA3AF]">
                              {row.driver.carMakeModel}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 hidden lg:table-cell">
                            <div className="text-xs text-[#9CA3AF]">
                              <span className="text-[#F4F5F7] font-medium">
                                {row.driver.nationality}
                              </span>{' '}
                              · {row.driver.platform} · {row.driver.controls}
                            </div>
                          </td>

                          {row.roundScores.map((rs) => (
                            <td
                              key={rs.roundId}
                              className="py-3.5 px-3 text-right font-mono text-xs tabular-nums"
                            >
                              {rs.status === 'DNF' ? (
                                <span className="text-[#EF4444]">DNF (0)</span>
                              ) : rs.status === 'DNS' || rs.status === 'DNE' ? (
                                <span className="text-[#9CA3AF]">—</span>
                              ) : (
                                <div>
                                  <span
                                    className={
                                      rs.isDropped
                                        ? 'line-through text-[#9CA3AF]'
                                        : 'text-[#F4F5F7] font-semibold'
                                    }
                                  >
                                    {rs.netPoints}
                                  </span>
                                  {rs.powerStagePoints > 0 && (
                                    <span className="text-[10px] text-[#F59E0B] ml-1">
                                      +{rs.powerStagePoints}PS
                                    </span>
                                  )}
                                  {rs.penaltyPoints > 0 && (
                                    <div
                                      title={rs.penaltyNote}
                                      className="text-[10px] text-[#EF4444]"
                                    >
                                      -{rs.penaltyPoints} PEN
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          ))}

                          <td className="py-3.5 px-3 text-right font-mono text-xs tabular-nums hidden sm:table-cell text-[#9CA3AF]">
                            {row.wins}
                          </td>

                          <td className="py-3.5 px-3 text-right font-mono text-xs tabular-nums hidden sm:table-cell text-[#F59E0B]">
                            {row.powerStageWins}
                          </td>

                          <td className="py-3.5 px-5 text-right font-mono text-base font-bold tabular-nums">
                            <span className={isTop3 ? 'text-[#F4F5F7]' : 'text-[#D1D5DB]'}>
                              {row.totalPoints}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-[#0D1016] border-t border-[#222731] flex flex-wrap items-center justify-between gap-2 text-xs text-[#9CA3AF]">
              <span>
                Click any driver row to inspect their career profile, stage timeline, and car history.
              </span>
              <span className="font-mono">
                Legend: +PS = Wolf Power Stage Bonus · -PEN = Steward Penalty Applied
              </span>
            </div>
          </div>
        ) : (
          /* TEAMS' STANDINGS TABLE */
          <div className="bg-[#12161D] border border-[#222731] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#222731] bg-[#0D1016] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    <th className="py-3.5 px-4 w-14">Pos</th>
                    <th className="py-3.5 px-4">Team & Principal</th>
                    <th className="py-3.5 px-4">Active Driver Line-Up (Max 3)</th>
                    {completedRounds.map((rnd) => (
                      <th key={rnd.id} className="py-3.5 px-3 text-right font-mono">
                        R{rnd.roundNumber} ({rnd.countryCode})
                      </th>
                    ))}
                    <th className="py-3.5 px-3 text-right">Stage Wins</th>
                    <th className="py-3.5 px-3 text-right">Podiums</th>
                    <th className="py-3.5 px-5 text-right text-[#F4F5F7]">Team Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222731] text-sm">
                  {teamStandings.map((row) => (
                    <tr key={row.team.id} className="hover:bg-[#181D26] transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-[#F59E0B] tabular-nums">
                        {String(row.rank).padStart(2, '0')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center font-mono text-xs font-bold text-white shrink-0"
                            style={{ backgroundColor: row.team.liveryColor }}
                          >
                            {row.team.shortCode}
                          </div>
                          <div>
                            <div className="font-semibold text-[#F4F5F7]">
                              {row.team.name}
                            </div>
                            <div className="text-xs text-[#9CA3AF]">
                              Principal: {row.team.managerName} · {row.team.countryCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#9CA3AF]">
                          {row.drivers.map((drv, idx) => (
                            <React.Fragment key={drv.id}>
                              <button
                                type="button"
                                onClick={() => onSelectDriver(drv.id)}
                                className="text-[#F4F5F7] hover:text-[#E11D48] underline decoration-[#222731] cursor-pointer"
                              >
                                #{drv.number} {drv.fullName}
                              </button>
                              {idx < row.drivers.length - 1 && <span aria-hidden="true">·</span>}
                            </React.Fragment>
                          ))}
                          <span className="font-mono text-[11px] text-[#10B981] ml-1">
                            ({row.drivers.length}/3 slots)
                          </span>
                        </div>
                      </td>
                      {row.roundPoints.map((rp) => (
                        <td
                          key={rp.roundId}
                          className="py-4 px-3 text-right font-mono text-xs text-[#F4F5F7] tabular-nums"
                        >
                          {rp.points}
                        </td>
                      ))}
                      <td className="py-4 px-3 text-right font-mono text-xs text-[#9CA3AF] tabular-nums">
                        {row.wins}
                      </td>
                      <td className="py-4 px-3 text-right font-mono text-xs text-[#9CA3AF] tabular-nums">
                        {row.podiums}
                      </td>
                      <td className="py-4 px-5 text-right font-mono text-base font-bold text-[#F4F5F7] tabular-nums">
                        {row.totalPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
