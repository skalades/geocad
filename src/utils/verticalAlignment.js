/**
 * Vertical Alignment (Alinyemen Vertikal Jalan) Engine
 * Manages PVIs (Points of Vertical Intersection), Symmetrical Parabolic Vertical Curves,
 * K-Values, and Elevation Interpolation along the road profile.
 * Standar Perencanaan Geometrik Jalan Bina Marga.
 */

/**
 * Generate default starter PVIs from stations centerline elevations
 */
export function generateDefaultPvis(stations = []) {
  const valid = stations.filter((s) => s.clPoint);
  if (valid.length === 0) return [];

  const start = valid[0];
  const end = valid[valid.length - 1];

  if (valid.length <= 2) {
    return [
      { id: 'pvi_1', stationDist: start.cumulativeDist, elevation: start.clPoint.z, curveLength: 0 },
      { id: 'pvi_2', stationDist: end.cumulativeDist, elevation: end.clPoint.z, curveLength: 0 },
    ];
  }

  // Pick start, intermediate high/low point, and end
  const midIdx = Math.floor(valid.length / 2);
  const mid = valid[midIdx];

  return [
    {
      id: 'pvi_1',
      stationDist: start.cumulativeDist,
      elevation: parseFloat(start.clPoint.z.toFixed(3)),
      curveLength: 0,
    },
    {
      id: 'pvi_2',
      stationDist: mid.cumulativeDist,
      elevation: parseFloat((mid.clPoint.z + 0.3).toFixed(3)), // slight fill by default
      curveLength: Math.min(60, Math.max(20, Math.round((end.cumulativeDist - start.cumulativeDist) * 0.25))),
    },
    {
      id: 'pvi_3',
      stationDist: end.cumulativeDist,
      elevation: parseFloat(end.clPoint.z.toFixed(3)),
      curveLength: 0,
    },
  ];
}

/**
 * Calculate instantaneous vertical profile parameters at any distance X
 * @param {number} x - Cumulative distance (m)
 * @param {Array} pvis - Array of PVI objects sorted by stationDist
 * @returns {{ elev: number, gradePct: number, inCurve: boolean, pviIndex: number }}
 */
export function evaluateVerticalAlignment(x, pvis = []) {
  if (!pvis || pvis.length === 0) return { elev: null, gradePct: 0, inCurve: false };
  if (pvis.length === 1) return { elev: pvis[0].elevation, gradePct: 0, inCurve: false };

  // Sort PVIs by stationDist
  const sorted = [...pvis].sort((a, b) => a.stationDist - b.stationDist);

  // Before first PVI: project using first tangent
  if (x <= sorted[0].stationDist) {
    const g = (sorted[1].elevation - sorted[0].elevation) / Math.max(0.1, sorted[1].stationDist - sorted[0].stationDist);
    return {
      elev: sorted[0].elevation + g * (x - sorted[0].stationDist),
      gradePct: g * 100,
      inCurve: false,
    };
  }

  // After last PVI: project using last tangent
  const last = sorted[sorted.length - 1];
  const secondLast = sorted[sorted.length - 2];
  if (x >= last.stationDist) {
    const g = (last.elevation - secondLast.elevation) / Math.max(0.1, last.stationDist - secondLast.stationDist);
    return {
      elev: last.elevation + g * (x - last.stationDist),
      gradePct: g * 100,
      inCurve: false,
    };
  }

  // Find surrounding PVIs
  for (let i = 0; i < sorted.length - 1; i++) {
    const pvi1 = sorted[i];
    const pvi2 = sorted[i + 1];

    if (x >= pvi1.stationDist && x <= pvi2.stationDist) {
      const tangentDist = pvi2.stationDist - pvi1.stationDist;
      const g1 = (pvi2.elevation - pvi1.elevation) / Math.max(0.1, tangentDist);

      // Check if x falls inside vertical curve of pvi2 (if pvi2 has curve and is not last)
      const curveL = pvi2.curveLength || 0;
      if (curveL > 0 && i + 2 < sorted.length) {
        const pvi3 = sorted[i + 2];
        const g2 = (pvi3.elevation - pvi2.elevation) / Math.max(0.1, pvi3.stationDist - pvi2.stationDist);

        const bvc = pvi2.stationDist - curveL / 2; // Begin Vertical Curve
        const evc = pvi2.stationDist + curveL / 2; // End Vertical Curve

        if (x >= bvc && x <= evc) {
          // Inside Parabolic Vertical Curve:
          // y = y_bvc + g1 * dx + 0.5 * (g2 - g1) / L * dx^2
          const yBvc = pvi2.elevation - g1 * (curveL / 2);
          const dx = x - bvc;
          const a = (g2 - g1) / (2 * curveL);
          const elev = yBvc + g1 * dx + a * dx * dx;
          const instGrade = (g1 + 2 * a * dx) * 100;
          return {
            elev: parseFloat(elev.toFixed(3)),
            gradePct: parseFloat(instGrade.toFixed(2)),
            inCurve: true,
            pviIndex: i + 1,
            isCrest: g2 < g1,
          };
        }
      }

      // Check if inside curve of pvi1 (trailing half)
      const prevCurveL = pvi1.curveLength || 0;
      if (prevCurveL > 0 && i > 0) {
        const pvi0 = sorted[i - 1];
        const g0 = (pvi1.elevation - pvi0.elevation) / Math.max(0.1, pvi1.stationDist - pvi0.stationDist);
        const bvc = pvi1.stationDist - prevCurveL / 2;
        const evc = pvi1.stationDist + prevCurveL / 2;

        if (x >= bvc && x <= evc) {
          const yBvc = pvi1.elevation - g0 * (prevCurveL / 2);
          const dx = x - bvc;
          const a = (g1 - g0) / (2 * prevCurveL);
          const elev = yBvc + g0 * dx + a * dx * dx;
          const instGrade = (g0 + 2 * a * dx) * 100;
          return {
            elev: parseFloat(elev.toFixed(3)),
            gradePct: parseFloat(instGrade.toFixed(2)),
            inCurve: true,
            pviIndex: i,
            isCrest: g1 < g0,
          };
        }
      }

      // Pure tangent line
      const elev = pvi1.elevation + g1 * (x - pvi1.stationDist);
      return {
        elev: parseFloat(elev.toFixed(3)),
        gradePct: parseFloat((g1 * 100).toFixed(2)),
        inCurve: false,
      };
    }
  }

  return { elev: sorted[0].elevation, gradePct: 0, inCurve: false };
}
