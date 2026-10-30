import React, { useState } from 'react';
import {
  ControlType,
  DriverPrivateVault,
  DriverPublic,
  PlatformType,
  RallyRound,
  Team,
} from '../types/aerc';
import { canAssignDriverToTeam } from '../utils/championshipEngine';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Lock,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

interface OnboardingFlowProps {
  drivers: DriverPublic[];
  teams: Team[];
  rounds: RallyRound[];
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
}

const RALLY1_CARS = [
  'Toyota GR Yaris Rally1 HYBRID',
  'Hyundai i20 N Rally1 HYBRID',
  'Ford Puma Rally1 HYBRID',
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  drivers,
  teams,
  rounds,
  onRegisterDriver,
  onClaimDriverAccount,
  onInspectDriverProfile,
  onInspectRoundEntryList,
}) => {
  const openRounds = rounds.filter(
    (r) => r.status === 'Registration Open' || r.status === 'Upcoming'
  );
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Identity & EA Racenet Lookup
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [racenetName, setRacenetName] = useState('');
  const [eaAccountId, setEaAccountId] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [nationality, setNationality] = useState('Kenya');
  const [countryCode, setCountryCode] = useState('KE');

  // Step 2: Sim Rig, Homologated Rally1 Car & Team Selection
  const [selectedRoundId, setSelectedRoundId] = useState<string>(
    openRounds[0]?.id || ''
  );
  const [carMakeModel, setCarMakeModel] = useState(RALLY1_CARS[0]);
  const [platform, setPlatform] = useState<PlatformType>('PC');
  const [controls, setControls] = useState<ControlType>('Wheel & Pedals');
  const [teamId, setTeamId] = useState<string>('');
  const [teamPointsOptIn, setTeamPointsOptIn] = useState<boolean>(true);

  // Step 3: Private Contact Details & Consent
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<string>('');
  const [gender] = useState<
    'Male' | 'Female' | 'Non-binary' | 'Prefer not to say'
  >('Male');
  const [dpaConsent, setDpaConsent] = useState<boolean>(false);
  const [parentalConsent, setParentalConsent] = useState<boolean>(false);

  // Step 4: Confirmation & Optional Account Claim
  const [createdDriver, setCreatedDriver] = useState<{
    driverId: string;
    fullName: string;
    racenetName: string;
    eaAccountId?: string;
    email: string;
    roundId: string;
    roundName: string;
    matchedExisting: boolean;
    isClaimed: boolean;
  } | null>(null);
  const [extraAlias, setExtraAlias] = useState('');

  const [stepError, setStepError] = useState<string | null>(null);

  const parsedAge = parseInt(age, 10);
  const isMinor = !isNaN(parsedAge) && parsedAge < 18;

  const matchedExistingDriver = drivers.find(
    (d) =>
      (racenetName.trim().length > 1 &&
        (d.racenetName.toLowerCase() === racenetName.trim().toLowerCase() ||
          d.racenetAliases.some(
            (a) => a.toLowerCase() === racenetName.trim().toLowerCase()
          ))) ||
      (eaAccountId.trim().length > 2 &&
        d.eaAccountId &&
        d.eaAccountId.toLowerCase() === eaAccountId.trim().toLowerCase())
  );

  const handleNextFromStep1 = () => {
    setStepError(null);
    if (!firstName.trim() || !lastName.trim() || !racenetName.trim()) {
      setStepError(
        'Please enter your First Name, Last Name, and EA Racenet Display Name to continue.'
      );
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    setStepError(null);
    if (teamId) {
      const targetTeam = teams.find((t) => t.id === teamId);
      if (targetTeam && !matchedExistingDriver) {
        const check = canAssignDriverToTeam(targetTeam, 'new-driver', 3);
        if (!check.allowed) {
          setStepError(
            check.reason ||
              'Selected team has reached the maximum of 3 registered drivers.'
          );
          return;
        }
      }
    }
    setStep(3);
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepError(null);

    if (!email.trim() || !email.includes('@') || !phone.trim()) {
      setStepError(
        'Please provide a valid email address and mobile WhatsApp number.'
      );
      return;
    }

    if (isNaN(parsedAge) || parsedAge < 12 || parsedAge > 90) {
      setStepError('Please enter a valid driver age between 12 and 90.');
      return;
    }

    if (!dpaConsent) {
      setStepError('Please accept the privacy terms to complete registration.');
      return;
    }

    if (isMinor && !parentalConsent) {
      setStepError(
        'Drivers under 18 require verified parent or legal guardian consent.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await onRegisterDriver(
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
          countryOfResidence: nationality,
          platform,
          controls,
          number: carNumber.trim() || `${drivers.length + 1}`,
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
      setCreatedDriver({
        driverId: res.driverId,
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        racenetName: racenetName.trim(),
        eaAccountId: eaAccountId.trim() || undefined,
        email: email.trim(),
        roundId: selectedRoundId,
        roundName: roundObj?.name || 'General Championship Registry',
        matchedExisting: res.matchedExisting,
        isClaimed: false,
      });
      setStep(4);
    } catch (err) {
      setStepError(
        err instanceof Error ? err.message : 'Failed to save driver registration.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstantClaimPassport = async () => {
    if (!createdDriver) return;
    await onClaimDriverAccount(
      createdDriver.driverId,
      extraAlias.trim() || undefined
    );
    setCreatedDriver({
      ...createdDriver,
      isClaimed: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Compact 3-Step Progress Bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { num: 1, title: '1. Driver & Racenet ID' },
          { num: 2, title: '2. Car, Rig & Team' },
          { num: 3, title: '3. Private Contact & Confirm' },
        ].map((item) => {
          const isCurrent = step === item.num;
          const isDone = step > item.num;
          return (
            <div
              key={item.num}
              className={`px-4 py-3 rounded-lg border flex items-center justify-between text-xs font-semibold transition-colors ${
                isCurrent
                  ? 'bg-[#181D26] border-[#E11D48] text-[#F4F5F7]'
                  : isDone
                  ? 'bg-[#12161D] border-[#10B981]/50 text-[#10B981]'
                  : 'bg-[#0D1016] border-[#222731] text-[#9CA3AF]'
              }`}
            >
              <span>{item.title}</span>
              {isDone && <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
            </div>
          );
        })}
      </div>

      {stepError && (
        <div
          role="alert"
          className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-lg text-xs text-[#EF4444] flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{stepError}</span>
        </div>
      )}

      {/* STEP 1: IDENTITY & EA RACENET LOOKUP */}
      {step === 1 && (
        <div className="bg-[#12161D] border border-[#222731] rounded-lg p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#222731]">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                Step 1: Driver Identity & EA Racenet Name
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Enter your competition name and EA Racenet tag to link or create your persistent Driver ID.
              </p>
            </div>
            {matchedExistingDriver && (
              <div className="text-xs font-mono text-[#10B981]">
                Matched Existing ID: {matchedExistingDriver.id}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="onb-first-name" className="block text-xs text-[#9CA3AF] mb-1">
                First Name *
              </label>
              <input
                id="onb-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
              />
            </div>

            <div>
              <label htmlFor="onb-last-name" className="block text-xs text-[#9CA3AF] mb-1">
                Last Name *
              </label>
              <input
                id="onb-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
              />
            </div>

            <div>
              <label htmlFor="onb-car-num" className="block text-xs text-[#9CA3AF] mb-1">
                Car Number
              </label>
              <input
                id="onb-car-num"
                type="text"
                value={carNumber}
                onChange={(e) => setCarNumber(e.target.value)}
                placeholder="01"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="onb-racenet" className="block text-xs text-[#9CA3AF] mb-1">
                EA Racenet Display Name *
              </label>
              <input
                id="onb-racenet"
                type="text"
                value={racenetName}
                onChange={(e) => setRacenetName(e.target.value)}
                placeholder="EA Racenet name"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
              />
            </div>

            <div>
              <label htmlFor="onb-ea-id" className="block text-xs text-[#9CA3AF] mb-1">
                EA Account ID (Optional)
              </label>
              <input
                id="onb-ea-id"
                type="text"
                value={eaAccountId}
                onChange={(e) => setEaAccountId(e.target.value)}
                placeholder="Optional EA Account ID"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
              />
            </div>

            <div>
              <label htmlFor="onb-nationality" className="block text-xs text-[#9CA3AF] mb-1">
                Nationality *
              </label>
              <select
                id="onb-nationality"
                value={nationality}
                onChange={(e) => {
                  const val = e.target.value;
                  setNationality(val);
                  const codeMap: Record<string, string> = {
                    Kenya: 'KE',
                    Zambia: 'ZM',
                    'South Africa': 'ZA',
                    Uganda: 'UG',
                    Rwanda: 'RW',
                    Tanzania: 'TZ',
                    Zimbabwe: 'ZW',
                  };
                  setCountryCode(codeMap[val] || 'AF');
                }}
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                <option value="Kenya">Kenya (KE)</option>
                <option value="Zambia">Zambia (ZM)</option>
                <option value="South Africa">South Africa (ZA)</option>
                <option value="Uganda">Uganda (UG)</option>
                <option value="Rwanda">Rwanda (RW)</option>
                <option value="Tanzania">Tanzania (TZ)</option>
                <option value="Zimbabwe">Zimbabwe (ZW)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#222731] flex items-center justify-end">
            <button
              type="button"
              onClick={handleNextFromStep1}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Next: Car, Rig & Team</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: RALLY1 CAR, SIM RIG & CONSTRUCTOR TEAM */}
      {step === 2 && (
        <div className="bg-[#12161D] border border-[#222731] rounded-lg p-6 sm:p-8 space-y-6">
          <div className="pb-4 border-b border-[#222731]">
            <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
              Step 2: Rally1 Car, Hardware Rig & Team
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Choose your round entry, Rally1 Hybrid car, hardware platform, and optional team (max 3 drivers per team).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="onb-round" className="block text-xs text-[#9CA3AF] mb-1.5">
                Target Rally Round
              </label>
              <select
                id="onb-round"
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-semibold text-[#F59E0B]"
              >
                <option value="">General Championship Registry (All Rounds)</option>
                {openRounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.startDate} · Closes {r.entryDeadline})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="onb-car" className="block text-xs text-[#9CA3AF] mb-1.5">
                Rally1 Hybrid Car *
              </label>
              <select
                id="onb-car"
                value={carMakeModel}
                onChange={(e) => setCarMakeModel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-semibold text-[#F4F5F7]"
              >
                {RALLY1_CARS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label htmlFor="onb-platform" className="block text-xs text-[#9CA3AF] mb-1.5">
                Platform *
              </label>
              <select
                id="onb-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PlatformType)}
                className="w-full px-3.5 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                <option value="PC">PC</option>
                <option value="PlayStation">PlayStation</option>
                <option value="Xbox">Xbox</option>
              </select>
            </div>

            <div>
              <label htmlFor="onb-controls" className="block text-xs text-[#9CA3AF] mb-1.5">
                Controls *
              </label>
              <select
                id="onb-controls"
                value={controls}
                onChange={(e) => setControls(e.target.value as ControlType)}
                className="w-full px-3.5 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                <option value="Wheel & Pedals">Wheel & Pedals</option>
                <option value="Controller">Controller</option>
                <option value="Keyboard">Keyboard</option>
              </select>
            </div>

            <div>
              <label htmlFor="onb-team" className="block text-xs text-[#9CA3AF] mb-1.5">
                Team (Max 3 Drivers)
              </label>
              <select
                id="onb-team"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                <option value="">Privateer (Independent)</option>
                {teams.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={t.driverIds.length >= 3}
                  >
                    {t.name} ({t.driverIds.length}/3 drivers)
                    {t.driverIds.length >= 3 ? ' — FULL' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {teamId && (
            <label className="flex items-center gap-2.5 text-xs text-[#F4F5F7] cursor-pointer">
              <input
                type="checkbox"
                checked={teamPointsOptIn}
                onChange={(e) => setTeamPointsOptIn(e.target.checked)}
              />
              <span>Opt in to score points for my selected team in the Teams' Championship.</span>
            </label>
          )}

          <div className="pt-4 border-t border-[#222731] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-medium text-[#9CA3AF] hover:text-white bg-[#090B0E] border border-[#222731] rounded flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleNextFromStep2}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Next: Contact & Confirm</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PRIVATE VAULT & CONSENT */}
      {step === 3 && (
        <form
          onSubmit={handleCompleteOnboarding}
          className="bg-[#12161D] border border-[#222731] rounded-lg p-6 sm:p-8 space-y-6"
        >
          <div className="pb-4 border-b border-[#222731]">
            <div className="text-xs font-semibold text-[#10B981] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Stored in Isolated Private Vault (Never Public)</span>
            </div>
            <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7] mt-1">
              Step 3: Private Contact Details & Confirmation
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="onb-email" className="block text-xs text-[#9CA3AF] mb-1">
                Private Email *
              </label>
              <input
                id="onb-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>

            <div>
              <label htmlFor="onb-phone" className="block text-xs text-[#9CA3AF] mb-1">
                WhatsApp / Mobile *
              </label>
              <input
                id="onb-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile number"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>

            <div>
              <label htmlFor="onb-age" className="block text-xs text-[#9CA3AF] mb-1">
                Age *
              </label>
              <input
                id="onb-age"
                type="number"
                min={12}
                max={90}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="18"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7]"
              />
            </div>
          </div>

          {isMinor && (
            <div className="p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/40 rounded-lg space-y-2">
              <div className="text-xs font-bold text-[#F59E0B]">
                Under-18 Guardian Consent Required
              </div>
              <label className="flex items-start gap-2.5 text-xs text-[#F4F5F7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={parentalConsent}
                  onChange={(e) => setParentalConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I confirm that a parent or legal guardian has verified and consented to this minor driver registration.
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
              I consent to publishing my competition name, Racenet tag, team, car, and stage times publicly while keeping my email, phone, and age strictly in the Organizer Private Vault.
            </span>
          </label>

          <div className="pt-4 border-t border-[#222731] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-medium text-[#9CA3AF] hover:text-white bg-[#090B0E] border border-[#222731] rounded flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-[#10B981] rounded hover:bg-[#059669] disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting ? 'Saving to Database...' : 'Complete Driver Registration'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: CONFIRMATION & OPTIONAL ACCOUNT CLAIM */}
      {step === 4 && createdDriver && (
        <div className="bg-[#12161D] border border-[#10B981]/50 rounded-lg p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222731]">
            <div>
              <div className="text-xs font-mono text-[#10B981] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>REGISTRATION SAVED TO DATABASE</span>
              </div>
              <h2 className="font-display text-3xl font-extrabold uppercase text-[#F4F5F7] mt-1">
                {createdDriver.fullName} ({createdDriver.racenetName})
              </h2>
            </div>
            <div className="px-3.5 py-2 bg-[#090B0E] border border-[#222731] rounded font-mono text-xs text-[#F59E0B]">
              Driver ID: {createdDriver.driverId}
            </div>
          </div>

          {!createdDriver.isClaimed ? (
            <div className="p-4 bg-[#090B0E] border border-[#222731] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#F4F5F7]">
                  Claim Your Driver Profile (Optional)
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  Link a past EA Racenet alias or verify your profile ownership now.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={extraAlias}
                  onChange={(e) => setExtraAlias(e.target.value)}
                  placeholder="Optional past Racenet alias"
                  className="px-3 py-2 bg-[#12161D] border border-[#222731] rounded font-mono text-xs text-[#F4F5F7]"
                />
                <button
                  type="button"
                  onClick={handleInstantClaimPassport}
                  className="px-4 py-2 text-xs font-semibold text-black bg-[#F59E0B] rounded hover:bg-[#D97706] flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Claim Profile</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-[#10B981]/15 border border-[#10B981]/40 rounded text-xs text-[#10B981] font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Driver profile claimed and verified!</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onInspectDriverProfile(createdDriver.driverId)}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] transition-colors cursor-pointer"
            >
              Open Driver Profile
            </button>

            {createdDriver.roundId && (
              <button
                type="button"
                onClick={() => onInspectRoundEntryList(createdDriver.roundId)}
                className="px-4 py-2.5 text-xs font-medium text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#374151] transition-colors cursor-pointer"
              >
                View Round Entry List ({createdDriver.roundName})
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setCreatedDriver(null);
                setFirstName('');
                setLastName('');
                setRacenetName('');
                setEaAccountId('');
                setCarNumber('');
                setEmail('');
                setPhone('');
                setAge('');
                setStep(1);
              }}
              className="px-3 py-2 text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
            >
              Register Another Driver
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
