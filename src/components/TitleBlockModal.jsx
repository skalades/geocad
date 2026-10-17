import React, { useState } from 'react';
import {
  FileText,
  Printer,
  X,
  Settings2,
} from 'lucide-react';

export default function TitleBlockModal({
  isOpen,
  onClose,
  projectInfo = {},
  activeSegmentName = '',
  _stationsCount = 0,
}) {
  const [formData, setFormData] = useState(() => ({
    agency: projectInfo.client || 'DINAS PEKERJAAN UMUM DAN PENATAAN RUANG KABUPATEN KARAWANG',
    subAgency: 'Jl. Dewi Sartika No. 1 Karawang',
    projectName: projectInfo.name || 'PENINGKATAN JALAN AKSES TOL KARAWANG BARAT',
    location: projectInfo.location || 'KABUPATEN KARAWANG',
    drawingTitle: `GAMBAR TEKNIK PENAMPANG JALAN - ${activeSegmentName || 'RUAS UTAMA'}`,
    contractor: 'CV. ASPIRASI LUHUR',
    consultant: 'PENGAWAS LAPANGAN DINAS PUPR KABUPATEN KARAWANG',
    drawnBy: projectInfo.surveyor || 'DIMAS HENDRIWIANTO (Direktur)',
    checkedBy: 'M. SHOFARUDDIN / HENDRA',
    approvedBy: 'PENGAWAS LAPANGAN DINAS PUPR KAB. KARAWANG',
    sheetNo: 'B-01',
    totalSheets: '76',
    scaleH: '1 : 1000',
    scaleV: '1 : 100',
    date: projectInfo.surveyDate || new Date().toISOString().split('T')[0],
    paperSize: 'A3', // 'A3' or 'A4'
  }));

  if (!isOpen) return null;

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Kop Gambar Standar Cetak &amp; Layout Album PDF
              </h2>
              <p className="text-xs text-slate-500">
                Format etiket gambar teknik resmi standar Dinas PUPR / Bina Marga (Ukuran A3 &amp; A4)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak / Simpan ke PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Metadata Form Grid */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="font-bold text-slate-700 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-slate-500" /> Pengaturan Informasi Etiket (Kop Gambar)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Instansi Pemilik Proyek</label>
                <input
                  type="text"
                  value={formData.agency}
                  onChange={(e) => handleChange('agency', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nama Paket Pekerjaan</label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => handleChange('projectName', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Lokasi Proyek</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Judul Gambar</label>
                <input
                  type="text"
                  value={formData.drawingTitle}
                  onChange={(e) => handleChange('drawingTitle', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Konsultan Perencana</label>
                <input
                  type="text"
                  value={formData.consultant}
                  onChange={(e) => handleChange('consultant', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Kontraktor Pelaksana</label>
                <input
                  type="text"
                  value={formData.contractor}
                  onChange={(e) => handleChange('contractor', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Digambar Oleh</label>
                <input
                  type="text"
                  value={formData.drawnBy}
                  onChange={(e) => handleChange('drawnBy', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Diperiksa / Disetujui</label>
                <input
                  type="text"
                  value={formData.checkedBy}
                  onChange={(e) => handleChange('checkedBy', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-slate-600 font-semibold mb-1">No. Lembar</label>
                  <input
                    type="text"
                    value={formData.sheetNo}
                    onChange={(e) => handleChange('sheetNo', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-center font-bold"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-slate-600 font-semibold mb-1">Jml Lembar</label>
                  <input
                    type="text"
                    value={formData.totalSheets}
                    onChange={(e) => handleChange('totalSheets', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-center font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Title Block Live Preview */}
          <div>
            <div className="font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>Pratinjau Etiket Gambar Standar (Kop):</span>
              <span className="text-[11px] text-slate-400 font-normal">
                Garis luar tebal 2pt, pembagian kolom simetris
              </span>
            </div>

            <div className="border-2 border-slate-800 bg-white p-3 font-sans shadow-sm rounded-lg overflow-x-auto">
              <table className="w-full border-collapse border border-slate-800 text-[11px]">
                <tbody>
                  {/* Row 1: Agency */}
                  <tr>
                    <td className="border border-slate-800 p-2 w-1/4 text-center font-bold bg-slate-50 uppercase text-[10px]">
                      PEMERINTAH REPUBLIK INDONESIA<br />
                      <span className="text-xs">{formData.agency}</span>
                    </td>
                    <td className="border border-slate-800 p-2 w-1/2 text-center" colSpan={2}>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Paket Pekerjaan</div>
                      <div className="font-extrabold text-xs text-slate-900 uppercase">{formData.projectName}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{formData.location}</div>
                    </td>
                    <td className="border border-slate-800 p-2 w-1/4 text-center bg-slate-50">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Tahun Anggaran</div>
                      <div className="font-bold text-xs">{formData.date.split('-')[0] || '2026'}</div>
                    </td>
                  </tr>

                  {/* Row 2: Drawing Title & Scales */}
                  <tr>
                    <td className="border border-slate-800 p-2 text-center">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Konsultan Perencana</div>
                      <div className="font-bold text-slate-800">{formData.consultant}</div>
                    </td>
                    <td className="border border-slate-800 p-2 text-center" colSpan={2}>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Judul Gambar</div>
                      <div className="font-black text-sm text-blue-900 uppercase tracking-wide">
                        {formData.drawingTitle}
                      </div>
                    </td>
                    <td className="border border-slate-800 p-2 text-center">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Skala Gambar</div>
                      <div className="font-mono font-bold text-xs">
                        H: {formData.scaleH} &bull; V: {formData.scaleV}
                      </div>
                    </td>
                  </tr>

                  {/* Row 3: Signatures & Sheet No */}
                  <tr>
                    <td className="border border-slate-800 p-2 text-center">
                      <div className="text-[9px] text-slate-500 uppercase">Digambar</div>
                      <div className="font-semibold text-slate-800 mt-1">{formData.drawnBy}</div>
                    </td>
                    <td className="border border-slate-800 p-2 text-center">
                      <div className="text-[9px] text-slate-500 uppercase">Diperiksa</div>
                      <div className="font-semibold text-slate-800 mt-1">{formData.checkedBy}</div>
                    </td>
                    <td className="border border-slate-800 p-2 text-center">
                      <div className="text-[9px] text-slate-500 uppercase">Disetujui PPK</div>
                      <div className="font-semibold text-slate-800 mt-1">{formData.approvedBy}</div>
                    </td>
                    <td className="border border-slate-800 p-2 text-center bg-slate-100 font-bold">
                      <div className="text-[9px] text-slate-500 uppercase">No. Lembar</div>
                      <div className="text-sm font-mono font-black text-slate-900">
                        {formData.sheetNo} / {formData.totalSheets}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Kop gambar akan terpasang di sisi bawah pada setiap hasil cetak dokumen teknik.
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
