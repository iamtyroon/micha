import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_AERC_POINTS_CONFIG,
  getPositionPoints,
  getPowerStagePoints,
  calculateDriverStandings,
  calculateTeamStandings,
  matchRacenetRowToDriver,
  parseAndMatchRacenetCsv,
  canAssignDriverToTeam,
} from './championshipEngine';
import { DriverPublic, RallyRound, Team } from '../types/aerc';

const mockDrivers: DriverPublic[] = [
  {
    id: 'drv-1',
    firstName: 'Karan',
    lastName: 'Patel',
    fullName: 'Karan Patel',
    racenetName: 'KPatel_KE',
    eaAccountId: 'EA-9901-KE',
    racenetAliases: ['KaranRallyKE'],
    teamId: 'team-1',
    teamPointsOptIn: true,
    carMakeModel: 'Toyota GR Yaris Rally1 HYBRID',
    nationality: 'Kenya',
    countryCode: 'KE',
    countryOfResidence: 'Kenya',
    platform: 'PC',
    controls: 'Wheel & Pedals',
    claimedAccount: true,
    avatarColor: '#E11D48',
    number: '14',
    carHistory: [],
  },
  {
    id: 'drv-2',
    firstName: 'Hamza',
    lastName: 'Anwar',
    fullName: 'Hamza Anwar',
    racenetName: 'AnwarSpeed_254',
    eaAccountId: 'EA-8820-KE',
    racenetAliases: ['Hamza_WRC'],
    teamId: 'team-1',
    teamPointsOptIn: true,
    carMakeModel: 'Hyundai i20 N Rally1 HYBRID',
    nationality: 'Kenya',
    countryCode: 'KE',
    countryOfResidence: 'Kenya',
    platform: 'PlayStation',
    controls: 'Wheel & Pedals',
    claimedAccount: true,
    avatarColor: '#F59E0B',
    number: '22',
    carHistory: [],
  },
  {
    id: 'drv-3',
    firstName: 'Muna',
    lastName: 'Singh',
    fullName: 'Muna Singh Jr',
    racenetName: 'LusakaApex_ZM',
    eaAccountId: 'EA-7712-ZM',
    racenetAliases: ['MSingh_ZM'],
    teamId: 'team-2',
    teamPointsOptIn: true,
    carMakeModel: 'Ford Puma Rally1 HYBRID',
    nationality: 'Zambia',
    countryCode: 'ZM',
    countryOfResidence: 'Zambia',
    platform: 'Xbox',
    controls: 'Controller',
    claimedAccount: false,
    avatarColor: '#10B981',
    number: '07',
    carHistory: [],
  },
];

const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Rift Valley Simworks',
    shortCode: 'RVS',
    managerName: 'Nikhil Sachania',
    managerEmail: 'nikhil@simracingkenya.org',
    countryCode: 'KE',
    liveryColor: '#E11D48',
    driverIds: ['drv-1', 'drv-2'],
    activeForTeamChampionship: true,
  },
  {
    id: 'team-2',
    name: 'Copperbelt Motorsport ZM',
    shortCode: 'CMZ',
    managerName: 'Jassy Singh',
    managerEmail: 'jassy@zambiarally.org',
    countryCode: 'ZM',
    liveryColor: '#10B981',
    driverIds: ['drv-3'],
    activeForTeamChampionship: true,
  },
];

const mockRounds: RallyRound[] = [
  {
    id: 'rnd-1',
    roundNumber: 1,
    name: 'AERC 1 Safari Rally Kenya',
    country: 'Kenya',
    countryCode: 'KE',
    surface: 'Safari Gravel',
    startDate: '2026-03-20',
    endDate: '2026-03-22',
    entryDeadline: '2026-03-15',
    status: 'Completed',
    stagesCount: 12,
    totalDistanceKm: 148.4,
    registeredDriverIds: ['drv-1', 'drv-2', 'drv-3'],
    racenetClubEventId: 'EA-CLUB-AERC-001',
    results: [
      {
        driverId: 'drv-1',
        rawRacenetName: 'KPatel_KE',
        position: 1,
        status: 'Finished',
        totalTime: '01:14:22.410',
        gapToLeader: '00:00.000',
        powerStageRank: 1, // 25 + 5 = 30 pts
        carUsed: 'Toyota GR Yaris Rally1 HYBRID',
        stewardPenaltyPoints: 0,
        matchStatus: 'exact',
      },
      {
        driverId: 'drv-3',
        rawRacenetName: 'LusakaApex_ZM',
        position: 2,
        status: 'Finished',
        totalTime: '01:14:38.900',
        gapToLeader: '+00:16.490',
        powerStageRank: 2, // 18 + 4 = 22 pts
        carUsed: 'Ford Puma Rally1 HYBRID',
        stewardPenaltyPoints: 2, // Steward penalty 2 pts -> 20 net
        stewardPenaltyNote: 'Jump start Stage 4',
        matchStatus: 'exact',
      },
      {
        driverId: 'drv-2',
        rawRacenetName: 'AnwarSpeed_254',
        position: 3,
        status: 'Finished',
        totalTime: '01:15:02.115',
        gapToLeader: '+00:39.705',
        powerStageRank: 3, // 15 + 3 = 18 pts
        carUsed: 'Hyundai i20 N Rally1 HYBRID',
        stewardPenaltyPoints: 0,
        matchStatus: 'exact',
      },
    ],
  },
];

