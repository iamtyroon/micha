import React, { useMemo, useState } from 'react';
import { AccountRole, UserProfile } from '../types/aerc';
import {
  ShieldCheck,
  UserCheck,
  Users,
  LogIn,
  LogOut,
  Settings,
  X,
} from 'lucide-react';

export type ActiveTab =
  | 'standings'
  | 'rounds'
  | 'drivers'
  | 'register'
  | 'control'
  | 'settings';

interface TopNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userProfile: UserProfile | null;
  authLoading: boolean;
  authError: string | null;
  isAuthModalOpen: boolean;
  onOpenAuthModal: () => void;
  onCloseAuthModal: () => void;
  onSignInWithGoogle: (role: AccountRole) => Promise<void>;
  onSwitchAccountRole: (role: AccountRole) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const ACCOUNT_ROLE_META: Record<
  AccountRole,
  { title: string; subtitle: string; badge: string }
> = {
  organizer: {
    title: 'Organizer Account',
    subtitle:
      'Create rally rounds, enter stage classifications, apply steward penalties & manage the Private Data Vault.',
    badge: 'Organizer',
  },
  manager: {
    title: 'Team Manager Account',
    subtitle:
      'Browse registered drivers, send team invitations, accept driver join requests & manage your 3-driver line-up.',
    badge: 'Team Manager',
  },
  driver: {
    title: 'Driver Account',
    subtitle:
      'Match your EARC / EA Racenet username via API, request to join teams, accept manager invites & track your career.',
    badge: 'Driver',
  },
};

export const TopNav: React.FC<TopNavProps> = React.memo(({
  activeTab,
  onSelectTab,
  userProfile,
  authLoading,
  authError,
  isAuthModalOpen,
  onOpenAuthModal,
  onCloseAuthModal,
  onSignInWithGoogle,
  onSwitchAccountRole,
  onSignOut,
}) => {
  const [selectedRoleForAuth, setSelectedRoleForAuth] = useState<AccountRole>(
    userProfile?.role || 'driver'
  );

  const navItems: { id: ActiveTab; label: string }[] = useMemo(
    () => [
      { id: 'standings', label: 'Tournaments & Standings' },
      { id: 'rounds', label: 'Stage Maps & Rounds' },
      { id: 'drivers', label: 'Driver Stats' },
      ...(userProfile
        ? [
            {
              id: 'register' as ActiveTab,
              label:
                userProfile.role === 'manager'
                  ? 'Team Management'
                  : userProfile.role === 'driver'
                  ? 'Driver Entry & Teams'
                  : 'Teams & Entries',
            },
            ...(userProfile.role === 'organizer'
              ? [{ id: 'control' as ActiveTab, label: 'Race Control' }]
              : []),
            { id: 'settings' as ActiveTab, label: 'Settings' },
          ]
        : []),
    ],
    [userProfile]
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5 sm:py-4 bg-[#090B0E]/95 backdrop-blur-md border-b border-[#222731]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('standings');
          }}
          className="font-display text-xl sm:text-2xl font-extrabold tracking-wider uppercase text-[#F4F5F7] whitespace-nowrap shrink-0 hover:text-[#E11D48] transition-colors"
        >
          AERC RALLY CONTROL
        </a>

        {/* Zone 2: Navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#9CA3AF]"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#F4F5F7] font-semibold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#E11D48]'
                    : 'hover:text-[#F4F5F7]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action (Google Sign-In or Active Account Button) */}
        <div className="flex items-center gap-3 shrink-0">
          {userProfile ? (
            <button
              type="button"
              onClick={() => {
                setSelectedRoleForAuth(userProfile.role);
                onOpenAuthModal();
              }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#E11D48] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{userProfile.displayName}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#F59E0B] font-mono">
                {ACCOUNT_ROLE_META[userProfile.role].badge}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile secondary navigation bar */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden items-center justify-between gap-2 px-4 py-2.5 bg-[#12161D] border-b border-[#222731] overflow-x-auto"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
              activeTab === item.id
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Account Sign-In / Role Selection Modal (Organizer, Team Manager, Driver) */}
      {isAuthModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-xl bg-[#12161D] border border-[#222731] rounded-lg p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#222731]">
              <div>
                <h2
                  id="auth-modal-title"
                  className="font-display text-2xl font-bold uppercase tracking-wide text-[#F4F5F7]"
                >
                  {userProfile
                    ? 'Manage AERC Account & Role'
                    : 'Sign In or Create an AERC Account'}
                </h2>
                <p className="text-sm text-[#9CA3AF] mt-1">
                  {userProfile
                    ? `Signed in with Google as ${userProfile.email}. Switch your active account role or open Account Settings.`
                    : 'Select your account role below and sign in with Google. Spectators can browse without an account.'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close account modal"
                onClick={onCloseAuthModal}
                className="p-2 text-[#9CA3AF] hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authError && (
              <div className="mt-4 p-3 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded text-xs text-[#EF4444]">
                {authError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 mt-5">
              {(
                [
                  {
                    role: 'organizer' as AccountRole,
                    icon: ShieldCheck,
                  },
                  {
                    role: 'manager' as AccountRole,
                    icon: Users,
                  },
                  {
                    role: 'driver' as AccountRole,
                    icon: UserCheck,
                  },
                ] as const
              ).map(({ role, icon: Icon }) => {
                const info = ACCOUNT_ROLE_META[role];
                const isSelected = userProfile
                  ? userProfile.role === role
                  : selectedRoleForAuth === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRoleForAuth(role);
                      if (userProfile) {
                        onSwitchAccountRole(role);
                      }
                    }}
                    className={`flex items-start justify-between text-left p-4 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#181D26] border-[#E11D48] text-[#F4F5F7]'
                        : 'bg-[#090B0E] border-[#222731] text-[#9CA3AF] hover:border-[#374151] hover:text-[#F4F5F7]'
                    }`}
                  >
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#F4F5F7]">
                          {info.title}
                        </span>
                        {userProfile && userProfile.role === role && (
                          <span className="font-mono text-[11px] text-[#10B981]">
                            · Active Account Role
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9CA3AF] leading-relaxed">
                        {info.subtitle}
                      </p>
                    </div>
                    <Icon
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        isSelected ? 'text-[#E11D48]' : 'text-[#9CA3AF]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-[#222731] flex flex-col sm:flex-row items-center justify-between gap-3">
              {userProfile ? (
                <>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded hover:bg-[#EF4444]/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onCloseAuthModal();
                        onSelectTab('settings');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#E11D48] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Account Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={onCloseAuthModal}
                      className="px-5 py-2 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onCloseAuthModal}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-[#9CA3AF] hover:text-[#F4F5F7] bg-[#090B0E] border border-[#222731] rounded transition-colors cursor-pointer"
                  >
                    Continue as Spectator
                  </button>
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => onSignInWithGoogle(selectedRoleForAuth)}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {authLoading
                        ? 'Signing in with Google...'
                        : `Sign In with Google as ${ACCOUNT_ROLE_META[selectedRoleForAuth].badge}`}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

