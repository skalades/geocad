/**
 * Road Cross-Section Design Template (Tipikal Penampang Melintang Jalan Standar Bina Marga)
 * Supports carriageway, camber/cross slope, shoulders, side ditches (drainase), daylighting (talud lereng),
 * and pavement structure layers.
 */

export const ROAD_TEMPLATE_PRESETS = [
  {
    id: 'pembongkaran_beton_3m',
    name: 'Pembongkaran & Beton 3.00m (Sesuai Desain)',
    description: 'Pembongkaran beton (Rock Drill Breaker) & rigid pavement lebar 3.00m (Sta. 0+000 - 0+074 & Sta. 0+170 - 0+321)',
    laneWidth: 1.5,
    lanesCount: 2, // 2 x 1.5m = 3.00m total
    crossSlope: -0.015,
    shoulderWidth: 1.0,
    shoulderSlope: -0.03,
    hasDitch: false,
    ditchWidth: 0.4,
    ditchDepth: 0.4,
    ditchSideSlope: 1.0,
    cutSlope: 1.0,
    fillSlope: 1.5,
    isConcretePavement: true,
    concreteThickness: 0.20,
    designTitle: 'Pot. Melintang',
    stationIntervals: ['Sta. 0+000 - Sta. 0+074', 'Sta. 0+170 - Sta. 0+321'],
    pavementLayers: [
      { name: 'Pembongkaran & Beton Semen (Rigid Pavement)', thickness: 0.20, color: '#64748b' },
      { name: 'Lantai Kerja / Pasir Alas', thickness: 0.05, color: '#eab308' },
    ],
  },
  {
    id: 'kolektor_2x35',
    name: 'Jalan Kolektor Primer (2 x 3.5m)',
    description: 'Standar jalan penghubung antarkota/kabupaten (Lebar lajur 3.5m, bahu 1.5m)',
    laneWidth: 3.5,
    lanesCount: 2, // 1 each side (left & right)
    crossSlope: -0.02, // -2.0%
    shoulderWidth: 1.5,
    shoulderSlope: -0.04, // -4.0%
    hasDitch: true,
    ditchWidth: 0.6,
    ditchDepth: 0.6,
    ditchSideSlope: 1.0, // 1:1
    cutSlope: 1.0, // 1:1 (H:V = 1:1)
    fillSlope: 1.5, // 1:1.5 (H:V = 1.5:1)
    pavementLayers: [
      { name: 'AC-WC (Lapisan Aus)', thickness: 0.04, color: '#334155' },
      { name: 'AC-BC (Lapisan Antara)', thickness: 0.06, color: '#475569' },
      { name: 'LPA / Base Agregat A', thickness: 0.15, color: '#94a3b8' },
      { name: 'LPB / Subbase Agregat B', thickness: 0.20, color: '#cbd5e1' },
    ],
  },
  {
    id: 'lokal_2x30',
    name: 'Jalan Lokal / Kabupaten (2 x 3.0m)',
    description: 'Standar jalan pedesaan / penghubung kecamatan (Lebar lajur 3.0m, bahu 1.0m)',
    laneWidth: 3.0,
    lanesCount: 2,
    crossSlope: -0.03, // -3.0%
    shoulderWidth: 1.0,
    shoulderSlope: -0.05, // -5.0%
    hasDitch: true,
    ditchWidth: 0.5,
    ditchDepth: 0.5,
    ditchSideSlope: 1.0,
    cutSlope: 1.0,
    fillSlope: 1.5,
    pavementLayers: [
      { name: 'Lapisan Aspal (HRS / Burda)', thickness: 0.05, color: '#334155' },
      { name: 'LPA Agregat Kelas A', thickness: 0.15, color: '#94a3b8' },
      { name: 'LPB Agregat Kelas B', thickness: 0.15, color: '#cbd5e1' },
    ],
  },
  {
    id: 'arteri_4x35',
    name: 'Jalan Arteri / 4 Lajur Terbagi (4 x 3.5m)',
    description: 'Jalan raya nasional / bypass (2 lajur per arah, median tengah)',
    laneWidth: 3.5,
    lanesCount: 4, // 2 each side
    crossSlope: -0.02,
    shoulderWidth: 2.0,
    shoulderSlope: -0.04,
    hasDitch: true,
    ditchWidth: 0.8,
    ditchDepth: 0.8,
    ditchSideSlope: 1.0,
    cutSlope: 1.0,
    fillSlope: 1.5,
    pavementLayers: [
      { name: 'AC-WC (Wearing Course)', thickness: 0.04, color: '#1e293b' },
      { name: 'AC-BC (Binder Course)', thickness: 0.06, color: '#334155' },
      { name: 'AC-Base (Asphalt Base)', thickness: 0.08, color: '#475569' },
      { name: 'CTB / LPA Agregat A', thickness: 0.20, color: '#94a3b8' },
      { name: 'LPB Agregat B', thickness: 0.20, color: '#cbd5e1' },
    ],
  },
  {
    id: 'lingkungan_2x25',
    name: 'Jalan Lingkungan / Perumahan (2 x 2.5m)',
    description: 'Standar jalan perumahan / gang (Lebar 5.0m total, saluran U-Ditch samping)',
    laneWidth: 2.5,
    lanesCount: 2,
    crossSlope: -0.025,
    shoulderWidth: 0.5,
    shoulderSlope: -0.04,
    hasDitch: true,
    ditchWidth: 0.4,
    ditchDepth: 0.4,
    ditchSideSlope: 0.2, // Tegak (U-ditch)
    cutSlope: 1.0,
    fillSlope: 1.5,
    pavementLayers: [
      { name: 'Paving Block / Aspal Tipis', thickness: 0.06, color: '#475569' },
      { name: 'Pasir Alas / Agregat A', thickness: 0.15, color: '#cbd5e1' },
    ],
  },
];

