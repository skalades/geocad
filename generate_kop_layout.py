"""
===============================================================================
Script Generator KOP Gambar Standar PUPR di Layout (Paper Space)
Format: AutoCAD DWG & DXF (Kertas A3 Landscape: 420 mm x 297 mm)
Standar: Direktorat Jenderal Bina Marga - Kementerian PUPR
===============================================================================
Fitur:
1. Menggambar KOP / Etiket langsung di tab LAYOUT (Paper Space).
2. Menyediakan 2 Varian Layout:
   - Layout_A3_Vertikal   : Kolom Kop di sebelah kanan (100 mm) + Viewport (290x277 mm).
   - Layout_A3_Horizontal : Kolom Kop di sebelah bawah (45 mm)  + Viewport (390x232 mm).
3. Dilengkapi objek AutoCAD VIEWPORT aktif yang otomatis terhubung ke Model Space.
4. Layer Viewport (KOP_VIEWPORT) diset Non-Plotting (plot=0) agar garis kotak viewport
   tidak ikut tercetak saat di-plot/print ke PDF.
5. Otomatis mengonversi ke format DWG asli jika dxf2dwg.exe tersedia.
6. Dapat dijalankan mandiri (standalone) atau menginjeksi Layout ke berkas DXF yang sudah ada.
===============================================================================
"""

import sys
import os
import math
import argparse
import subprocess
from datetime import datetime
import ezdxf
from ezdxf import colors, bbox
from ezdxf.enums import TextEntityAlignment

def setup_layers(doc):
    """Membuat layer standar KOP PUPR dengan warna dan lineweight yang tepat."""
    layers_config = [
        # (Nama Layer, Warna AutoCAD, Lineweight dalam 1/100 mm, Plotting Flag)
        ('KOP_BORDER_LUAR', colors.GRAY, 18, True),
        ('KOP_BORDER_UTAMA', colors.WHITE, 70, True),
        ('KOP_GARIS_TABEL', colors.WHITE, 35, True),
        ('KOP_GARIS_SUBTABEL', colors.GRAY, 18, True),
        ('KOP_TEKS_INSTANSI', colors.YELLOW, 35, True),
        ('KOP_TEKS_LABEL', colors.WHITE, 25, True),
        ('KOP_TEKS_DATA', colors.CYAN, 30, True),
        ('KOP_TEKS_JUDUL', colors.YELLOW, 50, True),
        ('KOP_TEKS_NOMOR', colors.YELLOW, 60, True),
        ('KOP_LOGO_PUPR', colors.YELLOW, 35, True),
        ('KOP_SIMBOL_UTARA', colors.CYAN, 25, True),
        ('KOP_CATATAN_TEKNIS', colors.GREEN, 20, True),
        ('KOP_GRID_REFERENSI', colors.GRAY, 18, True),
        ('VIEWPORTS', colors.WHITE, 18, False),
        ('KOP_VIEWPORT', colors.CYAN, 18, False), # Non-plotting layer
    ]

    for name, col, lweight, can_plot in layers_config:
        if name not in doc.layers:
            layer = doc.layers.add(name, color=col, lineweight=lweight)
            layer.dxf.plot = 1 if can_plot else 0


def create_pupr_logo(layout, center_x, center_y, radius=10.0):
    """
    Menggambar Lambang Vektor Resmi Kementerian PUPR di Paper Space:
    - Baling-baling roda gerigi 6 daun simetris (Kuning)
    - Lingkaran tengah & siluet geometris lengkung (Biru PUPR)
    """
    # Lingkaran luar gerigi (outer decorative circle)
    layout.add_circle((center_x, center_y), radius, dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 2})
    layout.add_circle((center_x, center_y), radius * 0.90, dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 2})
    layout.add_circle((center_x, center_y), radius * 0.55, dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 5})
    layout.add_circle((center_x, center_y), radius * 0.22, dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 2})

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

        layout.add_lwpolyline([p1, p2, p3, p4, p1], close=True, dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 2})

    # Gelombang Lengkung khas di bagian tengah (Air & Roda)
    layout.add_arc(
        (center_x, center_y),
        radius * 0.40,
        start_angle=30,
        end_angle=210,
        dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 5}
    )
    layout.add_arc(
        (center_x, center_y),
        radius * 0.35,
        start_angle=210,
        end_angle=390,
        dxfattribs={'layer': 'KOP_LOGO_PUPR', 'color': 5}
    )


def create_north_arrow(layout, x, y, size=18.0):
    """Menggambar Simbol Arah Mata Angin (North Arrow) Standar PUPR di Layout."""
    half = size / 2.0
    r = half * 0.9

    layout.add_circle((x, y), r, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 4})
    layout.add_circle((x, y), r * 0.85, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 8})

    top = (x, y + r * 0.95)
    bottom = (x, y - r * 0.6)
    left = (x - r * 0.35, y - r * 0.15)
    right = (x + r * 0.35, y - r * 0.15)
    center = (x, y)

    layout.add_lwpolyline([center, top, left, center], close=True, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 1})
    layout.add_lwpolyline([center, top, right, center], close=True, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 7})
    layout.add_lwpolyline([center, bottom, left, center], close=True, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 8})
    layout.add_lwpolyline([center, bottom, right, center], close=True, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 8})

    layout.add_text('U', dxfattribs={
        'layer': 'KOP_SIMBOL_UTARA',
        'color': 1,
        'height': 3.5,
        'style': 'STANDARD'
    }).set_placement((x, y + r * 1.1), align=TextEntityAlignment.BOTTOM_CENTER)


