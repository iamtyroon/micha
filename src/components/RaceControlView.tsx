import React, { useState } from 'react';
import {
  DriverPrivateVault,
  DriverPublic,
  ParsedRacenetRow,
  PointsConfig,
  RallyRound,
  RoundResultEntry,
  UserRole,
} from '../types/aerc';
import {
  getPositionPoints,
  getPowerStagePoints,
  parseAndMatchRacenetCsv,
} from '../utils/championshipEngine';
import { SAMPLE_ZAMBIA_RACENET_CSV } from '../data/seedAercData';
import {
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ShieldAlert,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

interface RaceControlViewProps {
  drivers: DriverPublic[];
  privateVault: DriverPrivateVault[];
  rounds: RallyRound[];
  pointsConfig: PointsConfig;
  onPublishRoundResults: (roundId: string, results: RoundResultEntry[]) => void;
  onApplyStewardPenalty: (
    roundId: string,
    driverId: string,
    penaltyPoints: number,
    note: string
  ) => void;
  onDeletePrivateRecord: (driverId: string) => void;
  currentRole: UserRole;
  onOpenRoleModal: () => void;
}

export const RaceControlView: React.FC<RaceControlViewProps> = ({
  drivers,
  privateVault,
  rounds,
  pointsConfig,
  onPublishRoundResults,
  onApplyStewardPenalty,
  onDeletePrivateRecord,
  currentRole,
  onOpenRoleModal,
}) => {
  const [controlTab, setControlTab] = useState<'ingest' | 'stewards' | 'vault'>('ingest');

  // Default to Round 3 (AERC 3 Rally of Zambia) for demonstration of CSV upload / Racenet fetch
  const [targetRoundId, setTargetRoundId] = useState<string>('rnd-3');
  const [csvInput, setCsvInput] = useState<string>(SAMPLE_ZAMBIA_RACENET_CSV);
  const [parsedRows, setParsedRows] = useState<ParsedRacenetRow[]>(() =>
    parseAndMatchRacenetCsv(SAMPLE_ZAMBIA_RACENET_CSV, drivers)
  );
  const [publishConfirmMsg, setPublishConfirmMsg] = useState<string | null>(null);
  const [racenetFetchStatus, setRacenetFetchStatus] = useState<string | null>(null);

  // Steward penalty controls
  const [penaltyRoundId, setPenaltyRoundId] = useState<string>('rnd-1');
  const [penaltyDriverId, setPenaltyDriverId] = useState<string>(drivers[0]?.id || 'drv-1');
  const [penaltyPoints, setPenaltyPoints] = useState<string>('5');
  const [penaltyReason, setPenaltyReason] = useState<string>('Jump start infraction on SS4');
  const [penaltySavedMsg, setPenaltySavedMsg] = useState<string | null>(null);

  const driverMap = new Map<string, DriverPublic>();
  drivers.forEach((d) => driverMap.set(d.id, d));

  const handleParseCsv = (rawText: string) => {
    setCsvInput(rawText);
    const rows = parseAndMatchRacenetCsv(rawText, drivers);
    setParsedRows(rows);
    setPublishConfirmMsg(null);
  };

  const handleSimulateCommunityApiPull = () => {
    const round = rounds.find((r) => r.id === targetRoundId);
    setRacenetFetchStatus(
      `Pulled 10 final stage telemetry rows from EA Racenet Community Club Endpoint (${round?.racenetClubEventId || 'EA-WRC-AERC-R3-ZM'}).`
    );
    handleParseCsv(SAMPLE_ZAMBIA_RACENET_CSV);
  };

  const handleResolveUnmatchedRow = (rowIndex: number, driverId: string) => {
    setParsedRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex
          ? {
              ...row,
              matchedDriverId: driverId || null,
            }
          : row
      )
    );
  };

  const unmatchedCount = parsedRows.filter((r) => !r.matchedDriverId).length;

  const handlePublishOfficialStandings = () => {
    const validEntries: RoundResultEntry[] = parsedRows
      .filter((r) => Boolean(r.matchedDriverId))
      .map((r) => ({
        driverId: r.matchedDriverId!,
        rawRacenetName: r.racenetName,
        eaAccountId: r.eaAccountId,
        position: r.status === 'Finished' ? r.position : 0,
        status: r.status,
        totalTime: r.totalTime,
        gapToLeader: r.gap,
        powerStageRank: r.powerStageRank,
        carUsed: r.car,
        stewardPenaltyPoints: 0,
        matchStatus:
          r.matchConfidence === 'ea_account_id'
            ? 'ea_id'
            : r.matchConfidence === 'alias_match'
            ? 'alias'
            : r.matchConfidence === 'exact_racenet'
            ? 'exact'
            : 'resolved',
      }));

    onPublishRoundResults(targetRoundId, validEntries);
    const targetRound = rounds.find((r) => r.id === targetRoundId);
    setPublishConfirmMsg(
      `Published ${validEntries.length} verified classifications for ${targetRound?.name}. Drivers' and Teams' Standings and Career Profiles have been updated automatically!`
    );
  };

  const handleApplyPenaltySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(penaltyPoints, 10);
    if (isNaN(pts) || pts < 0) return;
    onApplyStewardPenalty(penaltyRoundId, penaltyDriverId, pts, penaltyReason.trim());
    const drv = driverMap.get(penaltyDriverId);
    setPenaltySavedMsg(
      `Applied ${pts}pt Steward Penalty to ${drv?.fullName} with public note: "${penaltyReason}".`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#222731]">
        <div>
          <div className="text-xs text-[#F59E0B] font-semibold">
            Organiser & Steward Automation Engine · Eliminates 7-Step Manual Spreadsheet Workflow
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#F4F5F7] mt-1">
            Race Control: EA Racenet Ingest, Stewards & Privacy Vault
          </h1>
        </div>

        <div className="inline-flex p-1 bg-[#12161D] border border-[#222731] rounded-md">
          <button
            type="button"
            onClick={() => setControlTab('ingest')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              controlTab === 'ingest'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            1. EA Racenet CSV & API Ingest
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

      {/* TAB 1: EA RACENET CSV & COMMUNITY API INGEST */}
      {controlTab === 'ingest' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Box: Target Round & CSV Input / Community API Pull */}
            <div className="lg:col-span-5 bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold uppercase text-[#F4F5F7] flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#E11D48]" />
                  <span>Step 1: Select Round & Load Export</span>
                </h2>
              </div>

              <div>
                <label htmlFor="ingest-round-select" className="block text-xs text-[#9CA3AF] mb-1.5">
                  Target Rally Round (Current or Historical Import)
                </label>
                <select
                  id="ingest-round-select"
                  value={targetRoundId}
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

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSimulateCommunityApiPull}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#181D26] border border-[#F59E0B]/50 rounded hover:bg-[#222731] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Pull from EA Racenet Community API</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleParseCsv(SAMPLE_ZAMBIA_RACENET_CSV)}
                  className="px-3 py-2 text-xs font-medium text-[#9CA3AF] hover:text-[#F4F5F7] bg-[#090B0E] border border-[#222731] rounded transition-colors cursor-pointer"
                >
                  Reset Sample Zambia CSV
                </button>
              </div>

              {racenetFetchStatus && (
                <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/40 rounded text-xs text-[#F59E0B]">
                  {racenetFetchStatus}
                </div>
              )}

              <div>
                <label htmlFor="racenet-csv-textarea" className="block text-xs text-[#9CA3AF] mb-1.5">
                  Raw EA Racenet Final Stage CSV (Editable for Live Testing)
                </label>
                <textarea
                  id="racenet-csv-textarea"
                  rows={9}
                  value={csvInput}
                  onChange={(e) => handleParseCsv(e.target.value)}
                  className="w-full p-3 bg-[#090B0E] border border-[#222731] rounded font-mono text-[11px] text-[#F4F5F7] leading-relaxed focus:outline-none focus:border-[#E11D48]"
                />
              </div>

              <div className="p-3.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#9CA3AF] space-y-1">
                <div className="font-semibold text-[#F4F5F7]">
                  Built-In Risk Mitigation (Section 10 of Brief):
                </div>
                <p>
                  • Row 3 has <code className="text-[#F59E0B]">"WRC Player"</code> (privacy sharing off) + EA ID <code className="text-[#10B981]">EA-8820-KE</code> → Automatically matched to <strong>Hamza Anwar</strong>.
                </p>
                <p>
                  • Row 4 uses historical alias <code className="text-[#10B981]">Sipho_ZA99</code> → Automatically matched to <strong>Sipho Ndlovu</strong>.
                </p>
                <p>
                  • Row 5 has <code className="text-[#EF4444]">"WRC Player"</code> with no EA ID → Flagged on the right for 1-click steward assignment.
                </p>
              </div>
            </div>

            {/* Right Box: Automated Driver Name Matcher & 1-Click Publish */}
            <div className="lg:col-span-7 bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222731]">
                <div>
                  <h2 className="font-display text-xl font-bold uppercase text-[#F4F5F7]">
                    Step 2: Automated Name Matching & Points Preview
                  </h2>
                  <p className="text-xs text-[#9CA3AF]">
                    {parsedRows.length - unmatchedCount} of {parsedRows.length} entries matched automatically.{' '}
                    {unmatchedCount > 0 ? (
                      <span className="text-[#F59E0B] font-semibold">
                        {unmatchedCount} entry flagged for 1-click confirmation.
                      </span>
                    ) : (
                      <span className="text-[#10B981] font-semibold">
                        All entries verified! Ready to publish.
                      </span>
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePublishOfficialStandings}
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Publish Results & Recompute Standings</span>
                </button>
              </div>

              {publishConfirmMsg && (
                <div className="p-4 bg-[#10B981]/15 border border-[#10B981]/40 rounded-lg flex items-center gap-2.5 text-xs text-[#10B981]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{publishConfirmMsg}</span>
                </div>
              )}

              <div className="overflow-x-auto border border-[#222731] rounded">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0D1016] border-b border-[#222731] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      <th className="py-2.5 px-2.5 w-10">Pos</th>
                      <th className="py-2.5 px-2.5">Racenet Export</th>
                      <th className="py-2.5 px-2.5">Match Method</th>
                      <th className="py-2.5 px-2.5">Resolved AERC Driver</th>
                      <th className="py-2.5 px-2.5 text-right font-mono">Time</th>
                      <th className="py-2.5 px-2.5 text-right font-mono">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222731] text-xs">
                    {parsedRows.map((row, idx) => {
                      const matchedDriver = row.matchedDriverId
                        ? driverMap.get(row.matchedDriverId)
                        : undefined;
                      const basePts = getPositionPoints(row.position, row.status, pointsConfig);
                      const psPts = getPowerStagePoints(row.powerStageRank, row.status, pointsConfig);

                      return (
                        <tr key={idx} className="hover:bg-[#181D26]/60">
                          <td className="py-2.5 px-2.5 font-mono font-bold tabular-nums">
                            {row.status === 'Finished' ? `P${row.position}` : row.status}
                          </td>

                          <td className="py-2.5 px-2.5 font-mono">
                            <div className="text-[#F4F5F7]">{row.racenetName}</div>
                            {row.eaAccountId && (
                              <div className="text-[10px] text-[#9CA3AF]">
                                {row.eaAccountId}
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            {row.matchConfidence === 'exact_racenet' && (
                              <span className="text-[#10B981]">Exact Racenet</span>
                            )}
                            {row.matchConfidence === 'ea_account_id' && (
                              <span className="text-[#F59E0B] font-semibold">
                                EA ID (Mask Bypassed)
                              </span>
                            )}
                            {row.matchConfidence === 'alias_match' && (
                              <span className="text-[#10B981]">Alias Match</span>
                            )}
                            {(row.matchConfidence === 'unmatched_wrc_player' ||
                              row.matchConfidence === 'unmatched_unknown') && (
                              <span className="text-[#EF4444] font-semibold inline-flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Needs Review</span>
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-2.5">
                            {matchedDriver ? (
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[#F4F5F7]">
                                  #{matchedDriver.number} {matchedDriver.fullName}
                                </span>
                                {(row.matchConfidence === 'unmatched_wrc_player' ||
                                  row.matchConfidence === 'unmatched_unknown') && (
                                  <span className="text-[10px] text-[#10B981] font-mono">
                                    Verified
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <select
                                  aria-label={`Assign driver for row ${idx + 1}`}
                                  value={row.matchedDriverId || ''}
                                  onChange={(e) =>
                                    handleResolveUnmatchedRow(idx, e.target.value)
                                  }
                                  className="bg-[#090B0E] border border-[#EF4444] rounded px-2 py-1 text-[11px] text-[#F4F5F7]"
                                >
                                  <option value="">Select Driver...</option>
                                  {drivers.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      #{d.number} {d.fullName}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleResolveUnmatchedRow(idx, 'drv-6')}
                                  className="px-2 py-1 text-[11px] font-semibold bg-[#F59E0B] text-black rounded hover:bg-[#D97706] whitespace-nowrap cursor-pointer"
                                >
                                  1-Click Match (#19 Maxine)
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-2.5 text-right font-mono text-[11px] tabular-nums text-[#9CA3AF] whitespace-nowrap">
                            {row.totalTime}
                          </td>

                          <td className="py-2.5 px-2.5 text-right font-mono font-bold tabular-nums text-[#F4F5F7] whitespace-nowrap">
                            {basePts + psPts}
                            {psPts > 0 && (
                              <span className="text-[10px] text-[#F59E0B] ml-0.5">
                                +{psPts}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
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
              <label htmlFor="pen-round" className="block text-xs text-[#9CA3AF] mb-1">
                Completed Rally Round
              </label>
              <select
                id="pen-round"
                value={penaltyRoundId}
                onChange={(e) => setPenaltyRoundId(e.target.value)}
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
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
              <label htmlFor="pen-driver" className="block text-xs text-[#9CA3AF] mb-1">
                Driver
              </label>
              <select
                id="pen-driver"
                value={penaltyDriverId}
                onChange={(e) => setPenaltyDriverId(e.target.value)}
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    #{d.number} {d.fullName} ({d.racenetName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pen-pts" className="block text-xs text-[#9CA3AF] mb-1">
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
              <label htmlFor="pen-reason" className="block text-xs text-[#9CA3AF] mb-1">
                Mandatory Public Steward Note
              </label>
              <input
                id="pen-reason"
                type="text"
                value={penaltyReason}
                onChange={(e) => setPenaltyReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] transition-colors cursor-pointer"
            >
              Record Steward Decision & Recompute Standings
            </button>
          </form>

          <div className="lg:col-span-7 bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4">
            <h3 className="font-display text-xl font-bold uppercase text-[#F4F5F7]">
              Active Steward Decisions Log
            </h3>
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
                    <div key={i} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-[#F4F5F7]">
                          {drv?.fullName} ({round.name})
                        </div>
                        <div className="text-xs text-[#9CA3AF]">
                          Steward Note: {res.stewardPenaltyNote || 'Regulatory infraction'}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#EF4444]">
                        -{res.stewardPenaltyPoints} PTS
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEGREGATED PRIVATE DATA VAULT (ROLE-GATED) */}
      {controlTab === 'vault' && (
        <div className="bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222731]">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#10B981]" />
                <span>Commission Private Data Vault (Kenya Data Protection Act Compliant)</span>
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Separates personal data (Email, Mobile Number, Age, Minor Consent) from public sheets by architectural design, not by hiding spreadsheet columns.
              </p>
            </div>
          </div>

          {currentRole !== 'admin' ? (
            <div className="p-8 bg-[#090B0E] border border-[#EF4444]/40 rounded-lg text-center space-y-4">
              <ShieldAlert className="w-10 h-10 text-[#EF4444] mx-auto" />
              <div className="max-w-lg mx-auto space-y-2">
                <h3 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                  Access Restricted: Current Role is "{currentRole.toUpperCase()}"
                </h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  In accordance with Section 5.6 of the Esports Commission brief, private driver fields (email, phone number, age, and minor guardian consent records) are never exposed to Public Spectators, Drivers, or Team Principals.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenRoleModal}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] transition-colors cursor-pointer"
              >
                Switch Demo Role to "AERC Steward & Organiser" to Inspect Vault
              </button>
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
                        <td className="py-3 px-4 font-mono text-[#F4F5F7]">{rec.email}</td>
                        <td className="py-3 px-4 font-mono text-[#F4F5F7]">{rec.phone}</td>
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
                            DPA Consent Accepted ({rec.consentTimestamp.slice(0, 10)})
                          </div>
                          {rec.isMinor && (
                            <div className="text-[11px] text-[#F59E0B]">
                              Guardian Consent Verified: {rec.parentalConsentVerified ? 'Yes' : 'Pending'}
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
