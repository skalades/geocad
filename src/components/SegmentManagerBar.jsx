import React, { useState } from 'react';
import {
  GitFork,
  Plus,
  Trash2,
  Eye,
  Pencil,
  Check,
  X,
} from 'lucide-react';

const PRESET_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

export default function SegmentManagerBar({
  project,
  activeSegmentId,
  onSelectSegment,
  onOpenIntersectionModal,
  onAddSegment,
  onUpdateSegment,
  onDeleteSegment,
  showAllSegmentsOnMap,
  setShowAllSegmentsOnMap,
}) {
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState(null);

  // New segment form state
  const [newSegName, setNewSegName] = useState('');
  const [newSegCode, setNewSegCode] = useState('');
  const [newSegColor, setNewSegColor] = useState('#3b82f6');

  // Edit segment form state
  const [editSegName, setEditSegName] = useState('');
  const [editSegColor, setEditSegColor] = useState('#ef4444');

  if (!project) return null;

  const segments = project.segments || [];
  const intersections = project.intersections || [];

  const handleStartAdd = () => {
    const nextIdx = segments.length + 1;
    const colors = PRESET_COLORS;
    const nextColor = colors[(nextIdx - 1) % colors.length];
    setNewSegName(`Ruas ${nextIdx}`);
    setNewSegCode(String.fromCharCode(64 + nextIdx)); // A, B, C...
    setNewSegColor(nextColor);
    setIsAddingSegment(true);
  };

  const handleConfirmAdd = (e) => {
    e.preventDefault();
    if (!newSegName.trim()) return;

    onAddSegment({
      id: `seg_${Date.now()}`,
      name: newSegName.trim(),
      code: newSegCode.trim() || 'SEG',
      color: newSegColor,
      rawText: '',
      stations: [],
      allPoints: [],
    });

    setIsAddingSegment(false);
  };

  const handleStartEdit = (seg) => {
    setEditingSegmentId(seg.id);
    setEditSegName(seg.name);
    setEditSegColor(seg.color || '#ef4444');
  };

  const handleConfirmEdit = (segId) => {
    onUpdateSegment(segId, {
      name: editSegName.trim(),
      color: editSegColor,
    });
    setEditingSegmentId(null);
  };

  return (
    <div className="bg-white border-b border-slate-200 px-3.5 py-1.5 flex items-center justify-between gap-3 text-xs shadow-xs min-h-[42px] z-10">
      {/* Left Section: Road Segments Tabs & Controls */}
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto py-0.5">
        <div className="flex items-center gap-1.5 shrink-0 text-slate-500 font-bold text-[11px] uppercase tracking-wider pl-0.5">
          <GitFork className="w-3.5 h-3.5 text-blue-600 rotate-90" />
          <span className="hidden sm:inline">Ruas Trase:</span>
          <span className="sm:hidden">Ruas:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-nowrap">
          {segments.map((seg) => {
            const isActive = seg.id === activeSegmentId;
            const isEditing = editingSegmentId === seg.id;
            const staCount = seg.stations?.length || 0;
            const lastSta = seg.stations && seg.stations.length > 1 ? seg.stations[seg.stations.length - 1] : null;
            const totalLength = lastSta?.cumulativeDist != null ? Number(lastSta.cumulativeDist).toFixed(0) : 0;

            if (isEditing) {
              return (
                <div
                  key={seg.id}
                  className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-blue-400 shadow-xs shrink-0"
                >
                  <input
                    type="color"
                    value={editSegColor}
                    onChange={(e) => setEditSegColor(e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={editSegName}
                    onChange={(e) => setEditSegName(e.target.value)}
                    className="w-28 px-1.5 py-0.5 text-xs bg-slate-50 border border-slate-300 rounded font-bold"
                  />
                  <button
                    onClick={() => handleConfirmEdit(seg.id)}
                    className="p-1 text-emerald-600 hover:text-emerald-700"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingSegmentId(null)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={seg.id}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all font-semibold cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-blue-50/80 text-blue-900 border-blue-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                }`}
                onClick={() => onSelectSegment(seg.id)}
              >
                {/* Segment Color Dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-white shrink-0 shadow-2xs"
                  style={{ backgroundColor: seg.color || '#ef4444' }}
                />

                <span className="text-xs truncate max-w-[140px] font-bold">
                  {seg.name}
                </span>

                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                  isActive ? 'bg-blue-100/90 text-blue-800' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {staCount} STA{totalLength > 0 ? ` (${totalLength}m)` : ''}
                </span>

                {/* Edit & Delete Actions for Active Segment */}
                {isActive && (
                  <div className="flex items-center gap-0.5 ml-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleStartEdit(seg)}
                      className="p-0.5 text-slate-400 hover:text-slate-700 rounded hover:bg-blue-100/60"
                      title="Ubah Nama & Warna Segmen"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {segments.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Yakin ingin menghapus segmen "${seg.name}"?`)) {
                            onDeleteSegment(seg.id);
                          }
                        }}
                        className="p-0.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                        title="Hapus Segmen"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Segment Button */}
          <button
            onClick={handleStartAdd}
            className="flex items-center gap-1 px-2.5 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg font-bold text-xs transition-colors shrink-0 border border-dashed border-blue-300"
            title="Tambah Segmen Ruas Baru"
          >
            <Plus className="w-3.5 h-3.5" /> Ruas Baru
          </button>
        </div>
      </div>

      {/* Right Section: Intersections & Map Display Options */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Intersection Button */}
        <button
          onClick={onOpenIntersectionModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold border transition-colors ${
            intersections.length > 0
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 shadow-2xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title="Kelola titik temu / persimpangan antar segmen jalan"
        >
          <GitFork className="w-3.5 h-3.5 text-amber-600" />
          <span>Simpang</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px]">
            {intersections.length}
          </span>
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {/* Show All Segments Map Toggle */}
        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none font-medium hover:text-slate-900">
          <input
            type="checkbox"
            checked={showAllSegmentsOnMap}
            onChange={(e) => setShowAllSegmentsOnMap(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline text-[11px]">Semua Ruas di Peta</span>
        </label>
      </div>

      {/* Add Segment Modal Drawer */}
      {isAddingSegment && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleConfirmAdd}
            className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 w-full max-w-md space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Tambah Segmen Ruas Jalan Baru</h3>
              <button
                type="button"
                onClick={() => setIsAddingSegment(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nama Ruas Jalan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSegName}
                  onChange={(e) => setNewSegName(e.target.value)}
                  placeholder="Contoh: Jl. Cabang Melati (Akses Simpang)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Kode Ruas
                  </label>
                  <input
                    type="text"
                    value={newSegCode}
                    onChange={(e) => setNewSegCode(e.target.value)}
                    placeholder="Contoh: B atau CABANG"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Warna Garis As (Trase)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newSegColor}
                      onChange={(e) => setNewSegColor(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-slate-600 uppercase font-bold">{newSegColor}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px] leading-relaxed">
              💡 Setelah ruas baru dibuat, Anda dapat menginput data survey khusus untuk ruas ini lewat tombol <strong>Input Data</strong>, atau menautkannya sebagai <strong>Persimpangan</strong> dengan ruas utama.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsAddingSegment(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
              >
                Buat Ruas
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
