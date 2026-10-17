import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Sliders,
  Image,
  FileImage,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Layers,
} from 'lucide-react';
import { saveSvgToPng, saveSvgToFile } from '../utils/saveExportUtils';
import {
  generateDefaultPvis,
  evaluateVerticalAlignment,
} from '../utils/verticalAlignment';
import OfficialPuprTitleBlock from './OfficialPuprTitleBlock';

export default function LongSectionView({
  stations = [],
  selectedStationIndex = 0,
  onExportDxf,
  activeSegmentName = '',
  activeSegmentColor = '#ef4444',
  intersections = [],
  _segments = [],
  _onSelectSegment,
}) {
  const [hScale, setHScale] = useState(1000);
  const [vScale, setVScale] = useState(100);
  const [datumOffset, setDatumOffset] = useState(1.5);
  const [zoom, setZoom] = useState(1);
  const [showVerticalDesign, setShowVerticalDesign] = useState(false);
  const [showKop, setShowKop] = useState(false);
  const [pvis, setPvis] = useState(() => generateDefaultPvis(stations));
  const [prevStations, setPrevStations] = useState(stations);
  if (stations !== prevStations) {
    setPrevStations(stations);
    if (stations && stations.length > 0 && (!pvis || pvis.length === 0)) {
      setPvis(generateDefaultPvis(stations));
    }
  }

  const scrollContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });


  // Calculate geometry
  const profileData = useMemo(() => {
    if (!stations || stations.length === 0) return null;

    const validStations = stations.filter((s) => !!s.clPoint);
    if (validStations.length === 0) return null;

    const clPoints = validStations.map((s) => {
      const intxn = intersections.find(
        (i) => i.mainStationName === s.stationName || i.branchStationName === s.stationName
      );
      const vAlign = evaluateVerticalAlignment(s.cumulativeDist, pvis);
      const designElev = vAlign.elev !== null ? vAlign.elev : s.clPoint.z;
      const cutFillDiff = designElev - s.clPoint.z;

      return {
        stationName: s.stationName,
        cumDist: s.cumulativeDist,
        partDist: s.partialDist,
        elev: s.clPoint.z,
        designElev,
        cutFillDiff,
        gradePct: vAlign.gradePct,
        inCurve: vAlign.inCurve,
        x: s.clPoint.x,
        y: s.clPoint.y,
        intersection: intxn,
      };
    });

    const allElevs = showVerticalDesign
      ? [...clPoints.map((p) => p.elev), ...clPoints.map((p) => p.designElev)]
      : clPoints.map((p) => p.elev);
    const minElev = Math.min(...allElevs);
    const maxElev = Math.max(...allElevs);
    const datum = Math.floor(minElev - datumOffset);
    const topElev = Math.ceil(maxElev + 1.0);

    const totalDist = clPoints[clPoints.length - 1].cumDist;

    const numRows = showVerticalDesign ? 5 : 3;
    const bandRowH = 42;
    const bandHeight = numRows * bandRowH;

    // SVG Drawing dimensions (in canvas units)
    const svgWidth = Math.max(980, (totalDist / (hScale / 1000)) * 10 + 280);
    const svgHeight = (showKop ? 430 : 360) + bandHeight;

    const margin = { left: 190, right: 60, top: showKop ? 115 : 65, bottom: bandHeight + 35 };
    const plotWidth = svgWidth - margin.left - margin.right;
    const plotHeight = svgHeight - margin.top - margin.bottom;

    // Scale factors
    const xScale = (d) => margin.left + (totalDist > 0 ? (d / totalDist) * plotWidth : 0);
    const yScale = (e) =>
      margin.top + plotHeight - ((e - datum) / Math.max(0.5, topElev - datum)) * plotHeight;

    // Grid elevations
    const elevSteps = [];
    for (let el = datum; el <= topElev; el += 0.5) {
      elevSteps.push(parseFloat(el.toFixed(1)));
    }

    return {
      clPoints,
      minElev,
      maxElev,
      datum,
      topElev,
      totalDist,
      svgWidth,
      svgHeight,
      margin,
      plotWidth,
      plotHeight,
      xScale,
      yScale,
      elevSteps,
      numRows,
      bandRowH,
      bandHeight,
      showVerticalDesign,
    };
  }, [stations, hScale, datumOffset, showVerticalDesign, pvis, intersections, showKop]);


  // Jump to STA 0+000
  const handleJumpToStart = useCallback(() => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
  }, []);

  // Jump to End STA
  const handleJumpToEnd = useCallback(() => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({
      left: scrollContainerRef.current.scrollWidth,
      behavior: 'smooth',
    });
  }, []);

  // Fit Entire Route to screen width
  const handleFitRoute = useCallback(() => {
    if (!scrollContainerRef.current || !profileData) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 64;
    const fitScale = Math.min(1.8, Math.max(0.35, containerWidth / profileData.svgWidth));
    setZoom(parseFloat(fitScale.toFixed(2)));
    setTimeout(handleJumpToStart, 60);
  }, [profileData, handleJumpToStart]);

  // Mouse drag-to-pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0 || !scrollContainerRef.current) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    if (e.cancelable) e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    scrollContainerRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
    scrollContainerRef.current.scrollTop = dragStartRef.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Native non-passive mouse wheel zoom (fixes browser "Unable to preventDefault inside passive event listener" error)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        setZoom((z) => Math.min(2.5, Math.max(0.4, parseFloat((z + delta).toFixed(2)))));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  if (!profileData) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Belum ada data stasiun untuk membuat profil memanjang.
      </div>
    );
  }

  const {
    clPoints,
    datum,
    svgWidth,
    svgHeight,
    margin,
    plotWidth,
    plotHeight,
    xScale,
    yScale,
    elevSteps,
    numRows,
    bandRowH,
    bandHeight,
  } = profileData;

  const bandTop = margin.top + plotHeight;
  const bandBottom = bandTop + bandHeight;
  const headerLeft = margin.left - 150;

  // Polyline points
  const pointsStr = clPoints.map((p) => `${xScale(p.cumDist)},${yScale(p.elev)}`).join(' ');

  // Stagger levels for elevation numbers on profile line
  const staggeredLevels = clPoints.map((p, idx) => {
    if (idx === 0) return 0;
    const prevX = xScale(clPoints[idx - 1].cumDist);
    const currX = xScale(p.cumDist);
    return currX - prevX < 48 ? 1 : 0;
  });

  const scaledWidth = Math.round(svgWidth * zoom);

  return (
    <div className="flex flex-col h-full bg-slate-100 select-none">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-slate-200 shrink-0 z-10 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {activeSegmentName && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-800 border border-slate-200">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: activeSegmentColor }}
              />
              <span>{activeSegmentName}</span>
            </div>
          )}

          {/* Scales */}
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1 font-bold text-slate-700 pl-1">
              <Sliders className="w-3.5 h-3.5 text-blue-600" /> Skala:
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">H:</span>
              <select
                value={hScale}
                onChange={(e) => setHScale(Number(e.target.value))}
                className="px-2 py-0.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
              >
                <option value="500">1:500</option>
                <option value="1000">1:1000</option>
                <option value="2000">1:2000</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">V:</span>
              <select
                value={vScale}
                onChange={(e) => setVScale(Number(e.target.value))}
                className="px-2 py-0.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
              >
                <option value="50">1:50</option>
                <option value="100">1:100</option>
                <option value="200">1:200</option>
              </select>
            </div>
            <div className="flex items-center gap-1 pl-1">
              <span className="text-slate-500 font-medium">Datum:</span>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="10"
                value={datumOffset}
                onChange={(e) => setDatumOffset(Number(e.target.value))}
                className="w-12 px-1 py-0.5 bg-white border border-slate-300 rounded text-slate-800 text-center font-semibold"
              />
              <span className="text-slate-400">m</span>
            </div>
          </div>

          {/* Quick Jump Buttons */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={handleJumpToStart}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 rounded border border-slate-200 font-bold text-xs shadow-2xs transition-colors"
              title="Geser langsung ke Titik Awal STA 0+000"
            >
              <ChevronsLeft className="w-4 h-4 text-blue-600" /> Ke STA 0+000
            </button>
            <button
              onClick={handleJumpToEnd}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 font-bold text-xs shadow-2xs transition-colors"
              title="Geser langsung ke Titik Akhir STA"
            >
              Ke Ujung STA <ChevronsRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, parseFloat((z - 0.15).toFixed(2))))}
              className="p-1 text-slate-700 hover:bg-white hover:text-blue-600 rounded transition-colors"
              title="Perkecil (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-700 min-w-[50px] text-center px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, parseFloat((z + 0.15).toFixed(2))))}
              className="p-1 text-slate-700 hover:bg-white hover:text-blue-600 rounded transition-colors"
              title="Perbesar (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                handleJumpToStart();
              }}
              className="p-1 text-slate-600 hover:bg-white hover:text-slate-900 rounded transition-colors"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitRoute}
              className="flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded border border-slate-200 transition-colors shadow-2xs"
              title="Sesuaikan seluruh trase dengan lebar layar"
            >
              <Maximize2 className="w-3 h-3 text-slate-600" /> Fit Trase
            </button>
          </div>

          {/* Vertical Profile Alignment Toggle */}
          <button
            onClick={() => setShowVerticalDesign(!showVerticalDesign)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              showVerticalDesign
                ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold shadow-xs'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
            title="Tampilkan garis alinyemen vertikal rencana (FGL) dan tinggi galian/timbunan"
          >
            <Layers className="w-3.5 h-3.5 text-rose-600" />
            <span>Alinyemen Vertikal: {showVerticalDesign ? 'ON' : 'OFF'}</span>
          </button>

          {/* Kop PUPR Toggle */}
          <button
            onClick={() => setShowKop(!showKop)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              showKop
                ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold shadow-xs'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
            title="Tampilkan Kop Standar PUPR Karawang pada profil memanjang"
          >
            <span>🏷️ Kop PUPR: {showKop ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveSvgToPng(document.getElementById('long-section-svg'), 'Profil_Memanjang_LongSection.png', 2)}

            className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
            title="Download gambar PNG resolusi tinggi"
          >
            <Image className="w-3.5 h-3.5 text-blue-600" /> Simpan PNG
          </button>
          <button
            onClick={() => saveSvgToFile(document.getElementById('long-section-svg'), 'Profil_Memanjang_LongSection.svg')}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
            title="Download gambar vektor SVG"
          >
            <FileImage className="w-3.5 h-3.5 text-emerald-600" /> SVG
          </button>
          <button
            onClick={onExportDxf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CAD (.DXF)
          </button>
        </div>
      </div>

      {/* Drawing Canvas Area (Free of flexbox justify-center scroll bugs!) */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex-1 overflow-auto p-6 bg-slate-200/70 cursor-grab active:cursor-grabbing relative"
      >
        <div
          style={{
            width: `${Math.max(scaledWidth + 48, 100)}px`,
            minWidth: '100%',
            display: 'flex',
            justifyContent: 'flex-start',
          }}
        >
          <div
            className="m-auto transition-transform origin-top-left"
            style={{
              width: `${svgWidth}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-300">
              <svg
                id="long-section-svg"
                width={svgWidth}
                height={svgHeight}
                className="font-sans select-none overflow-visible"
              >
                {/* Title Block Standar Dinas PUPR Karawang */}
                {showKop ? (
                  <OfficialPuprTitleBlock
                    x={15}
                    y={10}
                    width={svgWidth - 30}
                    height={76}
                    drawingTitle="POTONGAN MEMANJANG (LONG SECTION)"
                    stationName={stations && stations.length > 0 ? `${stations[0].stationName} s/d ${stations[stations.length - 1].stationName}` : ''}
                    sheetNo="B-01"
                    scaleText={`H 1:${hScale} / V 1:${vScale}`}
                    totalSheets="1/1"
                    isDark={false}
                  />
                ) : (
                  <>
                    <text x={margin.left} y={28} className="text-sm font-extrabold fill-slate-800 tracking-wider">
                      PROFIL MEMANJANG (LONGITUDINAL SECTION)
                    </text>
                    <text x={margin.left} y={46} className="text-xs font-medium fill-slate-500">
                      Skala Horisontal 1:{hScale}  |  Skala Vertikal 1:{vScale}  |  Datum Elevasi = +{datum.toFixed(2)} m
                    </text>
                  </>
                )}

                {/* Horizontal Grid Lines & Elevation Labels */}
                {elevSteps.map((el) => {
                  const y = yScale(el);
                  const isMajor = el % 1 === 0;
                  return (
                    <g key={`grid-y-${el}`}>
                      <line
                        x1={margin.left}
                        y1={y}
                        x2={margin.left + plotWidth}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeWidth={isMajor ? '1' : '0.6'}
                        strokeDasharray={isMajor ? '' : '3 3'}
                      />
                      <text
                        x={margin.left - 12}
                        y={y + 3.5}
                        textAnchor="end"
                        className="text-[10px] font-mono font-medium fill-slate-400"
                      >
                        +{el.toFixed(2)}
                      </text>
                    </g>
                  );
                })}

                {/* Horizontal Datum Line */}
                <line
                  x1={margin.left}
                  y1={bandTop}
                  x2={margin.left + plotWidth}
                  y2={bandTop}
                  stroke="#64748b"
                  strokeWidth="1.2"
                />
                <text
                  x={margin.left - 12}
                  y={bandTop - 5}
                  textAnchor="end"
                  className="text-[10px] font-mono font-bold fill-slate-600"
                >
                  Datum El. +{datum.toFixed(2)}
                </text>

                {/* Vertical Station Leader Lines into Grid */}
                {clPoints.map((p, idx) => {
                  const x = xScale(p.cumDist);
                  return (
                    <line
                      key={`station-line-${idx}`}
                      x1={x}
                      y1={margin.top}
                      x2={x}
                      y2={bandBottom}
                      stroke="#cbd5e1"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                  );
                })}

                {/* Ground Profile Line (EGL) */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Design Grade Profile Line (FGL) */}
                {showVerticalDesign && (
                  <g>
                    <polyline
                      points={clPoints.map((p) => `${xScale(p.cumDist)},${yScale(p.designElev)}`).join(' ')}
                      fill="none"
                      stroke="#e11d48"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {clPoints.map((p, idx) => {
                      const cx = xScale(p.cumDist);
                      const cy = yScale(p.designElev);
                      return (
                        <circle
                          key={`fgl-point-${idx}`}
                          cx={cx}
                          cy={cy}
                          r="4"
                          fill="#e11d48"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </g>
                )}


                {/* Node Points on Profile */}
                {clPoints.map((p, idx) => {
                  const cx = xScale(p.cumDist);
                  const cy = yScale(p.elev);
                  const isSelected = idx === selectedStationIndex;
                  const lvl = staggeredLevels[idx] || 0;
                  const labelY = cy - 8 - lvl * 15;

                  return (
                    <g key={`cl-point-${idx}`}>
                      {isSelected && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r="10"
                          fill="#f59e0b"
                          fillOpacity="0.25"
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="3 3"
                        />
                      )}

                      {lvl > 0 && (
                        <line
                          x1={cx}
                          y1={cy - 4}
                          x2={cx}
                          y2={labelY + 2}
                          stroke="#94a3b8"
                          strokeWidth="0.8"
                          strokeDasharray="1.5 1.5"
                        />
                      )}

                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 5.5 : 4}
                        fill={isSelected ? '#ea580c' : '#0284c7'}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />

                      <text
                        x={cx}
                        y={labelY}
                        textAnchor="middle"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        paintOrder="stroke fill"
                        className={`text-[9.5px] font-mono font-bold ${
                          isSelected ? 'fill-amber-600' : 'fill-sky-800'
                        }`}
                      >
                        +{p.elev.toFixed(3)}
                      </text>

                      {p.intersection && (
                        <g>
                          <line
                            x1={cx}
                            y1={cy - 6}
                            x2={cx}
                            y2={cy - 30}
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                            strokeDasharray="2 2"
                          />
                          <rect
                            x={cx - 36}
                            y={cy - 46}
                            width="72"
                            height="16"
                            rx="4"
                            fill="#fef3c7"
                            stroke="#f59e0b"
                            strokeWidth="1"
                          />
                          <text
                            x={cx}
                            y={cy - 34}
                            textAnchor="middle"
                            className="text-[9px] font-bold fill-amber-900"
                          >
                            🔀 Simpang
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* --- DATA BAND TABLE (TABEL KETERANGAN DI BAWAH) --- */}
                {/* Outer box of Data Band */}
                <rect
                  x={headerLeft}
                  y={bandTop}
                  width={plotWidth + (margin.left - headerLeft)}
                  height={numRows * bandRowH}
                  fill="#ffffff"
                  stroke="#334155"
                  strokeWidth="1.2"
                />

                {/* Header Title Column Background */}
                <rect
                  x={headerLeft}
                  y={bandTop}
                  width={margin.left - headerLeft}
                  height={numRows * bandRowH}
                  fill="#f8fafc"
                />

                {/* Horizontal divider lines */}
                {Array.from({ length: numRows - 1 }).map((_, rIdx) => (
                  <line
                    key={`div-line-${rIdx}`}
                    x1={headerLeft}
                    y1={bandTop + (rIdx + 1) * bandRowH}
                    x2={margin.left + plotWidth}
                    y2={bandTop + (rIdx + 1) * bandRowH}
                    stroke="#64748b"
                    strokeWidth="1"
                  />
                ))}

                {/* Title column vertical border */}
                <line
                  x1={margin.left}
                  y1={bandTop}
                  x2={margin.left}
                  y2={bandBottom}
                  stroke="#334155"
                  strokeWidth="1.2"
                />

                {/* Row Titles in Left Header (Vertically Centered in Row) */}
                {showVerticalDesign ? (
                  <>
                    <text
                      x={headerLeft + 12}
                      y={bandTop + 0.5 * bandRowH + 4}
                      className="text-[10px] font-extrabold fill-rose-700 tracking-tight"
                    >
                      ELEVASI RENCANA (m)
                    </text>
                    <text
                      x={headerLeft + 12}
                      y={bandTop + 1.5 * bandRowH + 4}
                      className="text-[10px] font-extrabold fill-slate-800 tracking-tight"
                    >
                      ELEVASI TANAH (m)
                    </text>
                    <text
                      x={headerLeft + 12}
                      y={bandTop + 2.5 * bandRowH + 4}
                      className="text-[10px] font-extrabold fill-indigo-700 tracking-tight"
                    >
                      GALIAN (-) / TIMBUNAN (+)
                    </text>
                    <text
                      x={headerLeft + 12}
                      y={bandTop + 3.5 * bandRowH + 4}
                      className="text-[10px] font-extrabold fill-slate-800 tracking-tight"
                    >
                      JARAK PARSIAL (m)
                    </text>
                    <text
                      x={headerLeft + 12}
                      y={bandTop + 4.5 * bandRowH + 4}
                      className="text-[10px] font-extrabold fill-slate-800 tracking-tight"
                    >
                      JARAK AKUMULATIF (STA)
                    </text>
                  </>
                ) : (
                  <>
                    <text
                      x={headerLeft + 12}
                      y={bandTop + 0.5 * bandRowH + 4}
                      className="text-[10.5px] font-extrabold fill-slate-800 tracking-tight"
                    >
                      ELEVASI TANAH (m)
                    </text>
                    <text
                      x={headerLeft + 12}
                      y={bandTop + 1.5 * bandRowH + 4}
                      className="text-[10.5px] font-extrabold fill-slate-800 tracking-tight"
                    >
                      JARAK PARSIAL (m)
                    </text>
                    <text
                      x={headerLeft + 12}
                      y={bandTop + 2.5 * bandRowH + 4}
                      className="text-[10.5px] font-extrabold fill-slate-800 tracking-tight"
                    >
                      JARAK AKUMULATIF (STA)
                    </text>
                  </>
                )}

                {/* Station Values inside Data Band Table */}
                {clPoints.map((p, idx) => {
                  const x = xScale(p.cumDist);
                  const isSelected = idx === selectedStationIndex;

                  return (
                    <g key={`band-val-${idx}`}>
                      {/* Vertical line at station */}
                      <line
                        x1={x}
                        y1={bandTop}
                        x2={x}
                        y2={bandBottom}
                        stroke={isSelected ? '#f59e0b' : '#94a3b8'}
                        strokeWidth={isSelected ? '1.5' : '0.8'}
                      />

                      {showVerticalDesign ? (
                        <>
                          {/* Row 0: FGL */}
                          <text
                            x={x}
                            y={bandTop + 0.5 * bandRowH}
                            textAnchor="middle"
                            transform={`rotate(-90, ${x}, ${bandTop + 0.5 * bandRowH})`}
                            className="text-[9px] font-mono font-bold fill-rose-700"
                          >
                            {p?.designElev != null ? p.designElev.toFixed(3) : '-'}
                          </text>

                          {/* Row 1: Elevation Tanah */}
                          <text
                            x={x}
                            y={bandTop + 1.5 * bandRowH}
                            textAnchor="middle"
                            transform={`rotate(-90, ${x}, ${bandTop + 1.5 * bandRowH})`}
                            className={`text-[9px] font-mono font-medium ${
                              isSelected ? 'fill-amber-700 font-bold' : 'fill-slate-800'
                            }`}
                          >
                            {p?.elev != null ? p.elev.toFixed(3) : '-'}
                          </text>

                          {/* Row 2: Cut / Fill */}
                          <text
                            x={x}
                            y={bandTop + 2.5 * bandRowH}
                            textAnchor="middle"
                            transform={`rotate(-90, ${x}, ${bandTop + 2.5 * bandRowH})`}
                            className={`text-[9px] font-mono font-bold ${
                              (p.cutFillDiff || 0) >= 0 ? 'fill-emerald-600' : 'fill-rose-600'
                            }`}
                          >
                            {p?.cutFillDiff != null
                              ? `${p.cutFillDiff > 0 ? '+' : ''}${p.cutFillDiff.toFixed(2)}`
                              : '-'}
                          </text>

                          {/* Row 3: Partial Distance */}
                          {idx > 0 && (
                            <text
                              x={(xScale(clPoints[idx - 1].cumDist) + x) / 2}
                              y={bandTop + 3.5 * bandRowH + 4}
                              textAnchor="middle"
                              className="text-[9px] font-mono fill-slate-600 font-semibold"
                            >
                              {p?.partDist != null ? p.partDist.toFixed(2) : '-'}
                            </text>
                          )}

                          {/* Row 4: Cumulative STA */}
                          <text
                            x={x}
                            y={bandTop + 4.5 * bandRowH}
                            textAnchor="middle"
                            transform={`rotate(-90, ${x}, ${bandTop + 4.5 * bandRowH})`}
                            className={`text-[9px] font-mono font-bold ${
                              isSelected ? 'fill-amber-700' : 'fill-blue-700'
                            }`}
                          >
                            {p.stationName}
                          </text>
                        </>
                      ) : (
                        <>
                          {/* Row 1: Elevation */}
                          <text
                            x={x}
                            y={bandTop + 0.5 * bandRowH}
                            textAnchor="middle"
                            transform={`rotate(-90, ${x}, ${bandTop + 0.5 * bandRowH})`}
                            className={`text-[9.5px] font-mono font-medium ${
                              isSelected ? 'fill-amber-700 font-bold' : 'fill-slate-800'
                            }`}
                          >
                            {p?.elev != null ? p.elev.toFixed(3) : '-'}
                          </text>

                          {/* Row 2: Partial Distance */}
                          {idx > 0 && (
                            <text
                              x={(xScale(clPoints[idx - 1].cumDist) + x) / 2}
                              y={bandTop + 1.5 * bandRowH + 4}
                              textAnchor="middle"
                              className="text-[9.5px] font-mono fill-slate-600 font-semibold"
                            >
                              {p?.partDist != null ? p.partDist.toFixed(2) : '-'}
                            </text>
                          )}

                          {/* Row 3: Cumulative STA */}
                          <text
                            x={x}
                            y={bandTop + 2.5 * bandRowH}
                            textAnchor="middle"
                            transform={`rotate(-90, ${x}, ${bandTop + 2.5 * bandRowH})`}
                            className={`text-[9.5px] font-mono font-bold ${
                              isSelected ? 'fill-amber-700' : 'fill-blue-700'
                            }`}
                          >
                            {p.stationName}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}

              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
