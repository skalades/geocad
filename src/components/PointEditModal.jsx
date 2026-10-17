import React, { useState } from 'react';
import { X, Save, Trash2, Edit3 } from 'lucide-react';

export default function PointEditModal({
  isOpen,
  onClose,
  point,
  onSaveAttributes,
  onDeletePoint,
}) {
  const [formData, setFormData] = useState(() => ({
    rawNo: point?.rawNo || '',
    role: point?.role || 'Ki',
    x: point?.x || 0,
    y: point?.y || 0,
    z: point?.z || 0,
    remark: point?.remark || '',
  }));

  const [prevPointId, setPrevPointId] = useState(point?.id);
  if (point && point.id !== prevPointId) {
    setPrevPointId(point.id);
    setFormData({
      rawNo: point.rawNo || '',
      role: point.role || 'Ki',
      x: point.x || 0,
      y: point.y || 0,
      z: point.z || 0,
      remark: point.remark || '',
    });
  }

  if (!isOpen || !point) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveAttributes(point.id, {
      rawNo: formData.rawNo ? Number(formData.rawNo) : point.rawNo,
      role: formData.role,
      x: Number(formData.x),
      y: Number(formData.y),
      z: Number(formData.z),
      remark: formData.remark,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Yakin ingin menghapus titik #${point.rawNo} (${point.station || point.rawCode})?`)) {
      onDeletePoint(point.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Edit Atribut Titik Ukur
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {point.station || point.rawCode} • ID: {point.id}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nomor Titik (#No):
              </label>
              <input
                type="number"
                value={formData.rawNo}
                onChange={e => setFormData({ ...formData, rawNo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Peran Geometri:
              </label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="CL">★ CL (As Jalan)</option>
                <option value="Ki">Tepi Kiri (Ki)</option>
                <option value="Ka">Tepi Kanan (Ka)</option>
                <option value="P">Titik Biasa / Non-CL (P)</option>
                <option value="Ki_Edge">Ujung Kiri Luar (Ki Edge)</option>
                <option value="Ka_Edge">Ujung Kanan Luar (Ka Edge)</option>
                <option value="Bahu_Ki">Bahu Jalan Kiri</option>
                <option value="Bahu_Ka">Bahu Jalan Kanan</option>
                <option value="Saluran_Ki">Saluran Kiri</option>
                <option value="Saluran_Ka">Saluran Kanan</option>
                <option value="Tanah">Tanah / Fitur Lain</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Koordinat X (Easting):
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.x}
                onChange={e => setFormData({ ...formData, x: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Koordinat Y (Northing):
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.y}
                onChange={e => setFormData({ ...formData, y: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Elevasi Z (Meter):
            </label>
            <input
              type="number"
              step="0.001"
              value={formData.z}
              onChange={e => setFormData({ ...formData, z: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Perubahan elevasi Z akan langsung memperbarui kurva memanjang & melintang.
            </span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Keterangan / Deskripsi Lapangan:
            </label>
            <input
              type="text"
              placeholder="Contoh: Tepi Aspal, Puncak, U-Ditch, dll."
              value={formData.remark}
              onChange={e => setFormData({ ...formData, remark: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Titik
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Simpan Atribut
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
