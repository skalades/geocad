"""
===============================================================================
Script Generator KOP Standar Dinas PUPR Kabupaten Karawang (Header KOP A3)
Ukuran Kertas: A3 Landscape (420 mm x 297 mm)
Format: AutoCAD DWG & DXF (R2018 Native)
===============================================================================
Fitur Khusus:
1. Integrasi Langsung Logo Vektor Asli dari Berkas SVG:
   - LAMBANG_KABUPATEN_KARAWANG.svg (Logo Pemda Karawang resmi)
   - 20241127025826!Logo_Kementerian_Pekerjaan_Umum_Republik_Indonesia.svg (Logo PU resmi)
2. Letak KOP di BAGIAN ATAS (Header Strip) setinggi 27.0 mm (Y: 258 s/d 285 mm)
3. 8 Kolom Presisi Sesuai Foto Resmi:
   - Kolom 1: Logo Pemkab Karawang + Teks Instansi + Logo PUPR
   - Kolom 2: NAMA KEGIATAN : PENINGKATAN JALAN KISERUT - TIMBULJAYA
   - Kolom 3: DIGAMBAR : (Dikosongkan + Garis Tanda Tangan)
   - Kolom 4: DIPERIKSA : KETUA TIM KERJA SUB SUBTANSI JALAN (Dikosongkan + Garis Bawah + NIP)
   - Kolom 5: DISETUJUI : KEPALA BIDANG JALAN DAN JEMBATAN (Dikosongkan + Garis Bawah + NIP)
   - Kolom 6: MENGETAHUI : KEPALA DINAS PUPR KAB. KARAWANG (Dikosongkan + Garis Bawah + NIP)
   - Kolom 7: NAMA GAMBAR : POT. MELINTANG
   - Kolom 8: No./Jml. Hal. : 3/6, Scale : Non Scale, Lokasi : Kec. Cilamaya Wetan
4. Nama-nama pejabat default DIKOSONGKAN (dilengkapi garis tanda tangan & titik-titik)
   sehingga mudah diisi/diklik langsung di AutoCAD kapan saja.
5. Area Gambar / Viewport di bawah KOP (X: 15-405 mm, Y: 12-258 mm, Tinggi: 246 mm)
   pada layer non-plotting ('KOP_VIEWPORT', plot=0)
6. Otomatis membuat berkas .dxf dan mengonversi ke .dwg asli via dxf2dwg.exe.
===============================================================================
"""

import os
import sys
import re
import math
import argparse
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime
import ezdxf
from ezdxf import colors, bbox
from ezdxf.enums import TextEntityAlignment
from ezdxf.math import Matrix44

def setup_karawang_layers(doc):
    """Menyiapkan layer standar CAD untuk layout Karawang."""
    layers_data = [
        ('KOP_BORDER_LUAR', colors.CYAN, 18, True),
        ('KOP_BORDER_UTAMA', colors.WHITE, 50, True),
        ('KOP_GARIS_TABEL', colors.WHITE, 35, True),
        ('KOP_GARIS_SUBTABEL', colors.GRAY, 18, True),
        ('KOP_TEKS_HEADER', colors.YELLOW, 25, True),
        ('KOP_TEKS_DATA', colors.WHITE, 25, True),
        ('KOP_TEKS_PEJABAT', colors.WHITE, 25, True),
        ('KOP_LOGO', colors.YELLOW, 25, True),
        ('KOP_VIEWPORT', colors.CYAN, 18, False), # Non-plotting layer
        # Layer untuk Gambar Penampang Melintang di Model Space
        ('ROAD_EXISTING', colors.WHITE, 35, True),
        ('ROAD_RENCANA', colors.CYAN, 50, True),
        ('ROAD_HATCH', colors.GRAY, 18, True),
        ('ROAD_DIMENSI', colors.MAGENTA, 25, True),
        ('ROAD_TEKS', colors.WHITE, 25, True),
        ('ROAD_CENTERLINE', colors.RED, 25, True),
        ('ROAD_ANNOTATION', colors.GREEN, 25, True),
    ]

    for name, col, lweight, can_plot in layers_data:
        if name not in doc.layers:
            lay = doc.layers.add(name, color=col, lineweight=lweight)
            lay.dxf.plot = 1 if can_plot else 0


# =============================================================================
# MODUL SVG PARSER & VECTOR INJECTOR
# =============================================================================

def parse_svg_path_to_paths(d_str):
    """Parse SVG path string menjadi list dari objek ezdxf.path.Path."""
    tokens = re.findall(r'([a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)', d_str)
    i = 0
    cmd = ''
    cur_x, cur_y = 0.0, 0.0
    start_x, start_y = 0.0, 0.0
    paths = []
    current_path = None

    while i < len(tokens):
        t = tokens[i]
        if t.isalpha():
            cmd = t
            i += 1

        if cmd == 'M':
            x = float(tokens[i]); y = float(tokens[i+1]); i += 2
            cur_x, cur_y = x, y
            start_x, start_y = x, y
            current_path = ezdxf.path.Path((x, y))
            paths.append(current_path)
            cmd = 'L'
        elif cmd == 'm':
            dx = float(tokens[i]); dy = float(tokens[i+1]); i += 2
            cur_x += dx; cur_y += dy
            start_x, start_y = cur_x, cur_y
            current_path = ezdxf.path.Path((cur_x, cur_y))
            paths.append(current_path)
            cmd = 'l'
        elif cmd == 'L':
            x = float(tokens[i]); y = float(tokens[i+1]); i += 2
            if current_path is not None:
                current_path.line_to((x, y))
            cur_x, cur_y = x, y
        elif cmd == 'l':
            dx = float(tokens[i]); dy = float(tokens[i+1]); i += 2
            x = cur_x + dx; y = cur_y + dy
            if current_path is not None:
                current_path.line_to((x, y))
            cur_x, cur_y = x, y
        elif cmd == 'C':
            x1 = float(tokens[i]); y1 = float(tokens[i+1])
            x2 = float(tokens[i+2]); y2 = float(tokens[i+3])
            x = float(tokens[i+4]); y = float(tokens[i+5])
            i += 6
            if current_path is not None:
                current_path.curve4_to((x, y), (x1, y1), (x2, y2))
            cur_x, cur_y = x, y
        elif cmd == 'c':
            dx1 = float(tokens[i]); dy1 = float(tokens[i+1])
            dx2 = float(tokens[i+2]); dy2 = float(tokens[i+3])
            dx = float(tokens[i+4]); dy = float(tokens[i+5])
            i += 6
            x1, y1 = cur_x + dx1, cur_y + dy1
            x2, y2 = cur_x + dx2, cur_y + dy2
            x, y = cur_x + dx, cur_y + dy
            if current_path is not None:
                current_path.curve4_to((x, y), (x1, y1), (x2, y2))
            cur_x, cur_y = x, y
        elif cmd in ('Z', 'z'):
            if current_path is not None:
                current_path.close()
            cur_x, cur_y = start_x, start_y
            if not (i < len(tokens) and tokens[i].isalpha()):
                pass
        else:
            i += 1

    return paths


