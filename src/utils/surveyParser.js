/**
 * Utility to parse, normalize, and process road survey data
 */

export const SAMPLE_SURVEY_DATA = `NO\tCODE\tX\tY\tELEVATION
1\tSTA00\t759271.443\t9297051.826\t43.950
2\tSTA00\t759271.399\t9297050.025\t43.819
3\tSTA00\t759271.913\t9297046.613\t43.981
4\tSTA00\t759271.838\t9297045.609\t44.094
10\tSTA025\t759246.466\t9297049.814\t43.730
11\tSTA025\t759246.650\t9297049.188\t43.769
12\tSTA025\t759246.395\t9297047.022\t43.657
13\tSTA025\t759246.652\t9297044.956\t43.824
14\tSTA025\t759246.661\t9297043.495\t43.816
15\tSTA050\t759221.759\t9297049.760\t43.357
16\tSTA050\t759221.700\t9297049.805\t43.155
17\tSTA050\t759221.484\t9297048.333\t43.337
18\tSTA050\t759221.468\t9297046.585\t43.280
19\tSTA050\t759220.986\t9297044.695\t43.372
20\tSTA075\t759197.086\t9297052.059\t42.884
21\tSTA075\t759196.804\t9297050.735\t42.771
22\tSTA075\t759196.784\t9297049.049\t43.101
23\tSTA075\t759196.414\t9297047.790\t43.155`;

/**
 * Standardize station string and extract nominal distance (e.g. STA00 -> 0, STA025 -> 25, STA 1+250 -> 1250)
 * Also detects segment prefix (e.g. A-STA00 -> prefix 'A', cleanName 'STA 0+000')
 */
export function parseStationCode(rawCode) {
  if (!rawCode) return { cleanName: 'STA 0+000', nominalMeters: 0, segmentPrefix: null };
  const str = String(rawCode).trim().toUpperCase();

  // Detect optional segment prefix like A-STA00, B_STA025, SEG1:STA050
  let segmentPrefix = null;
  let workStr = str;
  const prefixMatch = str.match(/^([A-Z0-9_]{1,6})[-_:/\s]+(STA.*|\d+\+.*|\d+.*)/i);
  if (prefixMatch && !str.startsWith('STA')) {
    segmentPrefix = prefixMatch[1];
    workStr = prefixMatch[2];
  }

  const plusMatch = workStr.match(/(?:STA\s*)?(\d+)\+(\d+(?:\.\d+)?)/i);
  if (plusMatch) {
    const km = parseFloat(plusMatch[1]) * 1000;
    const m = parseFloat(plusMatch[2]);
    const total = km + m;
    const kmPart = Math.floor(total / 1000);
    const mPart = (total % 1000).toFixed(0).padStart(3, '0');
    return { cleanName: `STA ${kmPart}+${mPart}`, nominalMeters: total, segmentPrefix };
  }

  const numMatch = workStr.match(/(?:STA\s*)?(\d+(?:\.\d+)?)/i);
  if (numMatch) {
    let val = parseFloat(numMatch[1]);
    if (val > 0 && val < 1) {
      val = val * 100;
    }
    const kmPart = Math.floor(val / 1000);
    const mPart = (val % 1000).toFixed(0).padStart(3, '0');
    return { cleanName: `STA ${kmPart}+${mPart}`, nominalMeters: val, segmentPrefix };
  }

  return { cleanName: workStr, nominalMeters: 0, segmentPrefix };
}

/**
 * Parse multi-segment text if data has segment prefixes (e.g. A-STA00 vs B-STA00)
 */
export function parseMultiSegmentRawText(text) {
  const allPoints = parseSurveyRawText(text);
  const segmentGroups = new Map();

  allPoints.forEach(pt => {
    const { segmentPrefix } = parseStationCode(pt.rawCode);
    const segKey = segmentPrefix || 'DEFAULT';
    if (!segmentGroups.has(segKey)) {
      segmentGroups.set(segKey, []);
    }
    segmentGroups.get(segKey).push(pt);
  });

  return segmentGroups;
}

/**
 * Parse raw text / CSV / TSV to raw survey points
 */
/**
 * Parse raw text / CSV / TSV / Sokkia SDR / Leica GSI / LandXML to raw survey points
 */
