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
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Flag,
  Car,
  AlertCircle,
} from 'lucide-react';

interface OnboardingFlowProps {
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

  // Step 1: Identity & EA Racenet Lookup
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [racenetName, setRacenetName] = useState('');
  const [eaAccountId, setEaAccountId] = useState('');
  const [carNumber, setCarNumber] = useState('94');
  const [nationality, setNationality] = useState('Kenya');
  const [countryCode, setCountryCode] = useState('KE');

  // Step 2: Sim Rig, Homologated Rally1 Car & Team Selection
  const [selectedRoundId, setSelectedRoundId] = useState<string>(
    openRounds[0]?.id || 'rnd-3'
  );
  const [carMakeModel, setCarMakeModel] = useState(RALLY1_CARS[0]);
  const [platform, setPlatform] = useState<PlatformType>('PC');
  const [controls, setControls] = useState<ControlType>('Wheel & Pedals');
  const [teamId, setTeamId] = useState<string>('');
  const [teamPointsOptIn, setTeamPointsOptIn] = useState<boolean>(true);

  // Step 3: Private Commission Vault & Kenya Data Protection Act (Minor Check)
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<string>('21');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Non-binary' | 'Prefer not to say'>('Male');
  const [dpaConsent, setDpaConsent] = useState<boolean>(false);
  const [parentalConsent, setParentalConsent] = useState<boolean>(false);

  // Step 4: Persistent Driver ID Issued & Optional Account Claim Simulation
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

  // Live check if Racenet Name or EA Account ID matches an existing driver
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

  // Demo Presets so the user can test Adult vs Minor vs Returning Driver in 1 click
  const fillNewChallengerPreset = () => {
    setStepError(null);
    setFirstName('Tinashe');
    setLastName('Mutasa');
    setRacenetName('HarareApex_ZW');
    setEaAccountId('EA-6044-ZW');
    setCarNumber('94');
    setNationality('Zambia');
    setCountryCode('ZM');
    setCarMakeModel('Ford Puma Rally1 HYBRID');
    setPlatform('PC');
    setControls('Wheel & Pedals');
    setTeamId('team-cmz');
    setTeamPointsOptIn(true);
    setEmail('tinashe.mutasa@zimbabwerally.org');
    setPhone('+263 772 419 880');
    setAge('23');
    setDpaConsent(true);
    setParentalConsent(false);
  };

  const fillJuniorMinorPreset = () => {
    setStepError(null);
    setFirstName('Baraka');
    setLastName('Kiptoo');
    setRacenetName('EldoretJunior_KE');
    setEaAccountId('EA-3109-KE');
    setCarNumber('97');
    setNationality('Kenya');
    setCountryCode('KE');
    setCarMakeModel('Toyota GR Yaris Rally1 HYBRID');
    setPlatform('PlayStation');
    setControls('Controller');
    setTeamId('');
    setTeamPointsOptIn(false);
    setEmail('baraka.kiptoo@juniorrally.co.ke');
    setPhone('+254 712 908 331');
    setAge('16'); // Minor under 18 -> triggers Kenya DPA Guardian Verification
    setDpaConsent(true);
    setParentalConsent(true);
  };

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

  const handleCompleteOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    setStepError(null);

    if (!email.trim() || !email.includes('@') || !phone.trim()) {
      setStepError(
        'Please provide a valid private email address and mobile WhatsApp number.'
      );
      return;
    }

    if (isNaN(parsedAge) || parsedAge < 12 || parsedAge > 90) {
      setStepError('Please enter a valid driver age between 12 and 90.');
      return;
    }

    if (!dpaConsent) {
      setStepError(
        'Please accept the Esports Commission & Kenya Data Protection Act privacy separation terms.'
      );
      return;
    }

    if (isMinor && !parentalConsent) {
      setStepError(
        'Drivers under 18 require verified parent or legal guardian consent before onboarding.'
      );
      return;
    }

