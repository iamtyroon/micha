import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  getDoc,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  DriverPrivateVault,
  DriverPublic,
  PointsConfig,
  RallyRound,
  Team,
  TeamRequest,
  UserProfile,
} from '../types/aerc';

const app = initializeApp(firebaseConfig);

function initDb(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = initDb();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
setTimeout(testConnection, 50);

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'id-1';
}

export async function saveUserProfileToDb(profile: UserProfile): Promise<void> {
  const uid = sanitizeId(profile.uid);
  const path = `users/${uid}`;
  const payload: Record<string, unknown> = {
    uid,
    email: (profile.email || 'user@aerc.org').slice(0, 254),
    displayName: (profile.displayName || 'AERC Member').slice(0, 100),
    role: profile.role,
    updatedAt: profile.updatedAt.slice(0, 64),
  };
  if (profile.username) payload.username = profile.username.slice(0, 64);
  if (profile.earcUsername)
    payload.earcUsername = profile.earcUsername.slice(0, 100);
  if (typeof profile.onboardingCompleted === 'boolean') {
    payload.onboardingCompleted = profile.onboardingCompleted;
  }
  if (typeof profile.hasPasswordSet === 'boolean') {
    payload.hasPasswordSet = profile.hasPasswordSet;
  }
  if (profile.photoURL) payload.photoURL = profile.photoURL.slice(0, 500);
  if (profile.driverId) payload.driverId = profile.driverId.slice(0, 128);
  if (profile.teamId) payload.teamId = profile.teamId.slice(0, 128);

  try {
    await setDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserProfileFromDb(uid: string): Promise<void> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  try {
    await deleteDoc(doc(db, 'users', safeUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchUserProfileFromDb(
  uid: string
): Promise<UserProfile | null> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  try {
    const snap = await getDoc(doc(db, 'users', safeUid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveDriverPublicToDb(driver: DriverPublic): Promise<void> {
  const id = sanitizeId(driver.id);
  const path = `drivers/${id}`;
  const payload: Record<string, unknown> = {
    id,
    firstName: driver.firstName.slice(0, 80),
    lastName: driver.lastName.slice(0, 80),
    fullName: driver.fullName.slice(0, 160),
    racenetName: driver.racenetName.slice(0, 100),
    racenetAliases: (driver.racenetAliases || [])
      .slice(0, 10)
      .map((a) => String(a).slice(0, 100)),
    teamId: driver.teamId ? driver.teamId.slice(0, 128) : null,
    teamPointsOptIn: Boolean(driver.teamPointsOptIn),
    carMakeModel: driver.carMakeModel.slice(0, 120),
    nationality: driver.nationality.slice(0, 80),
    countryCode: driver.countryCode.slice(0, 8),
    countryOfResidence: driver.countryOfResidence.slice(0, 80),
    platform: driver.platform,
    controls: driver.controls,
    claimedAccount: Boolean(driver.claimedAccount),
    avatarColor: (driver.avatarColor || '#E11D48').slice(0, 32),
    number: (driver.number || '1').slice(0, 16),
    carHistory: (driver.carHistory || []).slice(0, 20),
  };
  if (driver.eaAccountId) {
    payload.eaAccountId = driver.eaAccountId.slice(0, 100);
  }
  if (driver.claimedByUid) {
    payload.claimedByUid = driver.claimedByUid.slice(0, 128);
  }

  try {
    await setDoc(doc(db, 'drivers', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function savePrivateVaultToDb(
  record: DriverPrivateVault
): Promise<void> {
  const driverId = sanitizeId(record.driverId);
  const path = `privateVault/${driverId}`;
  const payload: DriverPrivateVault = {
    driverId,
    ownerUid: (record.ownerUid || auth.currentUser?.uid || 'public-entry').slice(
      0,
      128
    ),
    email: record.email.slice(0, 254),
    phone: record.phone.slice(0, 64),
    age: Math.min(90, Math.max(12, Number(record.age) || 18)),
    gender: record.gender,
    isMinor: Boolean(record.isMinor),
    parentalConsentVerified: Boolean(record.parentalConsentVerified),
    consentTimestamp: record.consentTimestamp.slice(0, 64),
    dataProtectionActAccepted: true,
  };

  try {
    await setDoc(doc(db, 'privateVault', driverId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePrivateVaultFromDb(driverId: string): Promise<void> {
  const safeId = sanitizeId(driverId);
  const path = `privateVault/${safeId}`;
  try {
    await deleteDoc(doc(db, 'privateVault', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveTeamToDb(team: Team): Promise<void> {
  const id = sanitizeId(team.id);
  const path = `teams/${id}`;
  const payload: Record<string, unknown> = {
    id,
    name: team.name.slice(0, 120),
    shortCode: team.shortCode.slice(0, 8),
    managerName: team.managerName.slice(0, 120),
    managerEmail: (team.managerEmail || 'principal@aerc.org').slice(0, 254),
    countryCode: (team.countryCode || 'KE').slice(0, 8),
    liveryColor: (team.liveryColor || '#E11D48').slice(0, 32),
    driverIds: (team.driverIds || []).slice(0, 3).map((d) => sanitizeId(d)),
    activeForTeamChampionship: Boolean(team.activeForTeamChampionship),
  };
  if (team.managerUid) {
    payload.managerUid = team.managerUid.slice(0, 128);
  }

  try {
    await setDoc(doc(db, 'teams', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveRoundToDb(round: RallyRound): Promise<void> {
  const id = sanitizeId(round.id);
  const path = `rounds/${id}`;
  const sanitizedResults = (round.results || []).slice(0, 200).map((r) => {
    const entry: Record<string, unknown> = {
      driverId: r.driverId,
      rawRacenetName: r.rawRacenetName,
      position: r.position,
      status: r.status,
      totalTime: r.totalTime,
      gapToLeader: r.gapToLeader,
      powerStageRank: r.powerStageRank ?? null,
      carUsed: r.carUsed,
      stewardPenaltyPoints: r.stewardPenaltyPoints || 0,
      matchStatus: r.matchStatus,
    };
    if (r.eaAccountId) entry.eaAccountId = r.eaAccountId;
    if (r.powerStageTime) entry.powerStageTime = r.powerStageTime;
    if (r.stewardPenaltyNote) entry.stewardPenaltyNote = r.stewardPenaltyNote;
    return entry;
  });

  const payload: Record<string, unknown> = {
    id,
    roundNumber: Math.min(100, Math.max(1, Number(round.roundNumber) || 1)),
    name: round.name.slice(0, 140),
    country: round.country.slice(0, 80),
    countryCode: round.countryCode.slice(0, 8),
    surface: round.surface,
    startDate: round.startDate.slice(0, 32),
    endDate: round.endDate.slice(0, 32),
    entryDeadline: round.entryDeadline.slice(0, 32),
    status: round.status,
    stagesCount: Math.min(100, Math.max(1, Number(round.stagesCount) || 12)),
    totalDistanceKm: Math.min(
      5000,
      Math.max(1, Number(round.totalDistanceKm) || 150)
    ),
    registeredDriverIds: (round.registeredDriverIds || [])
      .slice(0, 200)
      .map((d) => sanitizeId(d)),
    results: sanitizedResults,
    racenetClubEventId: (round.racenetClubEventId || 'EA-CLUB').slice(0, 80),
  };
  if (round.publishedAt) {
    payload.publishedAt = round.publishedAt.slice(0, 64);
  }

  try {
    await setDoc(doc(db, 'rounds', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveSettingsToDb(config: PointsConfig): Promise<void> {
  const id = 'default';
  const path = `settings/${id}`;
  const payload = {
    id,
    positionPoints: config.positionPoints.slice(0, 20),
    powerStagePoints: config.powerStagePoints.slice(0, 10),
    droppedRoundsCount: Math.min(
      5,
      Math.max(0, Number(config.droppedRoundsCount) || 0)
    ),
    maxDriversPerTeam: Math.min(
      5,
      Math.max(1, Number(config.maxDriversPerTeam) || 3)
    ),
    scoringDriversPerTeamRound: Math.min(
      5,
      Math.max(1, Number(config.scoringDriversPerTeamRound) || 2)
    ),
  };

  try {
    await setDoc(doc(db, 'settings', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDriverPublicFromDb(driverId: string): Promise<void> {
  const safeId = sanitizeId(driverId);
  const path = `drivers/${safeId}`;
  try {
    await deleteDoc(doc(db, 'drivers', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveTeamRequestToDb(req: TeamRequest): Promise<void> {
  const id = sanitizeId(req.id);
  const path = `teamRequests/${id}`;
  const payload: TeamRequest = {
    id,
    teamId: sanitizeId(req.teamId),
    teamName: (req.teamName || 'Team').slice(0, 120),
    teamShortCode: (req.teamShortCode || 'TM').slice(0, 8),
    managerName: (req.managerName || 'Team Manager').slice(0, 120),
    driverId: sanitizeId(req.driverId),
    driverName: (req.driverName || 'Driver').slice(0, 160),
    driverRacenet: (req.driverRacenet || 'Driver').slice(0, 100),
    direction: req.direction,
    status: req.status,
    messages: (req.messages || []).slice(0, 50).map((m) => ({
      id: sanitizeId(m.id),
      senderRole: m.senderRole,
      senderName: (m.senderName || 'Member').slice(0, 100),
      text: (m.text || '').slice(0, 500),
      timestamp: (m.timestamp || new Date().toISOString()).slice(0, 64),
    })),
    createdAt: (req.createdAt || new Date().toISOString()).slice(0, 64),
    updatedAt: (req.updatedAt || new Date().toISOString()).slice(0, 64),
  };

  try {
    await setDoc(doc(db, 'teamRequests', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTeamRequestFromDb(
  requestId: string
): Promise<void> {
  const safeId = sanitizeId(requestId);
  const path = `teamRequests/${safeId}`;
  try {
    await deleteDoc(doc(db, 'teamRequests', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
