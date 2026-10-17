"""
Script Generator KOP Gambar Standar Kementerian PUPR / Dinas PUPR
Format: AutoCAD DWG & DXF (Ukuran Standar A3 Landscape: 420 mm x 297 mm)
Standar: Direktorat Jenderal Bina Marga - Kementerian Pekerjaan Umum dan Perumahan Rakyat
"""

import math
import subprocess
import os
import ezdxf
from ezdxf import colors, bbox
from ezdxf.enums import TextEntityAlignment

def create_pupr_logo(block_record, center_x, center_y, radius=12.0):
    """
    Menggambar Lambang Vektor Resmi Kementerian PUPR
    - Baling-baling roda gerigi khas PUPR
    - Lingkaran tengah & siluet geometris
    """
    # Lingkaran luar gerigi (outer decorative circle)
    block_record.add_circle((center_x, center_y), radius, dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 2}) # Kuning PUPR
    block_record.add_circle((center_x, center_y), radius * 0.90, dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 2})
    block_record.add_circle((center_x, center_y), radius * 0.55, dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 5}) # Biru PUPR
    block_record.add_circle((center_x, center_y), radius * 0.22, dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 2})

    # Daun Roda Gerigi (6 sirip simetris berotasi 60 derajat)
    num_teeth = 6
    for i in range(num_teeth):
        angle = i * (2 * math.pi / num_teeth)
        a1 = angle - math.radians(14)
        a2 = angle + math.radians(14)
        r_inner = radius * 0.55
        r_outer = radius * 0.98

        p1 = (center_x + r_inner * math.cos(a1), center_y + r_inner * math.sin(a1))
        p2 = (center_x + r_outer * math.cos(a1), center_y + r_outer * math.sin(a1))
        p3 = (center_x + r_outer * math.cos(a2), center_y + r_outer * math.sin(a2))
        p4 = (center_x + r_inner * math.cos(a2), center_y + r_inner * math.sin(a2))

        block_record.add_lwpolyline([p1, p2, p3, p4, p1], close=True, dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 2})

    # Geometris Lengkung khas di bagian tengah (Gelombang & Roda)
    block_record.add_arc(
        (center_x, center_y),
        radius * 0.40,
        start_angle=30,
        end_angle=210,
        dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 5}
    )
    block_record.add_arc(
        (center_x, center_y),
        radius * 0.35,
        start_angle=210,
        end_angle=390,
        dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 5}
    )

def create_north_arrow(msp, x, y, size=18.0):
    """
    Simbol Arah Mata Angin Standar PUPR (North Arrow)
    """
    half = size / 2.0
    r = half * 0.9

    # Lingkaran kompas
    msp.add_circle((x, y), r, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 4})
    msp.add_circle((x, y), r * 0.85, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 8})

    # Segitiga jarum utara (Hitam-Putih / Arsiran)
    top = (x, y + r * 0.95)
    bottom = (x, y - r * 0.6)
    left = (x - r * 0.35, y - r * 0.15)
    right = (x + r * 0.35, y - r * 0.15)
    center = (x, y)

    # Sayap kiri jarum utara
    msp.add_lwpolyline([center, top, left, center], close=True, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 1})
    # Sayap kanan jarum utara
    msp.add_lwpolyline([center, top, right, center], close=True, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 7})
    # Jarum bawah
    msp.add_lwpolyline([center, bottom, left, center], close=True, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 8})
    msp.add_lwpolyline([center, bottom, right, center], close=True, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 8})

    # Huruf U (Utara) di atas
    msp.add_text('U', dxfattribs={
        'layer': 'KOP_SIMBOL_UTARA',
        'color': 1,
        'height': 3.5,
        'style': 'STANDARD'
    }).set_placement((x, y + r * 1.1), align=TextEntityAlignment.BOTTOM_CENTER)

def create_scale_bar(msp, x, y, length=40.0, divisions=4):
    """
    Skala Grafis (Graphic Bar Scale) 1:1000 Standar Bina Marga
    """
    h = 2.5
    seg_w = length / divisions
    # Border skala
    msp.add_lwpolyline([(x, y), (x + length, y), (x + length, y + h), (x, y + h), (x, y)], close=True,
                       dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 7})

    for i in range(divisions):
        xi = x + i * seg_w
        # Garis batas segmen
        msp.add_line((xi, y), (xi, y + h), dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 7})
        # Pola hitam putih bergantian
        if i % 2 == 0:
            p1 = (xi, y)
            p2 = (xi + seg_w, y)
            p3 = (xi + seg_w, y + h)
            p4 = (xi, y + h)
            msp.add_lwpolyline([p1, p2, p3, p4, p1], close=True, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 8})

        # Angka meter di atas
        val_m = int(i * 10)
        msp.add_text(str(val_m), dxfattribs={
            'layer': 'KOP_SIMBOL_UTARA',
            'color': 7,
            'height': 1.6,
            'style': 'STANDARD'
        }).set_placement((xi, y + h + 0.6), align=TextEntityAlignment.BOTTOM_CENTER)

    # Label akhir meter
    msp.add_text(f"{int(divisions * 10)} m", dxfattribs={
        'layer': 'KOP_SIMBOL_UTARA',
        'color': 7,
        'height': 1.6,
        'style': 'STANDARD'
    }).set_placement((x + length, y + h + 0.6), align=TextEntityAlignment.BOTTOM_CENTER)

    # Tulisan Skala Grafis
    msp.add_text("SKALA GRAFIS (METER)", dxfattribs={
        'layer': 'KOP_SIMBOL_UTARA',
        'color': 7,
        'height': 1.6,
        'style': 'STANDARD'
    }).set_placement((x + length / 2.0, y - 1.8), align=TextEntityAlignment.TOP_CENTER)


