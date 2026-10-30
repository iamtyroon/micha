/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  AccountRole,
  DriverPrivateVault,
  DriverPublic,
  PointsConfig,
  RallyRound,
  RoundResultEntry,
  Team,
  TeamChatMessage,
  TeamRequest,
  UserProfile,
} from './types/aerc';
import {
  INITIAL_DRIVERS_PUBLIC,
  INITIAL_PRIVATE_VAULT,
  INITIAL_ROUNDS,
  INITIAL_TEAMS,
} from './data/seedAercData';
import { DEFAULT_AERC_POINTS_CONFIG } from './utils/championshipEngine';
import {
  auth,
  db,
  deleteDriverPublicFromDb,
  deletePrivateVaultFromDb,
  deleteUserProfileFromDb,
  fetchUserProfileFromDb,
  googleProvider,
  handleFirestoreError,
  OperationType,
  saveDriverPublicToDb,
  savePrivateVaultToDb,
  saveRoundToDb,
  saveSettingsToDb,
  saveTeamRequestToDb,
  saveTeamToDb,
  saveUserProfileToDb,
} from './lib/firebase';
import { ActiveTab, TopNav } from './components/TopNav';
import { StandingsView } from './components/StandingsView';
import { RoundsView } from './components/RoundsView';
import { DriverProfilesView } from './components/DriverProfilesView';

const RegistrationPortal = React.lazy(() =>
  import('./components/RegistrationPortal').then((m) => ({
    default: m.RegistrationPortal,
  }))
);
const RaceControlView = React.lazy(() =>
  import('./components/RaceControlView').then((m) => ({
    default: m.RaceControlView,
  }))
);
const SettingsView = React.lazy(() =>
  import('./components/SettingsView').then((m) => ({
    default: m.SettingsView,
  }))
);
const ShareGraphicsModal = React.lazy(() =>
  import('./components/ShareGraphicsModal').then((m) => ({
    default: m.ShareGraphicsModal,
  }))
);
const AccountOnboardingModal = React.lazy(() =>
  import('./components/AccountOnboardingModal').then((m) => ({
    default: m.AccountOnboardingModal,
  }))
);

const FAST_CACHE_KEY = 'aerc_fast_cache_v1';

interface FastCachePayload {
  drivers: DriverPublic[];
  teams: Team[];
  rounds: RallyRound[];
  pointsConfig: PointsConfig;
}

