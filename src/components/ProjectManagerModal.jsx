import React, { useState } from 'react';
import { UTM_ZONES } from '../utils/coordinateTransform';
import {
  FolderKanban,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  MapPin,
  Download,
  Upload,
} from 'lucide-react';

export default function ProjectManagerModal({
  isOpen,
  onClose,
  projects = [],
  activeProjectId,
  onSwitchProject,
  onCreateProject,
  _onUpdateProject,
  onDeleteProject,
  onDuplicateProject,
  onExportWorkspace,
  onImportWorkspace,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newSurveyor, setNewSurveyor] = useState('');
  const [newUtmZone, setNewUtmZone] = useState('49S');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setNewProjectName(`Proyek Survei Jalan Baru ${projects.length + 1}`);
    setNewLocation('Kota / Kabupaten');
    setNewClient('Dinas Pekerjaan Umum / Klien');
    setNewSurveyor('Surveyor Topografi');
    setNewUtmZone('49S');
    setIsCreating(true);
  };

  const handleConfirmCreate = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    onCreateProject({
      name: newProjectName.trim(),
      location: newLocation.trim() || 'Indonesia',
      client: newClient.trim() || 'Pemberi Tugas',
      surveyor: newSurveyor.trim() || 'Surveyor',
      utmZone: newUtmZone,
    });

    setIsCreating(false);
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        try {
          onImportWorkspace(text);
        } catch {
          alert('Gagal memuat file proyek: Format JSON tidak valid');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Manajemen Proyek & Multi-Lokasi
              </h2>
              <p className="text-xs text-slate-500">
                Kelola berbagai proyek survey di berbagai lokasi dan sistem koordinat (UTM) berbeda
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Actions: Create + Import/Export */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Buat Proyek Baru
            </button>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors">
                <Upload className="w-3.5 h-3.5 text-slate-500" /> Impor Backup JSON
                <input
                  type="file"
                  accept=".json,.georoad.json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
              <button
                onClick={onExportWorkspace}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                title="Unduh seluruh database proyek ke file JSON"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" /> Backup Semua Proyek
              </button>
            </div>
          </div>

          {/* Create Project Form Drawer */}
          {isCreating && (
            <form
              onSubmit={handleConfirmCreate}
              className="p-4.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  Formulir Proyek Baru
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nama Proyek <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Contoh: Peningkatan Jalan Lintas Wilayah Barat"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Lokasi / Daerah Proyek
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Contoh: Kota Semarang / Cirebon / Jakarta"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Zona UTM (CRS) Proyek
                  </label>
                  <select
                    value={newUtmZone}
                    onChange={(e) => setNewUtmZone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {UTM_ZONES.map((z) => (
                      <option key={z.value} value={z.value}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Instansi / Klien
                  </label>
                  <input
                    type="text"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    placeholder="Contoh: Dinas Bina Marga"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Simpan & Buat Proyek
                </button>
              </div>
            </form>
          )}

          {/* Project List Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Daftar Proyek Tersimpan ({projects.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {projects.map((proj) => {
                const isActive = proj.id === activeProjectId;
                const segmentCount = proj.segments?.length || 0;
                const totalPoints =
                  proj.segments?.reduce(
                    (sum, s) => sum + (s.allPoints?.length || 0),
                    0
                  ) || 0;
                const intersectionCount = proj.intersections?.length || 0;

                return (
                  <div
                    key={proj.id}
                    className={`p-4.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-blue-50/50 border-blue-400 shadow-sm ring-1 ring-blue-400'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {proj.name}
                            </span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white flex items-center gap-1">
                                <Check className="w-3 h-3" /> Aktif
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{proj.location || 'Lokasi tidak dispesifikasi'}</span>
                          </div>
                        </div>

                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold shrink-0">
                          UTM {proj.utmZone || '49S'}
                        </span>
                      </div>

                      {/* Card Metadata Chips */}
                      <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-slate-100 text-center">
                        <div className="bg-slate-50 p-1.5 rounded-lg">
                          <span className="block text-[10px] text-slate-400 font-medium">Segmen Ruas</span>
                          <span className="text-xs font-bold text-slate-700">{segmentCount} Ruas</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg">
                          <span className="block text-[10px] text-slate-400 font-medium">Titik Ukur</span>
                          <span className="text-xs font-bold text-slate-700">{totalPoints} Titik</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg">
                          <span className="block text-[10px] text-slate-400 font-medium">Persimpangan</span>
                          <span className="text-xs font-bold text-slate-700">{intersectionCount} Simpang</span>
                        </div>
                      </div>

                      {/* Client / Surveyor */}
                      <div className="text-[11px] text-slate-500 space-y-0.5 mb-3">
                        {proj.client && <div>Klien: <span className="text-slate-700 font-medium">{proj.client}</span></div>}
                        {proj.surveyor && <div>Surveyor: <span className="text-slate-700 font-medium">{proj.surveyor}</span></div>}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onDuplicateProject(proj.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100"
                          title="Duplikasi Proyek Ini"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {projects.length > 1 && (
                          <button
                            onClick={() => {
                              if (confirm(`Yakin ingin menghapus proyek "${proj.name}"?`)) {
                                onDeleteProject(proj.id);
                              }
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                            title="Hapus Proyek"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {!isActive ? (
                        <button
                          onClick={() => {
                            onSwitchProject(proj.id);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition-colors"
                        >
                          Buka Proyek Ini
                        </button>
                      ) : (
                        <button
                          onClick={onClose}
                          className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-semibold text-xs"
                        >
                          Sedang Dibuka
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Total {projects.length} Proyek aktif tersimpan di memori browser
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