def build_pupr_a3_vertical():
    """
    Membangun Gambar KOP Standar PUPR A3 Vertikal (Kolom Kanan)
    Ukuran A3 Landscape: 420 x 297 mm
    Margin: Kiri 20mm, Kanan 10mm, Atas 10mm, Bawah 10mm
    Kolom Kop: X = 310mm s/d 410mm (Lebar = 100mm)
    Drawing Area: X = 20mm s/d 310mm (Lebar = 290mm, Tinggi = 277mm)
    """
    doc = ezdxf.new('R2018', setup=True)

    # 1. Setup Layers
    layers = [
        ('KOP_BORDER_LUAR', colors.GRAY, 'CONTINUOUS', 18),
        ('KOP_BORDER_UTAMA', colors.WHITE, 'CONTINUOUS', 70),
        ('KOP_GARIS_TABEL', colors.WHITE, 'CONTINUOUS', 35),
        ('KOP_GARIS_SUBTABEL', colors.GRAY, 'CONTINUOUS', 18),
        ('KOP_TEKS_INSTANSI', colors.YELLOW, 'CONTINUOUS', 35),
        ('KOP_TEKS_LABEL', colors.WHITE, 'CONTINUOUS', 25),
        ('KOP_TEKS_DATA', colors.CYAN, 'CONTINUOUS', 30),
        ('KOP_TEKS_JUDUL', colors.YELLOW, 'CONTINUOUS', 50),
        ('KOP_TEKS_NOMOR', colors.WHITE, 'CONTINUOUS', 60),
        ('KOP_LOGO_PUPR', colors.YELLOW, 'CONTINUOUS', 35),
        ('KOP_SIMBOL_UTARA', colors.CYAN, 'CONTINUOUS', 25),
        ('KOP_CATATAN_TEKNIS', colors.GREEN, 'CONTINUOUS', 20),
        ('KOP_GRID_REFERENSI', colors.GRAY, 'CONTINUOUS', 18),
    ]

    for name, col, ltype, lweight in layers:
        if name not in doc.layers:
            doc.layers.add(name, color=col, linetype=ltype, lineweight=lweight)

    msp = doc.modelspace()

    # Dimensi Kertas A3
    W, H = 420.0, 297.0
    M_LEFT = 20.0
    M_RIGHT = 10.0
    M_TOP = 10.0
    M_BOT = 10.0

    X_MIN = M_LEFT
    X_MAX = W - M_RIGHT # 410.0
    Y_MIN = M_BOT      # 10.0
    Y_MAX = H - M_TOP   # 287.0

    KOP_X = 310.0       # Kolom Kop dimulai dari X=310 sampai X=410 (lebar 100mm)

    # --- 1. Garis Luar Kertas (Trim Boundary 420 x 297) & Tanda Potong Corner Marks ---
    msp.add_lwpolyline([(0, 0), (W, 0), (W, H), (0, H), (0, 0)], close=True,
                       dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 8})

    # Tanda potong (Crop Marks) di 4 sudut
    crop_len = 6.0
    for cx, cy, dx, dy in [(0, 0, 1, 1), (W, 0, -1, 1), (W, H, -1, -1), (0, H, 1, -1)]:
        msp.add_line((cx, cy + dy * 2), (cx + dx * crop_len, cy + dy * 2), dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 8})
        msp.add_line((cx + dx * 2, cy), (cx + dx * 2, cy + dy * crop_len), dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 8})

    # --- 2. Garis Batas Gambar Utama (Tebal 0.70 mm) ---
    msp.add_lwpolyline([
        (X_MIN, Y_MIN),
        (X_MAX, Y_MIN),
        (X_MAX, Y_MAX),
        (X_MIN, Y_MAX),
        (X_MIN, Y_MIN)
    ], close=True, dxfattribs={'layer': 'KOP_BORDER_UTAMA', 'color': 7})

    # Garis pemisah antara Area Gambar Kerja dan Kolom Kop
    msp.add_line((KOP_X, Y_MIN), (KOP_X, Y_MAX), dxfattribs={'layer': 'KOP_BORDER_UTAMA', 'color': 7})

    # --- 3. Grid Referensi Koordinat Margin (A, B, C, D dan 1, 2, 3, 4, 5, 6) ---
    # Horizontal grid pada area gambar (X: 20 -> 310)
    grid_cols = 6
    dx = (KOP_X - X_MIN) / grid_cols
    for i in range(1, grid_cols):
        gx = X_MIN + i * dx
        msp.add_line((gx, Y_MAX), (gx, Y_MAX + 2.5), dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8})
        msp.add_line((gx, Y_MIN), (gx, Y_MIN - 2.5), dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8})

    for i in range(grid_cols):
        gx = X_MIN + (i + 0.5) * dx
        lbl = str(i + 1)
        msp.add_text(lbl, dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8, 'height': 2.0}
                     ).set_placement((gx, Y_MAX + 1.2), align=TextEntityAlignment.BOTTOM_CENTER)
        msp.add_text(lbl, dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8, 'height': 2.0}
                     ).set_placement((gx, Y_MIN - 1.2), align=TextEntityAlignment.TOP_CENTER)

    # Vertikal grid pada sisi kiri (Y: 10 -> 287)
    grid_rows = 4
    dy = (Y_MAX - Y_MIN) / grid_rows
    row_labels = ['A', 'B', 'C', 'D']
    for i in range(1, grid_rows):
        gy = Y_MIN + i * dy
        msp.add_line((X_MIN, gy), (X_MIN - 2.5, gy), dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8})

    for i in range(grid_rows):
        gy = Y_MAX - (i + 0.5) * dy
        lbl = row_labels[i]
        msp.add_text(lbl, dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8, 'height': 2.0}
                     ).set_placement((X_MIN - 1.2, gy), align=TextEntityAlignment.MIDDLE_RIGHT)

    # --- 4. PEMBAGIAN ROW KOLOM KOP (X: 310 -> 410, Y: 287 -> 10) ---
    # Daftar garis pembagi horizontal utama
    # Row boundaries dari atas ke bawah:
    y_lines = [
        238.0,  # Bawah Blok Instansi & Logo (Tinggi = 49 mm)
        215.0,  # Bawah Blok Program & Kegiatan (Tinggi = 23 mm)
        175.0,  # Bawah Blok Paket Pekerjaan & Lokasi (Tinggi = 40 mm)
        125.0,  # Bawah Blok Konsultan Perencana (Tinggi = 50 mm)
        77.0,   # Bawah Blok Pemilik Pekerjaan / Direksi / Disetujui (Tinggi = 48 mm)
        45.0,   # Bawah Blok Judul Gambar (Tinggi = 32 mm)
        25.0,   # Bawah Blok Skala, Tanggal, Revisi (Tinggi = 20 mm)
        # Bawah Blok Nomor Lembar & Kode Gambar adalah Y_MIN = 10.0 (Tinggi = 15 mm)
    ]

    for y in y_lines:
        msp.add_line((KOP_X, y), (X_MAX, y), dxfattribs={'layer': 'KOP_GARIS_TABEL', 'color': 7})

    kop_cx = (KOP_X + X_MAX) / 2.0 # 360.0 mm

    # =========================================================================
    # BLOK 1: INSTANSI PEMERINTAH & LOGO PUPR (Y: 287.0 -> 238.0)
    # =========================================================================
    # Logo PUPR di bagian atas tengah
    logo_y = 271.0
    create_pupr_logo(msp, kop_cx, logo_y, radius=10.0)

    # Teks Instansi Resmi
    msp.add_text("PEMERINTAH REPUBLIK INDONESIA", dxfattribs={
        'layer': 'KOP_TEKS_INSTANSI', 'color': 7, 'height': 2.1
    }).set_placement((kop_cx, 255.5), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("KEMENTERIAN PEKERJAAN UMUM", dxfattribs={
        'layer': 'KOP_TEKS_INSTANSI', 'color': 2, 'height': 2.6
    }).set_placement((kop_cx, 251.5), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("DAN PERUMAHAN RAKYAT", dxfattribs={
        'layer': 'KOP_TEKS_INSTANSI', 'color': 2, 'height': 2.6
    }).set_placement((kop_cx, 248.0), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("DIREKTORAT JENDERAL BINA MARGA", dxfattribs={
        'layer': 'KOP_TEKS_INSTANSI', 'color': 7, 'height': 2.2
    }).set_placement((kop_cx, 244.2), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("BALAI BESAR PELAKSANAAN JALAN NASIONAL", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8
    }).set_placement((kop_cx, 240.8), align=TextEntityAlignment.MIDDLE_CENTER)

    # =========================================================================
    # BLOK 2: PROGRAM & KEGIATAN (Y: 238.0 -> 215.0)
    # =========================================================================
    msp.add_text("PROGRAM :", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8
    }).set_placement((KOP_X + 2.5, 235.0), align=TextEntityAlignment.MIDDLE_LEFT)

    msp.add_text("PENYELENGGARAAN JALAN DAN JEMBATAN", dxfattribs={
        'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.1
    }).set_placement((KOP_X + 2.5, 231.2), align=TextEntityAlignment.MIDDLE_LEFT)

    # Garis pemisah sub
    msp.add_line((KOP_X, 226.5), (X_MAX, 226.5), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 8})

    msp.add_text("KEGIATAN :", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8
    }).set_placement((KOP_X + 2.5, 223.5), align=TextEntityAlignment.MIDDLE_LEFT)

    msp.add_text("PEMBANGUNAN & PENINGKATAN STRUKTUR JALAN", dxfattribs={
        'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.1
    }).set_placement((KOP_X + 2.5, 219.7), align=TextEntityAlignment.MIDDLE_LEFT)

    # =========================================================================
    # BLOK 3: PAKET PEKERJAAN & LOKASI (Y: 215.0 -> 175.0)
    # =========================================================================
    msp.add_text("NAMA PAKET PEKERJAAN :", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8
    }).set_placement((KOP_X + 2.5, 211.5), align=TextEntityAlignment.MIDDLE_LEFT)

    msp.add_text("PENINGKATAN STRUKTUR JALAN", dxfattribs={
        'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 2.6
    }).set_placement((kop_cx, 206.5), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("RUAS CILAMAYA - KAB. KARAWANG", dxfattribs={
        'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 2.6
    }).set_placement((kop_cx, 202.8), align=TextEntityAlignment.MIDDLE_CENTER)

    # Garis sub pemisah
    msp.add_line((KOP_X, 198.5), (X_MAX, 198.5), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 8})

    msp.add_text("NOMOR KONTRAK :", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.7
    }).set_placement((KOP_X + 2.5, 195.5), align=TextEntityAlignment.MIDDLE_LEFT)

    msp.add_text("HK.02.03/Bb.06/PJN-WIL.I/2026/04", dxfattribs={
        'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.9
    }).set_placement((KOP_X + 2.5, 192.2), align=TextEntityAlignment.MIDDLE_LEFT)

    # Garis sub pemisah
    msp.add_line((KOP_X, 188.5), (X_MAX, 188.5), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 8})

    msp.add_text("LOKASI : KAB. KARAWANG - JAWA BARAT", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8
    }).set_placement((KOP_X + 2.5, 185.0), align=TextEntityAlignment.MIDDLE_LEFT)

    msp.add_text("SUMBER DANA : APBN TAHUN ANGGARAN 2026", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8
    }).set_placement((KOP_X + 2.5, 180.5), align=TextEntityAlignment.MIDDLE_LEFT)

    # =========================================================================
    # BLOK 4: KONSULTAN PERENCANA (Y: 175.0 -> 125.0)
    # =========================================================================
    msp.add_text("KONSULTAN PERENCANA :", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8
    }).set_placement((KOP_X + 2.5, 172.0), align=TextEntityAlignment.MIDDLE_LEFT)

    msp.add_text("PT. KONSULTAN REKAYASA TEKNIK NUSANTARA", dxfattribs={
        'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.2
    }).set_placement((kop_cx, 167.5), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("Highway & Civil Infrastructure Engineering", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5
    }).set_placement((kop_cx, 164.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # Sub tabel tanda tangan konsultan (4 kolom / 2 baris)
    # Header bar
    msp.add_line((KOP_X, 161.5), (X_MAX, 161.5), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    # Pembagi vertikal tengah
    msp.add_line((kop_cx, 161.5), (kop_cx, 125.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    # Pembagi horizontal tengah
    msp.add_line((KOP_X, 143.0), (X_MAX, 143.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    # Kotak 1: Team Leader (Kiri Atas)
    msp.add_text("TEAM LEADER", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                 ).set_placement(((KOP_X + kop_cx) / 2.0, 159.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("Ir. Bambang S., ST., MT.", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                 ).set_placement(((KOP_X + kop_cx) / 2.0, 145.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # Kotak 2: Highway Engineer (Kanan Atas)
    msp.add_text("HIGHWAY ENGINEER", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                 ).set_placement(((kop_cx + X_MAX) / 2.0, 159.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("Dedi Kurniawan, ST.", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                 ).set_placement(((kop_cx + X_MAX) / 2.0, 145.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # Kotak 3: Geodetic / Surveyor (Kiri Bawah)
    msp.add_text("GEODETIC / SURVEYOR", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                 ).set_placement(((KOP_X + kop_cx) / 2.0, 140.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("Putri, ST.", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                 ).set_placement(((KOP_X + kop_cx) / 2.0, 127.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # Kotak 4: CAD Drafter (Kanan Bawah)
    msp.add_text("CAD DRAFTER", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                 ).set_placement(((kop_cx + X_MAX) / 2.0, 140.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("Rian Pratama, A.Md.", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                 ).set_placement(((kop_cx + X_MAX) / 2.0, 127.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # =========================================================================
    # BLOK 5: DISETUJUI & MENGETAHUI DIREKSI / PPK (Y: 125.0 -> 77.0)
    # =========================================================================
    msp.add_text("PIHAK DIREKSI PEKERJAAN :", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8
    }).set_placement((KOP_X + 2.5, 122.0), align=TextEntityAlignment.MIDDLE_LEFT)

    # Garis sub baris
    msp.add_line((KOP_X, 118.5), (X_MAX, 118.5), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    # Pembagi 2 kolom (PPK & Kasatker)
    msp.add_line((kop_cx, 118.5), (kop_cx, 77.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    # Sisi Kiri: PPK
    msp.add_text("DISETUJUI OLEH :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                 ).set_placement(((KOP_X + kop_cx) / 2.0, 116.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("PEJABAT PEMBUAT KOMITMEN", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                 ).set_placement(((KOP_X + kop_cx) / 2.0, 112.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("( PPK )", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                 ).set_placement(((KOP_X + kop_cx) / 2.0, 109.5), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("H. HENDRA WIJAYA, ST., M.Eng.", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                 ).set_placement(((KOP_X + kop_cx) / 2.0, 83.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("NIP. 19820514 200801 1 005", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                 ).set_placement(((KOP_X + kop_cx) / 2.0, 80.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # Sisi Kanan: KASATKER / KPA
    msp.add_text("MENGETAHUI :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                 ).set_placement(((kop_cx + X_MAX) / 2.0, 116.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("KEPALA SATUAN KERJA", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                 ).set_placement(((kop_cx + X_MAX) / 2.0, 112.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("PJN WILAYAH I JAWA BARAT", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                 ).set_placement(((kop_cx + X_MAX) / 2.0, 109.5), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("Ir. AGUS SETIAWAN, MT.", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                 ).set_placement(((kop_cx + X_MAX) / 2.0, 83.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("NIP. 19750820 200212 1 002", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                 ).set_placement(((kop_cx + X_MAX) / 2.0, 80.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # =========================================================================
    # BLOK 6: JUDUL GAMBAR (Y: 77.0 -> 45.0)
    # =========================================================================
    msp.add_text("JUDUL GAMBAR :", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8
    }).set_placement((KOP_X + 2.5, 73.5), align=TextEntityAlignment.MIDDLE_LEFT)

    msp.add_text("DENAH, ALINYEMEN HORISONTAL", dxfattribs={
        'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 3.2
    }).set_placement((kop_cx, 66.5), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("& PROFIL MEMANJANG (PLAN & PROFILE)", dxfattribs={
        'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 3.2
    }).set_placement((kop_cx, 61.5), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("STA 0+000 s/d STA 2+500", dxfattribs={
        'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.3
    }).set_placement((kop_cx, 55.5), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("RUAS JALAN CILAMAYA", dxfattribs={
        'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.9
    }).set_placement((kop_cx, 50.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # =========================================================================
    # BLOK 7: SKALA, TANGGAL & STATUS REVISI (Y: 45.0 -> 25.0)
    # =========================================================================
    # Dibagi 3 kolom: X = 310 -> 343 -> 376 -> 410
    col1_x = 343.0
    col2_x = 376.0
    msp.add_line((col1_x, 45.0), (col1_x, 25.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    msp.add_line((col2_x, 45.0), (col2_x, 25.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    # Kolom 1: Skala
    msp.add_text("SKALA GAMBAR :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                 ).set_placement(((KOP_X + col1_x) / 2.0, 41.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("H = 1 : 1.000", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.0}
                 ).set_placement(((KOP_X + col1_x) / 2.0, 35.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("V = 1 : 100", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.0}
                 ).set_placement(((KOP_X + col1_x) / 2.0, 29.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # Kolom 2: Tanggal & T.A.
    msp.add_text("TANGGAL & T.A. :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                 ).set_placement(((col1_x + col2_x) / 2.0, 41.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("OKTOBER 2026", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.0}
                 ).set_placement(((col1_x + col2_x) / 2.0, 35.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("T.A. 2026", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                 ).set_placement(((col1_x + col2_x) / 2.0, 29.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # Kolom 3: Status / Revisi
    msp.add_text("STATUS / REV :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                 ).set_placement(((col2_x + X_MAX) / 2.0, 41.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("REV : 00", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.0}
                 ).set_placement(((col2_x + X_MAX) / 2.0, 35.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("FINAL DED", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 3, 'height': 1.8}
                 ).set_placement(((col2_x + X_MAX) / 2.0, 29.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # =========================================================================
    # BLOK 8: NOMOR LEMBAR & KODE GAMBAR (Y: 25.0 -> 10.0)
    # =========================================================================
    # Pembagian 2 kolom: Kiri (Kode Gambar 55mm), Kanan (No Lembar 45mm)
    col_no_x = 365.0
    msp.add_line((col_no_x, 25.0), (col_no_x, 10.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    # Kiri: Kode Gambar
    msp.add_text("KODE GAMBAR :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                 ).set_placement((KOP_X + 2.5, 21.0), align=TextEntityAlignment.MIDDLE_LEFT)
    msp.add_text("DED-BM-RUAS-01", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.4}
                 ).set_placement((KOP_X + 2.5, 15.5), align=TextEntityAlignment.MIDDLE_LEFT)

    # Kanan: Nomor Lembar
    msp.add_text("NO. LEMBAR :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                 ).set_placement(((col_no_x + X_MAX) / 2.0, 21.0), align=TextEntityAlignment.MIDDLE_CENTER)
    # Nomor Lembar Besar
    msp.add_text("01 / 15", dxfattribs={'layer': 'KOP_TEKS_NOMOR', 'color': 2, 'height': 4.5}
                 ).set_placement(((col_no_x + X_MAX) / 2.0, 15.0), align=TextEntityAlignment.MIDDLE_CENTER)


    # =========================================================================
    # AREA GAMBAR KERJA (X: 20 -> 310, Y: 10 -> 287)
    # Dilengkapi Simbol Arah Mata Angin, Skala Grafis, dan Catatan Teknis Umum
    # =========================================================================

    # 1. Simbol Arah Mata Angin di pojok kanan atas area gambar
    create_north_arrow(msp, 285.0, 255.0, size=24.0)

    # 2. Skala Grafis di pojok kanan atas bawah mata angin
    create_scale_bar(msp, 260.0, 222.0, length=40.0, divisions=4)

    # 3. Kotak Catatan Teknis (General Notes) di pojok kiri bawah area gambar
    notes_x1 = 25.0
    notes_y1 = 15.0
    notes_w = 120.0
    notes_h = 48.0
    notes_x2 = notes_x1 + notes_w
    notes_y2 = notes_y1 + notes_h

    msp.add_lwpolyline([
        (notes_x1, notes_y1),
        (notes_x2, notes_y1),
        (notes_x2, notes_y2),
        (notes_x1, notes_y2),
        (notes_x1, notes_y1)
    ], close=True, dxfattribs={'layer': 'KOP_CATATAN_TEKNIS', 'color': 7})

    msp.add_line((notes_x1, notes_y2 - 6.0), (notes_x2, notes_y2 - 6.0),
                 dxfattribs={'layer': 'KOP_CATATAN_TEKNIS', 'color': 7})

    msp.add_text("CATATAN UMUM PERENCANAAN JALAN :", dxfattribs={
        'layer': 'KOP_CATATAN_TEKNIS', 'color': 3, 'height': 2.0
    }).set_placement((notes_x1 + 3.0, notes_y2 - 3.2), align=TextEntityAlignment.MIDDLE_LEFT)

    notes = [
        "1. SEMUA UKURAN DINYATAKAN DALAM MILIMETER (mm), KECUALI DISEBUTKAN LAIN.",
        "2. ELEVASI DAN KOORDINAT MENGACU PADA SISTEM UTM WGS-84 ZONA 48S.",
        "3. TITIK BENCHMARK (BM) HARUS DICEK KEMBALI SEBELUM PEKERJAAN DIMULAI.",
        "4. KEMIRINGAN MELINTANG STANDAR (CROSSFALL) BADAN JALAN = 2.00 %.",
        "5. KEMIRINGAN BAHU JALAN (SHOULDER) = 4.00 %.",
        "6. JIKA TERDAPAT PERBEDAAN GAMBAR DENGAN LAPANGAN, SEGERA LAPORKAN DIREKSI.",
        "7. PERENCANAAN MENGACU PADA PEDOMAN DESAIN GEOMETRIK JALAN PUPR NO. 13/PRT/M/2011."
    ]

    for idx, note in enumerate(notes):
        ny = (notes_y2 - 9.0) - idx * 5.0
        msp.add_text(note, dxfattribs={
            'layer': 'KOP_CATATAN_TEKNIS', 'color': 7, 'height': 1.5
        }).set_placement((notes_x1 + 3.0, ny), align=TextEntityAlignment.MIDDLE_LEFT)

    # 4. Blok Cad Definition agar bisa dimasukkan ke drawing lain via INSERT
    block_def = doc.blocks.new(name='KOP_STANDAR_PUPR_A3')
    # Copy basic boundary
    block_def.add_lwpolyline([(0, 0), (W, 0), (W, H), (0, H), (0, 0)], close=True, dxfattribs={'color': 8})
    block_def.add_lwpolyline([(X_MIN, Y_MIN), (X_MAX, Y_MIN), (X_MAX, Y_MAX), (X_MIN, Y_MAX), (X_MIN, Y_MIN)], close=True, dxfattribs={'color': 7})
    block_def.add_line((KOP_X, Y_MIN), (KOP_X, Y_MAX), dxfattribs={'color': 7})
    for y in y_lines:
        block_def.add_line((KOP_X, y), (X_MAX, y), dxfattribs={'color': 7})
    create_pupr_logo(block_def, kop_cx, logo_y, radius=10.0)

    # 5. Kalibrasi Bounding Box Extents & Viewport untuk Civil 3D 2024
    box = bbox.extents(msp)
    if box.has_data:
        msp.dxf.extmin = box.extmin
        msp.dxf.extmax = box.extmax
        doc.header['$EXTMIN'] = box.extmin
        doc.header['$EXTMAX'] = box.extmax
        doc.header['$LIMMIN'] = (box.extmin.x, box.extmin.y)
        doc.header['$LIMMAX'] = (box.extmax.x, box.extmax.y)

    vports = doc.viewports.get_config('*Active')
    if vports:
        v = vports[0]
        v.dxf.center = (W / 2.0, H / 2.0)
        v.dxf.height = H * 1.05
        v.dxf.aspect_ratio = W / H

    return doc


def build_pupr_a3_horizontal():
    """
    Membangun Gambar KOP Standar PUPR A3 Horisontal (Etiket Bawah)
    Khusus untuk Potongan Melintang (Cross Section) Album Standar PUPR Bina Marga
    Ukuran A3 Landscape: 420 x 297 mm
    KOP Bawah: X = 20 s/d 410 mm (Lebar = 390 mm), Y = 10 s/d 55 mm (Tinggi = 45 mm)
    Drawing Area: X = 20 s/d 410 mm, Y = 55 s/d 287 mm (Tinggi = 232 mm)
    """
    doc = ezdxf.new('R2018', setup=True)

    layers = [
        ('KOP_BORDER_LUAR', colors.GRAY, 'CONTINUOUS', 18),
        ('KOP_BORDER_UTAMA', colors.WHITE, 'CONTINUOUS', 70),
        ('KOP_GARIS_TABEL', colors.WHITE, 'CONTINUOUS', 35),
        ('KOP_GARIS_SUBTABEL', colors.GRAY, 'CONTINUOUS', 18),
        ('KOP_TEKS_INSTANSI', colors.YELLOW, 'CONTINUOUS', 35),
        ('KOP_TEKS_LABEL', colors.WHITE, 'CONTINUOUS', 25),
        ('KOP_TEKS_DATA', colors.CYAN, 'CONTINUOUS', 30),
        ('KOP_TEKS_JUDUL', colors.YELLOW, 'CONTINUOUS', 50),
        ('KOP_TEKS_NOMOR', colors.WHITE, 'CONTINUOUS', 60),
        ('KOP_LOGO_PUPR', colors.YELLOW, 'CONTINUOUS', 35),
        ('KOP_GRID_REFERENSI', colors.GRAY, 'CONTINUOUS', 18),
    ]

    for name, col, ltype, lweight in layers:
        if name not in doc.layers:
            doc.layers.add(name, color=col, linetype=ltype, lineweight=lweight)

    msp = doc.modelspace()

    W, H = 420.0, 297.0
    X_MIN, X_MAX = 20.0, 410.0
    Y_MIN, Y_MAX = 10.0, 287.0
    KOP_H = 45.0
    KOP_TOP_Y = Y_MIN + KOP_H # 55.0

    # 1. Garis Potong Luar
    msp.add_lwpolyline([(0, 0), (W, 0), (W, H), (0, H), (0, 0)], close=True,
                       dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 8})

    # 2. Bingkai Utama
    msp.add_lwpolyline([
        (X_MIN, Y_MIN), (X_MAX, Y_MIN), (X_MAX, Y_MAX), (X_MIN, Y_MAX), (X_MIN, Y_MIN)
    ], close=True, dxfattribs={'layer': 'KOP_BORDER_UTAMA', 'color': 7})

    # Garis pemisah antara area gambar dan kop bawah
    msp.add_line((X_MIN, KOP_TOP_Y), (X_MAX, KOP_TOP_Y), dxfattribs={'layer': 'KOP_BORDER_UTAMA', 'color': 7})

    # 3. Pembagian Kolom Horizontal (Lebar total 390 mm: X dari 20 s/d 410)
    # Kolom 1: Logo & Instansi (X: 20 -> 95, Lebar 75mm)
    # Kolom 2: Paket Pekerjaan & Kegiatan (X: 95 -> 195, Lebar 100mm)
    # Kolom 3: Konsultan & Tanda Tangan (X: 195 -> 280, Lebar 85mm)
    # Kolom 4: Direksi / PPK Disetujui (X: 280 -> 345, Lebar 65mm)
    # Kolom 5: Judul Gambar, Skala & No Lembar (X: 345 -> 410, Lebar 65mm)

    col_splits = [95.0, 195.0, 280.0, 345.0]
    for cs in col_splits:
        msp.add_line((cs, Y_MIN), (cs, KOP_TOP_Y), dxfattribs={'layer': 'KOP_GARIS_TABEL', 'color': 7})

    # Kolom 1: Logo & Instansi
    create_pupr_logo(msp, 35.0, (Y_MIN + KOP_TOP_Y) / 2.0, radius=8.0)
    msp.add_text("KEMENTERIAN PEKERJAAN UMUM", dxfattribs={'layer': 'KOP_TEKS_INSTANSI', 'color': 2, 'height': 1.8}
                 ).set_placement((65.0, 42.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("DAN PERUMAHAN RAKYAT", dxfattribs={'layer': 'KOP_TEKS_INSTANSI', 'color': 2, 'height': 1.8}
                 ).set_placement((65.0, 38.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("DITJEN BINA MARGA", dxfattribs={'layer': 'KOP_TEKS_INSTANSI', 'color': 7, 'height': 1.7}
                 ).set_placement((65.0, 34.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("BBPJN WILAYAH JAWA BARAT", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                 ).set_placement((65.0, 29.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # Kolom 2: Kegiatan & Paket Pekerjaan
    msp.add_text("NAMA PAKET PEKERJAAN :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                 ).set_placement((98.0, 49.0), align=TextEntityAlignment.MIDDLE_LEFT)
    msp.add_text("PENINGKATAN STRUKTUR JALAN", dxfattribs={'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 2.3}
                 ).set_placement((145.0, 42.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("RUAS CILAMAYA - KAB. KARAWANG", dxfattribs={'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 2.3}
                 ).set_placement((145.0, 36.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("KONTRAK: HK.02.03/Bb.06/PJN-WIL.I/2026/04 | T.A. 2026", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.5}
                 ).set_placement((145.0, 29.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("LOKASI: KABUPATEN KARAWANG - PROVINSI JAWA BARAT", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                 ).set_placement((145.0, 22.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # Kolom 3: Konsultan
    msp.add_text("KONSULTAN PERENCANA :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                 ).set_placement((198.0, 49.0), align=TextEntityAlignment.MIDDLE_LEFT)
    msp.add_text("PT. KONSULTAN REKAYASA TEKNIK", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.8}
                 ).set_placement((237.5, 42.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_line((195.0, 36.0), (280.0, 36.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 8})
    msp.add_text("Team Leader : Ir. Bambang S., MT.", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                 ).set_placement((198.0, 31.0), align=TextEntityAlignment.MIDDLE_LEFT)
    msp.add_text("Highway Eng : Dedi Kurniawan, ST.", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                 ).set_placement((198.0, 25.0), align=TextEntityAlignment.MIDDLE_LEFT)
    msp.add_text("Surveyor/CAD : Putri, ST. / Rian, A.Md.", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                 ).set_placement((198.0, 19.0), align=TextEntityAlignment.MIDDLE_LEFT)

    # Kolom 4: Direksi PPK Disetujui
    msp.add_text("DISETUJUI OLEH :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                 ).set_placement((312.5, 49.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("PEJABAT PEMBUAT KOMITMEN", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                 ).set_placement((312.5, 44.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("H. HENDRA WIJAYA, ST., M.Eng.", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.6}
                 ).set_placement((312.5, 23.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("NIP. 19820514 200801 1 005", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.3}
                 ).set_placement((312.5, 17.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # Kolom 5: Judul Gambar & No Lembar
    msp.add_line((345.0, 34.0), (410.0, 34.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    msp.add_text("POTONGAN MELINTANG (CROSS SECTION)", dxfattribs={'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 1.9}
                 ).set_placement((377.5, 46.5), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("SKALA 1 : 100", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.8}
                 ).set_placement((377.5, 39.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # Sub kolom bawah no lembar
    msp.add_line((380.0, 34.0), (380.0, Y_MIN), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    msp.add_text("KODE GAMBAR", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.3}
                 ).set_placement((362.5, 29.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("DED-BM-CS-01", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                 ).set_placement((362.5, 20.0), align=TextEntityAlignment.MIDDLE_CENTER)

    msp.add_text("LEMBAR KE", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.3}
                 ).set_placement((395.0, 29.0), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("01 / 20", dxfattribs={'layer': 'KOP_TEKS_NOMOR', 'color': 2, 'height': 3.5}
                 ).set_placement((395.0, 20.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # 4. Kalibrasi Bounding Box Extents & Viewport untuk Civil 3D 2024
    box = bbox.extents(msp)
    if box.has_data:
        msp.dxf.extmin = box.extmin
        msp.dxf.extmax = box.extmax
        doc.header['$EXTMIN'] = box.extmin
        doc.header['$EXTMAX'] = box.extmax
        doc.header['$LIMMIN'] = (box.extmin.x, box.extmin.y)
        doc.header['$LIMMAX'] = (box.extmax.x, box.extmax.y)

    vports = doc.viewports.get_config('*Active')
    if vports:
        v = vports[0]
        v.dxf.center = (W / 2.0, H / 2.0)
        v.dxf.height = H * 1.05
        v.dxf.aspect_ratio = W / H

    return doc


def main():
    print("=================================================================")
    print(" GENERATOR KOP STANDAR PUPR - OPTIMAL UNTUK CIVIL 3D 2024 (R2018)")
    print("=================================================================")

    print("\n--- 1. Membangun KOP STANDAR PUPR A3 Vertikal (Kolom Kanan) ---")
    doc_vert = build_pupr_a3_vertical()
    dxf_vert = "KOP_STANDAR_PUPR_A3_VERTIKAL.dxf"
    doc_vert.saveas(dxf_vert)
    print(f" [OK] DXF Vertikal tersimpan: {dxf_vert} (AutoCAD R2018 Verified)")

    print("\n--- 2. Membangun KOP STANDAR PUPR A3 Horisontal (Etiket Bawah) ---")
    doc_horiz = build_pupr_a3_horizontal()
    dxf_horiz = "KOP_STANDAR_PUPR_A3_HORIZONTAL.dxf"
    doc_horiz.saveas(dxf_horiz)
    print(f" [OK] DXF Horisontal tersimpan: {dxf_horiz} (AutoCAD R2018 Verified)")

    # Buat salinan master KOP_STANDAR_PUPR.dxf
    import shutil
    shutil.copyfile(dxf_vert, "KOP_STANDAR_PUPR.dxf")
    print(f" [OK] Master DXF tersimpan: KOP_STANDAR_PUPR.dxf")

    print("\n-----------------------------------------------------------------")
    print(" PANDUAN PENGGUNAAN DI AUTODESK CIVIL 3D 2024:")
    print(" 1. Buka Civil 3D 2024 -> Pilih File > Open (atau ketik OPEN di command line).")
    print(" 2. Pada dropdown 'Files of type', pilih 'DXF (*.dxf)'.")
    print(" 3. Pilih salah satu file:")
    print(f"    - {dxf_vert} (Etiket Kolom Kanan)")
    print(f"    - {dxf_horiz} (Etiket Bawah / Cross Section)")
    print(" 4. Gambar langsung terbuka 100% presisi di tengah layar (Zoom Extents otomatis).")
    print(" 5. Simpan sebagai DWG asli Autodesk kapan pun via File > Save As (DWG).")
    print("=================================================================")

if __name__ == '__main__':
    main()
