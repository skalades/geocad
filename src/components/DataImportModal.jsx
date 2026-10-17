import React, { useState, useMemo, useRef } from 'react';
import { UTM_ZONES } from '../utils/coordinateTransform';
import { SAMPLE_SURVEY_DATA, parseSurveyRawText } from '../utils/surveyParser';
import { SAMPLE_BRANCH_ROAD_DATA } from '../utils/multiProjectManager';
import { parseCadFile } from '../utils/dwgParser';
import { Upload, FileText, Check, X, Sparkles, Split, AlertCircle, FileCode, Loader2, Target } from 'lucide-react';

export const SAMPLE_COMBINED_MULTI_SEGMENT_DATA = `NO	CODE	X	Y	ELEVATION
1	A-STA00	759271.443	9297051.826	43.950
2	A-STA00	759271.399	9297050.025	43.819
3	A-STA00	759271.913	9297046.613	43.981
4	A-STA00	759271.838	9297045.609	44.094
10	A-STA025	759246.466	9297049.814	43.730
11	A-STA025	759246.650	9297049.188	43.769
12	A-STA025	759246.395	9297047.022	43.657
13	A-STA025	759246.652	9297044.956	43.824
14	A-STA025	759246.661	9297043.495	43.816
15	A-STA050	759221.759	9297049.760	43.357
16	A-STA050	759221.700	9297049.805	43.155
17	A-STA050	759221.484	9297048.333	43.337
18	A-STA050	759221.468	9297046.585	43.280
19	A-STA050	759220.986	9297044.695	43.372
20	A-STA075	759197.086	9297052.059	42.884
21	A-STA075	759196.804	9297050.735	42.771
22	A-STA075	759196.784	9297049.049	43.101
23	A-STA075	759196.414	9297047.790	43.155
101	B-STA00	759221.484	9297048.333	43.337
102	B-STA00	759218.484	9297048.333	43.310
103	B-STA00	759224.484	9297048.333	43.310
110	B-STA025	759221.500	9297073.333	43.520
111	B-STA025	759218.200	9297073.333	43.480
112	B-STA025	759224.800	9297073.333	43.490
120	B-STA050	759221.600	9297098.333	43.710
121	B-STA050	759218.000	9297098.333	43.680
122	B-STA050	759225.000	9297098.333	43.690`;

export const SAMPLE_6COL_DETAIL_DATA = `NO	CODE	CODE_DETAIL	X	Y	ELEVATION
1	STA 0+000	SL_KI	759273.500	9297053.200	43.600
2	STA 0+000	BH_KI	759272.800	9297052.500	43.850
3	STA 0+000	TP_KI	759272.100	9297051.800	43.920
4	STA 0+000	AS	759271.443	9297050.025	43.980
5	STA 0+000	TP_KA	759270.700	9297048.200	43.920
6	STA 0+000	BH_KA	759270.000	9297047.500	43.850
7	STA 0+000	SL_KA	759269.300	9297046.800	43.550
10	STA 0+025	BH_KI	759247.800	9297051.500	43.650
11	STA 0+025	TP_KI	759247.100	9297050.800	43.710
12	STA 0+025	AS	759246.466	9297049.814	43.760
13	STA 0+025	TP_KA	759245.800	9297048.800	43.710
14	STA 0+025	BH_KA	759245.100	9297047.800	43.650
20	STA 0+050	SL_KI	759223.500	9297051.500	43.250
21	STA 0+050	BH_KI	759222.800	9297050.800	43.310
22	STA 0+050	TP_KI	759222.100	9297050.200	43.340
23	STA 0+050	AS	759221.484	9297048.333	43.370
24	STA 0+050	TP_KA	759220.800	9297046.800	43.340
25	STA 0+050	BH_KA	759220.100	9297045.800	43.310
26	STA 0+050	SL_KA	759219.400	9297044.800	43.200`;

