import React from 'react';
import { UserRole } from '../types/aerc';
import { ShieldCheck, UserCheck, Users, Eye, LogIn, X } from 'lucide-react';

export type ActiveTab =
  | 'standings'
  | 'rounds'
  | 'drivers'
  | 'register'
  | 'control';

interface TopNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentRole: UserRole;
  onOpenRoleModal: () => void;
  isRoleModalOpen: boolean;
  onCloseRoleModal: () => void;
  onSelectRole: (role: UserRole) => void;
}

const ROLE_LABELS: Record<UserRole, { title: string; subtitle: string; actor: string }> = {
  public: {
    title: 'Public Spectator',
    subtitle: 'View standings, entry lists, driver journeys & register without login',
    actor: 'Guest Viewer',
  },
  driver: {
    title: 'Claimed Driver Account',
    subtitle: 'Manage claimed driver profile, car history, Racenet aliases & privacy',
    actor: 'Karan Patel (#14)',
  },
  manager: {
    title: 'Team Principal Portal',
    subtitle: 'Manage Rift Valley Simworks line-up (max 3 drivers) & team opt-in',
    actor: 'Nikhil Sachania (RVS)',
  },
  admin: {
    title: 'AERC Steward & Organiser',
    subtitle: 'Import EA Racenet CSVs, resolve WRC Player masks, apply penalties & view Private Vault',
    actor: 'Commission Steward',
  },
};

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onSelectTab,
  currentRole,
  onOpenRoleModal,
  isRoleModalOpen,
  onCloseRoleModal,
  onSelectRole,
}) => {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'standings', label: 'Standings' },
    { id: 'rounds', label: 'Rally Rounds' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'register', label: 'Onboarding & Entry' },
    { id: 'control', label: 'Race Control' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6 py-3.5 sm:py-4 bg-[#090B0E]/95 backdrop-blur-md border-b border-[#222731]">
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

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#9CA3AF]"
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

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenRoleModal}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="sm:hidden">Role: {currentRole.toUpperCase()}</span>
            <span className="hidden sm:inline">
              Switch Role ({ROLE_LABELS[currentRole].actor})
            </span>
          </button>
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

      {/* Demo Role / Account Switcher Modal */}
      {isRoleModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-xl bg-[#12161D] border border-[#222731] rounded-lg p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#222731]">
              <div>
                <h2
                  id="role-modal-title"
                  className="font-display text-2xl font-bold uppercase tracking-wide text-[#F4F5F7]"
                >
                  Select Prototype Session Role
                </h2>
                <p className="text-sm text-[#9CA3AF] mt-1">
                  Test the platform across all four user journeys defined in the Esports Commission brief.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close role switcher"
                onClick={onCloseRoleModal}
                className="p-2 text-[#9CA3AF] hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              {(
                [
                  {
                    role: 'admin' as UserRole,
                    icon: ShieldCheck,
                  },
                  {
                    role: 'manager' as UserRole,
                    icon: Users,
                  },
                  {
                    role: 'driver' as UserRole,
                    icon: UserCheck,
                  },
                  {
                    role: 'public' as UserRole,
                    icon: Eye,
                  },
                ] as const
              ).map(({ role, icon: Icon }) => {
                const info = ROLE_LABELS[role];
                const selected = currentRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      onSelectRole(role);
                      onCloseRoleModal();
                    }}
                    className={`flex flex-col items-start text-left p-4 rounded border transition-all cursor-pointer ${
                      selected
                        ? 'bg-[#181D26] border-[#E11D48] text-[#F4F5F7]'
                        : 'bg-[#090B0E] border-[#222731] text-[#9CA3AF] hover:border-[#374151] hover:text-[#F4F5F7]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="font-semibold text-sm text-[#F4F5F7]">
                        {info.title}
                      </span>
                      <Icon
                        className={`w-4 h-4 ${
                          selected ? 'text-[#E11D48]' : 'text-[#9CA3AF]'
                        }`}
                      />
                    </div>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed mb-3">
                      {info.subtitle}
                    </p>
                    <div className="mt-auto pt-2 border-t border-[#222731]/70 w-full flex items-center justify-between text-xs font-mono text-[#F59E0B]">
                      <span>{info.actor}</span>
                      <span>{selected ? 'Active Session' : 'Sign In →'}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-[#222731] flex items-center justify-between text-xs text-[#9CA3AF]">
              <span>
                Note: Drivers can register for rallies and view standings without logging in.
              </span>
              <button
                type="button"
                onClick={onCloseRoleModal}
                className="px-4 py-2 text-xs font-medium text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:bg-[#222731] transition-colors cursor-pointer"
              >
                Keep Current Role
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
