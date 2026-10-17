import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Grid,
  Maximize2,
  Download,
  Image,
  FileImage,
  ZoomIn,
  ZoomOut,
  Crosshair,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  ArrowRight,
  Moon,
  Sun,
  Move,
  Scale,
  Layers as LayersIcon,
} from 'lucide-react';
import { saveSvgToPng, saveSvgToFile } from '../utils/saveExportUtils';
import {
  generateDesignCrossSectionProfile,
  getGroundZAtOffset,
  DEFAULT_ROAD_TEMPLATE,
  ROAD_TEMPLATE_PRESETS,
} from '../utils/roadDesignTemplate';
import { calculateStationCutFillArea } from '../utils/earthworkCalculator';
import { sortStationPointsGeometrically } from '../utils/surveyParser';
import OfficialPuprTitleBlock from './OfficialPuprTitleBlock';

export default function CrossSectionView({
  stations = [],
  selectedStationIndex = 0,
  onExportDxf,
  activeSegmentName = '',
  activeSegmentColor = '#ef4444',
  intersections = [],
  segments = [],
  onSelectSegment,
  roadTemplate = DEFAULT_ROAD_TEMPLATE,
  onOpenEarthwork,
}) {
  const [activeStationIndex, setActiveStationIndex] = useState(
    selectedStationIndex >= 0 && selectedStationIndex < stations.length ? selectedStationIndex : 0
  );
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'all'
  const [scale, setScale] = useState(100); // 1:100
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const [pan, setPan] = useState({ x: 0, y: 0 }); // Free smooth panning coordinates
  const [cadTheme, setCadTheme] = useState('light'); // 'light' (White Paper) or 'dark' (CAD Blueprint)
  const [showDesign, setShowDesign] = useState(false);
  const [showKop, setShowKop] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(roadTemplate || DEFAULT_ROAD_TEMPLATE);

  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Auto-sync active station when user selects a station on map
  const [prevStationIndex, setPrevStationIndex] = useState(selectedStationIndex);
  if (selectedStationIndex !== prevStationIndex) {
    setPrevStationIndex(selectedStationIndex);
    if (selectedStationIndex >= 0 && selectedStationIndex < stations.length) {
      setActiveStationIndex(selectedStationIndex);
      setPan({ x: 0, y: 0 }); // Center view on station change
    }
  }

  // Center view to Centerline (CL)
  const handleJumpToCl = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const handleFitScreen = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Smooth mouse drag-to-pan handlers (AutoCAD / Figma style)
  const handleMouseDown = (e) => {
    // Allow left-click (0) or middle mouse button (1)
    if (e.button !== 0 && e.button !== 1) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    if (e.cancelable) e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Native non-passive mouse wheel zoom (fixes browser "Unable to preventDefault inside passive event listener" error)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.12 : -0.12;
      setZoom((z) => Math.min(3.0, Math.max(0.4, parseFloat((z + delta).toFixed(2)))));
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Quick pan nudge functions
  const handleNudge = (dx) => {
    setPan((p) => ({ ...p, x: p.x + dx }));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        if (e.altKey) {
          setActiveStationIndex((i) => Math.max(0, i - 1));
        } else {
          handleNudge(120);
        }
      } else if (e.key === 'ArrowRight') {
        if (e.altKey) {
          setActiveStationIndex((i) => Math.min(stations.length - 1, i + 1));
        } else {
          handleNudge(-120);
        }
      } else if (e.key === '0') {
        handleJumpToCl();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stations.length, handleJumpToCl]);

  if (!stations || stations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Belum ada data stasiun untuk membuat penampang melintang.
      </div>
    );
  }

  const currentStation = stations[activeStationIndex] || stations[0];
  const junctionAtCurrentStation = currentStation
    ? intersections.find(
        (i) =>
          i.mainStationName === currentStation.stationName ||
          i.branchStationName === currentStation.stationName
      )
    : null;

  const isDark = cadTheme === 'dark';

  return (
    <div className={`flex flex-col h-full select-none ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      {/* Top Toolbar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b shrink-0 z-20 shadow-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-wrap items-center gap-2.5">
          {activeSegmentName && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeSegmentColor }}
              />
              <span className="truncate max-w-[150px]">{activeSegmentName}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className={`flex p-0.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button
              onClick={() => {
                setViewMode('single');
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'single'
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-blue-600 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" /> Penampang Tunggal
            </button>
            <button
              onClick={() => {
                setViewMode('all');
                setZoom(0.85);
                setPan({ x: 0, y: 0 });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'all'
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-blue-600 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Tampilkan Semua STA ({stations.length})
            </button>
          </div>

          {/* Station Stepper in Single Mode */}
          {viewMode === 'single' && (
            <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <button
                disabled={activeStationIndex <= 0}
                onClick={() => {
                  setActiveStationIndex(0);
                  setPan({ x: 0, y: 0 });
                }}
                className={`p-1 rounded transition-colors disabled:opacity-30 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600'}`}
                title="Ke STA Pertama"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                disabled={activeStationIndex <= 0}
                onClick={() => {
                  setActiveStationIndex((i) => Math.max(0, i - 1));
                  setPan({ x: 0, y: 0 });
                }}
                className={`p-1 rounded transition-colors disabled:opacity-30 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600'}`}
                title="STA Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={activeStationIndex}
                onChange={(e) => {
                  setActiveStationIndex(Number(e.target.value));
                  setPan({ x: 0, y: 0 });
                }}
                className={`px-2 py-1 text-xs font-bold border rounded shadow-2xs cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-blue-400'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {stations.map((sta, idx) => (
                  <option key={sta.stationName} value={idx}>
                    {sta.stationName} ({sta.points.length} titik)
                  </option>
                ))}
              </select>

              <button
                disabled={activeStationIndex >= stations.length - 1}
                onClick={() => {
                  setActiveStationIndex((i) => Math.min(stations.length - 1, i + 1));
                  setPan({ x: 0, y: 0 });
                }}
                className={`p-1 rounded transition-colors disabled:opacity-30 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600'}`}
                title="STA Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={activeStationIndex >= stations.length - 1}
                onClick={() => {
                  setActiveStationIndex(stations.length - 1);
                  setPan({ x: 0, y: 0 });
                }}
                className={`p-1 rounded transition-colors disabled:opacity-30 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600'}`}
                title="Ke STA Terakhir"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Pan Controls */}
          <div className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <button
              onClick={() => handleNudge(140)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-white'
              }`}
              title="Geser Tampilan ke Kiri"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Geser Kiri</span>
            </button>
            <button
              onClick={handleJumpToCl}
              className="flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 text-xs font-bold rounded transition-colors"
              title="Pusatkan Tampilan ke As Jalan (CL)"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>As CL</span>
            </button>
            <button
              onClick={() => handleNudge(-140)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-white'
              }`}
              title="Geser Tampilan ke Kanan"
            >
              <span className="hidden sm:inline">Geser Kanan</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, parseFloat((z - 0.15).toFixed(2))))}
              className={`p-1.5 rounded transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-white'}`}
              title="Perkecil (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className={`text-xs font-mono font-bold min-w-[45px] text-center px-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3.0, parseFloat((z + 0.15).toFixed(2))))}
              className={`p-1.5 rounded transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-white'}`}
              title="Perbesar (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitScreen}
              className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-white'}`}
              title="Reset Zoom & Pusatkan (100%)"
            >
              Fit
            </button>
          </div>

          {/* Scale Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pl-1">
            <span className="font-bold">Skala:</span>
            <select
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className={`px-2 py-1 border rounded text-xs font-semibold cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-blue-400 font-bold'
                  : 'bg-slate-50 border-slate-300 text-slate-800 font-bold'
              }`}
            >
              <option value="25">1:25 (Detail 4x)</option>
              <option value="50">1:50 (Detail 2x)</option>
              <option value="100">1:100 (Standar 1x)</option>
              <option value="200">1:200 (Ringkas 0.5x)</option>
              <option value="500">1:500 (Koridor Lebar)</option>
            </select>
          </div>

          <div className={`w-px h-5 mx-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

          {/* Design Road Template & FGL Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowDesign(!showDesign)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                showDesign
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Aktifkan/nonaktifkan garis rencana jalan tipikal Bina Marga"
            >
              <LayersIcon className="w-3.5 h-3.5" />
              <span>Desain FGL: {showDesign ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setShowKop(!showKop)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                showKop
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Aktifkan/nonaktifkan Kop Standar Dinas PUPR Karawang pada penampang melintang"
            >
              <span>🏷️ Kop PUPR: {showKop ? 'ON' : 'OFF'}</span>
            </button>

            {showDesign && (
              <select
                value={selectedTemplate.id}
                onChange={(e) => {
                  const found = ROAD_TEMPLATE_PRESETS.find((p) => p.id === e.target.value);
                  if (found) setSelectedTemplate(found);
                }}
                className={`px-2 py-1 border rounded text-xs font-semibold cursor-pointer max-w-[140px] truncate ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-sky-400 font-bold'
                    : 'bg-white border-slate-300 text-slate-800 font-bold'
                }`}
                title="Pilih standar tipikal badan jalan"
              >
                {ROAD_TEMPLATE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {onOpenEarthwork && (
              <button
                onClick={() => onOpenEarthwork(selectedTemplate)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                title="Buka laporan kubikasi volume galian dan timbunan"
              >
                <Scale className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kubikasi Tanah</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Tools: CAD Theme & Export */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setCadTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Ganti Tema Gambar Teknik (CAD Blueprint vs Kertas Putih)"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isDark ? 'Mode Kertas Putih' : 'Mode CAD Gelap'}</span>
          </button>

          <button
            onClick={onExportDxf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CAD (.DXF)
          </button>
        </div>
      </div>

      {/* Main Drawing View with Smooth Pan & Zoom */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 overflow-hidden relative flex items-center justify-center cursor-grab active:cursor-grabbing ${
          isDark
            ? 'bg-[#060a12] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]'
            : 'bg-slate-200/80 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]'
        }`}
      >
        {/* Drawing Canvas Container Transformed via Pan & Zoom */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.05s ease-out',
          }}
          className="will-change-transform"
        >
          {viewMode === 'single' ? (
            <div className="flex flex-col items-center" style={{ width: 'max-content' }}>
              {junctionAtCurrentStation && (
                <div className={`mb-3 px-4 py-2 rounded-xl text-xs flex items-center justify-between border shadow-xs w-full ${
                  isDark
                    ? 'bg-amber-950/60 border-amber-800 text-amber-200'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-bold text-[10px]">
                      🔀 TITIK TEMU SIMPANG
                    </span>
                    <span>
                      Stasiun <strong>{currentStation.stationName}</strong> bertaut dengan{' '}
                      <strong>
                        {junctionAtCurrentStation.mainStationName === currentStation.stationName
                          ? segments.find((s) => s.id === junctionAtCurrentStation.branchSegmentId)?.name || 'Ruas Cabang'
                          : segments.find((s) => s.id === junctionAtCurrentStation.mainSegmentId)?.name || 'Ruas Utama'}
                      </strong>.
                    </span>
                  </div>
                  {onSelectSegment && (
                    <button
                      onClick={() => {
                        const targetId =
                          junctionAtCurrentStation.mainStationName === currentStation.stationName
                            ? junctionAtCurrentStation.branchSegmentId
                            : junctionAtCurrentStation.mainSegmentId;
                        onSelectSegment(targetId);
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0 transition-colors shadow-xs"
                    >
                      ➔ Buka Ruas Terhubung
                    </button>
                  )}
                </div>
              )}

              <SingleCrossSectionCard
                station={currentStation}
                scale={scale}
                isDark={isDark}
                showDesign={showDesign}
                template={selectedTemplate}
                stationIndex={activeStationIndex}
                totalStationsCount={stations.length}
                showKop={showKop}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
              {stations.map((sta, sIdx) => (
                <div key={sta.stationName} style={{ width: 'max-content' }}>
                  <SingleCrossSectionCard
                    station={sta}
                    scale={scale}
                    isDark={isDark}
                    showDesign={showDesign}
                    template={selectedTemplate}
                    stationIndex={sIdx}
                    totalStationsCount={stations.length}
                    showKop={showKop}
                  />
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Floating Bottom Navigation Bar for Convenient Mouse Panning */}
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border backdrop-blur-md ${
          isDark
            ? 'bg-slate-900/90 border-slate-700 text-slate-200'
            : 'bg-white/95 border-slate-300 text-slate-700'
        }`}>
          <button
            onClick={() => handleNudge(180)}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold hover:bg-blue-500/20 hover:text-blue-500 transition-colors"
            title="Geser Kanvas ke Kiri"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Geser Kiri
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
          <button
            onClick={handleJumpToCl}
            className="flex items-center gap-1 px-2.5 py-1 text-red-500 hover:bg-red-500/10 rounded-full text-xs font-bold transition-colors"
            title="Pusatkan Tepat di As Jalan (CL)"
          >
            <Crosshair className="w-3.5 h-3.5" /> As CL
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
          <button
            onClick={() => handleNudge(-180)}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold hover:bg-blue-500/20 hover:text-blue-500 transition-colors"
            title="Geser Kanvas ke Kanan"
          >
            Geser Kanan <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
          <span className="text-[11px] font-mono text-slate-400 px-1">
            <Move className="w-3 h-3 inline mr-1" /> Drag untuk geser
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to interpolate design elevation Z at any offset from design points
 */
function getDesignZAtOffset(offset, designPoints) {
  if (!designPoints || designPoints.length === 0) return null;
  const sorted = [...designPoints].sort((a, b) => a.offset - b.offset);
  if (offset < sorted[0].offset - 1e-3 || offset > sorted[sorted.length - 1].offset + 1e-3) {
    return null;
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (offset >= p1.offset - 1e-4 && offset <= p2.offset + 1e-4) {
      const dx = p2.offset - p1.offset;
      if (Math.abs(dx) < 1e-6) return p1.z;
      const t = (offset - p1.offset) / dx;
      return p1.z + t * (p2.z - p1.z);
    }
  }
  return sorted[sorted.length - 1].z;
}

/**
 * High-Precision Civil Engineering Cross-Section Drawing Component
 * Formatted exactly according to standard road engineering layout:
 * - Red "CL" at top
 * - Metric coordinate grid with 1.00m horizontal lines & 1m vertical lines
 * - Left axis: elevation values, ruler ticks, "ELEVATION" label, and 1:100 scale triangle
 * - Bottom axis: offset numbers (-10, -9... 10) & ruler ticks
 * - 2-Row Data Band Table: "ELEVASI RENCANA" (Blue) & "ELEVASI EXISTING" (Red)
 * - Station Title below: "STA 0+425"
 */
function SingleCrossSectionCard({
  station,
  scale = 100,
  _width = 1060,
  isDark = false,
  showDesign = true,
  template = DEFAULT_ROAD_TEMPLATE,
  stationIndex = 0,
  totalStationsCount = 1,
  showKop = true,
}) {
  const svgRef = useRef(null);

  if (!station || !station.points || station.points.length === 0) {
    return (
      <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
        Tidak ada titik ukur pada stasiun ini.
      </div>
    );
  }

  const geomSortedPts = sortStationPointsGeometrically(station.points || [], station.clPoint);
  const rawPts = geomSortedPts.filter((p) => p.offset !== undefined && !isNaN(p.offset));
  if (rawPts.length === 0) return null;

  // Sort points from Left edge (negative offset) to Right edge (positive offset)
  const pts = [...rawPts].sort((a, b) => a.offset - b.offset);

  const offsets = pts.map((p) => p.offset);
  const elevs = pts.map((p) => p.z);

  const minOffset = Math.min(...offsets);
  const maxOffset = Math.max(...offsets);
  const minElev = Math.min(...elevs);
  const maxElev = Math.max(...elevs);

  // Centerline elevation
  const clZ = station.clPoint ? station.clPoint.z : (pts.find((p) => p.offset === 0)?.z ?? pts[Math.floor(pts.length / 2)].z);

  // Calculate Design Road Profile and Cut & Fill
  const designProfile = showDesign ? generateDesignCrossSectionProfile(clZ, template, pts) : null;
  const cutFill = showDesign && designProfile ? calculateStationCutFillArea(pts, designProfile) : { cutArea: 0, fillArea: 0 };

  // Calculate Grid Half Span in Meters (Symmetric around CL: e.g. -10 to +10)
  const maxOffsetAbs = Math.max(Math.abs(minOffset), Math.abs(maxOffset), 8);
  const gridHalfSpan = Math.max(10, Math.ceil(maxOffsetAbs + 1));
  const gridMinOffset = -gridHalfSpan;
  const gridMaxOffset = gridHalfSpan;

  const meterSteps = [];
  for (let m = gridMinOffset; m <= gridMaxOffset; m += 1) {
    meterSteps.push(m);
  }

  // Datum & Top Elevation calculation (whole 1.00m intervals)
  const minElevVal = Math.min(minElev, clZ);
  const maxElevVal = Math.max(maxElev, clZ);
  const gridMinElev = Math.floor(minElevVal - 1.0);
  const gridMaxElev = Math.max(gridMinElev + 5, Math.ceil(maxElevVal + 1.0));

  const elevSteps = [];
  for (let el = gridMinElev; el <= gridMaxElev + 0.001; el += 1.0) {
    elevSteps.push(parseFloat(el.toFixed(2)));
  }

  // Drawing Geometry scaled to standard Civil CAD ratios
  const numScale = Number(scale) || 100;
  const scaleRatio = 100 / numScale;

  const ppmX = Math.max(26, Math.round(38 * scaleRatio));
  const ppmY = Math.max(28, Math.round(36 * scaleRatio));

  const gridWidth = (gridMaxOffset - gridMinOffset) * ppmX;
  const gridHeight = (gridMaxElev - gridMinElev) * ppmY;

  const tableLeft = 25;
  const tableHeaderWidth = 145;
  const gridLeft = tableLeft + tableHeaderWidth;
  const gridRight = gridLeft + gridWidth;
  const clX = gridLeft + (0 - gridMinOffset) * ppmX;

  const gridTop = (showKop ? 115 : 45) + 35; // 35px space for CL label at top
  const gridBottom = gridTop + gridHeight;

  // Coordinate scales
  const xScale = (offset) => clX + offset * ppmX;
  const yScale = (elev) => gridBottom - (elev - gridMinElev) * ppmY;

  // Concrete Road Design Dimensions (Lebar 3.00m)
  const isConcrete = template?.isConcretePavement || template?.id === 'pembongkaran_beton_3m';
  const carriagewayHalfW = (template.laneWidth || 1.5) * Math.max(1, (template.lanesCount || 2) / 2); // 1.50m
  const concreteThick = template.concreteThickness || 0.20;
  const slope = template.crossSlope ?? -0.015;

  const leftEdgeX = -carriagewayHalfW;
  const rightEdgeX = carriagewayHalfW;
  const topLeftZ = clZ + Math.abs(leftEdgeX) * slope;
  const topRightZ = clZ + Math.abs(rightEdgeX) * slope;
  const bottomLeftZ = topLeftZ - concreteThick;
  const bottomRightZ = topRightZ - concreteThick;

  const dimY = yScale(clZ) - 24;

  // Table Data Band Layout (2 Rows: ELEVASI RENCANA & ELEVASI EXISTING)
  const tableTop = gridBottom + 26; // room for offset labels -10..10
  const rowH = 46;
  const tableBottom = tableTop + 2 * rowH;

  const staY = tableBottom + 35;
  const svgHeight = staY + 30;
  const svgWidth = Math.max(gridRight + 45, showKop ? 960 : 780);

  // Compile Key Points for the 2-Row Data Band Table (CL, Road edges, Survey points)
  const keyOffsets = [0];
  if (isConcrete) {
    keyOffsets.push(-carriagewayHalfW, carriagewayHalfW);
  }
  if (showDesign && designProfile && designProfile.designPoints) {
    designProfile.designPoints.forEach((dp) => {
      if (!keyOffsets.some((o) => Math.abs(o - dp.offset) < 0.25)) {
        keyOffsets.push(dp.offset);
      }
    });
  }
  pts.forEach((p) => {
    if (!keyOffsets.some((o) => Math.abs(o - p.offset) < 0.25)) {
      keyOffsets.push(p.offset);
    }
  });
  keyOffsets.sort((a, b) => a - b);

  const tablePoints = keyOffsets.map((offset) => {
    const existingZ = getGroundZAtOffset(offset, pts);
    let designZ = existingZ;
    if (showDesign) {
      if (isConcrete && Math.abs(offset) <= carriagewayHalfW + 1e-4) {
        designZ = clZ + Math.abs(offset) * slope;
      } else if (designProfile && designProfile.designPoints) {
        const dZ = getDesignZAtOffset(offset, designProfile.designPoints);
        if (dZ != null) designZ = dZ;
      }
    }
    return {
      offset,
      existingZ,
      designZ,
      isCL: Math.abs(offset) < 0.05,
    };
  });

  // Visual Theme Colors
  const colors = isDark
    ? {
        cardBg: 'bg-[#0b101b] border-slate-800 text-slate-100 shadow-2xl',
        titleFill: '#f8fafc',
        subFill: '#94a3b8',
        gridBox: '#475569',
        gridMajor: '#334155',
        axisTicks: '#64748b',
        axisSubTicks: '#334155',
        axisText: '#cbd5e1',
        clText: '#ef4444',
        elevationText: '#cbd5e1',
        scaleBlue: '#38bdf8',
        roadEgl: '#f8fafc',
        roadFgl: '#0284c7',
        tableBg: '#090d16',
        tableBorder: '#475569',
        tableDivider: '#1e293b',
        tableRowRencana: '#38bdf8',
        tableRowExisting: '#f87171',
        stationText: '#f8fafc',
      }
    : {
        cardBg: 'bg-white border-slate-300 text-slate-800 shadow-xl',
        titleFill: '#0f172a',
        subFill: '#64748b',
        gridBox: '#64748b',
        gridMajor: '#e2e8f0',
        axisTicks: '#334155',
        axisSubTicks: '#94a3b8',
        axisText: '#1e293b',
        clText: '#dc2626',
        elevationText: '#1e293b',
        scaleBlue: '#2563eb',
        roadEgl: '#0f172a',
        roadFgl: '#2563eb',
        tableBg: '#ffffff',
        tableBorder: '#64748b',
        tableDivider: '#cbd5e1',
        tableRowRencana: '#1d4ed8',
        tableRowExisting: '#dc2626',
        stationText: '#0f172a',
      };

  return (
    <div className={`p-6 rounded-2xl border transition-all ${colors.cardBg}`} style={{ width: `${svgWidth + 48}px` }}>
      {/* Header Info Bar */}
      <div className={`flex items-center justify-between pb-3 mb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <span className="text-base font-extrabold tracking-tight">
            {station.stationName}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            {pts.length} titik penampang
          </span>
          {station.clPoint && (
            <span className={`text-xs font-mono px-3 py-0.5 rounded-lg border font-bold ${
              isDark ? 'bg-red-950/60 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              As (CL): El. {station.clPoint?.z != null ? station.clPoint.z.toFixed(3) : '-'} m
            </span>
          )}
          {showDesign && (
            <div className="flex items-center gap-1.5 ml-1">
              <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
                isDark ? 'bg-red-950/60 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                ✂️ Galian: {cutFill.cutArea.toFixed(2)} m²
              </span>
              <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
                isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                ⛰️ Timbunan: {cutFill.fillArea.toFixed(2)} m²
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveSvgToPng(svgRef.current, `CrossSection_${station.stationName}.png`, 2)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Download gambar PNG resolusi tinggi"
          >
            <Image className="w-3.5 h-3.5 text-blue-500" /> Simpan PNG
          </button>
          <button
            onClick={() => saveSvgToFile(svgRef.current, `CrossSection_${station.stationName}.svg`)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Download file vektor SVG"
          >
            <FileImage className="w-3.5 h-3.5 text-emerald-500" /> SVG
          </button>
        </div>
      </div>

      {/* SVG Engineering Canvas */}
      <div className="overflow-visible flex justify-center py-1">
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          className="font-sans select-none overflow-visible"
        >
          <defs>
            <pattern id="concreteHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1" />
            </pattern>
          </defs>
          {/* Title Block Standar Dinas PUPR Karawang (Optional Header) */}
          {showKop && (
            <OfficialPuprTitleBlock
              x={15}
              y={10}
              width={svgWidth - 30}
              height={76}
              drawingTitle="POTONGAN MELINTANG"
              stationName={station.stationName}
              sheetNo={`B-${String(stationIndex + 1).padStart(2, '0')}`}
              scaleText={`1 : ${scale}`}
              totalSheets={`${stationIndex + 1}/${totalStationsCount || 1}`}
              isDark={isDark}
            />
          )}

          {/* Centerline CL Mark at Top */}
          <text
            x={clX}
            y={gridTop - 12}
            textAnchor="middle"
            className="text-[14px] font-mono font-bold"
            fill={colors.clText}
          >
            CL
          </text>

          {/* Left Axis: ELEVATION Label */}
          <text
            x={gridLeft - 56}
            y={(gridTop + gridBottom) / 2 - 25}
            textAnchor="middle"
            transform={`rotate(-90, ${gridLeft - 56}, ${(gridTop + gridBottom) / 2 - 25})`}
            className="text-[12px] font-mono font-bold tracking-widest uppercase"
            fill={colors.elevationText}
          >
            ELEVATION
          </text>

          {/* Bottom-Left: Scale Right Triangle (1:100 / 1:100) */}
          <g>
            <polygon
              points={`${gridLeft - 72},${gridBottom - 32} ${gridLeft - 72},${gridBottom} ${gridLeft - 72 + 32},${gridBottom}`}
              fill="none"
              stroke={colors.scaleBlue}
              strokeWidth="1.4"
            />
            <text
              x={gridLeft - 78}
              y={gridBottom - 16}
              textAnchor="middle"
              transform={`rotate(-90, ${gridLeft - 78}, ${gridBottom - 16})`}
              className="text-[9px] font-mono font-bold"
              fill={colors.scaleBlue}
            >
              1:{numScale}
            </text>
            <text
              x={gridLeft - 72 + 16}
              y={gridBottom + 12}
              textAnchor="middle"
              className="text-[9px] font-mono font-bold"
              fill={colors.scaleBlue}
            >
              1:{numScale}
            </text>
          </g>

          {/* Horizontal Grid Lines, Minor Ticks, and Elevation Numbers on Left */}
          {elevSteps.map((el) => {
            const y = yScale(el);
            return (
              <g key={`el-grid-${el}`}>
                {/* Horizontal Grid Line across chart */}
                <line
                  x1={gridLeft}
                  y1={y}
                  x2={gridRight}
                  y2={y}
                  stroke={colors.gridMajor}
                  strokeWidth="0.8"
                />
                {/* Major Tick on Left Axis */}
                <line
                  x1={gridLeft - 6}
                  y1={y}
                  x2={gridLeft}
                  y2={y}
                  stroke={colors.axisTicks}
                  strokeWidth="1"
                />
                {/* Elevation Label */}
                <text
                  x={gridLeft - 9}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] font-mono font-bold"
                  fill={colors.axisText}
                >
                  {el.toFixed(2)}
                </text>
                {/* Minor sub-ticks between meters (every 0.2m = 4 sub-ticks) */}
                {el < gridMaxElev && [0.2, 0.4, 0.6, 0.8].map((sub) => {
                  const ySub = yScale(el + sub);
                  return (
                    <line
                      key={`sub-${el}-${sub}`}
                      x1={gridLeft - 3.5}
                      y1={ySub}
                      x2={gridLeft}
                      y2={ySub}
                      stroke={colors.axisSubTicks}
                      strokeWidth="0.6"
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Vertical Grid Lines, Minor Ruler Ticks, and Offset Labels on Bottom */}
          {meterSteps.map((m) => {
            const x = xScale(m);
            const isCL = m === 0;
            return (
              <g key={`m-grid-${m}`}>
                {/* Vertical Grid Line across chart */}
                <line
                  x1={x}
                  y1={gridTop}
                  x2={x}
                  y2={gridBottom}
                  stroke={isCL ? colors.clText : colors.gridMajor}
                  strokeWidth={isCL ? '1.4' : '0.8'}
                  strokeDasharray={isCL ? '4 2' : ''}
                />
                {/* Major Tick on Bottom Axis */}
                <line
                  x1={x}
                  y1={gridBottom}
                  x2={x}
                  y2={gridBottom + 6}
                  stroke={isCL ? colors.clText : colors.axisTicks}
                  strokeWidth="1"
                />
                {/* Offset Label */}
                <text
                  x={x}
                  y={gridBottom + 16}
                  textAnchor="middle"
                  className="text-[9.5px] font-mono font-bold"
                  fill={isCL ? colors.clText : colors.axisText}
                >
                  {m}
                </text>
                {/* Minor ruler sub-ticks between meters (every 0.2m = 4 sub-ticks) */}
                {m < gridMaxOffset && [0.2, 0.4, 0.6, 0.8].map((sub) => {
                  const xSub = xScale(m + sub);
                  return (
                    <line
                      key={`m-sub-${m}-${sub}`}
                      x1={xSub}
                      y1={gridBottom}
                      x2={xSub}
                      y2={gridBottom + 3.5}
                      stroke={colors.axisSubTicks}
                      strokeWidth="0.6"
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Outer Grid Rectangle */}
          <rect
            x={gridLeft}
            y={gridTop}
            width={gridWidth}
            height={gridHeight}
            fill="none"
            stroke={colors.gridBox}
            strokeWidth="1.2"
          />

          {/* Existing Ground (EGL) Profile Polyline */}
          <polyline
            points={pts.map((p) => `${xScale(p.offset)},${yScale(p.z)}`).join(' ')}
            fill="none"
            stroke={colors.roadEgl}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Design Road Template: Concrete Pavement (3.00m) or Standard Profile */}
          {showDesign && (
            isConcrete ? (
              <g key="concrete-design-details">
                {/* Stepped Curb & Side Shoulders to Existing Ground */}
                <polyline
                  points={`${xScale(leftEdgeX)},${yScale(topLeftZ)} ${xScale(leftEdgeX - 0.45)},${yScale(topLeftZ)} ${xScale(leftEdgeX - 0.75)},${yScale(topLeftZ - 0.15)} ${xScale(leftEdgeX - 1.8)},${yScale(topLeftZ - 0.15)}`}
                  fill="none"
                  stroke={isDark ? '#94a3b8' : '#1e293b'}
                  strokeWidth="1.4"
                />
                <polyline
                  points={`${xScale(rightEdgeX)},${yScale(topRightZ)} ${xScale(rightEdgeX + 0.45)},${yScale(topRightZ)} ${xScale(rightEdgeX + 0.75)},${yScale(topRightZ - 0.15)} ${xScale(rightEdgeX + 1.8)},${yScale(topRightZ - 0.15)}`}
                  fill="none"
                  stroke={isDark ? '#94a3b8' : '#1e293b'}
                  strokeWidth="1.4"
                />

                {/* Concrete Pavement Box (3.00m Width) with 45° Diagonal Hatching */}
                <polygon
                  points={`${xScale(leftEdgeX)},${yScale(topLeftZ)} ${xScale(0)},${yScale(clZ)} ${xScale(rightEdgeX)},${yScale(topRightZ)} ${xScale(rightEdgeX)},${yScale(bottomRightZ)} ${xScale(leftEdgeX)},${yScale(bottomLeftZ)}`}
                  fill="url(#concreteHatch)"
                  stroke={isDark ? '#cbd5e1' : '#1e293b'}
                  strokeWidth="1.6"
                />

                {/* Yellow Bottom Baseline (Pasir Alas / Lean Concrete) */}
                <line
                  x1={xScale(leftEdgeX)}
                  y1={yScale(bottomLeftZ)}
                  x2={xScale(rightEdgeX)}
                  y2={yScale(bottomRightZ)}
                  stroke="#eab308"
                  strokeWidth="2.5"
                />

                {/* Internal Broken/Wavy Concrete Break Line (Pembongkaran Beton) */}
                <path
                  d={`M ${xScale(-1.35)} ${yScale(clZ - 0.07)} Q ${xScale(-0.8)} ${yScale(clZ - 0.14)} ${xScale(-0.4)} ${yScale(clZ - 0.08)} T ${xScale(0.2)} ${yScale(clZ - 0.06)} T ${xScale(0.85)} ${yScale(clZ - 0.11)} T ${xScale(1.35)} ${yScale(clZ - 0.07)}`}
                  fill="none"
                  stroke={isDark ? '#f8fafc' : '#0f172a'}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${xScale(-0.25)} ${yScale(clZ - 0.12)} Q ${xScale(0.1)} ${yScale(clZ - 0.07)} ${xScale(0.55)} ${yScale(clZ - 0.12)}`}
                  fill="none"
                  stroke={isDark ? '#f8fafc' : '#0f172a'}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />

                {/* Centerline Vertical Dashed Leader Line (Magenta) */}
                <line
                  x1={xScale(0)}
                  y1={dimY - 14}
                  x2={xScale(0)}
                  y2={yScale(bottomLeftZ) + 14}
                  stroke="#c026d3"
                  strokeWidth="0.8"
                  strokeDasharray="4 2.5"
                />

                {/* Red Interlocking Centerline (CL) Symbol */}
                <g transform={`translate(${xScale(0)}, ${dimY - 26})`}>
                  <path
                    d="M 6 -8 A 7 7 0 1 0 6 2"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <line x1="0" y1="-10" x2="0" y2="8" stroke="#dc2626" strokeWidth="2.2" />
                  <line x1="0" y1="8" x2="7.5" y2="8" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
                </g>

                {/* Annotation Label: Pembongkaran beton (Rock Drill Breaker) */}
                <polyline
                  points={`${xScale(-0.65)},${yScale(clZ - 0.08)} ${xScale(-0.65)},${dimY - 26} ${xScale(-0.65) + 6},${dimY - 26}`}
                  fill="none"
                  stroke={isDark ? '#cbd5e1' : '#1e293b'}
                  strokeWidth="0.9"
                  strokeDasharray="2 2"
                />
                <text
                  x={xScale(-0.65) + 9}
                  y={dimY - 28}
                  className="text-[9.5px] font-sans font-bold"
                  fill={isDark ? '#f1f5f9' : '#0f172a'}
                >
                  Pembongkaran beton (Rock Drill
                </text>
                <text
                  x={xScale(-0.65) + 9}
                  y={dimY - 17}
                  className="text-[9.5px] font-sans font-bold"
                  fill={isDark ? '#f1f5f9' : '#0f172a'}
                >
                  Breaker)
                </text>

                {/* Magenta Dimension Line for 3.00m Pavement Width */}
                <line
                  x1={xScale(leftEdgeX)}
                  y1={dimY}
                  x2={xScale(rightEdgeX)}
                  y2={dimY}
                  stroke="#c026d3"
                  strokeWidth="1.2"
                />
                <line
                  x1={xScale(leftEdgeX)}
                  y1={yScale(topLeftZ)}
                  x2={xScale(leftEdgeX)}
                  y2={dimY - 4}
                  stroke="#c026d3"
                  strokeWidth="0.8"
                />
                <line
                  x1={xScale(rightEdgeX)}
                  y1={yScale(topRightZ)}
                  x2={xScale(rightEdgeX)}
                  y2={dimY - 4}
                  stroke="#c026d3"
                  strokeWidth="0.8"
                />
                <polygon
                  points={`${xScale(leftEdgeX)},${dimY} ${xScale(leftEdgeX) + 6},${dimY - 2.5} ${xScale(leftEdgeX) + 6},${dimY + 2.5}`}
                  fill="#c026d3"
                />
                <polygon
                  points={`${xScale(rightEdgeX)},${dimY} ${xScale(rightEdgeX) - 6},${dimY - 2.5} ${xScale(rightEdgeX) - 6},${dimY + 2.5}`}
                  fill="#c026d3"
                />
                <text
                  x={xScale(0)}
                  y={dimY - 5}
                  textAnchor="middle"
                  className="text-[12px] font-mono font-bold"
                  fill="#c026d3"
                >
                  3.00
                </text>

                {/* Left Street Light Pole with Solar Panel */}
                <g>
                  <line
                    x1={xScale(-2.8)}
                    y1={yScale(topLeftZ - 0.15)}
                    x2={xScale(-2.8)}
                    y2={dimY - 55}
                    stroke={isDark ? '#cbd5e1' : '#1e293b'}
                    strokeWidth="1.4"
                  />
                  <line
                    x1={xScale(-2.8) - 32}
                    y1={dimY - 80}
                    x2={xScale(-2.8) + 32}
                    y2={dimY - 45}
                    stroke={isDark ? '#cbd5e1' : '#1e293b'}
                    strokeWidth="1.5"
                  />
                  <line
                    x1={xScale(-2.8) - 32}
                    y1={dimY - 83}
                    x2={xScale(-2.8) + 32}
                    y2={dimY - 48}
                    stroke={isDark ? '#cbd5e1' : '#1e293b'}
                    strokeWidth="1.5"
                  />
                </g>

                {/* Right Street Light Pole with Solar Panel */}
                <g>
                  <line
                    x1={xScale(2.8)}
                    y1={yScale(topRightZ - 0.15)}
                    x2={xScale(2.8)}
                    y2={dimY - 55}
                    stroke={isDark ? '#cbd5e1' : '#1e293b'}
                    strokeWidth="1.4"
                  />
                  <line
                    x1={xScale(2.8) - 32}
                    y1={dimY - 45}
                    x2={xScale(2.8) + 32}
                    y2={dimY - 80}
                    stroke={isDark ? '#cbd5e1' : '#1e293b'}
                    strokeWidth="1.5"
                  />
                  <line
                    x1={xScale(2.8) - 32}
                    y1={dimY - 48}
                    x2={xScale(2.8) + 32}
                    y2={dimY - 83}
                    stroke={isDark ? '#cbd5e1' : '#1e293b'}
                    strokeWidth="1.5"
                  />
                </g>
              </g>
            ) : designProfile ? (
              <polyline
                points={designProfile.designPoints.map((dp) => `${xScale(dp.offset)},${yScale(dp.z)}`).join(' ')}
                fill="none"
                stroke={colors.roadFgl}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null
          )}

          {/* ================= DATA BAND TABLE (2 ROWS: ELEVASI RENCANA & ELEVASI EXISTING) ================= */}
          {/* Outer Table Border */}
          <rect
            x={tableLeft}
            y={tableTop}
            width={tableHeaderWidth + gridWidth}
            height={2 * rowH}
            fill={colors.tableBg}
            stroke={colors.tableBorder}
            strokeWidth="1.2"
          />

          {/* Vertical Border separating Header from Data Columns */}
          <line
            x1={gridLeft}
            y1={tableTop}
            x2={gridLeft}
            y2={tableBottom}
            stroke={colors.tableBorder}
            strokeWidth="1.2"
          />

          {/* Middle Row Divider Line */}
          <line
            x1={tableLeft}
            y1={tableTop + rowH}
            x2={gridRight}
            y2={tableTop + rowH}
            stroke={colors.tableDivider}
            strokeWidth="1"
          />

          {/* Header Row Titles */}
          <text
            x={tableLeft + 14}
            y={tableTop + rowH * 0.5 + 4}
            className="text-[11px] font-extrabold tracking-tight font-sans"
            fill={colors.tableRowRencana}
          >
            ELEVASI RENCANA
          </text>
          <text
            x={tableLeft + 14}
            y={tableTop + rowH * 1.5 + 4}
            className="text-[11px] font-extrabold tracking-tight font-sans"
            fill={colors.tableRowExisting}
          >
            ELEVASI EXISTING
          </text>

          {/* Meter Vertical Column Lines through Table */}
          {meterSteps.map((m) => {
            const x = xScale(m);
            const isCL = m === 0;
            return (
              <line
                key={`tbl-grid-m-${m}`}
                x1={x}
                y1={tableTop}
                x2={x}
                y2={tableBottom}
                stroke={isCL ? colors.clText : colors.tableDivider}
                strokeWidth={isCL ? '1.2' : '0.6'}
                strokeDasharray={isCL ? '3 2' : ''}
              />
            );
          })}

          {/* Point Values & Point Column Divider Lines */}
          {tablePoints.map((tp, idx) => {
            const px = xScale(tp.offset);
            return (
              <g key={`tbl-pt-${idx}`}>
                {/* Vertical Divider line at point offset */}
                <line
                  x1={px}
                  y1={tableTop}
                  x2={px}
                  y2={tableBottom}
                  stroke={tp.isCL ? colors.clText : colors.tableBorder}
                  strokeWidth={tp.isCL ? '1.4' : '0.8'}
                />

                {/* Row 1: Elevasi Rencana (Blue, Vertical text) */}
                <text
                  x={px}
                  y={tableTop + rowH * 0.5}
                  textAnchor="middle"
                  transform={`rotate(-90, ${px}, ${tableTop + rowH * 0.5})`}
                  className="text-[10px] font-mono font-bold"
                  fill={colors.tableRowRencana}
                >
                  {tp.designZ.toFixed(3)}
                </text>

                {/* Row 2: Elevasi Existing (Red, Vertical text) */}
                <text
                  x={px}
                  y={tableTop + rowH * 1.5}
                  textAnchor="middle"
                  transform={`rotate(-90, ${px}, ${tableTop + rowH * 1.5})`}
                  className="text-[10px] font-mono font-bold"
                  fill={colors.tableRowExisting}
                >
                  {tp.existingZ.toFixed(3)}
                </text>
              </g>
            );
          })}

          {/* Station Title at the Bottom */}
          <text
            x={clX}
            y={staY}
            textAnchor="middle"
            className="text-[18px] font-mono font-bold tracking-widest"
            fill={colors.stationText}
          >
            STA  {station.stationName.replace(/^STA\s*/i, '')}
          </text>
        </svg>
      </div>
    </div>
  );
}
