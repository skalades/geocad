/**
 * AutoCAD DXF Generator — Pure AC1009 (Release 12)
 * Fully compliant with Autodesk AutoCAD & Civil 3D 2016 - 2026.
 *
 * Mengapa AC1009 Murni?
 * - Civil 3D 2024 membaca DXF AC1009 secara natif tanpa memerlukan
 *   struktur objek rumit (CLASSES, OBJECTS, DICTIONARY, HANDLES) yang
 *   menyebabkan pesan "Press ENTER to continue: / drawing discarded".
 * - 100% kompatibel dengan AutoCAD, Civil 3D, QCAD, LibreCAD, dan DWG Viewer.
 *
 * Fitur Utama:
 * 1. Zoom Pas (Tidak Jauh):
 *    - Ketika Denah (3D) ON dan Profil ON: Profil di-anchor tepat di bawah
 *      koordinat nyata Denah (UTM), sehingga jarak antar objek rapat (ratusan meter,
 *      BUKAN 800 kilometer dari 0,0).
 *    - Ketika Denah ON dan Profil OFF: Hanya titik 3D & trase nyata yang diekspor.
 *    - $EXTMIN/$EXTMAX & VPORT *ACTIVE dihitung otomatis dari bounding box nyata.
 * 2. Koordinat & Zona UTM:
 *    - Koordinat Easting (X), Northing (Y), Elevasi (Z) dipertahankan presisi tinggi.
 *    - Header memuat info Zona UTM resmi (misal: WGS 84 / UTM Zone 48S).
 * 3. Seluruh Fitur ON/OFF Berfungsi Sepenuhnya:
 *    - includeAlignment: Denah Trase 3D (Titik ukur 3D, As, Cross, Tepi)
 *    - includeProfiles: Lembar Profil Memanjang & Melintang
 *    - includeKop: Kop Dinas PUPR Karawang
 *    - includeDesignFgl: Garis Elevasi Rencana & baris FGL di data band
 */