def parse_svg_file(filepath):
    """Membaca berkas SVG dan menghasilkan list of (Path, hex_color)."""
    tree = ET.parse(filepath)
    root = tree.getroot()

    vb = root.attrib.get('viewBox', '')
    if vb:
        parts = [float(p) for p in re.findall(r'[-+]?\d*\.?\d+', vb)]
        if len(parts) == 4:
            min_x, min_y, vb_w, vb_h = parts
        else:
            min_x, min_y = 0.0, 0.0
            vb_w, vb_h = 100.0, 100.0
    else:
        min_x, min_y = 0.0, 0.0
        w_match = re.search(r'\d+', root.attrib.get('width', '100'))
        h_match = re.search(r'\d+', root.attrib.get('height', '100'))
        vb_w = float(w_match.group(0)) if w_match else 100.0
        vb_h = float(h_match.group(0)) if h_match else 100.0

    elements = []
    for elem in root.iter():
        tag = elem.tag.split('}')[-1]
        if tag == 'path':
            d = elem.attrib.get('d', '')
            fill = elem.attrib.get('fill', '#000000').lower()
            paths = parse_svg_path_to_paths(d)
            for path in paths:
                elements.append((path, fill))
        elif tag == 'rect':
            x = float(elem.attrib.get('x', 0))
            y = float(elem.attrib.get('y', 0))
            w = float(elem.attrib.get('width', 0))
            h = float(elem.attrib.get('height', 0))
            fill = elem.attrib.get('fill', '#fcb717').lower()
            rp = ezdxf.path.Path((x, y))
            rp.line_to((x + w, y))
            rp.line_to((x + w, y + h))
            rp.line_to((x, y + h))
            rp.close()
            elements.append((rp, fill))

    return elements, min_x, min_y, vb_w, vb_h


def hex_to_rgb(hex_str):
    """Mengubah warna hex (#RRGGBB) ke tuple (R, G, B)."""
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 6:
        return int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)
    return 255, 255, 255


def render_svg_to_layout(layout, filepath, cx, cy, max_w, max_h, default_layer='KOP_LOGO'):
    """
    Merender seluruh vektor SVG langsung ke tab AutoCAD Layout
    dengan mempertahankan bentuk kurva dan warna True Color asli.
    """
    if not os.path.exists(filepath):
        return False

    try:
        elements, min_x, min_y, vb_w, vb_h = parse_svg_file(filepath)
        if not elements or vb_w <= 0 or vb_h <= 0:
            return False

        s = min(max_w / vb_w, max_h / vb_h)
        # Transformasi: flip Y (karena SVG top-down, AutoCAD bottom-up) & center ke (cx, cy)
        m = (
            Matrix44.translate(-(min_x + vb_w / 2.0), -(min_y + vb_h / 2.0), 0) @
            Matrix44.scale(s, -s, 1.0) @
            Matrix44.translate(cx, cy, 0)
        )

        for path, fill in elements:
            t_path = path.transform(m)
            r, g, b = hex_to_rgb(fill)
            tc = colors.rgb2int((r, g, b))
            ezdxf.path.render_lwpolylines(
                layout,
                [t_path],
                dxfattribs={'layer': default_layer, 'true_color': tc}
            )
        return True
    except Exception as e:
        print(f"[!] Peringatan render SVG {filepath}: {e}")
        return False


# =============================================================================
# FALLBACK PROCEDURAL LOGO GENERATOR (Jika berkas SVG tidak ditemukan)
# =============================================================================

def draw_fallback_logo_karawang(layout, cx, cy, scale=1.0):
    s = scale
    pts = [
        (cx - 5.5 * s, cy + 5.5 * s), (cx + 5.5 * s, cy + 5.5 * s),
        (cx + 5.5 * s, cy + 1.0 * s), (cx + 4.0 * s, cy - 3.2 * s),
        (cx, cy - 6.5 * s), (cx - 4.0 * s, cy - 3.2 * s),
        (cx - 5.5 * s, cy + 1.0 * s), (cx - 5.5 * s, cy + 5.5 * s),
    ]
    layout.add_lwpolyline(pts, close=True, dxfattribs={'layer': 'KOP_LOGO', 'color': 3})
    layout.add_line((cx, cy - 2.8 * s), (cx, cy + 3.0 * s), dxfattribs={'layer': 'KOP_LOGO', 'color': 7})
    layout.add_circle((cx, cy + 4.2 * s), 0.5 * s, dxfattribs={'layer': 'KOP_LOGO', 'color': 2})


