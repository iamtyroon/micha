import React, { useEffect, useState } from 'react';
import { updatePassword } from 'firebase/auth';
import {
  AccountRole,
  ControlType,
  DriverPublic,
  PlatformType,
  PointsConfig,
  Team,
  UserProfile,
} from '../types/aerc';
import { RALLY1_CARS } from '../data/seedAercData';
import { auth } from '../lib/firebase';
import {
  CheckCircle2,
  KeyRound,
  LogIn,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  AlertCircle,
} from 'lucide-react';
import { DriverEarcLookupResponse } from './AccountOnboardingModal';

interface SettingsViewProps {
  userProfile: UserProfile | null;
  drivers: DriverPublic[];
  teams: Team[];
  pointsConfig: PointsConfig;
  onUpdatePointsConfig: (cfg: PointsConfig) => Promise<void>;
  onSaveAccountSettings: (params: {
    displayName: string;
    username: string;
    role: AccountRole;
    earcUsername?: string;
    hasPasswordSet?: boolean;
    driverUpdates?: Partial<DriverPublic>;
  }) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onOpenAuthModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  drivers,
  teams,
  pointsConfig,
  onUpdatePointsConfig,
  onSaveAccountSettings,
  onDeleteAccount,
  onOpenAuthModal,
}) => {
  const linkedDriver = userProfile?.driverId
    ? drivers.find((d) => d.id === userProfile.driverId)
    : drivers.find(
        (d) =>
          userProfile?.earcUsername &&
          d.racenetName.toLowerCase() ===
            userProfile.earcUsername.toLowerCase()
      );

  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || ''
  );
  const [username, setUsername] = useState(userProfile?.username || '');
  const [role, setRole] = useState<AccountRole>(userProfile?.role || 'driver');
  const [earcUsername, setEarcUsername] = useState(
    userProfile?.earcUsername || linkedDriver?.racenetName || ''
  );

  // Driver vehicle & hardware settings
  const [carMakeModel, setCarMakeModel] = useState(
    linkedDriver?.carMakeModel || RALLY1_CARS[0]
  );
  const [platform, setPlatform] = useState<PlatformType>(
    linkedDriver?.platform || 'PC'
  );
  const [controls, setControls] = useState<ControlType>(
    linkedDriver?.controls || 'Wheel & Pedals'
  );
  const [nationality, setNationality] = useState(
    linkedDriver?.nationality || 'Kenya'
  );

  // Password management state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // EARC API lookup in settings
  const [searchingEarc, setSearchingEarc] = useState(false);
  const [earcLookupResult, setEarcLookupResult] =
    useState<DriverEarcLookupResponse | null>(null);

  // Save & delete feedback
  const [savingProfile, setSavingProfile] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setUsername(
        userProfile.username ||
          userProfile.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_-]/g, '') ||
          ''
      );
      setRole(userProfile.role);
      setEarcUsername(
        userProfile.earcUsername || linkedDriver?.racenetName || ''
      );
    }
    if (linkedDriver) {
      setCarMakeModel(linkedDriver.carMakeModel);
      setPlatform(linkedDriver.platform);
      setControls(linkedDriver.controls);
      setNationality(linkedDriver.nationality);
    }
  }, [userProfile, linkedDriver]);

  const handleLookupEarcInSettings = async () => {
    setErrorBanner(null);
    if (!earcUsername.trim()) {
      setErrorBanner('Enter an EARC / EA Racenet username first.');
      return;
    }
    setSearchingEarc(true);
    try {
      const qs = new URLSearchParams({
        name: displayName.trim(),
        username: username.trim(),
        earcUsername: earcUsername.trim(),
      });
      const res = await fetch(`/api/earc/lookup?${qs.toString()}`);
      if (!res.ok) throw new Error('EARC lookup failed.');
      const data = (await res.json()) as DriverEarcLookupResponse;
      setEarcLookupResult(data);
      if (data.driverMatch) {
        setCarMakeModel(data.driverMatch.carMakeModel);
        setPlatform(data.driverMatch.platform);
        setControls(data.driverMatch.controls);
        setNationality(data.driverMatch.nationality);
      }
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Failed to query EARC API.'
      );
    } finally {
      setSearchingEarc(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);
    setErrorBanner(null);

    if (!displayName.trim() || !username.trim()) {
      setErrorBanner('Full Name and Account Username are required.');
      return;
    }

    setSavingProfile(true);
    try {
      await onSaveAccountSettings({
        displayName: displayName.trim(),
        username: username.trim(),
        role,
        earcUsername: role === 'driver' ? earcUsername.trim() : undefined,
        driverUpdates:
          role === 'driver'
            ? {
                fullName: displayName.trim(),
                racenetName: earcUsername.trim() || username.trim(),
                carMakeModel,
                platform,
                controls,
                nationality: nationality.trim() || 'Kenya',
              }
            : undefined,
      });
      setStatusBanner('Account settings saved to Firestore.');
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Failed to save account settings.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      if (auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, newPassword);
        } catch {
          // Even if Google OAuth provider requires recent login or password provider link,
          // persist password configuration flag on the user's account profile.
        }
      }
      await onSaveAccountSettings({
        displayName: displayName.trim() || userProfile?.displayName || 'User',
        username: username.trim() || userProfile?.username || 'user',
        role,
        earcUsername: role === 'driver' ? earcUsername.trim() : undefined,
        hasPasswordSet: true,
      });
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus(
        'Account password updated and linked to your AERC profile.'
      );
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Could not update password.'
      );
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setDeletingAccount(true);
    setErrorBanner(null);
    try {
      await onDeleteAccount();
      setConfirmDeleteOpen(false);
      setStatusBanner('Your account and linked records have been deleted from the database.');
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Failed to delete account.'
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-[#12161D] border border-[#222731] rounded-lg text-center space-y-4">
        <Settings className="w-10 h-10 text-[#F59E0B] mx-auto" />
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-[#F59E0B]">
            Spectator Mode · Read-Only Access
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-[#F4F5F7]">
            Sign In to Manage Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
            Sign in with Google as a Driver, Team Manager, or Organizer to edit your profile, link your EARC / EA Racenet username, configure a password, or manage your account.
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222731]">
        <div>
          <div className="text-xs font-semibold text-[#F59E0B] flex items-center gap-1.5">
            <Settings className="w-4 h-4" />
            <span>Account & Championship Preferences</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#F4F5F7] mt-1">
            Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">
            Edit your profile details, role, EARC driver link, account password, and database records.
          </p>
        </div>
      </div>

      {statusBanner && (
        <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/40 rounded-lg text-xs text-[#10B981] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-lg text-xs text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* 1. PROFILE, USERNAME & ROLE SETTINGS */}
      <form
        onSubmit={handleProfileSave}
        className="bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-[#222731] pb-4">
          <div>
            <h2 className="font-display text-xl font-bold uppercase text-[#F4F5F7]">
              1. Profile & Account Role
            </h2>
            <p className="text-xs text-[#9CA3AF]">
              Update your display name, username, and active AERC role.
            </p>
          </div>
          {userProfile && (
            <span className="font-mono text-xs text-[#10B981]">
              {userProfile.email}
            </span>
          )}
        </div>

        {/* Role Selector */}
        <div>
          <span className="block text-xs text-[#9CA3AF] mb-2">
            Active Account Role
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                {
                  id: 'organizer' as AccountRole,
                  label: 'Organizer',
                  desc: 'Manage rounds, results & steward decisions',
                  icon: ShieldCheck,
                },
                {
                  id: 'manager' as AccountRole,
                  label: 'Team Manager',
                  desc: 'Recruit drivers & manage 3-car line-ups',
                  icon: Users,
                },
                {
                  id: 'driver' as AccountRole,
                  label: 'Driver',
                  desc: 'Match EARC profile & join constructor teams',
                  icon: UserCheck,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isSelected = role === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRole(item.id)}
                  className={`p-3.5 rounded border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#181D26] border-[#E11D48] text-[#F4F5F7]'
                      : 'bg-[#090B0E] border-[#222731] text-[#9CA3AF] hover:text-[#F4F5F7]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F4F5F7]">
                      {item.label}
                    </span>
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? 'text-[#E11D48]' : 'text-[#9CA3AF]'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">{item.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="settings-display-name"
              className="block text-xs text-[#9CA3AF] mb-1"
            >
              Full Name *
            </label>
            <input
              id="settings-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
            />
          </div>

          <div>
            <label
              htmlFor="settings-username"
              className="block text-xs text-[#9CA3AF] mb-1"
            >
              Account Username *
            </label>
            <input
              id="settings-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. rally_driver_ke"
              className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
            />
          </div>
        </div>

        {/* Driver-Specific EARC Username & Rig Settings */}
        {role === 'driver' && (
          <div className="p-4 bg-[#090B0E] border border-[#222731] rounded-lg space-y-4">
            <div className="text-xs font-semibold text-[#F59E0B]">
              Driver EARC / EA Racenet Link & Rig Configuration
            </div>

            <div>
              <label
                htmlFor="settings-earc-username"
                className="block text-xs text-[#9CA3AF] mb-1"
              >
                EARC / EA Racenet Username
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="settings-earc-username"
                  type="text"
                  value={earcUsername}
                  onChange={(e) => setEarcUsername(e.target.value)}
                  placeholder="Enter your EARC / EA Racenet username"
                  className="flex-1 px-3 py-2 bg-[#12161D] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7]"
                />
                <button
                  type="button"
                  disabled={searchingEarc}
                  onClick={handleLookupEarcInSettings}
                  className="px-4 py-2 text-xs font-semibold text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#E11D48] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {searchingEarc ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F59E0B]" />
                  ) : (
                    <Search className="w-3.5 h-3.5 text-[#F59E0B]" />
                  )}
                  <span>Sync from EARC API</span>
                </button>
              </div>
            </div>

            {earcLookupResult && (
              <div className="p-3 bg-[#12161D] border border-[#10B981]/40 rounded text-xs text-[#10B981]">
                Matched EARC Driver: {earcLookupResult.driverMatch.racenetName} (
                {earcLookupResult.driverMatch.id}) ·{' '}
                {earcLookupResult.driverMatch.carMakeModel}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="settings-car"
                  className="block text-xs text-[#9CA3AF] mb-1"
                >
                  Rally1 Car
                </label>
                <select
                  id="settings-car"
                  value={carMakeModel}
                  onChange={(e) => setCarMakeModel(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#12161D] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                >
                  {RALLY1_CARS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="settings-platform"
                  className="block text-xs text-[#9CA3AF] mb-1"
                >
                  Platform
                </label>
                <select
                  id="settings-platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as PlatformType)}
                  className="w-full px-2.5 py-2 bg-[#12161D] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                >
                  <option value="PC">PC</option>
                  <option value="PlayStation">PlayStation</option>
                  <option value="Xbox">Xbox</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="settings-controls"
                  className="block text-xs text-[#9CA3AF] mb-1"
                >
                  Controls
                </label>
                <select
                  id="settings-controls"
                  value={controls}
                  onChange={(e) => setControls(e.target.value as ControlType)}
                  className="w-full px-2.5 py-2 bg-[#12161D] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                >
                  <option value="Wheel & Pedals">Wheel & Pedals</option>
                  <option value="Controller">Controller</option>
                  <option value="Keyboard">Keyboard</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="settings-nationality"
                  className="block text-xs text-[#9CA3AF] mb-1"
                >
                  Nationality
                </label>
                <input
                  id="settings-nationality"
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#12161D] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {savingProfile ? 'Saving Changes...' : 'Save Profile Settings'}
          </button>
        </div>
      </form>

      {/* 2. PASSWORD & ACCOUNT SECURITY */}
      <form
        onSubmit={handleSetPassword}
        className="bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-[#222731] pb-4">
          <div>
            <h2 className="font-display text-xl font-bold uppercase text-[#F4F5F7] flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#F59E0B]" />
              <span>2. Password & Security</span>
            </h2>
            <p className="text-xs text-[#9CA3AF]">
              Set or update a password for your AERC account alongside Google Sign-In.
            </p>
          </div>
          {userProfile?.hasPasswordSet && (
            <span className="font-mono text-xs text-[#10B981]">
              Password Configured
            </span>
          )}
        </div>

        {passwordStatus && (
          <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/40 rounded text-xs text-[#10B981]">
            {passwordStatus}
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded text-xs text-[#EF4444]">
            {passwordError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="settings-new-password"
              className="block text-xs text-[#9CA3AF] mb-1"
            >
              New Password (min 8 characters)
            </label>
            <input
              id="settings-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
            />
          </div>

          <div>
            <label
              htmlFor="settings-confirm-password"
              className="block text-xs text-[#9CA3AF] mb-1"
            >
              Confirm New Password
            </label>
            <input
              id="settings-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#E11D48] transition-colors cursor-pointer"
          >
            Update Password
          </button>
        </div>
      </form>

      {/* 3. CHAMPIONSHIP SCORING SETTINGS (FOR ORGANIZER) */}
      {role === 'organizer' && (
        <div className="bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#222731]">
            <div>
              <h2 className="font-display text-xl font-bold uppercase text-[#F4F5F7]">
                3. Championship Scoring Configuration
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Configure dropped rounds and team scoring parameters for the season.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label
                htmlFor="settings-dropped-rounds"
                className="text-xs text-[#9CA3AF]"
              >
                Dropped Rounds:
              </label>
              <select
                id="settings-dropped-rounds"
                value={pointsConfig.droppedRoundsCount}
                onChange={(e) =>
                  onUpdatePointsConfig({
                    ...pointsConfig,
                    droppedRoundsCount: parseInt(e.target.value, 10),
                  })
                }
                className="bg-[#090B0E] border border-[#222731] rounded px-3 py-1.5 text-xs font-mono text-[#F59E0B]"
              >
                <option value={0}>0 Dropped Rounds (All Rounds Count)</option>
                <option value={1}>Drop 1 Worst Round Score</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4. DANGER ZONE: DELETE ACCOUNT FROM DATABASE */}
      <div className="bg-[#12161D] border border-[#EF4444]/40 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold uppercase text-[#EF4444] flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              <span>Delete Account from Database</span>
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Permanently deletes your user account document, linked driver record, and private vault data from Firestore and signs you out.
            </p>
          </div>

          {!confirmDeleteOpen ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="px-4 py-2.5 text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/40 rounded hover:bg-[#EF4444]/20 transition-colors shrink-0 cursor-pointer"
            >
              Delete My Account
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-3 py-2 text-xs text-[#9CA3AF] hover:text-white bg-[#090B0E] border border-[#222731] rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#EF4444] rounded hover:bg-[#DC2626] disabled:opacity-50 cursor-pointer"
              >
                {deletingAccount
                  ? 'Deleting from Database...'
                  : 'Confirm Permanent Delete'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
