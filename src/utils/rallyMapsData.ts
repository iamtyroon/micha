import { RallyRound } from '../types/aerc';

export interface StageSectorSpec {
  sectorNumber: number;
  name: string;
  distanceKm: number;
  surfaceDetail: string;
  avgSpeedKmh: number;
  elevationChangeM: number;
  isPowerStage?: boolean;
}

export interface RallyCircuitMapSpec {
  id: string;
  country: string;
  countryCode: string;
  rallyTitle: string;
  regionName: string;
  coordinatesLabel: string;
  primarySurface: 'Gravel' | 'Safari Gravel' | 'Asphalt' | 'Mixed';
  peakElevationM: number;
  baseElevationM: number;
  totalDistanceKm: number;
  stagesCount: number;
  servicePark: string;
  svgPathData: string;
  sectorCheckpoints: { x: number; y: number; label: string; code: string }[];
  elevationPoints: number[];
  stages: StageSectorSpec[];
}

export const OFFICIAL_AERC_CIRCUIT_MAPS: RallyCircuitMapSpec[] = [
  {
    id: 'circuit-ke',
    country: 'Kenya',
    countryCode: 'KE',
    rallyTitle: 'Safari Rally Kenya — Naivasha',
    regionName: 'Great Rift Valley · Lake Naivasha & Hell’s Gate',
    coordinatesLabel: '0°43′00″S 36°26′00″E',
    primarySurface: 'Safari Gravel',
    peakElevationM: 2140,
    baseElevationM: 1884,
    totalDistanceKm: 164.8,
    stagesCount: 12,
    servicePark: 'KWS Training Institute, Naivasha',
    svgPathData:
      'M 70 210 C 125 140, 180 120, 235 155 C 290 190, 330 85, 410 95 C 480 105, 515 195, 585 170 C 645 150, 690 75, 735 90',
    sectorCheckpoints: [
      { x: 70, y: 210, label: 'Start · Kasarani / Kedong', code: 'SS1' },
      { x: 235, y: 155, label: 'Sector 1 · Elementaita Basin', code: 'S1' },
      { x: 410, y: 95, label: 'Sector 2 · Soysambu Escarpment', code: 'S2' },
      { x: 585, y: 170, label: 'Sector 3 · Sleeping Warrior', code: 'S3' },
      { x: 735, y: 90, label: 'Finish · Hell’s Gate Power Stage', code: 'PS' },
    ],
    elevationPoints: [1890, 1940, 2020, 2140, 2085, 1960, 2045, 2110, 1995],
    stages: [
      {
        sectorNumber: 1,
        name: 'SS1 · Loldia Full',
        distanceKm: 19.17,
        surfaceDetail: 'Technical volcanic rock & compacted savanna tracks',
        avgSpeedKmh: 108,
        elevationChangeM: 145,
      },
      {
        sectorNumber: 2,
        name: 'SS2 · Geothermal Sprint',
        distanceKm: 13.12,
        surfaceDetail: 'High-altitude red silt & rapid crest sequences',
        avgSpeedKmh: 118,
        elevationChangeM: 210,
      },
      {
        sectorNumber: 3,
        name: 'SS3 · Kedong Ranch Marathon',
        distanceKm: 31.5,
        surfaceDetail: 'Deep fesh-fesh sand traps & fast sixth-gear plains',
        avgSpeedKmh: 124,
        elevationChangeM: 165,
      },
      {
        sectorNumber: 4,
        name: 'SS4 · Soysambu Conservancy',
        distanceKm: 29.32,
        surfaceDetail: 'Rough rocky ruts, water splashes & acute hairpins',
        avgSpeedKmh: 104,
        elevationChangeM: 190,
      },
      {
        sectorNumber: 5,
        name: 'SS5 · Sleeping Warrior',
        distanceKm: 31.04,
        surfaceDetail: 'Abrasive lava stones & blind compression dips',
        avgSpeedKmh: 109,
        elevationChangeM: 256,
      },
      {
        sectorNumber: 6,
        name: 'SS6 · Hell’s Gate Wolf Power Stage',
        distanceKm: 10.53,
        surfaceDetail: 'Spectator gorge run to cliffside finish arena',
        avgSpeedKmh: 115,
        elevationChangeM: 120,
        isPowerStage: true,
      },
    ],
  },
  {
    id: 'circuit-zm',
    country: 'Zambia',
    countryCode: 'ZM',
    rallyTitle: 'Zambia International Copperbelt Rally',
    regionName: 'Lusaka & Chisamba Agricultural Highlands',
    coordinatesLabel: '15°25′00″S 28°17′00″E',
    primarySurface: 'Gravel',
    peakElevationM: 1320,
    baseElevationM: 1140,
    totalDistanceKm: 152.4,
    stagesCount: 10,
    servicePark: 'Lusaka Motor Sports Club Pavilion',
    svgPathData:
      'M 80 180 C 160 220, 220 110, 310 130 C 395 150, 445 75, 535 125 C 615 170, 670 115, 730 135',
    sectorCheckpoints: [
      { x: 80, y: 180, label: 'Start · Chisamba Forest', code: 'SS1' },
      { x: 310, y: 130, label: 'Sector 1 · Kafue Ridge', code: 'S1' },
      { x: 535, y: 125, label: 'Sector 2 · Copperbelt Fast Sweeps', code: 'S2' },
      { x: 730, y: 135, label: 'Finish · Lusaka Super Special', code: 'PS' },
    ],
    elevationPoints: [1150, 1210, 1280, 1320, 1260, 1190, 1240, 1295, 1220],
    stages: [
      {
        sectorNumber: 1,
        name: 'SS1 · Chisamba Fast Gravel',
        distanceKm: 24.6,
        surfaceDetail: 'Flowing red laterite gravel with tree-lined cambers',
        avgSpeedKmh: 126,
        elevationChangeM: 95,
      },
      {
        sectorNumber: 2,
        name: 'SS2 · Kafue River Escarpment',
        distanceKm: 28.4,
        surfaceDetail: 'Medium-speed technical hairpins & bridge crossings',
        avgSpeedKmh: 112,
        elevationChangeM: 180,
      },
      {
        sectorNumber: 3,
        name: 'SS3 · Mkushi Farm Loop',
        distanceKm: 32.1,
        surfaceDetail: 'High-speed flat straights & heavy braking junctions',
        avgSpeedKmh: 131,
        elevationChangeM: 70,
      },
      {
        sectorNumber: 4,
        name: 'SS4 · Lusaka Showgrounds Power Stage',
        distanceKm: 11.8,
        surfaceDetail: 'Hard-packed clay & spectator jump sequence',
        avgSpeedKmh: 119,
        elevationChangeM: 45,
        isPowerStage: true,
      },
    ],
  },
  {
    id: 'circuit-ug',
    country: 'Uganda',
    countryCode: 'UG',
    rallyTitle: 'Pearl of Africa Uganda Rally',
    regionName: 'Jinja & Mabira Forest Lake Victoria Basin',
    coordinatesLabel: '0°25′28″N 33°12′15″E',
    primarySurface: 'Gravel',
    peakElevationM: 1290,
    baseElevationM: 1135,
    totalDistanceKm: 148.0,
    stagesCount: 10,
    servicePark: 'Source of the Nile Agricultural Grounds, Jinja',
    svgPathData:
      'M 75 140 C 155 80, 240 205, 330 165 C 420 125, 490 70, 580 145 C 640 195, 695 110, 735 120',
    sectorCheckpoints: [
      { x: 75, y: 140, label: 'Start · Bujagali Falls', code: 'SS1' },
      { x: 330, y: 165, label: 'Sector 1 · Mabira Canopy', code: 'S1' },
      { x: 580, y: 145, label: 'Sector 2 · Kakira Sugar Estate', code: 'S2' },
      { x: 735, y: 120, label: 'Finish · Nile Shore Power Stage', code: 'PS' },
    ],
    elevationPoints: [1140, 1195, 1260, 1290, 1210, 1175, 1245, 1270, 1160],
    stages: [
      {
        sectorNumber: 1,
        name: 'SS1 · Mabira Forest Canopy',
        distanceKm: 22.8,
        surfaceDetail: 'Damp shaded clay & tight cambered S-bends',
        avgSpeedKmh: 106,
        elevationChangeM: 115,
      },
      {
        sectorNumber: 2,
        name: 'SS2 · Kakira Plantation Run',
        distanceKm: 27.5,
        surfaceDetail: 'Rhythmic crests & blind 90-degree estate cuts',
        avgSpeedKmh: 121,
        elevationChangeM: 90,
      },
      {
        sectorNumber: 3,
        name: 'SS3 · Source of the Nile Power Stage',
        distanceKm: 12.4,
        surfaceDetail: 'Fast lakeside gravel sprint with big tabletop crest',
        avgSpeedKmh: 123,
        elevationChangeM: 65,
        isPowerStage: true,
      },
    ],
  },
  {
    id: 'circuit-rw',
    country: 'Rwanda',
    countryCode: 'RW',
    rallyTitle: 'Rwanda Mountain Gorilla Rally',
    regionName: 'Kigali & Bugesera Thousand Hills Circuit',
    coordinatesLabel: '1°56′38″S 30°03′34″E',
    primarySurface: 'Mixed',
    peakElevationM: 1850,
    baseElevationM: 1420,
    totalDistanceKm: 142.6,
    stagesCount: 12,
    servicePark: 'Kigali Convention Arena Service Park',
    svgPathData:
      'M 70 205 C 140 95, 210 215, 290 110 C 370 45, 450 190, 540 100 C 620 40, 680 165, 735 85',
    sectorCheckpoints: [
      { x: 70, y: 205, label: 'Start · Bugesera Valley', code: 'SS1' },
      { x: 290, y: 110, label: 'Sector 1 · Kamonyi Ridge', code: 'S1' },
      { x: 540, y: 100, label: 'Sector 2 · Rwamagana Hills', code: 'S2' },
      { x: 735, y: 85, label: 'Finish · Kigali Hill Climb PS', code: 'PS' },
    ],
    elevationPoints: [1430, 1590, 1740, 1850, 1620, 1790, 1840, 1690, 1780],
    stages: [
      {
        sectorNumber: 1,
        name: 'SS1 · Bugesera Ridge Ascent',
        distanceKm: 18.9,
        surfaceDetail: 'Relentless uphill hairpins & steep drop-offs',
        avgSpeedKmh: 102,
        elevationChangeM: 340,
      },
      {
        sectorNumber: 2,
        name: 'SS2 · Rwamagana Terrace Pass',
        distanceKm: 25.2,
        surfaceDetail: 'Mixed compacted gravel and broken mountain tarmac',
        avgSpeedKmh: 110,
        elevationChangeM: 410,
      },
      {
        sectorNumber: 3,
        name: 'SS3 · Kigali Cobblestone Power Stage',
        distanceKm: 9.8,
        surfaceDetail: 'Urban asphalt & high-grip hillclimb switchbacks',
        avgSpeedKmh: 114,
        elevationChangeM: 220,
        isPowerStage: true,
      },
    ],
  },
  {
    id: 'circuit-za',
    country: 'South Africa',
    countryCode: 'ZA',
    rallyTitle: 'Rally of South Africa — Tzaneen',
    regionName: 'Limpopo Magoebaskloof Forestry Stages',
    coordinatesLabel: '23°50′00″S 30°10′00″E',
    primarySurface: 'Gravel',
    peakElevationM: 1680,
    baseElevationM: 890,
    totalDistanceKm: 158.2,
    stagesCount: 12,
    servicePark: 'Tzaneen Forestry Headquarters',
    svgPathData:
      'M 75 190 C 165 160, 230 85, 325 115 C 415 145, 480 65, 575 110 C 650 145, 695 95, 735 105',
    sectorCheckpoints: [
      { x: 75, y: 190, label: 'Start · Lowveld Valley', code: 'SS1' },
      { x: 325, y: 115, label: 'Sector 1 · Magoebaskloof Pine', code: 'S1' },
      { x: 575, y: 110, label: 'Sector 2 · George’s Valley', code: 'S2' },
      { x: 735, y: 105, label: 'Finish · Agatha Summit PS', code: 'PS' },
    ],
    elevationPoints: [910, 1120, 1340, 1520, 1680, 1490, 1580, 1640, 1610],
    stages: [
      {
        sectorNumber: 1,
        name: 'SS1 · Magoebaskloof Timber Run',
        distanceKm: 26.4,
        surfaceDetail: 'Smooth high-camber pine forest gravel roads',
        avgSpeedKmh: 122,
        elevationChangeM: 520,
      },
      {
        sectorNumber: 2,
        name: 'SS2 · George’s Valley Gorge',
        distanceKm: 21.8,
        surfaceDetail: 'Technical cliff-edge turns & rapid elevation drop',
        avgSpeedKmh: 113,
        elevationChangeM: 460,
      },
      {
        sectorNumber: 3,
        name: 'SS3 · Agatha Forest Power Stage',
        distanceKm: 11.2,
        surfaceDetail: 'Fast flowing forestry crest sequence to summit',
        avgSpeedKmh: 125,
        elevationChangeM: 210,
        isPowerStage: true,
      },
    ],
  },
  {
    id: 'circuit-tz',
    country: 'Tanzania',
    countryCode: 'TZ',
    rallyTitle: 'Rally of Tanzania — Morogoro Uluguru',
    regionName: 'Morogoro & Uluguru Foothills',
    coordinatesLabel: '6°49′27″S 37°39′48″E',
    primarySurface: 'Safari Gravel',
    peakElevationM: 1490,
    baseElevationM: 520,
    totalDistanceKm: 155.0,
    stagesCount: 10,
    servicePark: 'Morogoro Gymkhana Service Park',
    svgPathData:
      'M 70 175 C 150 110, 235 190, 320 135 C 405 80, 495 160, 585 110 C 655 75, 700 130, 735 100',
    sectorCheckpoints: [
      { x: 70, y: 175, label: 'Start · Sisal Plains', code: 'SS1' },
      { x: 320, y: 135, label: 'Sector 1 · Mindu Dam Crossing', code: 'S1' },
      { x: 585, y: 110, label: 'Sector 2 · Uluguru Escarpment', code: 'S2' },
      { x: 735, y: 100, label: 'Finish · Morogoro Power Stage', code: 'PS' },
    ],
    elevationPoints: [540, 720, 980, 1210, 1490, 1310, 1180, 1390, 1250],
    stages: [
      {
        sectorNumber: 1,
        name: 'SS1 · Kingolwira Sisal Estate',
        distanceKm: 29.0,
        surfaceDetail: 'Long high-speed straights with 90-degree bale chicanes',
        avgSpeedKmh: 129,
        elevationChangeM: 140,
      },
      {
        sectorNumber: 2,
        name: 'SS2 · Uluguru Foothill Climb',
        distanceKm: 24.5,
        surfaceDetail: 'Coarse quartz gravel & technical dry riverbeds',
        avgSpeedKmh: 105,
        elevationChangeM: 680,
      },
      {
        sectorNumber: 3,
        name: 'SS3 · Mindu Spectator Power Stage',
        distanceKm: 10.9,
        surfaceDetail: 'Fast sweeping gravel corners along reservoir',
        avgSpeedKmh: 118,
        elevationChangeM: 110,
        isPowerStage: true,
      },
    ],
  },
];

export function getCircuitMapForRound(
  round?: RallyRound,
  fallbackCircuitId?: string
): RallyCircuitMapSpec {
  if (round) {
    const matchedByCountry = OFFICIAL_AERC_CIRCUIT_MAPS.find(
      (c) =>
        c.country.toLowerCase() === round.country.toLowerCase() ||
        c.countryCode.toLowerCase() === round.countryCode.toLowerCase()
    );
    if (matchedByCountry) {
      return {
        ...matchedByCountry,
        rallyTitle: round.name,
        primarySurface: round.surface,
        totalDistanceKm: round.totalDistanceKm,
        stagesCount: round.stagesCount,
      };
    }
  }

  if (fallbackCircuitId) {
    const found = OFFICIAL_AERC_CIRCUIT_MAPS.find(
      (c) => c.id === fallbackCircuitId
    );
    if (found) return found;
  }

  return OFFICIAL_AERC_CIRCUIT_MAPS[0];
}
