import React, { useEffect, useState } from 'react';
import {
  DriverPrivateVault,
  DriverPublic,
  RallyRound,
  Team,
  TeamRequest,
  UserProfile,
} from '../types/aerc';
import { OnboardingFlow } from './OnboardingFlow';
import {
  CheckCircle2,
  LogIn,
  MessageSquare,
  Send,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

interface RegistrationPortalProps {
  drivers: DriverPublic[];
  teams: Team[];
  rounds: RallyRound[];
  teamRequests: TeamRequest[];
  onRegisterDriver: (
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
  ) => Promise<{ driverId: string; matchedExisting: boolean }>;
  onClaimDriverAccount: (driverId: string, newAlias?: string) => Promise<void>;
  onInspectDriverProfile: (driverId: string) => void;
  onInspectRoundEntryList: (roundId: string) => void;
  onUpdateTeamLineup: (teamId: string, driverIds: string[]) => Promise<void>;
  onCreateTeam: (team: Omit<Team, 'id'>) => Promise<void>;
  onCreateTeamRequest: (params: {
    teamId: string;
    driverId: string;
    direction: 'manager_invite' | 'driver_request';
    initialMessage?: string;
  }) => Promise<void>;
  onRespondTeamRequest: (
    requestId: string,
    decision: 'accepted' | 'declined'
  ) => Promise<void>;
  onSendTeamRequestMessage: (
    requestId: string,
    senderRole: 'manager' | 'driver',
    senderName: string,
    text: string
  ) => Promise<void>;
  userProfile: UserProfile | null;
  onOpenAuthModal: () => void;
}

export const RegistrationPortal: React.FC<RegistrationPortalProps> = ({
  drivers,
  teams,
  rounds,
  teamRequests,
  onRegisterDriver,
  onClaimDriverAccount,
  onInspectDriverProfile,
  onInspectRoundEntryList,
  onUpdateTeamLineup,
  onCreateTeam,
  onCreateTeamRequest,
  onRespondTeamRequest,
  onSendTeamRequestMessage,
  userProfile,
  onOpenAuthModal,
}) => {
  const [portalMode, setPortalMode] = useState<
    'teamManager' | 'driverMarket' | 'onboarding'
  >(
    userProfile?.role === 'driver'
      ? 'driverMarket'
      : 'teamManager'
  );

  // Team Manager state
  const [selectedManagedTeamId, setSelectedManagedTeamId] = useState<string>(
    userProfile?.teamId || teams[0]?.id || ''
  );
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newManagerName, setNewManagerName] = useState(
    userProfile?.displayName || ''
  );
  const [newManagerEmail, setNewManagerEmail] = useState(
    userProfile?.email || ''
  );
  const [inviteNoteByDriver, setInviteNoteByDriver] = useState<
    Record<string, string>
  >({});
  const [teamStatusMsg, setTeamStatusMsg] = useState<string | null>(null);

  // Driver Market state
  const [selectedDriverForMarketId, setSelectedDriverForMarketId] =
    useState<string>(userProfile?.driverId || drivers[0]?.id || '');
  const [joinNoteByTeam, setJoinNoteByTeam] = useState<Record<string, string>>(
    {}
  );
  const [driverMarketMsg, setDriverMarketMsg] = useState<string | null>(null);

  // Shared Chat state
  const [activeChatRequestId, setActiveChatRequestId] = useState<string>(
    teamRequests[0]?.id || ''
  );
  const [chatInput, setChatInput] = useState<string>('');

  // Keep portalMode synchronized with the signed-in user's role
  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.role === 'manager') {
      setPortalMode('teamManager');
    } else if (
      userProfile.role === 'driver' &&
      portalMode === 'teamManager'
    ) {
      setPortalMode('driverMarket');
    }
  }, [userProfile, portalMode]);

  useEffect(() => {
    if (userProfile?.teamId) {
      setSelectedManagedTeamId(userProfile.teamId);
    } else if (!selectedManagedTeamId && teams[0]?.id) {
      setSelectedManagedTeamId(teams[0].id);
    }
  }, [userProfile?.teamId, teams, selectedManagedTeamId]);

  useEffect(() => {
    if (userProfile?.driverId) {
      setSelectedDriverForMarketId(userProfile.driverId);
    } else if (!selectedDriverForMarketId && drivers[0]?.id) {
      setSelectedDriverForMarketId(drivers[0].id);
    }
  }, [userProfile?.driverId, drivers, selectedDriverForMarketId]);

  // Spectator Gate: Unauthenticated visitors cannot create teams or register as drivers
  if (!userProfile) {
    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-[#12161D] border border-[#222731] rounded-lg text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-[#F59E0B] mx-auto" />
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-[#F59E0B]">
            Spectator Mode · Read-Only Access
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-[#F4F5F7]">
            Sign In Required for Team & Driver Operations
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
            Public spectators can browse championship standings, rally schedules, and driver profiles. To register as a Driver, create or manage a Constructor Team as a Team Manager, or administer the championship as an Organizer, please sign in with Google.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>
        </div>
      </div>
    );
  }

  const canManageTeams =
    userProfile.role === 'manager' || userProfile.role === 'organizer';
  const canUseDriverPortal =
    userProfile.role === 'driver' || userProfile.role === 'organizer';

  const effectiveMode =
    userProfile.role === 'manager'
      ? 'teamManager'
      : userProfile.role === 'driver' && portalMode === 'teamManager'
      ? 'driverMarket'
      : portalMode;

  const managedTeam =
    teams.find((t) => t.id === selectedManagedTeamId) || teams[0];

  const activeDriverForMarket =
    drivers.find((d) => d.id === selectedDriverForMarketId) || drivers[0];

  const activeChatRequest =
    teamRequests.find((r) => r.id === activeChatRequestId) || teamRequests[0];

  const handleCreateNewTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTeams) return;
    if (!newTeamName.trim() || !newTeamCode.trim() || !newManagerName.trim())
      return;
    await onCreateTeam({
      name: newTeamName.trim(),
      shortCode: newTeamCode.trim().toUpperCase().slice(0, 3),
      managerName: newManagerName.trim(),
      managerEmail: newManagerEmail.trim() || 'principal@aerc.org',
      countryCode: 'KE',
      liveryColor: '#E11D48',
      driverIds: [],
      activeForTeamChampionship: true,
    });
    setNewTeamName('');
    setNewTeamCode('');
    setTeamStatusMsg(
      'Constructor team created. You can now send team assignment requests to available drivers.'
    );
  };

  const handleManagerSendInvite = async (driver: DriverPublic) => {
    if (!canManageTeams || !managedTeam) return;
    setTeamStatusMsg(null);
    if (managedTeam.driverIds.length >= 3) {
      setTeamStatusMsg(
        `Roster Full: ${managedTeam.name} already has 3 drivers.`
      );
      return;
    }
    const note =
      inviteNoteByDriver[driver.id]?.trim() ||
      `Hi ${driver.fullName}, we would like to assign you to ${managedTeam.name} (${managedTeam.shortCode}) for the AERC season.`;
    await onCreateTeamRequest({
      teamId: managedTeam.id,
      driverId: driver.id,
      direction: 'manager_invite',
      initialMessage: note,
    });
    setInviteNoteByDriver((prev) => ({ ...prev, [driver.id]: '' }));
    setTeamStatusMsg(
      `Sent team assignment request to ${driver.fullName}. Once accepted, they will be added to ${managedTeam.name}.`
    );
  };

  const handleDriverSendJoinRequest = async (team: Team) => {
    if (!canUseDriverPortal || !activeDriverForMarket) return;
    setDriverMarketMsg(null);
    if (team.driverIds.length >= 3) {
      setDriverMarketMsg(`${team.name} already has a full 3-driver roster.`);
      return;
    }
    const note =
      joinNoteByTeam[team.id]?.trim() ||
      `Hi ${team.managerName}, I'd like to request a seat with ${team.name} (${team.shortCode}) driving the ${activeDriverForMarket.carMakeModel}.`;
    await onCreateTeamRequest({
      teamId: team.id,
      driverId: activeDriverForMarket.id,
      direction: 'driver_request',
      initialMessage: note,
    });
    setJoinNoteByTeam((prev) => ({ ...prev, [team.id]: '' }));
    setDriverMarketMsg(
      `Sent join request to ${team.name}. You can message ${team.managerName} below.`
    );
  };

  const handleSendChatSubmit = async (
    e: React.FormEvent,
    senderRole: 'manager' | 'driver'
  ) => {
    e.preventDefault();
    if (!activeChatRequest || !chatInput.trim()) return;
    const senderName =
      senderRole === 'manager'
        ? activeChatRequest.managerName
        : activeChatRequest.driverName;
    await onSendTeamRequestMessage(
      activeChatRequest.id,
      senderRole,
      senderName,
      chatInput.trim()
    );
    setChatInput('');
  };

  const teamRequestsForManagedTeam = managedTeam
    ? teamRequests.filter((r) => r.teamId === managedTeam.id)
    : [];

  const teamRequestsForActiveDriver = activeDriverForMarket
    ? teamRequests.filter((r) => r.driverId === activeDriverForMarket.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#222731]">
        <div>
          <div className="text-xs text-[#F59E0B] font-semibold">
            {userProfile.role === 'manager'
              ? 'Team Manager Operations · Constructor Team & Driver Roster'
              : userProfile.role === 'driver'
              ? 'Driver Hub · Team Invitations, Constructor Market & Round Entries'
              : 'Championship Administration · Teams, Driver Market & Entries'}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#F4F5F7] mt-1">
            {userProfile.role === 'manager'
              ? 'Constructor Team & Driver Recruitment'
              : userProfile.role === 'driver'
              ? 'Driver Entry & Team Invitations'
              : 'Teams, Driver Market & Registration'}
          </h1>
        </div>

        <div className="inline-flex flex-wrap p-1 bg-[#12161D] border border-[#222731] rounded-md gap-1 self-start">
          {canManageTeams && (
            <button
              type="button"
              onClick={() => setPortalMode('teamManager')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                effectiveMode === 'teamManager'
                  ? 'bg-[#E11D48] text-white'
                  : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
              }`}
            >
              Team Manager (Assign Drivers)
            </button>
          )}
          {canUseDriverPortal && (
            <>
              <button
                type="button"
                onClick={() => setPortalMode('driverMarket')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  effectiveMode === 'driverMarket'
                    ? 'bg-[#E11D48] text-white'
                    : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
                }`}
              >
                Driver Team Finder & Invites
              </button>
              <button
                type="button"
                onClick={() => setPortalMode('onboarding')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  effectiveMode === 'onboarding'
                    ? 'bg-[#E11D48] text-white'
                    : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
                }`}
              >
                My Driver Entry
              </button>
            </>
          )}
        </div>
      </div>

      {/* MODE 1: TEAM MANAGER — BROWSE REGISTERED DRIVERS, SEND INVITES, ACCEPT REQUESTS & CHAT */}
      {canManageTeams && effectiveMode === 'teamManager' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Available Drivers & Roster Assignment Card */}
            <div className="bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222731]">
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#E11D48]" />
                    <span>Available Registered Drivers & Team Roster</span>
                  </h2>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    Review registered drivers and send a team assignment request. Drivers accept the request to join your 3-car line-up.
                  </p>
                </div>

                {teams.length > 0 && (
                  <select
                    aria-label="Select Team to Manage"
                    value={managedTeam?.id || ''}
                    onChange={(e) => {
                      setSelectedManagedTeamId(e.target.value);
                      setTeamStatusMsg(null);
                    }}
                    className="bg-[#090B0E] border border-[#222731] rounded px-3 py-2 text-xs font-semibold text-[#F4F5F7]"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.driverIds.length}/3 Drivers)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {teamStatusMsg && (
                <div className="p-3.5 bg-[#10B981]/10 border border-[#10B981]/40 rounded text-xs text-[#10B981]">
                  {teamStatusMsg}
                </div>
              )}

              {!managedTeam ? (
                <div className="p-8 bg-[#090B0E] border border-[#222731] rounded text-center space-y-2">
                  <div className="text-sm font-semibold text-[#F4F5F7]">
                    No Constructor Teams Created Yet
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    Create your constructor team using the form on the right to start recruiting and assigning drivers.
                  </p>
                </div>
              ) : drivers.length === 0 ? (
                <div className="p-8 bg-[#090B0E] border border-[#222731] rounded text-center space-y-3">
                  <div className="text-sm font-semibold text-[#F4F5F7]">
                    No Drivers Registered Yet
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    Once drivers sign in as a Driver and complete Driver Onboarding, they will appear here for you to invite and assign to {managedTeam.name}.
                  </p>
                  {userProfile.role === 'organizer' && (
                    <button
                      type="button"
                      onClick={() => setPortalMode('onboarding')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] cursor-pointer"
                    >
                      Register a Driver
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[#222731] border border-[#222731] rounded bg-[#090B0E]">
                  {drivers.map((drv) => {
                    const isInManagedTeam = managedTeam.driverIds.includes(
                      drv.id
                    );
                    const otherTeam =
                      drv.teamId && drv.teamId !== managedTeam.id
                        ? teams.find((t) => t.id === drv.teamId)
                        : undefined;
                    const existingReq = teamRequests.find(
                      (r) =>
                        r.teamId === managedTeam.id &&
                        r.driverId === drv.id &&
                        r.status === 'pending'
                    );

                    return (
                      <div
                        key={drv.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#F4F5F7]">
                              #{drv.number} {drv.fullName}
                            </span>
                            <span className="font-mono text-xs text-[#F59E0B]">
                              ({drv.racenetName})
                            </span>
                            {isInManagedTeam && (
                              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#10B981]/15 text-[#10B981] rounded">
                                Active Team Driver
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#9CA3AF]">
                            {drv.carMakeModel} · {drv.nationality} ·{' '}
                            {drv.platform} ({drv.controls})
                            {otherTeam ? ` · Signed with ${otherTeam.name}` : ''}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {isInManagedTeam ? (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = managedTeam.driverIds.filter(
                                  (id) => id !== drv.id
                                );
                                onUpdateTeamLineup(managedTeam.id, updated);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded hover:bg-[#EF4444]/20 cursor-pointer"
                            >
                              Remove from Roster
                            </button>
                          ) : existingReq ? (
                            <div className="flex items-center gap-2">
                              {existingReq.direction === 'driver_request' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onRespondTeamRequest(
                                        existingReq.id,
                                        'accepted'
                                      )
                                    }
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#10B981] rounded hover:bg-[#059669] cursor-pointer"
                                  >
                                    Accept Join Request
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onRespondTeamRequest(
                                        existingReq.id,
                                        'declined'
                                      )
                                    }
                                    className="px-2.5 py-1.5 text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs font-mono text-[#F59E0B]">
                                  Assignment Request Pending
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveChatRequestId(existingReq.id)
                                }
                                className="px-2.5 py-1.5 text-xs font-medium text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#E11D48] flex items-center gap-1 cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Chat</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="text"
                                aria-label={`Message for ${drv.fullName}`}
                                value={inviteNoteByDriver[drv.id] || ''}
                                onChange={(e) =>
                                  setInviteNoteByDriver((prev) => ({
                                    ...prev,
                                    [drv.id]: e.target.value,
                                  }))
                                }
                                placeholder="Optional note to driver..."
                                className="px-2.5 py-1.5 bg-[#12161D] border border-[#222731] rounded text-xs text-[#F4F5F7] w-44"
                              />
                              <button
                                type="button"
                                onClick={() => handleManagerSendInvite(drv)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Assign / Invite to Team</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Team Requests & Team-Driver Chat Thread */}
            {managedTeam && teamRequestsForManagedTeam.length > 0 && (
              <div className="bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4">
                <h3 className="font-display text-xl font-bold uppercase text-[#F4F5F7] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#F59E0B]" />
                  <span>
                    Team Invitations, Driver Join Requests & Messages ({teamRequestsForManagedTeam.length})
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5 space-y-2">
                    {teamRequestsForManagedTeam.map((req) => {
                      const isSelected = activeChatRequest?.id === req.id;
                      return (
                        <button
                          key={req.id}
                          type="button"
                          onClick={() => setActiveChatRequestId(req.id)}
                          className={`w-full text-left p-3 rounded border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#181D26] border-[#E11D48]'
                              : 'bg-[#090B0E] border-[#222731] hover:border-[#374151]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#F4F5F7]">
                              {req.driverName}
                            </span>
                            <span
                              className={`font-mono text-[10px] uppercase ${
                                req.status === 'accepted'
                                  ? 'text-[#10B981]'
                                  : req.status === 'declined'
                                  ? 'text-[#EF4444]'
                                  : 'text-[#F59E0B]'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                            {req.direction === 'manager_invite'
                              ? 'Manager Assignment Invite'
                              : 'Driver Requested to Join'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {activeChatRequest && (
                    <div className="md:col-span-7 bg-[#090B0E] border border-[#222731] rounded p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between pb-2.5 border-b border-[#222731]">
                          <div className="text-xs font-semibold text-[#F4F5F7]">
                            Conversation with {activeChatRequest.driverName} (
                            {activeChatRequest.driverRacenet})
                          </div>
                          {activeChatRequest.status === 'pending' &&
                            activeChatRequest.direction === 'driver_request' && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRespondTeamRequest(
                                      activeChatRequest.id,
                                      'accepted'
                                    )
                                  }
                                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#10B981] rounded cursor-pointer"
                                >
                                  Accept Driver
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRespondTeamRequest(
                                      activeChatRequest.id,
                                      'declined'
                                    )
                                  }
                                  className="px-2.5 py-1 text-[11px] text-[#EF4444] bg-[#EF4444]/10 rounded cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                        </div>

                        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                          {activeChatRequest.messages.map((m) => (
                            <div
                              key={m.id}
                              className={`p-2.5 rounded text-xs ${
                                m.senderRole === 'manager'
                                  ? 'bg-[#181D26] text-[#F4F5F7] ml-4'
                                  : 'bg-[#12161D] border border-[#222731] text-[#F4F5F7] mr-4'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-[#9CA3AF] mb-1">
                                <span>
                                  {m.senderName} ({m.senderRole})
                                </span>
                                <span>{m.timestamp.slice(11, 16)}</span>
                              </div>
                              <div>{m.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <form
                        onSubmit={(e) => handleSendChatSubmit(e, 'manager')}
                        className="flex gap-2 pt-2 border-t border-[#222731]"
                      >
                        <input
                          type="text"
                          aria-label="Message to driver"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Write a message to driver..."
                          className="flex-1 px-3 py-1.5 bg-[#12161D] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Create New Constructor Team */}
          <form
            onSubmit={handleCreateNewTeam}
            className="lg:col-span-4 bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4"
          >
            <h3 className="font-display text-xl font-bold uppercase text-[#F4F5F7]">
              Create Constructor Team
            </h3>
            <p className="text-xs text-[#9CA3AF]">
              Register a team entry and recruit up to 3 drivers.
            </p>
            <div>
              <label
                htmlFor="new-team-name"
                className="block text-xs text-[#9CA3AF] mb-1"
              >
                Team Name *
              </label>
              <input
                id="new-team-name"
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Enter team name"
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>
            <div>
              <label
                htmlFor="new-team-code"
                className="block text-xs text-[#9CA3AF] mb-1"
              >
                3-Letter Telemetry Code *
              </label>
              <input
                id="new-team-code"
                type="text"
                maxLength={3}
                value={newTeamCode}
                onChange={(e) => setNewTeamCode(e.target.value)}
                placeholder="SRK"
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono uppercase text-[#F4F5F7]"
              />
            </div>
            <div>
              <label
                htmlFor="new-mgr-name"
                className="block text-xs text-[#9CA3AF] mb-1"
              >
                Team Manager Name *
              </label>
              <input
                id="new-mgr-name"
                type="text"
                value={newManagerName}
                onChange={(e) => setNewManagerName(e.target.value)}
                placeholder="Enter manager name"
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>
            <div>
              <label
                htmlFor="new-mgr-email"
                className="block text-xs text-[#9CA3AF] mb-1"
              >
                Manager Email
              </label>
              <input
                id="new-mgr-email"
                type="email"
                value={newManagerEmail}
                onChange={(e) => setNewManagerEmail(e.target.value)}
                placeholder="Enter manager email"
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] transition-colors cursor-pointer"
            >
              Create Team Entry
            </button>
          </form>
        </div>
      )}

      {/* MODE 2: DRIVER TEAM FINDER, INCOMING TEAM INVITATIONS & CHAT */}
      {canUseDriverPortal && effectiveMode === 'driverMarket' && (
        <div className="space-y-6">
          <div className="bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222731]">
              <div>
                <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7] flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#10B981]" />
                  <span>Driver Team Invitations & Constructor Market</span>
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Accept team assignment invitations from Team Managers, request to join an open team, and message your Team Manager.
                </p>
              </div>

              {drivers.length > 0 && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="market-driver-select"
                    className="text-xs text-[#9CA3AF]"
                  >
                    Active Driver:
                  </label>
                  <select
                    id="market-driver-select"
                    value={activeDriverForMarket?.id || ''}
                    onChange={(e) => {
                      setSelectedDriverForMarketId(e.target.value);
                      setDriverMarketMsg(null);
                    }}
                    className="bg-[#090B0E] border border-[#222731] rounded px-3 py-2 text-xs font-semibold text-[#F4F5F7]"
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        #{d.number} {d.fullName} ({d.racenetName})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {driverMarketMsg && (
              <div className="p-3.5 bg-[#10B981]/10 border border-[#10B981]/40 rounded text-xs text-[#10B981]">
                {driverMarketMsg}
              </div>
            )}

            {!activeDriverForMarket ? (
              <div className="p-8 bg-[#090B0E] border border-[#222731] rounded text-center space-y-3">
                <div className="text-sm font-semibold text-[#F4F5F7]">
                  Register Your Driver Profile First
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  Register as a driver (or sign in as a Driver to match your EARC username) so you can receive team invitations and request to join teams.
                </p>
                <button
                  type="button"
                  onClick={() => setPortalMode('onboarding')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] cursor-pointer"
                >
                  Register as a Driver
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Incoming Invitations & Active Requests for this Driver */}
                <div className="lg:col-span-6 space-y-4">
                  <h3 className="font-display text-lg font-bold uppercase text-[#F4F5F7]">
                    Your Team Invitations & Join Requests ({teamRequestsForActiveDriver.length})
                  </h3>

                  {teamRequestsForActiveDriver.length === 0 ? (
                    <div className="p-6 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#9CA3AF]">
                      No team invitations or join requests yet. Browse constructor teams on the right and click "Request to Join Team".
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teamRequestsForActiveDriver.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 bg-[#090B0E] border border-[#222731] rounded-lg space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-[#F4F5F7]">
                                {req.teamName} ({req.teamShortCode})
                              </div>
                              <div className="text-xs text-[#9CA3AF]">
                                Team Manager: {req.managerName} ·{' '}
                                {req.direction === 'manager_invite'
                                  ? 'Invited you to join roster'
                                  : 'You requested to join'}
                              </div>
                            </div>
                            <span
                              className={`font-mono text-xs font-semibold uppercase ${
                                req.status === 'accepted'
                                  ? 'text-[#10B981]'
                                  : req.status === 'declined'
                                  ? 'text-[#EF4444]'
                                  : 'text-[#F59E0B]'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>

                          {/* Messages in this request */}
                          <div className="space-y-1.5 max-h-40 overflow-y-auto border-t border-[#222731] pt-2.5">
                            {req.messages.map((m) => (
                              <div
                                key={m.id}
                                className="text-xs p-2 rounded bg-[#12161D]"
                              >
                                <span className="font-semibold text-[#F59E0B]">
                                  {m.senderName}:{' '}
                                </span>
                                <span className="text-[#F4F5F7]">{m.text}</span>
                              </div>
                            ))}
                          </div>

                          {/* Accept / Decline buttons if manager invited this driver */}
                          {req.status === 'pending' &&
                            req.direction === 'manager_invite' && (
                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRespondTeamRequest(req.id, 'accepted')
                                  }
                                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#10B981] rounded hover:bg-[#059669] flex items-center gap-1.5 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Accept Team Assignment</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRespondTeamRequest(req.id, 'declined')
                                  }
                                  className="px-3 py-1.5 text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded flex items-center gap-1 cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Decline</span>
                                </button>
                              </div>
                            )}

                          {/* Reply in chat */}
                          <form
                            onSubmit={(e) => {
                              setActiveChatRequestId(req.id);
                              handleSendChatSubmit(e, 'driver');
                            }}
                            className="flex gap-2 pt-2 border-t border-[#222731]"
                          >
                            <input
                              type="text"
                              aria-label={`Reply to ${req.teamName}`}
                              value={
                                activeChatRequest?.id === req.id
                                  ? chatInput
                                  : ''
                              }
                              onFocus={() => setActiveChatRequestId(req.id)}
                              onChange={(e) => {
                                setActiveChatRequestId(req.id);
                                setChatInput(e.target.value);
                              }}
                              placeholder={`Message ${req.managerName}...`}
                              className="flex-1 px-2.5 py-1.5 bg-[#12161D] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                            />
                            <button
                              type="submit"
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#E11D48] rounded cursor-pointer"
                            >
                              Send
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Browse Constructor Teams & Request to Join */}
                <div className="lg:col-span-6 space-y-4">
                  <h3 className="font-display text-lg font-bold uppercase text-[#F4F5F7]">
                    Available Constructor Teams ({teams.length})
                  </h3>

                  {teams.length === 0 ? (
                    <div className="p-6 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#9CA3AF]">
                      No constructor teams have been registered yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teams.map((t) => {
                        const isMember = t.driverIds.includes(
                          activeDriverForMarket.id
                        );
                        const pendingReq = teamRequests.find(
                          (r) =>
                            r.teamId === t.id &&
                            r.driverId === activeDriverForMarket.id &&
                            r.status === 'pending'
                        );
                        const isFull = t.driverIds.length >= 3;

                        return (
                          <div
                            key={t.id}
                            className="p-4 bg-[#090B0E] border border-[#222731] rounded-lg space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold text-[#F4F5F7]">
                                  {t.name} ({t.shortCode})
                                </div>
                                <div className="text-xs text-[#9CA3AF]">
                                  Principal: {t.managerName} · Seats:{' '}
                                  <span className="font-mono text-[#10B981]">
                                    {t.driverIds.length}/3
                                  </span>
                                </div>
                              </div>

                              {isMember ? (
                                <span className="px-2.5 py-1 text-xs font-mono font-semibold text-[#10B981] bg-[#10B981]/10 rounded">
                                  Your Active Team
                                </span>
                              ) : pendingReq ? (
                                <span className="px-2.5 py-1 text-xs font-mono text-[#F59E0B] bg-[#F59E0B]/10 rounded">
                                  {pendingReq.direction === 'manager_invite'
                                    ? 'Invited You'
                                    : 'Request Pending'}
                                </span>
                              ) : isFull ? (
                                <span className="text-xs font-mono text-[#9CA3AF]">
                                  Roster Full (3/3)
                                </span>
                              ) : null}
                            </div>

                            {!isMember && !pendingReq && !isFull && (
                              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#222731]">
                                <input
                                  type="text"
                                  aria-label={`Join note for ${t.name}`}
                                  value={joinNoteByTeam[t.id] || ''}
                                  onChange={(e) =>
                                    setJoinNoteByTeam((prev) => ({
                                      ...prev,
                                      [t.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={`Message to ${t.managerName}...`}
                                  className="flex-1 px-2.5 py-1.5 bg-[#12161D] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDriverSendJoinRequest(t)}
                                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] shrink-0 cursor-pointer"
                                >
                                  Request to Join Team
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: NEW DRIVER REGISTRATION */}
      {canUseDriverPortal && effectiveMode === 'onboarding' && (
        <OnboardingFlow
          drivers={drivers}
          teams={teams}
          rounds={rounds}
          onRegisterDriver={onRegisterDriver}
          onClaimDriverAccount={onClaimDriverAccount}
          onInspectDriverProfile={onInspectDriverProfile}
          onInspectRoundEntryList={onInspectRoundEntryList}
        />
      )}
    </div>
  );
};