export function parseSurveyRawText(text) {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  // Check if LandXML
  if (trimmed.startsWith('<?xml') || trimmed.includes('<LandXML')) {
    return parseLandXmlSurveyText(trimmed);
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return [];

  // Check if Sokkia SDR format
  const isSdr = lines.some(l => l.startsWith('00NMSDR') || /^08(POS|KI|TP)\s+/.test(l));
  if (isSdr) {
    return parseSokkiaSdrLines(lines);
  }

  // Check if Leica GSI format (must match GSI word structure e.g. 11....+ and 21....+)
  const isGsi = lines.some(l => /\*?11\d{4}\+/.test(l) && /(?:2[12]|8[12])\d{2,4}\+/.test(l));
  if (isGsi) {
    return parseLeicaGsiLines(lines);
  }

  const points = [];
  let startIndex = 0;

  const firstLine = lines[0].toLowerCase();
  let colIndex = { no: 0, code: 1, detail: -1, x: 2, y: 3, z: 4 };

  const hasHeader =
    firstLine.includes('no') ||
    firstLine.includes('code') ||
    firstLine.includes('detail') ||
    firstLine.includes('x') ||
    firstLine.includes('east') ||
    firstLine.includes('pt') ||
    firstLine.includes('p,n,e,z') ||
    firstLine.includes('p,e,n,z');

  if (hasHeader) {
    startIndex = 1;
    const headerTokens = lines[0].split(/[\t,;]+|\s{2,}/).map(t => t.trim().toLowerCase());
    const xIdx = headerTokens.findIndex(t => t === 'x' || t.includes('east'));
    const yIdx = headerTokens.findIndex(t => t === 'y' || t.includes('north'));
    const zIdx = headerTokens.findIndex(t => t === 'z' || t.includes('elev') || t.includes('tinggi'));
    const noIdx = headerTokens.findIndex(t => t === 'no' || t === 'pt' || t.includes('point') || t.includes('id'));
    const detailIdx = headerTokens.findIndex(t => t.includes('detail') || t.includes('fitur') || t.includes('feature') || t.includes('desc') || t.includes('ket') || t.includes('rem'));
    const codeIdx = headerTokens.findIndex((t, idx) => idx !== detailIdx && (t.includes('code') || t.includes('sta') || t.includes('kode') || t.includes('station')));

    if (xIdx !== -1 && yIdx !== -1 && zIdx !== -1) {
      colIndex = {
        no: noIdx !== -1 ? noIdx : 0,
        code: codeIdx !== -1 ? codeIdx : 1,
        detail: detailIdx !== -1 ? detailIdx : -1,
        x: xIdx,
        y: yIdx,
        z: zIdx,
      };
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    let tokens = line.split(/[\t,;]+|\s{2,}/).map(t => t.trim()).filter(Boolean);
    if (tokens.length < 4) {
      const spaceTokens = line.split(/\s+/);
      if (spaceTokens.length >= 4) {
        tokens = spaceTokens;
      } else {
        continue;
      }
    }

    // Auto-detect 6 columns without header: NO, CODE, DETAIL, X, Y, Z
    if (!hasHeader && tokens.length >= 6 && colIndex.detail === -1) {
      if (!isNaN(parseFloat(tokens[3])) && !isNaN(parseFloat(tokens[4])) && !isNaN(parseFloat(tokens[5]))) {
        colIndex = { no: 0, code: 1, detail: 2, x: 3, y: 4, z: 5 };
      }
    }

    let no = i;
    let code = '';
    let detail = '';
    let x = NaN;
    let y = NaN;
    let z = NaN;

    if (tokens.length >= 5) {
      no = parseInt(tokens[colIndex.no], 10) || i;
      code = tokens[colIndex.code] || `STA_${i}`;
      if (colIndex.detail !== -1 && tokens[colIndex.detail]) {
        detail = tokens[colIndex.detail].trim();
      }
      x = parseFloat(tokens[colIndex.x]);
      y = parseFloat(tokens[colIndex.y]);
      z = parseFloat(tokens[colIndex.z]);
    } else if (tokens.length === 4) {
      // Could be CODE, X, Y, Z or NO, X, Y, Z
      const firstIsNum = !isNaN(parseFloat(tokens[0])) && !tokens[0].toUpperCase().includes('STA');
      if (firstIsNum) {
        no = parseInt(tokens[0], 10) || i;
        code = `STA_${Math.floor((i - startIndex) / 5) * 25}`;
        x = parseFloat(tokens[1]);
        y = parseFloat(tokens[2]);
        z = parseFloat(tokens[3]);
      } else {
        code = tokens[0];
        x = parseFloat(tokens[1]);
        y = parseFloat(tokens[2]);
        z = parseFloat(tokens[3]);
      }
    }

    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
      points.push({
        id: `pt_${points.length + 1}`,
        rawNo: no,
        rawCode: code,
        codeDetail: detail,
        remark: detail || '',
        x,
        y,
        z,
        role: 'UNDEFINED',
      });
    }
  }

  return points;
}

/** Helper: Parse Sokkia SDR33 coordinate lines */
function parseSokkiaSdrLines(lines) {
  const points = [];
  lines.forEach((line, idx) => {
    // 08POS or 08KI: 08POS <PtID:4> <Northing:16> <Easting:16> <Elev:16> <Desc:16>
    if (line.startsWith('08POS') || line.startsWith('08KI') || line.startsWith('08TP')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 5) {
        const ptId = parts[1];
        const y = parseFloat(parts[2]); // Northing
        const x = parseFloat(parts[3]); // Easting
        const z = parseFloat(parts[4]); // Elevation
        const code = parts[5] || `STA_${idx}`;
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          points.push({
            id: `pt_${points.length + 1}`,
            rawNo: parseInt(ptId, 10) || points.length + 1,
            rawCode: code,
            x,
            y,
            z,
            role: 'UNDEFINED',
          });
        }
      }
    }
  });
  return points;
}

