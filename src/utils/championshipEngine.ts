import {
  DriverPublic,
  DriverStandingRow,
  ParsedRacenetRow,
  PointsConfig,
  RallyRound,
  RoundResultEntry,
  Team,
  TeamStandingRow,
} from '../types/aerc';

export const DEFAULT_AERC_POINTS_CONFIG: PointsConfig = {
  positionPoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  powerStagePoints: [5, 4, 3, 2, 1],
  droppedRoundsCount: 0,
  maxDriversPerTeam: 3,
  scoringDriversPerTeamRound: 2, // Top 2 finishers per team score towards Teams Championship
};

/**
 * Calculates base points from finishing position (1-indexed)
 */
export function getPositionPoints(
  position: number,
  status: 'Finished' | 'DNF' | 'DNS',
  config: PointsConfig = DEFAULT_AERC_POINTS_CONFIG
): number {
  if (status !== 'Finished' || position <= 0) return 0;
  const idx = position - 1;
  return idx < config.positionPoints.length ? config.positionPoints[idx] : 0;
}

/**
 * Calculates Power Stage bonus points (1 to 5)
 */
export function getPowerStagePoints(
  powerStageRank: number | null,
  status: 'Finished' | 'DNF' | 'DNS',
  config: PointsConfig = DEFAULT_AERC_POINTS_CONFIG
): number {
  if (status !== 'Finished' || !powerStageRank || powerStageRank <= 0) return 0;
  const idx = powerStageRank - 1;
  return idx < config.powerStagePoints.length ? config.powerStagePoints[idx] : 0;
}

/**
 * Computes full Drivers' Championship Standings across all completed rounds,
 * including dropped rounds, steward penalties, and FIA/WRC countback tiebreakers.
 */