def create_scale_bar(layout, x, y, length=40.0, divisions=4):
    """Menggambar Skala Grafis (Graphic Bar Scale) Standar di Layout."""
    h = 2.5
    seg_w = length / divisions

    layout.add_lwpolyline([(x, y), (x + length, y), (x + length, y + h), (x, y + h), (x, y)], close=True,
                          dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 7})

    for i in range(divisions):
        xi = x + i * seg_w
        layout.add_line((xi, y), (xi, y + h), dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 7})
        if i % 2 == 0:
            p1 = (xi, y)
            p2 = (xi + seg_w, y)
            p3 = (xi + seg_w, y + h)
            p4 = (xi, y + h)
            layout.add_lwpolyline([p1, p2, p3, p4, p1], close=True, dxfattribs={'layer': 'KOP_SIMBOL_UTARA', 'color': 8})

        val_m = int(i * 10)
        layout.add_text(str(val_m), dxfattribs={
            'layer': 'KOP_SIMBOL_UTARA',
            'color': 7,
            'height': 1.6,
            'style': 'STANDARD'
        }).set_placement((xi, y + h + 0.6), align=TextEntityAlignment.BOTTOM_CENTER)

    layout.add_text(f"{int(divisions * 10)} m", dxfattribs={
        'layer': 'KOP_SIMBOL_UTARA',
        'color': 7,
        'height': 1.6,
        'style': 'STANDARD'
    }).set_placement((x + length, y + h + 0.6), align=TextEntityAlignment.BOTTOM_CENTER)

    layout.add_text("SKALA GRAFIS (METER)", dxfattribs={
        'layer': 'KOP_SIMBOL_UTARA',
        'color': 7,
        'height': 1.6,
        'style': 'STANDARD'
    }).set_placement((x + length / 2.0, y - 1.8), align=TextEntityAlignment.TOP_CENTER)


