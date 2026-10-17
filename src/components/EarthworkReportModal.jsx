import React, { useState, useMemo } from 'react';
import {
  computeSegmentEarthwork,
  exportEarthworkToCsv,
} from '../utils/earthworkCalculator';
import {
  ROAD_TEMPLATE_PRESETS,
  DEFAULT_ROAD_TEMPLATE,
} from '../utils/roadDesignTemplate';
import {
  X,
  TrendingDown,
  TrendingUp,
  Scale,
  FileSpreadsheet,
  Route,
} from 'lucide-react';


export default function EarthworkReportModal({
  isOpen,
  onClose,
  stations = [],
  activeSegmentName = '',
  selectedTemplate = DEFAULT_ROAD_TEMPLATE,
  onChangeTemplate,
  getDesignElevAtDist = null,
}) {
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'masshaul' | 'template'
  const [template, setTemplate] = useState(selectedTemplate || DEFAULT_ROAD_TEMPLATE);

  // Compute Earthwork
  const earthwork = useMemo(() => {
    return computeSegmentEarthwork(stations, template, getDesignElevAtDist);
  }, [stations, template, getDesignElevAtDist]);

  if (!isOpen) return null;

  const handleTemplateChange = (e) => {
    const found = ROAD_TEMPLATE_PRESETS.find((p) => p.id === e.target.value);
    if (found) {
      setTemplate(found);
      if (onChangeTemplate) onChangeTemplate(found);
    }
  };

  const handleExportCsv = () => {
    exportEarthworkToCsv(earthwork, activeSegmentName || 'Ruas_Jalan');
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">
                  Komputasi Volume Galian &amp; Timbunan (Earthwork)
                </h2>
                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                  {activeSegmentName || 'Ruas Aktif'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Metode Average End Area standar Bina Marga &bull; Template: {template.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel (CSV)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stat Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/70 border-b border-slate-200">
          <div className="p-3 bg-white border border-red-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Total Galian (Cut)</span>
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-lg font-mono font-bold text-red-600">
              {earthwork.totalCutVol.toLocaleString()} <span className="text-xs font-normal">m&sup3;</span>
            </div>
          </div>

          <div className="p-3 bg-white border border-emerald-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Total Timbunan (Fill)</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg font-mono font-bold text-emerald-600">
              {earthwork.totalFillVol.toLocaleString()} <span className="text-xs font-normal">m&sup3;</span>
            </div>
          </div>

          <div className="p-3 bg-white border border-blue-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Neraca Bersih (Net)</span>
              <Scale className="w-4 h-4 text-blue-500" />
            </div>
            <div className={`text-lg font-mono font-bold ${earthwork.netVol >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {earthwork.netVol > 0 ? `+${earthwork.netVol.toLocaleString()}` : earthwork.netVol.toLocaleString()}{' '}
              <span className="text-xs font-normal">m&sup3;</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {earthwork.netVol > 0 ? 'Defisit Tanah (Perlu Buang)' : 'Surplus (Perlu Borrow Pit)'}
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Panjang &amp; Rasio</span>
              <Route className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-lg font-mono font-bold text-slate-800">
              {earthwork.totalLength.toFixed(1)} <span className="text-xs font-normal">m</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Rasio Cut/Fill: {earthwork.cutToFillRatio}
            </div>
          </div>
        </div>

        {/* Tab & Template Selector Toolbar */}
        <div className="px-4 py-2 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'table' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tabel Rekapitulasi per STA
            </button>
            <button
              onClick={() => setActiveTab('masshaul')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'masshaul' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Diagram Mass Haul (Keseimbangan Tanah)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Template Penampang:</span>
            <select
              value={template.id}
              onChange={handleTemplateChange}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROAD_TEMPLATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === 'table' ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Stasiun (STA)</th>
                    <th className="py-2.5 px-3 text-right">Jarak Kum. (m)</th>
                    <th className="py-2.5 px-3 text-right">Interval (m)</th>
                    <th className="py-2.5 px-3 text-right">Elev Tanah (m)</th>
                    <th className="py-2.5 px-3 text-right">Elev Desain (m)</th>
                    <th className="py-2.5 px-3 text-right text-red-600">Luas Galian (m&sup2;)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-600">Luas Timbunan (m&sup2;)</th>
                    <th className="py-2.5 px-3 text-right text-red-600">Vol Galian (m&sup3;)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-600">Vol Timbunan (m&sup3;)</th>
                    <th className="py-2.5 px-3 text-right">Mass Haul (m&sup3;)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {earthwork.rows.map((row, idx) => (
                    <tr key={row.stationName} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-sans font-bold text-slate-800">{row.stationName}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{row.cumulativeDist.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{row.intervalDist.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-700">{row.clGroundZ.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right text-blue-600 font-bold">{row.clDesignZ.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right text-red-600 font-semibold">{row.cutArea.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-emerald-600 font-semibold">{row.fillArea.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-red-700 font-bold bg-red-50/30">
                        {row.incCutVol.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-bold bg-emerald-50/30">
                        {row.incFillVol.toFixed(2)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          row.massHaul >= 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {row.massHaul.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300 font-mono">
                    <td colSpan={2} className="py-2.5 px-3 uppercase text-slate-900 font-sans">
                      TOTAL KUMULATIF
                    </td>
                    <td className="py-2.5 px-3 text-right">{earthwork.totalLength.toFixed(2)}</td>
                    <td colSpan={5} className="py-2.5 px-3 text-right"></td>
                    <td className="py-2.5 px-3 text-right text-red-700 font-extrabold text-xs">
                      {earthwork.totalCutVol.toLocaleString()} m&sup3;
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-extrabold text-xs">
                      {earthwork.totalFillVol.toLocaleString()} m&sup3;
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-700 font-extrabold text-xs">
                      {earthwork.netVol.toLocaleString()} m&sup3;
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            /* Interactive Mass Haul Diagram */
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Kurva Diagram Mass Haul (Sumbu Y: Ordinat Volume Netto &bull; Sumbu X: Jarak Rantai)
                </span>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                    <span className="w-3 h-0.5 bg-red-600 inline-block" /> Area Galian Dominan (&gt; 0)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <span className="w-3 h-0.5 bg-emerald-600 inline-block" /> Area Timbunan Dominan (&lt; 0)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                    <span className="w-3 h-0.5 bg-slate-400 border border-dashed inline-block" /> Garis Seimbang (Datum 0)
                  </span>
                </div>
              </div>

              {/* Mass Haul SVG Chart */}
              <MassHaulSvgChart earthwork={earthwork} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Total {earthwork.rows.length} stasiun dihitung &bull; Format hasil sesuai standar SNI / Bina Marga
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Clean Vector Mass Haul SVG Diagram
 */
function MassHaulSvgChart({ earthwork }) {
  const rows = earthwork?.rows || [];
  if (rows.length === 0) return null;

  const width = 880;
  const height = 300;
  const margin = { top: 30, right: 40, bottom: 50, left: 70 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const totalDist = earthwork.totalLength || 1;
  const vals = rows.map((r) => r.massHaul);
  const maxV = Math.max(10, ...vals);
  const minV = Math.min(-10, ...vals);
  const rangeV = Math.max(1, maxV - minV);

  const getX = (d) => margin.left + (d / totalDist) * plotW;
  const getY = (v) => margin.top + plotH - ((v - minV) / rangeV) * plotH;
  const yZero = getY(0);

  const polylinePoints = rows.map((r) => `${getX(r.cumulativeDist).toFixed(1)},${getY(r.massHaul).toFixed(1)}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-slate-50/50 rounded-lg border border-slate-200">
        {/* Zero Baseline */}
        <line
          x1={margin.left}
          y1={yZero}
          x2={margin.left + plotW}
          y2={yZero}
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <text x={margin.left - 8} y={yZero + 4} textAnchor="end" className="text-[10px] fill-slate-500 font-mono">
          0 m³
        </text>

        {/* Max & Min guides */}
        <text x={margin.left - 8} y={getY(maxV) + 4} textAnchor="end" className="text-[10px] fill-red-500 font-mono font-bold">
          +{maxV.toFixed(0)} m³
        </text>
        <text x={margin.left - 8} y={getY(minV) + 4} textAnchor="end" className="text-[10px] fill-emerald-500 font-mono font-bold">
          {minV.toFixed(0)} m³
        </text>

        {/* Shaded Area between curve and baseline */}
        {rows.map((r, i) => {
          if (i === 0) return null;
          const prev = rows[i - 1];
          const x1 = getX(prev.cumulativeDist);
          const x2 = getX(r.cumulativeDist);
          const y1 = getY(prev.massHaul);
          const y2 = getY(r.massHaul);
          const isCutDominant = (prev.massHaul + r.massHaul) / 2 >= 0;

          return (
            <polygon
              key={i}
              points={`${x1},${yZero} ${x1},${y1} ${x2},${y2} ${x2},${yZero}`}
              fill={isCutDominant ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}
            />
          );
        })}

        {/* Mass Haul Main Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Nodes and Labels */}
        {rows.map((r) => {
          const cx = getX(r.cumulativeDist);

          const cy = getY(r.massHaul);
          return (
            <g key={r.stationName}>
              <circle cx={cx} cy={cy} r="3.5" fill="#1e40af" stroke="#ffffff" strokeWidth="1.5" />
              <text
                x={cx}
                y={margin.top + plotH + 18}
                textAnchor="middle"
                className="text-[9px] fill-slate-600 font-mono"
              >
                {r.stationName.replace('STA ', '')}
              </text>
            </g>
          );
        })}

        {/* X Axis title */}
        <text
          x={margin.left + plotW / 2}
          y={height - 8}
          textAnchor="middle"
          className="text-[10px] fill-slate-500 font-bold"
        >
          Panjang Trase Kumulatif (m)
        </text>
      </svg>
    </div>
  );
}