export function calculateDriverStandings(
  drivers: DriverPublic[],
  teams: Team[],
  rounds: RallyRound[],
  config: PointsConfig = DEFAULT_AERC_POINTS_CONFIG,
  filters?: {
    platform?: string;
    controls?: string;
    nationality?: string;
  }
): DriverStandingRow[] {
  if (drivers.length === 0) return [];

  const completedRounds = rounds
    .filter((r) => r.status === 'Completed')
    .sort((a, b) => a.roundNumber - b.roundNumber);

  // Pre-index results and registered driver IDs per round for O(1) lookup
  const roundIndexes = completedRounds.map((round) => {
    const resultByDriverId = new Map<string, RoundResultEntry>();
    for (let i = 0; i < round.results.length; i++) {
      const res = round.results[i];
      resultByDriverId.set(res.driverId, res);
    }
    const registeredSet = new Set<string>(round.registeredDriverIds);
    return { round, resultByDriverId, registeredSet };
  });

  const teamMap = new Map<string, Team>();
  for (let i = 0; i < teams.length; i++) {
    teamMap.set(teams[i].id, teams[i]);
  }

  const hasPlatformFilter = Boolean(filters?.platform && filters.platform !== 'All');
  const hasControlsFilter = Boolean(filters?.controls && filters.controls !== 'All');
  const hasNatFilter = Boolean(filters?.nationality && filters.nationality !== 'All');

  const filteredDrivers =
    hasPlatformFilter || hasControlsFilter || hasNatFilter
      ? drivers.filter((d) => {
          if (hasPlatformFilter && d.platform !== filters!.platform) return false;
          if (hasControlsFilter && d.controls !== filters!.controls) return false;
          if (hasNatFilter && d.nationality !== filters!.nationality) return false;
          return true;
        })
      : drivers;

  const rows: DriverStandingRow[] = filteredDrivers.map((driver) => {
    let roundsEntered = 0;
    let wins = 0;
    let podiums = 0;
    let powerStageWins = 0;
    let bestFinish = 999;
    let rawPoints = 0;
    let penaltyPoints = 0;

    const roundScores = roundIndexes.map(({ round, resultByDriverId, registeredSet }) => {
      const entry = resultByDriverId.get(driver.id);
      if (!entry) {
        const wasRegistered = registeredSet.has(driver.id);
        return {
          roundId: round.id,
          roundNumber: round.roundNumber,
          position: null,
          status: (wasRegistered ? 'DNS' : 'DNE') as 'DNS' | 'DNE',
          basePoints: 0,
          powerStagePoints: 0,
          penaltyPoints: 0,
          netPoints: 0,
          isDropped: false,
        };
      }

      if (entry.status !== 'DNS') {
        roundsEntered += 1;
      }

      if (entry.status === 'Finished' && entry.position > 0) {
        if (entry.position === 1) wins += 1;
        if (entry.position <= 3) podiums += 1;
        if (entry.position < bestFinish) bestFinish = entry.position;
      }

      if (entry.status === 'Finished' && entry.powerStageRank === 1) {
        powerStageWins += 1;
      }

      const base = getPositionPoints(entry.position, entry.status, config);
      const ps = getPowerStagePoints(entry.powerStageRank, entry.status, config);
      const pen = entry.stewardPenaltyPoints || 0;
      const net = Math.max(0, base + ps - pen);

      rawPoints += base + ps;
      penaltyPoints += pen;

      return {
        roundId: round.id,
        roundNumber: round.roundNumber,
        position: entry.status === 'Finished' ? entry.position : null,
        status: entry.status,
        basePoints: base,
        powerStagePoints: ps,
        penaltyPoints: pen,
        netPoints: net,
        isDropped: false,
        penaltyNote: entry.stewardPenaltyNote,
      };
    });

    // Apply dropped rounds if configured and enough rounds exist
    let droppedPoints = 0;
    if (config.droppedRoundsCount > 0 && completedRounds.length > config.droppedRoundsCount) {
      const sortedIndices = roundScores
        .map((score, idx) => ({ idx, netPoints: score.netPoints }))
        .sort((a, b) => a.netPoints - b.netPoints);

      for (let i = 0; i < config.droppedRoundsCount; i++) {
        const dropTarget = sortedIndices[i];
        if (dropTarget) {
          roundScores[dropTarget.idx].isDropped = true;
          droppedPoints += dropTarget.netPoints;
        }
      }
    }

    let totalPoints = 0;
    for (let i = 0; i < roundScores.length; i++) {
      if (!roundScores[i].isDropped) {
        totalPoints += roundScores[i].netPoints;
      }
    }

    const team = driver.teamId ? teamMap.get(driver.teamId) : undefined;

    return {
      rank: 0,
      driver,
      teamName: team ? team.name : 'Privateer Entry',
      roundsEntered,
      wins,
      podiums,
      powerStageWins,
      bestFinish: bestFinish === 999 ? 0 : bestFinish,
      rawPoints,
      droppedPoints,
      penaltyPoints,
      totalPoints,
      roundScores,
    };
  });

  // Sort by totalPoints DESC, then wins DESC, then podiums DESC, then bestFinish ASC
  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.podiums !== a.podiums) return b.podiums - a.podiums;
    const aBest = a.bestFinish === 0 ? 999 : a.bestFinish;
    const bBest = b.bestFinish === 0 ? 999 : b.bestFinish;
    if (aBest !== bBest) return aBest - bBest;
    return a.driver.fullName.localeCompare(b.driver.fullName);
  });

  for (let i = 0; i < rows.length; i++) {
    rows[i].rank = i + 1;
  }

  return rows;
}

/**
 * Computes Teams' Championship Standings.
 * Rules: Teams can have up to 3 drivers (`maxDriversPerTeam`),
 * only drivers who opted in to team points (`teamPointsOptIn`) and belong to an active team count,
 * and top N (`scoringDriversPerTeamRound`) drivers score per round.
 */