/** Helper: Parse Leica GSI-8 / GSI-16 lines */
function parseLeicaGsiLines(lines) {
  const points = [];
  lines.forEach((line, idx) => {
    const tokens = line.split(/\s+/).filter(Boolean);
    let ptNo = idx + 1;
    let x = NaN, y = NaN, z = NaN, code = `STA_${idx}`;

    tokens.forEach(tok => {
      // 11....+ID, 21....+Easting, 22....+Northing, 31....+Elevation
      if (tok.startsWith('11') || tok.startsWith('*11')) {
        const val = tok.replace(/^[*\d.]+[+-]/, '');
        ptNo = parseInt(val, 10) || ptNo;
      } else if (tok.startsWith('21') || tok.startsWith('*21')) {
        // Easting
        const sign = tok.includes('-') ? -1 : 1;
        const numPart = tok.replace(/^[*\d.]+[+-]/, '');
        x = (parseFloat(numPart) / 1000) * sign;
      } else if (tok.startsWith('22') || tok.startsWith('*22')) {
        // Northing
        const sign = tok.includes('-') ? -1 : 1;
        const numPart = tok.replace(/^[*\d.]+[+-]/, '');
        y = (parseFloat(numPart) / 1000) * sign;
      } else if (tok.startsWith('31') || tok.startsWith('*31')) {
        // Elevation
        const sign = tok.includes('-') ? -1 : 1;
        const numPart = tok.replace(/^[*\d.]+[+-]/, '');
        z = (parseFloat(numPart) / 1000) * sign;
      } else if (tok.startsWith('71') || tok.startsWith('*71')) {
        code = tok.replace(/^[*\d.]+[+-]/, '').trim();
      }
    });

    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
      points.push({
        id: `pt_${points.length + 1}`,
        rawNo: ptNo,
        rawCode: code,
        x,
        y,
        z,
        role: 'UNDEFINED',
      });
    }
  });
  return points;
}

/** Helper: Parse LandXML coordinate geometry or profile points */
function parseLandXmlSurveyText(xmlText) {
  const points = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const pntNodes = doc.querySelectorAll('CrossSectPnt, PVI, PntList2D, PntList3D, Start, End');

    let idx = 1;
    pntNodes.forEach((node) => {
      const text = (node.textContent || '').trim();
      const parts = text.split(/\s+/).map(Number).filter((n) => !isNaN(n));
      if (parts.length >= 3) {
        // Northing Easting Elev
        const y = parts[0];
        const x = parts[1];
        const z = parts[2];
        points.push({
          id: `pt_${idx}`,
          rawNo: idx,
          rawCode: `STA_${Math.floor(idx / 5) * 25}`,
          x,
          y,
          z,
          role: 'UNDEFINED',
        });
        idx++;
      } else if (parts.length === 2 && node.nodeName === 'PVI') {
        // station elev
        points.push({
          id: `pt_${idx}`,
          rawNo: idx,
          rawCode: `STA ${Math.floor(parts[0] / 1000)}+${String(Math.floor(parts[0] % 1000)).padStart(3, '0')}`,
          x: 759000 + parts[0],
          y: 9297000,
          z: parts[1],
          role: 'UNDEFINED',
        });
        idx++;
      }
    });
  } catch (err) {
    console.error('Failed to parse LandXML:', err);
  }
  return points;
}


/**
 * Calculate the global alignment corridor normal vector.
 * Points with (P - CL) . N > 0 are ALWAYS on the Blue (Ki) side across the entire road!
 */
export function getGlobalRoadNormal(stations) {
  if (!stations || stations.length === 0) return { nx: 0, ny: 1 };

  const stasWithCl = stations.filter(s => s.clPoint);
  let roadDx = 0;
  let roadDy = 0;

  if (stasWithCl.length >= 2) {
    const first = stasWithCl[0].clPoint;
    const last = stasWithCl[stasWithCl.length - 1].clPoint;
    roadDx = last.x - first.x;
    roadDy = last.y - first.y;
  }

  if (Math.hypot(roadDx, roadDy) < 0.1) {
    const all = stations.flatMap(s => s.points);
    if (all.length >= 2) {
      roadDx = all[all.length - 1].x - all[0].x;
      roadDy = all[all.length - 1].y - all[0].y;
    }
  }

  const roadLen = Math.hypot(roadDx, roadDy) || 1;
  const tx = roadDx / roadLen;
  const ty = roadDy / roadLen;

  let nx = -ty;
  let ny = tx;

  let consensusSum = 0;
  stations.forEach(sta => {
    const cl = sta.clPoint || sta.points[Math.floor(sta.points.length / 2)];
    if (!cl) return;
    sta.points.forEach(p => {
      const dot = (p.x - cl.x) * nx + (p.y - cl.y) * ny;
      if (p.role && p.role.startsWith('Ki')) {
        consensusSum += dot;
      } else if (p.role && p.role.startsWith('Ka')) {
        consensusSum -= dot;
      }
    });
  });

  if (consensusSum < 0) {
    nx = -nx;
    ny = -ny;
  }

  return { nx, ny };
}

/**
 * Automatically organize and sort station points along the cross-section
 * and classify them relative to the Centerline (CL) using the road corridor reference:
 * - Points on the Left/Blue corridor side -> Ki / Blue (negative offset)
 * - Center point -> CL / Red (offset 0.00)
 * - Points on the Right/Green corridor side -> Ka / Green (positive offset)
 */
