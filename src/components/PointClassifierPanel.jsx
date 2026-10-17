import React, { useState } from 'react';
import { Target, ArrowUpDown, ChevronDown, ChevronUp, Zap, Edit3, XCircle, PanelRightClose } from 'lucide-react';

export default function PointClassifierPanel({
  stations,
  selectedPointId,
  onSelectPoint,
  onChangePointRole,
  onFlipSides,
  onHarmonizeAll,
  onAutoFixTrajectory,
  onClearAllCenterlines,
  onEditPoint,
  onClose,
}) {
  const [expandedSta, setExpandedSta] = useState({});

  const toggleExpand = (staName) => {
    setExpandedSta(prev => ({
      ...prev,
      [staName]: !prev[staName],
    }));
  };

  const hasAnyCl = stations.some(s => !!s.clPoint);
  const allNoCl = stations.length > 0 && !hasAnyCl;

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 w-80 lg:w-84 xl:w-96 shrink-0 shadow-xs select-none transition-all duration-200">
      {/* Panel Header */}
      <div className="p-3 lg:p-3.5 border-b border-slate-200 bg-slate-50 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 text-blue-700 rounded-md">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Klasifikasi Titik &amp; As
              </h2>
              <p className="text-[10px] text-slate-400">
                {allNoCl ? 'Mode Manual (Pilih As Jalan)' : 'Atur CL & orientasi melintang'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasAnyCl && onClearAllCenterlines && (
              <button
                type="button"
                onClick={onClearAllCenterlines}
                className="px-2 py-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 rounded-md text-[10px] font-bold transition-colors whitespace-nowrap cursor-pointer"
                title="Hapus semua As Jalan (CL) untuk memulai pemilihan trase manual dari nol"
              >
                Reset As
              </button>
            )}
            {onAutoFixTrajectory && (
              <button
                type="button"
                onClick={onAutoFixTrajectory}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
                title="Rapikan garis as jalan yang menyilang & kembalikan titik yang nyasar ke STA terdekat"
              >
                <Zap className="w-3 h-3 text-yellow-200 fill-yellow-200" /> Auto-Fix
              </button>
            )}
            {onHarmonizeAll && hasAnyCl && (
              <button
                type="button"
                onClick={onHarmonizeAll}
                className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
                title="Samakan orientasi sisi Kiri (Biru) & Kanan (Hijau) di semua STA secara seragam"
              >
                Sinkron Sisi
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
                title="Sembunyikan Panel (Maksimalkan Tampilan Peta)"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {allNoCl && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <Target className="w-3.5 h-3.5 text-amber-600" />
              <span>Trase As Belum Ditentukan (Mode Manual)</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Klik tombol <strong>[CL]</strong> pada titik yang ingin dijadikan As Jalan di bawah, atau klik titik langsung di peta WebGIS.
            </p>
          </div>
        )}
      </div>

      {/* Station List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {stations.map(sta => {
          const isExpanded = expandedSta[sta.stationName] !== false; // default open
          const clPoint = sta.clPoint;

          return (
            <div
              key={sta.stationName}
              className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
            >
              {/* Station Card Header (Clean Two-Sided Row) */}
              <div
                onClick={() => toggleExpand(sta.stationName)}
                className="flex items-center justify-between p-2.5 bg-slate-100/90 hover:bg-slate-200/70 cursor-pointer transition-colors gap-2"
              >
                {/* Left: Station Name & Point Count */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-xs text-blue-800 font-mono tracking-tight whitespace-nowrap">
                    {sta.stationName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-semibold whitespace-nowrap">
                    {sta.points.length} pt
                  </span>
                </div>

                {/* Right: CL Elevation Badge & Expand Chevron */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {clPoint ? (
                    <span className="text-[10px] font-mono text-red-700 bg-red-100/80 border border-red-200/80 px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap">
                      CL: {clPoint?.z != null ? clPoint.z.toFixed(2) : '-'}m
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md italic font-semibold whitespace-nowrap">
                      Tanpa CL
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </div>
              </div>

              {/* Station Sub-Toolbar (When Expanded) */}
              {isExpanded && (
                <>
                  <div className="px-2.5 py-1.5 bg-slate-50 border-t border-b border-slate-200/70 flex items-center justify-between gap-2">
                    {onFlipSides && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFlipSides(sta.stationName);
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-semibold flex items-center gap-1 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
                        title="Tukar orientasi sisi Kiri dan Kanan pada stasiun ini"
                      >
                        <ArrowUpDown className="w-2.5 h-2.5 text-blue-600" /> Tukar Sisi (Ki ↔ Ka)
                      </button>
                    )}

                    {clPoint && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangePointRole(clPoint.id, 'UNSET_CL');
                        }}
                        className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                        title="Lepas status As (CL) tanpa menghapus titik ukur"
                      >
                        <XCircle className="w-2.5 h-2.5 text-red-500" /> Lepas CL
                      </button>
                    )}
                  </div>

                  {/* Station Points List */}
                  <div className="p-2 space-y-1.5 bg-slate-50/40">
                    {sta.points.map((pt, idx) => {
                      const isSelected = selectedPointId === pt.id;
                      const isCL = pt.role === 'CL';

                      return (
                        <div
                          key={pt.id}
                          onClick={() => onSelectPoint(pt.id)}
                          className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/90 border-blue-400 ring-1 ring-blue-300 shadow-2xs'
                              : isCL
                              ? 'bg-red-50/40 border-red-200 hover:bg-red-50/70'
                              : 'bg-white border-slate-200 hover:bg-slate-100/70'
                          }`}
                        >
                          {/* Row 1: Point ID + Elev + Role Segmented Buttons */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-bold text-[11px] text-slate-800 font-mono">
                                #{pt.rawNo || idx + 1}
                              </span>
                              {pt.codeDetail && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 font-mono border border-blue-200">
                                  {pt.codeDetail}
                                </span>
                              )}
                              <span className="font-mono text-[11px] text-slate-600">
                                Z: <strong className="text-slate-900">{pt?.z != null ? pt.z.toFixed(3) : '-'}</strong>m
                              </span>
                            </div>

                            {/* Quick Role Segmented Buttons */}
                            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md border border-slate-200 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCL) {
                                    onChangePointRole(pt.id, 'UNSET_CL');
                                  } else {
                                    onChangePointRole(pt.id, 'CL');
                                  }
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                  isCL
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-red-50 hover:text-red-700'
                                }`}
                                title={isCL ? "Lepas status As (CL)" : "Jadikan As Jalan (Centerline)"}
                              >
                                {isCL ? '★ CL' : 'CL'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onChangePointRole(pt.id, 'Ki');
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                                  pt.role?.startsWith('Ki')
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                                }`}
                                title="Tepi Kiri (Ki)"
                              >
                                Ki
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onChangePointRole(pt.id, 'Ka');
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                                  pt.role?.startsWith('Ka')
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                                title="Tepi Kanan (Ka)"
                              >
                                Ka
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onEditPoint) onEditPoint(pt);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit Atribut Titik Lengkap"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Offset Badge & Coordinates */}
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                            <span className={`px-1 py-0.2 rounded font-semibold whitespace-nowrap ${
                              isCL
                                ? 'bg-red-100 text-red-700'
                                : pt.role?.startsWith('Ki')
                                ? 'bg-blue-100 text-blue-700'
                                : pt.role?.startsWith('Ka')
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              Offset: {pt?.offset != null ? `${pt.offset > 0 ? '+' : ''}${pt.offset.toFixed(2)}m` : '-'}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[170px]" title={`X: ${pt.x} Y: ${pt.y}`}>
                              X:{pt?.x != null ? pt.x.toFixed(1) : '-'} Y:{pt?.y != null ? pt.y.toFixed(1) : '-'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