export function calculateTeamStandings(
  drivers: DriverPublic[],
  teams: Team[],
  rounds: RallyRound[],
  config: PointsConfig = DEFAULT_AERC_POINTS_CONFIG
): TeamStandingRow[] {
  if (teams.length === 0) return [];

  const completedRounds = rounds
    .filter((r) => r.status === 'Completed')
    .sort((a, b) => a.roundNumber - b.roundNumber);

  const activeTeams = teams.filter((t) => t.activeForTeamChampionship);
  if (activeTeams.length === 0) return [];

  // Pre-group opted-in drivers by teamId for O(1) lookup
  const driversByTeam = new Map<string, DriverPublic[]>();
  for (let i = 0; i < drivers.length; i++) {
    const drv = drivers[i];
    if (drv.teamId && drv.teamPointsOptIn) {
      let list = driversByTeam.get(drv.teamId);
      if (!list) {
        list = [];
        driversByTeam.set(drv.teamId, list);
      }
      list.push(drv);
    }
  }

  const rows: TeamStandingRow[] = activeTeams.map((team) => {
    const teamDrivers = driversByTeam.get(team.id) || [];
    const teamDriverIds = new Set<string>();
    for (let i = 0; i < teamDrivers.length; i++) {
      teamDriverIds.add(teamDrivers[i].id);
    }

    let wins = 0;
    let podiums = 0;
    let roundsScored = 0;
    let totalPoints = 0;

    const roundPoints = completedRounds.map((round) => {
      const teamEntries = round.results.filter((res) =>
        teamDriverIds.has(res.driverId)
      );

      if (teamEntries.some((e) => e.status !== 'DNS')) {
        roundsScored += 1;
      }

      const driverNetScores = teamEntries.map((entry) => {
        if (entry.status === 'Finished') {
          if (entry.position === 1) wins += 1;
          if (entry.position > 0 && entry.position <= 3) podiums += 1;
        }
        const base = getPositionPoints(entry.position, entry.status, config);
        const ps = getPowerStagePoints(entry.powerStageRank, entry.status, config);
        const pen = entry.stewardPenaltyPoints || 0;
        return Math.max(0, base + ps - pen);
      });

      driverNetScores.sort((a, b) => b - a);
      const limit = Math.min(driverNetScores.length, config.scoringDriversPerTeamRound);
      let sumRound = 0;
      for (let i = 0; i < limit; i++) {
        sumRound += driverNetScores[i];
      }
      totalPoints += sumRound;

      return {
        roundId: round.id,
        roundNumber: round.roundNumber,
        points: sumRound,
      };
    });

    return {
      rank: 0,
      team,
      drivers: teamDrivers,
      roundsScored,
      wins,
      podiums,
      totalPoints,
      roundPoints,
    };
  });

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.podiums - a.podiums;
  });

  for (let i = 0; i < rows.length; i++) {
    rows[i].rank = i + 1;
  }

  return rows;
}

/**
 * Matches a raw EA Racenet export row to registered drivers using:
 * 1. Exact Racenet Name match (case-insensitive)
 * 2. EA Account ID match (handles "WRC Player" privacy mask when EA ID is present)
 * 3. Historical Racenet Alias match
 * 4. Flags remaining "WRC Player" or unknown Racenet names for 1-click Organiser resolution.
 */
