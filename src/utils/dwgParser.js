/**
 * GeoRoad CAD - AutoCAD DWG & DXF Parser Module
 * Powered by GNU LibreDWG WebAssembly (@mlightcad/libredwg-web)
 *
 * Specially designed to parse road structural outlines (pelari struktur),
 * alignments (trase jalan), and convert them into survey stations, centerlines (CL),
 * and cross-section points (Ki / Ka).
 */
import { LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web';

/**
 * Detect UTM Zone from coordinates
 * @param {number} x Easting
 * @param {number} y Northing
 * @returns {string} e.g. '48S', '49S', '50S'
 */
export function detectUtmZoneFromCoords(x, y) {
  // Indonesia Southern Hemisphere Northing is around 9,000,000 - 9,400,000 m
  if (y > 8000000 && y < 10000000) {
    if (x >= 650000 && x <= 850000) {
      // West Java / Karawang / Jakarta / Banten (Longitude ~106° - 108°)
      return '48S';
    } else if (x < 650000) {
      // Central Java / DIY / West East Java (Zone 49S) or West
      return '49S';
    } else {
      return '48S';
    }
  }
  return '48S';
}

/**
 * Parse an ArrayBuffer or Uint8Array of a .dwg or .dxf file
 * @param {ArrayBuffer|Uint8Array} fileBuffer
 * @param {string} fileName
 * @param {Object} options e.g. { autoTraseAs: false }
 * @returns {Promise<Object>} Processed project data with segments, stations, points, and UTM zone
 */
export async function parseCadFile(fileBuffer, fileName = 'drawing.dwg', options = {}) {
  const isDxf = fileName.toLowerCase().endsWith('.dxf');
  const buffer = fileBuffer instanceof Uint8Array ? fileBuffer : new Uint8Array(fileBuffer);

  // Initialize LibreDwg WASM module with environment-aware locator
  let libredwg;
  if (typeof window !== 'undefined') {
    try {
      libredwg = await LibreDwg.create('');
    } catch {
      libredwg = await LibreDwg.create();
    }
  } else {
    try {
      libredwg = await LibreDwg.create();
    } catch {
      libredwg = await LibreDwg.create('');
    }
  }

  try {
    const fileType = isDxf ? Dwg_File_Type.DXF : Dwg_File_Type.DWG;
    const dwg = libredwg.dwg_read_data(buffer, fileType);
    const db = libredwg.convert(dwg);

    const entities = db.entities || [];
    const lines = entities.filter(e => e.type === 'LINE');
    const polylines = entities.filter(e => e.type === 'LWPOLYLINE' || e.type === 'POLYLINE');

    const result = processCadEntitiesToRoadData(lines, polylines, fileName, options);
    libredwg.dwg_free(dwg);
    return result;
  } catch (err) {
    console.error('Error parsing CAD file:', err);
    throw err;
  }
}

/**
 * Process CAD lines and polylines into road alignment and survey stations
 */
export function processCadEntitiesToRoadData(lines = [], polylines = [], fileName = '', options = {}) {
  // Extract connected chains from lines and polylines
  const chains = extractConnectedLineChains(lines);

  polylines.forEach(pl => {
    if (pl.vertices && pl.vertices.length >= 2) {
      chains.push(pl.vertices.map(v => ({ x: v.x, y: v.y, z: v.z || 0 })));
    }
  });

  if (chains.length === 0) {
    throw new Error('Tidak ditemukan garis trase atau struktur jalan (LINE / POLYLINE) dalam file CAD ini.');
  }

  // Detect UTM Zone from first coordinate
  const firstPt = chains[0][0];
  const detectedUtm = detectUtmZoneFromCoords(firstPt.x, firstPt.y);

  // Group chains into road segments (pelari struktur)
  const segments = buildRoadSegmentsFromPelariChains(chains, fileName, options);

  return {
    projectName: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
    utmZone: detectedUtm,
    segments,
    totalLength: segments.reduce((sum, s) => {
      const lastSta = s.stations[s.stations.length - 1];
      return sum + (lastSta ? lastSta.cumulativeDist : 0);
    }, 0),
  };
}

/**
 * Extract connected chains of lines with endpoint snapping
 */
function extractConnectedLineChains(lines) {
  if (!lines || lines.length === 0) return [];

  const unused = lines.map(l => ({
    start: { x: l.startPoint.x, y: l.startPoint.y, z: l.startPoint.z || 0 },
    end: { x: l.endPoint.x, y: l.endPoint.y, z: l.endPoint.z || 0 },
    color: l.colorIndex,
    layer: l.layer,
  }));

  const chains = [];

  while (unused.length > 0) {
    const first = unused.shift();
    const chain = [first.start, first.end];

    let extended = true;
    while (extended) {
      extended = false;
      const head = chain[0];
      const tail = chain[chain.length - 1];

      for (let i = 0; i < unused.length; i++) {
        const item = unused[i];
        const s = item.start;
        const e = item.end;

        // Tolerance for vertex snapping
        const TOL = 0.5;

        if (Math.hypot(s.x - tail.x, s.y - tail.y) < TOL) {
          chain.push(e);
          unused.splice(i, 1);
          extended = true;
          break;
        } else if (Math.hypot(e.x - tail.x, e.y - tail.y) < TOL) {
          chain.push(s);
          unused.splice(i, 1);
          extended = true;
          break;
        } else if (Math.hypot(e.x - head.x, e.y - head.y) < TOL) {
          chain.unshift(s);
          unused.splice(i, 1);
          extended = true;
          break;
        } else if (Math.hypot(s.x - head.x, s.y - head.y) < TOL) {
          chain.unshift(e);
          unused.splice(i, 1);
          extended = true;
          break;
        }
      }
    }

    // Filter out very short degenerate segments (e.g. < 5m cross lines)
    let chainLen = 0;
    for (let i = 1; i < chain.length; i++) {
      chainLen += Math.hypot(chain[i].x - chain[i-1].x, chain[i].y - chain[i-1].y);
    }

    if (chainLen >= 10) {
      chains.push(chain);
    }
  }

  return chains;
}

/**
 * Detect closed-loop road boundaries (corridor polygons) in CAD.
 * When AutoCAD drawers draw a road segment as a closed perimeter loop,
 * the chain goes forward along Edge A and returns along Edge B.
 * This splits the loop at its furthest turnaround point (apex) into Edge A and Edge B!
 */
function splitClosedRoadLoop(chain) {
  if (!chain || chain.length < 4) return [chain];

  const dStartEnd = Math.hypot(chain[chain.length - 1].x - chain[0].x, chain[chain.length - 1].y - chain[0].y);
  let totalLen = 0;
  for (let i = 1; i < chain.length; i++) {
    totalLen += Math.hypot(chain[i].x - chain[i - 1].x, chain[i].y - chain[i - 1].y);
  }

  // If start and end are close (< 15m) compared to total length (> 30m), it's a closed loop!
  if (dStartEnd < 15 && totalLen > 30) {
    let maxDist = -1;
    let apexIdx = -1;
    for (let i = 1; i < chain.length - 1; i++) {
      const d = Math.hypot(chain[i].x - chain[0].x, chain[i].y - chain[0].y);
      if (d > maxDist) {
        maxDist = d;
        apexIdx = i;
      }
    }

    if (apexIdx > 1 && apexIdx < chain.length - 2) {
      const side1 = chain.slice(0, apexIdx + 1);
      const side2 = chain.slice(apexIdx).reverse(); // reverse so both run forward from start to end!
      return [side1, side2];
    }
  }

  return [chain];
}

/**
 * Find the mathematically closest point on a polyline segment to point P (perpendicular projection)
 */
function closestPointOnPolyline(p, poly) {
  if (!poly || poly.length === 0) return { pt: p, dist: 0 };
  if (poly.length === 1) return { pt: poly[0], dist: Math.hypot(p.x - poly[0].x, p.y - poly[0].y) };

  let bestPt = poly[0];
  let minD = Infinity;

  for (let j = 0; j < poly.length - 1; j++) {
    const a = poly[j];
    const b = poly[j + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    if (lenSq === 0) continue;

    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq));
    const proj = {
      x: a.x + t * abx,
      y: a.y + t * aby,
      z: (a.z || 0) + t * ((b.z || 0) - (a.z || 0)),
    };
    const d = Math.hypot(p.x - proj.x, p.y - proj.y);
    if (d < minD) {
      minD = d;
      bestPt = proj;
    }
  }

  return { pt: bestPt, dist: minD };
}

