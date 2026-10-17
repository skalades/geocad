/**
 * Earthwork & Volume Computation Engine for Road Survey & Design
 * Uses the Average End Area method (Standar Bina Marga & Civil 3D)
 * Calculates Cut/Fill Cross-Sectional Areas, Incremental Volumes,
 * Cumulative Volumes, and Mass Haul Ordinates.
 */

import {
  generateDesignCrossSectionProfile,
  getGroundZAtOffset,
  DEFAULT_ROAD_TEMPLATE,
} from './roadDesignTemplate';

/**
 * Calculate Cut and Fill Area (m²) for a single station
 * @param {Array} sortedGroundPoints - Array of { offset, z }
 * @param {Object} designProfile - Result of generateDesignCrossSectionProfile
 * @returns {{ cutArea: number, fillArea: number, cutDepthCl: number, fillDepthCl: number, clDesignZ: number, clGroundZ: number }}
 */
export function calculateStationCutFillArea(sortedGroundPoints, designProfile) {
  if (!sortedGroundPoints || sortedGroundPoints.length < 2 || !designProfile?.designPoints) {
    return {
      cutArea: 0,
      fillArea: 0,
      cutDepthCl: 0,
      fillDepthCl: 0,
      clDesignZ: 0,
      clGroundZ: 0,
    };
  }

  const dPts = designProfile.designPoints;
  const gPts = sortedGroundPoints;

  const minOffset = Math.max(
    Math.min(...gPts.map((p) => p.offset)),
    Math.min(...dPts.map((p) => p.offset))
  );
  const maxOffset = Math.min(
    Math.max(...gPts.map((p) => p.offset)),
    Math.max(...dPts.map((p) => p.offset))
  );

  if (maxOffset <= minOffset) {
    return {
      cutArea: 0,
      fillArea: 0,
      cutDepthCl: 0,
      fillDepthCl: 0,
      clDesignZ: 0,
      clGroundZ: 0,
    };
  }

  // Interpolate design elevation at an offset
  function getDesignZ(x) {
    if (x <= dPts[0].offset) return dPts[0].z;
    if (x >= dPts[dPts.length - 1].offset) return dPts[dPts.length - 1].z;
    for (let i = 0; i < dPts.length - 1; i++) {
      const p1 = dPts[i];
      const p2 = dPts[i + 1];
      if (x >= p1.offset && x <= p2.offset) {
        const dx = p2.offset - p1.offset;
        if (Math.abs(dx) < 1e-6) return p1.z;
        const t = (x - p1.offset) / dx;
        return p1.z + t * (p2.z - p1.z);
      }
    }
    return dPts[0].z;
  }

  // Dense numerical integration using trapezoid strips with zero-crossing detection
  const step = 0.05; // 5 cm strip resolution for high accuracy
  let cutArea = 0;
  let fillArea = 0;

  for (let x = minOffset; x < maxOffset; x += step) {
    const x1 = x;
    const x2 = Math.min(maxOffset, x + step);
    const dx = x2 - x1;
    if (dx <= 0) break;

    const zg1 = getGroundZAtOffset(x1, gPts);
    const zg2 = getGroundZAtOffset(x2, gPts);
    const zd1 = getDesignZ(x1);
    const zd2 = getDesignZ(x2);

    // delta = zd - zg:
    // If zd > zg, road design is above ground -> FILL (Timbunan)
    // If zg > zd, ground is above road design -> CUT (Galian)
    const d1 = zd1 - zg1;
    const d2 = zd2 - zg2;

    if (d1 >= 0 && d2 >= 0) {
      // Pure Fill strip
      fillArea += 0.5 * (d1 + d2) * dx;
    } else if (d1 <= 0 && d2 <= 0) {
      // Pure Cut strip
      cutArea += 0.5 * (Math.abs(d1) + Math.abs(d2)) * dx;
    } else {
      // Zero-crossing inside strip
      const t = Math.abs(d1) / (Math.abs(d1) + Math.abs(d2) + 1e-9);
      const dx1 = dx * t;
      const dx2 = dx * (1 - t);
      if (d1 > 0) {
        fillArea += 0.5 * d1 * dx1;
        cutArea += 0.5 * Math.abs(d2) * dx2;
      } else {
        cutArea += 0.5 * Math.abs(d1) * dx1;
        fillArea += 0.5 * d2 * dx2;
      }
    }
  }

  // Centerline depth
  const clGroundZ = getGroundZAtOffset(0, gPts);
  const clDesignZ = getDesignZ(0);
  const clDiff = clDesignZ - clGroundZ;
  const cutDepthCl = clDiff < 0 ? Math.abs(clDiff) : 0;
  const fillDepthCl = clDiff > 0 ? clDiff : 0;

  return {
    cutArea: parseFloat(cutArea.toFixed(3)),
    fillArea: parseFloat(fillArea.toFixed(3)),
    cutDepthCl: parseFloat(cutDepthCl.toFixed(3)),
    fillDepthCl: parseFloat(fillDepthCl.toFixed(3)),
    clDesignZ: parseFloat(clDesignZ.toFixed(3)),
    clGroundZ: parseFloat(clGroundZ.toFixed(3)),
  };
}