export function organizeStationPoints(sta, preferredClId = null, normal = null) {
  const pts = sta.points;
  if (!pts || pts.length === 0) return;

  if (preferredClId === false || preferredClId === 'NONE') {
    sta.clPoint = null;
    return;
  }

  let clPoint = null;
  if (preferredClId && preferredClId !== 'NONE') {
    clPoint = pts.find(p => p.id === preferredClId);
  }
  if (!clPoint && sta.clPoint && pts.some(p => p.id === sta.clPoint.id)) {
    clPoint = pts.find(p => p.id === sta.clPoint.id);
  }
  if (!clPoint) {
    clPoint = pts.find(p => p.role === 'CL');
  }
  if (!clPoint && preferredClId !== false && preferredClId !== 'NONE') {
    const midIdx = Math.floor(pts.length / 2);
    clPoint = pts[midIdx];
  }

  if (!clPoint) {
    sta.clPoint = null;
    return;
  }

  sta.clPoint = clPoint;

  let nx = normal?.nx;
  let ny = normal?.ny;

  if (nx === undefined || ny === undefined) {
    let maxD = -1;
    let pA = pts[0];
    let pB = pts[pts.length - 1];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[j].x - pts[i].x, pts[j].y - pts[i].y);
        if (d > maxD) {
          maxD = d;
          pA = pts[i];
          pB = pts[j];
        }
      }
    }
    const len = Math.hypot(pB.x - pA.x, pB.y - pA.y) || 1;
    nx = (pB.x - pA.x) / len;
    ny = (pB.y - pA.y) / len;
  }

  pts.forEach(p => {
    p._proj = (p.x - clPoint.x) * nx + (p.y - clPoint.y) * ny;
    p._dist = Math.hypot(p.x - clPoint.x, p.y - clPoint.y);
  });

  pts.sort((a, b) => b._proj - a._proj);

  const bluePts = pts.filter(p => p.id !== clPoint.id && p._proj > 0.03);
  const greenPts = pts.filter(p => p.id !== clPoint.id && p._proj < -0.03);

  pts.forEach(p => {
    if (p.id === clPoint.id) {
      p.role = 'CL';
      p.offset = 0;
    } else if (p._proj > 0.03) {
      const isEdge = bluePts.length > 0 && p === bluePts[0];
      p.role = isEdge ? 'Ki_Edge' : 'Ki';
      p.offset = -parseFloat((p._dist || 0).toFixed(3));
    } else {
      const isEdge = greenPts.length > 0 && p === greenPts[greenPts.length - 1];
      p.role = isEdge ? 'Ka_Edge' : 'Ka';
      p.offset = parseFloat((p._dist || 0).toFixed(3));
    }
    p.station = sta.stationName;
    delete p._proj;
    delete p._dist;
  });

  sta.points = sortStationPointsGeometrically(pts, clPoint);
}

/**
 * Sort cross-section points along their physical transverse axis (1D projection) across the road.
 * This GUARANTEES that cross-section polylines on map and CAD drawings NEVER zig-zag or backtrack!
 * Order goes strictly from Leftmost (Ki) through CL to Rightmost (Ka).
 */
export function sortStationPointsGeometrically(points, clPoint = null) {
  if (!points || points.length <= 1) return points ? [...points] : [];

  // Find the two points in this station that have the maximum Euclidean distance
  let maxD = -1;
  let pA = points[0];
  let pB = points[points.length - 1];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[j].x - points[i].x, points[j].y - points[i].y);
      if (d > maxD) {
        maxD = d;
        pA = points[i];
        pB = points[j];
      }
    }
  }

  if (maxD <= 0.001) return [...points];

  // Unit vector of the cross-section span
  const ux = (pB.x - pA.x) / maxD;
  const uy = (pB.y - pA.y) / maxD;

  // Project all points onto the 1D transverse line axis
  const withProj = points.map((p) => ({
    pt: p,
    s: (p.x - pA.x) * ux + (p.y - pA.y) * uy,
  }));

  // Sort strictly ascending along the transverse axis
  withProj.sort((a, b) => a.s - b.s);

  // If points have valid offsets or roles, ensure order goes from Left (Ki, negative) to Right (Ka, positive)
  const firstPt = withProj[0].pt;
  const lastPt = withProj[withProj.length - 1].pt;
  const firstOffset = typeof firstPt.offset === 'number' && firstPt.offset !== 0
    ? firstPt.offset
    : firstPt.role?.startsWith('Ki') ? -1 : firstPt.role?.startsWith('Ka') ? 1 : 0;
  const lastOffset = typeof lastPt.offset === 'number' && lastPt.offset !== 0
    ? lastPt.offset
    : lastPt.role?.startsWith('Ki') ? -1 : lastPt.role?.startsWith('Ka') ? 1 : 0;

  let isReversed = false;
  if (firstOffset > lastOffset) {
    withProj.reverse();
    isReversed = true;
  }

  // If clPoint is known, calculate monotonic offsets from CL
  const cl = clPoint || withProj.find((item) => item.pt.role === 'CL')?.pt;
  if (cl) {
    const clProj = (cl.x - pA.x) * ux + (cl.y - pA.y) * uy;
    withProj.forEach((item) => {
      const p = item.pt;
      if (p.id === cl.id) {
        p.role = 'CL';
        p.offset = 0;
      } else {
        const signedDist = isReversed ? (clProj - item.s) : (item.s - clProj);
        p.offset = parseFloat(signedDist.toFixed(3));
        if (!p.role || p.role === 'P' || p.role === 'UNDEFINED') {
          p.role = signedDist < 0 ? 'Ki' : 'Ka';
        }
      }
    });
  }

  return withProj.map((item) => item.pt);
}

