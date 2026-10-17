import React, { useState } from 'react';
import {
  GitFork,
  Plus,
  Trash2,
  Check,
  X,
  Link2,
  Lock,
  Info,
} from 'lucide-react';

export default function IntersectionModal({
  isOpen,
  onClose,
  project,
  onAddIntersection,
  onDeleteIntersection,
  onTieElevation,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [mainSegmentId, setMainSegmentId] = useState('');
  const [mainStationName, setMainStationName] = useState('');
  const [branchSegmentId, setBranchSegmentId] = useState('');
  const [branchStationName, setBranchStationName] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !project) return null;

  const segments = project.segments || [];
  const intersections = project.intersections || [];

  const handleStartAdd = () => {
    if (segments.length < 2) {
      alert('Untuk membuat persimpangan, proyek harus memiliki minimal 2 segmen jalan (misal: Ruas Utama & Ruas Cabang).');
      return;
    }

    const defaultMain = segments[0];
    const defaultBranch = segments[1];
    setMainSegmentId(defaultMain.id);
    setMainStationName(defaultMain.stations?.[0]?.stationName || '');
    setBranchSegmentId(defaultBranch.id);
    setBranchStationName(defaultBranch.stations?.[0]?.stationName || '');
    setName(`Simpang ${defaultMain.name.slice(0, 10)} - ${defaultBranch.name.slice(0, 10)}`);
    setNotes('Pertemuan sumbu As Jalan (Centerline) di persimpangan');
    setIsAdding(true);
  };

  const handleConfirmAdd = (e) => {
    e.preventDefault();
    if (!mainSegmentId || !branchSegmentId) return;
    if (mainSegmentId === branchSegmentId) {
      alert('Segmen Utama dan Segmen Cabang tidak boleh sama!');
      return;
    }

    onAddIntersection({
      id: `int_${Date.now()}`,
      name: name.trim() || 'Simpang Jalan',
      mainSegmentId,
      mainStationName,
      branchSegmentId,
      branchStationName,
      notes: notes.trim(),
    });

    setIsAdding(false);
  };

  const selectedMainSeg = segments.find(s => s.id === mainSegmentId);
  const selectedBranchSeg = segments.find(s => s.id === branchSegmentId);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <GitFork className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Kelola Persimpangan Jalan (Intersections / Junctions)
              </h2>
              <p className="text-xs text-slate-500">
                Tautkan titik pertemuan antara segmen jalan utama dan segmen jalan cabang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Explanation Banner */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-xs flex gap-3 items-start">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Prinsip Geometrik Persimpangan:</strong> Dengan memisahkan jalan cabang menjadi segmen mandiri, 
              garis merah as jalan utama <em>tidak akan zig-zag/criss-cross</em>. Menautkan simpang memungkinkan 
              Anda mengunci elevasi (Elevation Tie) sehingga sambungan aspal rata sempurna.
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleStartAdd}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Tautkan Persimpangan Baru
            </button>
            <span className="text-xs text-slate-500 font-medium">
              {intersections.length} Persimpangan terdaftar dalam proyek
            </span>
          </div>

          {/* Add Intersection Form */}
          {isAdding && (
            <form
              onSubmit={handleConfirmAdd}
              className="p-4.5 bg-slate-50 border border-slate-300 rounded-xl space-y-4 animate-in fade-in"
            >
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Formulir Tautan Persimpangan
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nama Simpang / Titik Temu
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Simpang Tiga Siliwangi - Melati"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Main Segment */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">
                    1. Segmen Jalan Utama (Major Road)
                  </span>
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">Pilih Segmen Utama:</label>
                    <select
                      value={mainSegmentId}
                      onChange={(e) => {
                        setMainSegmentId(e.target.value);
                        const s = segments.find(seg => seg.id === e.target.value);
                        setMainStationName(s?.stations?.[0]?.stationName || '');
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs font-medium"
                    >
                      {segments.map((seg) => (
                        <option key={seg.id} value={seg.id}>
                          {seg.name} ({seg.stations?.length || 0} STA)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">Station Simpang (STA):</label>
                    <select
                      value={mainStationName}
                      onChange={(e) => setMainStationName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs font-medium"
                    >
                      {selectedMainSeg?.stations?.map((sta) => (
                        <option key={sta.stationName} value={sta.stationName}>
                          {sta.stationName} (CL Elev: {sta.clPoint?.z?.toFixed(3) ?? '-'} m)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Branch Segment */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">
                    2. Segmen Jalan Cabang (Minor / Branch Road)
                  </span>
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">Pilih Segmen Cabang:</label>
                    <select
                      value={branchSegmentId}
                      onChange={(e) => {
                        setBranchSegmentId(e.target.value);
                        const s = segments.find(seg => seg.id === e.target.value);
                        setBranchStationName(s?.stations?.[0]?.stationName || '');
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs font-medium"
                    >
                      {segments.filter(s => s.id !== mainSegmentId).map((seg) => (
                        <option key={seg.id} value={seg.id}>
                          {seg.name} ({seg.stations?.length || 0} STA)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">Station Mulai Cabang (STA):</label>
                    <select
                      value={branchStationName}
                      onChange={(e) => setBranchStationName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs font-medium"
                    >
                      {selectedBranchSeg?.stations?.map((sta) => (
                        <option key={sta.stationName} value={sta.stationName}>
                          {sta.stationName} (CL Elev: {sta.clPoint?.z?.toFixed(3) ?? '-'} m)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Catatan Geometrik
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Simpang Tiga T-Junction masuk gang perumahan"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Simpan Tautan Simpang
                </button>
              </div>
            </form>
          )}

          {/* List of Intersections */}
          <div className="space-y-3">
            {intersections.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                <GitFork className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-600">
                  Belum ada persimpangan yang ditautkan di proyek ini
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Jika proyek Anda memiliki ruas jalan yang berpotongan atau bercabang, tautkan kedua segmen tersebut di sini.
                </p>
              </div>
            ) : (
              intersections.map((intxn) => {
                const mainSeg = segments.find(s => s.id === intxn.mainSegmentId);
                const branchSeg = segments.find(s => s.id === intxn.branchSegmentId);
                const mainSta = mainSeg?.stations?.find(s => s.stationName === intxn.mainStationName);
                const branchSta = branchSeg?.stations?.find(s => s.stationName === intxn.branchStationName);

                const mainElev = mainSta?.clPoint?.z;
                const branchElev = branchSta?.clPoint?.z;
                const elevDiff = (mainElev !== undefined && branchElev !== undefined)
                  ? Math.abs(mainElev - branchElev)
                  : null;

                return (
                  <div
                    key={intxn.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-amber-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {intxn.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Node Simpang
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{intxn.notes || 'Pertemuan sumbu as jalan'}</p>
                      </div>

                      <button
                        onClick={() => onDeleteIntersection(intxn.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Hapus tautan simpang"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Visual Connection Diagram */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mainSeg?.color || '#ef4444' }} />
                        <div>
                          <div className="font-semibold text-slate-800">{mainSeg?.name || 'Segmen Utama'}</div>
                          <div className="text-[11px] text-slate-500">
                            {intxn.mainStationName} • Elev: <span className="font-mono font-bold text-slate-700">{mainElev?.toFixed(3) ?? '-'} m</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center px-3 text-amber-600">
                        <Link2 className="w-4 h-4" />
                        <span className="text-[9px] font-bold uppercase mt-0.5">Tersambung</span>
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <div className="font-semibold text-slate-800">{branchSeg?.name || 'Segmen Cabang'}</div>
                          <div className="text-[11px] text-slate-500">
                            {intxn.branchStationName} • Elev: <span className="font-mono font-bold text-slate-700">{branchElev?.toFixed(3) ?? '-'} m</span>
                          </div>
                        </div>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branchSeg?.color || '#3b82f6' }} />
                      </div>
                    </div>

                    {/* Elevation Check & Sync */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        {elevDiff !== null && elevDiff < 0.01 ? (
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                            <Check className="w-3.5 h-3.5" /> Elevasi Selaras (Selisih {(elevDiff * 1000).toFixed(0)} mm)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                            ⚠️ Selisih Elevasi: {elevDiff !== null ? `${elevDiff.toFixed(3)} m` : '-'}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => onTieElevation(intxn.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition-colors"
                        title="Samakan koordinat dan elevasi titik cabang dengan titik as jalan utama"
                      >
                        <Lock className="w-3 h-3" /> Kunci Elevasi (Elevation Tie)
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