export function generateSurveyDxf({
  stations = [],
  allPoints = [],
  segments = [],
  utmZone = '48S',
  hScaleLong = 1000,
  vScaleLong = 100,
  hScaleCross = 100,
  vScaleCross = 100,
  datumMargin = 2,
  includeAlignment = true,
  includeProfiles = true,
  includeKop = false,
  includeDesignFgl = false,
}) {
  const segList = (segments && segments.length > 0)
    ? segments.filter(s => s.stations && s.stations.length > 0)
    : (stations && stations.length > 0
        ? [{ name: 'Trase Utama', stations, allPoints }]
        : []);

  if (segList.length === 0) return '';

  // Buffer untuk entitas (dihitung dulu agar bounding box didapat)
  const entLines = [];
  function eAdd(code, val) {
    entLines.push(typeof code === 'number' ? code.toString() : String(code));
    entLines.push(val != null ? String(val) : '');
  }

  // Bounding box tracker untuk kalkulasi EXTMIN, EXTMAX, dan VPORT
  let bMinX = Infinity, bMinY = Infinity, bMinZ = Infinity;
  let bMaxX = -Infinity, bMaxY = -Infinity, bMaxZ = -Infinity;
  function track(x, y, z) {
    if (isFinite(x)) {
      if (x < bMinX) bMinX = x;
      if (x > bMaxX) bMaxX = x;
    }
    if (isFinite(y)) {
      if (y < bMinY) bMinY = y;
      if (y > bMaxY) bMaxY = y;
    }
    if (isFinite(z)) {
      if (z < bMinZ) bMinZ = z;
      if (z > bMaxZ) bMaxZ = z;
    }
  }

  // --- Primitif Gambar DXF AC1009 Murni ---

  function drawLine(layer, x1, y1, x2, y2, ltype) {
    const a = isFinite(x1) ? x1 : 0, b = isFinite(y1) ? y1 : 0;
    const c = isFinite(x2) ? x2 : 0, d = isFinite(y2) ? y2 : 0;
    track(a, b); track(c, d);
    eAdd(0, 'LINE');
    eAdd(8, layer);
    if (ltype && ltype !== 'BYLAYER') eAdd(6, ltype);
    eAdd(10, a.toFixed(4)); eAdd(20, b.toFixed(4)); eAdd(30, '0.0000');
    eAdd(11, c.toFixed(4)); eAdd(21, d.toFixed(4)); eAdd(31, '0.0000');
  }

  function drawPoint3D(layer, x, y, z) {
    const xv = isFinite(x) ? x : 0, yv = isFinite(y) ? y : 0, zv = isFinite(z) ? z : 0;
    track(xv, yv, zv);
    eAdd(0, 'POINT');
    eAdd(8, layer);
    eAdd(10, xv.toFixed(4)); eAdd(20, yv.toFixed(4)); eAdd(30, zv.toFixed(4));
  }

  function drawCircle(layer, cx, cy, r) {
    const xv = isFinite(cx) ? cx : 0, yv = isFinite(cy) ? cy : 0;
    const rv = isFinite(r) && r > 0 ? r : 0.5;
    track(xv - rv, yv - rv); track(xv + rv, yv + rv);
    eAdd(0, 'CIRCLE');
    eAdd(8, layer);
    eAdd(10, xv.toFixed(4)); eAdd(20, yv.toFixed(4)); eAdd(30, '0.0000');
    eAdd(40, rv.toFixed(4));
  }

  /**
   * DXF R12 TEXT:
   * group 72: 0=Left, 1=Center, 2=Right
   * Jika group 72 > 0, koordinat acuan ada di group 11 & 21
   */
  function drawText(layer, text, x, y, h, rot = 0, hAlign = 0) {
    const xv = isFinite(x) ? x : 0, yv = isFinite(y) ? y : 0;
    const hv = isFinite(h) && h > 0 ? h : 0.25;
    const rv = isFinite(rot) ? rot : 0;
    const s = String(text ?? '').replace(/[\r\n]+/g, ' ').trim();
    if (!s) return;
    track(xv, yv);
    eAdd(0, 'TEXT');
    eAdd(8, layer);
    eAdd(10, xv.toFixed(4)); eAdd(20, yv.toFixed(4)); eAdd(30, '0.0000');
    eAdd(40, hv.toFixed(4));
    eAdd(1, s);
    eAdd(7, 'STANDARD');
    if (rv !== 0) eAdd(50, rv.toFixed(2));
    if (hAlign !== 0) {
      eAdd(72, hAlign);
      eAdd(11, xv.toFixed(4)); eAdd(21, yv.toFixed(4)); eAdd(31, '0.0000');
    }
  }

  // 2D POLYLINE untuk profil melintang & profil tanah
  function drawPolyline2D(layer, pts, ltype) {
    const vp = (pts || []).filter(p => p && isFinite(p.x) && isFinite(p.y));
    if (vp.length < 2) return;
    vp.forEach(p => track(p.x, p.y));
    eAdd(0, 'POLYLINE');
    eAdd(8, layer);
    if (ltype && ltype !== 'BYLAYER') eAdd(6, ltype);
    eAdd(66, 1);
    eAdd(10, '0.0000'); eAdd(20, '0.0000'); eAdd(30, '0.0000');
    eAdd(70, 0); // 2D open polyline
    vp.forEach(p => {
      eAdd(0, 'VERTEX');
      eAdd(8, layer);
      eAdd(10, p.x.toFixed(4));
      eAdd(20, p.y.toFixed(4));
      eAdd(30, '0.0000');
      eAdd(70, 0);
    });
    eAdd(0, 'SEQEND');
    eAdd(8, layer);
  }

  // 3D POLYLINE untuk trase jalan, garis cross & garis tepi koordinat nyata
  function drawPolyline3D(layer, pts, ltype) {
    const vp = (pts || []).filter(p => p && isFinite(p.x) && isFinite(p.y));
    if (vp.length < 2) return;
    vp.forEach(p => track(p.x, p.y, p.z));
    eAdd(0, 'POLYLINE');
    eAdd(8, layer);
    if (ltype && ltype !== 'BYLAYER') eAdd(6, ltype);
    eAdd(66, 1);
    eAdd(10, '0.0000'); eAdd(20, '0.0000'); eAdd(30, '0.0000');
    eAdd(70, 8); // flag 8 = 3D Polyline
    vp.forEach(p => {
      eAdd(0, 'VERTEX');
      eAdd(8, layer);
      eAdd(10, p.x.toFixed(4));
      eAdd(20, p.y.toFixed(4));
      eAdd(30, (isFinite(p.z) ? p.z : 0).toFixed(4));
      eAdd(70, 32); // flag 32 = 3D Polyline Vertex
    });
    eAdd(0, 'SEQEND');
    eAdd(8, layer);
  }

  // Titik ukur survei 3D + silang + teks identifikasi
  function drawSurveyNode(layer, x, y, z, id, code, showLabels = true) {
    drawPoint3D(layer, x, y, z || 0);
    const m = 0.35;
    drawLine(layer, x - m, y, x + m, y);
    drawLine(layer, x, y - m, x, y + m);
    if (showLabels) {
      if (id != null) drawText('SURV_NO_TITIK', String(id), x + 0.4, y + 0.35, 0.32, 0);
      if (z != null)  drawText('SURV_ELEVASI_EXISTING', Number(z).toFixed(3), x + 0.4, y - 0.25, 0.28, 0);
      if (code)     drawText('SURV_KODE_TITIK', String(code), x + 0.4, y - 0.75, 0.24, 0);
    }
  }

  // Kop Dinas PUPR Karawang
  function drawKop({ x, y, width, height, title, stationName, sheetNo, scaleText, totalSheets }) {
    const p = Math.min(0.2, height * 0.04);
    // Bingkai luar dan dalam
    [[x, y, x + width, y], [x + width, y, x + width, y + height],
     [x + width, y + height, x, y + height], [x, y + height, x, y],
     [x + p, y + p, x + width - p, y + p], [x + width - p, y + p, x + width - p, y + height - p],
     [x + width - p, y + height - p, x + p, y + height - p], [x + p, y + height - p, x + p, y + p]
    ].forEach(([x1, y1, x2, y2]) => drawLine('SURV_KOP', x1, y1, x2, y2));

    const cols = [0.23, 0.43, 0.59, 0.76, 0.89].map(f => x + width * f);
    cols.forEach(dx => drawLine('SURV_KOP', dx, y + p, dx, y + height - p));

    const tH = Math.max(0.18, height * 0.08), tS = Math.max(0.14, height * 0.06);
    drawText('SURV_TEKS_INFO', 'PEMERINTAH KABUPATEN KARAWANG',          x + p + 0.3, y + height - p - tH * 1.5, tH, 0);
    drawText('SURV_TEKS_INFO', 'DINAS PEKERJAAN UMUM DAN PENATAAN RUANG', x + p + 0.3, y + height - p - tH * 2.8, tH * 0.88, 0);
    drawText('SURV_TEKS_INFO', 'Jl. Dewi Sartika No. 1 Karawang',        x + p + 0.3, y + p + tS * 1.2, tS, 0);
    drawText('SURV_KOP', 'NAMA PAKET PEKERJAAN :', cols[0] + 0.3, y + height - p - tH * 1.4, tS, 0);
    drawText('SURV_TEKS_INFO', 'PENINGKATAN JALAN AKSES',                 cols[0] + 0.3, y + height - p - tH * 2.8, tH, 0);
    drawText('SURV_TEKS_INFO', 'TOL KARAWANG BARAT',                      cols[0] + 0.3, y + height - p - tH * 4.0, tH, 0);
    drawText('SURV_KOP', 'PENYEDIA JASA :',                               cols[1] + 0.3, y + height - p - tH * 1.4, tS, 0);
    drawText('SURV_TEKS_INFO', 'CV. ASPIRASI LUHUR',                      cols[1] + 0.3, y + height - p - tH * 2.8, tH, 0);
    drawText('SURV_TEKS_INFO', 'DIMAS HENDRIWIANTO',                      cols[1] + 0.3, y + p + tS * 2.2, tS * 1.1, 0);
    drawText('SURV_KOP', 'Direktur',                                      cols[1] + 0.3, y + p + tS * 0.8, tS * 0.9, 0);
    drawText('SURV_KOP', 'DIPERIKSA OLEH :',                             cols[2] + 0.3, y + height - p - tH * 1.4, tS, 0);
    drawText('SURV_TEKS_INFO', 'PENGAWAS LAPANGAN DINAS PUPR KAB. KARAWANG', cols[2] + 0.3, y + height - p - tH * 2.6, tS * 0.92, 0);
    drawText('SURV_TEKS_INFO', '1. M. SHOFARUDDIN',                      cols[2] + 0.3, y + p + tS * 2.5, tS * 0.9, 0);
    drawText('SURV_TEKS_INFO', '2. HENDRA',                              cols[2] + 0.3, y + p + tS * 1.0, tS * 0.9, 0);
    drawText('SURV_KOP', 'JUDUL GAMBAR :',                               cols[3] + 0.3, y + height - p - tH * 1.4, tS, 0);
    drawText('SURV_TEKS_INFO', title || '',                                cols[3] + 0.3, y + height - p - tH * 2.8, tH, 0);
    if (stationName) drawText('SURV_TEKS_INFO', stationName,             cols[3] + 0.3, y + p + tS * 1.2, tH, 0);
    const rH = (height - 2 * p) / 3, yR1 = y + height - p - rH, yR2 = y + height - p - 2 * rH;
    drawLine('SURV_KOP', cols[4], yR1, x + width - p, yR1);
    drawLine('SURV_KOP', cols[4], yR2, x + width - p, yR2);
    drawText('SURV_KOP', 'NO. GAMBAR', cols[4] + 0.3, yR1 + rH - tS * 1.3, tS * 0.8, 0);
    drawText('SURV_TEKS_INFO', sheetNo || '', cols[4] + 0.3, yR1 + tS * 0.4, tH, 0);
    drawText('SURV_KOP', 'SKALA', cols[4] + 0.3, yR2 + rH - tS * 1.3, tS * 0.8, 0);
    drawText('SURV_TEKS_INFO', scaleText || '', cols[4] + 0.3, yR2 + tS * 0.4, tS * 0.95, 0);
    drawText('SURV_KOP', 'JML. GAMBAR', cols[4] + 0.3, y + p + rH - tS * 1.3, tS * 0.8, 0);
    drawText('SURV_TEKS_INFO', totalSheets || '', cols[4] + 0.3, y + p + tS * 0.4, tH, 0);
  }

  // Hitung bounding box titik koordinat nyata seluruh proyek
  const allRealPts = segList.flatMap(seg => {
    const pts = (seg.allPoints && seg.allPoints.length > 0)
      ? seg.allPoints
      : (seg.stations || []).flatMap(s => s.points || []);
    return pts;
  }).filter(p => p && isFinite(p.x) && isFinite(p.y));

  let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
  allRealPts.forEach(p => {
    if (p.x < gMinX) gMinX = p.x;
    if (p.y < gMinY) gMinY = p.y;
    if (p.x > gMaxX) gMaxX = p.x;
    if (p.y > gMaxY) gMaxY = p.y;
  });
  if (!isFinite(gMinX)) { gMinX = 0; gMinY = 0; gMaxX = 100; gMaxY = 100; }

  // Strategi Penempatan Profil agar Zoom Civil 3D Tidak Jauh:
  // Jika Denah ON: Profil diletakkan tepat di bawah Denah (selisih Y hanya 40-60m).
  // Jika Denah OFF: Profil diletakkan di (0, 0) sebagai gambar kerja mandiri.
  const profileAnchorX = includeAlignment ? gMinX : 0;
  const GAP_BELOW_PLAN = Math.max(40, (gMaxY - gMinY) * 0.2 + 50);
  let profileBaseY = includeAlignment ? (gMinY - GAP_BELOW_PLAN) : 100;

  const totalSheetsCount = segList.reduce((n, seg) => n + 2 + (seg.stations?.length || 0), 0);
  let sheetIndex = 1;

  // --- PROSES SETIAP SEGMEN ---
  segList.forEach((seg, segIdx) => {
    const segStations = seg.stations;
    if (!segStations || segStations.length === 0) return;
    const segName = seg.name || `Ruas ${segIdx + 1}`;

    // Pastikan titik as (clPoint) terdefinisi
    segStations.forEach(s => {
      if (!s.clPoint && s.points && s.points.length > 0) {
        const byCode = s.points.find(p => p.role === 'CL' || /^cl\b/i.test(p.code || '') || /^as\b/i.test(p.code || ''));
        const byOffset = s.points.find(p => Math.abs(p.offset || 0) < 0.05);
        s.clPoint = byCode || byOffset || s.points[Math.floor(s.points.length / 2)];
      }
    });

    const clSta = segStations.filter(s => !!s.clPoint);
    if (clSta.length === 0) return;

    // Hitung jarak parsial dan kumulatif
    let runningDist = 0;
    clSta.forEach((s, idx) => {
      if (idx > 0) {
        const d = Math.hypot(s.clPoint.x - clSta[idx - 1].clPoint.x, s.clPoint.y - clSta[idx - 1].clPoint.y);
        runningDist += d;
        if (!s.partialDist) s.partialDist = d;
        if (!s.cumulativeDist) s.cumulativeDist = runningDist;
      } else {
        if (s.cumulativeDist == null) s.cumulativeDist = 0;
        if (s.partialDist == null) s.partialDist = 0;
      }
    });

    // ==========================================
    // 1. DENAH TRASE KOORDINAT NYATA (UTM)
    // ==========================================
    if (includeAlignment) {
      const ptsAll = (seg.allPoints && seg.allPoints.length > 0)
        ? seg.allPoints
        : segStations.flatMap(s => s.points || []);

      if (ptsAll.length > 0) {
        // 1a. Titik survei 3D (X, Y, Z) di koordinat nyata
        ptsAll.forEach(p => {
          drawSurveyNode('SURV_TITIK_SURVEI', p.x, p.y, p.z, p.id ?? p.no, p.code, true);
        });

        // 1b. Garis as jalan memanjang (3D Polyline)
        const clPts = clSta.map(s => ({ x: s.clPoint.x, y: s.clPoint.y, z: s.clPoint.z || 0 }));
        if (clPts.length > 1) {
          drawPolyline3D('SURV_AS_JALAN', clPts, 'CENTER');
        }

        // Marker stasiun di tiap as
        clSta.forEach(s => {
          drawCircle('SURV_AS_JALAN', s.clPoint.x, s.clPoint.y, 0.45);
          drawText('SURV_AS_JALAN', s.stationName, s.clPoint.x + 0.6, s.clPoint.y + 0.6, 0.4, 0);
        });

        // 1c. Garis potongan melintang tiap stasiun di denah (3D Polyline)
        segStations.forEach(s => {
          if (!s.points || s.points.length === 0) return;
          const sorted = [...s.points].sort((a, b) => a.offset - b.offset);
          if (sorted.length > 1) {
            drawPolyline3D('SURV_GARIS_CROSS', sorted.map(p => ({ x: p.x, y: p.y, z: p.z || 0 })));
            drawText('SURV_GARIS_CROSS', `POT. ${s.stationName}`, sorted[0].x - 1.2, sorted[0].y, 0.32, 0, 2);
          }
        });

        // 1d. Garis tepi jalan kiri dan kanan (3D Polyline)
        const leftEdgePts = segStations.map(s => {
          if (!s.points || s.points.length === 0) return null;
          return [...s.points].sort((a, b) => a.offset - b.offset)[0];
        }).filter(Boolean);
        if (leftEdgePts.length > 1) {
          drawPolyline3D('SURV_TEPI_JALAN', leftEdgePts.map(p => ({ x: p.x, y: p.y, z: p.z || 0 })));
        }

        const rightEdgePts = segStations.map(s => {
          if (!s.points || s.points.length === 0) return null;
          const srt = [...s.points].sort((a, b) => a.offset - b.offset);
          return srt[srt.length - 1];
        }).filter(Boolean);
        if (rightEdgePts.length > 1) {
          drawPolyline3D('SURV_TEPI_JALAN', rightEdgePts.map(p => ({ x: p.x, y: p.y, z: p.z || 0 })));
        }

        // Info Sistem Koordinat & Zona UTM di samping Denah
        const infoX = gMinX;
        const infoY = gMaxY + 4;
        drawText('SURV_TEKS_INFO', `KOORDINAT: WGS 84 / UTM ZONE ${utmZone.toUpperCase()}`, infoX, infoY, 0.5, 0);

        // 1e. Kop Dinas PUPR untuk Denah (jika ON)
        if (includeKop) {
          const xs = ptsAll.map(p => p.x).filter(isFinite);
          const ys = ptsAll.map(p => p.y).filter(isFinite);
          const pMinX = Math.min(...xs), pMaxX = Math.max(...xs), pMaxY = Math.max(...ys);
          drawKop({
            x: pMinX - 10,
            y: pMaxY + 8,
            width: Math.max(90, pMaxX - pMinX + 30),
            height: 7.5,
            title: segList.length > 1 ? `DENAH TRASE & TITIK UKUR (${segName.toUpperCase()})` : 'DENAH SITUASI TRASE & TITIK UKUR',
            stationName: `${segStations[0].stationName} s/d ${segStations[segStations.length - 1].stationName}`,
            sheetNo: `D-${String(sheetIndex).padStart(2, '0')}`,
            scaleText: '1 : 1000',
            totalSheets: `${sheetIndex}/${totalSheetsCount}`,
          });
          sheetIndex++;
        }
      }
    }

    // ==========================================
    // 2. PROFIL MEMANJANG (LONG SECTION)
    // ==========================================
    if (includeProfiles) {
      const clElevations = clSta.map(s => s.clPoint.z || 0);
      const minElev = Math.min(...clElevations);
      const maxElev = Math.max(...clElevations);
      const datumElev = Math.floor(minElev - datumMargin);
      const topElev = Math.ceil(maxElev + 1.5);
      const vDistort = hScaleLong / vScaleLong;
      const totalLength = clSta[clSta.length - 1].cumulativeDist || 10;
      const profileHeight = (topElev - datumElev) * vDistort;

      const longOriginX = profileAnchorX;
      const longOriginY = profileBaseY;
      const labelColW = 25;

      // Kop PUPR Long Section (jika ON)
      if (includeKop) {
        drawKop({
          x: longOriginX - labelColW,
          y: longOriginY + profileHeight + 3.5,
          width: Math.max(90, totalLength + labelColW + 10),
          height: 7.5,
          title: segList.length > 1 ? `POTONGAN MEMANJANG (${segName.toUpperCase()})` : 'POTONGAN MEMANJANG',
          stationName: `${segStations[0].stationName} s/d ${segStations[segStations.length - 1].stationName}`,
          sheetNo: `A-${String(sheetIndex).padStart(2, '0')}`,
          scaleText: `H 1:${hScaleLong}  V 1:${vScaleLong}`,
          totalSheets: `${sheetIndex}/${totalSheetsCount}`,
        });
        sheetIndex++;
      }

      // Garis grid horizontal elevasi
      for (let el = datumElev; el <= topElev; el += 1) {
        const gridY = longOriginY + (el - datumElev) * vDistort;
        drawLine('SURV_GRID', longOriginX - 2, gridY, longOriginX + totalLength + 2, gridY);
        drawText('SURV_TEKS_INFO', `+${el.toFixed(2)}`, longOriginX - 8, gridY - 0.2, 0.45, 0, 2);
      }

      // Garis grid vertikal di setiap stasiun
      clSta.forEach(s => {
        const sx = longOriginX + s.cumulativeDist;
        drawLine('SURV_GRID', sx, longOriginY, sx, longOriginY + profileHeight);
      });

      // Profil tanah eksisting (EGL)
      drawPolyline2D('SURV_EGL_TANAH', clSta.map(s => ({
        x: longOriginX + s.cumulativeDist,
        y: longOriginY + (s.clPoint.z - datumElev) * vDistort,
      })));

      // Profil rencana (FGL) jika ON
      if (includeDesignFgl) {
        drawPolyline2D('SURV_ELEVASI_RENCANA', clSta.map(s => {
          const fz = isFinite(s.clPoint?.fglZ) ? s.clPoint.fglZ
                   : isFinite(s.fglElev)        ? s.fglElev
                   : (s.clPoint?.z || 0);
          return {
            x: longOriginX + s.cumulativeDist,
            y: longOriginY + (fz - datumElev) * vDistort,
          };
        }));
      }

      // Tabel data band
      const bandRowH = 2.5;
      const bandRows = includeDesignFgl ? 4 : 3;
      const bandTopY = longOriginY;
      const bandBottomY = bandTopY - bandRows * bandRowH;

      for (let r = 0; r <= bandRows; r++) {
        drawLine('SURV_TABEL_BAND', longOriginX - labelColW, bandTopY - r * bandRowH, longOriginX + totalLength, bandTopY - r * bandRowH);
      }
      drawLine('SURV_TABEL_BAND', longOriginX - labelColW, bandTopY, longOriginX - labelColW, bandBottomY);
      drawLine('SURV_TABEL_BAND', longOriginX, bandTopY, longOriginX, bandBottomY);
      drawLine('SURV_TABEL_BAND', longOriginX + totalLength, bandTopY, longOriginX + totalLength, bandBottomY);

      let rIdx = 0;
      drawText('SURV_TEKS_INFO', 'ELEVASI TANAH ASLI (m)', longOriginX - labelColW + 1, bandTopY - (rIdx + 0.5) * bandRowH - 0.2, 0.45, 0);
      rIdx++;
      if (includeDesignFgl) {
        drawText('SURV_ELEVASI_RENCANA', 'ELEVASI RENCANA (m)', longOriginX - labelColW + 1, bandTopY - (rIdx + 0.5) * bandRowH - 0.2, 0.45, 0);
        rIdx++;
      }
      drawText('SURV_TEKS_INFO', 'JARAK PARSIAL (m)', longOriginX - labelColW + 1, bandTopY - (rIdx + 0.5) * bandRowH - 0.2, 0.45, 0);
      rIdx++;
      drawText('SURV_TEKS_INFO', 'JARAK AKUMULATIF (STA)', longOriginX - labelColW + 1, bandTopY - (rIdx + 0.5) * bandRowH - 0.2, 0.45, 0);

      segStations.forEach((s, idx) => {
        const sx = longOriginX + s.cumulativeDist;
        drawLine('SURV_TABEL_BAND', sx, bandTopY, sx, bandBottomY);
        let dr = 0;
        if (s.clPoint) {
          drawText('SURV_TEKS_INFO', (s.clPoint.z || 0).toFixed(3), sx + 0.3, bandTopY - (dr + 1) * bandRowH + 0.3, 0.4, 90);
          dr++;
        }
        if (includeDesignFgl) {
          const fz = isFinite(s.clPoint?.fglZ) ? s.clPoint.fglZ : isFinite(s.fglElev) ? s.fglElev : (s.clPoint?.z || 0);
          drawText('SURV_ELEVASI_RENCANA', fz.toFixed(3), sx + 0.3, bandTopY - (dr + 1) * bandRowH + 0.3, 0.4, 90);
          dr++;
        }
        if (idx > 0) {
          const prevSx = longOriginX + segStations[idx - 1].cumulativeDist;
          drawText('SURV_TEKS_INFO', (s.partialDist || 0).toFixed(2), (prevSx + sx) / 2, bandTopY - (dr + 0.5) * bandRowH - 0.2, 0.4, 0, 1);
        }
        dr++;
        drawText('SURV_TEKS_INFO', s.stationName, sx + 0.3, bandTopY - (dr + 1) * bandRowH + 0.3, 0.4, 90);
      });

      // ==========================================
      // 3. POTONGAN MELINTANG (CROSS SECTIONS)
      // ==========================================
      const csBaseY = bandBottomY - 20;
      const cols = 2, csColSpacing = 52, csRowSpacing = 30;
      const rowsCount = Math.ceil(segStations.length / cols);

      segStations.forEach((sta, sIdx) => {
        const col = sIdx % cols, row = Math.floor(sIdx / cols);
        const ox = longOriginX + col * csColSpacing + 15;
        const oy = csBaseY - row * csRowSpacing;

        const pts = sta.points;
        if (!pts || pts.length === 0) return;
        const zVals = pts.map(p => p.z || 0).filter(isFinite);
        if (zVals.length === 0) return;

        const csDatum = Math.floor(Math.min(...zVals) - 1.0);
        const csTop = Math.max(csDatum + 5, Math.ceil(Math.max(...zVals) + 1.0));
        const csH = csTop - csDatum;

        const offs = pts.map(p => p.offset || 0).filter(isFinite);
        const span = Math.max(Math.abs(Math.min(...offs)), Math.abs(Math.max(...offs)), 8);
        const half = Math.max(10, Math.ceil(span + 1));
        const xGL = ox - half, xGR = ox + half;
        const lblWcs = 5.2, tblL = xGL - lblWcs, tblR = xGR;

        // Kop PUPR Cross Section (jika ON)
        if (includeKop) {
          drawKop({
            x: tblL,
            y: oy + csH + 3.0,
            width: Math.max(30, tblR - tblL),
            height: 4.2,
            title: segList.length > 1 ? `POT. MELINTANG - ${segName.toUpperCase()}` : 'POTONGAN MELINTANG',
            stationName: sta.stationName,
            sheetNo: `B-${String(sheetIndex).padStart(2, '0')}`,
            scaleText: `1 : ${hScaleCross}`,
            totalSheets: `${sheetIndex}/${totalSheetsCount}`,
          });
          sheetIndex++;
        }

        // Tanda CL (As Jalan)
        drawText('SURV_AS_JALAN', 'CL', ox, oy + csH + 0.6, 0.55, 0, 1);
        drawLine('SURV_AS_JALAN', ox, oy, ox, oy + csH, 'CENTER');

        // Garis elevasi horizontal
        for (let el = csDatum; el <= csTop; el += 1) {
          const gy = oy + (el - csDatum);
          drawLine('SURV_GRID', xGL, gy, xGR, gy);
          drawLine('SURV_GRID', xGL - 0.25, gy, xGL, gy);
          drawText('SURV_TEKS_INFO', el.toFixed(2), xGL - 0.40, gy - 0.12, 0.28, 0, 2);
        }
        drawText('SURV_TEKS_INFO', 'ELEVATION', xGL - 2.1, oy + csH / 2, 0.32, 90, 1);

        // Segitiga skala
        const tSz = 1.4, tR = xGL - 2.8, tL = tR - tSz;
        const tLay = includeDesignFgl ? 'SURV_ELEVASI_RENCANA' : 'SURV_TEKS_INFO';
        drawLine(tLay, tL, oy, tL, oy + tSz);
        drawLine(tLay, tL, oy, tR, oy);
        drawLine(tLay, tL, oy + tSz, tR, oy);
        drawText(tLay, `1:${vScaleCross || hScaleCross}`, tL - 0.25, oy + tSz / 2, 0.22, 90, 1);
        drawText(tLay, `1:${hScaleCross}`, tL + tSz / 2, oy - 0.35, 0.22, 0, 1);

        // Grid vertikal offset (-10 s/d +10)
        for (let m = -half; m <= half; m += 1) {
          const gx = ox + m;
          if (m !== 0) drawLine('SURV_GRID', gx, oy, gx, oy + csH);
          drawLine('SURV_GRID', gx, oy - 0.20, gx, oy);
          drawText('SURV_TEKS_INFO', String(m), gx, oy - 0.55, 0.26, 0, 1);
          if (m + 0.5 <= half) drawLine('SURV_GRID', gx + 0.5, oy - 0.10, gx + 0.5, oy);
        }
        drawLine('SURV_GRID', xGL, oy, xGR, oy);
        drawLine('SURV_GRID', xGL, oy + csH, xGR, oy + csH);
        drawLine('SURV_GRID', xGL, oy, xGL, oy + csH);
        drawLine('SURV_GRID', xGR, oy, xGR, oy + csH);

        // Profil melintang eksisting (EGL)
        drawPolyline2D('SURV_EGL_TANAH', pts.map(p => ({
          x: ox + (p.offset || 0),
          y: oy + ((p.z || 0) - csDatum),
        })));

        // Profil melintang rencana (FGL) jika ON
        if (includeDesignFgl) {
          drawPolyline2D('SURV_ELEVASI_RENCANA', pts.map(p => {
            const fz = isFinite(p.fglZ) ? p.fglZ : (p.z || 0);
            return { x: ox + (p.offset || 0), y: oy + (fz - csDatum) };
          }));
        }

        // Tabel data band penampang melintang
        const bCnt = includeDesignFgl ? 2 : 1, bH = 1.8;
        const bTop = oy - 0.95, bBot = bTop - bCnt * bH;
        drawLine('SURV_TABEL_BAND', tblL, bTop, tblR, bTop);
        if (includeDesignFgl) drawLine('SURV_TABEL_BAND', tblL, bTop - bH, tblR, bTop - bH);
        drawLine('SURV_TABEL_BAND', tblL, bBot, tblR, bBot);
        drawLine('SURV_TABEL_BAND', tblL, bTop, tblL, bBot);
        drawLine('SURV_TABEL_BAND', xGL, bTop, xGL, bBot);
        drawLine('SURV_TABEL_BAND', tblR, bTop, tblR, bBot);

        const ccx = tblL + lblWcs / 2;
        if (includeDesignFgl) {
          drawText('SURV_ELEVASI_RENCANA', 'ELEVASI RENCANA', ccx, bTop - bH / 2, 0.28, 0, 1);
          drawText('SURV_ELEVASI_EXISTING', 'ELEVASI EXISTING', ccx, bBot + bH / 2, 0.28, 0, 1);
        } else {
          drawText('SURV_ELEVASI_EXISTING', 'ELEVASI EXISTING', ccx, bBot + bH / 2, 0.28, 0, 1);
        }

        pts.forEach(p => {
          const px = ox + (p.offset || 0);
          const isCL = Math.abs(p.offset || 0) < 0.05;
          drawLine(isCL ? 'SURV_AS_JALAN' : 'SURV_TABEL_BAND', px, bTop, px, bBot);
          if (includeDesignFgl) {
            const fz = isFinite(p.fglZ) ? p.fglZ : (p.z || 0);
            drawText('SURV_ELEVASI_RENCANA', fz.toFixed(3), px + 0.12, bTop - bH + 0.20, 0.26, 90);
            drawText('SURV_ELEVASI_EXISTING', (p.z || 0).toFixed(3), px + 0.12, bBot + 0.20, 0.26, 90);
          } else {
            drawText('SURV_ELEVASI_EXISTING', (p.z || 0).toFixed(3), px + 0.12, bBot + 0.20, 0.26, 90);
          }
        });

        drawText('SURV_TEKS_INFO', `STA  ${sta.stationName.replace(/^STA\s*/i, '')}`, ox, bBot - 1.2, 0.6, 0, 1);
      });

      profileBaseY = csBaseY - rowsCount * csRowSpacing - 75;
    }
  });

  // --- HITUNG EXTENTS AKHIR & VIEWPORT DARI BOUNDING BOX AKTUAL ---
  const extMinX = isFinite(bMinX) ? bMinX - 10 : -100;
  const extMinY = isFinite(bMinY) ? bMinY - 10 : -100;
  const extMinZ = isFinite(bMinZ) ? Math.floor(bMinZ - 10) : 0;
  const extMaxX = isFinite(bMaxX) ? bMaxX + 10 : 1000;
  const extMaxY = isFinite(bMaxY) ? bMaxY + 10 : 1000;
  const extMaxZ = isFinite(bMaxZ) ? Math.ceil(bMaxZ + 10) : 100;
  const viewCX = (extMinX + extMaxX) / 2;
  const viewCY = (extMinY + extMaxY) / 2;
  const viewH = Math.max(extMaxY - extMinY, 10);
  const viewW = Math.max(extMaxX - extMinX, 10);
  const viewAspect = viewW / viewH;

  // LTSCALE adaptif (agar CENTER/DASHED terlihat proporsional)
  const surveySpan = Math.max(viewW, viewH);
  const ltScale = Math.max(1, Math.round(surveySpan / 500));

  // --- SUSUN BERKAS DXF AC1009 MURNI ---
  const out = [];
  function w(code, val) {
    out.push(typeof code === 'number' ? code.toString() : String(code));
    out.push(val != null ? String(val) : '');
  }

  // 1. HEADER SECTION
  w(0, 'SECTION');
  w(2, 'HEADER');
  w(9, '$ACADVER');
  w(1, 'AC1009'); // AutoCAD Release 12 - universal compatibility for all AutoCAD & Civil 3D versions
  w(9, '$DWGCODEPAGE');
  w(3, 'ANSI_1252');
  w(9, '$INSBASE');
  w(10, '0.0000'); w(20, '0.0000'); w(30, '0.0000');
  w(9, '$EXTMIN');
  w(10, extMinX.toFixed(4)); w(20, extMinY.toFixed(4)); w(30, extMinZ.toFixed(4));
  w(9, '$EXTMAX');
  w(10, extMaxX.toFixed(4)); w(20, extMaxY.toFixed(4)); w(30, extMaxZ.toFixed(4));
  w(9, '$LIMMIN');
  w(10, extMinX.toFixed(4)); w(20, extMinY.toFixed(4));
  w(9, '$LIMMAX');
  w(10, extMaxX.toFixed(4)); w(20, extMaxY.toFixed(4));
  w(9, '$LTSCALE');
  w(40, ltScale.toFixed(4));
  w(9, '$TEXTSIZE');
  w(40, '0.2500');
  w(9, '$CLAYER');
  w(8, '0');
  w(0, 'ENDSEC');

  // 2. TABLES SECTION
  w(0, 'SECTION');
  w(2, 'TABLES');

  // VPORT Table: Format lengkap 28 group codes agar Civil 3D langsung memusatkan kamera
  w(0, 'TABLE');
  w(2, 'VPORT');
  w(70, 1);
  w(0, 'VPORT');
  w(2, '*ACTIVE');
  w(70, 0);
  w(10, '0.0000'); w(20, '0.0000'); // Sudut kiri bawah
  w(11, '1.0000'); w(21, '1.0000'); // Sudut kanan atas
  w(12, viewCX.toFixed(4)); w(22, viewCY.toFixed(4)); // Pusat pandangan (Center)
  w(13, '0.0000'); w(23, '0.0000'); // Snap base
  w(14, '0.5000'); w(24, '0.5000'); // Snap spacing
  w(15, '0.5000'); w(25, '0.5000'); // Grid spacing
  w(16, '0.0000'); w(26, '0.0000'); w(36, '1.0000'); // View direction
  w(17, '0.0000'); w(27, '0.0000'); w(37, '0.0000'); // View target
  w(40, viewH.toFixed(4)); // View height
  w(41, viewAspect.toFixed(4)); // View aspect ratio
  w(42, '50.0000'); // Lens length
  w(43, '0.0000'); // Front clip
  w(44, '0.0000'); // Back clip
  w(50, '0.0000'); // Snap rotation
  w(51, '0.0000'); // View twist
  w(71, 0); // View mode
  w(72, 1000); // Circle zoom
  w(73, 1); // Fast zoom
  w(74, 3); // UCSICON
  w(75, 0); // Snap off
  w(76, 0); // Grid off
  w(77, 0); // Snap style
  w(78, 0); // Snap isopair
  w(0, 'ENDTAB');

  // LTYPE Table: Hanya linetype geometris eksplisit untuk R12 (CONTINUOUS, DASHED, CENTER)
  w(0, 'TABLE');
  w(2, 'LTYPE');
  w(70, 3);
  // 1. CONTINUOUS
  w(0, 'LTYPE');
  w(2, 'CONTINUOUS');
  w(70, 0);
  w(3, 'Solid line');
  w(72, 65);
  w(73, 0);
  w(40, '0.0000');
  // 2. DASHED
  w(0, 'LTYPE');
  w(2, 'DASHED');
  w(70, 0);
  w(3, 'Dashed __ __ __');
  w(72, 65);
  w(73, 2);
  w(40, '1.0000');
  w(49, '0.5000');
  w(49, '-0.5000');
  // 3. CENTER
  w(0, 'LTYPE');
  w(2, 'CENTER');
  w(70, 0);
  w(3, 'Centerline ____ _ ____ _');
  w(72, 65);
  w(73, 4);
  w(40, '2.0000');
  w(49, '1.2500');
  w(49, '-0.2500');
  w(49, '0.2500');
  w(49, '-0.2500');
  w(0, 'ENDTAB');

  // LAYER Table
  const layerDefs = [
    { name: '0',                    color: 7, lt: 'CONTINUOUS' },
    { name: 'SURV_KOP',             color: 7, lt: 'CONTINUOUS' },
    { name: 'SURV_AS_JALAN',        color: 1, lt: 'CENTER' },
    { name: 'SURV_GARIS_CROSS',     color: 6, lt: 'CONTINUOUS' },
    { name: 'SURV_TITIK_SURVEI',    color: 3, lt: 'CONTINUOUS' },
    { name: 'SURV_NO_TITIK',        color: 7, lt: 'CONTINUOUS' },
    { name: 'SURV_KODE_TITIK',      color: 4, lt: 'CONTINUOUS' },
    { name: 'SURV_TEPI_JALAN',      color: 2, lt: 'CONTINUOUS' },
    { name: 'SURV_EGL_TANAH',       color: 3, lt: 'CONTINUOUS' },
    { name: 'SURV_GRID',            color: 8, lt: 'CONTINUOUS' },
    { name: 'SURV_TABEL_BAND',      color: 8, lt: 'CONTINUOUS' },
    { name: 'SURV_TEKS_INFO',       color: 7, lt: 'CONTINUOUS' },
    { name: 'SURV_ELEVASI_RENCANA', color: 5, lt: 'CONTINUOUS' },
    { name: 'SURV_ELEVASI_EXISTING', color: 1, lt: 'CONTINUOUS' },
    { name: 'SURV_DIMENSI',         color: 6, lt: 'CONTINUOUS' },
    { name: 'SURV_BETON',           color: 7, lt: 'CONTINUOUS' },
    { name: 'SURV_PASIR_ALAS',      color: 2, lt: 'CONTINUOUS' },
  ];

  w(0, 'TABLE');
  w(2, 'LAYER');
  w(70, layerDefs.length);
  layerDefs.forEach(l => {
    w(0, 'LAYER');
    w(2, l.name);
    w(70, 0);
    w(62, l.color);
    w(6, l.lt || 'CONTINUOUS');
  });
  w(0, 'ENDTAB');

  // STYLE Table
  w(0, 'TABLE');
  w(2, 'STYLE');
  w(70, 1);
  w(0, 'STYLE');
  w(2, 'STANDARD');
  w(70, 0);
  w(40, '0.0000');
  w(41, '1.0000');
  w(50, '0.0000');
  w(71, 0);
  w(42, '2.5000');
  w(3, 'txt');
  w(4, '');
  w(0, 'ENDTAB');

  // APPID Table
  w(0, 'TABLE');
  w(2, 'APPID');
  w(70, 1);
  w(0, 'APPID');
  w(2, 'ACAD');
  w(70, 0);
  w(0, 'ENDTAB');

  w(0, 'ENDSEC');

  // 3. BLOCKS SECTION (Clean R12 empty blocks - no illegal $Model_Space definitions)
  w(0, 'SECTION');
  w(2, 'BLOCKS');
  w(0, 'ENDSEC');

  // 4. ENTITIES SECTION
  w(0, 'SECTION');
  w(2, 'ENTITIES');
  entLines.forEach(l => out.push(l));
  w(0, 'ENDSEC');

  w(0, 'EOF');

  return out.join('\r\n') + '\r\n';
}