/**
 * Group raw points by STA and initialize geometric cross-sections
 */
export function processSurveyData(rawPoints, options = {}) {
  if (!rawPoints || rawPoints.length === 0) return { stations: [], allPoints: [] };
  const autoTraseAs = typeof options === 'boolean' ? options : (options.autoTraseAs === true);

  const groups = new Map();

  rawPoints.forEach(pt => {
    const { cleanName, nominalMeters } = parseStationCode(pt.rawCode);
    if (!groups.has(cleanName)) {
      groups.set(cleanName, {
        stationName: cleanName,
        nominalMeters,
        points: [],
      });
    }
    groups.get(cleanName).points.push(pt);
  });

  const sortedStations = Array.from(groups.values()).sort(
    (a, b) => a.nominalMeters - b.nominalMeters
  );

  if (autoTraseAs) {
    // AUTOMATIC MODE: Assign initial middle CL for each station & organize
    sortedStations.forEach(sta => {
      if (!sta.clPoint && sta.points.length > 0) {
        const midIdx = Math.floor(sta.points.length / 2);
        sta.clPoint = sta.points[midIdx];
      }
    });

    const roadNormal = getGlobalRoadNormal(sortedStations);
    sortedStations.forEach(sta => {
      organizeStationPoints(sta, null, roadNormal);
    });

    sortStationsAlongSpatialTrajectory(sortedStations);
    recalculateAlignmentDistances(sortedStations);
  } else {
    // MANUAL MODE (Default): Do NOT auto-assign CL! Points remain raw points.
    sortedStations.forEach(sta => {
      // Check if surveyor explicitly surveyed a point as CL in the field
      const explicitCl = sta.points.find(p =>
        p.role === 'CL' ||
        (p.codeDetail && /\b(CL|AS|CENTER|AS_JALAN|C)\b/i.test(p.codeDetail)) ||
        (p.rawCode && /\b(CL|AS|CENTER|AS_JALAN|C)\b/i.test(p.rawCode))
      );

      if (explicitCl) {
        sta.clPoint = explicitCl;
        explicitCl.role = 'CL';
        explicitCl.offset = 0;
      } else {
        sta.clPoint = null;
      }

      sta.points.forEach(p => {
        p.station = sta.stationName;
        if (p !== sta.clPoint) {
          const rc = ((p.codeDetail ? p.codeDetail + ' ' : '') + (p.rawCode || '')).toUpperCase();
          if (/\b(BH_KI|BAHU_KI|SH_L|SHOULDER_L)\b/i.test(rc)) {
            p.role = 'Bahu_Ki';
          } else if (/\b(BH_KA|BAHU_KA|SH_R|SHOULDER_R)\b/i.test(rc)) {
            p.role = 'Bahu_Ka';
          } else if (/\b(SL_KI|SALURAN_KI|DRN_L|DITCH_L)\b/i.test(rc)) {
            p.role = 'Saluran_Ki';
          } else if (/\b(SL_KA|SALURAN_KA|DRN_R|DITCH_R)\b/i.test(rc)) {
            p.role = 'Saluran_Ka';
          } else if (/\b(TP_KI|TEPI_KI|EP_L|EP_KI|KI_EDGE)\b/i.test(rc)) {
            p.role = 'Ki';
          } else if (/\b(TP_KA|TEPI_KA|EP_R|EP_KA|KA_EDGE)\b/i.test(rc)) {
            p.role = 'Ka';
          } else if (!p.role || p.role === 'CL' || p.role === 'UNDEFINED') {
            p.role = 'P';
          }
          if (p.offset === undefined) p.offset = 0;
        }
      });

      if (sta.clPoint) {
        sta.points = sortStationPointsGeometrically(sta.points, sta.clPoint);
      }
    });

    recalculateAlignmentDistances(sortedStations);
  }

  const allPoints = [];
  sortedStations.forEach(sta => {
    sta.points.forEach(p => allPoints.push(p));
  });

  return {
    stations: sortedStations,
    allPoints,
  };
}

/**
 * Reset all station centerlines to null (Manual Mode)
 */
export function clearAllStationCenterlines(stations) {
  const updatedStations = JSON.parse(JSON.stringify(stations));
  updatedStations.forEach(sta => {
    sta.clPoint = null;
    sta.points.forEach(p => {
      p.role = 'P';
      p.offset = 0;
    });
  });
  recalculateAlignmentDistances(updatedStations);
  const allPoints = [];
  updatedStations.forEach(sta => {
    sta.points.forEach(p => allPoints.push(p));
  });
  return { stations: updatedStations, allPoints };
}

/**
 * Sort stations along the actual geographic road axis so the red centerline never criss-crosses!
 */