/**
 * Compute Complete Earthwork Summary for all stations in a segment
 * @param {Array} stations - Array of station objects
 * @param {Object} roadTemplate - Road template definition
 * @param {Function} [getDesignElevAtDist] - Optional vertical alignment elevation evaluator
 * @returns {Object} Earthwork report { rows, totalCutVol, totalFillVol, netVol, maxMassHaul, minMassHaul, totalLength }
 */
export function computeSegmentEarthwork(
  stations = [],
  roadTemplate = DEFAULT_ROAD_TEMPLATE,
  getDesignElevAtDist = null
) {
  if (!stations || stations.length === 0) {
    return {
      rows: [],
      totalCutVol: 0,
      totalFillVol: 0,
      netVol: 0,
      maxMassHaul: 0,
      minMassHaul: 0,
      totalLength: 0,
    };
  }

  // Sort stations by cumulative distance
  const validStations = stations.filter((s) => s.clPoint);
  if (validStations.length === 0) {
    return {
      rows: [],
      totalCutVol: 0,
      totalFillVol: 0,
      netVol: 0,
      maxMassHaul: 0,
      minMassHaul: 0,
      totalLength: 0,
    };
  }

  const rows = [];
  let cumCutVol = 0;
  let cumFillVol = 0;
  let massHaul = 0;

  for (let i = 0; i < validStations.length; i++) {
    const sta = validStations[i];
    const sortedPts = [...sta.points]
      .filter((p) => p.offset !== undefined && !isNaN(p.offset))
      .sort((a, b) => a.offset - b.offset);

    // Centerline design elevation
    let clDesignZ = sta.clPoint ? sta.clPoint.z : 0;
    if (getDesignElevAtDist && typeof getDesignElevAtDist === 'function') {
      const vElev = getDesignElevAtDist(sta.cumulativeDist);
      if (vElev !== null && !isNaN(vElev)) {
        clDesignZ = vElev;
      }
    }

    const designProfile = generateDesignCrossSectionProfile(clDesignZ, roadTemplate, sortedPts);
    const { cutArea, fillArea, cutDepthCl, fillDepthCl, clGroundZ } =
      calculateStationCutFillArea(sortedPts, designProfile);

    let distFromPrev = 0;
    let incCutVol = 0;
    let incFillVol = 0;

    if (i > 0) {
      const prevSta = validStations[i - 1];
      const prevRow = rows[i - 1];
      distFromPrev = Math.max(0, sta.cumulativeDist - prevSta.cumulativeDist);

      // Average End Area method: V = 0.5 * (A1 + A2) * L
      incCutVol = 0.5 * (prevRow.cutArea + cutArea) * distFromPrev;
      incFillVol = 0.5 * (prevRow.fillArea + fillArea) * distFromPrev;

      cumCutVol += incCutVol;
      cumFillVol += incFillVol;
      // Mass haul ordinate = Cumulative Cut - Cumulative Fill
      massHaul = cumCutVol - cumFillVol;
    }

    rows.push({
      stationName: sta.stationName,
      cumulativeDist: sta.cumulativeDist,
      intervalDist: parseFloat(distFromPrev.toFixed(2)),
      clGroundZ,
      clDesignZ,
      cutDepthCl,
      fillDepthCl,
      cutArea,
      fillArea,
      incCutVol: parseFloat(incCutVol.toFixed(2)),
      incFillVol: parseFloat(incFillVol.toFixed(2)),
      cumCutVol: parseFloat(cumCutVol.toFixed(2)),
      cumFillVol: parseFloat(cumFillVol.toFixed(2)),
      massHaul: parseFloat(massHaul.toFixed(2)),
      designProfile,
    });
  }

  const totalLength = validStations[validStations.length - 1].cumulativeDist;
  const totalCutVol = parseFloat(cumCutVol.toFixed(2));
  const totalFillVol = parseFloat(cumFillVol.toFixed(2));
  const netVol = parseFloat((totalCutVol - totalFillVol).toFixed(2));

  const massHaulValues = rows.map((r) => r.massHaul);
  const maxMassHaul = Math.max(0, ...massHaulValues);
  const minMassHaul = Math.min(0, ...massHaulValues);

  return {
    rows,
    totalCutVol,
    totalFillVol,
    netVol,
    maxMassHaul,
    minMassHaul,
    totalLength,
    cutToFillRatio: totalFillVol > 0 ? (totalCutVol / totalFillVol).toFixed(2) : 'N/A',
  };
}