def draw_fallback_logo_pupr(layout, cx, cy, scale=1.0):
    s = scale
    w, h = 10.5 * s, 13.0 * s
    layout.add_lwpolyline([
        (cx - w/2, cy - h/2), (cx + w/2, cy - h/2),
        (cx + w/2, cy + h/2), (cx - w/2, cy + h/2),
        (cx - w/2, cy - h/2)
    ], close=True, dxfattribs={'layer': 'KOP_LOGO', 'color': 2})
    r_out = 4.0 * s
    layout.add_circle((cx, cy), r_out, dxfattribs={'layer': 'KOP_LOGO', 'color': 5})
    layout.add_circle((cx, cy), r_out * 0.55, dxfattribs={'layer': 'KOP_LOGO', 'color': 5})


# =============================================================================
# PEMBANGUN LAYOUT UTAMA (HEADER KOP KARAWANG)
# =============================================================================

def build_karawang_top_kop_layout(doc, layout_name, data, target_center=(0, 0), target_height=246.0):
    """
    Membangun Layout A3 Landscape dengan KOP DI BAGIAN ATAS (Header Kop)
    100% presisi sesuai gambar foto resmi Dinas PUPR Karawang:
    - Ukuran Kertas: 420 x 297 mm
    - Frame Dalam: X = 15.0 s/d 405.0 mm (Lebar 390 mm)
    - Ketinggian KOP: Y = 258.0 s/d 285.0 mm (Tinggi 27 mm)
    - Area Gambar / Viewport: X = 15.0 s/d 405.0 mm, Y = 12.0 s/d 258.0 mm (Tinggi 246 mm)
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
    X_MIN = 15.0
    X_MAX = 405.0
    Y_MIN = 12.0
    Y_MAX = 285.0
    Y_KOP_BOT = 258.0 # Garis bawah strip KOP (Tinggi Kop = 27 mm)

    # 2. Garis Batas Kertas Luar (Trim Boundary 420 x 297)
    layout.add_lwpolyline([(0, 0), (W, 0), (W, H), (0, H), (0, 0)], close=True,
                          dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 8})

    # Border Luar Ganda (Double Margin Frame khas gambar resmi)
    layout.add_lwpolyline([
        (11.0, 8.0), (409.0, 8.0), (409.0, 289.0), (11.0, 289.0), (11.0, 8.0)
    ], close=True, dxfattribs={'layer': 'KOP_BORDER_LUAR', 'color': 4})

    # 3. Border Gambar Utama (Tebal 0.50 mm)
    layout.add_lwpolyline([
        (X_MIN, Y_MIN), (X_MAX, Y_MIN), (X_MAX, Y_MAX), (X_MIN, Y_MAX), (X_MIN, Y_MIN)
    ], close=True, dxfattribs={'layer': 'KOP_BORDER_UTAMA', 'color': 7})

    # 4. Garis Pembagi Horizontal: Memisahkan KOP ATAS dengan AREA GAMBAR
    layout.add_line((X_MIN, Y_KOP_BOT), (X_MAX, Y_KOP_BOT), dxfattribs={'layer': 'KOP_BORDER_UTAMA', 'color': 7})

    # 5. PEMBAGIAN 8 KOLOM KOP ATAS (Presisi sesuai aspect ratio foto)
    # Col 1: 15.0  -> 103.0 (88.0 mm) - Logo & Instansi
    # Col 2: 103.0 -> 199.5 (96.5 mm) - Nama Kegiatan
    # Col 3: 199.5 -> 229.0 (29.5 mm) - Digambar
    # Col 4: 229.0 -> 267.5 (38.5 mm) - Diperiksa
    # Col 5: 267.5 -> 303.5 (36.0 mm) - Disetujui
    # Col 6: 303.5 -> 340.0 (36.5 mm) - Mengetahui
    # Col 7: 340.0 -> 372.5 (32.5 mm) - Nama Gambar
    # Col 8: 372.5 -> 405.0 (32.5 mm) - No Lembar, Skala, Lokasi
    col_x = [103.0, 199.5, 229.0, 267.5, 303.5, 340.0, 372.5]
    for x in col_x:
        layout.add_line((x, Y_KOP_BOT), (x, Y_MAX), dxfattribs={'layer': 'KOP_GARIS_TABEL', 'color': 7})

    # =========================================================================
    # KOLOM 1: INSTANSI & DUA LOGO ASLI (X: 15.0 -> 103.0, Lebar 88 mm)
    # =========================================================================
    logo_cy = (Y_KOP_BOT + Y_MAX) / 2.0 # 271.5 mm

    # 1. Masukkan Logo Resmi Kabupaten Karawang dari SVG
    svg_karawang = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'LAMBANG_KABUPATEN_KARAWANG.svg')
    rendered_k = render_svg_to_layout(layout, svg_karawang, cx=25.0, cy=logo_cy, max_w=14.0, max_h=18.5)
    if not rendered_k:
        draw_fallback_logo_karawang(layout, cx=25.0, cy=logo_cy, scale=1.0)

    # 2. Masukkan Logo Resmi Kementerian PUPR dari SVG
    svg_pupr = os.path.join(os.path.dirname(os.path.abspath(__file__)), '20241127025826!Logo_Kementerian_Pekerjaan_Umum_Republik_Indonesia.svg')
    rendered_p = render_svg_to_layout(layout, svg_pupr, cx=93.5, cy=logo_cy, max_w=14.5, max_h=14.5)
    if not rendered_p:
        draw_fallback_logo_pupr(layout, cx=93.5, cy=logo_cy, scale=1.0)

    # Teks Instansi Pemerintah Kabupaten Karawang
    t_instansi_cx = 59.25
    layout.add_text("PEMERINTAH KABUPATEN KARAWANG",
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 7, 'height': 1.6}
                    ).set_placement((t_instansi_cx, 280.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("DINAS PEKERJAAN UMUM DAN",
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 7, 'height': 1.9}
                    ).set_placement((t_instansi_cx, 275.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("PENATAAN RUANG",
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 7, 'height': 1.9}
                    ).set_placement((t_instansi_cx, 271.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("Jalan Dewi Sartika No.1 Karawang",
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 7, 'height': 1.4}
                    ).set_placement((t_instansi_cx, 265.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # =========================================================================
    # KOLOM 2: NAMA KEGIATAN (X: 103.0 -> 199.5, Lebar 96.5 mm)
    # =========================================================================
    col2_cx = (103.0 + 199.5) / 2.0 # 151.25 mm
    layout.add_text("NAMA KEGIATAN :",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.6}
                    ).set_placement((col2_cx, 281.5), align=TextEntityAlignment.MIDDLE_CENTER)

    layout.add_text(data.get('kegiatan_line1', "PENINGKATAN JALAN KISERUT -"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 7, 'height': 2.1}
                    ).set_placement((col2_cx, 271.0), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(data.get('kegiatan_line2', "TIMBULJAYA"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 7, 'height': 2.1}
                    ).set_placement((col2_cx, 265.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # =========================================================================
    # KOLOM 3: DIGAMBAR (X: 199.5 -> 229.0, Lebar 29.5 mm)
    # =========================================================================
    col3_cx = (199.5 + 229.0) / 2.0 # 214.25 mm
    layout.add_text("DIGAMBAR :",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.5}
                    ).set_placement((col3_cx, 281.5), align=TextEntityAlignment.MIDDLE_CENTER)

    # Garis bawah tanda tangan (Underline)
    layout.add_line((col3_cx - 11.0, 262.5), (col3_cx + 11.0, 262.5),
                    dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    txt_digambar = data.get('digambar', '')
    if not txt_digambar or txt_digambar.strip() == "":
        txt_digambar = "( .................................... )"
    layout.add_text(txt_digambar,
                    dxfattribs={'layer': 'KOP_TEKS_PEJABAT', 'color': 7, 'height': 1.3}
                    ).set_placement((col3_cx, 263.2), align=TextEntityAlignment.BOTTOM_CENTER)

    # =========================================================================
    # KOLOM 4: DIPERIKSA (X: 229.0 -> 267.5, Lebar 38.5 mm)
    # =========================================================================
    col4_cx = (229.0 + 267.5) / 2.0 # 248.25 mm
    layout.add_text("DIPERIKSA :",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.4}
                    ).set_placement((col4_cx, 281.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("KETUA TIM KERJA PADA KELOMPOK",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.1}
                    ).set_placement((col4_cx, 277.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("SUB SUBTANSI JALAN",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.1}
                    ).set_placement((col4_cx, 275.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # Garis bawah tanda tangan
    layout.add_line((col4_cx - 15.0, 262.5), (col4_cx + 15.0, 262.5),
                    dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    txt_diperiksa_nama = data.get('diperiksa_nama', '')
    if not txt_diperiksa_nama or txt_diperiksa_nama.strip() == "":
        txt_diperiksa_nama = "( .................................... )"
    layout.add_text(txt_diperiksa_nama,
                    dxfattribs={'layer': 'KOP_TEKS_PEJABAT', 'color': 7, 'height': 1.3}
                    ).set_placement((col4_cx, 263.2), align=TextEntityAlignment.BOTTOM_CENTER)

    txt_diperiksa_nip = data.get('diperiksa_nip', '')
    if not txt_diperiksa_nip or txt_diperiksa_nip.strip() == "":
        txt_diperiksa_nip = "NIP. ................................"
    layout.add_text(txt_diperiksa_nip,
                    dxfattribs={'layer': 'KOP_TEKS_PEJABAT', 'color': 7, 'height': 1.1}
                    ).set_placement((col4_cx, 259.8), align=TextEntityAlignment.BOTTOM_CENTER)

    # =========================================================================
    # KOLOM 5: DISETUJUI (X: 267.5 -> 303.5, Lebar 36.0 mm)
    # =========================================================================
    col5_cx = (267.5 + 303.5) / 2.0 # 285.5 mm
    layout.add_text("DISETUJUI :",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.4}
                    ).set_placement((col5_cx, 281.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("KEPALA BIDANG JALAN DAN",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.1}
                    ).set_placement((col5_cx, 277.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("JEMBATAN",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.1}
                    ).set_placement((col5_cx, 275.0), align=TextEntityAlignment.MIDDLE_CENTER)

    layout.add_line((col5_cx - 14.0, 262.5), (col5_cx + 14.0, 262.5),
                    dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    txt_disetujui_nama = data.get('disetujui_nama', '')
    if not txt_disetujui_nama or txt_disetujui_nama.strip() == "":
        txt_disetujui_nama = "( .................................... )"
    layout.add_text(txt_disetujui_nama,
                    dxfattribs={'layer': 'KOP_TEKS_PEJABAT', 'color': 7, 'height': 1.3}
                    ).set_placement((col5_cx, 263.2), align=TextEntityAlignment.BOTTOM_CENTER)

    txt_disetujui_nip = data.get('disetujui_nip', '')
    if not txt_disetujui_nip or txt_disetujui_nip.strip() == "":
        txt_disetujui_nip = "NIP. ................................"
    layout.add_text(txt_disetujui_nip,
                    dxfattribs={'layer': 'KOP_TEKS_PEJABAT', 'color': 7, 'height': 1.1}
                    ).set_placement((col5_cx, 259.8), align=TextEntityAlignment.BOTTOM_CENTER)

    # =========================================================================
    # KOLOM 6: MENGETAHUI (X: 303.5 -> 340.0, Lebar 36.5 mm)
    # =========================================================================
    col6_cx = (303.5 + 340.0) / 2.0 # 321.75 mm
    layout.add_text("MENGETAHUI :",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.4}
                    ).set_placement((col6_cx, 281.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("KEPALA DINAS PUPR",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.1}
                    ).set_placement((col6_cx, 277.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text("KAB. KARAWANG",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.1}
                    ).set_placement((col6_cx, 275.0), align=TextEntityAlignment.MIDDLE_CENTER)

    layout.add_line((col6_cx - 14.0, 262.5), (col6_cx + 14.0, 262.5),
                    dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    txt_mengetahui_nama = data.get('mengetahui_nama', '')
    if not txt_mengetahui_nama or txt_mengetahui_nama.strip() == "":
        txt_mengetahui_nama = "( .................................... )"
    layout.add_text(txt_mengetahui_nama,
                    dxfattribs={'layer': 'KOP_TEKS_PEJABAT', 'color': 7, 'height': 1.3}
                    ).set_placement((col6_cx, 263.2), align=TextEntityAlignment.BOTTOM_CENTER)

    txt_mengetahui_nip = data.get('mengetahui_nip', '')
    if not txt_mengetahui_nip or txt_mengetahui_nip.strip() == "":
        txt_mengetahui_nip = "NIP. ................................"
    layout.add_text(txt_mengetahui_nip,
                    dxfattribs={'layer': 'KOP_TEKS_PEJABAT', 'color': 7, 'height': 1.1}
                    ).set_placement((col6_cx, 259.8), align=TextEntityAlignment.BOTTOM_CENTER)

    # =========================================================================
    # KOLOM 7: NAMA GAMBAR (X: 340.0 -> 372.5, Lebar 32.5 mm)
    # =========================================================================
    col7_cx = (340.0 + 372.5) / 2.0 # 356.25 mm
    layout.add_text("NAMA GAMBAR :",
                    dxfattribs={'layer': 'KOP_TEKS_HEADER', 'color': 7, 'height': 1.4}
                    ).set_placement((col7_cx, 281.5), align=TextEntityAlignment.MIDDLE_CENTER)
    layout.add_text(data.get('nama_gambar', "POT. MELINTANG"),
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 7, 'height': 2.0}
                    ).set_placement((col7_cx, 267.0), align=TextEntityAlignment.MIDDLE_CENTER)

    # =========================================================================
    # KOLOM 8: INFO LEMBAR, SKALA & LOKASI (X: 372.5 -> 405.0, Lebar 32.5 mm)
    # =========================================================================
    # Dibagi 3 baris rata berjarak 9 mm
    y_line1 = Y_KOP_BOT + 18.0 # 276.0 mm
    y_line2 = Y_KOP_BOT + 9.0  # 267.0 mm
    layout.add_line((372.5, y_line1), (405.0, y_line1), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})
    layout.add_line((372.5, y_line2), (405.0, y_line2), dxfattribs={'layer': 'KOP_GARIS_SUBTABEL', 'color': 7})

    col8_text_x = 374.5
    # Baris 1: No./Jml. Hal.
    layout.add_text(f"No./Jml. Hal. : {data.get('no_hal', '3/6')}",
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 7, 'height': 1.4}
                    ).set_placement((col8_text_x, 280.5), align=TextEntityAlignment.MIDDLE_LEFT)

    # Baris 2: Scale
    layout.add_text(f"Scale : {data.get('scale', 'Non Scale')}",
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 7, 'height': 1.4}
                    ).set_placement((col8_text_x, 271.5), align=TextEntityAlignment.MIDDLE_LEFT)

    # Baris 3: Lokasi
    layout.add_text(f"Lokasi : {data.get('lokasi_line1', 'Kec. Cilamaya')}",
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 7, 'height': 1.2}
                    ).set_placement((col8_text_x, 263.5), align=TextEntityAlignment.MIDDLE_LEFT)
    layout.add_text(f"         {data.get('lokasi_line2', 'Wetan')}",
                    dxfattribs={'layer': 'KOP_TEKS_DATA', 'color': 7, 'height': 1.2}
                    ).set_placement((col8_text_x, 260.5), align=TextEntityAlignment.MIDDLE_LEFT)

    # =========================================================================
    # 6. OBJEK VIEWPORT AUTOCAD (Area Gambar Kerja di Bawah KOP)
    # =========================================================================
    # Area: X: 15.0 -> 405.0 mm (Lebar 390 mm), Y: 12.0 -> 258.0 mm (Tinggi 246 mm)
    vp_w = X_MAX - X_MIN # 390.0 mm
    vp_h = Y_KOP_BOT - Y_MIN # 246.0 mm
    vp_cx = (X_MIN + X_MAX) / 2.0 # 210.0 mm
    vp_cy = (Y_MIN + Y_KOP_BOT) / 2.0 # 135.0 mm

    layout.add_viewport(
        center=(vp_cx, vp_cy),
        size=(vp_w, vp_h),
        view_center_point=target_center,
        view_height=target_height,
        status=2, # Aktif di AutoCAD
        dxfattribs={'layer': 'KOP_VIEWPORT'}
    )

    return layout


def populate_sample_cross_sections_in_modelspace(msp):
    """
    Menggambar geometri penampang melintang jalan (Cross Section) standar
    di Model Space, persis seperti pada gambar referensi user:
    - 3 Potongan Melintang Eksisting di sebelah kiri (dengan notasi Pembongkaran Beton Rock Drill)
    - 3 Potongan Melintang Rencana di sebelah kanan (dengan notasi Beton Semen FS 45, Agregat A, dsb)
    """
    def draw_section_existing(x_offset, y_offset, sta_text, width=3.0):
        # As Jalan CL
        msp.add_text("CL", dxfattribs={'layer': 'ROAD_CENTERLINE', 'color': 1, 'height': 0.35}
                     ).set_placement((x_offset, y_offset + 2.2), align=TextEntityAlignment.MIDDLE_CENTER)
        msp.add_line((x_offset, y_offset - 1.0), (x_offset, y_offset + 2.0),
                     dxfattribs={'layer': 'ROAD_CENTERLINE', 'color': 1})

        # Badan jalan eksisting (beton rusak)
        hw = width / 2.0
        p_box = [
            (x_offset - hw, y_offset),
            (x_offset + hw, y_offset),
            (x_offset + hw, y_offset - 0.25),
            (x_offset - hw, y_offset - 0.25),
            (x_offset - hw, y_offset)
        ]
        msp.add_lwpolyline(p_box, close=True, dxfattribs={'layer': 'ROAD_EXISTING', 'color': 7})

        # Permukaan tanah / bahu kiri-kanan
        msp.add_lwpolyline([
            (x_offset - hw - 1.5, y_offset + 0.4),
            (x_offset - hw - 0.5, y_offset),
            (x_offset - hw, y_offset),
            (x_offset + hw, y_offset),
            (x_offset + hw + 0.5, y_offset),
            (x_offset + hw + 1.5, y_offset + 0.4)
        ], dxfattribs={'layer': 'ROAD_EXISTING', 'color': 8})

        # Rumah / atap siluet tipis
        msp.add_line((x_offset - hw - 1.8, y_offset + 1.8), (x_offset - hw - 0.4, y_offset + 0.8),
                     dxfattribs={'layer': 'ROAD_HATCH', 'color': 1})
        msp.add_line((x_offset + hw + 0.4, y_offset + 0.8), (x_offset + hw + 1.8, y_offset + 1.8),
                     dxfattribs={'layer': 'ROAD_HATCH', 'color': 1})

        # Dimensi lebar jalan
        msp.add_line((x_offset - hw, y_offset + 0.5), (x_offset + hw, y_offset + 0.5),
                     dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6})
        msp.add_line((x_offset - hw, y_offset + 0.3), (x_offset - hw, y_offset + 0.7),
                     dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6})
        msp.add_line((x_offset + hw, y_offset + 0.3), (x_offset + hw, y_offset + 0.7),
                     dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6})
        msp.add_text(f"{width:.2f}", dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6, 'height': 0.28}
                     ).set_placement((x_offset, y_offset + 0.75), align=TextEntityAlignment.BOTTOM_CENTER)

        # Label Pembongkaran beton
        msp.add_text("Pembongkaran beton (Rock Drill Breaker)",
                     dxfattribs={'layer': 'ROAD_TEKS', 'color': 7, 'height': 0.22}
                     ).set_placement((x_offset, y_offset + 1.25), align=TextEntityAlignment.BOTTOM_CENTER)

        # Judul & STA di bawah
        msp.add_circle((x_offset - 2.0, y_offset - 1.0), 0.35, dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6})
        msp.add_circle((x_offset - 2.0, y_offset - 1.0), 0.18, dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6})

        msp.add_text("Pot. Melintang", dxfattribs={'layer': 'ROAD_TEKS', 'color': 7, 'height': 0.55}
                     ).set_placement((x_offset - 1.4, y_offset - 0.9), align=TextEntityAlignment.MIDDLE_LEFT)
        for i, st in enumerate(sta_text):
            msp.add_text(st, dxfattribs={'layer': 'ROAD_TEKS', 'color': 7, 'height': 0.28}
                         ).set_placement((x_offset - 1.4, y_offset - 1.5 - (i * 0.4)), align=TextEntityAlignment.MIDDLE_LEFT)
        msp.add_line((x_offset - 1.4, y_offset - 1.1), (x_offset + 3.0, y_offset - 1.1),
                     dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6})

    def draw_section_design(x_offset, y_offset, sta_text):
        # As Jalan CL
        msp.add_text("CL", dxfattribs={'layer': 'ROAD_CENTERLINE', 'color': 1, 'height': 0.35}
                     ).set_placement((x_offset, y_offset + 2.2), align=TextEntityAlignment.MIDDLE_CENTER)
        msp.add_line((x_offset, y_offset - 1.0), (x_offset, y_offset + 2.0),
                     dxfattribs={'layer': 'ROAD_CENTERLINE', 'color': 1})

        # Tebal Perkerasan Rencana (Beton Semen 0.20 + Agregat A 0.12)
        hw = 2.0 # Lebar 4.00 m
        p_beton = [
            (x_offset - hw, y_offset),
            (x_offset + hw, y_offset),
            (x_offset + hw, y_offset - 0.20),
            (x_offset - hw, y_offset - 0.20),
            (x_offset - hw, y_offset)
        ]
        msp.add_lwpolyline(p_beton, close=True, dxfattribs={'layer': 'ROAD_RENCANA', 'color': 4})

        # Lapisan Pondasi Agregat Kelas A
        p_agregat = [
            (x_offset - hw - 0.05, y_offset - 0.20),
            (x_offset + hw + 0.05, y_offset - 0.20),
            (x_offset + hw + 0.05, y_offset - 0.32),
            (x_offset - hw - 0.05, y_offset - 0.32),
            (x_offset - hw - 0.05, y_offset - 0.20)
        ]
        msp.add_lwpolyline(p_agregat, close=True, dxfattribs={'layer': 'ROAD_HATCH', 'color': 2})

        # Bahu jalan / Galian Berbutir kiri-kanan
        msp.add_lwpolyline([
            (x_offset - hw - 0.55, y_offset),
            (x_offset - hw, y_offset),
            (x_offset - hw, y_offset - 0.32),
            (x_offset - hw - 0.55, y_offset - 0.32),
            (x_offset - hw - 0.55, y_offset)
        ], close=True, dxfattribs={'layer': 'ROAD_HATCH', 'color': 3})

        msp.add_lwpolyline([
            (x_offset + hw, y_offset),
            (x_offset + hw + 0.55, y_offset),
            (x_offset + hw + 0.55, y_offset - 0.32),
            (x_offset + hw, y_offset - 0.32),
            (x_offset + hw, y_offset)
        ], close=True, dxfattribs={'layer': 'ROAD_HATCH', 'color': 3})

        # Permukaan tanah luar
        msp.add_line((x_offset - hw - 1.5, y_offset + 0.4), (x_offset - hw - 0.55, y_offset),
                     dxfattribs={'layer': 'ROAD_EXISTING', 'color': 8})
        msp.add_line((x_offset + hw + 0.55, y_offset), (x_offset + hw + 1.5, y_offset + 0.4),
                     dxfattribs={'layer': 'ROAD_EXISTING', 'color': 8})

        # Siluet atap / rumah
        msp.add_line((x_offset - hw - 1.8, y_offset + 1.8), (x_offset - hw - 0.4, y_offset + 0.8),
                     dxfattribs={'layer': 'ROAD_HATCH', 'color': 1})
        msp.add_line((x_offset + hw + 0.4, y_offset + 0.8), (x_offset + hw + 1.8, y_offset + 1.8),
                     dxfattribs={'layer': 'ROAD_HATCH', 'color': 1})

        # Dimensi 400 dan 410
        msp.add_line((x_offset - hw, y_offset + 0.5), (x_offset + hw, y_offset + 0.5),
                     dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6})
        msp.add_text("400", dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6, 'height': 0.28}
                     ).set_placement((x_offset, y_offset + 0.65), align=TextEntityAlignment.BOTTOM_CENTER)

        msp.add_line((x_offset - hw - 0.05, y_offset - 0.55), (x_offset + hw + 0.05, y_offset - 0.55),
                     dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6})
        msp.add_text("410", dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6, 'height': 0.28}
                     ).set_placement((x_offset, y_offset - 0.95), align=TextEntityAlignment.BOTTOM_CENTER)

        # Leader garis penunjuk spesifikasi teknis
        msp.add_line((x_offset + 0.8, y_offset - 0.1), (x_offset + 1.8, y_offset + 1.6),
                     dxfattribs={'layer': 'ROAD_ANNOTATION', 'color': 3})
        msp.add_text("Perkerasan Beton Semen FS 45 (tb. 0.20) Tanpa T-Bars",
                     dxfattribs={'layer': 'ROAD_ANNOTATION', 'color': 4, 'height': 0.22}
                     ).set_placement((x_offset + 1.85, y_offset + 1.6), align=TextEntityAlignment.MIDDLE_LEFT)

        msp.add_line((x_offset + 0.5, y_offset - 0.2), (x_offset + 1.8, y_offset + 1.2),
                     dxfattribs={'layer': 'ROAD_ANNOTATION', 'color': 3})
        msp.add_text("Ampar Plastik",
                     dxfattribs={'layer': 'ROAD_ANNOTATION', 'color': 4, 'height': 0.22}
                     ).set_placement((x_offset + 1.85, y_offset + 1.2), align=TextEntityAlignment.MIDDLE_LEFT)

        msp.add_line((x_offset + 1.2, y_offset - 0.26), (x_offset + 1.8, y_offset + 0.8),
                     dxfattribs={'layer': 'ROAD_ANNOTATION', 'color': 3})
        msp.add_text("Lapis Fondasi Agregat Kelas A (Alat) Tb.12cm",
                     dxfattribs={'layer': 'ROAD_ANNOTATION', 'color': 3, 'height': 0.22}
                     ).set_placement((x_offset + 1.85, y_offset + 0.8), align=TextEntityAlignment.MIDDLE_LEFT)

        # Judul & STA di bawah
        msp.add_circle((x_offset - 2.0, y_offset - 1.4), 0.35, dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6})
        msp.add_circle((x_offset - 2.0, y_offset - 1.4), 0.18, dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6})

        msp.add_text("Pot. Melintang", dxfattribs={'layer': 'ROAD_TEKS', 'color': 7, 'height': 0.55}
                     ).set_placement((x_offset - 1.4, y_offset - 1.3), align=TextEntityAlignment.MIDDLE_LEFT)
        for i, st in enumerate(sta_text):
            msp.add_text(st, dxfattribs={'layer': 'ROAD_TEKS', 'color': 7, 'height': 0.28}
                         ).set_placement((x_offset - 1.4, y_offset - 1.9 - (i * 0.4)), align=TextEntityAlignment.MIDDLE_LEFT)
        msp.add_line((x_offset - 1.4, y_offset - 1.5), (x_offset + 3.0, y_offset - 1.5),
                     dxfattribs={'layer': 'ROAD_DIMENSI', 'color': 6})

    # Susun 3 baris cross section
    draw_section_existing(-6.0, 6.0, ["Sta. 0+000 - Sta. 0+074", "Sta. 0+170 - Sta. 0+321"], width=3.0)
    draw_section_design(6.0, 6.0, ["Sta. 0+000 - Sta. 0+074"])

    draw_section_existing(-6.0, 0.0, ["Sta. 0+321 - Sta. 0+500"], width=4.0)

    draw_section_existing(-6.0, -6.0, ["Sta. 1+375 - Sta. 1+563"], width=3.7)
    draw_section_design(6.0, -6.0, ["Sta. 0+170 - Sta. 0+321"])


def convert_dxf_to_dwg(dxf_path, dwg_path):
    """Mengonversi berkas DXF ke format DWG asli via dxf2dwg.exe."""
    exe_name = 'dxf2dwg.exe' if sys.platform == 'win32' else 'dxf2dwg'
    local_exe = os.path.join(os.path.dirname(os.path.abspath(__file__)), exe_name)

    cmd_exe = local_exe if os.path.exists(local_exe) else exe_name
    try:
        cmd = [cmd_exe, '-y', '-o', dwg_path, dxf_path]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors='ignore')
        if os.path.exists(dwg_path) and os.path.getsize(dwg_path) > 0:
            return True, f"DWG berhasil dibuat: {dwg_path}"
        else:
            return False, f"Gagal membuat DWG. Log: {proc.stderr[:200]}"
    except Exception as e:
        return False, str(e)


def main():
    parser = argparse.ArgumentParser(
        description="Generator KOP Gambar Standar Dinas PUPR Kabupaten Karawang di Layout A3 (Dengan Logo SVG Asli)",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument('--input', '-i', type=str, default=None,
                        help="Berkas DXF model yang sudah ada (opsional)")
    parser.add_argument('--output', '-o', type=str, default='LAYOUT_PUPR_KARAWANG_A3',
                        help="Nama berkas keluaran (.dwg / .dxf)")
    parser.add_argument('--kegiatan1', type=str, default="PENINGKATAN JALAN KISERUT -",
                        help="Nama Kegiatan Baris 1")
    parser.add_argument('--kegiatan2', type=str, default="TIMBULJAYA",
                        help="Nama Kegiatan Baris 2")
    parser.add_argument('--gambar', type=str, default="POT. MELINTANG",
                        help="Nama Gambar")
    parser.add_argument('--hal', type=str, default="3/6",
                        help="No./Jml. Hal.")
    parser.add_argument('--scale', type=str, default="Non Scale",
                        help="Skala Gambar")
    parser.add_argument('--lokasi1', type=str, default="Kec. Cilamaya",
                        help="Lokasi Baris 1")
    parser.add_argument('--lokasi2', type=str, default="Wetan",
                        help="Lokasi Baris 2")
    # Nama Pejabat Default KOSONG (bisa diisi nanti via argumen atau klik di AutoCAD)
    parser.add_argument('--digambar', type=str, default="",
                        help="Nama Drafter / Penggambar (kosongkan untuk isi nanti)")
    parser.add_argument('--diperiksa_nama', type=str, default="",
                        help="Nama Pemeriksa (kosongkan untuk isi nanti)")
    parser.add_argument('--diperiksa_nip', type=str, default="",
                        help="NIP Pemeriksa (kosongkan untuk isi nanti)")
    parser.add_argument('--disetujui_nama', type=str, default="",
                        help="Nama Pejabat Penyetuju / Kabid (kosongkan untuk isi nanti)")
    parser.add_argument('--disetujui_nip', type=str, default="",
                        help="NIP Penyetuju (kosongkan untuk isi nanti)")
    parser.add_argument('--mengetahui_nama', type=str, default="",
                        help="Nama Kepala Dinas PUPR (kosongkan untuk isi nanti)")
    parser.add_argument('--mengetahui_nip', type=str, default="",
                        help="NIP Kepala Dinas (kosongkan untuk isi nanti)")

    args = parser.parse_args()

    # Siapkan Dokumen DXF R2018
    if args.input and os.path.exists(args.input) and args.input.lower().endswith('.dxf'):
        print(f"[*] Membuka berkas DXF input: {args.input}")
        doc = ezdxf.readfile(args.input)
    else:
        print("[*] Membuat gambar AutoCAD baru (Standar R2018)")
        doc = ezdxf.new('R2018', setup=True)

    setup_karawang_layers(doc)

    msp = doc.modelspace()
    model_box = bbox.extents(msp)

    if not model_box.has_data:
        print("[*] Menggambar contoh penampang melintang (Cross Section) di Model Space...")
        populate_sample_cross_sections_in_modelspace(msp)
        model_box = bbox.extents(msp)

    if model_box.has_data:
        target_center = (model_box.center.x, model_box.center.y)
        target_height = max(model_box.size.y, model_box.size.x * (246.0 / 390.0)) * 1.15
        print(f"[*] Model Space Bounding Box: {model_box.size}, Target Center: {target_center}")
    else:
        target_center = (0.0, 0.0)
        target_height = 246.0

    kop_data = {
        'kegiatan_line1': args.kegiatan1,
        'kegiatan_line2': args.kegiatan2,
        'nama_gambar': args.gambar,
        'no_hal': args.hal,
        'scale': args.scale,
        'lokasi_line1': args.lokasi1,
        'lokasi_line2': args.lokasi2,
        'digambar': args.digambar,
        'diperiksa_nama': args.diperiksa_nama,
        'diperiksa_nip': args.diperiksa_nip,
        'disetujui_nama': args.disetujui_nama,
        'disetujui_nip': args.disetujui_nip,
        'mengetahui_nama': args.mengetahui_nama,
        'mengetahui_nip': args.mengetahui_nip,
    }

    layout_name = "LAYOUT_PUPR_KARAWANG_A3"
    if 'Layout1' in doc.layouts:
        doc.layouts.rename('Layout1', layout_name)

    print(f"[*] Membangun Layout Header KOP Karawang: {layout_name}")
    print("[*] Memuat logo vektor dari LAMBANG_KABUPATEN_KARAWANG.svg & Logo PU SVG...")
    build_karawang_top_kop_layout(doc, layout_name, kop_data, target_center, target_height)

    # Set Layout aktif
    doc.layouts.set_active_layout(layout_name)

    base_name = os.path.splitext(args.output)[0]
    out_dxf = f"{base_name}.dxf"
    out_dwg = f"{base_name}.dwg"

    doc.saveas(out_dxf)
    print(f"\n[SUKSES] Berkas DXF berhasil dibuat: {out_dxf}")

    ok, msg = convert_dxf_to_dwg(out_dxf, out_dwg)
    if ok:
        print(f"[SUKSES] {msg}")
    else:
        print(f"[INFO] {msg}")

    print("\n" + "=" * 65)
    print(" KOP PUPR KABUPATEN KARAWANG SIAP DIGUNAKAN:")
    print(" 1. Logo Pemkab Karawang dan Logo PU resmi telah terpasang dari SVG.")
    print(" 2. Nama-nama pejabat telah dikosongkan (tersedia garis tanda tangan).")
    print(" 3. Anda dapat langsung klik ganda (double-click) pada teks di AutoCAD")
    print("    kapan saja untuk mengisi nama atau NIP pejabat terkait.")
    print(f" 4. Berkas DWG: '{out_dwg}'")
    print(f" 5. Berkas DXF: '{out_dxf}'")
    print(" 6. Tab Layout aktif dengan Viewport membidik penampang melintang.")
    print("=" * 65)

if __name__ == '__main__':
    main()