export function sortStationsAlongSpatialTrajectory(stations) {
  if (stations.length <= 2) return stations;

  // If stations have valid distinct nominal meters (e.g. STA 0+000, STA 0+025, STA 0+195),
  // true chainage distance is always the primary ground-truth order!
  const hasDistinctNominal = stations.some((s) => (s.nominalMeters ?? 0) > 0);
  if (hasDistinctNominal) {
    stations.sort((a, b) => (a.nominalMeters ?? 0) - (b.nominalMeters ?? 0));
    return stations;
  }

  // Compute centroid of first station and last station (or overall axis)
  const stasWithPoints = stations.filter((s) => s.points.length > 0);
  if (stasWithPoints.length <= 2) return stations;

  // Calculate station centers
  stasWithPoints.forEach((s) => {
    s._cx = s.points.reduce((sum, p) => sum + p.x, 0) / s.points.length;
    s._cy = s.points.reduce((sum, p) => sum + p.y, 0) / s.points.length;
  });

  // Find two stations furthest apart to establish principal road trajectory vector
  let maxDist = -1;
  let sStart = stasWithPoints[0];
  let sEnd = stasWithPoints[stasWithPoints.length - 1];

  for (let i = 0; i < stasWithPoints.length; i++) {
    for (let j = i + 1; j < stasWithPoints.length; j++) {
      const d = Math.hypot(
        stasWithPoints[j]._cx - stasWithPoints[i]._cx,
        stasWithPoints[j]._cy - stasWithPoints[i]._cy
      );
      if (d > maxDist) {
        maxDist = d;
        sStart = stasWithPoints[i];
        sEnd = stasWithPoints[j];
      }
    }
  }

  // Preserve nominal direction if nominal meters available
  if ((sStart.nominalMeters ?? 0) > (sEnd.nominalMeters ?? 0)) {
    const tmp = sStart;
    sStart = sEnd;
    sEnd = tmp;
  }

  const rdx = sEnd._cx - sStart._cx;
  const rdy = sEnd._cy - sStart._cy;
  const rlen = Math.hypot(rdx, rdy) || 1;
  const rux = rdx / rlen;
  const ruy = rdy / rlen;

  // Project each station center onto road trajectory vector
  stations.forEach((s) => {
    const cx = s._cx ?? s.points.reduce((sum, p) => sum + p.x, 0) / (s.points.length || 1);
    const cy = s._cy ?? s.points.reduce((sum, p) => sum + p.y, 0) / (s.points.length || 1);
    s._roadProg = (cx - sStart._cx) * rux + (cy - sStart._cy) * ruy;
    delete s._cx;
    delete s._cy;
  });

  // Sort stations strictly in sequential geographic progression along road
  stations.sort((a, b) => a._roadProg - b._roadProg);

  stations.forEach((s) => delete s._roadProg);
  return stations;
}

/**
 * Intelligent Auto-Fix for field survey issues:
 * 1. Detects rogue points that were misattributed to the wrong station (e.g. shot at STA 50 but coded STA 25)
 * 2. Re-assigns rogue points to their true physical station
 * 3. Sorts stations geographically along the road trajectory so red lines never criss-cross!
 */
export function autoFixTrajectory(stations) {
  const updatedStations = JSON.parse(JSON.stringify(stations));
  if (updatedStations.length === 0) return { stations, allPoints: [] };

  // Step 1: Calculate station cluster centroids
  const stationClusters = updatedStations.map(sta => {
    const pts = sta.points;
    const avgX = pts.reduce((sum, p) => sum + p.x, 0) / (pts.length || 1);
    const avgY = pts.reduce((sum, p) => sum + p.y, 0) / (pts.length || 1);
    return {
      stationName: sta.stationName,
      avgX,
      avgY,
      sta,
    };
  });

  // Step 2: Check for rogue points (points located far from their own station centroid, but close to another station)
  const movedPoints = [];

  updatedStations.forEach(sta => {
    const myCluster = stationClusters.find(c => c.stationName === sta.stationName);
    if (!myCluster) return;

    // Filter points to keep or move
    const keepPoints = [];
    sta.points.forEach(pt => {
      const distToOwn = Math.hypot(pt.x - myCluster.avgX, pt.y - myCluster.avgY);

      // Check distance to all other clusters
      let bestCluster = null;
      let minOtherDist = 999999;

      stationClusters.forEach(other => {
        if (other.stationName !== sta.stationName) {
          const d = Math.hypot(pt.x - other.avgX, pt.y - other.avgY);
          if (d < minOtherDist) {
            minOtherDist = d;
            bestCluster = other;
          }
        }
      });

      // If point is far from its own station (> 12m) AND much closer to another station (< 7m)
      if (distToOwn > 12 && minOtherDist < 7 && bestCluster) {
        pt.station = bestCluster.stationName;
        pt.rawCode = bestCluster.stationName;
        bestCluster.sta.points.push(pt);
        movedPoints.push({ ptId: pt.id, from: sta.stationName, to: bestCluster.stationName });
      } else {
        keepPoints.push(pt);
      }
    });

    sta.points = keepPoints;
  });

  // Step 3: Remove empty stations
  const validStations = updatedStations.filter(s => s.points.length > 0);

  // Step 4: Re-align station order along true geographic progression
  sortStationsAlongSpatialTrajectory(validStations);

  // Step 5: Harmonize sides and recalculate distances
  const roadNormal = getGlobalRoadNormal(validStations);
  validStations.forEach(sta => {
    organizeStationPoints(sta, sta.clPoint?.id, roadNormal);
  });

  recalculateAlignmentDistances(validStations);

  const allPoints = [];
  validStations.forEach(s => s.points.forEach(p => allPoints.push(p)));

  return {
    stations: validStations,
    allPoints,
    movedCount: movedPoints.length,
  };
}

/**
 * Re-calculate cumulative and partial distances along alignment
 */
