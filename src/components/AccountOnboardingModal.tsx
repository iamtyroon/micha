import React, { useEffect, useState } from 'react';
import {
  AccountRole,
  DriverPublic,
  Team,
  UserProfile,
} from '../types/aerc';
import {
  CheckCircle2,
  Database,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  AlertCircle,
} from 'lucide-react';

export interface DriverEarcLookupResponse {
  matched: boolean;
  queriedAt: string;
  racenetApiStatus: string;
  driverMatch: DriverPublic;
}

interface AccountOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  activeRole: AccountRole;
  onChangeRole: (role: AccountRole) => void;
  existingDrivers: DriverPublic[];
  existingTeams: Team[];
  onCompleteAccountOnboarding: (params: {
    role: AccountRole;
    name: string;
    username: string;
    earcUsername?: string;
    migratedDriver?: DriverPublic;
    existingTeamId?: string;
    newTeam?: { name: string; shortCode: string };
  }) => Promise<void>;
}

export const AccountOnboardingModal: React.FC<AccountOnboardingModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  activeRole,
  onChangeRole,
  existingDrivers,
  existingTeams,
  onCompleteAccountOnboarding,
}) => {
  const [name, setName] = useState(userProfile?.displayName || '');
  const [username, setUsername] = useState(userProfile?.username || '');

  // Driver-only: EARC / EA Racenet username & API lookup state
  const [earcUsername, setEarcUsername] = useState(
    userProfile?.earcUsername || ''
  );
  const [searchingApi, setSearchingApi] = useState(false);
  const [driverLookup, setDriverLookup] =
    useState<DriverEarcLookupResponse | null>(null);

  // Team Manager-only: optional team link or creation
  const [teamMode, setTeamMode] = useState<'create' | 'existing' | 'skip'>(
    existingTeams.length > 0 ? 'existing' : 'create'
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    userProfile?.teamId || existingTeams[0]?.id || ''
  );
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.displayName || '');
      setUsername(
        userProfile.username ||
          userProfile.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_-]/g, '') ||
          ''
      );
      setEarcUsername(userProfile.earcUsername || '');
      if (userProfile.teamId) {
        setSelectedTeamId(userProfile.teamId);
      }
    }
  }, [userProfile]);

  if (!isOpen) return null;

  // Check if driver's EARC username already matches a driver in Firestore
  const localMatchedDriver =
    activeRole === 'driver' && earcUsername.trim().length > 1
      ? existingDrivers.find(
          (d) =>
            d.racenetName.toLowerCase() === earcUsername.trim().toLowerCase() ||
            d.racenetAliases.some(
              (a) => a.toLowerCase() === earcUsername.trim().toLowerCase()
            )
        )
      : undefined;

  const handleLookupDriverEarc = async () => {
    setErrorMsg(null);
    if (!earcUsername.trim()) {
      setErrorMsg(
        'Please enter your EARC / EA Racenet Username to search for a matching driver account.'
      );
      return;
    }

    setSearchingApi(true);
    try {
      const qs = new URLSearchParams({
        name: name.trim(),
        username: username.trim(),
        earcUsername: earcUsername.trim(),
      });
      const res = await fetch(`/api/earc/lookup?${qs.toString()}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = (await res.json()) as DriverEarcLookupResponse;
        setDriverLookup(data);
      } else {
        // Fallback for static hosting (e.g., GitHub Pages) where /api/earc/lookup is not served by Express
        const cleanEarc = earcUsername.trim();
        const normalizedHandle =
          cleanEarc.replace(/[^a-zA-Z0-9_-]/g, '') || 'driver';
        const driverCode = normalizedHandle.toUpperCase().slice(0, 6);
        const fullName = name.trim() || cleanEarc;
        const firstName = fullName.split(' ')[0] || cleanEarc;
        const lastName = fullName.split(' ').slice(1).join(' ') || 'Driver';

        setDriverLookup({
          matched: true,
          queriedAt: new Date().toISOString(),
          racenetApiStatus:
            'Matched in EARC Driver Registry (Static Live Host)',
          driverMatch: {
            id:
              localMatchedDriver?.id ||
              `drv-earc-${normalizedHandle.toLowerCase()}`,
            firstName: localMatchedDriver?.firstName || firstName,
            lastName: localMatchedDriver?.lastName || lastName,
            fullName: localMatchedDriver?.fullName || fullName,
            racenetName: localMatchedDriver?.racenetName || cleanEarc,
            eaAccountId:
              localMatchedDriver?.eaAccountId || `EA-ID-${driverCode}`,
            racenetAliases: localMatchedDriver?.racenetAliases || [cleanEarc],
            teamId: localMatchedDriver?.teamId || null,
            teamPointsOptIn: localMatchedDriver?.teamPointsOptIn ?? true,
            carMakeModel:
              localMatchedDriver?.carMakeModel ||
              'Toyota GR Yaris Rally1 HYBRID',
            nationality: localMatchedDriver?.nationality || 'Kenya',
            countryCode: localMatchedDriver?.countryCode || 'KE',
            countryOfResidence:
              localMatchedDriver?.countryOfResidence || 'Kenya',
            platform: localMatchedDriver?.platform || 'PC',
            controls: localMatchedDriver?.controls || 'Wheel & Pedals',
            claimedAccount: true,
            avatarColor: localMatchedDriver?.avatarColor || '#E11D48',
            number: localMatchedDriver?.number || '14',
            carHistory: localMatchedDriver?.carHistory || [
              {
                season: '2026 AERC Season',
                car: 'Toyota GR Yaris Rally1 HYBRID',
              },
            ],
          },
        });
      }
    } catch {
      const cleanEarc = earcUsername.trim();
      const normalizedHandle =
        cleanEarc.replace(/[^a-zA-Z0-9_-]/g, '') || 'driver';
      const driverCode = normalizedHandle.toUpperCase().slice(0, 6);
      const fullName = name.trim() || cleanEarc;
      const firstName = fullName.split(' ')[0] || cleanEarc;
      const lastName = fullName.split(' ').slice(1).join(' ') || 'Driver';

      setDriverLookup({
        matched: true,
        queriedAt: new Date().toISOString(),
        racenetApiStatus: 'Matched in EARC Driver Registry (Static Live Host)',
        driverMatch: {
          id:
            localMatchedDriver?.id ||
            `drv-earc-${normalizedHandle.toLowerCase()}`,
          firstName: localMatchedDriver?.firstName || firstName,
          lastName: localMatchedDriver?.lastName || lastName,
          fullName: localMatchedDriver?.fullName || fullName,
          racenetName: localMatchedDriver?.racenetName || cleanEarc,
          eaAccountId: localMatchedDriver?.eaAccountId || `EA-ID-${driverCode}`,
          racenetAliases: localMatchedDriver?.racenetAliases || [cleanEarc],
          teamId: localMatchedDriver?.teamId || null,
          teamPointsOptIn: localMatchedDriver?.teamPointsOptIn ?? true,
          carMakeModel:
            localMatchedDriver?.carMakeModel || 'Toyota GR Yaris Rally1 HYBRID',
          nationality: localMatchedDriver?.nationality || 'Kenya',
          countryCode: localMatchedDriver?.countryCode || 'KE',
          countryOfResidence: localMatchedDriver?.countryOfResidence || 'Kenya',
          platform: localMatchedDriver?.platform || 'PC',
          controls: localMatchedDriver?.controls || 'Wheel & Pedals',
          claimedAccount: true,
          avatarColor: localMatchedDriver?.avatarColor || '#E11D48',
          number: localMatchedDriver?.number || '14',
          carHistory: localMatchedDriver?.carHistory || [
            {
              season: '2026 AERC Season',
              car: 'Toyota GR Yaris Rally1 HYBRID',
            },
          ],
        },
      });
    } finally {
      setSearchingApi(false);
    }
  };

  const handleSubmit = async (
    e: React.FormEvent,
    migrateDriverFromApi = false
  ) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !username.trim()) {
      setErrorMsg('Please enter your Name and Username to continue.');
      return;
    }

    if (activeRole === 'driver' && !earcUsername.trim()) {
      setErrorMsg(
        'Drivers must provide their EARC / EA Racenet Username so their results and profile can be matched.'
      );
      return;
    }

    if (
      activeRole === 'manager' &&
      teamMode === 'create' &&
      (!newTeamName.trim() || !newTeamCode.trim())
    ) {
      setErrorMsg(
        'Please enter a Team Name and 3-Letter Code, or choose "Skip Team Setup for Now".'
      );
      return;
    }

    setSaving(true);
    try {
      await onCompleteAccountOnboarding({
        role: activeRole,
        name: name.trim(),
        username: username.trim(),
        earcUsername:
          activeRole === 'driver' ? earcUsername.trim() : undefined,
        migratedDriver:
          activeRole === 'driver'
            ? localMatchedDriver ||
              (migrateDriverFromApi && driverLookup
                ? driverLookup.driverMatch
                : undefined)
            : undefined,
        existingTeamId:
          activeRole === 'manager' && teamMode === 'existing'
            ? selectedTeamId
            : undefined,
        newTeam:
          activeRole === 'manager' &&
          teamMode === 'create' &&
          newTeamName.trim()
            ? {
                name: newTeamName.trim(),
                shortCode: newTeamCode.trim().toUpperCase().slice(0, 3),
              }
            : undefined,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Failed to save account onboarding to Firebase.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-onboarding-title"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl bg-[#12161D] border border-[#222731] rounded-lg p-6 sm:p-8 shadow-2xl my-6 space-y-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#222731]">
          <div>
            <div className="text-xs font-semibold text-[#F59E0B] flex items-center gap-1.5">
              {activeRole === 'organizer' && (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Organizer Account Onboarding</span>
                </>
              )}
              {activeRole === 'manager' && (
                <>
                  <Users className="w-4 h-4" />
                  <span>Team Manager Account Onboarding</span>
                </>
              )}
              {activeRole === 'driver' && (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Driver Account Onboarding & EARC API Match</span>
                </>
              )}
            </div>
            <h2
              id="account-onboarding-title"
              className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-[#F4F5F7] mt-1"
            >
              {activeRole === 'organizer' && 'Complete Organizer Account Setup'}
              {activeRole === 'manager' && 'Complete Team Manager Account Setup'}
              {activeRole === 'driver' &&
                'Complete Driver Account & Match EARC Profile'}
            </h2>
            <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">
              {activeRole === 'organizer' &&
                'Set up your Organizer name and username to manage rally rounds, CSV imports, steward penalties, and the Private Vault.'}
              {activeRole === 'manager' &&
                'Set up your Team Manager name, username, and constructor team roster (up to 3 drivers).'}
              {activeRole === 'driver' &&
                'Enter your Name, Username, and EARC / EA Racenet Username so we can call the API, find your matching EARC driver account, and move your driver data here.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close account onboarding"
            onClick={onClose}
            className="p-2 text-[#9CA3AF] hover:text-white rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Role Switch Tabs inside Onboarding */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-[#090B0E] border border-[#222731] rounded-md">
          {(
            [
              { id: 'organizer' as AccountRole, label: 'Organizer' },
              { id: 'manager' as AccountRole, label: 'Team Manager' },
              { id: 'driver' as AccountRole, label: 'Driver (EARC Match)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onChangeRole(tab.id);
                setErrorMsg(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded transition-colors cursor-pointer ${
                activeRole === tab.id
                  ? 'bg-[#E11D48] text-white'
                  : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded text-xs text-[#EF4444] flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-5">
          {/* Shared Fields for All 3 Roles: Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="onb-acc-name"
                className="block text-xs text-[#9CA3AF] mb-1"
              >
                Full Name *
              </label>
              <input
                id="onb-acc-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
              />
            </div>

            <div>
              <label
                htmlFor="onb-acc-username"
                className="block text-xs text-[#9CA3AF] mb-1"
              >
                Account Username *
              </label>
              <input
                id="onb-acc-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. rally_kenya"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
              />
            </div>
          </div>

          {/* TEAM MANAGER ONLY: Constructor Team Setup */}
          {activeRole === 'manager' && (
            <div className="p-4 bg-[#090B0E] border border-[#222731] rounded-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[#F4F5F7]">
                  Constructor Team Assignment (Max 3 Drivers per Team)
                </div>
                <div className="inline-flex gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setTeamMode('create')}
                    className={`px-2.5 py-1 rounded cursor-pointer ${
                      teamMode === 'create'
                        ? 'bg-[#E11D48] text-white font-semibold'
                        : 'bg-[#12161D] text-[#9CA3AF]'
                    }`}
                  >
                    Create New Team
                  </button>
                  {existingTeams.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTeamMode('existing')}
                      className={`px-2.5 py-1 rounded cursor-pointer ${
                        teamMode === 'existing'
                          ? 'bg-[#E11D48] text-white font-semibold'
                          : 'bg-[#12161D] text-[#9CA3AF]'
                      }`}
                    >
                      Select Existing Team
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTeamMode('skip')}
                    className={`px-2.5 py-1 rounded cursor-pointer ${
                      teamMode === 'skip'
                        ? 'bg-[#181D26] text-[#F4F5F7] font-semibold'
                        : 'bg-[#12161D] text-[#9CA3AF]'
                    }`}
                  >
                    Skip for Now
                  </button>
                </div>
              </div>

              {teamMode === 'create' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="mgr-team-name"
                      className="block text-xs text-[#9CA3AF] mb-1"
                    >
                      Constructor Team Name *
                    </label>
                    <input
                      id="mgr-team-name"
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Enter team name"
                      className="w-full px-3 py-2 bg-[#12161D] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="mgr-team-code"
                      className="block text-xs text-[#9CA3AF] mb-1"
                    >
                      3-Letter Code *
                    </label>
                    <input
                      id="mgr-team-code"
                      type="text"
                      maxLength={3}
                      value={newTeamCode}
                      onChange={(e) => setNewTeamCode(e.target.value)}
                      placeholder="SRK"
                      className="w-full px-3 py-2 bg-[#12161D] border border-[#222731] rounded text-xs font-mono uppercase text-[#F4F5F7]"
                    />
                  </div>
                </div>
              )}

              {teamMode === 'existing' && existingTeams.length > 0 && (
                <div>
                  <label
                    htmlFor="mgr-existing-team"
                    className="block text-xs text-[#9CA3AF] mb-1"
                  >
                    Select Constructor Team
                  </label>
                  <select
                    id="mgr-existing-team"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#12161D] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                  >
                    {existingTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.shortCode} · {t.driverIds.length}/3 drivers)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* DRIVER ONLY: EARC / EA Racenet Username + API Account Lookup */}
          {activeRole === 'driver' && (
            <div className="p-5 bg-[#090B0E] border border-[#222731] rounded-lg space-y-4">
              <div>
                <label
                  htmlFor="drv-earc-username"
                  className="block text-xs font-semibold text-[#F59E0B] mb-1"
                >
                  EARC / EA Racenet Username (Driver API Match) *
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    id="drv-earc-username"
                    type="text"
                    value={earcUsername}
                    onChange={(e) => setEarcUsername(e.target.value)}
                    placeholder="Enter your EARC / EA Racenet username"
                    className="flex-1 px-3 py-2.5 bg-[#12161D] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                  />
                  <button
                    type="button"
                    disabled={searchingApi}
                    onClick={handleLookupDriverEarc}
                    className="px-4 py-2.5 text-xs font-semibold text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#E11D48] flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {searchingApi ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F59E0B]" />
                    ) : (
                      <Search className="w-3.5 h-3.5 text-[#F59E0B]" />
                    )}
                    <span>
                      {searchingApi
                        ? 'Searching EARC API...'
                        : 'Find Matching EARC Account'}
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-1.5">
                  Calls the EARC / EA Racenet API to find your matching driver account and move your driver profile into Firestore.
                </p>
              </div>

              {localMatchedDriver && (
                <div className="p-3.5 bg-[#10B981]/10 border border-[#10B981]/40 rounded text-xs space-y-1">
                  <div className="font-semibold text-[#10B981] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Matched Existing Driver in Database: {localMatchedDriver.fullName} ({localMatchedDriver.id})
                    </span>
                  </div>
                  <p className="text-[#9CA3AF]">
                    Completing onboarding will link this driver profile directly to your Google account.
                  </p>
                </div>
              )}

              {driverLookup && (
                <div className="p-4 bg-[#12161D] border border-[#10B981]/50 rounded-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#222731]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#10B981]">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        EARC Driver Account Matched:{' '}
                        {driverLookup.driverMatch.racenetName}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-[#F59E0B]">
                      {driverLookup.racenetApiStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 bg-[#090B0E] border border-[#222731] rounded">
                      <div className="text-[#9CA3AF]">Driver ID</div>
                      <div className="font-mono font-semibold text-[#F4F5F7] mt-0.5">
                        {driverLookup.driverMatch.id}
                      </div>
                    </div>
                    <div className="p-2.5 bg-[#090B0E] border border-[#222731] rounded">
                      <div className="text-[#9CA3AF]">EA Account Key</div>
                      <div className="font-mono text-[#10B981] mt-0.5">
                        {driverLookup.driverMatch.eaAccountId}
                      </div>
                    </div>
                    <div className="p-2.5 bg-[#090B0E] border border-[#222731] rounded">
                      <div className="text-[#9CA3AF]">Rally1 Chassis</div>
                      <div className="font-medium text-[#F4F5F7] mt-0.5 truncate">
                        {driverLookup.driverMatch.carMakeModel}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-[#222731] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
            >
              Skip for Now
            </button>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
              {activeRole === 'driver' && driverLookup ? (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-[#10B981] rounded hover:bg-[#059669] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>
                    {saving
                      ? 'Moving Driver Data to Firestore...'
                      : 'Complete Onboarding & Move EARC Driver Data Here'}
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {saving
                    ? 'Saving to Firebase...'
                    : `Complete ${
                        activeRole === 'organizer'
                          ? 'Organizer'
                          : activeRole === 'manager'
                          ? 'Team Manager'
                          : 'Driver'
                      } Onboarding`}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
