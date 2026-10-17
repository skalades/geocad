import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  X,
  Sparkles,
  ShieldCheck,
  ArrowUpDown,
} from 'lucide-react';

export default function SurveyAuditModal({
  isOpen,
  onClose,
  stations = [],
  allPoints = [],
  activeSegmentName = '',
  onApplyBatchShift,
  onAutoHarmonize,
}) {
  const [shiftZValue, setShiftZValue] = useState('');
  const [activeTab, setActiveTab] = useState('issues'); // 'issues' | 'batch'

  // Analyze Dataset for QC Issues
  const auditResults = useMemo(() => {
    if (!stations || stations.length === 0) {
      return { spikes: [], missingCl: [], spacingIssues: [], duplicates: [], totalChecked: 0 };
    }

    const spikes = [];
    const missingCl = [];
    const spacingIssues = [];
    const duplicates = [];

    // 1. Station-level checks
    stations.forEach((sta, idx) => {
      // Check CL
      if (!sta.clPoint) {
        missingCl.push({
          station: sta.stationName,
          reason: 'Tidak memiliki titik As Jalan (CL)',
          pointsCount: sta.points?.length || 0,
        });
      }

      // Check Station Spacing
      if (idx > 0) {
        const prev = stations[idx - 1];
        const dist = sta.cumulativeDist - prev.cumulativeDist;
        if (dist <= 0) {
          spacingIssues.push({
            station: sta.stationName,
            prevStation: prev.stationName,
            dist,
            severity: 'error',
            msg: `Jarak tidak bertambah atau urutan terbalik (${dist.toFixed(2)} m)`,
          });
        } else if (dist > 60) {
          spacingIssues.push({
            station: sta.stationName,
            prevStation: prev.stationName,
            dist,
            severity: 'warning',
            msg: `Interval antar STA terlalu renggang (${dist.toFixed(2)} m > 50 m)`,
          });
        }
      }

      // Check elevation spikes within cross-section
      const pts = sta.points || [];
      if (pts.length >= 3) {
        const zVals = pts.map((p) => p.z);
        const meanZ = zVals.reduce((a, b) => a + b, 0) / zVals.length;
        pts.forEach((p) => {
          const diff = Math.abs(p.z - meanZ);
          if (diff > 1.8) {
            spikes.push({
              station: sta.stationName,
              pointId: p.id,
              rawNo: p.rawNo,
              z: p.z,
              meanZ: meanZ.toFixed(2),
              diff: diff.toFixed(2),
              role: p.role,
            });
          }
        });
      }
    });

    // 2. Check duplicates across all points
    const coordMap = new Map();
    allPoints.forEach((p) => {
      const key = `${p.x.toFixed(2)}_${p.y.toFixed(2)}`;
      if (coordMap.has(key)) {
        duplicates.push({
          p1: coordMap.get(key),
          p2: p,
        });
      } else {
        coordMap.set(key, p);
      }
    });

    const totalIssues = spikes.length + missingCl.length + spacingIssues.length + duplicates.length;

    return {
      spikes,
      missingCl,
      spacingIssues,
      duplicates,
      totalIssues,
      totalChecked: allPoints.length,
    };
  }, [stations, allPoints]);

  if (!isOpen) return null;

  const handleApplyShift = () => {
    const val = parseFloat(shiftZValue);
    if (isNaN(val) || val === 0) {
      alert('Masukkan angka pergeseran elevasi Z yang valid (misal: +0.25 atau -0.5)');
      return;
    }
    if (onApplyBatchShift) {
      onApplyBatchShift(val);
      setShiftZValue('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">
                  Audit Kualitas Data Survei &amp; QC
                </h2>
                <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-bold">
                  {activeSegmentName || 'Ruas Aktif'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pemeriksaan otomatis anomali elevasi, integritas as jalan, dan kalibrasi massal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 pt-2">
          <button
            onClick={() => setActiveTab('issues')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'issues'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Hasil Diagnosa Audit ({auditResults.totalIssues})
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'batch'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Kalibrasi Elevasi Massal (&plusmn;&Delta;Z)
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs">
          {activeTab === 'issues' ? (
            <div className="space-y-4">
              {/* Summary Banner */}
              {auditResults.totalIssues === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold">Data Survei Berkualitas Sangat Baik!</div>
                    <div className="text-xs text-emerald-700">
                      Seluruh {auditResults.totalChecked} titik ukur dan {stations.length} stasiun
                      telah terstruktur dengan rapi, memiliki as jalan (CL), dan tanpa lonjakan elevasi anomali.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-800">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>
                      Ditemukan <strong>{auditResults.totalIssues} potensi isu</strong> dari{' '}
                      {auditResults.totalChecked} titik yang diperiksa.
                    </span>
                  </div>
                  {onAutoHarmonize && (
                    <button
                      onClick={() => {
                        onAutoHarmonize();
                        alert('Penyelarasan otomatis telah dijalankan!');
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Harmonisasi Otomatis
                    </button>
                  )}
                </div>
              )}

              {/* Spikes list */}
              {auditResults.spikes.length > 0 && (
                <div className="border border-red-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-red-50 text-red-800 font-bold flex items-center justify-between">
                    <span>⚠️ Lonjakan Elevasi Drastis / Spike ({auditResults.spikes.length})</span>
                    <span className="text-[11px] font-normal text-red-600">
                      Beda &gt; 1.8m dari rata-rata potongan
                    </span>
                  </div>
                  <div className="divide-y divide-red-100 max-h-36 overflow-y-auto">
                    {auditResults.spikes.map((s, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-red-50/50">
                        <div>
                          <strong className="text-slate-800">{s.station}</strong> - Titik No.{' '}
                          <span className="font-mono">{s.rawNo}</span> ({s.role})
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-red-600">{s.z.toFixed(3)} m</span>
                          <span className="text-slate-400 text-[10px] ml-1.5">
                            (rerata: {s.meanZ}m, selisih {s.diff}m)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing CL list */}
              {auditResults.missingCl.length > 0 && (
                <div className="border border-amber-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-amber-50 text-amber-800 font-bold">
                    <span>🚫 Stasiun Tanpa As Jalan (CL) ({auditResults.missingCl.length})</span>
                  </div>
                  <div className="divide-y divide-amber-100 max-h-32 overflow-y-auto">
                    {auditResults.missingCl.map((m, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-amber-50/50">
                        <span className="font-bold text-slate-800">{m.station}</span>
                        <span className="text-amber-700">{m.reason} ({m.pointsCount} titik tersedia)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spacing issues */}
              {auditResults.spacingIssues.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 text-slate-800 font-bold">
                    <span>📏 Anomali Jarak Antar Stasiun ({auditResults.spacingIssues.length})</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                    {auditResults.spacingIssues.map((sp, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                        <span className="font-bold text-slate-800">
                          {sp.prevStation} &rarr; {sp.station}
                        </span>
                        <span className={sp.severity === 'error' ? 'text-red-600 font-bold' : 'text-slate-500'}>
                          {sp.msg}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Batch Elevation Calibration Tab */
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
                <p className="font-bold mb-1">Koreksi Titik Ikat Benchmark (BM) / Elevasi Global</p>
                <p className="text-slate-600">
                  Gunakan fitur ini untuk menaikkan atau menurunkan seluruh elevasi (Z) dari semua
                  titik ukur pada ruas <strong>{activeSegmentName}</strong> secara bersamaan. Contoh:
                  jika setelah kalibrasi BM lokal ternyata ketinggian acuan naik 0.35 meter, masukkan{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono font-bold">+0.35</code>.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="block font-bold text-slate-700">
                  Nilai Pergeseran Elevasi &Delta;Z (meter):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Contoh: 0.50 atau -0.25"
                    value={shiftZValue}
                    onChange={(e) => setShiftZValue(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                  <button
                    onClick={handleApplyShift}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition-colors"
                  >
                    Terapkan Pergeseran
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  *Perubahan akan otomatis disimpan ke database proyek aktif.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