function recalculateAlignmentDistances(stations) {
  let cumulativeDist = 0;
  for (let i = 0; i < stations.length; i++) {
    const curr = stations[i];
    if (i === 0) {
      curr.partialDist = 0;
      curr.cumulativeDist = 0;
    } else {
      const prev = stations[i - 1];
      const p1 = prev.clPoint || prev.points?.[0];
      const p2 = curr.clPoint || curr.points?.[0];
      if (p1 && p2 && p1.x != null && p2.x != null && p1.y != null && p2.y != null) {
        const partial = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        cumulativeDist += partial;
        curr.partialDist = parseFloat(partial.toFixed(3));
        curr.cumulativeDist = parseFloat(cumulativeDist.toFixed(3));
      } else {
        curr.partialDist = 0;
        curr.cumulativeDist = parseFloat(cumulativeDist.toFixed(3));
      }
    }
  }
}

/**
 * Re-calculate offsets and stations when user modifies point roles or selects a new CL
 */
export function updateStationPointRoles(stations, pointId, newRole) {
  const updatedStations = JSON.parse(JSON.stringify(stations));
  const roadNormal = getGlobalRoadNormal(updatedStations);

  for (const sta of updatedStations) {
    const targetPt = sta.points.find(p => p.id === pointId);
    if (targetPt) {
      if (newRole === 'CL') {
        organizeStationPoints(sta, targetPt.id, roadNormal);
      } else if (newRole === 'UNSET_CL' || newRole === 'NONE' || newRole === 'P') {
        targetPt.role = 'P';
        if (sta.clPoint?.id === targetPt.id) {
          sta.clPoint = null;
        }
        if (sta.clPoint) {
          sta.points = sortStationPointsGeometrically(sta.points, sta.clPoint);
        }
      } else {
        targetPt.role = newRole;
        if (sta.clPoint?.id === targetPt.id) {
          sta.clPoint = null;
        }
        if (sta.clPoint) {
          sta.points = sortStationPointsGeometrically(sta.points, sta.clPoint);
        }
      }
      break;
    }
  }

  sortStationsAlongSpatialTrajectory(updatedStations);
  recalculateAlignmentDistances(updatedStations);

  const allPoints = [];
  updatedStations.forEach(sta => {
    sta.points.forEach(p => allPoints.push(p));
  });

  return { stations: updatedStations, allPoints };
}

/**
 * Re-harmonize all stations to ensure consistent Left/Right sides across the entire road
 */
export function harmonizeAllStations(stations) {
  const updatedStations = JSON.parse(JSON.stringify(stations));
  sortStationsAlongSpatialTrajectory(updatedStations);
  const roadNormal = getGlobalRoadNormal(updatedStations);

  updatedStations.forEach(sta => {
    if (sta.clPoint) {
      organizeStationPoints(sta, sta.clPoint.id, roadNormal);
    }
  });

  recalculateAlignmentDistances(updatedStations);

  const allPoints = [];
  updatedStations.forEach(sta => {
    sta.points.forEach(p => allPoints.push(p));
  });

  return { stations: updatedStations, allPoints };
}

/**
 * Flip Left and Right sides for a specific station
 */
export function flipStationSides(stations, stationName) {
  const updatedStations = JSON.parse(JSON.stringify(stations));
  const sta = updatedStations.find(s => s.stationName === stationName);
  if (sta && sta.points.length > 0) {
    const clId = sta.clPoint?.id;
    sta.points.forEach(p => {
      if (p.id !== clId) {
        if (p.role?.startsWith('Ki')) {
          p.role = p.role === 'Ki_Edge' ? 'Ka_Edge' : 'Ka';
          p.offset = Math.abs(p.offset);
        } else if (p.role?.startsWith('Ka')) {
          p.role = p.role === 'Ka_Edge' ? 'Ki_Edge' : 'Ki';
          p.offset = -Math.abs(p.offset);
        }
      }
    });

    recalculateAlignmentDistances(updatedStations);
    const allPoints = [];
    updatedStations.forEach(s => s.points.forEach(p => allPoints.push(p)));
    return { stations: updatedStations, allPoints };
  }
  return { stations, allPoints: stations.flatMap(s => s.points) };
}

/**
 * Edit point attributes (No, Role, X, Y, Z, Remark)
 */
export function updatePointAttributes(stations, pointId, newAttrs) {
  const updatedStations = JSON.parse(JSON.stringify(stations));
  const roadNormal = getGlobalRoadNormal(updatedStations);

  for (const sta of updatedStations) {
    const targetPt = sta.points.find(p => p.id === pointId);
    if (targetPt) {
      if (newAttrs.rawNo !== undefined) targetPt.rawNo = newAttrs.rawNo;
      if (newAttrs.x !== undefined && !isNaN(Number(newAttrs.x))) targetPt.x = Number(newAttrs.x);
      if (newAttrs.y !== undefined && !isNaN(Number(newAttrs.y))) targetPt.y = Number(newAttrs.y);
      if (newAttrs.z !== undefined && !isNaN(Number(newAttrs.z))) targetPt.z = Number(newAttrs.z);
      if (newAttrs.remark !== undefined) targetPt.remark = newAttrs.remark;

      if (newAttrs.role) {
        if (newAttrs.role === 'CL') {
          organizeStationPoints(sta, targetPt.id, roadNormal);
        } else if (newAttrs.role === 'UNSET_CL' || newAttrs.role === 'P' || newAttrs.role === 'NONE') {
          targetPt.role = 'P';
          if (sta.clPoint?.id === targetPt.id) {
            sta.clPoint = null;
          }
        } else {
          targetPt.role = newAttrs.role;
          if (sta.clPoint?.id === targetPt.id) {
            sta.clPoint = null;
          }
        }
      } else {
        if (sta.clPoint) {
          organizeStationPoints(sta, sta.clPoint.id, roadNormal);
        }
      }
      break;
    }
  }

  recalculateAlignmentDistances(updatedStations);
  const allPoints = [];
  updatedStations.forEach(s => s.points.forEach(p => allPoints.push(p)));
  return { stations: updatedStations, allPoints };
}

