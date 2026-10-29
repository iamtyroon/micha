import React, { useState } from 'react';
import {
  ControlType,
  DriverPrivateVault,
  DriverPublic,
  PlatformType,
  RallyRound,
  Team,
  UserRole,
} from '../types/aerc';
import { canAssignDriverToTeam } from '../utils/championshipEngine';
import { OnboardingFlow } from './OnboardingFlow';
import { Shield, Users, CheckCircle2, AlertCircle, Lock } from 'lucide-react';

interface RegistrationPortalProps {
  drivers: DriverPublic[];
  teams: Team[];
  rounds: RallyRound[];
  onRegisterDriver: (
    publicData: Omit<DriverPublic, 'id' | 'claimedAccount' | 'avatarColor' | 'carHistory'>,
    privateData: Omit<DriverPrivateVault, 'driverId' | 'consentTimestamp'>,
    roundId: string,
    existingDriverId?: string
  ) => { driverId: string; matchedExisting: boolean };
  onClaimDriverAccount: (driverId: string, newAlias?: string) => void;
  onInspectDriverProfile: (driverId: string) => void;
  onInspectRoundEntryList: (roundId: string) => void;
  onUpdateTeamLineup: (teamId: string, driverIds: string[]) => void;
  onCreateTeam: (team: Omit<Team, 'id'>) => void;
  currentRole: UserRole;
}

const RALLY1_CARS = [
  'Toyota GR Yaris Rally1 HYBRID',
  'Hyundai i20 N Rally1 HYBRID',
  'Ford Puma Rally1 HYBRID',
];