export const DEFAULT_ROAD_TEMPLATE = ROAD_TEMPLATE_PRESETS[0];

/**
 * Interpolate ground elevation Z at a given offset X from sorted ground points
 */
export function getGroundZAtOffset(offset, sortedGroundPoints) {
  if (!sortedGroundPoints || sortedGroundPoints.length === 0) return 0;
  if (offset <= sortedGroundPoints[0].offset) return sortedGroundPoints[0].z;
  if (offset >= sortedGroundPoints[sortedGroundPoints.length - 1].offset) {
    return sortedGroundPoints[sortedGroundPoints.length - 1].z;
  }

  for (let i = 0; i < sortedGroundPoints.length - 1; i++) {
    const p1 = sortedGroundPoints[i];
    const p2 = sortedGroundPoints[i + 1];
    if (offset >= p1.offset && offset <= p2.offset) {
      const dx = p2.offset - p1.offset;
      if (Math.abs(dx) < 1e-6) return p1.z;
      const t = (offset - p1.offset) / dx;
      return p1.z + t * (p2.z - p1.z);
    }
  }
  return sortedGroundPoints[0].z;
}

/**
 * Generate Design Cross Section profile points (Crown, Carriageway, Shoulder, Ditch, Daylighting catch points)
 * @param {number} clDesignZ - Elevation of Centerline design (FGL)
 * @param {Object} template - Road design template config
 * @param {Array} sortedGroundPoints - Array of { offset, z } sorted ascending by offset
 * @returns {Object} { designPoints, daylightLeft, daylightRight, totalPavementThick, pavementLayers }
 */
export function generateDesignCrossSectionProfile(clDesignZ, template = DEFAULT_ROAD_TEMPLATE, sortedGroundPoints = []) {
  const lanesPerSide = Math.max(1, (template.lanesCount || 2) / 2);
  const carriagewayHalfW = (template.laneWidth || 3.5) * lanesPerSide;
  const shoulderW = template.shoulderWidth || 1.5;
  const crossSlope = template.crossSlope ?? -0.02;
  const shoulderSlope = template.shoulderSlope ?? -0.04;

  const totalPavementThick = (template.pavementLayers || []).reduce((acc, l) => acc + (l.thickness || 0), 0);

  // Key Design Points on Top Surface:
  // 1. Centerline (CL)
  const clPt = { offset: 0, z: clDesignZ, label: 'CL' };

  // 2. Right Carriageway Edge (EP_Ka)
  const epKaZ = clDesignZ + carriagewayHalfW * crossSlope;
  const epKa = { offset: carriagewayHalfW, z: epKaZ, label: 'EP Ka' };

  // 3. Right Shoulder Edge (Bahu_Ka)
  const bahuKaZ = epKaZ + shoulderW * shoulderSlope;
  const bahuKa = { offset: carriagewayHalfW + shoulderW, z: bahuKaZ, label: 'Bahu Ka' };

  // 4. Left Carriageway Edge (EP_Ki)
  const epKiZ = clDesignZ + carriagewayHalfW * crossSlope;
  const epKi = { offset: -carriagewayHalfW, z: epKiZ, label: 'EP Ki' };

  // 5. Left Shoulder Edge (Bahu_Ki)
  const bahuKiZ = epKiZ + shoulderW * shoulderSlope;
  const bahuKi = { offset: -(carriagewayHalfW + shoulderW), z: bahuKiZ, label: 'Bahu Ki' };

  // Calculate Daylighting / Talud Lereng
  // Right side daylighting:
  let rightHinge = bahuKa;
  let rightDitchPoints = [];

  if (template.hasDitch) {
    const dW = template.ditchWidth || 0.6;
    const dD = template.ditchDepth || 0.6;
    const sSlope = template.ditchSideSlope || 1.0;
    const dTopX = bahuKa.offset;
    const dInBtmX = dTopX + sSlope * dD * 0.5;
    const dBtmZ = bahuKa.z - dD;
    const dOutBtmX = dInBtmX + dW;
    const dOutTopX = dOutBtmX + sSlope * dD * 0.5;
    const dOutTopZ = bahuKa.z;

    rightDitchPoints = [
      { offset: dInBtmX, z: dBtmZ, label: 'Saluran Ka (In)' },
      { offset: dOutBtmX, z: dBtmZ, label: 'Saluran Ka (Out)' },
      { offset: dOutTopX, z: dOutTopZ, label: 'Bibir Saluran Ka' },
    ];
    rightHinge = rightDitchPoints[rightDitchPoints.length - 1];
  }

  // Find right catch point with ground
  const rightDaylight = findDaylightPoint(
    rightHinge,
    1, // Right direction
    template.cutSlope || 1.0,
    template.fillSlope || 1.5,
    sortedGroundPoints
  );

  // Left side daylighting:
  let leftHinge = bahuKi;
  let leftDitchPoints = [];

  if (template.hasDitch) {
    const dW = template.ditchWidth || 0.6;
    const dD = template.ditchDepth || 0.6;
    const sSlope = template.ditchSideSlope || 1.0;
    const dTopX = bahuKi.offset;
    const dInBtmX = dTopX - sSlope * dD * 0.5;
    const dBtmZ = bahuKi.z - dD;
    const dOutBtmX = dInBtmX - dW;
    const dOutTopX = dOutBtmX - sSlope * dD * 0.5;
    const dOutTopZ = bahuKi.z;

    leftDitchPoints = [
      { offset: dInBtmX, z: dBtmZ, label: 'Saluran Ki (In)' },
      { offset: dOutBtmX, z: dBtmZ, label: 'Saluran Ki (Out)' },
      { offset: dOutTopX, z: dOutTopZ, label: 'Bibir Saluran Ki' },
    ];
    leftHinge = leftDitchPoints[leftDitchPoints.length - 1];
  }

  // Find left catch point with ground
  const leftDaylight = findDaylightPoint(
    leftHinge,
    -1, // Left direction
    template.cutSlope || 1.0,
    template.fillSlope || 1.5,
    sortedGroundPoints
  );

  // Assemble full top design profile (ordered Left to Right):
  const designPoints = [
    leftDaylight,
    ...(leftDitchPoints.slice().reverse()),
    bahuKi,
    epKi,
    clPt,
    epKa,
    bahuKa,
    ...rightDitchPoints,
    rightDaylight,
  ].filter(Boolean);

  return {
    designPoints,
    daylightLeft: leftDaylight,
    daylightRight: rightDaylight,
    clPt,
    epKa,
    epKi,
    bahuKa,
    bahuKi,
    totalPavementThick,
    pavementLayers: template.pavementLayers || [],
    template,
  };
}

