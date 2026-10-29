import React, { useState } from 'react';
import {
  DriverPublic,
  PointsConfig,
  RallyRound,
  Team,
  UserRole,
} from '../types/aerc';
import { calculateDriverStandings } from '../utils/championshipEngine';
import {
  CheckCircle2,
  Share2,
  UserCheck,
  Search,
  Edit3,
  Award,
  Flag,
} from 'lucide-react';

interface DriverProfilesViewProps {
  drivers: DriverPublic[];
  teams: Team[];
  rounds: RallyRound[];
  pointsConfig: PointsConfig;
  selectedDriverId: string;
  onSelectDriverId: (driverId: string) => void;
  onClaimDriverAccount: (driverId: string, newAlias?: string) => void;
  onOpenShareGraphics: (roundId?: string) => void;
  currentRole: UserRole;
}

export const DriverProfilesView: React.FC<DriverProfilesViewProps> = ({
  drivers,
  teams,
  rounds,
  pointsConfig,
  selectedDriverId,
  onSelectDriverId,
  onClaimDriverAccount,
  onOpenShareGraphics,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newAliasInput, setNewAliasInput] = useState('');
  const [claimSuccessBanner, setClaimSuccessBanner] = useState<string | null>(null);

  const standings = calculateDriverStandings(drivers, teams, rounds, pointsConfig);

  const filteredStandings = standings.filter(
    (s) =>
      s.driver.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.driver.racenetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.driver.nationality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.teamName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeStanding =
    standings.find((s) => s.driver.id === selectedDriverId) || standings[0];

  const activeDriver = activeStanding.driver;
  const activeTeam = activeDriver.teamId
    ? teams.find((t) => t.id === activeDriver.teamId)
    : undefined;

  const handleAddAliasOrClaim = (e: React.FormEvent) => {
    e.preventDefault();
    onClaimDriverAccount(activeDriver.id, newAliasInput.trim() || undefined);
    setNewAliasInput('');
    setClaimSuccessBanner(
      `Persistent Driver ID (${activeDriver.id}) updated and verified for ${activeDriver.fullName}.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#222731]">
        <div>
          <div className="text-xs text-[#9CA3AF]">
            Permanent Driver Passports · Linked Across Rounds & Seasons
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#F4F5F7] mt-1">
            Driver Career Profiles & Telemetry Journey
          </h1>
        </div>

        {/* Live Driver Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search drivers by name, Racenet ID, or nation"
            placeholder="Search driver, Racenet ID, nation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#12161D] border border-[#222731] rounded text-xs text-[#F4F5F7] placeholder-[#9CA3AF] focus:outline-none focus:border-[#E11D48]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Driver Roster List */}
        <div className="lg:col-span-4 bg-[#12161D] border border-[#222731] rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-[#0D1016] border-b border-[#222731] flex items-center justify-between text-xs font-semibold text-[#9CA3AF]">
            <span>Registered AERC Drivers ({filteredStandings.length})</span>
            <span>Rank / Pts</span>
          </div>
          <div className="divide-y divide-[#222731] max-h-[620px] overflow-y-auto">
            {filteredStandings.map((row) => {
              const isSelected = row.driver.id === activeDriver.id;
              return (
                <button
                  key={row.driver.id}
                  type="button"
                  onClick={() => {
                    onSelectDriverId(row.driver.id);
                    setClaimSuccessBanner(null);
                  }}
                  className={`w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#181D26] text-[#F4F5F7]'
                      : 'hover:bg-[#161B23] text-[#9CA3AF]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center font-mono text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: row.driver.avatarColor }}
                    >
                      #{row.driver.number}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#F4F5F7] truncate">
                        {row.driver.fullName}
                      </div>
                      <div className="text-xs text-[#9CA3AF] font-mono truncate">
                        {row.driver.racenetName} · {row.driver.countryCode}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <div className="text-xs font-bold text-[#F59E0B] tabular-nums">
                      P{row.rank}
                    </div>
                    <div className="text-xs text-[#F4F5F7] tabular-nums">
                      {row.totalPoints} pts
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Detail Panel: Selected Driver Career Passport */}
        <div className="lg:col-span-8 space-y-6">
          {claimSuccessBanner && (
            <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/40 rounded-lg flex items-center justify-between text-xs text-[#10B981]">
              <span>{claimSuccessBanner}</span>
              <button
                type="button"
                onClick={() => setClaimSuccessBanner(null)}
                className="underline ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Driver Identity Header Card */}
          <div className="p-6 sm:p-8 bg-[#12161D] border border-[#222731] rounded-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="flex items-start gap-5">
                {/* Custom SVG Racing Helmet / Number Avatar */}
                <div
                  className="w-20 h-20 rounded-lg flex flex-col items-center justify-center font-display font-extrabold text-white shrink-0 border border-white/15 shadow-lg"
                  style={{ backgroundColor: activeDriver.avatarColor }}
                >
                  <span className="text-xs font-mono tracking-widest opacity-80">
                    {activeDriver.countryCode}
                  </span>
                  <span className="text-3xl leading-none mt-0.5">
                    #{activeDriver.number}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF] font-mono">
                    <span>Persistent ID: {activeDriver.id}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        activeDriver.claimedAccount
                          ? 'text-[#10B981]'
                          : 'text-[#F59E0B]'
                      }
                    >
                      {activeDriver.claimedAccount
                        ? 'Claimed Driver Account'
                        : 'Unclaimed Profile (Created via Entry Form)'}
                    </span>
                  </div>

                  <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase text-[#F4F5F7]">
                    {activeDriver.fullName}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
                    <span className="text-[#F4F5F7] font-semibold">
                      {activeTeam ? activeTeam.name : 'Privateer Entry'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Nationality: {activeDriver.nationality}</span>
                    <span aria-hidden="true">·</span>
                    <span>Residence: {activeDriver.countryOfResidence}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenShareGraphics()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Driver Card</span>
                </button>
              </div>
            </div>

            {/* Hardware & EA Racenet Identity Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-[#222731] text-xs">
              <div>
                <div className="text-[#9CA3AF]">EA Racenet Name</div>
                <div className="font-mono font-semibold text-[#F4F5F7] mt-1">
                  {activeDriver.racenetName}
                </div>
              </div>
              <div>
                <div className="text-[#9CA3AF]">EA Account Match Key</div>
                <div className="font-mono text-[#10B981] mt-1">
                  {activeDriver.eaAccountId || 'Not Linked'}
                </div>
              </div>
              <div>
                <div className="text-[#9CA3AF]">Platform & Controls</div>
                <div className="font-medium text-[#F4F5F7] mt-1">
                  {activeDriver.platform} · {activeDriver.controls}
                </div>
              </div>
              <div>
                <div className="text-[#9CA3AF]">Primary Rally1 Car</div>
                <div className="font-medium text-[#F4F5F7] mt-1 truncate">
                  {activeDriver.carMakeModel}
                </div>
              </div>
            </div>

            {/* Career Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-5 border-t border-[#222731]">
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[11px] text-[#9CA3AF]">Season Rank</div>
                <div className="font-mono text-xl font-bold text-[#F59E0B] mt-0.5 tabular-nums">
                  P{activeStanding.rank}
                </div>
              </div>
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[11px] text-[#9CA3AF]">Season Points</div>
                <div className="font-mono text-xl font-bold text-[#F4F5F7] mt-0.5 tabular-nums">
                  {activeStanding.totalPoints}
                </div>
              </div>
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[11px] text-[#9CA3AF]">Rounds Entered</div>
                <div className="font-mono text-xl font-bold text-[#F4F5F7] mt-0.5 tabular-nums">
                  {activeStanding.roundsEntered}
                </div>
              </div>
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[11px] text-[#9CA3AF]">Rally Wins</div>
                <div className="font-mono text-xl font-bold text-[#10B981] mt-0.5 tabular-nums">
                  {activeStanding.wins}
                </div>
              </div>
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[11px] text-[#9CA3AF]">Podiums</div>
                <div className="font-mono text-xl font-bold text-[#F4F5F7] mt-0.5 tabular-nums">
                  {activeStanding.podiums}
                </div>
              </div>
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[11px] text-[#9CA3AF]">Power Stage Wins</div>
                <div className="font-mono text-xl font-bold text-[#F59E0B] mt-0.5 tabular-nums">
                  {activeStanding.powerStageWins}
                </div>
              </div>
            </div>
          </div>

          {/* Round-by-Round Career Journey Timeline */}
          <div className="bg-[#12161D] border border-[#222731] rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-[#0D1016] border-b border-[#222731] flex items-center justify-between">
              <h3 className="font-display text-xl font-bold uppercase text-[#F4F5F7] flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#E11D48]" />
                <span>Round-by-Round Championship Journey</span>
              </h3>
              <span className="text-xs text-[#9CA3AF] font-mono">
                Best Finish: {activeStanding.bestFinish > 0 ? `P${activeStanding.bestFinish}` : 'N/A'}
              </span>
            </div>

            <div className="divide-y divide-[#222731]">
              {rounds.map((rnd) => {
                const res = rnd.results.find((r) => r.driverId === activeDriver.id);
                const rs = activeStanding.roundScores.find((s) => s.roundId === rnd.id);
                const isRegistered = rnd.registeredDriverIds.includes(activeDriver.id);

                return (
                  <div
                    key={rnd.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#181D26]/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[#9CA3AF] font-mono">
                        <span>Round {rnd.roundNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span>{rnd.startDate}</span>
                        <span aria-hidden="true">·</span>
                        <span>{rnd.surface}</span>
                      </div>
                      <div className="font-semibold text-[#F4F5F7] text-base">
                        {rnd.name}
                      </div>
                      <div className="text-xs text-[#9CA3AF]">
                        {res
                          ? `Chassis: ${res.carUsed} · Racenet Tag: ${res.rawRacenetName}`
                          : isRegistered
                          ? `Registered Entry (${activeDriver.carMakeModel})`
                          : 'Did Not Enter Round'}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 font-mono">
                      {res ? (
                        <>
                          <div className="text-right">
                            <div className="text-xs text-[#9CA3AF]">Stage Time</div>
                            <div className="text-xs text-[#F4F5F7] tabular-nums">
                              {res.totalTime}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-[#9CA3AF]">Finish</div>
                            <div
                              className={`text-sm font-bold tabular-nums ${
                                res.status === 'Finished' && res.position <= 3
                                  ? 'text-[#F59E0B]'
                                  : res.status === 'DNF'
                                  ? 'text-[#EF4444]'
                                  : 'text-[#F4F5F7]'
                              }`}
                            >
                              {res.status === 'Finished' ? `P${res.position}` : res.status}
                            </div>
                          </div>
                          <div className="text-right min-w-[64px]">
                            <div className="text-xs text-[#9CA3AF]">Net Pts</div>
                            <div className="text-base font-bold text-[#10B981] tabular-nums">
                              +{rs?.netPoints || 0}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-[#9CA3AF]">
                          {rnd.status === 'Registration Open'
                            ? 'Entry Confirmed · Awaiting Stage Start'
                            : 'Upcoming Championship Event'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Car History & Account Claim / Racenet Alias Linking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Car & Season History */}
            <div className="p-6 bg-[#12161D] border border-[#222731] rounded-lg space-y-4">
              <h3 className="text-sm font-semibold text-[#F4F5F7] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#F59E0B]" />
                <span>Homologated Car History & Past Aliases</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                {activeDriver.carHistory.map((ch, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#090B0E] border border-[#222731] rounded flex items-center justify-between"
                  >
                    <span className="text-[#9CA3AF]">{ch.season}</span>
                    <span className="font-medium text-[#F4F5F7]">{ch.car}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[#222731] text-xs text-[#9CA3AF]">
                <div>Known Historical Racenet Aliases:</div>
                <div className="font-mono text-[#F4F5F7] mt-1">
                  {activeDriver.racenetAliases.length > 0
                    ? activeDriver.racenetAliases.join(' · ')
                    : 'None recorded'}
                </div>
              </div>
            </div>

            {/* Claim Profile / Link Racenet Alias Box */}
            <form
              onSubmit={handleAddAliasOrClaim}
              className="p-6 bg-[#12161D] border border-[#222731] rounded-lg space-y-4"
            >
              <h3 className="text-sm font-semibold text-[#F4F5F7] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#10B981]" />
                <span>
                  {activeDriver.claimedAccount
                    ? 'Link Additional EA Racenet Alias'
                    : 'Claim Driver Profile & Link Account'}
                </span>
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Drivers register without an account and receive a persistent Driver ID. Claiming your profile lets you link changed EA Racenet names so historical CSV uploads always match automatically.
              </p>

              <div>
                <label
                  htmlFor="racenet-alias-input"
                  className="block text-xs font-medium text-[#F4F5F7] mb-1.5"
                >
                  Add Changed or Past EA Racenet Display Name (Optional)
                </label>
                <input
                  id="racenet-alias-input"
                  type="text"
                  placeholder="e.g. OldRacenetTag_254"
                  value={newAliasInput}
                  onChange={(e) => setNewAliasInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] font-mono focus:outline-none focus:border-[#E11D48]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] transition-colors cursor-pointer"
              >
                {activeDriver.claimedAccount
                  ? 'Save Racenet Alias to Driver ID'
                  : `Claim Profile (${activeDriver.fullName})`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