function createRacenetDriverMatcher(drivers: DriverPublic[]) {
  const exactDrivers = new Map<string, DriverPublic>();
  const eaIdDrivers = new Map<string, DriverPublic>();
  const aliasDrivers = new Map<string, DriverPublic>();
  const fuzzyDrivers = drivers.map((driver) => ({
    driver,
    firstName: driver.firstName.toLowerCase(),
    lastName: driver.lastName.toLowerCase(),
    racenetName: driver.racenetName.toLowerCase(),
  }));

  for (const driver of drivers) {
    const racenetName = driver.racenetName.trim().toLowerCase();
    if (racenetName && !exactDrivers.has(racenetName)) {
      exactDrivers.set(racenetName, driver);
    }

    const eaAccountId = driver.eaAccountId?.trim().toLowerCase();
    if (eaAccountId && !eaIdDrivers.has(eaAccountId)) {
      eaIdDrivers.set(eaAccountId, driver);
    }

    for (const alias of driver.racenetAliases) {
      const normalizedAlias = alias.trim().toLowerCase();
      if (normalizedAlias && !aliasDrivers.has(normalizedAlias)) {
        aliasDrivers.set(normalizedAlias, driver);
      }
    }
  }

  return (rawRacenetName: string, eaAccountId: string | undefined): {
  matchedDriverId: string | null;
  matchConfidence: ParsedRacenetRow['matchConfidence'];
  suggestedDriverId?: string;
  } => {
    const normalizedName = rawRacenetName.trim().toLowerCase();
    const normalizedEaId = eaAccountId?.trim().toLowerCase();

    // 1. Check exact Racenet Name
    if (normalizedName && normalizedName !== 'wrc player') {
      const exactDriver = exactDrivers.get(normalizedName);
      if (exactDriver) {
        return {
          matchedDriverId: exactDriver.id,
          matchConfidence: 'exact_racenet',
        };
      }
    }

    // 2. Check EA Account ID (Crucial when driver has EA privacy sharing off -> "WRC Player")
    if (normalizedEaId) {
      const eaIdDriver = eaIdDrivers.get(normalizedEaId);
      if (eaIdDriver) {
        return {
          matchedDriverId: eaIdDriver.id,
          matchConfidence: 'ea_account_id',
        };
      }
    }

    // 3. Check historical Racenet aliases
    if (normalizedName && normalizedName !== 'wrc player') {
      const aliasDriver = aliasDrivers.get(normalizedName);
      if (aliasDriver) {
        return {
          matchedDriverId: aliasDriver.id,
          matchConfidence: 'alias_match',
        };
      }
    }

    // 4. Unmatched — check if generic "WRC Player" mask or fuzzy suggestion
    if (normalizedName === 'wrc player') {
      return {
        matchedDriverId: null,
        matchConfidence: 'unmatched_wrc_player',
      };
    }

    return {
      matchedDriverId: null,
      matchConfidence: 'unmatched_unknown',
      suggestedDriverId: fuzzyDrivers.find(
        ({ firstName, lastName, racenetName }) =>
          normalizedName.includes(lastName) ||
          normalizedName.includes(firstName) ||
          racenetName.includes(normalizedName)
      )?.driver.id,
    };
  };
}

export function matchRacenetRowToDriver(
  rawRacenetName: string,
  eaAccountId: string | undefined,
  drivers: DriverPublic[]
): {
  matchedDriverId: string | null;
  matchConfidence: ParsedRacenetRow['matchConfidence'];
  suggestedDriverId?: string;
} {
  return createRacenetDriverMatcher(drivers)(rawRacenetName, eaAccountId);
}