/**
 * Calculate Daylight / Catch Point where the side slope intersects the existing ground surface
 */
function findDaylightPoint(hingePt, direction, cutSlopeH, fillSlopeH, sortedGroundPoints) {
  if (!sortedGroundPoints || sortedGroundPoints.length === 0) {
    return {
      offset: hingePt.offset + direction * 2.0,
      z: hingePt.z - 1.0,
      label: direction > 0 ? 'Catch Ka' : 'Catch Ki',
      isCut: false,
    };
  }

  const groundAtHinge = getGroundZAtOffset(hingePt.offset, sortedGroundPoints);
  const isCut = groundAtHinge > hingePt.z;
  const slopeH = isCut ? cutSlopeH : fillSlopeH; // H:1 (e.g. 1.0 or 1.5)
  // Slope dz/dx:
  // If direction = 1 (Right):
  //   In Cut: ground is higher, slope goes UP (+1/slopeH)
  //   In Fill: ground is lower, slope goes DOWN (-1/slopeH)
  const dzPerDx = (isCut ? 1 : -1) / Math.max(0.1, slopeH);

  // Search intersection in steps
  const maxSearchDist = 20; // 20m lateral search
  const step = 0.2;
  let prevDiff = hingePt.z - groundAtHinge;

  for (let dist = step; dist <= maxSearchDist; dist += step) {
    const curOffset = hingePt.offset + direction * dist;
    const curTemplateZ = hingePt.z + dzPerDx * dist;
    const curGroundZ = getGroundZAtOffset(curOffset, sortedGroundPoints);
    const curDiff = curTemplateZ - curGroundZ;

    // Check zero crossing
    if ((prevDiff <= 0 && curDiff >= 0) || (prevDiff >= 0 && curDiff <= 0)) {
      // Linear interpolation between last step and current
      const t = Math.abs(prevDiff) / (Math.abs(prevDiff) + Math.abs(curDiff) + 1e-9);
      const catchOffset = (curOffset - direction * step) + t * (direction * step);
      const catchZ = getGroundZAtOffset(catchOffset, sortedGroundPoints);
      return {
        offset: parseFloat(catchOffset.toFixed(3)),
        z: parseFloat(catchZ.toFixed(3)),
        label: direction > 0 ? (isCut ? 'Toe Cut Ka' : 'Toe Fill Ka') : (isCut ? 'Toe Cut Ki' : 'Toe Fill Ki'),
        isCut,
      };
    }
    prevDiff = curDiff;
  }

  // Fallback if terrain does not cross within 20m
  const endOffset = hingePt.offset + direction * 3.0;
  return {
    offset: parseFloat(endOffset.toFixed(3)),
    z: parseFloat(getGroundZAtOffset(endOffset, sortedGroundPoints).toFixed(3)),
    label: direction > 0 ? 'Catch Ka' : 'Catch Ki',
    isCut,
  };
}