test('position and power stage points calculation follows FIA WRC scale', () => {
  assert.equal(getPositionPoints(1, 'Finished'), 25);
  assert.equal(getPositionPoints(2, 'Finished'), 18);
  assert.equal(getPositionPoints(10, 'Finished'), 1);
  assert.equal(getPositionPoints(11, 'Finished'), 0);
  assert.equal(getPositionPoints(1, 'DNF'), 0);

  assert.equal(getPowerStagePoints(1, 'Finished'), 5);
  assert.equal(getPowerStagePoints(5, 'Finished'), 1);
  assert.equal(getPowerStagePoints(null, 'Finished'), 0);
  assert.equal(getPowerStagePoints(1, 'DNF'), 0);
});

test('driver standings calculate net points, penalties, and rankings accurately', () => {
  const standings = calculateDriverStandings(mockDrivers, mockTeams, mockRounds);
  assert.equal(standings.length, 3);
  assert.equal(standings[0].driver.id, 'drv-1');
  assert.equal(standings[0].totalPoints, 30); // 25 + 5

  assert.equal(standings[1].driver.id, 'drv-3');
  assert.equal(standings[1].totalPoints, 20); // 18 + 4 - 2 penalty

  assert.equal(standings[2].driver.id, 'drv-2');
  assert.equal(standings[2].totalPoints, 18); // 15 + 3
});

test('team standings aggregate top 2 scoring drivers per round', () => {
  const teamStandings = calculateTeamStandings(mockDrivers, mockTeams, mockRounds);
  assert.equal(teamStandings[0].team.id, 'team-1');
  assert.equal(teamStandings[0].totalPoints, 48); // 30 (Karan) + 18 (Hamza)
  assert.equal(teamStandings[1].team.id, 'team-2');
  assert.equal(teamStandings[1].totalPoints, 20); // 20 (Muna)
});

test('Racenet matcher resolves exact names, EA Account IDs for WRC Player masks, and aliases', () => {
  const exact = matchRacenetRowToDriver('KPatel_KE', undefined, mockDrivers);
  assert.equal(exact.matchedDriverId, 'drv-1');
  assert.equal(exact.matchConfidence, 'exact_racenet');

  // When a driver turns off EA data sharing, CSV shows "WRC Player" but keeps EA Account ID
  const wrcPlayerWithId = matchRacenetRowToDriver('WRC Player', 'EA-7712-ZM', mockDrivers);
  assert.equal(wrcPlayerWithId.matchedDriverId, 'drv-3');
  assert.equal(wrcPlayerWithId.matchConfidence, 'ea_account_id');

  // Historical alias match
  const aliasMatch = matchRacenetRowToDriver('Hamza_WRC', undefined, mockDrivers);
  assert.equal(aliasMatch.matchedDriverId, 'drv-2');
  assert.equal(aliasMatch.matchConfidence, 'alias_match');

  // Unmatched WRC Player without EA ID
  const unmatchedMask = matchRacenetRowToDriver('WRC Player', undefined, mockDrivers);
  assert.equal(unmatchedMask.matchedDriverId, null);
  assert.equal(unmatchedMask.matchConfidence, 'unmatched_wrc_player');
});

test('Team 3-driver limit enforcement works properly', () => {
  const fullTeam: Team = {
    ...mockTeams[0],
    driverIds: ['drv-1', 'drv-2', 'drv-3'],
  };
  const checkNew = canAssignDriverToTeam(fullTeam, 'drv-4', 3);
  assert.equal(checkNew.allowed, false);

  const checkExisting = canAssignDriverToTeam(fullTeam, 'drv-1', 3);
  assert.equal(checkExisting.allowed, true);
});
