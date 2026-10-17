;;; =========================================================================
;;; KOP_LAYOUT.LSP - Generator KOP Standar PUPR Karawang di Layout AutoCAD
;;; Format: KOP BAGIAN ATAS (Header Title Block) - Kertas A3 Landscape (420 x 297 mm)
;;; Standar: Dinas Pekerjaan Umum dan Penataan Ruang Pemerintah Kabupaten Karawang
;;; =========================================================================
;;; CARA PENGGUNAAN:
;;; 1. Di AutoCAD, ketik perintah: APPLOAD
;;; 2. Pilih berkas 'kop_layout.lsp' ini, lalu klik 'Load'.
;;; 3. Ketik perintah: KOPLAYOUT (atau KOPKARAWANG / KOPA3) lalu tekan ENTER.
;;; 4. Nama-nama pejabat default dikosongkan (dilengkapi garis tanda tangan)
;;;    dan dapat langsung di-klik ganda (double-click) untuk diisi nanti!
;;; =========================================================================

(vl-load-com)

(defun c:KOPA3 () (c:KOPLAYOUT))
(defun c:KOPKARAWANG () (c:KOPLAYOUT))

(defun c:KOPLAYOUT ( / *error* oldecho oldosm doc actlayout
                        v_name x_min x_max y_min y_max y_kop_bot
                        kegiatan1 kegiatan2 namagambar nohal skala lokasi1 lokasi2)

  ;; Penanganan Error & Reset variabel sistem
  (defun *error* (msg)
    (if oldecho (setvar "CMDECHO" oldecho))
    (if oldosm (setvar "OSMODE" oldosm))
    (if (not (wcmatch (strcase msg) "*BREAK*,*CANCEL*,*EXIT*"))
      (princ (strcat "\n[ERROR] " msg))
    )
    (princ)
  )

  (setq oldecho (getvar "CMDECHO"))
  (setq oldosm  (getvar "OSMODE"))
  (setvar "CMDECHO" 0)
  (setvar "OSMODE" 0)

  (princ "\n=======================================================")
  (princ "\n   GENERATOR KOP STANDAR PUPR KARAWANG DI LAYOUT A3    ")
  (princ "\n   (Format: KOP Atas / Nama Pejabat Dikosongkan)       ")
  (princ "\n=======================================================\n")

  ;; Prompt interaktif (Tekan ENTER untuk default sesuai standar Karawang)
  (setq kegiatan1 (getstring T "\nNama Kegiatan Baris 1 <PENINGKATAN JALAN KISERUT ->: "))
  (if (= kegiatan1 "") (setq kegiatan1 "PENINGKATAN JALAN KISERUT -"))

  (setq kegiatan2 (getstring T "\nNama Kegiatan Baris 2 <TIMBULJAYA>: "))
  (if (= kegiatan2 "") (setq kegiatan2 "TIMBULJAYA"))

  (setq namagambar (getstring T "\nNama Gambar <POT. MELINTANG>: "))
  (if (= namagambar "") (setq namagambar "POT. MELINTANG"))

  (setq nohal (getstring T "\nNo./Jml. Hal. <3/6>: "))
  (if (= nohal "") (setq nohal "3/6"))

  (setq skala (getstring T "\nSkala <Non Scale>: "))
  (if (= skala "") (setq skala "Non Scale"))

  (setq lokasi1 (getstring T "\nLokasi Baris 1 <Kec. Cilamaya>: "))
  (if (= lokasi1 "") (setq lokasi1 "Kec. Cilamaya"))

  (setq lokasi2 (getstring T "\nLokasi Baris 2 <Wetan>: "))
  (if (= lokasi2 "") (setq lokasi2 "Wetan"))

  ;; 1. Buat Layer-layer Standar
  (command "-LAYER" "M" "KOP_BORDER_LUAR" "C" "4" "" "LW" "0.18" "" "")
  (command "-LAYER" "M" "KOP_BORDER_UTAMA" "C" "7" "" "LW" "0.50" "" "")
  (command "-LAYER" "M" "KOP_GARIS_TABEL" "C" "7" "" "LW" "0.35" "" "")
  (command "-LAYER" "M" "KOP_GARIS_SUBTABEL" "C" "8" "" "LW" "0.18" "" "")
  (command "-LAYER" "M" "KOP_TEKS_HEADER" "C" "2" "" "")
  (command "-LAYER" "M" "KOP_TEKS_DATA" "C" "7" "" "")
  (command "-LAYER" "M" "KOP_TEKS_PEJABAT" "C" "7" "" "")
  (command "-LAYER" "M" "KOP_LOGO" "C" "2" "" "")
  ;; Layer Viewport Non-Plotting
  (command "-LAYER" "M" "KOP_VIEWPORT" "C" "4" "" "P" "N" "KOP_VIEWPORT" "")

  ;; 2. Beralih atau buat Tab Layout A3
  (setq v_name "LAYOUT_PUPR_KARAWANG_A3")
  (if (null (member v_name (layoutlist)))
    (command "LAYOUT" "N" v_name)
  )
  (setvar "CTAB" v_name)
  (setvar "TILEMODE" 0)
  (command "_PSPACE")

  ;; 3. Dimensi Kertas & KOP A3 Landscape (420 x 297 mm)
  (setq x_min 15.0
        x_max 405.0
        y_min 12.0
        y_max 285.0
        y_kop_bot 258.0)

  ;; 4. Border Luar Ganda & Border Utama
  (setvar "CLAYER" "KOP_BORDER_LUAR")
  (command "_RECTANG" '(0.0 0.0) '(420.0 297.0))
  (command "_RECTANG" '(11.0 8.0) '(409.0 289.0))

  (setvar "CLAYER" "KOP_BORDER_UTAMA")
  (command "_RECTANG" (list x_min y_min) (list x_max y_max))
  ;; Garis Pembagi Horizontal Bawah KOP (Y = 258.0)
  (command "_LINE" (list x_min y_kop_bot) (list x_max y_kop_bot) "")

  ;; 5. Pembagian 8 Kolom KOP Atas (X: 15.0 -> 405.0)
  (setvar "CLAYER" "KOP_GARIS_TABEL")
  (foreach x '(103.0 199.5 229.0 267.5 303.5 340.0 372.5)
    (command "_LINE" (list x y_kop_bot) (list x y_max) "")
  )

  ;; 6. Konten Kolom 1: Instansi & Lambang (X: 15 -> 103)
  ;; Logo Pemkab Karawang (Perisai Sederhana)
  (setvar "CLAYER" "KOP_LOGO")
  (command "_PLINE" '(19.0 277.0) '(30.0 277.0) '(30.0 272.5) '(28.5 268.3) '(24.5 265.0) '(20.5 268.3) '(19.0 272.5) "_C")
  (command "_LINE" '(24.5 268.0) '(24.5 275.0) "")
  ;; Logo PUPR (Roda Gerigi Sederhana)
  (command "_RECTANG" '(88.0 265.0) '(99.0 278.0))
  (command "_CIRCLE" '(93.5 271.5) 4.0)
  (command "_CIRCLE" '(93.5 271.5) 2.2)

  ;; Teks Instansi
  (setvar "CLAYER" "KOP_TEKS_DATA")
  (command "_TEXT" "_J" "_MC" '(59.0 280.5) 1.6 0 "PEMERINTAH KABUPATEN KARAWANG")
  (command "_TEXT" "_J" "_MC" '(59.0 275.5) 1.9 0 "DINAS PEKERJAAN UMUM DAN")
  (command "_TEXT" "_J" "_MC" '(59.0 271.0) 1.9 0 "PENATAAN RUANG")
  (command "_TEXT" "_J" "_MC" '(59.0 265.5) 1.4 0 "Jalan Dewi Sartika No.1 Karawang")

  ;; Konten Kolom 2: Nama Kegiatan (X: 103 -> 199.5, Tengah = 151.25)
  (setvar "CLAYER" "KOP_TEKS_HEADER")
  (command "_TEXT" "_J" "_MC" '(151.25 281.5) 1.6 0 "NAMA KEGIATAN :")
  (setvar "CLAYER" "KOP_TEKS_DATA")
  (command "_TEXT" "_J" "_MC" '(151.25 271.0) 2.1 0 kegiatan1)
  (command "_TEXT" "_J" "_MC" '(151.25 265.0) 2.1 0 kegiatan2)

  ;; Konten Kolom 3: Digambar (X: 199.5 -> 229, Tengah = 214.25)
  (setvar "CLAYER" "KOP_TEKS_HEADER")
  (command "_TEXT" "_J" "_MC" '(214.25 281.5) 1.5 0 "DIGAMBAR :")
  ;; Garis tanda tangan & placeholder nama
  (setvar "CLAYER" "KOP_GARIS_SUBTABEL")
  (command "_LINE" '(203.0 262.5) '(225.5 262.5) "")
  (setvar "CLAYER" "KOP_TEKS_PEJABAT")
  (command "_TEXT" "_J" "_BC" '(214.25 263.2) 1.3 0 "( .................................... )")

  ;; Konten Kolom 4: Diperiksa (X: 229 -> 267.5, Tengah = 248.25)
  (setvar "CLAYER" "KOP_TEKS_HEADER")
  (command "_TEXT" "_J" "_MC" '(248.25 281.5) 1.4 0 "DIPERIKSA :")
  (command "_TEXT" "_J" "_MC" '(248.25 277.5) 1.1 0 "KETUA TIM KERJA PADA KELOMPOK")
  (command "_TEXT" "_J" "_MC" '(248.25 275.0) 1.1 0 "SUB SUBTANSI JALAN")
  (setvar "CLAYER" "KOP_GARIS_SUBTABEL")
  (command "_LINE" '(233.0 262.5) '(263.5 262.5) "")
  (setvar "CLAYER" "KOP_TEKS_PEJABAT")
  (command "_TEXT" "_J" "_BC" '(248.25 263.2) 1.3 0 "( .................................... )")
  (command "_TEXT" "_J" "_BC" '(248.25 259.8) 1.1 0 "NIP. ................................")

  ;; Konten Kolom 5: Disetujui (X: 267.5 -> 303.5, Tengah = 285.5)
  (setvar "CLAYER" "KOP_TEKS_HEADER")
  (command "_TEXT" "_J" "_MC" '(285.5 281.5) 1.4 0 "DISETUJUI :")
  (command "_TEXT" "_J" "_MC" '(285.5 277.5) 1.1 0 "KEPALA BIDANG JALAN DAN")
  (command "_TEXT" "_J" "_MC" '(285.5 275.0) 1.1 0 "JEMBATAN")
  (setvar "CLAYER" "KOP_GARIS_SUBTABEL")
  (command "_LINE" '(271.5 262.5) '(299.5 262.5) "")
  (setvar "CLAYER" "KOP_TEKS_PEJABAT")
  (command "_TEXT" "_J" "_BC" '(285.5 263.2) 1.3 0 "( .................................... )")
  (command "_TEXT" "_J" "_BC" '(285.5 259.8) 1.1 0 "NIP. ................................")

  ;; Konten Kolom 6: Mengetahui (X: 303.5 -> 340, Tengah = 321.75)
  (setvar "CLAYER" "KOP_TEKS_HEADER")
  (command "_TEXT" "_J" "_MC" '(321.75 281.5) 1.4 0 "MENGETAHUI :")
  (command "_TEXT" "_J" "_MC" '(321.75 277.5) 1.1 0 "KEPALA DINAS PUPR")
  (command "_TEXT" "_J" "_MC" '(321.75 275.0) 1.1 0 "KAB. KARAWANG")
  (setvar "CLAYER" "KOP_GARIS_SUBTABEL")
  (command "_LINE" '(307.5 262.5) '(336.0 262.5) "")
  (setvar "CLAYER" "KOP_TEKS_PEJABAT")
  (command "_TEXT" "_J" "_BC" '(321.75 263.2) 1.3 0 "( .................................... )")
  (command "_TEXT" "_J" "_BC" '(321.75 259.8) 1.1 0 "NIP. ................................")

  ;; Konten Kolom 7: Nama Gambar (X: 340 -> 372.5, Tengah = 356.25)
  (setvar "CLAYER" "KOP_TEKS_HEADER")
  (command "_TEXT" "_J" "_MC" '(356.25 281.5) 1.4 0 "NAMA GAMBAR :")
  (setvar "CLAYER" "KOP_TEKS_DATA")
  (command "_TEXT" "_J" "_MC" '(356.25 267.0) 2.0 0 namagambar)

  ;; Konten Kolom 8: Info Lembar, Skala & Lokasi (X: 372.5 -> 405)
  (setvar "CLAYER" "KOP_GARIS_SUBTABEL")
  (command "_LINE" '(372.5 276.0) '(405.0 276.0) "")
  (command "_LINE" '(372.5 267.0) '(405.0 267.0) "")
  (setvar "CLAYER" "KOP_TEKS_DATA")
  (command "_TEXT" "_J" "_ML" '(374.5 280.5) 1.4 0 (strcat "No./Jml. Hal. : " nohal))
  (command "_TEXT" "_J" "_ML" '(374.5 271.5) 1.4 0 (strcat "Scale : " skala))
  (command "_TEXT" "_J" "_ML" '(374.5 263.5) 1.2 0 (strcat "Lokasi : " lokasi1))
  (command "_TEXT" "_J" "_ML" '(374.5 260.5) 1.2 0 (strcat "         " lokasi2))

  ;; 7. BUAT VIEWPORT AKTIF (MVIEW) DI BAWAH KOP
  ;; Area: X: 15 s/d 405 (lebar 390 mm), Y: 12 s/d 258 (tinggi 246 mm)
  (setvar "CLAYER" "KOP_VIEWPORT")
  (command "_MVIEW" (list x_min y_min) (list x_max y_kop_bot))

  ;; Aktifkan Model Space di Viewport, Zoom Extents, lalu kembali ke Layout
  (command "_MSPACE")
  (command "_ZOOM" "_E")
  (command "_PSPACE")
  (command "_ZOOM" "_E")

  ;; Kembalikan variabel sistem
  (setvar "CMDECHO" oldecho)
  (setvar "OSMODE" oldosm)

  (princ "\n=======================================================")
  (princ "\n [SUKSES] KOP PUPR Karawang (Header) Berhasil Dibuat!")
  (princ (strcat "\n Tab Layout aktif: " v_name))
  (princ "\n Nama-nama pejabat telah dikosongkan (tersedia garis tanda tangan).")
  (princ "\n Klik ganda (double-click) pada teks untuk mengisi nama/NIP kapan saja.")
  (princ "\n Siap di-plot/print (Ctrl+P) skala 1:1 Kertas A3.")
  (princ "\n=======================================================\n")
  (princ)
)

(princ "\n[KOP_LAYOUT.LSP] Siap digunakan! Ketik KOPLAYOUT atau KOPKARAWANG untuk menjalankan.")
(princ)