/**
 * Export Earthwork Table to CSV
 */
export function exportEarthworkToCsv(earthworkReport, segmentName = 'Ruas_Jalan') {
  if (!earthworkReport || !earthworkReport.rows || earthworkReport.rows.length === 0) return;

  const headers = [
    'NO',
    'STASIUN',
    'JARAK_KUMULATIF(m)',
    'JARAK_INTERVAL(m)',
    'ELEV_TANAH_CL(m)',
    'ELEV_DESAIN_CL(m)',
    'TINGGI_GALIAN(m)',
    'TINGGI_TIMBUNAN(m)',
    'LUAS_GALIAN(m2)',
    'LUAS_TIMBUNAN(m2)',
    'VOL_GALIAN_INTERVAL(m3)',
    'VOL_TIMBUNAN_INTERVAL(m3)',
    'KUMULATIF_GALIAN(m3)',
    'KUMULATIF_TIMBUNAN(m3)',
    'ORDINAT_MASS_HAUL(m3)',
  ];

  const rows = earthworkReport.rows.map((r, idx) => [
    idx + 1,
    `"${r.stationName}"`,
    r.cumulativeDist.toFixed(2),
    r.intervalDist.toFixed(2),
    r.clGroundZ.toFixed(3),
    r.clDesignZ.toFixed(3),
    r.cutDepthCl.toFixed(3),
    r.fillDepthCl.toFixed(3),
    r.cutArea.toFixed(3),
    r.fillArea.toFixed(3),
    r.incCutVol.toFixed(2),
    r.incFillVol.toFixed(2),
    r.cumCutVol.toFixed(2),
    r.cumFillVol.toFixed(2),
    r.massHaul.toFixed(2),
  ]);

  // Append Total Row
  rows.push([
    'TOTAL',
    '',
    earthworkReport.totalLength.toFixed(2),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    earthworkReport.totalCutVol.toFixed(2),
    earthworkReport.totalFillVol.toFixed(2),
    earthworkReport.totalCutVol.toFixed(2),
    earthworkReport.totalFillVol.toFixed(2),
    earthworkReport.netVol.toFixed(2),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Volume_Galian_Timbunan_${segmentName.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
