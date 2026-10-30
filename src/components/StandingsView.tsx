import React, { useMemo, useState } from 'react';
import {
  DriverPublic,
  PointsConfig,
  RallyRound,
  Team,
  UserProfile,
} from '../types/aerc';
import {
  calculateDriverStandings,
  calculateTeamStandings,
} from '../utils/championshipEngine';
import {
  Share2,
  Download,
  ArrowUpRight,
  UserPlus,
  PlusCircle,
  Calendar,
  ShieldCheck,
  Users,
} from 'lucide-react';

interface StandingsViewProps {
  drivers: DriverPublic[];
  teams: Team[];
  rounds: RallyRound[];
  pointsConfig: PointsConfig;
  onUpdatePointsConfig: (cfg: PointsConfig) => void;
  onSelectDriver: (driverId: string) => void;
  onNavigateToRound: (roundId: string) => void;
  onNavigateToRoundsTab: () => void;
  onNavigateToDriversTab: () => void;
  onNavigateToRegister: () => void;
  onNavigateToControl: () => void;
  onOpenShareGraphics: (roundId?: string) => void;
  userProfile: UserProfile | null;
  onOpenAuthModal: () => void;
}

export const StandingsView: React.FC<StandingsViewProps> = React.memo(({
  drivers,
  teams,
  rounds,
  pointsConfig,
  onSelectDriver,
  onNavigateToRound,
  onNavigateToRoundsTab,
  onNavigateToRegister,
  onNavigateToControl,
  onOpenShareGraphics,
  userProfile,
}) => {
  const [championshipTab, setChampionshipTab] = useState<'drivers' | 'teams'>(
    'drivers'
  );
  const [platformFilter, setPlatformFilter] = useState<string>('All');
  const [controlsFilter, setControlsFilter] = useState<string>('All');
  const [nationalityFilter, setNationalityFilter] = useState<string>('All');

  const completedRounds = useMemo(
    () =>
      rounds
        .filter((r) => r.status === 'Completed')
        .sort((a, b) => a.roundNumber - b.roundNumber),
    [rounds]
  );

  const nextOpenRound = useMemo(
    () =>
      rounds.find((r) => r.status === 'Registration Open') ||
      rounds[rounds.length - 1],
    [rounds]
  );

  const driverStandings = useMemo(
    () =>
      calculateDriverStandings(drivers, teams, rounds, pointsConfig, {
        platform: platformFilter,
        controls: controlsFilter,
        nationality: nationalityFilter,
      }),
    [
      drivers,
      teams,
      rounds,
      pointsConfig,
      platformFilter,
      controlsFilter,
      nationalityFilter,
    ]
  );

  const teamStandings = useMemo(
    () => calculateTeamStandings(drivers, teams, rounds, pointsConfig),
    [drivers, teams, rounds, pointsConfig]
  );

  const uniqueCountries = useMemo(
    () => Array.from(new Set(drivers.map((d) => d.nationality))).sort(),
    [drivers]
  );

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
    link.setAttribute('download', 'AERC_Drivers_Standings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Focused Championship Header */}
      <section className="rounded-lg border border-[#222731] bg-[#12161D] p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#9CA3AF]">
              <span className="text-[#F59E0B] font-semibold">
                Esports Commission
              </span>
              <span aria-hidden="true">·</span>
              <span>Sim Racing Kenya</span>
              <span aria-hidden="true">·</span>
              <span>EA Sports WRC (Rally1 Hybrid)</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-[#F4F5F7]">
              African Esports Rally Championship
            </h1>

            <p className="text-sm text-[#9CA3AF] max-w-2xl">
              Official Drivers' and Teams' Championship standings, rally calendar, and team line-ups.
            </p>
          </div>

          {userProfile && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {userProfile.role === 'organizer' ? (
                <>
                  <button
                    type="button"
                    onClick={onNavigateToControl}
                    className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Race Control</span>
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateToRegister}
                    className="px-4 py-2.5 text-xs sm:text-sm font-medium text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#374151] transition-colors cursor-pointer"
                  >
                    Teams & Entries
                  </button>
                </>
              ) : userProfile.role === 'manager' ? (
                <button
                  type="button"
                  onClick={onNavigateToRegister}
                  className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Manage Team & Drivers</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onNavigateToRegister}
                  className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Driver Entry & Teams</span>
                </button>
              )}
              <button
                type="button"
                onClick={onNavigateToRoundsTab}
                className="px-4 py-2.5 text-xs sm:text-sm font-medium text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#374151] transition-colors cursor-pointer"
              >
                Stage Maps & Rounds ({rounds.length})
              </button>
              {drivers.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenShareGraphics(
                      completedRounds[completedRounds.length - 1]?.id
                    )
                  }
                  className="px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#9CA3AF] hover:text-[#F4F5F7] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-[#F59E0B]" />
                  <span>Share Graphics</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Concise Status Bar */}
        <div className="mt-6 pt-5 border-t border-[#222731] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-[#9CA3AF]">Drivers: </span>
              <strong className="font-mono text-[#F4F5F7] tabular-nums">
                {drivers.length}
              </strong>
            </div>
            <div>
              <span className="text-[#9CA3AF]">Teams: </span>
              <strong className="font-mono text-[#F4F5F7] tabular-nums">
                {teams.length}
              </strong>
            </div>
            <div>
              <span className="text-[#9CA3AF]">Tournaments / Rounds: </span>
              <strong className="font-mono text-[#F4F5F7] tabular-nums">
                {completedRounds.length} / {rounds.length}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#9CA3AF]">
            <Calendar className="w-3.5 h-3.5 text-[#F59E0B]" />
            {nextOpenRound ? (
              <span>
                Active Tournament Round:{' '}
                <strong className="text-[#F4F5F7]">{nextOpenRound.name}</strong>{' '}
                ({nextOpenRound.startDate})
              </span>
            ) : (
              <span>No tournament rounds scheduled yet</span>
            )}
          </div>
        </div>
      </section>

      {/* Created Tournaments & Rally Calendar Overview */}
      <section className="rounded-lg border border-[#222731] bg-[#12161D] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222731] pb-3.5">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#F4F5F7]">
              Created Tournaments & Championship Calendar ({rounds.length})
            </h2>
            <p className="text-xs text-[#9CA3AF]">
              Inspect created championship tournaments, rally stage maps, and official entry classifications.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToRoundsTab}
            className="text-xs font-semibold text-[#F59E0B] hover:text-[#F4F5F7] transition-colors self-start sm:self-auto cursor-pointer whitespace-nowrap"
          >
            View Stage Maps & Rounds →
          </button>
        </div>

        {rounds.length === 0 ? (
          <div className="py-6 text-center space-y-1.5">
            <div className="text-sm font-semibold text-[#F4F5F7]">
              No Championship Tournaments Created Yet
            </div>
            <p className="text-xs text-[#9CA3AF] max-w-lg mx-auto">
              Tournament rounds created by the Championship Organizer will appear here with their dates, surfaces, stage distances, and classification results. You can still inspect all official African rally stage maps in the Stage Maps & Rounds tab.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rounds.map((rnd) => (
              <button
                key={rnd.id}
                type="button"
                onClick={() => onNavigateToRound(rnd.id)}
                className="text-left p-4 bg-[#090B0E] border border-[#222731] rounded hover:border-[#E11D48] transition-colors space-y-2 cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs font-mono text-[#9CA3AF]">
                  <span className="text-[#F59E0B] font-semibold">
                    ROUND {rnd.roundNumber} · {rnd.countryCode}
                  </span>
                  <span>{rnd.status}</span>
                </div>
                <div className="font-display text-lg font-bold uppercase text-[#F4F5F7] group-hover:text-[#E11D48] transition-colors">
                  {rnd.name}
                </div>
                <div className="text-xs text-[#9CA3AF] font-mono">
                  {rnd.country} · {rnd.surface} · {rnd.stagesCount} Stages ({rnd.totalDistanceKm.toFixed(1)} km)
                </div>
                <div className="pt-2 border-t border-[#222731] flex items-center justify-between text-[11px] text-[#9CA3AF]">
                  <span>{rnd.startDate} – {rnd.endDate}</span>
                  <span className="text-[#10B981] font-mono">
                    {rnd.registeredDriverIds.length} Entries
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Standings Section */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Championship Classification Type"
            className="inline-flex p-1 bg-[#12161D] border border-[#222731] rounded-md self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={championshipTab === 'drivers'}
              onClick={() => setChampionshipTab('drivers')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded transition-colors cursor-pointer ${
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
              className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded transition-colors cursor-pointer ${
                championshipTab === 'teams'
                  ? 'bg-[#E11D48] text-white'
                  : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
              }`}
            >
              Teams' Championship ({teamStandings.length})
            </button>
          </div>

          {/* Only show filters when drivers exist */}
          {championshipTab === 'drivers' && drivers.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="filter-platform"
                  className="text-xs text-[#9CA3AF]"
                >
                  Platform:
                </label>
                <select
                  id="filter-platform"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="bg-[#12161D] border border-[#222731] rounded px-2.5 py-1.5 text-xs text-[#F4F5F7]"
                >
                  <option value="All">All Platforms</option>
                  <option value="PC">PC</option>
                  <option value="PlayStation">PlayStation</option>
                  <option value="Xbox">Xbox</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="filter-controls"
                  className="text-xs text-[#9CA3AF]"
                >
                  Controls:
                </label>
                <select
                  id="filter-controls"
                  value={controlsFilter}
                  onChange={(e) => setControlsFilter(e.target.value)}
                  className="bg-[#12161D] border border-[#222731] rounded px-2.5 py-1.5 text-xs text-[#F4F5F7]"
                >
                  <option value="All">All Controls</option>
                  <option value="Wheel & Pedals">Wheel & Pedals</option>
                  <option value="Controller">Controller</option>
                  <option value="Keyboard">Keyboard</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="filter-country"
                  className="text-xs text-[#9CA3AF]"
                >
                  Country:
                </label>
                <select
                  id="filter-country"
                  value={nationalityFilter}
                  onChange={(e) => setNationalityFilter(e.target.value)}
                  className="bg-[#12161D] border border-[#222731] rounded px-2.5 py-1.5 text-xs text-[#F4F5F7]"
                >
                  <option value="All">All Nations</option>
                  {uniqueCountries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {userProfile && (
                <button
                  type="button"
                  onClick={handleExportStandingsCsv}
                  className="px-3 py-1.5 text-xs font-medium text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#374151] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Standings</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* DRIVERS' STANDINGS TABLE */}
        {championshipTab === 'drivers' ? (
          <div className="bg-[#12161D] border border-[#222731] rounded-lg overflow-hidden">
            {driverStandings.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                  {drivers.length === 0
                    ? 'No Drivers Registered Yet'
                    : 'No Drivers Match Selected Filters'}
                </div>
                <p className="text-xs text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
                  {drivers.length === 0
                    ? !userProfile
                      ? 'Official driver classifications and championship points will appear here once entries are registered for the tournament.'
                      : userProfile.role === 'manager'
                      ? 'Once drivers register or link their EARC accounts, you can invite and assign them to your team.'
                      : 'Complete your driver entry or match your EARC account to appear on the championship standings.'
                    : 'Reset your platform, controls, or nationality filters to view registered drivers.'}
                </p>
                {drivers.length === 0 ? (
                  userProfile && (
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      {userProfile.role === 'manager' ? (
                        <button
                          type="button"
                          onClick={onNavigateToRegister}
                          className="px-5 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Users className="w-4 h-4" />
                          <span>Open Team Management</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onNavigateToRegister}
                          className="px-5 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Register Driver Entry</span>
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPlatformFilter('All');
                        setControlsFilter('All');
                        setNationalityFilter('All');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#E11D48] rounded cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#222731] bg-[#0D1016] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      <th className="py-3.5 px-4 w-14">Pos</th>
                      <th className="py-3.5 px-4">Driver & EA Racenet ID</th>
                      <th className="py-3.5 px-4 hidden md:table-cell">
                        Team & Rally1 Car
                      </th>
                      <th className="py-3.5 px-4 hidden lg:table-cell">
                        Rig & Nation
                      </th>
                      {completedRounds.map((rnd) => (
                        <th
                          key={rnd.id}
                          className="py-3.5 px-3 text-right font-mono"
                        >
                          <button
                            type="button"
                            onClick={() => onNavigateToRound(rnd.id)}
                            className="hover:text-[#F4F5F7] underline decoration-[#222731] underline-offset-4 cursor-pointer"
                          >
                            R{rnd.roundNumber} ({rnd.countryCode})
                          </button>
                        </th>
                      ))}
                      <th className="py-3.5 px-3 text-right hidden sm:table-cell">
                        Wins
                      </th>
                      <th className="py-3.5 px-3 text-right hidden sm:table-cell">
                        PS Wins
                      </th>
                      <th className="py-3.5 px-5 text-right text-[#F4F5F7]">
                        Net Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222731] text-sm">
                    {driverStandings.map((row) => {
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
                                style={{
                                  backgroundColor: row.driver.avatarColor,
                                }}
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
                            <span
                              className={
                                isTop3 ? 'text-[#F4F5F7]' : 'text-[#D1D5DB]'
                              }
                            >
                              {row.totalPoints}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* TEAMS' STANDINGS TABLE */
          <div className="bg-[#12161D] border border-[#222731] rounded-lg overflow-hidden">
            {teamStandings.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                  No Constructor Teams Registered Yet
                </div>
                <p className="text-xs text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
                  {!userProfile
                    ? 'Constructor teams and 3-car driver rosters will appear here once Team Managers register their entries.'
                    : userProfile.role === 'driver'
                    ? 'Once Team Managers register their constructor teams, you can request a seat or accept team invitations.'
                    : 'Create a constructor team in Team Management and invite or approve up to 3 drivers.'}
                </p>
                {userProfile && (
                  <button
                    type="button"
                    onClick={onNavigateToRegister}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>
                      {userProfile.role === 'driver'
                        ? 'Open Driver Team Finder'
                        : 'Open Team Management'}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#222731] bg-[#0D1016] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      <th className="py-3.5 px-4 w-14">Pos</th>
                      <th className="py-3.5 px-4">Team & Principal</th>
                      <th className="py-3.5 px-4">
                        Active Driver Line-Up (Max 3)
                      </th>
                      {completedRounds.map((rnd) => (
                        <th
                          key={rnd.id}
                          className="py-3.5 px-3 text-right font-mono"
                        >
                          R{rnd.roundNumber} ({rnd.countryCode})
                        </th>
                      ))}
                      <th className="py-3.5 px-3 text-right">Stage Wins</th>
                      <th className="py-3.5 px-3 text-right">Podiums</th>
                      <th className="py-3.5 px-5 text-right text-[#F4F5F7]">
                        Team Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222731] text-sm">
                    {teamStandings.map((row) => (
                      <tr
                        key={row.team.id}
                        className="hover:bg-[#181D26] transition-colors"
                      >
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
                                Principal: {row.team.managerName} ·{' '}
                                {row.team.countryCode}
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
                                {idx < row.drivers.length - 1 && (
                                  <span aria-hidden="true">·</span>
                                )}
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
            )}
          </div>
        )}
      </section>
    </div>
  );
});