/**
 * Delete a survey point from a station
 */
export function deletePoint(stations, pointId) {
  const updatedStations = JSON.parse(JSON.stringify(stations));
  const roadNormal = getGlobalRoadNormal(updatedStations);

  for (const sta of updatedStations) {
    const idx = sta.points.findIndex(p => p.id === pointId);
    if (idx >= 0) {
      sta.points.splice(idx, 1);
      if (sta.points.length > 0) {
        organizeStationPoints(sta, null, roadNormal);
      }
      break;
    }
  }

  const validStations = updatedStations.filter(s => s.points.length > 0);
  recalculateAlignmentDistances(validStations);
  const allPoints = [];
  validStations.forEach(s => s.points.forEach(p => allPoints.push(p)));
  return { stations: validStations, allPoints };
}

/**
 * Manually group selected points into a single Cross-Section Station
 */
export function groupPointsIntoCrossSection(stations, pointIds, customStationName = null) {
  const updatedStations = JSON.parse(JSON.stringify(stations));
  if (!pointIds || pointIds.length < 2) return { stations, allPoints: stations.flatMap(s => s.points) };

  // Find all points across all stations
  const matchedPoints = [];
  pointIds.forEach(id => {
    for (const sta of updatedStations) {
      const idx = sta.points.findIndex(p => p.id === id);
      if (idx !== -1) {
        matchedPoints.push(sta.points[idx]);
        sta.points.splice(idx, 1);
        break;
      }
    }
  });

  if (matchedPoints.length === 0) return { stations, allPoints: stations.flatMap(s => s.points) };

  // Determine CL point: prefer one already marked 'CL', or middle point
  let clPoint = matchedPoints.find(p => p.role === 'CL');
  if (!clPoint) {
    const cx = matchedPoints.reduce((sum, p) => sum + p.x, 0) / matchedPoints.length;
    const cy = matchedPoints.reduce((sum, p) => sum + p.y, 0) / matchedPoints.length;
    let minD = Infinity;
    matchedPoints.forEach(p => {
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d < minD) {
        minD = d;
        clPoint = p;
      }
    });
  }

  let staName = customStationName;
  if (!staName) {
    staName = clPoint.station || matchedPoints[0].station || `STA ${updatedStations.length * 25}`;
  }

  // Find two points furthest apart to establish transverse cross-section axis
  let maxSpan = -1;
  let ptLeft = matchedPoints[0];
  let ptRight = matchedPoints[matchedPoints.length - 1];
  for (let i = 0; i < matchedPoints.length; i++) {
    for (let j = i + 1; j < matchedPoints.length; j++) {
      const d = Math.hypot(matchedPoints[j].x - matchedPoints[i].x, matchedPoints[j].y - matchedPoints[i].y);
      if (d > maxSpan) {
        maxSpan = d;
        ptLeft = matchedPoints[i];
        ptRight = matchedPoints[j];
      }
    }
  }

  const spanLen = Math.hypot(ptRight.x - ptLeft.x, ptRight.y - ptLeft.y) || 1;
  const nx = (ptRight.x - ptLeft.x) / spanLen;
  const ny = (ptRight.y - ptLeft.y) / spanLen;

  // Assign offsets and roles relative to CL
  matchedPoints.forEach(p => {
    p.station = staName;
    if (p.id === clPoint.id) {
      p.role = 'CL';
      p.offset = 0;
    } else {
      const proj = (p.x - clPoint.x) * nx + (p.y - clPoint.y) * ny;
      const dist = Math.hypot(p.x - clPoint.x, p.y - clPoint.y);
      if (proj < 0) {
        p.role = 'Ki';
        p.offset = -parseFloat(dist.toFixed(3));
      } else {
        p.role = 'Ka';
        p.offset = parseFloat(dist.toFixed(3));
      }
    }
  });

  clPoint.role = 'CL';
  clPoint.offset = 0;

  // Clean empty stations
  const filteredStations = updatedStations.filter(s => s.points.length > 0);

  const sortedGroup = sortStationPointsGeometrically(matchedPoints, clPoint);

  const existingSta = filteredStations.find(s => s.stationName === staName);
  if (existingSta) {
    existingSta.clPoint = clPoint;
    existingSta.points = sortedGroup;
  } else {
    filteredStations.push({
      stationName: staName,
      nominalMeters: 0,
      cumulativeDist: 0,
      clPoint,
      points: sortedGroup,
    });
  }

  sortStationsAlongSpatialTrajectory(filteredStations);
  recalculateAlignmentDistances(filteredStations);

  const allPoints = [];
  filteredStations.forEach(s => s.points.forEach(p => allPoints.push(p)));
  return { stations: filteredStations, allPoints };
}