def build_layout_vertical(doc, layout_name, info, target_center=(0, 0), target_height=277.0):
    """
    Membangun KOP PUPR Standar A3 Landscape Vertikal (Kolom Kanan) di Paper Space
    - Ukuran Kertas: 420 x 297 mm
    - Kolom KOP: X = 310 s/d 410 mm (Lebar = 100 mm)
    - Area Gambar / Viewport: X = 20 s/d 310 mm, Y = 10 s/d 287 mm (Lebar = 290 mm, Tinggi = 277 mm)
    """
    if layout_name in doc.layouts:
        layout = doc.layout(layout_name)
    else:
        layout = doc.layouts.new(layout_name)

    # 1. Konfigurasi Halaman Kertas A3 Landscape
    layout.page_setup(
        size=(420.0, 297.0),
        margins=(0.0, 0.0, 0.0, 0.0),
        units='mm',
        device='DWG To PDF.pc3'
    )

    W, H = 420.0, 297.0
    M_LEFT = 20.0
    M_RIGHT = 10.0
    M_TOP = 10.0
    M_BOT = 10.0

    X_MIN = M_LEFT       # 20.0 mm
    X_MAX = W - M_RIGHT  # 410.0 mm
    Y_MIN = M_BOT        # 10.0 mm
    Y_MAX = H - M_TOP    # 287.0 mm
    KOP_X = 310.0        # Lebar Kop = 100 mm

    # 2. Garis Batas Kertas Luar (Trim Boundary) & Crop Marks
    layout.add_lwpolyline([(0, 0), (W, 0), (W, H), (0, H), (0, 0)], close=True,
                          dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 8})

    crop_len = 6.0
    for cx, cy, dx, dy in [(0, 0, 1, 1), (W, 0, -1, 1), (W, H, -1, -1), (0, H, 1, -1)]:
        layout.add_line((cx, cy + dy * 2), (cx + dx * crop_len, cy + dy * 2),
                        dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 8})
        layout.add_line((cx + dx * 2, cy), (cx + dx * 2, cy + dy * crop_len),
                        dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 8})

    # 3. Garis Batas Gambar Utama (Tebal 0.70 mm)
    layout.add_lwpolyline([
        (X_MIN, Y_MIN),
        (X_MAX, Y_MIN),
        (X_MAX, Y_MAX),
        (X_MIN, Y_MAX),
        (X_MIN, Y_MIN)
    ], close=True, dxfattribs={'layer': 'KOP_BORDER_UTAMA', 'color': 7})

    # Garis Pembagi Kolom KOP dan Area Gambar
    layout.add_line((KOP_X, Y_MIN), (KOP_X, Y_MAX), dxfattribs={'layer': 'KOP_BORDER_UTAMA', 'color': 7})

    # 4. Grid Referensi Koordinat Margin (1, 2, 3, 4, 5, 6 dan A, B, C, D)
    grid_cols = 6
    dx = (KOP_X - X_MIN) / grid_cols
    for i in range(1, grid_cols):
        gx = X_MIN + i * dx
        layout.add_line((gx, Y_MAX), (gx, Y_MAX + 2.5), dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8})
        layout.add_line((gx, Y_MIN), (gx, Y_MIN - 2.5), dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8})

    for i in range(grid_cols):
        gx = X_MIN + (i + 0.5) * dx
        lbl = str(i + 1)
        layout.add_text(lbl, dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8, 'height': 2.0}
                        ).set_placement((gx, Y_MAX + 1.2), align=TextEntityAlignment.BOTTOM_CENTER)
        layout.add_text(lbl, dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8, 'height': 2.0}
                        ).set_placement((gx, Y_MIN - 1.2), align=TextEntityAlignment.TOP_CENTER)

    grid_rows = 4
    dy = (Y_MAX - Y_MIN) / grid_rows
    row_labels = ['A', 'B', 'C', 'D']
    for i in range(1, grid_rows):
        gy = Y_MIN + i * dy
        layout.add_line((X_MIN, gy), (X_MIN - 2.5, gy), dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8})

    for i in range(grid_rows):
        gy = Y_MAX - (i + 0.5) * dy
        layout.add_text(row_labels[i], dxfattribs={'layer': 'KOP_GRID_REFERENSI', 'color': 8, 'height': 2.0}
                        ).set_placement((X_MIN - 1.2, gy), align=TextEntityAlignment.MIDDLE_RIGHT)

    # 5. Objek VIEWPORT (Jendela Pandang ke Model Space)
    # Area Gambar: X: 20 -> 310 (lebar 290 mm), Y: 10 -> 287 (tinggi 277 mm)
    vp_w = KOP_X - X_MIN # 290.0 mm
    vp_h = Y_MAX - Y_MIN # 277.0 mm
    vp_cx = (X_MIN + KOP_X) / 2.0 # 165.0 mm
    vp_cy = (Y_MIN + Y_MAX) / 2.0 # 148.5 mm

    layout.add_viewport(
        center=(vp_cx, vp_cy),
        size=(vp_w, vp_h),
        view_center_point=target_center,
        view_height=target_height,
        status=2, # Aktif
        dxfattribs={'layer': 'KOP_VIEWPORT'}
    )

    # 6. Pembagian Row Kolom KOP (Y: 287 -> 10)
    y_lines = [238.0, 215.0, 175.0, 125.0, 77.0, 45.0, 25.0]
    for y in y_lines:
        layout.add_line((KOP_X, y), (X_MAX, y), dxfattribs={'layer': 'KOP_GARIS_TABEL', 'color': 7})

    kop_cx = (KOP_X + X_MAX) / 2.0 # 360.0 mm

    # --- BLOK 1: INSTANSI & LOGO PUPR (287 -> 238) ---
    create_pupr_logo(layout, kop_cx, 271.0, radius=10.0)
    layout.add_text(info.get('gov_title', "PEMERINTAH REPUBLIK INDONESIA"),
                    dxfattribs={'layer': 'KOP_TEKS_INSTANSI', 'color': 7, 'height': 2.1}
                    ).set_placement((kop_cx, 255.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('ministry', "KEMENTERIAN PEKERJAAN UMUM"),
                    dxfattribs={'layer': 'KOP_TEKS_INSTANSI', 'color': 2, 'height': 2.6}
                    ).set_placement((kop_cx, 251.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('sub_ministry', "DAN PERUMAHAN RAKYAT"),
                    dxfattribs={'layer': 'KOP_TEKS_INSTANSI', 'color': 2, 'height': 2.6}
                    ).set_placement((kop_cx, 248.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('directorate', "DIREKTORAT JENDERAL BINA MARGA"),
                    dxfattribs={'layer': 'KOP_TEKS_INSTANSI', 'color': 7, 'height': 2.2}
                    ).set_placement((kop_cx, 244.2), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('office', "BALAI BESAR PELAKSANAAN JALAN NASIONAL"),
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                    ).set_placement((kop_cx, 240.8), align=TextEntityAlignment.MIDDLE_CENTER)

    # --- BLOK 2: PROGRAM & KEGIATAN (238 -> 215) ---
    layout.add_text("PROGRAM :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                    ).set_placement((KOP_X + 2.5, 235.0), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(info.get('program', "PENYELENGGARAAN JALAN DAN JEMBATAN"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.1}
                    ).set_placement((KOP_X + 2.5, 231.2), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_line((KOP_X, 226.5), (X_MAX, 226.5), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 8})
    layout.add_text("KEGIATAN :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                    ).set_placement((KOP_X + 2.5, 223.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(info.get('activity', "PEMBANGUNAN & PENINGKATAN STRUKTUR JALAN"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.1}
                    ).set_placement((KOP_X + 2.5, 219.7), align=TextEntityAlignment.MIDDLE_LEFT)

    # --- BLOK 3: PAKET PEKERJAAN & LOKASI (215 -> 175) ---
    layout.add_text("NAMA PAKET PEKERJAAN :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                    ).set_placement((KOP_X + 2.5, 211.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(info.get('project', "PENINGKATAN STRUKTUR JALAN"),
                    dxfattribs={'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 2.6}
                    ).set_placement((kop_cx, 206.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('section', "RUAS JALAN CILAMAYA"),
                    dxfattribs={'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 2.6}
                    ).set_placement((kop_cx, 202.8), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_line((KOP_X, 198.5), (X_MAX, 198.5), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 8})
    layout.add_text("NOMOR KONTRAK :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.7}
                    ).set_placement((KOP_X + 2.5, 195.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(info.get('contract_no', "HK.02.03/Bb.06/PJN-WIL.I/2026/04"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.9}
                    ).set_placement((KOP_X + 2.5, 192.2), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_line((KOP_X, 188.5), (X_MAX, 188.5), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 8})
    layout.add_text(f"LOKASI : {info.get('location', 'KAB. KARAWANG - JAWA BARAT')}",
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                    ).set_placement((KOP_X + 2.5, 185.0), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text("SUMBER DANA : APBN TAHUN ANGGARAN 2026",
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                    ).set_placement((KOP_X + 2.5, 180.5), align=TextEntityAlignment.MIDDLE_LEFT)

    # --- BLOK 4: KONSULTAN PERENCANA (175 -> 125) ---
    layout.add_text("KONSULTAN PERENCANA :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                    ).set_placement((KOP_X + 2.5, 172.0), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(info.get('consultant', "PT. KONSULTAN REKAYASA TEKNIK"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.2}
                    ).set_placement((kop_cx, 167.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("Highway & Civil Infrastructure Engineering",
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                    ).set_placement((kop_cx, 164.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_line((KOP_X, 161.5), (X_MAX, 161.5), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    layout.add_line((kop_cx, 161.5), (kop_cx, 125.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    layout.add_line((KOP_X, 143.0), (X_MAX, 143.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    # Sub-kotak tanda tangan konsultan
    layout.add_text("TEAM LEADER", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                    ).set_placement(((KOP_X + kop_cx) / 2.0, 158.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('team_leader', "Ir. M. Ridwan, MT."),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                    ).set_placement(((KOP_X + kop_cx) / 2.0, 145.5), align=TextEntityAlignment.MIDDLE_CENTER)

    layout.add_text("HIGHWAY ENGINEER", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                    ).set_placement(((kop_cx + X_MAX) / 2.0, 158.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('highway_eng', "Dedi Suryadi, ST."),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                    ).set_placement(((kop_cx + X_MAX) / 2.0, 145.5), align=TextEntityAlignment.MIDDLE_CENTER)

    layout.add_text("GEODETIC / SURVEYOR", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                    ).set_placement(((KOP_X + kop_cx) / 2.0, 140.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('surveyor', "Putri, ST."),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                    ).set_placement(((KOP_X + kop_cx) / 2.0, 127.5), align=TextEntityAlignment.MIDDLE_CENTER)

    layout.add_text("CAD DRAFTER", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                    ).set_placement(((kop_cx + X_MAX) / 2.0, 140.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('drafter', "Rian Pratama, A.Md."),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                    ).set_placement(((kop_cx + X_MAX) / 2.0, 127.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # --- BLOK 5: DISETUJUI & MENGETAHUI DIREKSI / PPK (125 -> 77) ---
    layout.add_text("PIHAK DIREKSI PEKERJAAN :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                    ).set_placement((KOP_X + 2.5, 122.0), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_line((KOP_X, 118.5), (X_MAX, 118.5), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    layout.add_line((kop_cx, 118.5), (kop_cx, 77.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    layout.add_text("DISETUJUI OLEH :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                    ).set_placement(((KOP_X + kop_cx) / 2.0, 116.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("PEJABAT PEMBUAT KOMITMEN", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                    ).set_placement(((KOP_X + kop_cx) / 2.0, 112.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("( PPK )", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                    ).set_placement(((KOP_X + kop_cx) / 2.0, 109.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('ppk_name', "H. HENDRA WIJAYA, ST., M.Eng."),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                    ).set_placement(((KOP_X + kop_cx) / 2.0, 83.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(f"NIP. {info.get('ppk_nip', '19820514 200801 1 005')}",
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                    ).set_placement(((KOP_X + kop_cx) / 2.0, 80.0), align=TextEntityAlignment.MIDDLE_CENTER)

    layout.add_text("MENGETAHUI :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                    ).set_placement(((kop_cx + X_MAX) / 2.0, 116.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("KEPALA SATUAN KERJA", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                    ).set_placement(((kop_cx + X_MAX) / 2.0, 112.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("PJN WILAYAH I JAWA BARAT", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                    ).set_placement(((kop_cx + X_MAX) / 2.0, 109.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('kasatker_name', "Ir. AGUS SETIAWAN, MT."),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                    ).set_placement(((kop_cx + X_MAX) / 2.0, 83.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(f"NIP. {info.get('kasatker_nip', '19750820 200212 1 002')}",
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                    ).set_placement(((kop_cx + X_MAX) / 2.0, 80.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # --- BLOK 6: JUDUL GAMBAR (77 -> 45) ---
    layout.add_text("JUDUL GAMBAR :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                    ).set_placement((KOP_X + 2.5, 73.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(info.get('title', "DENAH & PROFIL MEMANJANG"),
                    dxfattribs={'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 3.0}
                    ).set_placement((kop_cx, 65.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('title_sub', "PLAN & PROFILE ALIGNMENT"),
                    dxfattribs={'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 2.4}
                    ).set_placement((kop_cx, 59.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('sta_range', "STA 0+000 s/d STA 2+500"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.2}
                    ).set_placement((kop_cx, 53.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('section', "RUAS JALAN CILAMAYA"),
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                    ).set_placement((kop_cx, 48.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # --- BLOK 7: SKALA, TANGGAL & REVISI (45 -> 25) ---
    col1_x = 343.0
    col2_x = 376.0
    layout.add_line((col1_x, 45.0), (col1_x, 25.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    layout.add_line((col2_x, 45.0), (col2_x, 25.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    layout.add_text("SKALA GAMBAR :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                    ).set_placement(((KOP_X + col1_x) / 2.0, 41.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(f"H = {info.get('scale_h', '1 : 1.000')}", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.0}
                    ).set_placement(((KOP_X + col1_x) / 2.0, 35.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(f"V = {info.get('scale_v', '1 : 100')}", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.0}
                    ).set_placement(((KOP_X + col1_x) / 2.0, 29.5), align=TextEntityAlignment.MIDDLE_CENTER)

    layout.add_text("TANGGAL & T.A. :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                    ).set_placement(((col1_x + col2_x) / 2.0, 41.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('date', "OKTOBER 2026"), dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.0}
                    ).set_placement(((col1_x + col2_x) / 2.0, 35.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("T.A. 2026", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.8}
                    ).set_placement(((col1_x + col2_x) / 2.0, 29.5), align=TextEntityAlignment.MIDDLE_CENTER)

    layout.add_text("STATUS / REV :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                    ).set_placement(((col2_x + X_MAX) / 2.0, 41.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(f"REV : {info.get('revision', '00')}", dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.0}
                    ).set_placement(((col2_x + X_MAX) / 2.0, 35.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("FINAL DED", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 3, 'height': 1.8}
                    ).set_placement(((col2_x + X_MAX) / 2.0, 29.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # --- BLOK 8: KODE GAMBAR & NO LEMBAR (25 -> 10) ---
    col_no_x = 365.0
    layout.add_line((col_no_x, 25.0), (col_no_x, 10.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    layout.add_text("KODE GAMBAR :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                    ).set_placement((KOP_X + 2.5, 21.0), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(info.get('drawing_code', "DED-BM-RUAS-01"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 2.3}
                    ).set_placement((KOP_X + 2.5, 15.5), align=TextEntityAlignment.MIDDLE_LEFT)

    layout.add_text("NO. LEMBAR :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.6}
                    ).set_placement(((col_no_x + X_MAX) / 2.0, 21.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('sheet_no', "01 / 15"),
                    dxfattribs={'layer': 'KOP_TEKS_NOMOR', 'color': 2, 'height': 4.5}
                    ).set_placement(((col_no_x + X_MAX) / 2.0, 15.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # 7. Simbol Utara & Skala Grafis di pojok kanan atas area gambar
    create_north_arrow(layout, 285.0, 255.0, size=24.0)
    create_scale_bar(layout, 260.0, 222.0, length=40.0, divisions=4)

    # 8. Catatan Umum Perencanaan (General Notes) di pojok kiri bawah area gambar
    notes_x1, notes_y1 = 25.0, 15.0
    notes_w, notes_h = 120.0, 48.0
    layout.add_lwpolyline([
        (notes_x1, notes_y1), (notes_x1 + notes_w, notes_y1),
        (notes_x1 + notes_w, notes_y1 + notes_h), (notes_x1, notes_y1 + notes_h),
        (notes_x1, notes_y1)
    ], close=True, dxfattribs={'layer': 'KOP_CATATAN_TEKNIS', 'color': 7})
    layout.add_line((notes_x1, notes_y1 + notes_h - 6.0), (notes_x1 + notes_w, notes_y1 + notes_h - 6.0),
                    dxfattribs={'layer': 'KOP_CATATAN_TEKNIS', 'color': 7})
    layout.add_text("CATATAN UMUM PERENCANAAN JALAN :",
                    dxfattribs={'layer': 'KOP_CATATAN_TEKNIS', 'color': 3, 'height': 2.0}
                    ).set_placement((notes_x1 + 3.0, notes_y1 + notes_h - 3.2), align=TextEntityAlignment.MIDDLE_LEFT)

    notes = [
        "1. SEMUA UKURAN DINYATAKAN DALAM MILIMETER (mm), KECUALI DISEBUTKAN LAIN.",
        "2. ELEVASI DAN KOORDINAT MENGACU PADA SISTEM UTM WGS-84 ZONA 48S.",
        "3. TITIK BENCHMARK (BM) HARUS DICEK KEMBALI SEBELUM PEKERJAAN DIMULAI.",
        "4. KEMIRINGAN MELINTANG STANDAR (CROSSFALL) BADAN JALAN = 2.00 %.",
        "5. KEMIRINGAN BAHU JALAN (SHOULDER) = 4.00 %.",
        "6. JIKA TERDAPAT PERBEDAAN GAMBAR DENGAN LAPANGAN, SEGERA LAPORKAN DIREKSI.",
        "7. PERENCANAAN MENGACU PADA PEDOMAN DESAIN GEOMETRIK JALAN PUPR NO. 13/PRT/M/2011."
    ]
    for idx, text in enumerate(notes):
        layout.add_text(text, dxfattribs={'layer': 'KOP_CATATAN_TEKNIS', 'color': 7, 'height': 1.4}
                        ).set_placement((notes_x1 + 3.0, notes_y1 + notes_h - 10.0 - (idx * 5.2)),
                                        align=TextEntityAlignment.MIDDLE_LEFT)

    return layout


def build_layout_horizontal(doc, layout_name, info, target_center=(0, 0), target_height=232.0):
    """
    Membangun KOP PUPR Standar A3 Landscape Horisontal (Etiket Bawah) di Paper Space
    Sangat ideal untuk Potongan Melintang (Cross Section) & Detail Khusus.
    - Ukuran Kertas: 420 x 297 mm
    - Baris KOP: Y = 10 s/d 55 mm (Tinggi = 45 mm, Lebar = 390 mm dari X: 20 s/d 410)
    - Area Gambar / Viewport: X = 20 s/d 410 mm, Y = 55 s/d 287 mm (Lebar = 390 mm, Tinggi = 232 mm)
    """
    if layout_name in doc.layouts:
        layout = doc.layout(layout_name)
    else:
        layout = doc.layouts.new(layout_name)

    layout.page_setup(
        size=(420.0, 297.0),
        margins=(0.0, 0.0, 0.0, 0.0),
        units='mm',
        device='DWG To PDF.pc3'
    )

    W, H = 420.0, 297.0
    M_LEFT = 20.0
    M_RIGHT = 10.0
    M_TOP = 10.0
    M_BOT = 10.0

    X_MIN = M_LEFT       # 20.0 mm
    X_MAX = W - M_RIGHT  # 410.0 mm
    Y_MIN = M_BOT        # 10.0 mm
    Y_MAX = H - M_TOP    # 287.0 mm
    KOP_Y = 55.0         # Garis batas etiket bawah

    # 1. Border Kertas & Crop marks
    layout.add_lwpolyline([(0, 0), (W, 0), (W, H), (0, H), (0, 0)], close=True,
                          dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 8})
    crop_len = 6.0
    for cx, cy, dx, dy in [(0, 0, 1, 1), (W, 0, -1, 1), (W, H, -1, -1), (0, H, 1, -1)]:
        layout.add_line((cx, cy + dy * 2), (cx + dx * crop_len, cy + dy * 2),
                        dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 8})
        layout.add_line((cx + dx * 2, cy), (cx + dx * 2, cy + dy * crop_len),
                        dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 8})

    # 2. Border Gambar Utama (Tebal 0.70 mm)
    layout.add_lwpolyline([
        (X_MIN, Y_MIN), (X_MAX, Y_MIN), (X_MAX, Y_MAX), (X_MIN, Y_MAX), (X_MIN, Y_MIN)
    ], close=True, dxfattribs={'layer': 'KOP_BORDER_UTAMA', 'color': 7})

    # Garis Pembagi Horizontal antara Area Gambar dan KOP Bawah
    layout.add_line((X_MIN, KOP_Y), (X_MAX, KOP_Y), dxfattribs={'layer': 'KOP_BORDER_UTAMA', 'color': 7})

    # 3. Objek VIEWPORT (Area Gambar Atas)
    vp_w = X_MAX - X_MIN # 390.0 mm
    vp_h = Y_MAX - KOP_Y # 232.0 mm
    vp_cx = (X_MIN + X_MAX) / 2.0 # 215.0 mm
    vp_cy = (KOP_Y + Y_MAX) / 2.0 # 171.0 mm

    layout.add_viewport(
        center=(vp_cx, vp_cy),
        size=(vp_w, vp_h),
        view_center_point=target_center,
        view_height=target_height,
        status=2, # Aktif
        dxfattribs={'layer': 'KOP_VIEWPORT'}
    )

    # 4. Kolom Pembagi Etiket Bawah (X: 20 -> 410, Y: 10 -> 55)
    # Kolom 1 (X: 20 -> 80)   : Logo & Instansi PUPR (Lebar 60mm)
    # Kolom 2 (X: 80 -> 185)  : Kegiatan & Paket Pekerjaan (Lebar 105mm)
    # Kolom 3 (X: 185 -> 290) : Konsultan Perencana & Tanda Tangan (Lebar 105mm)
    # Kolom 4 (X: 290 -> 345) : Disetujui PPK (Lebar 55mm)
    # Kolom 5 (X: 345 -> 410) : Judul Gambar & No Lembar (Lebar 65mm)
    col_x = [80.0, 185.0, 290.0, 345.0]
    for x in col_x:
        layout.add_line((x, Y_MIN), (x, KOP_Y), dxfattribs={'layer': 'KOP_GARIS_TABEL', 'color': 7})

    # --- KOLOM 1: LOGO & INSTANSI PUPR (20 -> 80) ---
    create_pupr_logo(layout, 50.0, 38.0, radius=8.0)
    layout.add_text(info.get('ministry', "KEMENTERIAN PEKERJAAN UMUM"),
                    dxfattribs={'layer': 'KOP_TEKS_INSTANSI', 'color': 2, 'height': 1.6}
                    ).set_placement((50.0, 26.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('sub_ministry', "DAN PERUMAHAN RAKYAT"),
                    dxfattribs={'layer': 'KOP_TEKS_INSTANSI', 'color': 2, 'height': 1.6}
                    ).set_placement((50.0, 23.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('directorate', "DIREKTORAT JENDERAL BINA MARGA"),
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                    ).set_placement((50.0, 19.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('office', "BBPJN DKI JAKARTA - JAWA BARAT"),
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.3}
                    ).set_placement((50.0, 16.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # --- KOLOM 2: KEGIATAN & PAKET PEKERJAAN (80 -> 185) ---
    layout.add_text("KEGIATAN :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                    ).set_placement((82.5, 51.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(info.get('activity', "PEMBANGUNAN & PENINGKATAN STRUKTUR JALAN"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.6}
                    ).set_placement((82.5, 47.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_line((80.0, 44.0), (185.0, 44.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 8})
    layout.add_text("NAMA PAKET PEKERJAAN :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                    ).set_placement((82.5, 40.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(info.get('project', "PENINGKATAN STRUKTUR JALAN"),
                    dxfattribs={'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 2.1}
                    ).set_placement((132.5, 34.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('section', "RUAS JALAN CILAMAYA"),
                    dxfattribs={'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 2.1}
                    ).set_placement((132.5, 30.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_line((80.0, 26.5), (185.0, 26.5), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 8})
    layout.add_text(f"LOKASI : {info.get('location', 'KAB. KARAWANG - JAWA BARAT')}",
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                    ).set_placement((82.5, 22.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text("SUMBER DANA : APBN TAHUN ANGGARAN 2026",
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                    ).set_placement((82.5, 17.5), align=TextEntityAlignment.MIDDLE_LEFT)

    # --- KOLOM 3: KONSULTAN PERENCANA (185 -> 290) ---
    layout.add_text("KONSULTAN PERENCANA :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                    ).set_placement((187.5, 51.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(info.get('consultant', "PT. KONSULTAN REKAYASA TEKNIK"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.8}
                    ).set_placement((237.5, 46.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_line((185.0, 42.0), (290.0, 42.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    layout.add_text(f"Team Leader : {info.get('team_leader', 'Ir. M. Ridwan, MT.')}",
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                    ).set_placement((187.5, 36.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(f"Highway Eng. : {info.get('highway_eng', 'Dedi Suryadi, ST.')}",
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                    ).set_placement((187.5, 29.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(f"Surveyor/CAD : {info.get('surveyor', 'Putri, ST.')} / {info.get('drafter', 'Rian, A.Md.')}",
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.4}
                    ).set_placement((187.5, 20.0), align=TextEntityAlignment.MIDDLE_LEFT)

    # --- KOLOM 4: DISETUJUI DIREKSI / PPK (290 -> 345) ---
    layout.add_text("DISETUJUI OLEH :", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.5}
                    ).set_placement((317.5, 49.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("PEJABAT PEMBUAT KOMITMEN", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.3}
                    ).set_placement((317.5, 44.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('ppk_name', "H. HENDRA WIJAYA, ST."),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.6}
                    ).set_placement((317.5, 23.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(f"NIP. {info.get('ppk_nip', '19820514 200801 1 005')}",
                    dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.3}
                    ).set_placement((317.5, 17.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # --- KOLOM 5: JUDUL GAMBAR, SKALA & LEMBAR (345 -> 410) ---
    layout.add_line((345.0, 34.0), (410.0, 34.0), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    layout.add_text(info.get('title', "POTONGAN MELINTANG (CROSS SECTION)"),
                    dxfattribs={'layer': 'KOP_TEKS_JUDUL', 'color': 2, 'height': 1.8}
                    ).set_placement((377.5, 46.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(f"SKALA {info.get('scale_cross', '1 : 100')}",
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.8}
                    ).set_placement((377.5, 39.5), align=TextEntityAlignment.MIDDLE_CENTER)

    layout.add_line((380.0, 34.0), (380.0, Y_MIN), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    layout.add_text("KODE GAMBAR", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.3}
                    ).set_placement((362.5, 29.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('drawing_code', "DED-BM-CS-01"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 4, 'height': 1.7}
                    ).set_placement((362.5, 20.0), align=TextEntityAlignment.MIDDLE_CENTER)

    layout.add_text("LEMBAR KE", dxfattribs={'layer': 'KOP_TEKS_LABEL', 'color': 7, 'height': 1.3}
                    ).set_placement((395.0, 29.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(info.get('sheet_no', "01 / 20"),
                    dxfattribs={'layer': 'KOP_TEKS_NOMOR', 'color': 2, 'height': 3.5}
                    ).set_placement((395.0, 20.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # Simbol Utara & Skala Grafis di pojok kanan atas area gambar
    create_north_arrow(layout, 385.0, 255.0, size=22.0)
    create_scale_bar(layout, 360.0, 225.0, length=35.0, divisions=4)

    return layout


def convert_to_dwg(dxf_path, dwg_path):
    """Mengonversi berkas DXF ke DWG menggunakan dxf2dwg.exe (LibreDWG) jika ada."""
    exe_name = 'dxf2dwg.exe' if sys.platform == 'win32' else 'dxf2dwg'
    local_exe = os.path.join(os.path.dirname(os.path.abspath(__file__)), exe_name)

    cmd_exe = None
    if os.path.exists(local_exe):
        cmd_exe = local_exe
    else:
        # Coba cek PATH
        import shutil
        if shutil.which(exe_name):
            cmd_exe = exe_name

    if not cmd_exe:
        return False, "dxf2dwg.exe tidak ditemukan di direktori lokal atau PATH."

    try:
        cmd = [cmd_exe, '-y', '-o', dwg_path, dxf_path]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors='ignore')
        if os.path.exists(dwg_path) and os.path.getsize(dwg_path) > 0:
            return True, f"DWG berhasil dibuat: {dwg_path}"
        else:
            return False, f"Gagal membuat DWG. Log: {proc.stderr[:300]}"
    except Exception as e:
        return False, str(e)


def main():
    parser = argparse.ArgumentParser(
        description="Generator KOP Gambar Standar PUPR di Layout (AutoCAD Paper Space A3 Landscape)",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument('--input', '-i', type=str, default=None,
                        help="Berkas DXF/DWG asal (opsional) untuk disisipkan Layout KOP")
    parser.add_argument('--output', '-o', type=str, default='KOP_STANDAR_A3_LAYOUT',
                        help="Nama berkas output (tanpa ekstensi atau dengan .dxf/.dwg)")
    parser.add_argument('--type', '-t', choices=['all', 'vertical', 'horizontal'], default='all',
                        help="Jenis KOP yang dibuat: all (keduanya), vertical (kanan), horizontal (bawah)")
    parser.add_argument('--project', type=str, default="PENINGKATAN STRUKTUR JALAN",
                        help="Nama Paket Pekerjaan")
    parser.add_argument('--section', type=str, default="RUAS JALAN CILAMAYA",
                        help="Nama Ruas Jalan")
    parser.add_argument('--location', type=str, default="KAB. KARAWANG - JAWA BARAT",
                        help="Lokasi Pekerjaan")
    parser.add_argument('--title', type=str, default="DENAH & PROFIL MEMANJANG (PLAN & PROFILE)",
                        help="Judul Gambar")
    parser.add_argument('--scale_h', type=str, default="1 : 1.000",
                        help="Skala Horisontal")
    parser.add_argument('--scale_v', type=str, default="1 : 100",
                        help="Skala Vertikal")
    parser.add_argument('--scale_cross', type=str, default="1 : 100",
                        help="Skala Cross Section")
    parser.add_argument('--sheet', type=str, default="01 / 15",
                        help="Nomor Lembar")
    parser.add_argument('--code', type=str, default="DED-BM-RUAS-01",
                        help="Kode Gambar")
    parser.add_argument('--surveyor', type=str, default="Putri, ST.",
                        help="Nama Surveyor / Geodetic")
    parser.add_argument('--drafter', type=str, default="Rian Pratama, A.Md.",
                        help="Nama CAD Drafter")
    parser.add_argument('--ppk', type=str, default="H. HENDRA WIJAYA, ST., M.Eng.",
                        help="Nama Pejabat Pembuat Komitmen (PPK)")
    parser.add_argument('--nip_ppk', type=str, default="19820514 200801 1 005",
                        help="NIP PPK")
    parser.add_argument('--kasatker', type=str, default="Ir. AGUS SETIAWAN, MT.",
                        help="Nama Kasatker")
    parser.add_argument('--nip_kasatker', type=str, default="19750820 200212 1 002",
                        help="NIP Kasatker")

    args = parser.parse_args()

    # Siapkan Dokumen DXF R2018
    if args.input and os.path.exists(args.input) and args.input.lower().endswith('.dxf'):
        print(f"[*] Memuat berkas DXF asal: {args.input}")
        doc = ezdxf.readfile(args.input)
    else:
        print("[*] Membuat berkas AutoCAD baru (Standar R2018)")
        doc = ezdxf.new('R2018', setup=True)

    # Pastikan layer terdaftar
    setup_layers(doc)

    # Deteksi Extents Model Space untuk kalkulasi Viewport
    msp = doc.modelspace()
    model_box = bbox.extents(msp)
    if model_box.has_data:
        target_center = (model_box.center.x, model_box.center.y)
        target_height_v = max(model_box.size.y, model_box.size.x * (277.0 / 290.0)) * 1.15
        target_height_h = max(model_box.size.y, model_box.size.x * (232.0 / 390.0)) * 1.15
        print(f"[*] Model Space terdeteksi! Center: {target_center}, Box Size: {model_box.size}")
    else:
        # Jika Model Space kosong, buat contoh referensi as jalan dan titik koordinat
        target_center = (0.0, 0.0)
        target_height_v = 277.0
        target_height_h = 232.0

        # Tambahkan panduan visual ringan di Model Space
        msp.add_text("MODEL SPACE - GAMBAR DESAIN / PENAMPANG JALAN ANDA DITEMPATKAN DI SINI",
                     dxfattribs={'color': 7, 'height': 5.0}).set_placement((0, 10), align=TextEntityAlignment.MIDDLE_CENTER)
        msp.add_circle((0, 0), 20.0, dxfattribs={'color': 1})
        msp.add_line((-30, 0), (30, 0), dxfattribs={'color': 1})
        msp.add_line((0, -30), (0, 30), dxfattribs={'color': 1})

    info = {
        'project': args.project,
        'section': args.section,
        'location': args.location,
        'title': args.title,
        'scale_h': args.scale_h,
        'scale_v': args.scale_v,
        'scale_cross': args.scale_cross,
        'sheet_no': args.sheet,
        'drawing_code': args.code,
        'surveyor': args.surveyor,
        'drafter': args.drafter,
        'ppk_name': args.ppk,
        'ppk_nip': args.nip_ppk,
        'kasatker_name': args.kasatker,
        'kasatker_nip': args.nip_kasatker,
        'date': datetime.now().strftime("%B %Y").upper(),
    }

    # Atur Tab Layout
    if args.type in ('all', 'vertical'):
        v_name = 'Layout_A3_Vertikal'
        if 'Layout1' in doc.layouts:
            doc.layouts.rename('Layout1', v_name)
        print(f"[*] Membangun Layout Vertikal: {v_name}")
        build_layout_vertical(doc, v_name, info, target_center, target_height_v)

    if args.type in ('all', 'horizontal'):
        h_name = 'Layout_A3_Horizontal'
        print(f"[*] Membangun Layout Horisontal: {h_name}")
        build_layout_horizontal(doc, h_name, info, target_center, target_height_h)

    # Set Layout Aktif
    active_name = 'Layout_A3_Vertikal' if args.type != 'horizontal' else 'Layout_A3_Horizontal'
    if active_name in doc.layouts:
        doc.layouts.set_active_layout(active_name)

    # Simpan Berkas DXF
    base_name = os.path.splitext(args.output)[0]
    out_dxf = f"{base_name}.dxf"
    out_dwg = f"{base_name}.dwg"

    doc.saveas(out_dxf)
    print(f"\n[SUKSES] Berkas DXF berhasil dibuat: {out_dxf}")

    # Konversi ke DWG
    ok, msg = convert_to_dwg(out_dxf, out_dwg)
    if ok:
        print(f"[SUKSES] {msg}")
    else:
        print(f"[INFO] {msg}")

    print("\n" + "=" * 65)
    print(" CARA PENGGUNAAN DI AUTOCAD / CIVIL 3D:")
    print(" 1. Buka AutoCAD atau Civil 3D.")
    print(f" 2. Buka file: '{out_dwg}' (atau '{out_dxf}').")
    print(" 3. AutoCAD akan langsung membuka Tab 'Layout_A3_Vertikal'.")
    print(" 4. KOP sudah terpasang presisi ukuran A3 Landscape (420 x 297 mm).")
    print(" 5. Jendela Viewport di sebelah kiri menampilkan objek dari Model Space.")
    print(" 6. Klik ganda di dalam Viewport untuk Pan / Zoom / atur skala gambar.")
    print(" 7. Klik ganda di luar Viewport (Paper Space) untuk kembali ke Layout.")
    print(" 8. Siap langsung di-Plot / Export ke PDF (Ctrl + P) skala 1:1.")
    print("=" * 65)

if __name__ == '__main__':
    main()
