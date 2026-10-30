import {
  DriverPrivateVault,
  DriverPublic,
  RallyRound,
  Team,
} from '../types/aerc';

// Blank-slate initial state: no pre-loaded test drivers, teams, vault records, or rounds
export const INITIAL_TEAMS: Team[] = [];

export const INITIAL_DRIVERS_PUBLIC: DriverPublic[] = [];

export const INITIAL_PRIVATE_VAULT: DriverPrivateVault[] = [];

export const INITIAL_ROUNDS: RallyRound[] = [];

export const RALLY1_CARS: string[] = [
  'Toyota GR Yaris Rally1 HYBRID',
  'Hyundai i20 N Rally1 HYBRID',
  'Ford Puma Rally1 HYBRID',
];

export const CSV_HEADER_TEMPLATE = `Position,RacenetName,EAAccountID,Car,TotalTime,Gap,PowerStageRank,Status`;