export default function DataImportModal({
  isOpen,
  onClose,
  utmZone,
  setUtmZone,
  onImportData,
  onImportCadProject,
  activeSegmentName = '',
  activeSegmentColor = '#ef4444',
}) {
  const [inputText, setInputText] = useState(SAMPLE_SURVEY_DATA);
  const [selectedZone, setSelectedZone] = useState(utmZone || '49S');
  const [autoSplitSegments, setAutoSplitSegments] = useState(true);
  const [autoTraseAs, setAutoTraseAs] = useState(false); // DEFAULT: FALSE (Semuanya Manual per user request)
  const [fileInfo, setFileInfo] = useState(null);
  const [targetSegmentName, setTargetSegmentName] = useState(activeSegmentName || 'Ruas Utama');
  const [parsedCadProject, setParsedCadProject] = useState(null);
  const [isLoadingCad, setIsLoadingCad] = useState(false);
  const [importAsNewProject, setImportAsNewProject] = useState(true);
  const rawCadRef = useRef(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSelectedZone(utmZone || '49S');
      setTargetSegmentName(activeSegmentName || 'Ruas Utama');
    }
  }

  const parsedPreviewCount = useMemo(() => {
    return parseSurveyRawText(inputText).length;
  }, [inputText]);

  if (!isOpen) return null;

  const reparseCad = async (withAutoTrase) => {
    if (!rawCadRef.current) return;
    setIsLoadingCad(true);
    try {
      const { buffer, fileName } = rawCadRef.current;
      const cadData = await parseCadFile(buffer, fileName, { autoTraseAs: withAutoTrase });
      setParsedCadProject(cadData);
      if (cadData.utmZone) setSelectedZone(cadData.utmZone);

      const allRawText = cadData.segments.map(s => s.rawText.split('\n').slice(1).join('\n')).join('\n');
      setInputText('NO\tCODE\tX\tY\tELEVATION\n' + allRawText);
      setFileInfo(prev => prev ? {
        ...prev,
        count: cadData.segments.reduce((acc, s) => acc + s.allPoints.length, 0),
        totalLength: cadData.totalLength,
      } : null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCad(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isCad = lowerName.endsWith('.dwg') || lowerName.endsWith('.dxf');

    if (isCad) {
      setIsLoadingCad(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result;
          rawCadRef.current = { buffer, fileName: file.name };
          const cadData = await parseCadFile(buffer, file.name, { autoTraseAs });
          setParsedCadProject(cadData);
          if (cadData.utmZone) setSelectedZone(cadData.utmZone);

          // Combine raw text from all CAD segments
          const allRawText = cadData.segments.map(s => s.rawText.split('\n').slice(1).join('\n')).join('\n');
          setInputText('NO\tCODE\tX\tY\tELEVATION\n' + allRawText);

          setFileInfo({
            name: file.name,
            sizeKb: (file.size / 1024).toFixed(1),
            count: cadData.segments.reduce((acc, s) => acc + s.allPoints.length, 0),
            isCad: true,
            segmentsCount: cadData.segments.length,
            totalLength: cadData.totalLength,
          });
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
          setTargetSegmentName(cleanName);
        } catch (err) {
          console.error(err);
          alert('Gagal membaca file CAD: ' + (err.message || 'Format tidak didukung'));
        } finally {
          setIsLoadingCad(false);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // Default text/csv/xml file reader
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setInputText(content);
        setParsedCadProject(null);
        rawCadRef.current = null;
        const count = parseSurveyRawText(content).length;
        setFileInfo({
          name: file.name,
          sizeKb: (file.size / 1024).toFixed(1),
          count,
          isCad: false,
        });
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setTargetSegmentName(cleanName);

        // Smart UTM suggestion for West Java / Karawang (Zone 48S)
        if (
          lowerName.includes('karawang') ||
          lowerName.includes('jawabarat') ||
          lowerName.includes('jabar') ||
          lowerName.includes('cilamaya') ||
          lowerName.includes('bogor') ||
          lowerName.includes('bekasi') ||
          lowerName.includes('jakarta')
        ) {
          setSelectedZone('48S');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleLoadCilamayaDwg = async () => {
    setIsLoadingCad(true);
    try {
      const res = await fetch('/cilamaya.dwg');
      if (!res.ok) throw new Error('File cilamaya.dwg tidak ditemukan di server.');
      const buffer = await res.arrayBuffer();
      rawCadRef.current = { buffer, fileName: 'cilamaya.dwg' };
      const cadData = await parseCadFile(buffer, 'cilamaya.dwg', { autoTraseAs });
      setParsedCadProject(cadData);
      setSelectedZone('48S');
      setTargetSegmentName('cilamaya');

      const allRawText = cadData.segments.map(s => s.rawText.split('\n').slice(1).join('\n')).join('\n');
      setInputText('NO\tCODE\tX\tY\tELEVATION\n' + allRawText);

      setFileInfo({
        name: 'cilamaya.dwg',
        sizeKb: (buffer.byteLength / 1024).toFixed(1),
        count: cadData.segments.reduce((acc, s) => acc + s.allPoints.length, 0),
        isCad: true,
        segmentsCount: cadData.segments.length,
        totalLength: cadData.totalLength,
      });
    } catch (err) {
      console.error(err);
      alert('Gagal memuat cilamaya.dwg: ' + err.message);
    } finally {
      setIsLoadingCad(false);
    }
  };

  const handleApply = () => {
    if (setUtmZone) setUtmZone(selectedZone);
    if (parsedCadProject && onImportCadProject) {
      onImportCadProject(parsedCadProject, importAsNewProject, autoTraseAs);
    } else {
      onImportData(inputText, autoSplitSegments, autoTraseAs, targetSegmentName.trim() || undefined);
    }
    onClose();
  };

  const handleLoadSampleMain = () => {
    setInputText(SAMPLE_SURVEY_DATA);
    setSelectedZone('49S');
    setFileInfo(null);
    setParsedCadProject(null);
  };

  const handleLoadSampleBranch = () => {
    setInputText(SAMPLE_BRANCH_ROAD_DATA);
    setSelectedZone('49S');
    setFileInfo(null);
    setParsedCadProject(null);
  };

  const handleLoadSampleCombined = () => {
    setInputText(SAMPLE_COMBINED_MULTI_SEGMENT_DATA);
    setSelectedZone('49S');
    setAutoSplitSegments(true);
    setFileInfo(null);
    setParsedCadProject(null);
  };

  const handleLoadSample6Col = () => {
    setInputText(SAMPLE_6COL_DETAIL_DATA);
    setSelectedZone('49S');
    setAutoSplitSegments(false);
    setAutoTraseAs(false);
    setFileInfo(null);
    setParsedCadProject(null);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Input & Upload Data Pengukuran Jalan
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500">Target:</span>
                {activeSegmentName && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 flex items-center gap-1.5 border border-slate-200">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: activeSegmentColor }}
                    />
                    {activeSegmentName}
                  </span>
                )}
              </div>
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
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Target Segment Name Field */}
          <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeSegmentColor }} />
                <span>Nama Ruas Jalan (Target Segmen):</span>
              </span>
              <span className="text-[11px] text-blue-600 font-normal">
                Bebas diubah sesuai kebutuhan
              </span>
            </label>
            <input
              type="text"
              value={targetSegmentName}
              onChange={(e) => setTargetSegmentName(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Contoh: SEGMEN 2, Ruas A, dsb."
            />
          </div>

          {/* UTM Zone Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center justify-between">
              <span>Sistem Koordinat / Zona UTM Proyek:</span>
              <span className="text-[11px] text-blue-600 font-normal">
                Penting untuk akurasi peta satelit WebGIS
              </span>
            </label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {UTM_ZONES.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>

          {/* Multi-Segment Auto Split Checkbox */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Split className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-bold text-blue-950 block">Auto-Deteksi Multi-Ruas (Prefix Kode):</span>
                <span className="text-[11px] text-blue-700">
                  Otomatis pisahkan ke ruas berbeda jika kode STA diawali prefix (contoh: <code>A-STA00</code> & <code>B-STA00</code>)
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoSplitSegments}
              onChange={(e) => setAutoSplitSegments(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
          </div>

          {/* Auto-Trase As Jalan (Centerline / CL) Checkbox - Default: False / Manual */}
          <div className={`p-3 border rounded-xl flex items-center justify-between transition-colors ${
            autoTraseAs ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg shrink-0 ${autoTraseAs ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                <Target className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 block text-xs">
                    Auto-Trase As Jalan (Centerline / CL):
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                    autoTraseAs
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {autoTraseAs ? 'Aktif (Otomatis)' : 'Mati (Semuanya Manual)'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                  {autoTraseAs
                    ? 'Otomatis menentukan titik tengah As (CL) dan menarik garis trase jalan saat data diimpor.'
                    : 'Semua titik diimpor murni tanpa garis as otomatis. Anda bebas menentukan titik As (CL) dan trase jalan secara manual.'}
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoTraseAs}
              onChange={(e) => {
                const val = e.target.checked;
                setAutoTraseAs(val);
                reparseCad(val);
              }}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer shrink-0 ml-3"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Teks Data Pengukuran:</span>
              {parsedPreviewCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> {parsedPreviewCount} Titik Terdeteksi
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" /> 0 Titik Terdeteksi
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <label className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-300 font-semibold transition-colors shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-blue-600" /> Upload File (.DWG/.DXF/.CSV)
                <input
                  type="file"
                  accept=".csv,.txt,.tsv,.dwg,.dxf,.sdr,.gsi,.xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleLoadCilamayaDwg}
                disabled={isLoadingCad}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded font-bold transition-all shadow-xs disabled:opacity-50"
                title="Muat file AutoCAD cilamaya.dwg (Pelari Struktur Trase Jalan)"
              >
                {isLoadingCad ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileCode className="w-3.5 h-3.5" />
                )}
                ⚡ Muat cilamaya.dwg
              </button>

              <button
                type="button"
                onClick={handleLoadSampleMain}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 font-semibold"
                title="Muat contoh ruas utama"
              >
                Contoh Ruas A
              </button>

              <button
                type="button"
                onClick={handleLoadSampleBranch}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 font-semibold"
                title="Muat contoh cabang simpang"
              >
                Contoh Cabang B
              </button>

              <button
                type="button"
                onClick={handleLoadSampleCombined}
                className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-200 font-semibold transition-colors"
                title="Muat contoh gabungan ruas utama & cabang simpang"
              >
                <Sparkles className="w-3.5 h-3.5" /> Multi-Ruas Simpang
              </button>

              <button
                type="button"
                onClick={handleLoadSample6Col}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-300 font-bold transition-colors"
                title="Muat contoh format 6 kolom: NO, CODE, CODE_DETAIL, X, Y, Z"
              >
                ⭐ Contoh 6 Kolom (Detail)
              </button>
            </div>
          </div>

          {/* Loading CAD Banner */}
          {isLoadingCad && (
            <div className="flex items-center gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 animate-pulse shadow-xs">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
              <div>
                <p className="font-bold text-xs">Mengekstrak data AutoCAD DWG / DXF dengan WebAssembly...</p>
                <p className="text-[11px] text-blue-700">
                  Mengurai pelari struktur (LINE / POLYLINE), menyandingkan tepi kiri & kanan, serta menghitung as jalan (CL) & STA.
                </p>
              </div>
            </div>
          )}

          {/* CAD Project Summary Card */}
          {parsedCadProject && (
            <div className="p-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 rounded-xl space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs">
                      Pelari Struktur CAD: <span className="text-blue-700">{parsedCadProject.projectName}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Auto-pairing batas struktur perkerasan jalan (Tepi Kiri & Kanan)
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-full text-[11px] shrink-0">
                  {parsedCadProject.segments.length} Seksi Terurai
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="bg-white/90 p-2 rounded-lg border border-blue-100">
                  <span className="text-slate-500 block text-[10px]">Total Panjang:</span>
                  <span className="font-bold text-slate-800 text-xs">{parsedCadProject.totalLength.toFixed(1)} m</span>
                </div>
                <div className="bg-white/90 p-2 rounded-lg border border-blue-100">
                  <span className="text-slate-500 block text-[10px]">Sistem Proyeksi:</span>
                  <span className="font-bold text-blue-700 text-xs">UTM {parsedCadProject.utmZone} (Jabar)</span>
                </div>
                <div className="bg-white/90 p-2 rounded-lg border border-blue-100">
                  <span className="text-slate-500 block text-[10px]">Titik Cross Section:</span>
                  <span className="font-bold text-emerald-700 text-xs">{fileInfo?.count || 0} Titik (CL, Ki, Ka)</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-blue-100/80">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={importAsNewProject}
                    onChange={(e) => setImportAsNewProject(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span>Buka sebagai Proyek Baru tersendiri (Disarankan untuk preservasi jalan)</span>
                </label>
              </div>
            </div>
          )}

          {/* Uploaded File Banner (Non-CAD or supplementary) */}
          {fileInfo && !parsedCadProject && (
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  File <strong>{fileInfo.name}</strong> ({fileInfo.sizeKb} KB) &mdash;{' '}
                  <strong className="text-emerald-700">{parsedPreviewCount} titik ukur</strong> berhasil dikenali & diurai!
                </span>
              </div>
              <span className="text-[11px] bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded font-semibold shrink-0">
                Format Siap Tampil
              </span>
            </div>
          )}

          {/* Textarea for data */}
          <div>
            <textarea
              rows={9}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste data ukur di sini (Tab, Comma, atau Spasi)..."
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed text-slate-800"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
            💡 <strong>Rekomendasi Standar Lapangan:</strong> Jika Anda mengukur beberapa ruas atau persimpangan jalan, 
            cantumkan prefix huruf pada kode STA (misal <code>A-STA00</code> untuk Jalan Utama dan <code>B-STA00</code> untuk Jalan Simpang). 
            Sistem akan otomatis memisahkan keduanya menjadi trase mandiri tanpa garis merah saling silang.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {parsedPreviewCount > 0 ? (
              <span>Zona terpilih: <strong className="text-slate-800">UTM {selectedZone}</strong></span>
            ) : (
              <span className="text-red-500">Pastikan format kolom: NO, CODE/STA, X, Y, Z</span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              onClick={handleApply}
              disabled={parsedPreviewCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" /> Proses & Tampilkan {parsedPreviewCount > 0 ? `(${parsedPreviewCount} Titik)` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
