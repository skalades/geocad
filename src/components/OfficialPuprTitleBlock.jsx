import React from 'react';

/**
 * Komponen Vektor KOP Standar Dinas PUPR Kabupaten Karawang
 * Sesuai foto resmi:
 * - Logo Pemkab Karawang + Logo Resmi PUPR
 * - Nama Paket: PENINGKATAN JALAN AKSES TOL KARAWANG BARAT
 * - Penyedia Jasa: CV. ASPIRASI LUHUR (Direktur: Dimas Hendriwianto)
 * - Pengawas Lapangan: M. Shofaruddin & Hendra (Dinas PUPR Karawang)
 * - Kolom Judul Gambar, No Gambar, Skala, dan Jumlah Gambar
 */
export default function OfficialPuprTitleBlock({
  x = 0,
  y = 0,
  width = 980,
  height = 76,
  drawingTitle = 'POTONGAN MELINTANG',
  stationName = '',
  sheetNo = 'B-01',
  scaleText = '1 : 100',
  totalSheets = '2/76',
  _projectName = 'PENINGKATAN JALAN AKSES TOL KARAWANG BARAT',
  isDark = false,
}) {
  // Theme colors
  const strokeColor = isDark ? '#94a3b8' : '#0f172a';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#cbd5e1' : '#334155';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const _headerBg = isDark ? '#1e293b' : '#f8fafc';
  const innerBg = isDark ? '#0b101b' : '#ffffff';

  // Column width ratios (matching official layout in photo)
  // Col 1: Instansi & Logo (23%)
  // Col 2: Paket Pekerjaan (19%)
  // Col 3: Dibuat Oleh (16%)
  // Col 4: Diperiksa Oleh (20%)
  // Col 5: Judul Gambar (11%)
  // Col 6: No/Skala/Jml Gambar (11%)
  const w = Math.max(960, width);
  const h = height;

  const col1W = w * 0.25;
  const col2W = w * 0.19;
  const col3W = w * 0.16;
  const col4W = w * 0.20;
  const col5W = w * 0.11;
  const _col6W = w - (col1W + col2W + col3W + col4W + col5W);

  const x0 = x;
  const x1 = x0 + col1W;
  const x2 = x1 + col2W;
  const x3 = x2 + col3W;
  const x4 = x3 + col4W;
  const x5 = x4 + col5W;
  const x6 = x0 + w;

  const headerH = 18;
  const rowH3 = h / 3; // ~25.3px per row in Col 6

  return (
    <g className="kop-pupr-karawang font-sans select-none">
      {/* Background fill */}
      <rect x={x0} y={y} width={w} height={h} fill={innerBg} />

      {/* Outer Border (Double frame) */}
      <rect
        x={x0}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
      />

      {/* Vertical Column Lines */}
      <line x1={x1} y1={y} x2={x1} y2={y + h} stroke={strokeColor} strokeWidth="1.2" />
      <line x1={x2} y1={y} x2={x2} y2={y + h} stroke={strokeColor} strokeWidth="1.2" />
      <line x1={x3} y1={y} x2={x3} y2={y + h} stroke={strokeColor} strokeWidth="1.2" />
      <line x1={x4} y1={y} x2={x4} y2={y + h} stroke={strokeColor} strokeWidth="1.2" />
      <line x1={x5} y1={y} x2={x5} y2={y + h} stroke={strokeColor} strokeWidth="1.2" />

      {/* ========================================================================= */}
      {/* KOLOM 1: INSTANSI & LOGO (X0 -> X1)                                       */}
      {/* ========================================================================= */}
      {/* Logo Pemkab Karawang (Left) */}
      <g transform={`translate(${x0 + 8}, ${y + 11}) scale(0.60)`}>
        {/* Perisai Karawang */}
        <path
          d="M 6 4 C 18 2, 28 2, 40 4 C 44 24, 38 46, 23 58 C 8 46, 2 24, 6 4 Z"
          fill="#16a34a"
          stroke="#ca8a04"
          strokeWidth="2.5"
        />
        {/* Air/Gelombang */}
        <path
          d="M 8 36 Q 16 32, 23 36 Q 30 40, 38 36 L 36 46 Q 23 54, 10 46 Z"
          fill="#0284c7"
        />
        {/* Keris/Golok Tegak Kuning */}
        <line x1="23" y1="10" x2="23" y2="44" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
        <circle cx="23" cy="10" r="2.5" fill="#ca8a04" />
        {/* Bintang / Padi */}
        <circle cx="23" cy="6" r="2.5" fill="#facc15" />
        {/* Pita Merah Putih di bawah */}
        <path d="M 12 55 Q 23 60, 34 55 Q 23 62, 12 55" fill="#dc2626" />
      </g>

      {/* Logo PUPR (Right side of Col 1) */}
      <g transform={`translate(${x1 - 34}, ${y + 14}) scale(0.60)`}>
        {/* Kotak border kuning logo PUPR */}
        <rect x="0" y="0" width="46" height="68" fill="#facc15" stroke="#ca8a04" strokeWidth="1" rx="2" />
        {/* Lingkaran luar gerigi biru */}
        <circle cx="23" cy="34" r="18" fill="#1e3a8a" />
        <circle cx="23" cy="34" r="14" fill="#facc15" />
        <circle cx="23" cy="34" r="8" fill="#1e3a8a" />
        {/* Baling-baling gerigi */}
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <line
            key={deg}
            x1="23"
            y1="34"
            x2={23 + 17 * Math.cos((deg * Math.PI) / 180)}
            y2={34 + 17 * Math.sin((deg * Math.PI) / 180)}
            stroke="#1e3a8a"
            strokeWidth="3.5"
          />
        ))}
        {/* Gelombang air dalam */}
        <circle cx="23" cy="34" r="4.5" fill="#facc15" />
      </g>

      {/* Teks Instansi Pemerintah Kabupaten Karawang */}
      <text
        x={(x0 + 38 + x1 - 36) / 2}
        y={y + 18}
        textAnchor="middle"
        className="font-bold tracking-tight uppercase"
        fontSize="7.5"
        fill={textPrimary}
      >
        PEMERINTAH KABUPATEN KARAWANG
      </text>
      <text
        x={(x0 + 38 + x1 - 36) / 2}
        y={y + 32}
        textAnchor="middle"
        className="font-extrabold tracking-tight uppercase"
        fontSize="8"
        fill={textPrimary}
      >
        DINAS PEKERJAAN UMUM DAN
      </text>
      <text
        x={(x0 + 38 + x1 - 36) / 2}
        y={y + 44}
        textAnchor="middle"
        className="font-extrabold tracking-tight uppercase"
        fontSize="8"
        fill={textPrimary}
      >
        PENATAAN RUANG
      </text>
      <text
        x={(x0 + 38 + x1 - 36) / 2}
        y={y + 57}
        textAnchor="middle"
        fontSize="5.8"
        fill={textMuted}
      >
        JL. DEWI SARTIKA NO. 1, TLP. 0264 - 402117
      </text>
      <text
        x={(x0 + 38 + x1 - 36) / 2}
        y={y + 66}
        textAnchor="middle"
        fontSize="5.8"
        fill={textMuted}
      >
        KARAWANG 41312
      </text>


      {/* ========================================================================= */}
      {/* KOLOM 2: NAMA PAKET PEKERJAAN (X1 -> X2)                                  */}
      {/* ========================================================================= */}
      {/* Sub-header background & garis */}
      <line x1={x1} y1={y + headerH} x2={x2} y2={y + headerH} stroke={strokeColor} strokeWidth="1" />
      <text
        x={(x1 + x2) / 2}
        y={y + 12.5}
        textAnchor="middle"
        className="font-bold uppercase tracking-wider"
        fontSize="8"
        fill={textSecondary}
      >
        NAMA PAKET PEKERJAAN :
      </text>

      {/* Isi Paket Pekerjaan */}
      <text
        x={(x1 + x2) / 2}
        y={y + 40}
        textAnchor="middle"
        className="font-black uppercase tracking-wide"
        fontSize="8.5"
        fill={textPrimary}
      >
        PENINGKATAN JALAN AKSES TOL
      </text>
      <text
        x={(x1 + x2) / 2}
        y={y + 53}
        textAnchor="middle"
        className="font-black uppercase tracking-wide"
        fontSize="8.5"
        fill={textPrimary}
      >
        KARAWANG BARAT
      </text>


      {/* ========================================================================= */}
      {/* KOLOM 3: DIBUAT OLEH : PENYEDIA JASA (X2 -> X3)                           */}
      {/* ========================================================================= */}
      <line x1={x2} y1={y + headerH} x2={x3} y2={y + headerH} stroke={strokeColor} strokeWidth="1" />
      <text
        x={(x2 + x3) / 2}
        y={y + 9}
        textAnchor="middle"
        className="font-bold uppercase"
        fontSize="6.8"
        fill={textSecondary}
      >
        DIBUAT OLEH :
      </text>
      <text
        x={(x2 + x3) / 2}
        y={y + 16}
        textAnchor="middle"
        className="font-bold uppercase"
        fontSize="6.8"
        fill={textSecondary}
      >
        PENYEDIA JASA
      </text>

      {/* Logo AL (CV. Aspirasi Luhur) */}
      <g transform={`translate(${x2 + 8}, ${y + 25}) scale(0.68)`}>
        {/* Huruf A Miring Biru */}
        <path d="M 4 28 L 18 2 L 28 28 L 22 28 L 18 18 L 10 18 L 7 28 Z" fill="#0284c7" />
        <polygon points="12,14 18,6 20,14" fill={innerBg} />
        {/* Huruf L Metalik Abu/Hitam */}
        <path d="M 23 8 L 30 8 L 30 22 L 46 22 L 44 28 L 23 28 Z" fill="#334155" />
      </g>

      {/* Teks Perusahaan */}
      <text
        x={x2 + 45}
        y={y + 36}
        className="font-bold"
        fontSize="7.8"
        fill={textPrimary}
      >
        CV. ASPIRASI LUHUR
      </text>

      {/* Direktur */}
      <text
        x={(x2 + x3) / 2}
        y={y + 60}
        textAnchor="middle"
        className="font-bold"
        fontSize="7.5"
        fill={textPrimary}
        textDecoration="underline"
      >
        DIMAS HENDRIWIANTO
      </text>
      <text
        x={(x2 + x3) / 2}
        y={y + 69}
        textAnchor="middle"
        className="font-bold"
        fontSize="6.5"
        fill={textSecondary}
      >
        DIREKTUR
      </text>


      {/* ========================================================================= */}
      {/* KOLOM 4: DIPERIKSA OLEH : PENGAWAS LAPANGAN (X3 -> X4)                    */}
      {/* ========================================================================= */}
      <line x1={x3} y1={y + headerH} x2={x4} y2={y + headerH} stroke={strokeColor} strokeWidth="1" />
      <text
        x={(x3 + x4) / 2}
        y={y + 8}
        textAnchor="middle"
        className="font-bold uppercase"
        fontSize="6.2"
        fill={textSecondary}
      >
        DI PERIKSA OLEH :
      </text>
      <text
        x={(x3 + x4) / 2}
        y={y + 15.5}
        textAnchor="middle"
        className="font-bold uppercase"
        fontSize="5.5"
        fill={textSecondary}
      >
        PENGAWAS LAPANGAN DINAS PUPR KAB. KARAWANG
      </text>

      {/* Pembagi Vertikal Sub-Kolom Pemeriksa */}
      <line
        x1={(x3 + x4) / 2}
        y1={y + headerH}
        x2={(x3 + x4) / 2}
        y2={y + h}
        stroke={strokeColor}
        strokeWidth="1"
      />

      {/* Pemeriksa 1 (Kiri) */}
      <text
        x={(x3 + (x3 + x4) / 2) / 2}
        y={y + 59}
        textAnchor="middle"
        className="font-bold"
        fontSize="6.8"
        fill={textPrimary}
        textDecoration="underline"
      >
        M. SHOFARUDDIN
      </text>
      <text
        x={(x3 + (x3 + x4) / 2) / 2}
        y={y + 68}
        textAnchor="middle"
        fontSize="5.2"
        fill={textSecondary}
      >
        NIP. 19970609 201902 1 002
      </text>

      {/* Pemeriksa 2 (Kanan) */}
      <text
        x={((x3 + x4) / 2 + x4) / 2}
        y={y + 59}
        textAnchor="middle"
        className="font-bold"
        fontSize="6.8"
        fill={textPrimary}
        textDecoration="underline"
      >
        HENDRA
      </text>
      <text
        x={((x3 + x4) / 2 + x4) / 2}
        y={y + 68}
        textAnchor="middle"
        fontSize="5.2"
        fill={textSecondary}
      >
        NIP. 1977211 200901 1 002
      </text>


      {/* ========================================================================= */}
      {/* KOLOM 5: JUDUL GAMBAR (X4 -> X5)                                          */}
      {/* ========================================================================= */}
      <line x1={x4} y1={y + headerH} x2={x5} y2={y + headerH} stroke={strokeColor} strokeWidth="1" />
      <text
        x={(x4 + x5) / 2}
        y={y + 12.5}
        textAnchor="middle"
        className="font-bold uppercase tracking-wider"
        fontSize="6.8"
        fill={textSecondary}
      >
        JUDUL GAMBAR
      </text>

      {/* Isi Judul Gambar */}
      <text
        x={(x4 + x5) / 2}
        y={y + 38}
        textAnchor="middle"
        className="font-black uppercase tracking-tight"
        fontSize="7.5"
        fill={textPrimary}
      >
        {drawingTitle}
      </text>
      {stationName && (
        <text
          x={(x4 + x5) / 2}
          y={y + 55}
          textAnchor="middle"
          className="font-black font-mono tracking-tight"
          fontSize="8.5"
          fill="#2563eb"
        >
          {stationName}
        </text>
      )}


      {/* ========================================================================= */}
      {/* KOLOM 6: NO. GAMBAR | SKALA | JML. GAMBAR (X5 -> X6)                      */}
      {/* ========================================================================= */}
      {/* Baris 1: NO. GAMBAR */}
      <line x1={x5} y1={y + rowH3} x2={x6} y2={y + rowH3} stroke={strokeColor} strokeWidth="1" />
      <line x1={(x5 + x6) / 2} y1={y} x2={(x5 + x6) / 2} y2={y + rowH3} stroke={strokeColor} strokeWidth="1" />
      <text
        x={(x5 + (x5 + x6) / 2) / 2}
        y={y + 15}
        textAnchor="middle"
        className="font-bold uppercase"
        fontSize="5.8"
        fill={textSecondary}
      >
        NO. GAMBAR
      </text>
      <text
        x={((x5 + x6) / 2 + x6) / 2}
        y={y + 16}
        textAnchor="middle"
        className="font-black font-mono"
        fontSize="8"
        fill={textPrimary}
      >
        {sheetNo}
      </text>

      {/* Baris 2: SKALA */}
      <line x1={x5} y1={y + 2 * rowH3} x2={x6} y2={y + 2 * rowH3} stroke={strokeColor} strokeWidth="1" />
      <line x1={(x5 + x6) / 2} y1={y + rowH3} x2={(x5 + x6) / 2} y2={y + 2 * rowH3} stroke={strokeColor} strokeWidth="1" />
      <text
        x={(x5 + (x5 + x6) / 2) / 2}
        y={y + rowH3 + 15}
        textAnchor="middle"
        className="font-bold uppercase"
        fontSize="5.8"
        fill={textSecondary}
      >
        SKALA
      </text>
      <text
        x={((x5 + x6) / 2 + x6) / 2}
        y={y + rowH3 + 16}
        textAnchor="middle"
        className="font-bold font-mono"
        fontSize="7"
        fill={textPrimary}
      >
        {scaleText}
      </text>

      {/* Baris 3: JML. GAMBAR */}
      <line x1={(x5 + x6) / 2} y1={y + 2 * rowH3} x2={(x5 + x6) / 2} y2={y + h} stroke={strokeColor} strokeWidth="1" />
      <text
        x={(x5 + (x5 + x6) / 2) / 2}
        y={y + 2 * rowH3 + 15}
        textAnchor="middle"
        className="font-bold uppercase"
        fontSize="5.8"
        fill={textSecondary}
      >
        JML. GAMBAR
      </text>
      <text
        x={((x5 + x6) / 2 + x6) / 2}
        y={y + 2 * rowH3 + 16}
        textAnchor="middle"
        className="font-black font-mono"
        fontSize="8"
        fill={textPrimary}
      >
        {totalSheets}
      </text>
    </g>
  );
}