export const RegistrationPortal: React.FC<RegistrationPortalProps> = ({
  drivers,
  teams,
  rounds,
  onRegisterDriver,
  onClaimDriverAccount,
  onInspectDriverProfile,
  onInspectRoundEntryList,
  onUpdateTeamLineup,
  onCreateTeam,
}) => {
  const [portalMode, setPortalMode] = useState<'onboarding' | 'driverEntry' | 'teamManager'>('onboarding');

  const openRounds = rounds.filter(
    (r) => r.status === 'Registration Open' || r.status === 'Upcoming'
  );
  const [selectedRoundId, setSelectedRoundId] = useState<string>(
    openRounds[0]?.id || rounds[2]?.id || 'rnd-3'
  );

  // Form fields matching Section 3 & 5.1 of the Brief
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<string>('23');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Non-binary' | 'Prefer not to say'>('Male');
  const [racenetName, setRacenetName] = useState('');
  const [eaAccountId, setEaAccountId] = useState('');
  const [carNumber, setCarNumber] = useState('91');
  const [carMakeModel, setCarMakeModel] = useState(RALLY1_CARS[0]);
  const [teamId, setTeamId] = useState<string>('');
  const [teamPointsOptIn, setTeamPointsOptIn] = useState<boolean>(true);
  const [nationality, setNationality] = useState('Kenya');
  const [countryCode, setCountryCode] = useState('KE');
  const [countryOfResidence, setCountryOfResidence] = useState('Kenya');
  const [platform, setPlatform] = useState<PlatformType>('PC');
  const [controls, setControls] = useState<ControlType>('Wheel & Pedals');
  const [dpaConsent, setDpaConsent] = useState<boolean>(false);
  const [parentalConsent, setParentalConsent] = useState<boolean>(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [submissionReceipt, setSubmissionReceipt] = useState<{
    driverId: string;
    fullName: string;
    racenetName: string;
    matchedExisting: boolean;
    roundName: string;
  } | null>(null);

  // Team Manager state
  const [selectedManagedTeamId, setSelectedManagedTeamId] = useState<string>(teams[0]?.id || 'team-rvs');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [teamStatusMsg, setTeamStatusMsg] = useState<string | null>(null);

  const parsedAge = parseInt(age, 10);
  const isMinor = !isNaN(parsedAge) && parsedAge < 18;

  // Live check if Racenet Name matches an existing persistent Driver ID
  const matchedExistingDriver = drivers.find(
    (d) =>
      racenetName.trim().length > 1 &&
      (d.racenetName.toLowerCase() === racenetName.trim().toLowerCase() ||
        d.racenetAliases.some((a) => a.toLowerCase() === racenetName.trim().toLowerCase()))
  );

  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!firstName.trim() || !lastName.trim() || !racenetName.trim() || !email.trim() || !phone.trim()) {
      setFormError('Please complete all required driver identity, EA Racenet, and contact fields.');
      return;
    }

    if (!email.includes('@')) {
      setFormError('Please provide a valid email address for your persistent Driver ID link.');
      return;
    }

    if (isNaN(parsedAge) || parsedAge < 12 || parsedAge > 90) {
      setFormError('Please enter a valid driver age between 12 and 90.');
      return;
    }

    if (!dpaConsent) {
      setFormError('You must accept the Esports Commission & Kenya Data Protection Act privacy notice.');
      return;
    }

    if (isMinor && !parentalConsent) {
      setFormError('Drivers under 18 require verified parent/guardian consent before entry submission.');
      return;
    }

    if (teamId) {
      const targetTeam = teams.find((t) => t.id === teamId);
      if (targetTeam && !matchedExistingDriver) {
        const check = canAssignDriverToTeam(targetTeam, 'new-driver', 3);
        if (!check.allowed) {
          setFormError(check.reason || 'Selected team is already at the 3-driver maximum.');
          return;
        }
      }
    }

    const result = onRegisterDriver(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        racenetName: racenetName.trim(),
        eaAccountId: eaAccountId.trim() || undefined,
        racenetAliases: [],
        teamId: teamId || null,
        teamPointsOptIn: Boolean(teamId && teamPointsOptIn),
        carMakeModel,
        nationality,
        countryCode,
        countryOfResidence,
        platform,
        controls,
        number: carNumber.trim() || '99',
      },
      {
        email: email.trim(),
        phone: phone.trim(),
        age: parsedAge,
        gender,
        isMinor,
        parentalConsentVerified: isMinor ? parentalConsent : false,
        dataProtectionActAccepted: dpaConsent,
      },
      selectedRoundId,
      matchedExistingDriver?.id
    );

    const roundObj = rounds.find((r) => r.id === selectedRoundId);
    setSubmissionReceipt({
      driverId: result.driverId,
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      racenetName: racenetName.trim(),
      matchedExisting: result.matchedExisting,
      roundName: roundObj?.name || 'AERC 3 Rally of Zambia',
    });

    setFirstName('');
    setLastName('');
    setRacenetName('');
    setEmail('');
    setPhone('');
  };

  const managedTeam = teams.find((t) => t.id === selectedManagedTeamId) || teams[0];

  const handleToggleDriverInTeam = (driverId: string) => {
    setTeamStatusMsg(null);
    const exists = managedTeam.driverIds.includes(driverId);
    if (exists) {
      const updated = managedTeam.driverIds.filter((id) => id !== driverId);
      onUpdateTeamLineup(managedTeam.id, updated);
      setTeamStatusMsg(`Removed driver from ${managedTeam.name} line-up.`);
    } else {
      if (managedTeam.driverIds.length >= 3) {
        setTeamStatusMsg(
          `Regulatory Limit Reached: ${managedTeam.name} already has the maximum of 3 drivers.`
        );
        return;
      }
      const updated = [...managedTeam.driverIds, driverId];
      onUpdateTeamLineup(managedTeam.id, updated);
      setTeamStatusMsg(`Added driver to ${managedTeam.name} active roster.`);
    }
  };

  const handleCreateNewTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamCode.trim() || !newManagerName.trim()) return;
    onCreateTeam({
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
    setNewManagerName('');
    setNewManagerEmail('');
    setTeamStatusMsg('New constructor team registered for the AERC Teams Championship.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#222731]">
        <div>
          <div className="text-xs text-[#9CA3AF]">
            Replaces Manual Google Forms & Hidden Spreadsheet Columns
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#F4F5F7] mt-1">
            New Driver Onboarding, Entry & Team Portal
          </h1>
        </div>

        <div className="inline-flex flex-wrap p-1 bg-[#12161D] border border-[#222731] rounded-md gap-1">
          <button
            type="button"
            onClick={() => setPortalMode('onboarding')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              portalMode === 'onboarding'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            1. Guided Driver Onboarding
          </button>
          <button
            type="button"
            onClick={() => setPortalMode('driverEntry')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              portalMode === 'driverEntry'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            2. Single-Page Entry Form
          </button>
          <button
            type="button"
            onClick={() => setPortalMode('teamManager')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              portalMode === 'teamManager'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
            }`}
          >
            3. Team Manager Line-Up (Max 3)
          </button>
        </div>
      </div>

      {portalMode === 'onboarding' ? (
        <OnboardingFlow
          drivers={drivers}
          teams={teams}
          rounds={rounds}
          onRegisterDriver={onRegisterDriver}
          onClaimDriverAccount={onClaimDriverAccount}
          onInspectDriverProfile={onInspectDriverProfile}
          onInspectRoundEntryList={onInspectRoundEntryList}
        />
      ) : portalMode === 'driverEntry' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Registration Form */}
          <form
            onSubmit={handleEntrySubmit}
            className="lg:col-span-8 bg-[#12161D] border border-[#222731] rounded-lg p-6 sm:p-8 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222731]">
              <div>
                <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                  Official AERC Rally1 Entry Form
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Public and private fields are automatically split at submission.
                </p>
              </div>
              <div>
                <label htmlFor="round-select" className="sr-only">
                  Select Rally Round
                </label>
                <select
                  id="round-select"
                  value={selectedRoundId}
                  onChange={(e) => setSelectedRoundId(e.target.value)}
                  className="bg-[#090B0E] border border-[#222731] rounded px-3 py-2 text-xs font-semibold text-[#F59E0B]"
                >
                  {openRounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Closes {r.entryDeadline})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded text-xs text-[#EF4444] flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {submissionReceipt && (
              <div className="p-5 bg-[#10B981]/10 border border-[#10B981]/40 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#10B981]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Entry Confirmed for {submissionReceipt.roundName}</span>
                </div>
                <p className="text-xs text-[#F4F5F7]">
                  Driver: <strong>{submissionReceipt.fullName}</strong> ({submissionReceipt.racenetName}) · Persistent Driver ID:{' '}
                  <span className="font-mono text-[#F59E0B]">{submissionReceipt.driverId}</span>
                </p>
                <p className="text-xs text-[#9CA3AF]">
                  {submissionReceipt.matchedExisting
                    ? 'Matched automatically to your existing AERC career profile. Your public entry list row is live.'
                    : 'Created a new persistent Driver ID. An optional profile-claim link has been queued to your email.'}
                </p>
              </div>
            )}

            {/* Section 1: Public Championship Identity */}
            <div className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                01. Public Entry List & EA Racenet Telemetry Fields
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="reg-first-name" className="block text-xs text-[#9CA3AF] mb-1">
                    First Name *
                  </label>
                  <input
                    id="reg-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Chantz"
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                  />
                </div>
                <div>
                  <label htmlFor="reg-last-name" className="block text-xs text-[#9CA3AF] mb-1">
                    Last Name *
                  </label>
                  <input
                    id="reg-last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Cholwe"
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                  />
                </div>
                <div>
                  <label htmlFor="reg-car-num" className="block text-xs text-[#9CA3AF] mb-1">
                    Competition Number
                  </label>
                  <input
                    id="reg-car-num"
                    type="text"
                    value={carNumber}
                    onChange={(e) => setCarNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-racenet" className="block text-xs text-[#9CA3AF] mb-1">
                    EA Racenet Display Name *
                  </label>
                  <input
                    id="reg-racenet"
                    type="text"
                    value={racenetName}
                    onChange={(e) => setRacenetName(e.target.value)}
                    placeholder="e.g. LusakaGravel_ZM"
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                  />
                  {matchedExistingDriver && (
                    <div className="mt-1 text-[11px] text-[#10B981]">
                      Matched existing profile: {matchedExistingDriver.fullName} ({matchedExistingDriver.id})
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-ea-id" className="block text-xs text-[#9CA3AF] mb-1">
                    EA Account ID (Prevents "WRC Player" Privacy Mask)
                  </label>
                  <input
                    id="reg-ea-id"
                    type="text"
                    value={eaAccountId}
                    onChange={(e) => setEaAccountId(e.target.value)}
                    placeholder="e.g. EA-5520-ZM"
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="reg-car-model" className="block text-xs text-[#9CA3AF] mb-1">
                    Rally1 Car Make & Model *
                  </label>
                  <select
                    id="reg-car-model"
                    value={carMakeModel}
                    onChange={(e) => setCarMakeModel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                  >
                    {RALLY1_CARS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-platform" className="block text-xs text-[#9CA3AF] mb-1">
                    Platform *
                  </label>
                  <select
                    id="reg-platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as PlatformType)}
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                  >
                    <option value="PC">PC</option>
                    <option value="PlayStation">PlayStation</option>
                    <option value="Xbox">Xbox</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-controls" className="block text-xs text-[#9CA3AF] mb-1">
                    Controls *
                  </label>
                  <select
                    id="reg-controls"
                    value={controls}
                    onChange={(e) => setControls(e.target.value as ControlType)}
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                  >
                    <option value="Wheel & Pedals">Wheel & Pedals</option>
                    <option value="Controller">Controller</option>
                    <option value="Keyboard">Keyboard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="reg-nationality" className="block text-xs text-[#9CA3AF] mb-1">
                    Nationality *
                  </label>
                  <select
                    id="reg-nationality"
                    value={nationality}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNationality(val);
                      setCountryOfResidence(val);
                      const codeMap: Record<string, string> = {
                        Kenya: 'KE',
                        Zambia: 'ZM',
                        'South Africa': 'ZA',
                        Uganda: 'UG',
                        Rwanda: 'RW',
                        Tanzania: 'TZ',
                      };
                      setCountryCode(codeMap[val] || 'AF');
                    }}
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                  >
                    <option value="Kenya">Kenya</option>
                    <option value="Zambia">Zambia</option>
                    <option value="South Africa">South Africa</option>
                    <option value="Uganda">Uganda</option>
                    <option value="Rwanda">Rwanda</option>
                    <option value="Tanzania">Tanzania</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-team" className="block text-xs text-[#9CA3AF] mb-1">
                    Team Entry (Max 3 Drivers/Team)
                  </label>
                  <select
                    id="reg-team"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
                  >
                    <option value="">Privateer Entry (No Team)</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.driverIds.length}/3 slots)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-xs text-[#F4F5F7] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teamPointsOptIn}
                      onChange={(e) => setTeamPointsOptIn(e.target.checked)}
                      className="rounded border-[#222731]"
                    />
                    <span>Opt-in to Teams' Championship Points</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 2: Segregated Private Data Vault */}
            <div className="pt-5 border-t border-[#222731] space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#10B981] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>02. Encrypted Commission Vault (Never Publicly Exposed)</span>
                </div>
                <span className="text-[11px] text-[#9CA3AF]">
                  Replaces Hidden Google Sheet Columns
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="reg-email" className="block text-xs text-[#9CA3AF] mb-1">
                    Email Address (Private) *
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="driver@example.com"
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-phone" className="block text-xs text-[#9CA3AF] mb-1 whitespace-nowrap">
                    WhatsApp / Mobile (Private) *
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+260 977 000 111"
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-age" className="block text-xs text-[#9CA3AF] mb-1">
                    Age (Private) *
                  </label>
                  <input
                    id="reg-age"
                    type="number"
                    min={12}
                    max={90}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                  />
                </div>
              </div>

              {/* Minor / Parental Consent Trigger */}
              {isMinor && (
                <div className="p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/40 rounded space-y-2">
                  <div className="text-xs font-semibold text-[#F59E0B]">
                    Minor Driver Protection Triggered (Age under 18)
                  </div>
                  <label className="flex items-start gap-2.5 text-xs text-[#F4F5F7] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={parentalConsent}
                      onChange={(e) => setParentalConsent(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      I confirm that a parent or legal guardian has authorized this championship entry and personal data storage in compliance with Section 33 of the Kenya Data Protection Act.
                    </span>
                  </label>
                </div>
              )}

              <label className="flex items-start gap-2.5 text-xs text-[#9CA3AF] cursor-pointer">
                <input
                  type="checkbox"
                  checked={dpaConsent}
                  onChange={(e) => setDpaConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I consent to the Esports Commission & Sim Racing Kenya storing my competition results publicly while isolating my email, phone number, and age in the restricted Commission Vault. I understand I may request data edits or deletion at any time.
                </span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] transition-colors cursor-pointer"
              >
                Submit Official Round Entry
              </button>
            </div>
          </form>

          {/* Right Column: Architecture & Privacy Explainer */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 bg-[#12161D] border border-[#222731] rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F5F7]">
                <Shield className="w-4 h-4 text-[#10B981]" />
                <span>Why Built-In Registration Matters</span>
              </div>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Previously, organisers exported Google Forms to Sheets and hid the Age, Phone, and Email columns before sharing. Anyone duplicating the workbook or exporting a range risked leaking private minor data.
              </p>
              <div className="p-3.5 bg-[#090B0E] border border-[#222731] rounded space-y-2 text-xs">
                <div className="font-semibold text-[#F4F5F7]">Public Entry Table Schema:</div>
                <div className="font-mono text-[11px] text-[#10B981]">
                  DriverID · FullName · RacenetName · Team · Rally1Car · Nationality · Platform · Controls
                </div>
                <div className="font-semibold text-[#F4F5F7] pt-2 border-t border-[#222731]">
                  Isolated Vault Schema (Admin Role Only):
                </div>
                <div className="font-mono text-[11px] text-[#F59E0B]">
                  DriverID · Email · MobilePhone · Age · Gender · MinorGuardianConsent
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TEAM MANAGER LINE-UP PORTAL */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-[#12161D] border border-[#222731] rounded-lg p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222731]">
              <div>
                <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#E11D48]" />
                  <span>Team Principal Line-Up Management</span>
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  AERC regulations permit up to 3 registered drivers per team. Top 2 finishers per round score towards the Teams' Championship.
                </p>
              </div>

              <select
                aria-label="Select Team to Manage"
                value={selectedManagedTeamId}
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
            </div>

            {teamStatusMsg && (
              <div className="p-3.5 bg-[#181D26] border border-[#F59E0B]/50 rounded text-xs text-[#F59E0B]">
                {teamStatusMsg}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                <span>
                  Principal: <strong className="text-[#F4F5F7]">{managedTeam.managerName}</strong> ({managedTeam.managerEmail})
                </span>
                <span className="font-mono text-[#10B981]">
                  Active Roster: {managedTeam.driverIds.length} / 3 Maximum
                </span>
              </div>

              <div className="divide-y divide-[#222731] border border-[#222731] rounded bg-[#090B0E]">
                {drivers.map((drv) => {
                  const isInManagedTeam = managedTeam.driverIds.includes(drv.id);
                  const otherTeam =
                    drv.teamId && drv.teamId !== managedTeam.id
                      ? teams.find((t) => t.id === drv.teamId)
                      : undefined;

                  return (
                    <div
                      key={drv.id}
                      className="p-3.5 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[#F4F5F7]">
                          #{drv.number} {drv.fullName}{' '}
                          <span className="font-mono text-xs text-[#9CA3AF]">
                            ({drv.racenetName})
                          </span>
                        </div>
                        <div className="text-xs text-[#9CA3AF]">
                          {drv.carMakeModel} · {drv.nationality}
                          {otherTeam ? ` · Currently with ${otherTeam.name}` : ''}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleDriverInTeam(drv.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                          isInManagedTeam
                            ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40 hover:bg-[#EF4444]/25'
                            : 'bg-[#181D26] text-[#F4F5F7] border border-[#222731] hover:border-[#10B981]'
                        }`}
                      >
                        {isInManagedTeam ? 'Remove from Roster' : 'Assign to Team'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Create New Constructor Team */}
          <form
            onSubmit={handleCreateNewTeam}
            className="lg:col-span-4 bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4"
          >
            <h3 className="font-display text-xl font-bold uppercase text-[#F4F5F7]">
              Register New AERC Team
            </h3>
            <p className="text-xs text-[#9CA3AF]">
              Create a new team entry and receive a secure principal link to manage up to 3 drivers.
            </p>
            <div>
              <label htmlFor="new-team-name" className="block text-xs text-[#9CA3AF] mb-1">
                Team Name *
              </label>
              <input
                id="new-team-name"
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Kilimanjaro Apex Motorsport"
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>
            <div>
              <label htmlFor="new-team-code" className="block text-xs text-[#9CA3AF] mb-1">
                3-Letter Telemetry Code *
              </label>
              <input
                id="new-team-code"
                type="text"
                maxLength={3}
                value={newTeamCode}
                onChange={(e) => setNewTeamCode(e.target.value)}
                placeholder="KAM"
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono uppercase text-[#F4F5F7]"
              />
            </div>
            <div>
              <label htmlFor="new-mgr-name" className="block text-xs text-[#9CA3AF] mb-1">
                Team Manager Name *
              </label>
              <input
                id="new-mgr-name"
                type="text"
                value={newManagerName}
                onChange={(e) => setNewManagerName(e.target.value)}
                placeholder="e.g. Anwar Pandya"
                className="w-full px-3 py-2 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>
            <div>
              <label htmlFor="new-mgr-email" className="block text-xs text-[#9CA3AF] mb-1">
                Manager Email (For Secure Line-Up Link)
              </label>
              <input
                id="new-mgr-email"
                type="email"
                value={newManagerEmail}
                onChange={(e) => setNewManagerEmail(e.target.value)}
                placeholder="manager@team.co.ke"
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
    </div>
  );
};