    const res = onRegisterDriver(
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
        number: carNumber.trim() || '94',
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
      roundName: roundObj?.name || 'AERC 3 Rally of Zambia',
      matchedExisting: res.matchedExisting,
      isClaimed: false,
    });
    setStep(4);
  };

  const handleInstantClaimPassport = () => {
    if (!createdDriver) return;
    onClaimDriverAccount(createdDriver.driverId, extraAlias.trim() || undefined);
    setCreatedDriver({
      ...createdDriver,
      isClaimed: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Progress Bar & Quick-Fill Demo Presets */}
      <div className="p-5 bg-[#12161D] border border-[#222731] rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#F59E0B]">
            Guided New Driver Onboarding · Persistent Driver ID & Privacy Vault Separation
          </div>
          <h2 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
            New Challenger Onboarding Wizard (4-Step Flow)
          </h2>
        </div>

        {step < 4 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#9CA3AF] mr-1">Demo Quick-Fill:</span>
            <button
              type="button"
              onClick={fillNewChallengerPreset}
              className="px-3 py-1.5 text-xs font-semibold text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#E11D48] transition-colors cursor-pointer"
            >
              Load Adult Rookie (Tinashe Mutasa, 23)
            </button>
            <button
              type="button"
              onClick={fillJuniorMinorPreset}
              className="px-3 py-1.5 text-xs font-semibold text-[#F59E0B] bg-[#181D26] border border-[#F59E0B]/40 rounded hover:bg-[#222731] transition-colors cursor-pointer"
            >
              Load Junior Minor Driver (Baraka Kiptoo, 16)
            </button>
          </div>
        )}
      </div>

      {/* 4-Step Visual Stepper Indicator */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            num: 1,
            title: '01. Identity & Racenet Check',
            desc: 'Match or create persistent Driver ID',
          },
          {
            num: 2,
            title: '02. Rally1 Car, Rig & Team',
            desc: 'Select chassis, controls & team slot',
          },
          {
            num: 3,
            title: '03. Private Vault & Consent',
            desc: 'Isolate PII & minor guardian check',
          },
          {
            num: 4,
            title: '04. Claim Driver Passport',
            desc: 'Simulated email claim & live profile',
          },
        ].map((item) => {
          const isCurrent = step === item.num;
          const isDone = step > item.num;
          return (
            <div
              key={item.num}
              className={`p-3.5 rounded-lg border transition-colors ${
                isCurrent
                  ? 'bg-[#181D26] border-[#E11D48]'
                  : isDone
                  ? 'bg-[#12161D] border-[#10B981]/50'
                  : 'bg-[#0D1016] border-[#222731] opacity-70'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span
                  className={
                    isCurrent
                      ? 'text-[#E11D48]'
                      : isDone
                      ? 'text-[#10B981]'
                      : 'text-[#9CA3AF]'
                  }
                >
                  {item.title}
                </span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
              </div>
              <div className="text-[11px] text-[#9CA3AF] mt-1">{item.desc}</div>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-[#12161D] border border-[#222731] rounded-lg p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
                Step 1: Driver Identity & EA Racenet Telemetry Tag
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                No login is required to onboard. We check your EA Racenet name against existing championship records so your career stats stay linked across rounds.
              </p>
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
                  placeholder="e.g. Tinashe"
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
                  placeholder="e.g. Mutasa"
                  className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                />
              </div>

              <div>
                <label htmlFor="onb-car-num" className="block text-xs text-[#9CA3AF] mb-1">
                  Preferred Car Number
                </label>
                <input
                  id="onb-car-num"
                  type="text"
                  value={carNumber}
                  onChange={(e) => setCarNumber(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="onb-racenet" className="block text-xs text-[#9CA3AF] mb-1">
                  EA Racenet Display Name *
                </label>
                <input
                  id="onb-racenet"
                  type="text"
                  value={racenetName}
                  onChange={(e) => setRacenetName(e.target.value)}
                  placeholder="e.g. HarareApex_ZW"
                  className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                />
              </div>

              <div>
                <label htmlFor="onb-ea-id" className="block text-xs text-[#9CA3AF] mb-1">
                  EA Account ID (Solves "WRC Player" Privacy Mask)
                </label>
                <input
                  id="onb-ea-id"
                  type="text"
                  value={eaAccountId}
                  onChange={(e) => setEaAccountId(e.target.value)}
                  placeholder="e.g. EA-6044-ZW"
                  className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7] focus:outline-none focus:border-[#E11D48]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="onb-nationality" className="block text-xs text-[#9CA3AF] mb-1">
                African Nation / Representation *
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
                className="w-full sm:w-64 px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
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

            <div className="pt-4 border-t border-[#222731] flex items-center justify-end">
              <button
                type="button"
                onClick={handleNextFromStep1}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>Continue to Step 2: Car & Team Selection</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Racenet Lookup Status Card */}
          <div className="lg:col-span-4 bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
              Live Persistent ID Lookup
            </div>
            {matchedExistingDriver ? (
              <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/40 rounded space-y-2">
                <div className="text-xs font-bold text-[#10B981] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Returning Driver Matched!</span>
                </div>
                <p className="text-xs text-[#F4F5F7]">
                  Your Racenet tag matches <strong>{matchedExistingDriver.fullName}</strong> (Persistent ID:{' '}
                  <span className="font-mono text-[#F59E0B]">{matchedExistingDriver.id}</span>).
                </p>
                <p className="text-[11px] text-[#9CA3AF]">
                  This round entry will automatically link to your existing AERC career history.
                </p>
              </div>
            ) : racenetName.trim().length > 1 ? (
              <div className="p-4 bg-[#090B0E] border border-[#222731] rounded space-y-2">
                <div className="text-xs font-semibold text-[#F4F5F7]">
                  New Challenger Detected
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  Racenet tag <span className="font-mono text-[#F59E0B]">{racenetName}</span> is not yet in the AERC registry.
                </p>
                <p className="text-[11px] text-[#10B981]">
                  Will mint new Persistent Driver ID: <span className="font-mono">drv-{drivers.length + 1}</span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Type your EA Racenet Display Name or click one of the <strong>Demo Quick-Fill</strong> buttons above to see how AERC automatically links or mints a persistent Driver ID behind the scenes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: RALLY1 CAR, SIM RIG & CONSTRUCTOR TEAM */}
      {step === 2 && (
        <div className="bg-[#12161D] border border-[#222731] rounded-lg p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="font-display text-2xl font-bold uppercase text-[#F4F5F7]">
              Step 2: Rally1 Hybrid Chassis, Hardware Rig & Team Line-Up
            </h3>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Select the event round, your homologated FIA Rally1 Hybrid car, hardware platform, and optional constructor team (up to 3 drivers per team).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="onb-round" className="block text-xs text-[#9CA3AF] mb-1.5">
                Target Championship Event *
              </label>
              <select
                id="onb-round"
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-semibold text-[#F59E0B]"
              >
                {openRounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.startDate} · Closes {r.entryDeadline})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="onb-car" className="block text-xs text-[#9CA3AF] mb-1.5">
                Homologated EA Sports WRC Rally1 Car *
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="onb-platform" className="block text-xs text-[#9CA3AF] mb-1.5">
                Hardware Platform *
              </label>
              <select
                id="onb-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PlatformType)}
                className="w-full px-3.5 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                <option value="PC">PC (Steam / EA App)</option>
                <option value="PlayStation">PlayStation 5</option>
                <option value="Xbox">Xbox Series X|S</option>
              </select>
            </div>

            <div>
              <label htmlFor="onb-controls" className="block text-xs text-[#9CA3AF] mb-1.5">
                Input Controls (Used for Class Tables) *
              </label>
              <select
                id="onb-controls"
                value={controls}
                onChange={(e) => setControls(e.target.value as ControlType)}
                className="w-full px-3.5 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                <option value="Wheel & Pedals">Wheel & Pedals</option>
                <option value="Controller">Gamepad Controller</option>
                <option value="Keyboard">Keyboard</option>
              </select>
            </div>

            <div>
              <label htmlFor="onb-team" className="block text-xs text-[#9CA3AF] mb-1.5">
                Constructor Team Roster (Max 3 Drivers)
              </label>
              <select
                id="onb-team"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              >
                <option value="">Privateer Entry (Independent Driver)</option>
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
            <div className="p-4 bg-[#090B0E] border border-[#222731] rounded flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-xs text-[#F4F5F7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={teamPointsOptIn}
                  onChange={(e) => setTeamPointsOptIn(e.target.checked)}
                />
                <span>
                  Opt in to score points for my selected team in the <strong>AERC Teams' Championship</strong> (Top 2 finishers per round score).
                </span>
              </label>
              <span className="font-mono text-[11px] text-[#10B981]">Eligible Slot</span>
            </div>
          )}

          <div className="pt-4 border-t border-[#222731] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-medium text-[#9CA3AF] hover:text-white bg-[#090B0E] border border-[#222731] rounded flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Step 1</span>
            </button>

            <button
              type="button"
              onClick={handleNextFromStep2}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Continue to Step 3: Private Vault & DPA Consent</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ENCRYPTED PRIVATE VAULT & MINOR GUARDIAN CONSENT */}
      {step === 3 && (
        <form
          onSubmit={handleCompleteOnboarding}
          className="bg-[#12161D] border border-[#222731] rounded-lg p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#10B981] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Segregated Commission Private Data Vault · Never Exposed in Public Sheets</span>
              </div>
              <h3 className="font-display text-2xl font-bold uppercase text-[#F4F5F7] mt-1">
                Step 3: Private Contact Details & Data Protection Consent
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Unlike legacy Google Sheets where age, phone, and email sat in hidden columns next to public results, these fields are stored strictly in the Admin-Only Private Vault.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="onb-email" className="block text-xs text-[#9CA3AF] mb-1">
                Private Email (Used for Profile Claim Link) *
              </label>
              <input
                id="onb-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@example.com"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>

            <div>
              <label htmlFor="onb-phone" className="block text-xs text-[#9CA3AF] mb-1">
                WhatsApp / Mobile Number *
              </label>
              <input
                id="onb-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 712 000 000"
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs text-[#F4F5F7]"
              />
            </div>

            <div>
              <label htmlFor="onb-age" className="block text-xs text-[#9CA3AF] mb-1">
                Driver Age (Years) *
              </label>
              <input
                id="onb-age"
                type="number"
                min={12}
                max={90}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#090B0E] border border-[#222731] rounded text-xs font-mono text-[#F4F5F7]"
              />
            </div>
          </div>

          {isMinor && (
            <div className="p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/40 rounded-lg space-y-2">
              <div className="text-xs font-bold text-[#F59E0B]">
                Junior Driver Protection Active (Age {parsedAge} — Under 18)
              </div>
              <label className="flex items-start gap-2.5 text-xs text-[#F4F5F7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={parentalConsent}
                  onChange={(e) => setParentalConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I confirm that a parent or legal guardian has verified and consented to this minor driver registration in accordance with Section 33 of the Kenya Data Protection Act.
                </span>
              </label>
            </div>
          )}

          <div className="p-4 bg-[#090B0E] border border-[#222731] rounded-lg">
            <label className="flex items-start gap-2.5 text-xs text-[#9CA3AF] cursor-pointer">
              <input
                type="checkbox"
                checked={dpaConsent}
                onChange={(e) => setDpaConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I consent to publishing my competition name, EA Racenet tag, nationality, team, car, and stage times on public AERC pages while storing my email, phone number, and age exclusively in the restricted Commission Vault.
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-[#222731] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-medium text-[#9CA3AF] hover:text-white bg-[#090B0E] border border-[#222731] rounded flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Step 2</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-semibold text-white bg-[#10B981] rounded hover:bg-[#059669] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Onboarding & Mint Persistent Driver ID</span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: PERSISTENT DRIVER PASSPORT ISSUED & EMAIL CLAIM PROMPT */}
      {step === 4 && createdDriver && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Card: Issued Driver Passport & Navigation Actions */}
          <div className="lg:col-span-7 bg-[#12161D] border border-[#10B981]/50 rounded-lg p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-mono text-[#10B981] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ONBOARDING COMPLETE · PUBLIC & PRIVATE DATA SEGREGATED</span>
                </div>
                <h3 className="font-display text-3xl font-extrabold uppercase text-[#F4F5F7]">
                  Welcome to AERC, {createdDriver.fullName}!
                </h3>
              </div>
              <div className="px-3 py-1.5 bg-[#090B0E] border border-[#222731] rounded font-mono text-xs text-[#F59E0B]">
                ID: {createdDriver.driverId}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[#9CA3AF]">EA Racenet Name</div>
                <div className="font-mono font-semibold text-[#F4F5F7] mt-1">
                  {createdDriver.racenetName}
                </div>
              </div>
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[#9CA3AF]">EA Account Match Key</div>
                <div className="font-mono text-[#10B981] mt-1">
                  {createdDriver.eaAccountId || 'Standard Match'}
                </div>
              </div>
              <div className="p-3 bg-[#090B0E] border border-[#222731] rounded">
                <div className="text-[#9CA3AF]">Passport Status</div>
                <div
                  className={`font-semibold mt-1 ${
                    createdDriver.isClaimed ? 'text-[#10B981]' : 'text-[#F59E0B]'
                  }`}
                >
                  {createdDriver.isClaimed ? 'Claimed & Verified' : 'Unclaimed (Email Sent)'}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#222731] flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onInspectDriverProfile(createdDriver.driverId)}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#E11D48] rounded hover:bg-[#BE123C] transition-colors cursor-pointer"
              >
                Open Live Driver Career Profile ({createdDriver.fullName})
              </button>

              <button
                type="button"
                onClick={() => onInspectRoundEntryList(createdDriver.roundId)}
                className="px-4 py-2.5 text-xs font-medium text-[#F4F5F7] bg-[#181D26] border border-[#222731] rounded hover:border-[#374151] transition-colors cursor-pointer"
              >
                View Public Entry List ({createdDriver.roundName})
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreatedDriver(null);
                  setStep(1);
                }}
                className="px-3 py-2 text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                Onboard Another Driver
              </button>
            </div>
          </div>

          {/* Right Card: Simulated Email Invitation to Claim Optional Account */}
          <div className="lg:col-span-5 bg-[#12161D] border border-[#222731] rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
              <Mail className="w-4 h-4" />
              <span>Simulated Post-Registration Email Prompt (Section 5.1)</span>
            </div>

            <div className="p-4 bg-[#090B0E] border border-[#222731] rounded space-y-3 text-xs">
              <div className="border-b border-[#222731] pb-2 space-y-0.5 text-[11px] font-mono text-[#9CA3AF]">
                <div>To: {createdDriver.email}</div>
                <div>Subject: Claim Your AERC Driver Profile ({createdDriver.driverId})</div>
              </div>
              <p className="text-[#F4F5F7] leading-relaxed">
                Your entry for <strong>{createdDriver.roundName}</strong> is confirmed! Even though no account was required to register, we created persistent Driver ID{' '}
                <span className="font-mono text-[#F59E0B]">{createdDriver.driverId}</span> for your career history.
              </p>

              {!createdDriver.isClaimed ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label
                      htmlFor="claim-alias-box"
                      className="block text-[11px] text-[#9CA3AF] mb-1"
                    >
                      Optional: Link a past EA Racenet alias before claiming
                    </label>
                    <input
                      id="claim-alias-box"
                      type="text"
                      value={extraAlias}
                      onChange={(e) => setExtraAlias(e.target.value)}
                      placeholder="e.g. OldRacenetName_2025"
                      className="w-full px-3 py-1.5 bg-[#12161D] border border-[#222731] rounded font-mono text-xs text-[#F4F5F7]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleInstantClaimPassport}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-black bg-[#F59E0B] rounded hover:bg-[#D97706] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Click Email Link: Claim Optional Driver Account Now</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-[#10B981]/15 border border-[#10B981]/40 rounded text-[#10B981] font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Profile Claimed! {createdDriver.fullName} now has a verified AERC Passport.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
