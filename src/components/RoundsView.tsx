import React, { useMemo, useState } from 'react';
import {
  DriverPublic,
  PointsConfig,
  RallyRound,
  Team,
  UserProfile,
} from '../types/aerc';
import {
  getPositionPoints,
  getPowerStagePoints,
} from '../utils/championshipEngine';
import {
  getCircuitMapForRound,
  OFFICIAL_AERC_CIRCUIT_MAPS,
} from '../utils/rallyMapsData';
import {
  Share2,
  Upload,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  MapPin,
  Compass,
  Flag,
} from 'lucide-react';

interface RoundsViewProps {
  rounds: RallyRound[];
  selectedRoundId: string;
  onSelectRoundId: (roundId: string) => void;
  onCreateRound: (
    round: Omit<RallyRound, 'id' | 'registeredDriverIds' | 'results'>
  ) => string;
  drivers: DriverPublic[];
  teams: Team[];
  pointsConfig: PointsConfig;
  onSelectDriver: (driverId: string) => void;
  onNavigateToRegister: (roundId?: string) => void;
  onNavigateToControl: (roundId: string) => void;
  onOpenShareGraphics: (roundId: string) => void;
  userProfile: UserProfile | null;
}

export const RoundsView: React.FC<RoundsViewProps> = React.memo(({
  rounds,
  selectedRoundId,
  onSelectRoundId,
  onCreateRound,
  drivers,
  teams,
  pointsConfig,
  onSelectDriver,
  onNavigateToRegister,
  onNavigateToControl,
  onOpenShareGraphics,
  userProfile,
}) => {
  const isOrganizer = userProfile?.role === 'organizer';
  const canSubmitDriverEntry =
    userProfile?.role === 'driver' || userProfile?.role === 'organizer';

  const [subTab, setSubTab] = useState<'map' | 'results' | 'entryList'>('map');
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>(
    OFFICIAL_AERC_CIRCUIT_MAPS[0].id
  );
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);

  // Create Round Form State
  const [roundName, setRoundName] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [surface, setSurface] = useState<
    'Gravel' | 'Asphalt' | 'Mixed' | 'Safari Gravel'
  >('Gravel');
  const [startDate, setStartDate] = useState('2026-06-19');
  const [endDate, setEndDate] = useState('2026-06-21');
  const [entryDeadline, setEntryDeadline] = useState('2026-06-15');
  const [stagesCount, setStagesCount] = useState('12');
  const [totalDistanceKm, setTotalDistanceKm] = useState('150.0');
  const [racenetClubEventId, setRacenetClubEventId] = useState('');

  const activeRound = useMemo(
    () => rounds.find((r) => r.id === selectedRoundId) || rounds[0],
    [rounds, selectedRoundId]
  );

  const activeCircuitMap = useMemo(
    () => getCircuitMapForRound(activeRound, selectedCircuitId),
    [activeRound, selectedCircuitId]
  );

  const driverMap = useMemo(() => {
    const map = new Map<string, DriverPublic>();
    for (let i = 0; i < drivers.length; i++) {
      map.set(drivers[i].id, drivers[i]);
    }
    return map;
  }, [drivers]);

  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    for (let i = 0; i < teams.length; i++) {
      map.set(teams[i].id, teams[i]);
    }
    return map;
  }, [teams]);

  const registeredDrivers = useMemo(
    () =>
      activeRound
        ? activeRound.registeredDriverIds
            .map((id) => driverMap.get(id))
            .filter((d): d is DriverPublic => Boolean(d))
        : [],
    [activeRound, driverMap]
  );

  const handleCreateRoundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundName.trim()) return;
    const codeMap: Record<string, string> = {
      Kenya: 'KE',
      Zambia: 'ZM',
      'South Africa': 'ZA',
      Uganda: 'UG',
      Rwanda: 'RW',
      Tanzania: 'TZ',
      Zimbabwe: 'ZW',
    };
    const nextNum = rounds.length + 1;
    const newId = onCreateRound({
      roundNumber: nextNum,
      name: roundName.trim(),
      country,
      countryCode: codeMap[country] || 'AF',
      surface,
      startDate,
      endDate,
      entryDeadline,
      status: 'Registration Open',
      stagesCount: parseInt(stagesCount, 10) || 12,
      totalDistanceKm: parseFloat(totalDistanceKm) || 150.0,
      racenetClubEventId: racenetClubEventId.trim() || `EA-CLUB-R${nextNum}`,
    });
    if (newId) {
      onSelectRoundId(newId);
      setRoundName('');
      setRacenetClubEventId('');
      setShowCreateForm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tournament Round / Circuit Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#222731]">
        <div>
          <div className="text-xs text-[#9CA3AF]">
            AERC Rally Route Maps & Championship Tournaments · {rounds.length}{' '}
            Tournaments Created · {OFFICIAL_AERC_CIRCUIT_MAPS.length} Official Circuits
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#F4F5F7] mt-1">
            Stage Maps & Tournament Rounds
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rounds.map((rnd) => {
            const isSelected = activeRound && rnd.id === activeRound.id;
            return (
              <button
                key={rnd.id}
                type="button"
                onClick={() => {
                  onSelectRoundId(rnd.id);
                  setShowCreateForm(false);
                }}
                className={`px-3.5 py-2 text-xs font-semibold rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected && !showCreateForm
                    ? 'bg-[#E11D48] border-[#E11D48] text-white'
                    : 'bg-[#12161D] border-[#222731] text-[#9CA3AF] hover:text-[#F4F5F7]'
                }`}
              >
                R{rnd.roundNumber}: {rnd.country} ({rnd.status})
              </button>
            );
          })}
          {isOrganizer && (
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-3.5 py-2 text-xs font-semibold rounded border border-[#10B981]/50 bg-[#12161D] text-[#10B981] hover:bg-[#181D26] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create New Rally Round</span>
            </button>
          )}
        </div>
      </div>

      {/* Create Round Form — Strictly Restricted to Organizer Role */}
      {isOrganizer && showCreateForm && (
        <form
          onSubmit={handleCreateRoundSubmit}
          className="p-6 bg-[#12161D] border border-[#222731] rounded-lg space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#222731] pb-3">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                Create Championship Rally Round
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Add an event to your championship calendar to open driver registrations and stage classifications.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="rnd-name" className="block text-xs text-[#9CA3AF] mb-1">
                Rally Event Name *
              </label>
              <input
                id="rnd-name"
                type="text"
                required
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                placeholder="Enter event name (e.g. Round 1 Safari Rally Kenya)"
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>

            <div>
              <label htmlFor="rnd-country" className="block text-xs text-[#9CA3AF] mb-1">
                Host Country *
              </label>
              <select
                id="rnd-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                <option value="Kenya">Kenya</option>
                <option value="Zambia">Zambia</option>
                <option value="Uganda">Uganda</option>
                <option value="South Africa">South Africa</option>
                <option value="Rwanda">Rwanda</option>
                <option value="Tanzania">Tanzania</option>
                <option value="Zimbabwe">Zimbabwe</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="rnd-surface" className="block text-xs text-[#9CA3AF] mb-1">
                Surface
              </label>
              <select
                id="rnd-surface"
                value={surface}
                onChange={(e) => setSurface(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                <option value="Gravel">Gravel</option>
                <option value="Safari Gravel">Safari Gravel</option>
                <option value="Asphalt">Asphalt</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label htmlFor="rnd-deadline" className="block text-xs text-[#9CA3AF] mb-1">
                Entry Deadline
              </label>
              <input
                id="rnd-deadline"
                type="date"
                value={entryDeadline}
                onChange={(e) => setEntryDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7]"
              />
            </div>

            <div>
              <label htmlFor="rnd-start" className="block text-xs text-[#9CA3AF] mb-1">
                Start Date
              </label>
              <input
                id="rnd-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7]"
              />
            </div>

            <div>
              <label htmlFor="rnd-end" className="block text-xs text-[#9CA3AF] mb-1">
                End Date
              </label>
              <input
                id="rnd-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#10B981] rounded hover:bg-[#059669] transition-colors cursor-pointer"
            >
              Save & Open Round Registration
            </button>
          </div>
        </form>
      )}

      {/* Official African Rally Circuit Selector (when browsing maps directly or when no custom round overrides) */}
      {!activeRound && (
        <div className="p-5 bg-[#12161D] border border-[#222731] rounded-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#F4F5F7] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#F59E0B]" />
                <span>Homologated AERC Rally Stage Maps</span>
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Select an African championship host nation below to inspect its stage route map, elevation profile, and sector distances.
              </p>
            </div>
            <span className="text-xs font-mono text-[#9CA3AF]">
              {rounds.length === 0
                ? '0 Active Tournaments · Viewing Homologated Stage Maps'
                : `${rounds.length} Active Tournaments`}
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Official AERC Rally Circuit Maps"
            className="flex flex-wrap items-center gap-2"
          >
            {OFFICIAL_AERC_CIRCUIT_MAPS.map((circuit) => {
              const isSelected = circuit.id === activeCircuitMap.id;
              return (
                <button
                  key={circuit.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCircuitId(circuit.id)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#E11D48] border-[#E11D48] text-white'
                      : 'bg-[#090B0E] border-[#222731] text-[#9CA3AF] hover:text-[#F4F5F7]'
                  }`}
                >
                  {circuit.country} ({circuit.countryCode}) · {circuit.primarySurface}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Tournament Round Banner (when a tournament round exists) */}
      {activeRound && (
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
                Event Window:{' '}
                <strong className="text-[#F4F5F7] font-mono">
                  {activeRound.startDate}
                </strong>{' '}
                to{' '}
                <strong className="text-[#F4F5F7] font-mono">
                  {activeRound.endDate}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Registration Deadline:{' '}
                <strong className="text-[#F59E0B] font-mono">
                  {activeRound.entryDeadline}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Public Entries:{' '}
                <strong className="text-[#10B981] font-mono">
                  {registeredDrivers.length} Drivers
                </strong>
              </span>
            </div>
          </div>

          {userProfile && (
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
                  {canSubmitDriverEntry && (
                    <button
                      type="button"
                      onClick={() => onNavigateToRegister(activeRound.id)}
                      className="px-4 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Submit Driver Entry</span>
                    </button>
                  )}
                  {isOrganizer && (
                    <button
                      type="button"
                      onClick={() => onNavigateToControl(activeRound.id)}
                      className="px-4 py-2.5 text-xs font-medium text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#374151] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-[#F59E0B]" />
                      <span>Enter Round Results</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sub-navigation between Stage Route Map, Final Stage Classification, and Public Entry List */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222731] pb-3">
        <div
          role="tablist"
          aria-label="Round & Map View Mode"
          className="inline-flex p-1 bg-[#12161D] border border-[#222731] rounded-md self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'map'}
            onClick={() => setSubTab('map')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              subTab === 'map'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            Stage Route Map ({activeCircuitMap.stages.length} Sectors)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'results'}
            onClick={() => setSubTab('results')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              subTab === 'results'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            Final Stage Classification ({activeRound ? activeRound.results.length : 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'entryList'}
            onClick={() => setSubTab('entryList')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              subTab === 'entryList'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            Public Entry List ({registeredDrivers.length})
          </button>
        </div>

        <div className="text-xs text-[#9CA3AF] font-mono">
          {activeCircuitMap.regionName} · {activeCircuitMap.coordinatesLabel}
        </div>
      </div>

      {/* TAB 1: STAGE ROUTE MAP & SECTOR BREAKDOWN */}
      {subTab === 'map' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Topographic SVG Stage Route Map */}
            <div className="lg:col-span-8 bg-[#12161D] border border-[#222731] rounded-lg p-5 sm:p-6 flex flex-col justify-between space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-mono text-[#F59E0B]">
                    OFFICIAL STAGE TOPOGRAPHY · {activeCircuitMap.country.toUpperCase()} ({activeCircuitMap.countryCode})
                  </div>
                  <h3 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                    {activeCircuitMap.rallyTitle}
                  </h3>
                </div>
                <div className="text-xs font-mono text-[#9CA3AF]">
                  Service Park: <span className="text-[#F4F5F7]">{activeCircuitMap.servicePark}</span>
                </div>
              </div>

              {/* SVG Route Canvas */}
              <div className="relative rounded-md bg-[#090B0E] border border-[#222731] p-4 overflow-hidden">
                <svg
                  viewBox="0 0 800 260"
                  className="w-full h-56 sm:h-64"
                  role="img"
                  aria-label={`Stage route map for ${activeCircuitMap.rallyTitle}`}
                >
                  {/* Subtle Topographic Grid Lines */}
                  <g stroke="#181D26" strokeWidth="1">
                    <line x1="0" y1="50" x2="800" y2="50" />
                    <line x1="0" y1="100" x2="800" y2="100" />
                    <line x1="0" y1="150" x2="800" y2="150" />
                    <line x1="0" y1="200" x2="800" y2="200" />
                    <line x1="160" y1="0" x2="160" y2="260" />
                    <line x1="320" y1="0" x2="320" y2="260" />
                    <line x1="480" y1="0" x2="480" y2="260" />
                    <line x1="640" y1="0" x2="640" y2="260" />
                  </g>

                  {/* Topographic Contour Rings */}
                  <ellipse
                    cx="400"
                    cy="130"
                    rx="330"
                    ry="95"
                    fill="none"
                    stroke="#1E2532"
                    strokeWidth="1"
                    strokeDasharray="6 6"
                  />
                  <ellipse
                    cx="420"
                    cy="125"
                    rx="220"
                    ry="65"
                    fill="none"
                    stroke="#1E2532"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />

                  {/* Outer Casing of Stage Route */}
                  <path
                    d={activeCircuitMap.svgPathData}
                    fill="none"
                    stroke="#222731"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />

                  {/* Primary Rally Stage Route Path */}
                  <path
                    d={activeCircuitMap.svgPathData}
                    fill="none"
                    stroke="#E11D48"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />

                  {/* Dashed Telemetry Racing Line */}
                  <path
                    d={activeCircuitMap.svgPathData}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    strokeDasharray="5 7"
                    strokeLinecap="round"
                  />

                  {/* Sector Checkpoints & Beacons */}
                  {activeCircuitMap.sectorCheckpoints.map((pt, idx) => {
                    const isStart = idx === 0;
                    const isFinish =
                      idx === activeCircuitMap.sectorCheckpoints.length - 1;
                    const fill = isStart
                      ? '#10B981'
                      : isFinish
                      ? '#E11D48'
                      : '#F59E0B';
                    return (
                      <g key={pt.code}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="11"
                          fill="#090B0E"
                          stroke={fill}
                          strokeWidth="2.5"
                        />
                        <text
                          x={pt.x}
                          y={pt.y + 3.5}
                          textAnchor="middle"
                          fill="#F4F5F7"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          {pt.code}
                        </text>
                        <text
                          x={pt.x}
                          y={pt.y > 160 ? pt.y + 26 : pt.y - 16}
                          textAnchor="middle"
                          fill="#9CA3AF"
                          fontSize="10"
                          fontFamily="Plus Jakarta Sans, sans-serif"
                        >
                          {pt.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="mt-3 pt-3 border-t border-[#222731] flex flex-wrap items-center justify-between gap-3 text-xs text-[#9CA3AF] font-mono">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-[#10B981]">SS1: Stage Start</span>
                    <span>·</span>
                    <span className="text-[#F59E0B]">S1–S3: Split Timing Sectors</span>
                    <span>·</span>
                    <span className="text-[#E11D48]">PS: Wolf Power Stage Finish</span>
                  </div>
                  <div>
                    GPS: {activeCircuitMap.coordinatesLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Elevation & Surface Telemetry Card */}
            <div className="lg:col-span-4 bg-[#12161D] border border-[#222731] rounded-lg p-5 sm:p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-1">
                <div className="text-xs font-mono text-[#9CA3AF]">
                  CIRCUIT TELEMETRY & ALTITUDE
                </div>
                <h3 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                  Surface & Elevation Profile
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                  <div className="text-[11px] text-[#9CA3AF]">Primary Surface</div>
                  <div className="font-semibold text-sm text-[#F4F5F7] mt-0.5">
                    {activeCircuitMap.primarySurface}
                  </div>
                </div>
                <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                  <div className="text-[11px] text-[#9CA3AF]">Competitive Dist.</div>
                  <div className="font-mono text-sm font-bold text-[#F59E0B] mt-0.5 tabular-nums">
                    {activeCircuitMap.totalDistanceKm.toFixed(1)} km ({activeCircuitMap.stagesCount} SS)
                  </div>
                </div>
                <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                  <div className="text-[11px] text-[#9CA3AF]">Peak Elevation</div>
                  <div className="font-mono text-sm font-bold text-[#10B981] mt-0.5 tabular-nums">
                    {activeCircuitMap.peakElevationM} m ASL
                  </div>
                </div>
                <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                  <div className="text-[11px] text-[#9CA3AF]">Base Altitude</div>
                  <div className="font-mono text-sm font-bold text-[#F4F5F7] mt-0.5 tabular-nums">
                    {activeCircuitMap.baseElevationM} m ASL
                  </div>
                </div>
              </div>

              {/* Elevation Bar Profile */}
              <div className="p-4 bg-[#090B0E] border border-[#222731] rounded space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] font-mono">
                  <span>STAGE ELEVATION PROFILE (ASL)</span>
                  <span>
                    Δ {activeCircuitMap.peakElevationM - activeCircuitMap.baseElevationM}m
                  </span>
                </div>
                <div className="h-24 flex items-end gap-1.5 pt-2">
                  {activeCircuitMap.elevationPoints.map((elev, i) => {
                    const ratio =
                      (elev - activeCircuitMap.baseElevationM + 80) /
                      (activeCircuitMap.peakElevationM -
                        activeCircuitMap.baseElevationM +
                        120);
                    const heightPct = Math.max(
                      20,
                      Math.min(100, Math.round(ratio * 100))
                    );
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div className="w-full bg-[#181D26] rounded-t h-16 flex items-end overflow-hidden">
                          <div
                            className="w-full bg-[#E11D48]/80 rounded-t"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-[#9CA3AF] tabular-nums">
                          {elev}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Special Stage Itinerary Table */}
          <div className="bg-[#12161D] border border-[#222731] rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 bg-[#0D1016] border-b border-[#222731] flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[#F4F5F7] flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#E11D48]" />
                <span>
                  Special Stage Itinerary & Sector Breakdown — {activeCircuitMap.rallyTitle}
                </span>
              </div>
              <div className="text-xs text-[#9CA3AF] font-mono">
                Homologated Class: FIA Rally1 Hybrid
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#222731] bg-[#0D1016]/60 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    <th className="py-3.5 px-4 w-20">Stage</th>
                    <th className="py-3.5 px-4">Special Stage Name</th>
                    <th className="py-3.5 px-4">Surface & Sector Notes</th>
                    <th className="py-3.5 px-4 text-right font-mono">Distance</th>
                    <th className="py-3.5 px-4 text-right font-mono">Elevation Δ</th>
                    <th className="py-3.5 px-5 text-right font-mono">Target Avg Pace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222731] text-sm">
                  {activeCircuitMap.stages.map((st) => (
                    <tr
                      key={st.sectorNumber}
                      className="hover:bg-[#181D26] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-xs tabular-nums">
                        <span
                          className={
                            st.isPowerStage ? 'text-[#F59E0B]' : 'text-[#F4F5F7]'
                          }
                        >
                          SS{st.sectorNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#F4F5F7]">
                        <div className="flex items-center gap-2">
                          <span>{st.name}</span>
                          {st.isPowerStage && (
                            <span className="text-[11px] font-mono text-[#F59E0B]">
                              · Wolf Power Stage (+5/4/3/2/1 pts)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#9CA3AF]">
                        {st.surfaceDetail}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-[#F4F5F7] tabular-nums">
                        {st.distanceKm.toFixed(2)} km
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-[#9CA3AF] tabular-nums">
                        +{st.elevationChangeM} m
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-xs text-[#10B981] tabular-nums">
                        {st.avgSpeedKmh} km/h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FINAL STAGE CLASSIFICATION */}
      {subTab === 'results' && (
        <div className="bg-[#12161D] border border-[#222731] rounded-lg overflow-hidden">
          {!activeRound || activeRound.results.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Flag className="w-6 h-6 text-[#9CA3AF] mx-auto" />
              <div className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                No Stage Results Published Yet
              </div>
              <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
                {activeRound
                  ? `Official stage times and Power Stage classifications for ${activeRound.name} will appear here once published by Race Control.`
                  : 'Official stage classifications will appear here once a tournament round is created and completed.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#222731] bg-[#0D1016] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    <th className="py-3.5 px-4 w-14">Pos</th>
                    <th className="py-3.5 px-4">Verified Driver</th>
                    <th className="py-3.5 px-4">Raw Racenet Export Name</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">
                      Team & Rally1 Car
                    </th>
                    <th className="py-3.5 px-4 text-right font-mono">
                      Total Time
                    </th>
                    <th className="py-3.5 px-4 text-right font-mono">Gap</th>
                    <th className="py-3.5 px-3 text-right font-mono">
                      Power Stage
                    </th>
                    <th className="py-3.5 px-5 text-right font-mono text-[#F4F5F7]">
                      Net Pts
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222731] text-sm">
                  {activeRound.results.map((res) => {
                    const drv = driverMap.get(res.driverId);
                    const team = drv?.teamId
                      ? teamMap.get(drv.teamId)
                      : undefined;
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
                    const netPts = Math.max(
                      0,
                      basePts + psPts - (res.stewardPenaltyPoints || 0)
                    );

                    return (
                      <tr
                        key={`${activeRound.id}-${res.driverId}`}
                        onClick={() => drv && onSelectDriver(drv.id)}
                        className="hover:bg-[#181D26] transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold tabular-nums">
                          {res.status === 'Finished' ? (
                            <span
                              className={
                                res.position <= 3
                                  ? 'text-[#F59E0B]'
                                  : 'text-[#F4F5F7]'
                              }
                            >
                              {String(res.position).padStart(2, '0')}
                            </span>
                          ) : (
                            <span className="text-[#EF4444]">{res.status}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#F4F5F7]">
                            {drv
                              ? `#${drv.number} ${drv.fullName}`
                              : 'Unmatched Entry'}
                          </div>
                          <div className="text-xs text-[#9CA3AF]">
                            {drv?.nationality} · {drv?.platform} ·{' '}
                            {drv?.controls}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs">
                          <span className="text-[#F4F5F7]">
                            {res.rawRacenetName}
                          </span>
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
                          <div className="text-xs text-[#9CA3AF]">
                            {res.carUsed}
                          </div>
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
                              <span>
                                -{res.stewardPenaltyPoints}pt (
                                {res.stewardPenaltyNote})
                              </span>
                            </div>
                          )}
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

      {/* TAB 3: PUBLIC ENTRY LIST */}
      {subTab === 'entryList' && (
        <div className="bg-[#12161D] border border-[#222731] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 bg-[#0D1016] border-b border-[#222731] flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-[#F4F5F7]">
              Official Public Entry List —{' '}
              {activeRound ? activeRound.name : activeCircuitMap.rallyTitle}
            </div>
            <div className="text-xs text-[#10B981] font-mono">
              Public Schema Only (Name · Racenet ID · Team · Car · Nationality · Platform · Controls)
            </div>
          </div>
          {registeredDrivers.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="text-sm font-semibold text-[#F4F5F7]">
                {activeRound
                  ? `No Drivers Registered for ${activeRound.name} Yet`
                  : 'No Active Tournament Round Entry List Yet'}
              </div>
              {activeRound && canSubmitDriverEntry ? (
                <button
                  type="button"
                  onClick={() => onNavigateToRegister(activeRound.id)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] cursor-pointer"
                >
                  Onboard First Driver Entry
                </button>
              ) : (
                <p className="text-xs text-[#9CA3AF]">
                  Confirmed driver entries will appear here as drivers register for the tournament round.
                </p>
              )}
            </div>
          ) : (
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
                    const team = drv.teamId
                      ? teamMap.get(drv.teamId)
                      : undefined;
                    return (
                      <tr
                        key={drv.id}
                        onClick={() => onSelectDriver(drv.id)}
                        className="hover:bg-[#181D26] transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#F59E0B] tabular-nums">
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
                            (
                            {drv.teamPointsOptIn
                              ? 'Team Points Opt-In'
                              : 'Individual Only'}
                            )
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
          )}
        </div>
      )}
    </div>
  );
});

