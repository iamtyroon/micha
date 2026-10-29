/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  DriverPrivateVault,
  DriverPublic,
  PointsConfig,
  RallyRound,
  RoundResultEntry,
  Team,
  UserRole,
} from './types/aerc';
import {
  INITIAL_DRIVERS_PUBLIC,
  INITIAL_PRIVATE_VAULT,
  INITIAL_ROUNDS,
  INITIAL_TEAMS,
} from './data/seedAercData';
import { DEFAULT_AERC_POINTS_CONFIG } from './utils/championshipEngine';
import { ActiveTab, TopNav } from './components/TopNav';
import { StandingsView } from './components/StandingsView';
import { RoundsView } from './components/RoundsView';
import { DriverProfilesView } from './components/DriverProfilesView';
import { RegistrationPortal } from './components/RegistrationPortal';
import { RaceControlView } from './components/RaceControlView';
import { ShareGraphicsModal } from './components/ShareGraphicsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('standings');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);

  // Core Championship State
  const [drivers, setDrivers] = useState<DriverPublic[]>(INITIAL_DRIVERS_PUBLIC);
  const [privateVault, setPrivateVault] = useState<DriverPrivateVault[]>(INITIAL_PRIVATE_VAULT);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [rounds, setRounds] = useState<RallyRound[]>(INITIAL_ROUNDS);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>(DEFAULT_AERC_POINTS_CONFIG);

  // Selected entity states across tabs
  const [selectedDriverId, setSelectedDriverId] = useState<string>('drv-1');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('rnd-1');
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareRoundId, setShareRoundId] = useState<string | undefined>(undefined);

  // Handler: Select driver and switch to Drivers tab
  const handleInspectDriver = (driverId: string) => {
    setSelectedDriverId(driverId);
    setActiveTab('drivers');
  };

  // Handler: Select round and switch to Rounds tab
  const handleInspectRound = (roundId: string) => {
    setSelectedRoundId(roundId);
    setActiveTab('rounds');
  };

  // Handler: Claim driver profile or add Racenet alias
  const handleClaimDriverAccount = (driverId: string, newAlias?: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const updatedAliases =
          newAlias && !d.racenetAliases.includes(newAlias)
            ? [...d.racenetAliases, newAlias]
            : d.racenetAliases;
        return {
          ...d,
          claimedAccount: true,
          racenetAliases: updatedAliases,
        };
      })
    );
  };

  // Handler: Register driver for a round (splits Public and Private Vault records)
  const handleRegisterDriver = (
    publicData: Omit<DriverPublic, 'id' | 'claimedAccount' | 'avatarColor' | 'carHistory'>,
    privateData: Omit<DriverPrivateVault, 'driverId' | 'consentTimestamp'>,
    roundId: string,
    existingDriverId?: string
  ) => {
    const targetDriverId = existingDriverId || `drv-${drivers.length + 1}`;
    const matchedExisting = Boolean(existingDriverId);

    if (!matchedExisting) {
      const newDriver: DriverPublic = {
        ...publicData,
        id: targetDriverId,
        claimedAccount: false,
        avatarColor: '#E11D48',
        carHistory: [{ season: '2026 AERC Season', car: publicData.carMakeModel }],
      };
      setDrivers((prev) => [...prev, newDriver]);

      const newVaultRecord: DriverPrivateVault = {
        ...privateData,
        driverId: targetDriverId,
        consentTimestamp: new Date().toISOString(),
      };
      setPrivateVault((prev) => [...prev, newVaultRecord]);

      if (publicData.teamId) {
        setTeams((prev) =>
          prev.map((t) =>
            t.id === publicData.teamId && t.driverIds.length < 3
              ? { ...t, driverIds: [...t.driverIds, targetDriverId] }
              : t
          )
        );
      }
    }

    setRounds((prev) =>
      prev.map((r) =>
        r.id === roundId && !r.registeredDriverIds.includes(targetDriverId)
          ? { ...r, registeredDriverIds: [...r.registeredDriverIds, targetDriverId] }
          : r
      )
    );

    return { driverId: targetDriverId, matchedExisting };
  };

  // Handler: Team Manager Line-Up Update
  const handleUpdateTeamLineup = (teamId: string, driverIds: string[]) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, driverIds } : t))
    );
    setDrivers((prev) =>
      prev.map((d) => {
        if (driverIds.includes(d.id)) {
          return { ...d, teamId, teamPointsOptIn: true };
        }
        if (d.teamId === teamId && !driverIds.includes(d.id)) {
          return { ...d, teamId: null };
        }
        return d;
      })
    );
  };

  // Handler: Create New Team
  const handleCreateTeam = (teamData: Omit<Team, 'id'>) => {
    const newTeam: Team = {
      ...teamData,
      id: `team-${teams.length + 1}`,
    };
    setTeams((prev) => [...prev, newTeam]);
  };

  // Handler: Publish Round Results from EA Racenet CSV
  const handlePublishRoundResults = (roundId: string, results: RoundResultEntry[]) => {
    setRounds((prev) =>
      prev.map((r) =>
        r.id === roundId
          ? {
              ...r,
              status: 'Completed',
              results,
              publishedAt: new Date().toISOString(),
            }
          : r
      )
    );
  };

  // Handler: Apply Steward Penalty
  const handleApplyStewardPenalty = (
    roundId: string,
    driverId: string,
    penaltyPoints: number,
    note: string
  ) => {
    setRounds((prev) =>
      prev.map((r) => {
        if (r.id !== roundId) return r;
        return {
          ...r,
          results: r.results.map((res) =>
            res.driverId === driverId
              ? {
                  ...res,
                  stewardPenaltyPoints: penaltyPoints,
                  stewardPenaltyNote: note,
                }
              : res
          ),
        };
      })
    );
  };

  // Handler: Redact Private Vault Record
  const handleDeletePrivateRecord = (driverId: string) => {
    setPrivateVault((prev) => prev.filter((rec) => rec.driverId !== driverId));
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#090B0E] text-[#F4F5F7]">
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentRole={currentRole}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        isRoleModalOpen={isRoleModalOpen}
        onCloseRoleModal={() => setIsRoleModalOpen(false)}
        onSelectRole={setCurrentRole}
      />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'standings' && (
          <StandingsView
            drivers={drivers}
            teams={teams}
            rounds={rounds}
            pointsConfig={pointsConfig}
            onUpdatePointsConfig={setPointsConfig}
            onSelectDriver={handleInspectDriver}
            onNavigateToRound={handleInspectRound}
            onNavigateToRegister={() => setActiveTab('register')}
            onNavigateToControl={() => setActiveTab('control')}
            onOpenShareGraphics={(roundId) => {
              setShareRoundId(roundId);
              setShareModalOpen(true);
            }}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'rounds' && (
          <RoundsView
            rounds={rounds}
            selectedRoundId={selectedRoundId}
            onSelectRoundId={setSelectedRoundId}
            drivers={drivers}
            teams={teams}
            pointsConfig={pointsConfig}
            onSelectDriver={handleInspectDriver}
            onNavigateToRegister={() => setActiveTab('register')}
            onNavigateToControl={(roundId) => {
              setSelectedRoundId(roundId);
              setActiveTab('control');
            }}
            onOpenShareGraphics={(roundId) => {
              setShareRoundId(roundId);
              setShareModalOpen(true);
            }}
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
            onOpenShareGraphics={() => setShareModalOpen(true)}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'register' && (
          <RegistrationPortal
            drivers={drivers}
            teams={teams}
            rounds={rounds}
            onRegisterDriver={handleRegisterDriver}
            onClaimDriverAccount={handleClaimDriverAccount}
            onInspectDriverProfile={handleInspectDriver}
            onInspectRoundEntryList={handleInspectRound}
            onUpdateTeamLineup={handleUpdateTeamLineup}
            onCreateTeam={handleCreateTeam}
            currentRole={currentRole}
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
            currentRole={currentRole}
            onOpenRoleModal={() => setIsRoleModalOpen(true)}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#222731] bg-[#0D1016] py-6 px-6 mt-16">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9CA3AF]">
          <div>
            <strong className="text-[#F4F5F7] font-display tracking-wider uppercase">
              AERC RALLY CONTROL
            </strong>{' '}
            · Pilot Championship Platform for the Esports Commission & Sim Racing Kenya (EA Sports WRC Rally1)
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('standings')}
              className="hover:text-[#F4F5F7] cursor-pointer"
            >
              Standings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className="hover:text-[#F4F5F7] cursor-pointer"
            >
              Privacy & DPA Consent
            </button>
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="hover:text-[#F4F5F7] cursor-pointer"
            >
              Social Graphics
            </button>
          </div>
        </div>
      </footer>

      <ShareGraphicsModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        rounds={rounds}
        drivers={drivers}
        teams={teams}
        pointsConfig={pointsConfig}
        initialRoundId={shareRoundId}
      />
    </div>
  );
}