/**
 * Pair structural edge chains (pelari struktur: Tepi Kiri & Tepi Kanan)
 * and generate Centerline (As Jalan) with accurate stations and cross-sections.
 */
function buildRoadSegmentsFromPelariChains(chains, fileName, options = {}) {
  const autoTraseAs = typeof options === 'boolean' ? options : (options.autoTraseAs === true);
  const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

  // 1. Split any closed-loop boundary chains into parallel left & right edges
  const allChains = [];
  chains.forEach((c) => {
    allChains.push(...splitClosedRoadLoop(c));
  });

  // Identify parallel pairs of chains (pelari tepi kiri & kanan)
  const paired = [];
  const usedChains = new Set();

  for (let i = 0; i < allChains.length; i++) {
    if (usedChains.has(i)) continue;
    const c1 = allChains[i];
    let bestMatch = -1;
    let minMidDist = Infinity;

    for (let j = i + 1; j < allChains.length; j++) {
      if (usedChains.has(j)) continue;
      const c2 = allChains[j];

      // Check distance between start points or start to end
      const dStart = Math.hypot(c1[0].x - c2[0].x, c1[0].y - c2[0].y);
      const dStartEnd = Math.hypot(c1[0].x - c2[c2.length - 1].x, c1[0].y - c2[c2.length - 1].y);
      const dEnd = Math.hypot(c1[c1.length - 1].x - c2[c2.length - 1].x, c1[c1.length - 1].y - c2[c2.length - 1].y);
      const dEndStart = Math.hypot(c1[c1.length - 1].x - c2[0].x, c1[c1.length - 1].y - c2[0].y);

      // Typical road width is between 0m (meeting at apex/junction) and 25m
      const isStartClose = (dStart >= 0 && dStart <= 25) || (dStartEnd >= 0 && dStartEnd <= 25);
      const isEndClose = (dEnd >= 0 && dEnd <= 25) || (dEndStart >= 0 && dEndStart <= 25);

      if (isStartClose && isEndClose) {
        const avgDist = Math.min(dStart, dStartEnd);
        if (avgDist < minMidDist) {
          minMidDist = avgDist;
          bestMatch = j;
        }
      }
    }

    if (bestMatch !== -1) {
      usedChains.add(i);
      usedChains.add(bestMatch);
      paired.push({ chain1: c1, chain2: allChains[bestMatch] });
    } else {
      usedChains.add(i);
      paired.push({ chain1: c1, chain2: null });
    }
  }

  // Convert each paired/unpaired group into a road segment
  const segments = paired.map((pair, segIdx) => {
    const { chain1, chain2 } = pair;
    const segNum = segIdx + 1;
    const segName = paired.length === 1 ? baseName : `${baseName} (Seksi ${segNum})`;
    const segCode = String.fromCharCode(65 + segIdx);

    // Normalize chain direction so both run in the same forward direction
    let edgeLeft = [...chain1];
    let edgeRight = chain2 ? [...chain2] : null;

    if (edgeRight) {
      const dSame = Math.hypot(edgeLeft[0].x - edgeRight[0].x, edgeLeft[0].y - edgeRight[0].y);
      const dOpposite = Math.hypot(edgeLeft[0].x - edgeRight[edgeRight.length - 1].x, edgeLeft[0].y - edgeRight[edgeRight.length - 1].y);
      if (dOpposite < dSame) {
        edgeRight.reverse();
      }
    }

    // Generate stations along the road segment
    const stations = [];
    let cumDist = 0;
    let ptId = 1;

    for (let i = 0; i < edgeLeft.length; i++) {
      const p1 = edgeLeft[i];
      if (i > 0) {
        cumDist += Math.hypot(p1.x - edgeLeft[i-1].x, p1.y - edgeLeft[i-1].y);
      }

      // Calculate tangent & normal vector
      let dx = 1, dy = 0;
      if (i < edgeLeft.length - 1) {
        dx = edgeLeft[i+1].x - p1.x;
        dy = edgeLeft[i+1].y - p1.y;
      } else if (i > 0) {
        dx = p1.x - edgeLeft[i-1].x;
        dy = p1.y - edgeLeft[i-1].y;
      }
      const segLen = Math.hypot(dx, dy) || 1;
      const nx = -dy / segLen;
      const ny = dx / segLen;

      let clX, clY, clZ;
      let kiX, kiY, kiZ, kiOffset;
      let kaX, kaY, kaZ, kaOffset;

      if (edgeRight) {
        // Find closest perpendicular projection onto edgeRight polyline
        const { pt: closestP2, dist: roadWidth } = closestPointOnPolyline(p1, edgeRight);

        // Centerline is the true midpoint of the pelari struktur
        clX = (p1.x + closestP2.x) / 2;
        clY = (p1.y + closestP2.y) / 2;
        clZ = (p1.z || 42.5);

        const halfW = roadWidth / 2;
        kiX = p1.x;
        kiY = p1.y;
        kiZ = clZ - 0.06;
        kiOffset = -halfW;

        kaX = closestP2.x;
        kaY = closestP2.y;
        kaZ = (closestP2.z || clZ) - 0.06;
        kaOffset = halfW;
      } else {
        // Standalone line
        clX = p1.x;
        clY = p1.y;
        clZ = p1.z || 42.5;

        kiX = clX + nx * 2.0;
        kiY = clY + ny * 2.0;
        kiZ = clZ - 0.06;
        kiOffset = -2.0;

        kaX = clX - nx * 2.0;
        kaY = clY - ny * 2.0;
        kaZ = clZ - 0.06;
        kaOffset = 2.0;
      }

      const km = Math.floor(cumDist / 1000);
      const m = (cumDist % 1000).toFixed(0).padStart(3, '0');
      const staName = `STA ${km}+${m}`;

      const kiPoint = {
        id: `pt_${segIdx}_${i}_ki`,
        rawNo: ptId++,
        rawCode: `${segCode}-${staName}-TepiKi`,
        station: staName,
        x: Number(kiX.toFixed(3)),
        y: Number(kiY.toFixed(3)),
        z: Number(kiZ.toFixed(3)),
        role: autoTraseAs ? 'Ki' : 'P',
        offset: autoTraseAs ? Number(kiOffset.toFixed(2)) : 0,
      };

      const kaPoint = {
        id: `pt_${segIdx}_${i}_ka`,
        rawNo: ptId++,
        rawCode: `${segCode}-${staName}-TepiKa`,
        station: staName,
        x: Number(kaX.toFixed(3)),
        y: Number(kaY.toFixed(3)),
        z: Number(kaZ.toFixed(3)),
        role: autoTraseAs ? 'Ka' : 'P',
        offset: autoTraseAs ? Number(kaOffset.toFixed(2)) : 0,
      };

      let clPoint = null;
      let staPoints = [];

      if (autoTraseAs) {
        // Auto-assign CL at midpoint
        clPoint = {
          id: `pt_${segIdx}_${i}_cl`,
          rawNo: ptId++,
          rawCode: `${segCode}-${staName}-CL`,
          station: staName,
          x: Number(clX.toFixed(3)),
          y: Number(clY.toFixed(3)),
          z: Number(clZ.toFixed(3)),
          role: 'CL',
          offset: 0,
        };
        staPoints = [kiPoint, clPoint, kaPoint];
      } else {
        // Manual mode: DO NOT auto-assign CL!
        // Provide midpoint candidate point with role 'P' so user can pick midpoint or edge as CL
        const midPoint = {
          id: `pt_${segIdx}_${i}_mid`,
          rawNo: ptId++,
          rawCode: `${segCode}-${staName}-Mid`,
          station: staName,
          x: Number(clX.toFixed(3)),
          y: Number(clY.toFixed(3)),
          z: Number(clZ.toFixed(3)),
          role: 'P',
          offset: 0,
        };
        staPoints = [kiPoint, midPoint, kaPoint];
        clPoint = null; // No auto-trase!
      }

      stations.push({
        stationName: staName,
        nominalMeters: cumDist,
        cumulativeDist: cumDist,
        clPoint,
        points: staPoints,
      });
    }

    const allPoints = stations.flatMap(s => s.points);

    // Format raw survey TSV text for export/saving
    const rawTextLines = ['NO\tCODE\tX\tY\tELEVATION'];
    allPoints.forEach(p => {
      rawTextLines.push(`${p.rawNo}\t${p.rawCode}\t${p.x}\t${p.y}\t${p.z}`);
    });

    return {
      id: `seg_${Date.now()}_${segIdx}`,
      name: segName,
      code: segCode,
      color: PRESET_COLORS[segIdx % PRESET_COLORS.length],
      rawText: rawTextLines.join('\n'),
      cadChains: [edgeLeft, edgeRight].filter(Boolean),
      stations,
      allPoints,
    };
  });

  return segments;
}
