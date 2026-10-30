import React, { useState } from 'react';
import {
  DriverPrivateVault,
  DriverPublic,
  PointsConfig,
  RallyRound,
  RoundResultEntry,
  UserProfile,
} from '../types/aerc';
import {
  getPositionPoints,
  getPowerStagePoints,
} from '../utils/championshipEngine';
import {
  CheckCircle2,
  Lock,
  ShieldAlert,
  PlusCircle,
  LogIn,
  Trophy,
  Trash2,
} from 'lucide-react';

interface RaceControlViewProps {
  drivers: DriverPublic[];
  privateVault: DriverPrivateVault[];
  rounds: RallyRound[];
  pointsConfig: PointsConfig;
  onPublishRoundResults: (
    roundId: string,
    results: RoundResultEntry[]
  ) => Promise<void>;
  onApplyStewardPenalty: (
    roundId: string,
    driverId: string,
    penaltyPoints: number,
    note: string
  ) => Promise<void>;
  onDeletePrivateRecord: (driverId: string) => Promise<void>;
  onNavigateToRounds: () => void;
  userProfile: UserProfile | null;
  onOpenAuthModal: () => void;
}

export const RaceControlView: React.FC<RaceControlViewProps> = ({
  drivers,
  privateVault,
  rounds,
  pointsConfig,
  onPublishRoundResults,
  onApplyStewardPenalty,
  onDeletePrivateRecord,
  onNavigateToRounds,
  userProfile,
  onOpenAuthModal,
}) => {
  const [controlTab, setControlTab] = useState<'results' | 'stewards' | 'vault'>(
    'results'
  );

  // Manual Round Results Entry State
  const [targetRoundId, setTargetRoundId] = useState<string>(
    rounds[0]?.id || ''
  );
  const [entryDriverId, setEntryDriverId] = useState<string>(
    drivers[0]?.id || ''
  );
  const [entryPosition, setEntryPosition] = useState<string>('1');
  const [entryStatus, setEntryStatus] = useState<'Finished' | 'DNF' | 'DNS'>(
    'Finished'
  );
  const [entryTotalTime, setEntryTotalTime] = useState<string>('42:15.400');
  const [entryGap, setEntryGap] = useState<string>('+00:00.000');
  const [entryPowerStageRank, setEntryPowerStageRank] = useState<string>('0');
  const [publishConfirmMsg, setPublishConfirmMsg] = useState<string | null>(
    null
  );

  // Steward penalty controls
  const [penaltyRoundId, setPenaltyRoundId] = useState<string>(
    rounds.find((r) => r.status === 'Completed')?.id || rounds[0]?.id || ''
  );
  const [penaltyDriverId, setPenaltyDriverId] = useState<string>(
    drivers[0]?.id || ''
  );
  const [penaltyPoints, setPenaltyPoints] = useState<string>('5');
  const [penaltyReason, setPenaltyReason] = useState<string>('');
  const [penaltySavedMsg, setPenaltySavedMsg] = useState<string | null>(null);

  const driverMap = new Map<string, DriverPublic>();
  drivers.forEach((d) => driverMap.set(d.id, d));

  const effectiveTargetRoundId = targetRoundId || rounds[0]?.id || '';
  const selectedRound = rounds.find((r) => r.id === effectiveTargetRoundId);
  const currentRoundResults = selectedRound?.results || [];

  const handleAddOrUpdateDriverResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveTargetRoundId || !entryDriverId) return;
    const drv = driverMap.get(entryDriverId);
    if (!drv) return;

    const posNum =
      entryStatus === 'Finished'
        ? Math.max(1, parseInt(entryPosition, 10) || 1)
        : 0;
    const psRankNum = parseInt(entryPowerStageRank, 10);
    const powerStageRank =
      entryStatus === 'Finished' && psRankNum >= 1 && psRankNum <= 5
        ? psRankNum
        : null;

    const newEntry: RoundResultEntry = {
      driverId: drv.id,
      rawRacenetName: drv.racenetName,
      eaAccountId: drv.eaAccountId,
      position: posNum,
      status: entryStatus,
      totalTime: entryStatus === 'Finished' ? entryTotalTime.trim() || '00:00.000' : entryStatus,
      gapToLeader: entryStatus === 'Finished' ? entryGap.trim() || '+00:00.000' : entryStatus,
      powerStageRank,
      carUsed: drv.carMakeModel,
      stewardPenaltyPoints: 0,
      matchStatus: 'exact',
    };

    const updatedResults = [
      ...currentRoundResults.filter((r) => r.driverId !== drv.id),
      newEntry,
    ].sort((a, b) => {
      if (a.status === 'Finished' && b.status !== 'Finished') return -1;
      if (a.status !== 'Finished' && b.status === 'Finished') return 1;
      return a.position - b.position;
    });

    await onPublishRoundResults(effectiveTargetRoundId, updatedResults);
    setPublishConfirmMsg(
      `Saved classification for ${drv.fullName} in ${
        selectedRound?.name || 'Round'
      }.`
    );
  };

  const handleRemoveResultEntry = async (driverIdToRemove: string) => {
    if (!effectiveTargetRoundId) return;
    const updatedResults = currentRoundResults.filter(
      (r) => r.driverId !== driverIdToRemove
    );
    await onPublishRoundResults(effectiveTargetRoundId, updatedResults);
  };

  const handleApplyPenaltySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(penaltyPoints, 10);
    if (isNaN(pts) || pts < 0 || !penaltyRoundId || !penaltyDriverId) return;
    await onApplyStewardPenalty(
      penaltyRoundId,
      penaltyDriverId,
      pts,
      penaltyReason.trim()
    );
    const drv = driverMap.get(penaltyDriverId);
    setPenaltySavedMsg(
      `Applied ${pts}pt Steward Penalty to ${
        drv?.fullName || penaltyDriverId
      } and saved to Firestore.`
    );
  };

  const isOrganizer = userProfile?.role === 'organizer';

  if (!isOrganizer) {
    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-[#12161D] border border-[#EF4444]/40 rounded-lg text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-[#EF4444] mx-auto" />
        <div className="max-w-lg mx-auto space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-[#EF4444]">
            Restricted Championship Control Room
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#F4F5F7]">
            {userProfile
              ? `Organizer Account Required (Currently: ${userProfile.role.toUpperCase()})`
              : 'Organizer Sign-In Required'}
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
            Race Control (recording stage classifications, applying steward penalties, and accessing the Commission Private Data Vault) is restricted to verified Championship Organizers.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>
            {userProfile
              ? 'Switch Account Role to Organizer'
              : 'Sign In with Google as Organizer'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#222731]">
        <div>
          <div className="text-xs text-[#F59E0B] font-semibold">
            Organizer & Steward Operations
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#F4F5F7] mt-1">
            Race Control: Results, Stewards & Privacy Vault
          </h1>
        </div>

        <div className="inline-flex p-1 bg-[#12161D] border border-[#222731] rounded-md self-start">
          <button
            type="button"
            onClick={() => setControlTab('results')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              controlTab === 'results'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            1. Round Results
          </button>
          <button
            type="button"
            onClick={() => setControlTab('stewards')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              controlTab === 'stewards'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            2. Steward Penalties
          </button>
          <button
            type="button"
            onClick={() => setControlTab('vault')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              controlTab === 'vault'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            3. Private Data Vault
          </button>
        </div>
      </div>

      {/* TAB 1: RECORD ROUND RESULTS */}
      {controlTab === 'results' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleAddOrUpdateDriverResult}
            className="lg:col-span-5 bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4"
          >
            <h2 className="font-display text-xl font-bold uppercase text-[#F4F5F7] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#E11D48]" />
              <span>Record Driver Round Result</span>
            </h2>
            <p className="text-xs text-[#9CA3AF]">
              Select a rally round and record each driver's finishing position, stage time, and Power Stage bonus rank.
            </p>

            {rounds.length === 0 ? (
              <div className="p-4 bg-[#090B0E] border border-[#222731] rounded space-y-3">
                <div className="text-xs font-semibold text-[#F4F5F7]">
                  No Rally Rounds Created Yet
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  Create a rally round in the Rally Rounds tab first.
                </p>
                <button
                  type="button"
                  onClick={onNavigateToRounds}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create Rally Round</span>
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="rc-round-select"
                    className="block text-xs text-[#9CA3AF] mb-1"
                  >
                    Rally Round
                  </label>
                  <select
                    id="rc-round-select"
                    value={effectiveTargetRoundId}
                    onChange={(e) => {
                      setTargetRoundId(e.target.value);
                      setPublishConfirmMsg(null);
                    }}
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-semibold text-[#F4F5F7]"
                  >
                    {rounds.map((r) => (
                      <option key={r.id} value={r.id}>
                        Round {r.roundNumber}: {r.name} ({r.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="rc-driver-select"
                    className="block text-xs text-[#9CA3AF] mb-1"
                  >
                    Registered Driver
                  </label>
                  <select
                    id="rc-driver-select"
                    value={entryDriverId || drivers[0]?.id || ''}
                    onChange={(e) => setEntryDriverId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                  >
                    <option value="">Select Driver...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        #{d.number} {d.fullName} ({d.racenetName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="rc-status"
                      className="block text-xs text-[#9CA3AF] mb-1"
                    >
                      Classification Status
                    </label>
                    <select
                      id="rc-status"
                      value={entryStatus}
                      onChange={(e) =>
                        setEntryStatus(
                          e.target.value as 'Finished' | 'DNF' | 'DNS'
                        )
                      }
                      className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                    >
                      <option value="Finished">Finished</option>
                      <option value="DNF">DNF (Did Not Finish)</option>
                      <option value="DNS">DNS (Did Not Start)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="rc-pos"
                      className="block text-xs text-[#9CA3AF] mb-1"
                    >
                      Overall Position
                    </label>
                    <input
                      id="rc-pos"
                      type="number"
                      min={1}
                      max={100}
                      disabled={entryStatus !== 'Finished'}
                      value={entryPosition}
                      onChange={(e) => setEntryPosition(e.target.value)}
                      className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] disabled:opacity-40"
                    />
                  </div>
                </div>

                {entryStatus === 'Finished' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor="rc-time"
                        className="block text-xs text-[#9CA3AF] mb-1"
                      >
                        Total Stage Time
                      </label>
                      <input
                        id="rc-time"
                        type="text"
                        value={entryTotalTime}
                        onChange={(e) => setEntryTotalTime(e.target.value)}
                        placeholder="42:15.400"
                        className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="rc-gap"
                        className="block text-xs text-[#9CA3AF] mb-1"
                      >
                        Gap to Leader
                      </label>
                      <input
                        id="rc-gap"
                        type="text"
                        value={entryGap}
                        onChange={(e) => setEntryGap(e.target.value)}
                        placeholder="+00:00.000"
                        className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="rc-ps-rank"
                        className="block text-xs text-[#9CA3AF] mb-1"
                      >
                        Power Stage Rank
                      </label>
                      <select
                        id="rc-ps-rank"
                        value={entryPowerStageRank}
                        onChange={(e) => setEntryPowerStageRank(e.target.value)}
                        className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F59E0B]"
                      >
                        <option value="0">None</option>
                        <option value="1">PS1 (+5 pts)</option>
                        <option value="2">PS2 (+4 pts)</option>
                        <option value="3">PS3 (+3 pts)</option>
                        <option value="4">PS4 (+2 pts)</option>
                        <option value="5">PS5 (+1 pt)</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!effectiveTargetRoundId || drivers.length === 0}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Save Driver Result to Round
                </button>
              </>
            )}
          </form>

          <div className="lg:col-span-7 bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222731] pb-3">
              <div>
                <h2 className="font-display text-xl font-bold uppercase text-[#F4F5F7]">
                  Classified Round Results
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  {selectedRound
                    ? `${selectedRound.name} · ${currentRoundResults.length} classified entries`
                    : 'Select or create a rally round to view results.'}
                </p>
              </div>
            </div>

            {publishConfirmMsg && (
              <div className="p-3.5 bg-[#10B981]/15 border border-[#10B981]/40 rounded-lg flex items-center gap-2 text-xs text-[#10B981]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{publishConfirmMsg}</span>
              </div>
            )}

            {currentRoundResults.length === 0 ? (
              <div className="p-10 bg-[#090B0E] border border-[#222731] rounded text-center text-xs text-[#9CA3AF]">
                No results recorded for this round yet. Use the form on the left to add driver classifications.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#222731] rounded">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0D1016] border-b border-[#222731] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      <th className="py-2.5 px-3">Pos</th>
                      <th className="py-2.5 px-3">Driver</th>
                      <th className="py-2.5 px-3 text-right font-mono">Time</th>
                      <th className="py-2.5 px-3 text-right font-mono">Pts</th>
                      <th className="py-2.5 px-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222731] text-xs">
                    {currentRoundResults.map((res) => {
                      const drv = driverMap.get(res.driverId);
                      const basePts = getPositionPoints(
                        res.position,
                        res.status,
                        pointsConfig
                      );
                      const psPts = getPowerStagePoints(
                        res.powerStageRank,
                        res.status,
                        pointsConfig
                      );
                      return (
                        <tr key={res.driverId} className="hover:bg-[#181D26]/60">
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {res.status === 'Finished'
                              ? `P${res.position}`
                              : res.status}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-[#F4F5F7]">
                              {drv?.fullName || res.rawRacenetName}
                            </div>
                            <div className="font-mono text-[11px] text-[#9CA3AF]">
                              {res.rawRacenetName}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#9CA3AF]">
                            {res.totalTime}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#F4F5F7]">
                            {basePts + psPts}
                            {psPts > 0 && (
                              <span className="text-[10px] text-[#F59E0B] ml-1">
                                +{psPts}PS
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              aria-label={`Remove result for ${
                                drv?.fullName || res.driverId
                              }`}
                              onClick={() =>
                                handleRemoveResultEntry(res.driverId)
                              }
                              className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STEWARD PENALTIES & INFRACTION LOGS */}
      {controlTab === 'stewards' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleApplyPenaltySubmit}
            className="lg:col-span-5 bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4"
          >
            <h2 className="font-display text-xl font-bold uppercase text-[#F4F5F7]">
              Apply Steward Points Penalty
            </h2>
            <p className="text-xs text-[#9CA3AF]">
              Penalties applied by stewards attach a visible public note on both the round sheet and the overall championship table.
            </p>

            {penaltySavedMsg && (
              <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/40 rounded text-xs text-[#10B981]">
                {penaltySavedMsg}
              </div>
            )}

            <div>
              <label
                htmlFor="pen-round"
                className="block text-xs text-[#9CA3AF] mb-1"
              >
                Completed Rally Round
              </label>
              <select
                id="pen-round"
                value={penaltyRoundId}
                onChange={(e) => setPenaltyRoundId(e.target.value)}
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                <option value="">Select Completed Round...</option>
                {rounds
                  .filter((r) => r.status === 'Completed')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pen-driver"
                className="block text-xs text-[#9CA3AF] mb-1"
              >
                Driver
              </label>
              <select
                id="pen-driver"
                value={penaltyDriverId}
                onChange={(e) => setPenaltyDriverId(e.target.value)}
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                <option value="">Select Driver...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    #{d.number} {d.fullName} ({d.racenetName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pen-pts"
                className="block text-xs text-[#9CA3AF] mb-1"
              >
                Penalty Points Deducted
              </label>
              <input
                id="pen-pts"
                type="number"
                min={0}
                max={50}
                value={penaltyPoints}
                onChange={(e) => setPenaltyPoints(e.target.value)}
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7]"
              />
            </div>

            <div>
              <label
                htmlFor="pen-reason"
                className="block text-xs text-[#9CA3AF] mb-1"
              >
                Mandatory Public Steward Note
              </label>
              <input
                id="pen-reason"
                type="text"
                value={penaltyReason}
                onChange={(e) => setPenaltyReason(e.target.value)}
                placeholder="Enter steward infraction note"
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>

            <button
              type="submit"
              disabled={!penaltyRoundId || !penaltyDriverId}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] disabled:opacity-40 transition-colors cursor-pointer"
            >
              Record Steward Decision & Recompute Standings
            </button>
          </form>

          <div className="lg:col-span-7 bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4">
            <h3 className="font-display text-xl font-bold uppercase text-[#F4F5F7]">
              Active Steward Decisions Log
            </h3>
            {rounds.flatMap((r) =>
              r.results.filter((res) => res.stewardPenaltyPoints > 0)
            ).length === 0 ? (
              <div className="p-8 bg-[#090B0E] border border-[#222731] rounded text-center text-xs text-[#9CA3AF]">
                No steward penalties recorded.
              </div>
            ) : (
              <div className="divide-y divide-[#222731] border border-[#222731] rounded bg-[#090B0E]">
                {rounds
                  .flatMap((r) =>
                    r.results
                      .filter((res) => res.stewardPenaltyPoints > 0)
                      .map((res) => ({ round: r, res }))
                  )
                  .map(({ round, res }, i) => {
                    const drv = driverMap.get(res.driverId);
                    return (
                      <div
                        key={i}
                        className="p-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-sm font-semibold text-[#F4F5F7]">
                            {drv?.fullName} ({round.name})
                          </div>
                          <div className="text-xs text-[#9CA3AF]">
                            Steward Note:{' '}
                            {res.stewardPenaltyNote || 'Regulatory infraction'}
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-[#EF4444]">
                          -{res.stewardPenaltyPoints} PTS
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SEGREGATED PRIVATE DATA VAULT (ORGANIZER ACCOUNT GATED) */}
      {controlTab === 'vault' && (
        <div className="bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222731]">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#10B981]" />
                <span>
                  Commission Private Data Vault (Kenya Data Protection Act Compliant)
                </span>
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Separates personal data (Email, Mobile Number, Age, Minor Consent) in an isolated Firestore collection restricted to verified Organizers.
              </p>
            </div>
          </div>

          {!isOrganizer ? (
            <div className="p-8 bg-[#090B0E] border border-[#EF4444]/40 rounded-lg text-center space-y-4">
              <ShieldAlert className="w-10 h-10 text-[#EF4444] mx-auto" />
              <div className="max-w-lg mx-auto space-y-2">
                <h3 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                  {userProfile
                    ? `Organizer Account Required (Currently: ${userProfile.role.toUpperCase()})`
                    : 'Organizer Sign-In Required'}
                </h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Private driver records (email, phone number, age, and minor guardian consent) are stored in a protected Firestore collection and are only accessible to signed-in Organizer accounts.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {userProfile
                    ? 'Switch Account Role to Organizer'
                    : 'Sign In with Google as Organizer'}
                </span>
              </button>
            </div>
          ) : privateVault.length === 0 ? (
            <div className="p-10 bg-[#090B0E] border border-[#222731] rounded text-center space-y-2">
              <div className="text-sm font-semibold text-[#F4F5F7]">
                Private Data Vault Is Empty
              </div>
              <p className="text-xs text-[#9CA3AF]">
                When drivers register, their private contact and age records are stored in this protected Firestore collection.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#222731] rounded">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0D1016] border-b border-[#222731] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    <th className="py-3 px-4">Driver ID & Name</th>
                    <th className="py-3 px-4">Private Email</th>
                    <th className="py-3 px-4">Private WhatsApp / Mobile</th>
                    <th className="py-3 px-4">Age & Minor Status</th>
                    <th className="py-3 px-4">Parental / DPA Consent</th>
                    <th className="py-3 px-4 text-right">Right to Erasure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222731] text-xs">
                  {privateVault.map((rec) => {
                    const drv = driverMap.get(rec.driverId);
                    return (
                      <tr key={rec.driverId} className="hover:bg-[#181D26]/60">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#F4F5F7]">
                            {drv?.fullName || rec.driverId}
                          </div>
                          <div className="font-mono text-[11px] text-[#9CA3AF]">
                            {rec.driverId}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#F4F5F7]">
                          {rec.email}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#F4F5F7]">
                          {rec.phone}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="text-[#F4F5F7]">{rec.age} yrs</span>
                          {rec.isMinor && (
                            <span className="ml-2 text-[#F59E0B] font-semibold">
                              (Minor Under 18)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[#10B981]">
                            DPA Consent Accepted (
                            {rec.consentTimestamp.slice(0, 10)})
                          </div>
                          {rec.isMinor && (
                            <div className="text-[11px] text-[#F59E0B]">
                              Guardian Consent Verified:{' '}
                              {rec.parentalConsentVerified ? 'Yes' : 'Pending'}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onDeletePrivateRecord(rec.driverId)}
                            className="px-2.5 py-1 text-[11px] font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded hover:bg-[#EF4444]/20 transition-colors cursor-pointer"
                          >
                            Redact PII
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
