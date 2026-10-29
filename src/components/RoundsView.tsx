import React, { useState } from 'react';
import { DriverPublic, PointsConfig, RallyRound, Team } from '../types/aerc';
import { getPositionPoints, getPowerStagePoints } from '../utils/championshipEngine';
import { Share2, Upload, UserPlus, CheckCircle2, AlertTriangle } from 'lucide-react';

interface RoundsViewProps {
  rounds: RallyRound[];
  selectedRoundId: string;
  onSelectRoundId: (roundId: string) => void;
  drivers: DriverPublic[];
  teams: Team[];
  pointsConfig: PointsConfig;
  onSelectDriver: (driverId: string) => void;
  onNavigateToRegister: (roundId: string) => void;
  onNavigateToControl: (roundId: string) => void;
  onOpenShareGraphics: (roundId: string) => void;
}

export const RoundsView: React.FC<RoundsViewProps> = ({
  rounds,
  selectedRoundId,
  onSelectRoundId,
  drivers,
  teams,
  pointsConfig,
  onSelectDriver,
  onNavigateToRegister,
  onNavigateToControl,
  onOpenShareGraphics,
}) => {
  const [subTab, setSubTab] = useState<'results' | 'entryList'>('results');

  const activeRound =
    rounds.find((r) => r.id === selectedRoundId) || rounds[0];

  const driverMap = new Map<string, DriverPublic>();
  drivers.forEach((d) => driverMap.set(d.id, d));

  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  const registeredDrivers = activeRound.registeredDriverIds
    .map((id) => driverMap.get(id))
    .filter((d): d is DriverPublic => Boolean(d));

  // Switch automatically to entry list if round is not completed yet and has no results
  const effectiveSubTab =
    activeRound.results.length === 0 ? 'entryList' : subTab;

  return (
    <div className="space-y-6">
      {/* Round Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#222731]">
        <div>
          <div className="text-xs text-[#9CA3AF]">
            2026 AERC Championship Calendar · 4 Official Rally1 Events
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#F4F5F7] mt-1">
            Rally Rounds & Official Entry Lists
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rounds.map((rnd) => {
            const isSelected = rnd.id === activeRound.id;
            return (
              <button
                key={rnd.id}
                type="button"
                onClick={() => onSelectRoundId(rnd.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#E11D48] border-[#E11D48] text-white'
                    : 'bg-[#12161D] border-[#222731] text-[#9CA3AF] hover:text-[#F4F5F7]'
                }`}
              >
                R{rnd.roundNumber}: {rnd.country} ({rnd.status})
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Round Header Banner */}
      <div className="p-6 bg-[#12161D] border border-[#222731] rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF] font-mono">
            <span className="text-[#F59E0B] font-semibold">
              ROUND {activeRound.roundNumber} OF {rounds.length}
            </span>
            <span aria-hidden="true">·</span>
            <span>Club ID: {activeRound.racenetClubEventId}</span>
            <span aria-hidden="true">·</span>
            <span>Surface: {activeRound.surface}</span>
            <span aria-hidden="true">·</span>
            <span>
              {activeRound.stagesCount} Stages ({activeRound.totalDistanceKm.toFixed(1)} km)
            </span>
          </div>

          <h2 className="font-display text-3xl font-extrabold uppercase text-[#F4F5F7]">
            {activeRound.name}
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#9CA3AF]">
            <span>
              Event Window: <strong className="text-[#F4F5F7] font-mono">{activeRound.startDate}</strong> to{' '}
              <strong className="text-[#F4F5F7] font-mono">{activeRound.endDate}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Registration Deadline:{' '}
              <strong className="text-[#F59E0B] font-mono">{activeRound.entryDeadline}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Public Entries: <strong className="text-[#10B981] font-mono">{registeredDrivers.length} Drivers</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {activeRound.status === 'Completed' ? (
            <button
              type="button"
              onClick={() => onOpenShareGraphics(activeRound.id)}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Round Result Card</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigateToRegister(activeRound.id)}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Submit Driver Entry</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToControl(activeRound.id)}
                className="px-4 py-2.5 text-xs font-medium text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#374151] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#F59E0B]" />
                <span>Upload EA Racenet CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-navigation between Final Results and Public Entry List */}
      <div className="flex items-center justify-between border-b border-[#222731] pb-3">
        <div className="inline-flex p-1 bg-[#12161D] border border-[#222731] rounded-md">
          <button
            type="button"
            onClick={() => setSubTab('results')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              effectiveSubTab === 'results'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            Final Stage Classification ({activeRound.results.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('entryList')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              effectiveSubTab === 'entryList'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            Public Entry List ({registeredDrivers.length})
          </button>
        </div>

        <div className="text-xs text-[#9CA3AF] hidden sm:block">
          Privacy Policy: Private fields (Email, Phone, Age) are segregated in the Commission Vault and never rendered in public sheets.
        </div>
      </div>

      {/* View 1: Final Stage Classification */}
      {effectiveSubTab === 'results' && activeRound.results.length > 0 ? (
        <div className="bg-[#12161D] border border-[#222731] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#222731] bg-[#0D1016] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  <th className="py-3.5 px-4 w-14">Pos</th>
                  <th className="py-3.5 px-4">Verified Driver</th>
                  <th className="py-3.5 px-4">Raw Racenet Export Name</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Team & Rally1 Car</th>
                  <th className="py-3.5 px-4 text-right font-mono">Total Time</th>
                  <th className="py-3.5 px-4 text-right font-mono">Gap</th>
                  <th className="py-3.5 px-3 text-right font-mono">Power Stage</th>
                  <th className="py-3.5 px-5 text-right font-mono text-[#F4F5F7]">Net Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222731] text-sm">
                {activeRound.results.map((res) => {
                  const drv = driverMap.get(res.driverId);
                  const team = drv?.teamId ? teamMap.get(drv.teamId) : undefined;
                  const basePts = getPositionPoints(res.position, res.status, pointsConfig);
                  const psPts = getPowerStagePoints(res.powerStageRank, res.status, pointsConfig);
                  const netPts = Math.max(0, basePts + psPts - (res.stewardPenaltyPoints || 0));

                  return (
                    <tr
                      key={`${activeRound.id}-${res.driverId}`}
                      onClick={() => drv && onSelectDriver(drv.id)}
                      className="hover:bg-[#181D26] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold tabular-nums">
                        {res.status === 'Finished' ? (
                          <span className={res.position <= 3 ? 'text-[#F59E0B]' : 'text-[#F4F5F7]'}>
                            {String(res.position).padStart(2, '0')}
                          </span>
                        ) : (
                          <span className="text-[#EF4444]">{res.status}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#F4F5F7]">
                          {drv ? `#${drv.number} ${drv.fullName}` : 'Unmatched Entry'}
                        </div>
                        <div className="text-xs text-[#9CA3AF]">
                          {drv?.nationality} · {drv?.platform} · {drv?.controls}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="text-[#F4F5F7]">{res.rawRacenetName}</span>
                        <div className="text-[11px] text-[#10B981] flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            {res.matchStatus === 'ea_id'
                              ? 'Matched via EA ID'
                              : res.matchStatus === 'alias'
                              ? 'Matched via Alias'
                              : res.matchStatus === 'resolved'
                              ? 'Steward Verified'
                              : 'Auto-Matched'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="text-xs font-medium text-[#F4F5F7]">
                          {team ? team.name : 'Privateer Entry'}
                        </div>
                        <div className="text-xs text-[#9CA3AF]">{res.carUsed}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs text-[#F4F5F7] tabular-nums">
                        {res.totalTime}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs text-[#9CA3AF] tabular-nums">
                        {res.gapToLeader}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-xs tabular-nums">
                        {res.powerStageRank ? (
                          <span className="text-[#F59E0B] font-semibold">
                            PS{res.powerStageRank} (+{psPts})
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right font-mono text-sm font-bold text-[#F4F5F7] tabular-nums">
                        <div>{netPts}</div>
                        {res.stewardPenaltyPoints > 0 && (
                          <div className="text-[10px] text-[#EF4444] flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>-{res.stewardPenaltyPoints}pt ({res.stewardPenaltyNote})</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View 2: Public Entry List */
        <div className="bg-[#12161D] border border-[#222731] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 bg-[#0D1016] border-b border-[#222731] flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-[#F4F5F7]">
              Official Public Entry List — {activeRound.name}
            </div>
            <div className="text-xs text-[#10B981] font-mono">
              Public Schema Only (Name · Racenet ID · Team · Car · Nationality · Platform · Controls)
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#222731] bg-[#0D1016]/60 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  <th className="py-3.5 px-4 w-16">Car #</th>
                  <th className="py-3.5 px-4">Driver Name</th>
                  <th className="py-3.5 px-4">EA Racenet Name</th>
                  <th className="py-3.5 px-4">Team & Points Opt-In</th>
                  <th className="py-3.5 px-4">Rally1 Hybrid Car</th>
                  <th className="py-3.5 px-4">Nationality</th>
                  <th className="py-3.5 px-4">Platform & Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222731] text-sm">
                {registeredDrivers.map((drv) => {
                  const team = drv.teamId ? teamMap.get(drv.teamId) : undefined;
                  return (
                    <tr
                      key={drv.id}
                      onClick={() => onSelectDriver(drv.id)}
                      className="hover:bg-[#181D26] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#F59E0B]">
                        #{drv.number}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#F4F5F7]">
                        {drv.fullName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-[#9CA3AF]">
                        {drv.racenetName}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="text-[#F4F5F7] font-medium">
                          {team ? team.name : 'Privateer Entry'}
                        </span>
                        <span className="text-[#9CA3AF] ml-1.5">
                          ({drv.teamPointsOptIn ? 'Team Points Opt-In' : 'Individual Only'})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#F4F5F7]">
                        {drv.carMakeModel}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#F4F5F7]">
                        {drv.nationality} ({drv.countryCode})
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#9CA3AF]">
                        {drv.platform} · {drv.controls}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
