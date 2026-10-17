import React, { useState, useEffect } from 'react';
import { generateSurveyDxf } from '../utils/dxfGenerator';
import { exportCivil3dPointsPnezd } from '../utils/saveExportUtils';
import { exportSegmentToLandXml } from '../utils/landxmlUtils';
import {
  Download,
  X,
  Layers,
  FileCode,
  CheckCircle2,
  Sparkles,
  Info,
  ShieldCheck,
  Sliders,
  Printer,
  TrendingUp,
  MapPin,
  FileSpreadsheet,
} from 'lucide-react';

export default function CadExportModal({
  isOpen,
  onClose,
  stations = [],
  allPoints = [],
  segments = [],
  _activeSegmentId,
  activeSegmentName = '',
  utmZone = '48S',
}) {
  const [fileFormat, setFileFormat] = useState('dxf'); // 'dxf' untuk 100% kompatibilitas Civil 3D
  const [exportScope, setExportScope] = useState('all_merged'); // 'all_merged' | 'active' | 'batch'
  const [includeAlignment, setIncludeAlignment] = useState(true); // Denah 3D koordinat nyata
  const [includeProfiles, setIncludeProfiles] = useState(true); // Profil Memanjang & Melintang
  const [includeKop, setIncludeKop] = useState(false); // Default OFF: Kop dinas PUPR
  const [includeDesignFgl, setIncludeDesignFgl] = useState(false); // Default OFF: Desain FGL
  const [hScaleLong, setHScaleLong] = useState(1000);
  const [vScaleLong, setVScaleLong] = useState(100);
  const [scaleCross, setScaleCross] = useState(100);
  const [filename, setFilename] = useState('Trase_Penampang_Jalan_Keseluruhan.dxf');

  // Reset defaults saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setIncludeAlignment(true);
      setIncludeProfiles(true);
      setIncludeKop(false);
      setIncludeDesignFgl(false);
    }
  }, [isOpen]);

  // Update nama berkas saat format / cakupan berubah
  useEffect(() => {
    const ext = fileFormat.toLowerCase();
    const baseName =
      exportScope === 'all_merged'
        ? `Trase_Penampang_Jalan_UTM${utmZone}`
        : exportScope === 'active'
        ? `${(activeSegmentName || 'Ruas_Aktif').replace(/[^a-zA-Z0-9_-]/g, '_')}_CAD_UTM${utmZone}`
        : `Trase_Batch_UTM${utmZone}`;
    setFilename(`${baseName}.${ext}`);
  }, [fileFormat, exportScope, activeSegmentName, utmZone]);

  if (!isOpen) return null;

  const validSegments = segments.filter((s) => s.stations && s.stations.length > 0);
  const totalProjectStationsCount = validSegments.length > 0
    ? validSegments.reduce((sum, s) => sum + s.stations.length, 0)
    : stations.length;

  // Dapatkan seluruh titik ukur untuk export CSV Civil 3D
  const getExportPoints = () => {
    if (exportScope === 'all_merged') {
      if (allPoints && allPoints.length > 0) return allPoints;
      return validSegments.flatMap((s) => s.allPoints || s.stations?.flatMap((st) => st.points || []) || []);
    }
    return allPoints.length > 0 ? allPoints : stations.flatMap((s) => s.points || []);
  };

  // Unduh Berkas CAD (.DXF / .DWG)
  const handleDownload = () => {
    const ext = fileFormat.toLowerCase();
    const mimeType = 'application/dxf;charset=utf-8';

    if (exportScope === 'all_merged') {
      const targetSegments = (validSegments.length > 0
        ? validSegments
        : [{ name: activeSegmentName || 'Ruas Utama', stations, allPoints }]
      ).map((s) => ({
        ...s,
        allPoints: s.allPoints && s.allPoints.length > 0 ? s.allPoints : allPoints,
      }));

      const dxfContent = generateSurveyDxf({
        stations,
        allPoints,
        segments: targetSegments,
        utmZone,
        hScaleLong,
        vScaleLong,
        hScaleCross: scaleCross,
        vScaleCross: scaleCross,
        includeAlignment,
        includeProfiles,
        includeKop,
        includeDesignFgl,
      });

      const blob = new Blob([dxfContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanName = filename.toLowerCase().endsWith(`.${ext}`)
        ? filename
        : `${filename.replace(/\.[^/.]+$/, '')}.${ext}`;
      link.download = cleanName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (exportScope === 'active' || segments.length <= 1) {
      const dxfContent = generateSurveyDxf({
        stations,
        allPoints,
        segments: [{ name: activeSegmentName || 'Ruas Utama', stations, allPoints }],
        utmZone,
        hScaleLong,
        vScaleLong,
        hScaleCross: scaleCross,
        vScaleCross: scaleCross,
        includeAlignment,
        includeProfiles,
        includeKop,
        includeDesignFgl,
      });

      const blob = new Blob([dxfContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanName = filename.toLowerCase().endsWith(`.${ext}`)
        ? filename
        : `${filename.replace(/\.[^/.]+$/, '')}.${ext}`;
      link.download = cleanName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      validSegments.forEach((item, idx) => {
        const segDxf = generateSurveyDxf({
          stations: item.stations,
          allPoints: item.allPoints && item.allPoints.length > 0 ? item.allPoints : allPoints,
          segments: [item],
          utmZone,
          hScaleLong,
          vScaleLong,
          hScaleCross: scaleCross,
          vScaleCross: scaleCross,
          includeAlignment,
          includeProfiles,
          includeKop,
          includeDesignFgl,
        });

        const cleanSegName = item.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const segFilename = `${cleanSegName}_CAD_UTM${utmZone}.${ext}`;

        setTimeout(() => {
          const blob = new Blob([segDxf], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = segFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, idx * 250);
      });
    }

    onClose();
  };

  // Unduh Titik Survei format Civil 3D PNEZD (.CSV)
  const handleDownloadCivil3dCsv = () => {
    const pts = getExportPoints();
    const cleanBase = filename.replace(/\.[^/.]+$/, '');
    exportCivil3dPointsPnezd(pts, `${cleanBase}_PNEZD_UTM${utmZone}.csv`, 'PNEZD');
  };

  // Unduh Berkas Native Autodesk Civil 3D LandXML (.XML)
  const handleDownloadLandXml = () => {
    const targetSegment = (validSegments.length > 0 ? validSegments[0] : null) || {
      name: activeSegmentName || 'Ruas_Utama',
      stations,
      allPoints,
    };
    const xml = exportSegmentToLandXml(targetSegment, utmZone, 'GeoRoad CAD');
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanBase = (activeSegmentName || targetSegment.name || 'Ruas_Utama').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${cleanBase}_Civil3D_LandXML.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Export CAD &amp; Civil 3D 2024
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  UTM {utmZone}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                100% Kompatibel dengan Autodesk Civil 3D 2016-2026, AutoCAD &amp; QCAD
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

        {/* Body */}
        <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* UTM Zone & Coordinate System Banner */}
          <div className="p-3 bg-emerald-50/90 rounded-xl border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed flex-1">
              <div className="font-bold text-emerald-900 flex items-center justify-between">
                <span>Sistem Koordinat Aktif: WGS 84 / UTM Zone {utmZone} (Metrik)</span>
                <span className="text-[9px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-extrabold">
                  ZOOM PRESISI
                </span>
              </div>
              <p className="text-emerald-800/90 mt-0.5">
                Titik ukur diexport di koordinat nyata Easting (X), Northing (Y), dan Elevasi (Z).
                Gambar profil otomatis di-anchor di samping denah sehingga <strong>zoom di Civil 3D langsung fokus</strong> dan tidak terpisah jauh.
              </p>
            </div>
          </div>

          {/* Format File Selection: Native DXF, LandXML & PNEZD CSV for Civil 3D */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Pilihan Format Ekspor Standar Civil 3D:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setFileFormat('dxf')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  fileFormat === 'dxf'
                    ? 'bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${fileFormat === 'dxf' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    CAD Drawing (.DXF)
                    {fileFormat === 'dxf' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1 leading-snug">
                    Trase 3D, Profil Memanjang &amp; Melintang. Terbuka di semua versi AutoCAD &amp; Civil 3D via <em>File &gt; Open</em>.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleDownloadLandXml}
                className="flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all bg-white border-amber-200 hover:bg-amber-50/70 hover:border-amber-400 group"
              >
                <div className="p-1.5 rounded-lg shrink-0 mt-0.5 bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    LandXML (.XML)
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-extrabold">
                      CIVIL 3D NATIVE
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Standar resmi Civil 3D untuk <strong>Alignment 3D, Profil (PVI), &amp; Cross Section</strong> via <em>Insert &gt; LandXML</em>.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleDownloadCivil3dCsv}
                className="flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all bg-white border-blue-200 hover:bg-blue-50/70 hover:border-blue-400 group"
              >
                <div className="p-1.5 rounded-lg shrink-0 mt-0.5 bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    Titik PNEZD (.CSV)
                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded font-extrabold">
                      COGO POINTS
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Point, Northing, Easting, Elevasi untuk <strong>TIN Surface (Kontur)</strong> via <em>Points &gt; Import Points</em>.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Important Civil 3D Notice Banner with Troubleshooting */}
          <div className="p-3 bg-blue-50/90 rounded-xl border border-blue-200 text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed flex-1">
              <span className="font-bold text-blue-950">Panduan Mengapa File Tidak Terbuka di Autodesk Civil 3D:</span>
              <ul className="list-disc pl-4 mt-1 space-y-1 text-blue-900/90">
                <li>
                  <strong>File tidak muncul di folder saat Open?</strong> Pada dialog <em>File &gt; Open</em> di Civil 3D, pastikan dropdown <strong>Files of type</strong> diganti dari <code>Drawing (*.dwg)</code> menjadi <strong><code>DXF (*.dxf)</code></strong>. Jika dibiarkan .dwg, Civil 3D otomatis menyembunyikan berkas DXF.
                </li>
                <li>
                  <strong>Buka langsung (Open), Jangan Drag-and-Drop:</strong> Jangan menyeret file ke lembar gambar kosong karena AutoCAD akan memicu perintah <code>INSERT</code> blok alih-alih membuka gambar. Gunakan menu <strong>File &gt; Open</strong>.
                </li>
                <li>
                  <strong>Ingin Simpan Jadi .DWG Asli Autodesk?</strong> Setelah gambar DXF terbuka di Civil 3D, cukup tekan <kbd className="px-1.5 py-0.5 bg-white rounded border border-blue-300 font-mono text-[10px] font-bold">Ctrl + S</kbd> atau pilih <em>File &gt; Save As &gt; Drawing (.dwg)</em>.
                </li>
                <li>
                  <strong>Ingin Objek Asli Civil 3D (Alignment &amp; Profile)?</strong> Gunakan berkas <strong>LandXML (.XML)</strong> via tab <em>Insert &gt; LandXML</em>.
                </li>
              </ul>
            </div>
          </div>

          {/* Cakupan Data yang Diexport */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 block">
                Cakupan Data Ruas:
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Rekomendasi
              </span>
            </div>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  exportScope === 'all_merged'
                    ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  value="all_merged"
                  checked={exportScope === 'all_merged'}
                  onChange={() => setExportScope('all_merged')}
                  className="mt-0.5 text-emerald-600"
                />
                <div className="flex-1">
                  <div className="font-bold flex items-center gap-1.5">
                    Keseluruhan Proyek (1 File CAD Utuh)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Menggabungkan <strong>semua ruas ({validSegments.length > 0 ? validSegments.length : 1} ruas)</strong> &amp; total <strong>{totalProjectStationsCount} penampang melintang</strong> ke dalam 1 berkas gambar utuh tanpa terpotong.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  exportScope === 'active'
                    ? 'bg-blue-50/80 border-blue-400 text-blue-950 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  value="active"
                  checked={exportScope === 'active'}
                  onChange={() => setExportScope('active')}
                  className="mt-0.5 text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-bold">
                    Ruas Aktif Saja: {activeSegmentName || 'Ruas Utama'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hanya mengekspor ruas yang sedang aktif ({stations.length} penampang melintang &amp; profil memanjang).
                  </div>
                </div>
              </label>

              {validSegments.length > 1 && (
                <label
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    exportScope === 'batch'
                      ? 'bg-amber-50/80 border-amber-400 text-amber-950 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportScope"
                    value="batch"
                    checked={exportScope === 'batch'}
                    onChange={() => setExportScope('batch')}
                    className="mt-0.5 text-amber-600"
                  />
                  <div className="flex-1">
                    <div className="font-bold">
                      File Terpisah per Ruas (Batch {validSegments.length} Berkas)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Mengunduh setiap ruas secara mandiri ke dalam berkas CAD terpisah masing-masing.
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* 3. Pilihan Elemen Gambar (FITUR ON / OFF) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 block flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                Pilihan Elemen Gambar (Fitur ON / OFF):
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                Sesuaikan kebutuhan gambar
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Feature 1: TITIK SURVEI & DENAH TRASE 3D */}
              <button
                type="button"
                onClick={() => setIncludeAlignment(!includeAlignment)}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  includeAlignment
                    ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/40'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-[11px] flex items-center gap-1 text-slate-800">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Denah Trase 3D (UTM)
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase transition-colors ${
                    includeAlignment ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {includeAlignment ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Titik 3D (X, Y, Z), As Jalan, Garis Cross, &amp; Tepi di koordinat nyata UTM {utmZone}
                </p>
              </button>

              {/* Feature 2: PROFIL MEMANJANG & MELINTANG */}
              <button
                type="button"
                onClick={() => setIncludeProfiles(!includeProfiles)}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  includeProfiles
                    ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/40'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-[11px] flex items-center gap-1 text-slate-800">
                    <Layers className="w-3.5 h-3.5 text-teal-600" />
                    Profil Long &amp; Cross
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase transition-colors ${
                    includeProfiles ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {includeProfiles ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Lembar Profil Memanjang &amp; Potongan Melintang (di-anchor pas di samping denah)
                </p>
              </button>

              {/* Feature 3: KOP GAMBAR PUPR */}
              <button
                type="button"
                onClick={() => setIncludeKop(!includeKop)}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  includeKop
                    ? 'bg-blue-50/90 border-blue-400 text-blue-950 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-[11px] flex items-center gap-1 text-slate-800">
                    <Printer className="w-3.5 h-3.5 text-indigo-500" />
                    Kop Gambar PUPR
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase transition-colors ${
                    includeKop ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {includeKop ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Etiket dinas PUPR Karawang (Nonaktif secara default agar gambar bersih)
                </p>
              </button>

              {/* Feature 4: BARIS ELEVASI RENCANA (FGL) */}
              <button
                type="button"
                onClick={() => setIncludeDesignFgl(!includeDesignFgl)}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  includeDesignFgl
                    ? 'bg-amber-50/90 border-amber-400 text-amber-950 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-[11px] flex items-center gap-1 text-slate-800">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    Elevasi Rencana (FGL)
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase transition-colors ${
                    includeDesignFgl ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {includeDesignFgl ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Garis elevasi rencana &amp; baris FGL pada tabel data band
                </p>
              </button>
            </div>
          </div>

          {/* Opsi Ekspor Khusus Autodesk Civil 3D (LandXML & PNEZD CSV) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">
                    LandXML (.XML) Civil 3D
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Tab <em>Insert &gt; LandXML</em> (Alignment &amp; Profil)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadLandXml}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                .XML
              </button>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">
                    Titik Civil 3D (PNEZD .CSV)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Menu <em>Points &gt; Import Points</em> (TIN Surface)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadCivil3dCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                .CSV
              </button>
            </div>
          </div>

          {/* Nama File Output */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Nama Berkas CAD:</label>
            <div className="relative">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800 font-semibold"
              />
              <span className="absolute right-3 top-2 text-[11px] font-mono text-slate-400 font-bold uppercase">
                .{fileFormat}
              </span>
            </div>
          </div>

          {/* Skala Gambar Teknik (jika profil aktif) */}
          {includeProfiles && (
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Skala Horisontal:
                </label>
                <select
                  value={hScaleLong}
                  onChange={(e) => setHScaleLong(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-xs"
                >
                  <option value="500">1:500</option>
                  <option value="1000">1:1000</option>
                  <option value="2000">1:2000</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Skala Vertikal (Long):
                </label>
                <select
                  value={vScaleLong}
                  onChange={(e) => setVScaleLong(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-xs"
                >
                  <option value="50">1:50</option>
                  <option value="100">1:100</option>
                  <option value="200">1:200</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Skala Melintang (Cross):
                </label>
                <select
                  value={scaleCross}
                  onChange={(e) => setScaleCross(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-xs"
                >
                  <option value="50">1:50</option>
                  <option value="100">1:100</option>
                  <option value="200">1:200</option>
                </select>
              </div>
            </div>
          )}

          {/* Ringkasan Layer AutoCAD */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-[11px] text-slate-600">
            <span className="font-bold text-slate-700 block flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Ringkasan Objek &amp; Layer CAD:
              </span>
              <span className="text-[10px] text-slate-700 bg-slate-200/90 px-2 py-0.5 rounded font-bold">
                {includeAlignment ? 'Denah 3D' : ''}
                {includeAlignment && includeProfiles ? ' + ' : ''}
                {includeProfiles ? 'Profil' : ''}
                {includeKop ? ' + Kop' : ''}
                {includeDesignFgl ? ' + FGL' : ''}
              </span>
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px]">
              <div className={includeAlignment ? 'text-emerald-700 font-bold' : 'text-slate-400 opacity-60'}>
                • SURV_TITIK_SURVEI (Titik 3D) {includeAlignment ? '✓' : '(Off)'}
              </div>
              <div className={includeAlignment ? 'text-red-600 font-bold' : 'text-slate-400 opacity-60'}>
                • SURV_AS_JALAN (Garis As 3D) {includeAlignment ? '✓' : '(Off)'}
              </div>
              <div className={includeAlignment ? 'text-fuchsia-600 font-bold' : 'text-slate-400 opacity-60'}>
                • SURV_GARIS_CROSS (Garis Cross) {includeAlignment ? '✓' : '(Off)'}
              </div>
              <div className={includeAlignment ? 'text-amber-600 font-bold' : 'text-slate-400 opacity-60'}>
                • SURV_TEPI_JALAN (Tepi 3D) {includeAlignment ? '✓' : '(Off)'}
              </div>
              <div className={includeProfiles ? 'text-emerald-700 font-bold' : 'text-slate-400 opacity-60'}>
                • SURV_EGL_TANAH (Profil Tanah) {includeProfiles ? '✓' : '(Off)'}
              </div>
              <div className={includeProfiles ? 'text-red-500 font-bold' : 'text-slate-400 opacity-60'}>
                • SURV_ELEVASI_EXISTING {includeProfiles ? '✓' : '(Off)'}
              </div>
              <div className={includeDesignFgl && includeProfiles ? 'text-blue-600 font-bold' : 'text-slate-400 opacity-60'}>
                • SURV_ELEVASI_RENCANA {includeDesignFgl && includeProfiles ? '✓' : '(Off)'}
              </div>
              <div className={includeKop ? 'text-indigo-600 font-bold' : 'text-slate-400 opacity-60'}>
                • SURV_KOP (Kop Dinas PUPR) {includeKop ? '✓' : '(Off)'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {exportScope === 'all_merged'
              ? `⭐ Ekspor keseluruhan: ${validSegments.length || 1} ruas, ${totalProjectStationsCount} penampang`
              : `Ekspor: ${stations.length} penampang`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              {exportScope === 'all_merged'
                ? `Download CAD Keseluruhan (.${fileFormat.toUpperCase()})`
                : `Download CAD (.${fileFormat.toUpperCase()})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