function readFastCache(): FastCachePayload | null {
  try {
    const raw = localStorage.getItem(FAST_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FastCachePayload;
  } catch {
    return null;
  }
}

export default function App() {
  const initialCache = useRef<FastCachePayload | null>(readFastCache()).current;

  const [activeTab, setActiveTab] = useState<ActiveTab>('standings');

  // Firebase Auth & Account Profile State (null = unauthenticated spectator)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Role-specific Onboarding Modal State (Organizer, Team Manager, Driver)
  const [isAccountOnboardingOpen, setIsAccountOnboardingOpen] =
    useState<boolean>(false);
  const [onboardingRole, setOnboardingRole] = useState<AccountRole>('driver');
  const pendingRoleRef = useRef<AccountRole | null>(null);

  // Core Championship State — Instant hydration from local cache + real-time Firestore sync
  const [drivers, setDrivers] = useState<DriverPublic[]>(
    initialCache?.drivers ?? INITIAL_DRIVERS_PUBLIC
  );
  const [privateVault, setPrivateVault] = useState<DriverPrivateVault[]>(
    INITIAL_PRIVATE_VAULT
  );
  const [teams, setTeams] = useState<Team[]>(
    initialCache?.teams ?? INITIAL_TEAMS
  );
  const [rounds, setRounds] = useState<RallyRound[]>(
    initialCache?.rounds ?? INITIAL_ROUNDS
  );
  const [teamRequests, setTeamRequests] = useState<TeamRequest[]>([]);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>(
    initialCache?.pointsConfig ?? DEFAULT_AERC_POINTS_CONFIG
  );

  // Selected entity states across tabs
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareRoundId, setShareRoundId] = useState<string | undefined>(
    undefined
  );

  // Pre-warm lazy chunks during browser idle time so tab switches are instant
  useEffect(() => {
    const timer = setTimeout(() => {
      import('./components/RegistrationPortal');
      import('./components/RaceControlView');
      import('./components/SettingsView');
      import('./components/ShareGraphicsModal');
      import('./components/AccountOnboardingModal');
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Asynchronously persist public championship state to localStorage during idle time
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const payload: FastCachePayload = {
          drivers,
          teams,
          rounds,
          pointsConfig,
        };
        localStorage.setItem(FAST_CACHE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore storage quota errors
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [drivers, teams, rounds, pointsConfig]);

  // 1. Listen to Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUserProfile(null);
        return;
      }
      try {
        const existingProfile = await fetchUserProfileFromDb(fbUser.uid);
        const requestedRole = pendingRoleRef.current;
        pendingRoleRef.current = null;

        if (existingProfile) {
          const finalRole = requestedRole || existingProfile.role;
          const mergedProfile: UserProfile = {
            ...existingProfile,
            role: finalRole,
            updatedAt: new Date().toISOString(),
          };
          if (requestedRole && requestedRole !== existingProfile.role) {
            await saveUserProfileToDb(mergedProfile);
          }
          setUserProfile(mergedProfile);
          setOnboardingRole(finalRole);
          if (!mergedProfile.onboardingCompleted) {
            setIsAccountOnboardingOpen(true);
          }
        } else if (requestedRole) {
          // Only create a new user profile when the user explicitly clicked Sign In
          const newProfile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || 'user@aerc.org',
            displayName:
              fbUser.displayName || fbUser.email?.split('@')[0] || 'AERC User',
            username:
              fbUser.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_-]/g, '') ||
              'aerc_user',
            photoURL: fbUser.photoURL || undefined,
            role: requestedRole,
            onboardingCompleted: false,
            updatedAt: new Date().toISOString(),
          };
          await saveUserProfileToDb(newProfile);
          setUserProfile(newProfile);
          setOnboardingRole(requestedRole);
          setIsAccountOnboardingOpen(true);
        } else {
          // Account was deleted from Firestore database — sign out stale cached auth session
          await signOut(auth);
          setUserProfile(null);
        }
      } catch (err) {
        console.error('Auth profile sync error:', err);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-Time Firestore Listeners for Public Championship Collections
  useEffect(() => {
    const unsubDrivers = onSnapshot(
      collection(db, 'drivers'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as DriverPublic);
        setDrivers(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'drivers');
      }
    );

    const unsubTeams = onSnapshot(
      collection(db, 'teams'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Team);
        setTeams(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'teams');
      }
    );

    const unsubRounds = onSnapshot(
      collection(db, 'rounds'),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as RallyRound)
          .sort((a, b) => a.roundNumber - b.roundNumber);
        setRounds(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'rounds');
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'default'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPointsConfig({
            positionPoints:
              data.positionPoints || DEFAULT_AERC_POINTS_CONFIG.positionPoints,
            powerStagePoints:
              data.powerStagePoints ||
              DEFAULT_AERC_POINTS_CONFIG.powerStagePoints,
            droppedRoundsCount:
              data.droppedRoundsCount ??
              DEFAULT_AERC_POINTS_CONFIG.droppedRoundsCount,
            maxDriversPerTeam:
              data.maxDriversPerTeam ??
              DEFAULT_AERC_POINTS_CONFIG.maxDriversPerTeam,
            scoringDriversPerTeamRound:
              data.scoringDriversPerTeamRound ??
              DEFAULT_AERC_POINTS_CONFIG.scoringDriversPerTeamRound,
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/default');
      }
    );

    return () => {
      unsubDrivers();
      unsubTeams();
      unsubRounds();
      unsubSettings();
    };
  }, []);

  // 2b. Only subscribe to teamRequests when signed in (Spectators do not use teamRequests)
  useEffect(() => {
    if (!userProfile) {
      setTeamRequests([]);
      return;
    }

    const unsubTeamRequests = onSnapshot(
      collection(db, 'teamRequests'),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as TeamRequest)
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        setTeamRequests(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'teamRequests');
      }
    );

    return () => unsubTeamRequests();
  }, [userProfile]);

  // 3. Load Private Vault Records in parallel when signed in as Organizer
  useEffect(() => {
    if (!userProfile || userProfile.role !== 'organizer' || drivers.length === 0) {
      setPrivateVault([]);
      return;
    }

    let cancelled = false;
    async function loadOrganizerVault() {
      const snaps = await Promise.all(
        drivers.map(async (drv) => {
          try {
            const snap = await getDoc(doc(db, 'privateVault', drv.id));
            return snap.exists() ? (snap.data() as DriverPrivateVault) : null;
          } catch {
            return null;
          }
        })
      );
      if (!cancelled) {
        setPrivateVault(
          snaps.filter((item): item is DriverPrivateVault => item !== null)
        );
      }
    }
    loadOrganizerVault();
    return () => {
      cancelled = true;
    };
  }, [userProfile, drivers]);

  // Handler: Google Sign-In with Selected Account Role
  const handleSignInWithGoogle = async (selectedRole: AccountRole) => {
    setAuthLoading(true);
    setAuthError(null);
    pendingRoleRef.current = selectedRole;
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      const existing = await fetchUserProfileFromDb(fbUser.uid);
      const profile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || 'user@aerc.org',
        displayName:
          existing?.displayName ||
          fbUser.displayName ||
          fbUser.email?.split('@')[0] ||
          'AERC User',
        username:
          existing?.username ||
          fbUser.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_-]/g, '') ||
          'aerc_user',
        earcUsername: existing?.earcUsername,
        photoURL: fbUser.photoURL || undefined,
        role: selectedRole,
        driverId: existing?.driverId,
        teamId: existing?.teamId,
        onboardingCompleted: existing?.onboardingCompleted ?? false,
        hasPasswordSet: existing?.hasPasswordSet,
        updatedAt: new Date().toISOString(),
      };
      await saveUserProfileToDb(profile);
      setUserProfile(profile);
      setIsAuthModalOpen(false);
      setOnboardingRole(selectedRole);
      if (!profile.onboardingCompleted) {
        setIsAccountOnboardingOpen(true);
      }
    } catch (err) {
      pendingRoleRef.current = null;
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In was cancelled or failed.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // Handler: Switch Active Account Role (Organizer, Team Manager, Driver)
  const handleSwitchAccountRole = async (newRole: AccountRole) => {
    setOnboardingRole(newRole);
    if (newRole !== 'organizer' && activeTab === 'control') {
      setActiveTab('standings');
    }
    if (!userProfile) return;
    const updated: UserProfile = {
      ...userProfile,
      role: newRole,
      updatedAt: new Date().toISOString(),
    };
    setUserProfile(updated);
    if (auth.currentUser) {
      await saveUserProfileToDb(updated);
    }
  };

  // Handler: Complete Role-Specific Account Onboarding (Organizer, Team Manager, Driver)
  const handleCompleteAccountOnboarding = async (params: {
    role: AccountRole;
    name: string;
    username: string;
    earcUsername?: string;
    migratedDriver?: DriverPublic;
    existingTeamId?: string;
    newTeam?: { name: string; shortCode: string };
  }) => {
    let resolvedDriverId = userProfile?.driverId;
    let resolvedTeamId = params.existingTeamId || userProfile?.teamId;

    // 1. If Team Manager created a new team during onboarding, save it
    if (params.role === 'manager' && params.newTeam) {
      const createdTeamId = `team-${teams.length + 1}-${Date.now().toString(36)}`;
      const newTeamObj: Team = {
        id: createdTeamId,
        name: params.newTeam.name,
        shortCode: params.newTeam.shortCode,
        countryCode: 'KE',
        liveryColor: '#E11D48',
        managerName: params.name,
        managerEmail: userProfile?.email || 'manager@aerc.org',
        managerUid: auth.currentUser?.uid,
        driverIds: [],
        activeForTeamChampionship: true,
      };
      setTeams((prev) => [...prev, newTeamObj]);
      resolvedTeamId = createdTeamId;
      if (auth.currentUser) {
        await saveTeamToDb(newTeamObj);
      }
    }

    // 2. If Driver matched an EARC account via API (or local match), migrate/save driver to Firestore
    if (params.role === 'driver') {
      const nameParts = params.name.trim().split(/\s+/);
      const firstName = nameParts[0] || params.name;
      const lastName = nameParts.slice(1).join(' ') || 'Driver';

      const driverToSave: DriverPublic = params.migratedDriver
        ? {
            ...params.migratedDriver,
            fullName: params.name || params.migratedDriver.fullName,
            claimedAccount: true,
            claimedByUid: auth.currentUser?.uid,
          }
        : {
            id:
              resolvedDriverId ||
              `drv-${drivers.length + 1}-${Date.now().toString(36)}`,
            firstName,
            lastName,
            fullName: params.name,
            racenetName: params.earcUsername || params.username,
            racenetAliases: [params.earcUsername || params.username],
            eaAccountId: `EARC-${(params.earcUsername || params.username).toUpperCase()}`,
            nationality: 'Kenya',
            countryCode: 'KE',
            countryOfResidence: 'Kenya',
            teamId: null,
            teamPointsOptIn: true,
            carMakeModel: 'Toyota GR Yaris Rally1 HYBRID',
            platform: 'PC',
            controls: 'Wheel & Pedals',
            claimedAccount: true,
            claimedByUid: auth.currentUser?.uid,
            avatarColor: '#E11D48',
            number: String(drivers.length + 11),
            carHistory: [
              {
                season: '2026 AERC Season',
                car: 'Toyota GR Yaris Rally1 HYBRID',
              },
            ],
          };

      resolvedDriverId = driverToSave.id;
      setDrivers((prev) => {
        const exists = prev.some((d) => d.id === driverToSave.id);
        return exists
          ? prev.map((d) => (d.id === driverToSave.id ? driverToSave : d))
          : [...prev, driverToSave];
      });
      setSelectedDriverId(driverToSave.id);
      await saveDriverPublicToDb(driverToSave);
    }

    // 3. Save updated UserProfile to Firestore if authenticated
    const updatedProfile: UserProfile = {
      uid: userProfile?.uid || auth.currentUser?.uid || 'local-session',
      email: userProfile?.email || auth.currentUser?.email || 'user@aerc.org',
      displayName: params.name,
      username: params.username,
      earcUsername:
        params.role === 'driver' ? params.earcUsername : undefined,
      photoURL: userProfile?.photoURL,
      role: params.role,
      driverId: resolvedDriverId,
      teamId: resolvedTeamId,
      onboardingCompleted: true,
      hasPasswordSet: userProfile?.hasPasswordSet,
      updatedAt: new Date().toISOString(),
    };

    setUserProfile(updatedProfile);
    if (auth.currentUser) {
      await saveUserProfileToDb(updatedProfile);
    }
  };

  // Handler: Sign Out
  const handleSignOut = async () => {
    await signOut(auth);
    setUserProfile(null);
    setIsAuthModalOpen(false);
    if (
      activeTab === 'register' ||
      activeTab === 'control' ||
      activeTab === 'settings'
    ) {
      setActiveTab('standings');
    }
  };

  // Handler: Save Account Settings (from SettingsView)
  const handleSaveAccountSettings = async (params: {
    displayName: string;
    username: string;
    role: AccountRole;
    earcUsername?: string;
    hasPasswordSet?: boolean;
    driverUpdates?: Partial<DriverPublic>;
  }) => {
    let resolvedDriverId = userProfile?.driverId;
    const resolvedTeamId =
      params.driverUpdates?.teamId !== undefined
        ? params.driverUpdates.teamId || undefined
        : userProfile?.teamId;

    if (params.role === 'driver' || params.driverUpdates) {
      const existingDrv = drivers.find(
        (d) =>
          d.id === resolvedDriverId ||
          (userProfile?.uid && d.claimedByUid === userProfile.uid)
      );
      const nameParts = params.displayName.trim().split(/\s+/);
      const firstName =
        params.driverUpdates?.firstName ||
        existingDrv?.firstName ||
        nameParts[0] ||
        params.displayName;
      const lastName =
        params.driverUpdates?.lastName ||
        existingDrv?.lastName ||
        nameParts.slice(1).join(' ') ||
        'Driver';

      const driverToSave: DriverPublic = {
        id:
          params.driverUpdates?.id ||
          existingDrv?.id ||
          resolvedDriverId ||
          `drv-${drivers.length + 1}-${Date.now().toString(36)}`,
        firstName,
        lastName,
        fullName:
          params.driverUpdates?.fullName ||
          params.displayName ||
          existingDrv?.fullName ||
          'AERC Driver',
        racenetName:
          params.earcUsername ||
          params.driverUpdates?.racenetName ||
          existingDrv?.racenetName ||
          params.username,
        racenetAliases:
          params.driverUpdates?.racenetAliases ||
          existingDrv?.racenetAliases || [
            params.earcUsername || params.username,
          ],
        eaAccountId:
          params.driverUpdates?.eaAccountId ||
          existingDrv?.eaAccountId ||
          `EARC-${(params.earcUsername || params.username).toUpperCase()}`,
        nationality:
          params.driverUpdates?.nationality ||
          existingDrv?.nationality ||
          'Kenya',
        countryCode:
          params.driverUpdates?.countryCode ||
          existingDrv?.countryCode ||
          'KE',
        countryOfResidence:
          params.driverUpdates?.countryOfResidence ||
          existingDrv?.countryOfResidence ||
          'Kenya',
        teamId:
          params.driverUpdates?.teamId !== undefined
            ? params.driverUpdates.teamId
            : existingDrv?.teamId ?? null,
        teamPointsOptIn:
          params.driverUpdates?.teamPointsOptIn ??
          existingDrv?.teamPointsOptIn ??
          true,
        carMakeModel:
          params.driverUpdates?.carMakeModel ||
          existingDrv?.carMakeModel ||
          'Toyota GR Yaris Rally1 HYBRID',
        platform:
          params.driverUpdates?.platform || existingDrv?.platform || 'PC',
        controls:
          params.driverUpdates?.controls ||
          existingDrv?.controls ||
          'Wheel & Pedals',
        claimedAccount: true,
        claimedByUid: auth.currentUser?.uid || userProfile?.uid,
        avatarColor: existingDrv?.avatarColor || '#E11D48',
        number:
          params.driverUpdates?.number ||
          existingDrv?.number ||
          String(drivers.length + 11),
        carHistory: existingDrv?.carHistory || [
          {
            season: '2026 AERC Season',
            car:
              params.driverUpdates?.carMakeModel ||
              'Toyota GR Yaris Rally1 HYBRID',
          },
        ],
      };

      resolvedDriverId = driverToSave.id;
      setDrivers((prev) => {
        const exists = prev.some((d) => d.id === driverToSave.id);
        return exists
          ? prev.map((d) => (d.id === driverToSave.id ? driverToSave : d))
          : [...prev, driverToSave];
      });
      await saveDriverPublicToDb(driverToSave);
    }

    const updatedProfile: UserProfile = {
      uid: userProfile?.uid || auth.currentUser?.uid || 'local-session',
      email: userProfile?.email || auth.currentUser?.email || 'user@aerc.org',
      displayName: params.displayName,
      username: params.username,
      earcUsername:
        params.role === 'driver' ? params.earcUsername : undefined,
      photoURL: userProfile?.photoURL,
      role: params.role,
      driverId: resolvedDriverId,
      teamId: resolvedTeamId,
      onboardingCompleted: true,
      hasPasswordSet: params.hasPasswordSet ?? userProfile?.hasPasswordSet,
      updatedAt: new Date().toISOString(),
    };

    setUserProfile(updatedProfile);
    if (auth.currentUser) {
      await saveUserProfileToDb(updatedProfile);
    }
  };

  // Handler: Delete Account from Firestore Database & Sign Out
  const handleDeleteAccount = async () => {
    const uid = userProfile?.uid || auth.currentUser?.uid;
    const linkedDriverId = userProfile?.driverId;

    const deleteTasks: Promise<unknown>[] = [];

    if (linkedDriverId) {
      setDrivers((prev) => prev.filter((d) => d.id !== linkedDriverId));
      setPrivateVault((prev) =>
        prev.filter((v) => v.driverId !== linkedDriverId)
      );
      deleteTasks.push(
        deleteDriverPublicFromDb(linkedDriverId).catch(() => undefined),
        deletePrivateVaultFromDb(linkedDriverId).catch(() => undefined)
      );
    }

    if (uid && auth.currentUser) {
      deleteTasks.push(deleteUserProfileFromDb(uid).catch(() => undefined));
    }

    await Promise.all(deleteTasks);
    await signOut(auth);
    setUserProfile(null);
    setActiveTab('standings');
  };

  // Handler: Create Team Request (Team Manager Invite or Driver Request to Join)
  const handleCreateTeamRequest = async (params: {
    teamId: string;
    driverId: string;
    direction: 'manager_invite' | 'driver_request';
    initialMessage?: string;
  }) => {
    const team = teams.find((t) => t.id === params.teamId);
    const driver = drivers.find((d) => d.id === params.driverId);
    if (!team || !driver) return;

    const now = new Date().toISOString();
    const senderRole: 'manager' | 'driver' =
      params.direction === 'manager_invite' ? 'manager' : 'driver';
    const senderName =
      senderRole === 'manager'
        ? userProfile?.displayName || team.managerName
        : driver.fullName;

    const defaultMsg =
      params.direction === 'manager_invite'
        ? `Hi ${driver.fullName}, we'd like to assign you to ${team.name} (${team.shortCode}) for the championship.`
        : `Hi ${team.managerName}, I'd like to join ${team.name} (${team.shortCode}) as a driver.`;

    const initialMsg: TeamChatMessage = {
      id: `msg-${Date.now().toString(36)}`,
      senderName,
      senderRole,
      text: params.initialMessage?.trim() || defaultMsg,
      timestamp: now,
    };

    const reqObj: TeamRequest = {
      id: `treq-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      teamId: team.id,
      teamName: team.name,
      teamShortCode: team.shortCode,
      managerName: team.managerName,
      driverId: driver.id,
      driverName: driver.fullName,
      driverRacenet: driver.racenetName,
      direction: params.direction,
      status: 'pending',
      messages: [initialMsg],
      createdAt: now,
      updatedAt: now,
    };

    setTeamRequests((prev) => [reqObj, ...prev]);
    await saveTeamRequestToDb(reqObj);
  };

  // Handler: Accept or Decline a Team Request (Assigns driver to team on accept)
  const handleRespondTeamRequest = async (
    requestId: string,
    status: 'accepted' | 'declined'
  ) => {
    const req = teamRequests.find((r) => r.id === requestId);
    if (!req) return;

    const now = new Date().toISOString();
    const responderRole: 'manager' | 'driver' =
      req.direction === 'manager_invite' ? 'driver' : 'manager';
    const responderName =
      userProfile?.displayName ||
      (responderRole === 'driver' ? req.driverName : req.managerName);

    const statusMsg: TeamChatMessage = {
      id: `msg-${Date.now().toString(36)}`,
      senderName: responderName,
      senderRole: responderRole,
      text:
        status === 'accepted'
          ? `Accepted team assignment! ${req.driverName} is now on the ${req.teamName} roster.`
          : 'Declined request.',
      timestamp: now,
    };

    const updatedReq: TeamRequest = {
      ...req,
      status,
      messages: [...req.messages, statusMsg],
      updatedAt: now,
    };

    setTeamRequests((prev) =>
      prev.map((r) => (r.id === requestId ? updatedReq : r))
    );

    const writeTasks: Promise<unknown>[] = [saveTeamRequestToDb(updatedReq)];

    if (status === 'accepted') {
      const targetTeam = teams.find((t) => t.id === req.teamId);
      const targetDriver = drivers.find((d) => d.id === req.driverId);

      if (targetTeam && !targetTeam.driverIds.includes(req.driverId)) {
        if (targetTeam.driverIds.length < 3) {
          const updatedTeam: Team = {
            ...targetTeam,
            driverIds: [...targetTeam.driverIds, req.driverId],
          };
          setTeams((prev) =>
            prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t))
          );
          writeTasks.push(saveTeamToDb(updatedTeam));
        }
      }

      if (targetDriver && targetDriver.teamId !== req.teamId) {
        const updatedDriver: DriverPublic = {
          ...targetDriver,
          teamId: req.teamId,
          teamPointsOptIn: true,
        };
        setDrivers((prev) =>
          prev.map((d) => (d.id === updatedDriver.id ? updatedDriver : d))
        );
        writeTasks.push(saveDriverPublicToDb(updatedDriver));
      }
    }

    await Promise.all(writeTasks);
  };

  // Handler: Send Message in Team-Driver Coordination Thread
  const handleSendTeamRequestMessage = async (
    requestId: string,
    senderRole: 'manager' | 'driver',
    senderName: string,
    text: string
  ) => {
    const req = teamRequests.find((r) => r.id === requestId);
    if (!req) return;

    const now = new Date().toISOString();
    const newMsg: TeamChatMessage = {
      id: `msg-${Date.now().toString(36)}`,
      senderName,
      senderRole,
      text,
      timestamp: now,
    };

    const updatedReq: TeamRequest = {
      ...req,
      messages: [...req.messages, newMsg],
      updatedAt: now,
    };

    setTeamRequests((prev) =>
      prev.map((r) => (r.id === requestId ? updatedReq : r))
    );
    await saveTeamRequestToDb(updatedReq);
  };

  // Handler: Select driver and switch to Drivers tab
  const handleInspectDriver = useCallback((driverId: string) => {
    setSelectedDriverId(driverId);
    setActiveTab('drivers');
  }, []);

  // Handler: Select round and switch to Rounds tab
  const handleInspectRound = useCallback((roundId: string) => {
    setSelectedRoundId(roundId);
    setActiveTab('rounds');
  }, []);

  const handleOpenAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const handleNavigateToRoundsTab = useCallback(() => {
    setActiveTab('rounds');
  }, []);

  const handleNavigateToDriversTab = useCallback(() => {
    setActiveTab('drivers');
  }, []);

  const handleNavigateToRegister = useCallback(() => {
    setActiveTab('register');
  }, []);

  const handleNavigateToControl = useCallback(() => {
    setActiveTab('control');
  }, []);

  const handleOpenShareGraphics = useCallback((roundId?: string) => {
    setShareRoundId(roundId);
    setShareModalOpen(true);
  }, []);

  // Handler: Update Points Config
  const handleUpdatePointsConfig = async (cfg: PointsConfig) => {
    if (userProfile?.role !== 'organizer') {
      setIsAuthModalOpen(true);
      return;
    }
    setPointsConfig(cfg);
    await saveSettingsToDb(cfg);
  };

  // Handler: Create a new Rally Round (Organizer only)
  const handleCreateRound = (
    roundData: Omit<RallyRound, 'id' | 'registeredDriverIds' | 'results'>
  ): string => {
    if (userProfile?.role !== 'organizer') {
      setIsAuthModalOpen(true);
      return '';
    }
    const newId = `rnd-${rounds.length + 1}-${Date.now().toString(36)}`;
    const newRound: RallyRound = {
      ...roundData,
      id: newId,
      registeredDriverIds: drivers.map((d) => d.id),
      results: [],
    };
    setRounds((prev) => [...prev, newRound]);
    setSelectedRoundId(newId);
    saveRoundToDb(newRound);
    return newId;
  };

  // Handler: Claim driver profile or add Racenet alias (Driver or Organizer only)
  const handleClaimDriverAccount = async (
    driverId: string,
    newAlias?: string
  ) => {
    if (
      !userProfile ||
      (userProfile.role !== 'driver' && userProfile.role !== 'organizer')
    ) {
      setIsAuthModalOpen(true);
      return;
    }
    const target = drivers.find((d) => d.id === driverId);
    if (!target) return;
    const updatedAliases =
      newAlias && !target.racenetAliases.includes(newAlias)
        ? [...target.racenetAliases, newAlias]
        : target.racenetAliases;
    const updatedDriver: DriverPublic = {
      ...target,
      claimedAccount: true,
      claimedByUid: auth.currentUser?.uid || target.claimedByUid,
      racenetAliases: updatedAliases,
    };
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? updatedDriver : d))
    );
    await saveDriverPublicToDb(updatedDriver);
  };

  // Handler: Register driver (Driver or Organizer only)
  const handleRegisterDriver = async (
    publicData: Omit<
      DriverPublic,
      'id' | 'claimedAccount' | 'avatarColor' | 'carHistory'
    >,
    privateData: Omit<
      DriverPrivateVault,
      'driverId' | 'ownerUid' | 'consentTimestamp'
    >,
    roundId: string,
    existingDriverId?: string
  ) => {
    if (
      !userProfile ||
      (userProfile.role !== 'driver' && userProfile.role !== 'organizer')
    ) {
      setIsAuthModalOpen(true);
      return { driverId: '', matchedExisting: false };
    }
    const targetDriverId =
      existingDriverId || `drv-${drivers.length + 1}-${Date.now().toString(36)}`;
    const matchedExisting = Boolean(existingDriverId);

    const writeTasks: Promise<unknown>[] = [];

    if (!matchedExisting) {
      const newDriver: DriverPublic = {
        ...publicData,
        id: targetDriverId,
        claimedAccount: Boolean(auth.currentUser),
        claimedByUid: auth.currentUser?.uid,
        avatarColor: '#E11D48',
        carHistory: [
          { season: '2026 AERC Season', car: publicData.carMakeModel },
        ],
      };
      setDrivers((prev) => [...prev, newDriver]);
      setSelectedDriverId(targetDriverId);
      writeTasks.push(saveDriverPublicToDb(newDriver));

      const newVaultRecord: DriverPrivateVault = {
        ...privateData,
        driverId: targetDriverId,
        ownerUid: auth.currentUser?.uid || 'public-entry',
        consentTimestamp: new Date().toISOString(),
      };
      setPrivateVault((prev) => [...prev, newVaultRecord]);
      writeTasks.push(savePrivateVaultToDb(newVaultRecord));

      if (publicData.teamId) {
        const targetTeam = teams.find((t) => t.id === publicData.teamId);
        if (targetTeam && targetTeam.driverIds.length < 3) {
          const updatedTeam: Team = {
            ...targetTeam,
            driverIds: [...targetTeam.driverIds, targetDriverId],
          };
          setTeams((prev) =>
            prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t))
          );
          writeTasks.push(saveTeamToDb(updatedTeam));
        }
      }
    }

    if (roundId) {
      const targetRound = rounds.find((r) => r.id === roundId);
      if (
        targetRound &&
        !targetRound.registeredDriverIds.includes(targetDriverId)
      ) {
        const updatedRound: RallyRound = {
          ...targetRound,
          registeredDriverIds: [
            ...targetRound.registeredDriverIds,
            targetDriverId,
          ],
        };
        setRounds((prev) =>
          prev.map((r) => (r.id === updatedRound.id ? updatedRound : r))
        );
        writeTasks.push(saveRoundToDb(updatedRound));
      }
    }

    await Promise.all(writeTasks);
    return { driverId: targetDriverId, matchedExisting };
  };

  // Handler: Team Manager Line-Up Update (Team Manager or Organizer only)
  const handleUpdateTeamLineup = async (
    teamId: string,
    driverIds: string[]
  ) => {
    if (
      !userProfile ||
      (userProfile.role !== 'manager' && userProfile.role !== 'organizer')
    ) {
      setIsAuthModalOpen(true);
      return;
    }

    const writeTasks: Promise<unknown>[] = [];
    const targetTeam = teams.find((t) => t.id === teamId);
    if (targetTeam) {
      const updatedTeam: Team = { ...targetTeam, driverIds };
      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? updatedTeam : t))
      );
      writeTasks.push(saveTeamToDb(updatedTeam));
    }

    const updatedDriversList: DriverPublic[] = [];
    setDrivers((prev) =>
      prev.map((d) => {
        if (driverIds.includes(d.id) && d.teamId !== teamId) {
          const updated: DriverPublic = {
            ...d,
            teamId,
            teamPointsOptIn: true,
          };
          updatedDriversList.push(updated);
          return updated;
        }
        if (d.teamId === teamId && !driverIds.includes(d.id)) {
          const updated: DriverPublic = {
            ...d,
            teamId: null,
          };
          updatedDriversList.push(updated);
          return updated;
        }
        return d;
      })
    );

    for (const drv of updatedDriversList) {
      writeTasks.push(saveDriverPublicToDb(drv));
    }

    await Promise.all(writeTasks);
  };

  // Handler: Create New Team (Team Manager or Organizer only)
  const handleCreateTeam = async (teamData: Omit<Team, 'id'>) => {
    if (
      !userProfile ||
      (userProfile.role !== 'manager' && userProfile.role !== 'organizer')
    ) {
      setIsAuthModalOpen(true);
      return;
    }
    const newTeam: Team = {
      ...teamData,
      id: `team-${teams.length + 1}-${Date.now().toString(36)}`,
      managerUid: auth.currentUser?.uid,
    };
    setTeams((prev) => [...prev, newTeam]);
    await saveTeamToDb(newTeam);
  };

  // Handler: Publish Round Results (Organizer only)
  const handlePublishRoundResults = async (
    roundId: string,
    results: RoundResultEntry[]
  ) => {
    if (userProfile?.role !== 'organizer') {
      setIsAuthModalOpen(true);
      return;
    }
    const targetRound = rounds.find((r) => r.id === roundId);
    if (!targetRound) return;
    const updatedRound: RallyRound = {
      ...targetRound,
      status: 'Completed',
      results,
      publishedAt: new Date().toISOString(),
    };
    setRounds((prev) =>
      prev.map((r) => (r.id === roundId ? updatedRound : r))
    );
    await saveRoundToDb(updatedRound);
  };

  // Handler: Apply Steward Penalty (Organizer only)
  const handleApplyStewardPenalty = async (
    roundId: string,
    driverId: string,
    penaltyPoints: number,
    note: string
  ) => {
    if (userProfile?.role !== 'organizer') {
      setIsAuthModalOpen(true);
      return;
    }
    const targetRound = rounds.find((r) => r.id === roundId);
    if (!targetRound) return;
    const updatedRound: RallyRound = {
      ...targetRound,
      results: targetRound.results.map((res) =>
        res.driverId === driverId
          ? {
              ...res,
              stewardPenaltyPoints: penaltyPoints,
              stewardPenaltyNote: note,
            }
          : res
      ),
    };
    setRounds((prev) =>
      prev.map((r) => (r.id === roundId ? updatedRound : r))
    );
    await saveRoundToDb(updatedRound);
  };

  // Handler: Redact Private Vault Record (Organizer only)
  const handleDeletePrivateRecord = async (driverId: string) => {
    if (userProfile?.role !== 'organizer') {
      setIsAuthModalOpen(true);
      return;
    }
    setPrivateVault((prev) => prev.filter((rec) => rec.driverId !== driverId));
    await deletePrivateVaultFromDb(driverId);
  };

  return (
    <div
      id="top"
      className="min-h-screen flex flex-col bg-[#090B0E] text-[#F4F5F7]"
    >
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userProfile={userProfile}
        authLoading={authLoading}
        authError={authError}
        isAuthModalOpen={isAuthModalOpen}
        onOpenAuthModal={handleOpenAuthModal}
        onCloseAuthModal={handleCloseAuthModal}
        onSignInWithGoogle={handleSignInWithGoogle}
        onSwitchAccountRole={handleSwitchAccountRole}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'standings' && (
          <StandingsView
            drivers={drivers}
            teams={teams}
            rounds={rounds}
            pointsConfig={pointsConfig}
            onUpdatePointsConfig={handleUpdatePointsConfig}
            onSelectDriver={handleInspectDriver}
            onNavigateToRound={handleInspectRound}
            onNavigateToRoundsTab={handleNavigateToRoundsTab}
            onNavigateToDriversTab={handleNavigateToDriversTab}
            onNavigateToRegister={handleNavigateToRegister}
            onNavigateToControl={handleNavigateToControl}
            onOpenShareGraphics={handleOpenShareGraphics}
            userProfile={userProfile}
            onOpenAuthModal={handleOpenAuthModal}
          />
        )}

        {activeTab === 'rounds' && (
          <RoundsView
            rounds={rounds}
            selectedRoundId={selectedRoundId}
            onSelectRoundId={setSelectedRoundId}
            onCreateRound={handleCreateRound}
            drivers={drivers}
            teams={teams}
            pointsConfig={pointsConfig}
            onSelectDriver={handleInspectDriver}
            onNavigateToRegister={handleNavigateToRegister}
            onNavigateToControl={(roundId) => {
              setSelectedRoundId(roundId);
              setActiveTab('control');
            }}
            onOpenShareGraphics={handleOpenShareGraphics}
            userProfile={userProfile}
          />
        )}

        {activeTab === 'drivers' && (
          <DriverProfilesView
            drivers={drivers}
            teams={teams}
            rounds={rounds}
            pointsConfig={pointsConfig}
            selectedDriverId={selectedDriverId}
            onSelectDriverId={setSelectedDriverId}
            onClaimDriverAccount={handleClaimDriverAccount}
            onOpenShareGraphics={handleOpenShareGraphics}
            onNavigateToOnboarding={handleNavigateToRegister}
            userProfile={userProfile}
          />
        )}

        <Suspense fallback={null}>
          {activeTab === 'register' && (
            <RegistrationPortal
              drivers={drivers}
              teams={teams}
              rounds={rounds}
              teamRequests={teamRequests}
              onRegisterDriver={handleRegisterDriver}
              onClaimDriverAccount={handleClaimDriverAccount}
              onInspectDriverProfile={handleInspectDriver}
              onInspectRoundEntryList={handleInspectRound}
              onUpdateTeamLineup={handleUpdateTeamLineup}
              onCreateTeam={handleCreateTeam}
              onCreateTeamRequest={handleCreateTeamRequest}
              onRespondTeamRequest={handleRespondTeamRequest}
              onSendTeamRequestMessage={handleSendTeamRequestMessage}
              userProfile={userProfile}
              onOpenAuthModal={handleOpenAuthModal}
            />
          )}

          {activeTab === 'control' && (
            <RaceControlView
              drivers={drivers}
              privateVault={privateVault}
              rounds={rounds}
              pointsConfig={pointsConfig}
              onPublishRoundResults={handlePublishRoundResults}
              onApplyStewardPenalty={handleApplyStewardPenalty}
              onDeletePrivateRecord={handleDeletePrivateRecord}
              onNavigateToRounds={handleNavigateToRoundsTab}
              userProfile={userProfile}
              onOpenAuthModal={handleOpenAuthModal}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              userProfile={userProfile}
              drivers={drivers}
              teams={teams}
              pointsConfig={pointsConfig}
              onUpdatePointsConfig={handleUpdatePointsConfig}
              onSaveAccountSettings={handleSaveAccountSettings}
              onDeleteAccount={handleDeleteAccount}
              onOpenAuthModal={handleOpenAuthModal}
            />
          )}
        </Suspense>
      </main>

      <footer className="border-t border-[#222731] bg-[#0D1016] py-6 px-6 mt-16">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9CA3AF]">
          <div>
            <strong className="text-[#F4F5F7] font-display tracking-wider uppercase">
              AERC RALLY CONTROL
            </strong>{' '}
            · Championship Platform for the Esports Commission & Sim Racing Kenya (EA Sports WRC Rally1)
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('standings')}
              className="hover:text-[#F4F5F7] cursor-pointer"
            >
              Tournaments & Standings
            </button>
            <button
              type="button"
              onClick={handleNavigateToRoundsTab}
              className="hover:text-[#F4F5F7] cursor-pointer"
            >
              Stage Maps & Rounds
            </button>
            <button
              type="button"
              onClick={handleNavigateToDriversTab}
              className="hover:text-[#F4F5F7] cursor-pointer"
            >
              Driver Stats
            </button>
            {userProfile && (
              <>
                <button
                  type="button"
                  onClick={handleNavigateToRegister}
                  className="hover:text-[#F4F5F7] cursor-pointer"
                >
                  {userProfile.role === 'manager'
                    ? 'Team Management'
                    : userProfile.role === 'driver'
                    ? 'Driver Entry & Teams'
                    : 'Teams & Entries'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="hover:text-[#F4F5F7] cursor-pointer"
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="hover:text-[#F4F5F7] cursor-pointer"
                >
                  Social Graphics
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {shareModalOpen && (
        <Suspense fallback={null}>
          <ShareGraphicsModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            rounds={rounds}
            drivers={drivers}
            teams={teams}
            pointsConfig={pointsConfig}
            initialRoundId={shareRoundId}
          />
        </Suspense>
      )}

      {isAccountOnboardingOpen && (
        <Suspense fallback={null}>
          <AccountOnboardingModal
            isOpen={isAccountOnboardingOpen}
            onClose={() => setIsAccountOnboardingOpen(false)}
            userProfile={userProfile}
            activeRole={onboardingRole}
            onChangeRole={(role) => {
              setOnboardingRole(role);
              if (userProfile) {
                handleSwitchAccountRole(role);
              }
            }}
            existingDrivers={drivers}
            existingTeams={teams}
            onCompleteAccountOnboarding={handleCompleteAccountOnboarding}
          />
        </Suspense>
      )}
    </div>
  );
}

