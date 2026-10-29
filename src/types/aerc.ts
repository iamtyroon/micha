export type PlatformType = 'PC' | 'PlayStation' | 'Xbox';
export type ControlType = 'Wheel & Pedals' | 'Controller' | 'Keyboard';
export type UserRole = 'public' | 'driver' | 'manager' | 'admin';

export interface DriverPublic {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  racenetName: string;
  eaAccountId?: string;
  racenetAliases: string[];
  teamId: string | null;
  teamPointsOptIn: boolean;
  carMakeModel: string;
  nationality: string;
  countryCode: string;
  countryOfResidence: string;
  platform: PlatformType;
  controls: ControlType;
  claimedAccount: boolean;
  avatarColor: string;
  number: string;
  carHistory: { season: string; car: string }[];
}

export interface DriverPrivateVault {
  driverId: string;
  email: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
  isMinor: boolean;
  parentalConsentVerified: boolean;
  consentTimestamp: string;
  dataProtectionActAccepted: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortCode: string;
  managerName: string;
  managerEmail: string;
  countryCode: string;
  liveryColor: string;
  driverIds: string[]; // Max 3 drivers
  activeForTeamChampionship: boolean;
}

export interface RoundResultEntry {
  driverId: string;
  rawRacenetName: string;
  eaAccountId?: string;
  position: number; // 0 if DNS / DNF
  status: 'Finished' | 'DNF' | 'DNS';
  totalTime: string;
  gapToLeader: string;
  powerStageRank: number | null; // 1 to 5
  powerStageTime?: string;
  carUsed: string;
  stewardPenaltyPoints: number;
  stewardPenaltyNote?: string;
  matchStatus: 'exact' | 'alias' | 'ea_id' | 'unmatched' | 'resolved';
}

export interface RallyRound {
  id: string;
  roundNumber: number;
  name: string;
  country: string;
  countryCode: string;
  surface: 'Gravel' | 'Asphalt' | 'Mixed' | 'Safari Gravel';
  startDate: string;
  endDate: string;
  entryDeadline: string;
  status: 'Completed' | 'Registration Open' | 'In Progress' | 'Upcoming';
  stagesCount: number;
  totalDistanceKm: number;
  registeredDriverIds: string[];
  results: RoundResultEntry[];
  racenetClubEventId: string;
  publishedAt?: string;
}

export interface PointsConfig {
  positionPoints: number[]; // [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
  powerStagePoints: number[]; // [5, 4, 3, 2, 1]
  droppedRoundsCount: number; // e.g. 0 or 1
  maxDriversPerTeam: number; // 3
  scoringDriversPerTeamRound: number; // top 2 or 3
}

export interface DriverStandingRow {
  rank: number;
  driver: DriverPublic;
  teamName: string;
  roundsEntered: number;
  wins: number;
  podiums: number;
  powerStageWins: number;
  bestFinish: number;
  rawPoints: number;
  droppedPoints: number;
  penaltyPoints: number;
  totalPoints: number;
  roundScores: {
    roundId: string;
    roundNumber: number;
    position: number | null;
    status: 'Finished' | 'DNF' | 'DNS' | 'DNE';
    basePoints: number;
    powerStagePoints: number;
    penaltyPoints: number;
    netPoints: number;
    isDropped: boolean;
    penaltyNote?: string;
  }[];
}

export interface TeamStandingRow {
  rank: number;
  team: Team;
  drivers: DriverPublic[];
  roundsScored: number;
  wins: number;
  podiums: number;
  totalPoints: number;
  roundPoints: { roundId: string; roundNumber: number; points: number }[];
}

export interface ParsedRacenetRow {
  position: number;
  racenetName: string;
  eaAccountId?: string;
  car: string;
  totalTime: string;
  gap: string;
  powerStageRank: number | null;
  status: 'Finished' | 'DNF' | 'DNS';
  matchedDriverId: string | null;
  matchConfidence: 'exact_racenet' | 'ea_account_id' | 'alias_match' | 'unmatched_wrc_player' | 'unmatched_unknown';
  suggestedDriverId?: string;
}