function parseCsvRecords(csvText: string): string[][] {
  const text = csvText.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || '';
  let quoted = false;
  let commaCount = 0;
  let semicolonCount = 0;
  let tabCount = 0;

  for (let i = 0; i < firstLine.length; i++) {
    if (firstLine[i] === '"') {
      if (quoted && firstLine[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (firstLine[i] === ',') commaCount++;
      if (firstLine[i] === ';') semicolonCount++;
      if (firstLine[i] === '\t') tabCount++;
    }
  }

  const delimiter =
    tabCount > commaCount && tabCount > semicolonCount
      ? '\t'
      : semicolonCount > commaCount
        ? ';'
        : ',';
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === delimiter) {
      record.push(field.trim());
      field = '';
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      record.push(field.trim());
      if (record.some((cell) => cell.length > 0)) records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }

  record.push(field.trim());
  if (record.some((cell) => cell.length > 0)) records.push(record);
  return records;
}

function normalizeCsvHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Parses RaceNet exports by header, then matches rows to registered drivers. */
export function parseAndMatchRacenetCsv(
  csvText: string,
  drivers: DriverPublic[]
): ParsedRacenetRow[] {
  const records = parseCsvRecords(csvText);
  const positionHeaders = ['position', 'pos', 'rank', 'overallposition', 'stageposition'];
  const playerHeaders = [
    'player',
    'playername',
    'racenetname',
    'driver',
    'drivername',
    'displayname',
    'username',
  ];
  const headerRowIndex = records.findIndex((record) => {
    const headers = record.map(normalizeCsvHeader);
    return (
      headers.some((header) => positionHeaders.includes(header)) &&
      headers.some((header) => playerHeaders.includes(header))
    );
  });
  if (headerRowIndex < 0) return [];

  const headers = records[headerRowIndex].map(normalizeCsvHeader);
  const getColumn = (aliases: string[]) =>
    headers.findIndex((header) => aliases.includes(header));
  const positionColumn = getColumn(positionHeaders);
  const playerColumn = getColumn(playerHeaders);
  const eaIdColumn = getColumn(['eaaccountid', 'eaid', 'accountid']);
  const carColumn = getColumn(['car', 'vehicle', 'vehiclename']);
  const timeColumn = getColumn(['time', 'totaltime', 'eventtime', 'stagetime', 'racetime']);
  const gapColumn = getColumn(['gap', 'diff', 'diff1st', 'difference1st', 'gaptoleader', 'interval']);
  const powerStageColumn = getColumn(['powerstagerank', 'powerstageposition', 'psrank']);
  const statusColumn = getColumn(['status', 'classificationstatus', 'result']);

  const read = (record: string[], column: number) =>
    column >= 0 ? (record[column] || '').trim() : '';
  const matchDriver = createRacenetDriverMatcher(drivers);
  const parsedRows: ParsedRacenetRow[] = [];
  for (let recordIndex = headerRowIndex + 1; recordIndex < records.length; recordIndex++) {
    const record = records[recordIndex];
    const racenetName = read(record, playerColumn);
    if (!racenetName) continue;

    const positionText = read(record, positionColumn);
    const statusText = read(record, statusColumn) || positionText;
    const normalizedStatus = statusText.toLowerCase();
    const status: ParsedRacenetRow['status'] = /\b(dns|did not start)\b/.test(
      normalizedStatus
    )
      ? 'DNS'
      : /\b(dnf|did not finish|retired|abandoned)\b/.test(normalizedStatus)
        ? 'DNF'
        : 'Finished';
    const parsedPosition = Number.parseInt(positionText.match(/\d+/)?.[0] || '', 10);
    const position =
      status === 'Finished'
        ? Number.isFinite(parsedPosition) && parsedPosition > 0
          ? parsedPosition
          : 0
        : 0;
    const eaAccountId = read(record, eaIdColumn) || undefined;
    const car = read(record, carColumn);
    const totalTime = read(record, timeColumn);
    const gap = read(record, gapColumn);
    const rawPowerStageRank = Number.parseInt(read(record, powerStageColumn), 10);
    const powerStageRank =
      Number.isFinite(rawPowerStageRank) && rawPowerStageRank >= 1 && rawPowerStageRank <= 5
        ? rawPowerStageRank
        : null;
    const matchResult = matchDriver(racenetName, eaAccountId);

    parsedRows.push({
      position,
      racenetName,
      eaAccountId,
      car,
      totalTime,
      gap,
      powerStageRank,
      status,
      matchedDriverId: matchResult.matchedDriverId,
      matchConfidence: matchResult.matchConfidence,
      suggestedDriverId: matchResult.suggestedDriverId,
    });
  }
  return parsedRows;
}

/**
 * Validates whether a driver can join a team (max 3 drivers per team in AERC regulations).
 */
export function canAssignDriverToTeam(
  team: Team,
  driverId: string,
  maxDrivers: number = 3
): { allowed: boolean; reason?: string } {
  if (team.driverIds.includes(driverId)) {
    return { allowed: true };
  }
  if (team.driverIds.length >= maxDrivers) {
    return {
      allowed: false,
      reason: `Team "${team.name}" already has the maximum of ${maxDrivers} registered drivers.`,
    };
  }
  return { allowed: true };
}
