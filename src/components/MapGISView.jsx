import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { utmToLatLng, latLngToUtm } from '../utils/coordinateTransform';
import { sortStationPointsGeometrically } from '../utils/surveyParser';
import {
  Compass,
  Moon,
  Square,
  Focus,
  Zap,
  Target,
  Crosshair,
  PenTool,
  Ruler,
  Undo2,
  Trash2,
  Check,
  X,
  PlusCircle,
  Scissors,
} from 'lucide-react';

export default function MapGISView({
  stations = [],
  allPoints = [],
  utmZone = '49S',
  selectedPointId,
  datasetId = 1,
  isActive = true,
  onSelectPoint,
  onChangePointRole,
  onEditPoint,
  onAutoFixTrajectory,
  // Multi-Segment & Intersection props:
  segments = [],
  activeSegmentId = null,
  showAllSegments = true,
  intersections = [],
  onSelectSegment,
  onAddSegment,
  onUpdateSegment,
  onGroupPointsIntoCrossSection,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);
  const drawLayersGroupRef = useRef(null);
  const tileLayersRef = useRef({});
  const lastDatasetIdRef = useRef(null);

  // Basemap state: 'osm' (bright) | 'satellite' (google hybrid) | 'esri' | 'none-light' | 'none-dark'
  const [activeBasemap, setActiveBasemap] = useState('osm');
  const [isManualPickMode, setIsManualPickMode] = useState(false);
  // Cross section display mode: 'none' (Mati / Sembunyi) | 'selected' (Hanya STA aktif) | 'all' (Semua STA)
  const [crossSectionMode, setCrossSectionMode] = useState('none');
  const isManualPickModeRef = useRef(false);

  // Manual Drawing & Measurement Tool State
  const [drawTool, setDrawTool] = useState('none'); // 'none' | 'line' | 'measure'
  const [drawPoints, setDrawnPoints] = useState([]);
  const [mousePreview, setMousePreview] = useState(null);
  const drawToolRef = useRef('none');
  const drawPointsRef = useRef([]);
  const validSegLatLngsRef = useRef([]);

  useEffect(() => {
    isManualPickModeRef.current = isManualPickMode;
  }, [isManualPickMode]);

  useEffect(() => {
    drawToolRef.current = drawTool;
    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = drawTool !== 'none' ? 'crosshair' : '';
    }
  }, [drawTool]);

  useEffect(() => {
    drawPointsRef.current = drawPoints;
  }, [drawPoints]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 22,
        maxNativeZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      });

      const googleHybrid = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        {
          maxZoom: 22,
          maxNativeZoom: 20,
          attribution: '&copy; Google Maps',
        }
      );

      const esriSatellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 22,
          maxNativeZoom: 18,
          attribution: 'Tiles &copy; Esri',
        }
      );

      const map = L.map(mapContainerRef.current, {
        center: [-6.2, 106.8],
        zoom: 15,
        layers: [osm],
      });

      layersGroupRef.current = L.featureGroup().addTo(map);
      drawLayersGroupRef.current = L.featureGroup().addTo(map);
      mapInstanceRef.current = map;
      tileLayersRef.current = { osm, googleHybrid, esriSatellite };
    }
  }, []);

  // Invalidate map size when tab becomes active
  useEffect(() => {
    if (isActive && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 50);
    }
  }, [isActive]);

  // Handle Basemap Switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const { osm, googleHybrid, esriSatellite } = tileLayersRef.current;

    // Remove active tile layers
    [osm, googleHybrid, esriSatellite].forEach((layer) => {
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    const container = mapContainerRef.current;

    if (activeBasemap === 'osm' && osm) {
      map.addLayer(osm);
      if (container) {
        container.style.backgroundColor = '#f8fafc';
        container.style.backgroundImage = 'none';
      }
    } else if (activeBasemap === 'satellite' && googleHybrid) {
      map.addLayer(googleHybrid);
      if (container) {
        container.style.backgroundColor = '#1e293b';
        container.style.backgroundImage = 'none';
      }
    } else if (activeBasemap === 'esri' && esriSatellite) {
      map.addLayer(esriSatellite);
      if (container) {
        container.style.backgroundColor = '#1e293b';
        container.style.backgroundImage = 'none';
      }
    } else if (activeBasemap === 'none-light') {
      if (container) {
        container.style.backgroundColor = '#f8fafc';
        container.style.backgroundImage =
          'radial-gradient(#cbd5e1 1px, transparent 1px), radial-gradient(#e2e8f0 1px, #f8fafc 1px)';
        container.style.backgroundSize = '24px 24px, 120px 120px';
      }
    } else if (activeBasemap === 'none-dark') {
      if (container) {
        container.style.backgroundColor = '#1e2430';
        container.style.backgroundImage =
          'radial-gradient(#334155 1px, transparent 1px), radial-gradient(#475569 1px, #1e2430 1px)';
        container.style.backgroundSize = '24px 24px, 120px 120px';
      }
    }
  }, [activeBasemap]);

  // Manual fit bounds to entire project or active road alignment
  const handleFitAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = [];
    const pointsToFit =
      showAllSegments && segments.length > 0
        ? segments.flatMap((s) => s.allPoints || [])
        : allPoints;

    pointsToFit.forEach((pt) => {
      const [lat, lng] = utmToLatLng(pt.x, pt.y, utmZone);
      if (lat !== 0 && lng !== 0) bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
    }
  }, [allPoints, segments, showAllSegments, utmZone]);

  // Update map vectors, markers, and intersections
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const isDarkMode = activeBasemap === 'none-dark';
    const bounds = [];

    // Helper: Draw a single segment's geometry
    const drawSegment = (seg, isCurrentActive) => {
      const segPoints = seg.allPoints || [];
      const segStations = seg.stations || [];
      if (segPoints.length === 0) return;

      const segLatLngs = segPoints.map((pt) => {
        const [lat, lng] = utmToLatLng(pt.x, pt.y, utmZone);
        return { ...pt, lat, lng };
      });

      const validSegLatLngs = segLatLngs.filter((p) => p.lat !== 0 && p.lng !== 0);
      if (validSegLatLngs.length === 0) return;

      if (isCurrentActive) {
        validSegLatLngs.forEach((p) => bounds.push([p.lat, p.lng]));
        validSegLatLngsRef.current = validSegLatLngs;
      }

      const segColor = seg.color || (isCurrentActive ? '#ef4444' : '#64748b');

      // 1. CAD Pelari Struktur Lines (the actual boundary lines from AutoCAD DWG)
      if (seg.cadChains && seg.cadChains.length > 0) {
        seg.cadChains.forEach((chain) => {
          const chainCoords = chain
            .map((pt) => {
              const [lat, lng] = utmToLatLng(pt.x, pt.y, utmZone);
              return (lat !== 0 && lng !== 0) ? [lat, lng] : null;
            })
            .filter(Boolean);

          if (chainCoords.length >= 2) {
            L.polyline(chainCoords, {
              color: isCurrentActive ? (isDarkMode ? '#60a5fa' : '#2563eb') : '#94a3b8',
              weight: isCurrentActive ? 2.5 : 1.5,
              opacity: isCurrentActive ? 0.9 : 0.5,
            }).addTo(group);
          }
        });
      }

      // 2. Cross-section lines (Controlled by crossSectionMode: 'none' | 'selected' | 'all')
      if (crossSectionMode === 'all') {
        segStations.forEach((sta) => {
          const sortedPts = sortStationPointsGeometrically(sta.points || [], sta.clPoint);
          const staPts = sortedPts
            .map((pt) => {
              const matched = validSegLatLngs.find((p) => p.id === pt.id);
              return matched ? [matched.lat, matched.lng] : null;
            })
            .filter(Boolean);

          if (staPts.length >= 2) {
            L.polyline(staPts, {
              color: isCurrentActive
                ? (isDarkMode ? '#38bdf8' : '#0284c7')
                : (isDarkMode ? '#475569' : '#94a3b8'),
              weight: isCurrentActive ? 2 : 1.5,
              opacity: isCurrentActive ? 0.85 : 0.6,
              dashArray: '4, 4',
            }).addTo(group);
          }
        });
      } else if (crossSectionMode === 'selected' && isCurrentActive && selectedPointId) {
        // Draw cross-section line ONLY for the currently selected station, sorted strictly across the corridor
        const activeSta = segStations.find((s) =>
          s.points.some((p) => p.id === selectedPointId)
        );
        if (activeSta) {
          const sortedPts = sortStationPointsGeometrically(activeSta.points || [], activeSta.clPoint);
          const staPts = sortedPts
            .map((pt) => {
              const matched = validSegLatLngs.find((p) => p.id === pt.id);
              return matched ? [matched.lat, matched.lng] : null;
            })
            .filter(Boolean);

          if (staPts.length >= 2) {
            L.polyline(staPts, {
              color: isDarkMode ? '#38bdf8' : '#0284c7',
              weight: 2,
              opacity: 0.9,
              dashArray: '4, 4',
            }).addTo(group);
          }
        }
      }

      // 3. Centerline (As Jalan) Alignment Polyline
      // Always sort CL stations monotonically by cumulativeDist / nominalMeters to prevent jumping/criss-crossing!
      const sortedClStations = segStations
        .filter((sta) => !!sta.clPoint)
        .slice()
        .sort((a, b) => {
          const distA = a.cumulativeDist != null ? a.cumulativeDist : (a.nominalMeters || 0);
          const distB = b.cumulativeDist != null ? b.cumulativeDist : (b.nominalMeters || 0);
          return distA - distB;
        });

      const clCoords = sortedClStations
        .map((sta) => {
          const matched = validSegLatLngs.find((p) => p.id === sta.clPoint.id);
          return matched ? [matched.lat, matched.lng] : null;
        })
        .filter(Boolean);

      if (clCoords.length >= 2) {
        L.polyline(clCoords, {
          color: segColor,
          weight: isCurrentActive ? 4.5 : 3.5,
          opacity: isCurrentActive ? 0.95 : 0.75,
        }).addTo(group);
      }

      // 3. Markers for Points
      validSegLatLngs.forEach((pt) => {
        const isCL = pt.role === 'CL';
        const isKi = pt.role?.startsWith('Ki');
        const isKa = pt.role?.startsWith('Ka');
        const isSelected = isCurrentActive && selectedPointId === pt.id;

        let color = '#94a3b8';
        let radius = isCurrentActive ? 6 : 4.5;

        if (isCL) {
          color = segColor;
          radius = isCurrentActive ? 8 : 6;
        } else if (isKi) {
          color = '#3b82f6';
        } else if (isKa) {
          color = '#10b981';
        }

        if (isSelected) {
          radius += 3;
        }

        const marker = L.circleMarker([pt.lat, pt.lng], {
          radius,
          fillColor: color,
          color: isSelected
            ? '#fbbf24'
            : isCurrentActive
            ? (isDarkMode ? '#ffffff' : '#0f172a')
            : '#64748b',
          weight: isSelected ? 3 : isCurrentActive ? 1.5 : 1,
          opacity: isCurrentActive ? 1 : 0.6,
          fillOpacity: isCurrentActive ? 0.9 : 0.6,
        });

        // Popup Content
        const popupContent = document.createElement('div');
        popupContent.className = 'text-xs p-1 space-y-1.5';

        if (isCurrentActive) {
          const isSameCode =
            pt.rawCode &&
            pt.station &&
            pt.rawCode.replace(/[\s._-]+/g, '').toUpperCase() ===
              pt.station.replace(/[\s._-]+/g, '').toUpperCase();

          const displayTitle = isSameCode
            ? pt.station
            : pt.rawCode && pt.station
            ? `${pt.station} (${pt.rawCode})`
            : (pt.station || pt.rawCode);

          popupContent.innerHTML = `
            <div class="border-b pb-1.5 flex justify-between items-start gap-2">
              <div class="min-w-0">
                <span class="font-bold text-slate-800 text-sm block leading-snug">${displayTitle}</span>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-[11px] text-blue-600 font-semibold truncate max-w-[170px]" title="${seg.name}">
                    Ruas: ${seg.name}
                  </span>
                  <button class="btn-rename-seg text-[10px] text-slate-400 hover:text-blue-700 underline font-normal cursor-pointer" title="Ubah Nama Ruas Ini">
                    ✏️ Ganti
                  </button>
                </div>
              </div>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                isCL
                  ? 'bg-red-100 text-red-700'
                  : isKi
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }">${pt.role || 'P'}</span>
            </div>
            <div class="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
              <div><b>Kode Titik:</b> <span class="font-mono font-bold text-slate-800">${pt.rawCode || '-'}</span></div>
              <div><b>No Titik:</b> ${pt.rawNo || '-'}</div>
              <div><b>X:</b> ${pt?.x != null ? pt.x.toFixed(3) : '-'}</div>
              <div><b>Y:</b> ${pt?.y != null ? pt.y.toFixed(3) : '-'}</div>
              <div><b>Z (Elev):</b> <span class="font-bold text-slate-800">${pt?.z != null ? pt.z.toFixed(3) : '-'} m</span></div>
              <div><b>Offset:</b> ${pt?.offset != null ? `${pt.offset > 0 ? '+' : ''}${pt.offset.toFixed(2)} m` : '-'}</div>
            </div>
            <div class="pt-1.5 border-t flex flex-col gap-1.5">
              <span class="text-[10px] text-slate-500 font-semibold uppercase">Ubah Peran Titik:</span>
              <div class="flex gap-1 flex-wrap">
                ${
                  isCL
                    ? `
                  <button class="btn-unset-cl px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold shadow-xs transition-colors" title="Hapus node CL">
                    ❌ Jadikan Non-CL
                  </button>
                `
                    : `
                  <button class="btn-cl px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold shadow-xs transition-colors" title="Jadikan As Jalan">
                    ★ Jadikan As (CL)
                  </button>
                `
                }
                <button class="btn-ki px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] transition-colors">
                  Tepi Kiri
                </button>
                <button class="btn-ka px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] transition-colors">
                  Tepi Kanan
                </button>
              </div>
              <button class="btn-edit mt-0.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors">
                ✏️ Edit Atribut Titik (X, Y, Z, Ket)
              </button>
            </div>
          `;

          const btnRename = popupContent.querySelector('.btn-rename-seg');
          if (btnRename) {
            btnRename.onclick = (e) => {
              e.stopPropagation();
              const newName = window.prompt('Ubah nama ruas jalan ini:', seg.name);
              if (newName && newName.trim() && onUpdateSegment) {
                onUpdateSegment(seg.id, { name: newName.trim() });
                map.closePopup();
              }
            };
          }

          const btnUnset = popupContent.querySelector('.btn-unset-cl');
          if (btnUnset) {
            btnUnset.onclick = (e) => {
              e.stopPropagation();
              map.closePopup();
              onChangePointRole(pt.id, 'UNSET_CL');
            };
          }
          const btnCl = popupContent.querySelector('.btn-cl');
          if (btnCl) {
            btnCl.onclick = (e) => {
              e.stopPropagation();
              map.closePopup();
              onChangePointRole(pt.id, 'CL');
            };
          }
          popupContent.querySelector('.btn-ki').onclick = (e) => {
            e.stopPropagation();
            map.closePopup();
            onChangePointRole(pt.id, 'Ki');
          };
          popupContent.querySelector('.btn-ka').onclick = (e) => {
            e.stopPropagation();
            map.closePopup();
            onChangePointRole(pt.id, 'Ka');
          };
          popupContent.querySelector('.btn-edit').onclick = (e) => {
            e.stopPropagation();
            map.closePopup();
            if (onEditPoint) onEditPoint(pt);
          };

          marker.on('click', (e) => {
            if (drawToolRef.current !== 'none') {
              L.DomEvent.stopPropagation(e);
              handleAddDrawnPoint({
                lat: pt.lat,
                lng: pt.lng,
                x: pt.x,
                y: pt.y,
                z: pt.z || 42.5,
                ptId: pt.id,
                name: pt.rawCode || pt.station,
                rawCode: pt.rawCode,
                station: pt.station,
                rawNo: pt.rawNo,
                originalPt: pt,
                isSnapped: true,
              });
              return;
            }
            if (isManualPickModeRef.current) {
              onChangePointRole(pt.id, 'CL');
              onSelectPoint(pt.id);
            } else {
              onSelectPoint(pt.id);
            }
          });
        } else {
          // Inactive segment marker popup
          const isSameCode =
            pt.rawCode &&
            pt.station &&
            pt.rawCode.replace(/[\s._-]+/g, '').toUpperCase() ===
              pt.station.replace(/[\s._-]+/g, '').toUpperCase();

          const inactiveTitle = isSameCode
            ? pt.station
            : pt.rawCode && pt.station
            ? `${pt.station} (${pt.rawCode})`
            : (pt.station || pt.rawCode);

          popupContent.innerHTML = `
            <div class="border-b pb-1.5 flex justify-between items-start gap-2">
              <div class="min-w-0">
                <span class="font-bold text-slate-800 text-sm block leading-snug">${inactiveTitle}</span>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-[11px] text-blue-600 font-semibold truncate max-w-[170px]" title="${seg.name}">
                    Ruas: ${seg.name}
                  </span>
                  <button class="btn-rename-seg text-[10px] text-slate-400 hover:text-blue-700 underline font-normal cursor-pointer" title="Ubah Nama Ruas Ini">
                    ✏️ Ganti
                  </button>
                </div>
              </div>
            </div>
            <div class="text-[11px] text-slate-600 space-y-0.5 mt-1">
              <div><b>Kode Titik:</b> <span class="font-mono font-bold text-slate-800">${pt.rawCode || '-'}</span></div>
              <div><b>Koordinat:</b> ${pt?.x != null ? pt.x.toFixed(2) : '-'}, ${pt?.y != null ? pt.y.toFixed(2) : '-'}</div>
              <div><b>Elevasi:</b> ${pt?.z != null ? pt.z.toFixed(3) : '-'} m</div>
              <div><b>Peran:</b> ${pt.role || '-'}</div>
            </div>
            <div class="pt-2 border-t mt-1.5">
              <button class="btn-switch w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-colors">
                ➔ Buka Ruas Jalan Ini
              </button>
            </div>
          `;

          const btnRename = popupContent.querySelector('.btn-rename-seg');
          if (btnRename) {
            btnRename.onclick = (e) => {
              e.stopPropagation();
              const newName = window.prompt('Ubah nama ruas jalan ini:', seg.name);
              if (newName && newName.trim() && onUpdateSegment) {
                onUpdateSegment(seg.id, { name: newName.trim() });
                map.closePopup();
              }
            };
          }

          const btnSwitch = popupContent.querySelector('.btn-switch');
          if (btnSwitch) {
            btnSwitch.onclick = (e) => {
              e.stopPropagation();
              map.closePopup();
              if (onSelectSegment) onSelectSegment(seg.id);
            };
          }
        }

        marker.bindPopup(popupContent, { autoPan: false });
        marker.addTo(group);
      });
    };

    // Render other segments if showAllSegments is enabled
    if (showAllSegments && segments.length > 0) {
      segments.forEach((seg) => {
        if (seg.id !== activeSegmentId) {
          drawSegment(seg, false);
        }
      });
    }

    // Render active segment prominently
    const currentActiveSeg =
      segments.find((s) => s.id === activeSegmentId) || {
        id: 'active',
        name: 'Ruas Aktif',
        color: '#ef4444',
        stations,
        allPoints,
      };
    drawSegment(currentActiveSeg, true);

    // 4. Render Intersections (Junction Nodes)
    if (intersections && intersections.length > 0) {
      intersections.forEach((intxn) => {
        const mainSeg = segments.find((s) => s.id === intxn.mainSegmentId) || currentActiveSeg;
        const branchSeg = segments.find((s) => s.id === intxn.branchSegmentId);

        const mainSta = mainSeg?.stations?.find((s) => s.stationName === intxn.mainStationName);
        const branchSta = branchSeg?.stations?.find((s) => s.stationName === intxn.branchStationName);

        if (!mainSta?.clPoint) return;

        const [mainLat, mainLng] = utmToLatLng(mainSta.clPoint.x, mainSta.clPoint.y, utmZone);
        if (mainLat === 0 && mainLng === 0) return;

        // If branch CL coordinates exist and differ, draw tie line
        if (branchSta?.clPoint) {
          const [branchLat, branchLng] = utmToLatLng(branchSta.clPoint.x, branchSta.clPoint.y, utmZone);
          if (branchLat !== 0 && branchLng !== 0) {
            L.polyline([[mainLat, mainLng], [branchLat, branchLng]], {
              color: '#f59e0b',
              weight: 3,
              dashArray: '3, 5',
              opacity: 0.9,
            }).addTo(group);
          }
        }

        // Junction Marker (Glowing Amber Double Ring)
        const junctionRing = L.circleMarker([mainLat, mainLng], {
          radius: 12,
          fillColor: '#f59e0b',
          color: '#d97706',
          weight: 2.5,
          opacity: 0.9,
          fillOpacity: 0.4,
        });

        const junctionCore = L.circleMarker([mainLat, mainLng], {
          radius: 5,
          fillColor: '#ffffff',
          color: '#b45309',
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        });

        const intxnPopup = document.createElement('div');
        intxnPopup.className = 'text-xs p-1.5 space-y-2';
        intxnPopup.innerHTML = `
          <div class="border-b pb-1">
            <span class="font-bold text-amber-800 text-sm flex items-center gap-1">
              🔀 ${intxn.name}
            </span>
            <span class="text-[10px] text-slate-500 font-semibold uppercase">Titik Simpang (Junction Node)</span>
          </div>
          <div class="text-[11px] text-slate-700 space-y-1 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
            <div><b>Ruas Utama:</b> ${mainSeg?.name || '-'} (${intxn.mainStationName})</div>
            <div><b>Ruas Cabang:</b> ${branchSeg?.name || '-'} (${intxn.branchStationName})</div>
            <div><b>Elevasi As:</b> <span class="font-mono font-bold">${mainSta?.clPoint?.z != null ? mainSta.clPoint.z.toFixed(3) : '-'} m</span></div>
          </div>
          <div class="flex gap-1.5 pt-1">
            <button class="btn-to-main flex-1 px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold">
              ➔ Fokus Ruas Utama
            </button>
            <button class="btn-to-branch flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold">
              ➔ Fokus Ruas Cabang
            </button>
          </div>
        `;

        intxnPopup.querySelector('.btn-to-main').onclick = (e) => {
          e.stopPropagation();
          map.closePopup();
          if (onSelectSegment && mainSeg) onSelectSegment(mainSeg.id);
        };
        intxnPopup.querySelector('.btn-to-branch').onclick = (e) => {
          e.stopPropagation();
          map.closePopup();
          if (onSelectSegment && branchSeg) onSelectSegment(branchSeg.id);
        };

        junctionRing.bindPopup(intxnPopup);
        junctionCore.bindPopup(intxnPopup);

        junctionRing.addTo(group);
        junctionCore.addTo(group);
      });
    }

    // Auto-fit bounds on initial dataset/project load
    if (bounds.length > 0 && lastDatasetIdRef.current !== datasetId) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
      lastDatasetIdRef.current = datasetId;
    }
  }, [
    stations,
    allPoints,
    segments,
    activeSegmentId,
    showAllSegments,
    intersections,
    utmZone,
    selectedPointId,
    datasetId,
    activeBasemap,
    crossSectionMode,
    onChangePointRole,
    onSelectPoint,
    onSelectSegment,
    onUpdateSegment,
    onEditPoint,
  ]);

  // Drawing Handlers
  const handleAddDrawnPoint = useCallback((newPt) => {
    setDrawnPoints((prev) => {
      const prevPt = prev[prev.length - 1];
      const distFromPrev = prevPt ? Math.hypot(newPt.x - prevPt.x, newPt.y - prevPt.y) : 0;
      const cumDist = prevPt ? (prevPt.cumDist || 0) + distFromPrev : 0;
      return [...prev, { ...newPt, distFromPrev, cumDist }];
    });
  }, []);

  const handleUndoDrawnPoint = () => {
    setDrawnPoints((prev) => prev.slice(0, -1));
  };

  const handleClearDrawnPoints = () => {
    setDrawnPoints([]);
    setMousePreview(null);
  };

  const handleSaveAsNewSegment = () => {
    if (drawPoints.length < 2) {
      alert('Tarik minimal 2 titik untuk membuat ruas jalan baru.');
      return;
    }
    const currentActiveSeg = segments.find((s) => s.id === activeSegmentId);
    let baseCleanName = currentActiveSeg ? currentActiveSeg.name : '';
    // Strip any legacy 'Ruas Trase Manual' or '- Trase Baru' text
    baseCleanName = baseCleanName
      .replace(/^Ruas Trase Manual\s*\d*\s*[-:]*\s*/i, '')
      .replace(/-\s*Trase Baru/i, '')
      .replace(/\(Trase Baru\)/i, '')
      .trim();

    const defaultName = baseCleanName
      ? `${baseCleanName} (Trase 2)`
      : `Ruas ${(segments?.length || 0) + 1}`;

    const userInput = window.prompt('Beri nama untuk ruas jalan baru ini:', defaultName);
    if (userInput === null) return; // User canceled
    const segName = userInput.trim() || defaultName;

    const newStations = [];
    let cumDist = 0;
    const segIdx = segments?.length || 0;
    const segCode = String.fromCharCode(65 + (segIdx % 26));

    for (let i = 0; i < drawPoints.length; i++) {
      const pt = drawPoints[i];
      if (i > 0) {
        cumDist += Math.hypot(pt.x - drawPoints[i - 1].x, pt.y - drawPoints[i - 1].y);
      }

      // Check if this point was snapped from an existing surveyed station
      const originalPt = pt.originalPt;
      const existingSta = originalPt
        ? stations.find(
            (s) =>
              s.stationName === originalPt.station ||
              s.points.some((p) => p.id === originalPt.id)
          )
        : null;

      if (existingSta && existingSta.points && existingSta.points.length > 1) {
        // PRESERVE REAL IMPORTED CROSS SECTION!
        // Clone the existing station and its points so all original imported codes, offsets, and elevations are preserved 100%!
        const clonedPoints = existingSta.points.map((p) => {
          const isSelectedPt = p.id === originalPt.id;
          return {
            ...p,
            id: `pt_${segIdx}_${p.id}_${Date.now()}`,
            role: isSelectedPt ? 'CL' : p.role === 'CL' ? 'P' : p.role,
          };
        });
        const clPt = clonedPoints.find((p) => p.role === 'CL') || clonedPoints[0];

        newStations.push({
          stationName: existingSta.stationName,
          nominalMeters: cumDist,
          cumulativeDist: cumDist,
          clPoint: clPt,
          points: clonedPoints,
        });
      } else {
        // Point doesn't have an existing multi-point cross section
        let dx = 1,
          dy = 0;
        if (i < drawPoints.length - 1) {
          dx = drawPoints[i + 1].x - pt.x;
          dy = drawPoints[i + 1].y - pt.y;
        } else if (i > 0) {
          dx = pt.x - drawPoints[i - 1].x;
          dy = pt.y - drawPoints[i - 1].y;
        }
        const segLen = Math.hypot(dx, dy) || 1;
        const nx = -dy / segLen;
        const ny = dx / segLen;
        const halfW = 2.0;

        const km = Math.floor(cumDist / 1000);
        const m = (cumDist % 1000).toFixed(0).padStart(3, '0');
        // PRESERVE ORIGINAL STATION NAME OR RAWCODE IF SNAPPED!
        const staName =
          originalPt?.station ||
          (originalPt?.rawCode ? String(originalPt.rawCode) : `STA ${km}+${m}`);
        const baseCode = originalPt?.rawCode || `${segName}-${staName}`;

        const clPoint = {
          id: `pt_${segIdx}_${i}_cl_${Date.now()}`,
          rawNo: originalPt?.rawNo || i * 3 + 2,
          rawCode: originalPt?.rawCode || `${baseCode}-CL`,
          station: staName,
          x: Number(pt.x.toFixed(3)),
          y: Number(pt.y.toFixed(3)),
          z: Number((pt.z || 42.5).toFixed(3)),
          role: 'CL',
          offset: 0,
        };

        const kiPoint = {
          id: `pt_${segIdx}_${i}_ki_${Date.now()}`,
          rawNo: originalPt?.rawNo ? originalPt.rawNo + 1000 : i * 3 + 1,
          rawCode: `${baseCode}-Ki`,
          station: staName,
          x: Number((pt.x + nx * halfW).toFixed(3)),
          y: Number((pt.y + ny * halfW).toFixed(3)),
          z: Number((pt.z || 42.5).toFixed(3)) - 0.06,
          role: 'Ki',
          offset: -halfW,
        };

        const kaPoint = {
          id: `pt_${segIdx}_${i}_ka_${Date.now()}`,
          rawNo: originalPt?.rawNo ? originalPt.rawNo + 2000 : i * 3 + 3,
          rawCode: `${baseCode}-Ka`,
          station: staName,
          x: Number((pt.x - nx * halfW).toFixed(3)),
          y: Number((pt.y - ny * halfW).toFixed(3)),
          z: Number((pt.z || 42.5).toFixed(3)) - 0.06,
          role: 'Ka',
          offset: halfW,
        };

        newStations.push({
          stationName: staName,
          nominalMeters: cumDist,
          cumulativeDist: cumDist,
          clPoint,
          points: [kiPoint, clPoint, kaPoint],
        });
      }
    }

    const allPts = newStations.flatMap((s) => s.points);
    const rawLines = ['NO\tCODE\tX\tY\tELEVATION'];
    allPts.forEach((p) => rawLines.push(`${p.rawNo}\t${p.rawCode}\t${p.x}\t${p.y}\t${p.z}`));

    const PRESET_COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#3b82f6'];
    const drawnChain = drawPoints.map((p) => ({ x: p.x, y: p.y, z: p.z || 42.5 }));

    const newSeg = {
      id: `seg_${Date.now()}_man`,
      name: segName,
      code: segCode,
      color: PRESET_COLORS[segIdx % PRESET_COLORS.length],
      rawText: rawLines.join('\n'),
      cadChains: [drawnChain],
      stations: newStations,
      allPoints: allPts,
    };

    if (onAddSegment) {
      onAddSegment(newSeg);
    }
    setDrawnPoints([]);
    setDrawTool('none');
  };

  const handleApplyAsCenterline = () => {
    if (drawPoints.length === 0) return;

    const snappedIds = drawPoints.filter((p) => p.ptId).map((p) => p.ptId);

    if (snappedIds.length > 0) {
      snappedIds.forEach((id) => {
        onChangePointRole(id, 'CL');
      });
      if (onSelectPoint) onSelectPoint(snappedIds[0]);
    } else {
      drawPoints.forEach((dp) => {
        let closest = null;
        let minD = Infinity;
        allPoints.forEach((p) => {
          const d = Math.hypot(p.x - dp.x, p.y - dp.y);
          if (d < minD) {
            minD = d;
            closest = p;
          }
        });
        if (closest && minD < 15) {
          onChangePointRole(closest.id, 'CL');
        }
      });
    }

    setDrawnPoints([]);
    setDrawTool('none');
  };

  // Map click & mousemove handlers for manual drawing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const onMapClick = (e) => {
      if (drawToolRef.current === 'none') return;

      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;

      let snappedPt = null;
      let minPix = 24;
      const clickPix = map.latLngToLayerPoint(e.latlng);

      if (validSegLatLngsRef.current && validSegLatLngsRef.current.length > 0) {
        validSegLatLngsRef.current.forEach((pt) => {
          const ptPix = map.latLngToLayerPoint([pt.lat, pt.lng]);
          const dPix = Math.hypot(clickPix.x - ptPix.x, clickPix.y - ptPix.y);
          if (dPix < minPix) {
            minPix = dPix;
            snappedPt = pt;
          }
        });
      }

      if (snappedPt) {
        handleAddDrawnPoint({
          lat: snappedPt.lat,
          lng: snappedPt.lng,
          x: snappedPt.x,
          y: snappedPt.y,
          z: snappedPt.z || 42.5,
          ptId: snappedPt.id,
          name: snappedPt.rawCode || snappedPt.station,
          rawCode: snappedPt.rawCode,
          station: snappedPt.station,
          rawNo: snappedPt.rawNo,
          originalPt: snappedPt,
          isSnapped: true,
        });
      } else {
        const [x, y] = latLngToUtm(clickLat, clickLng, utmZone);
        const ptLabel = `P${drawPointsRef.current.length + 1}`;
        handleAddDrawnPoint({
          lat: clickLat,
          lng: clickLng,
          x,
          y,
          z: 42.5,
          ptId: null,
          name: ptLabel,
          rawCode: ptLabel,
          station: ptLabel,
          originalPt: null,
          isSnapped: false,
        });
      }
    };

    const onMapMouseMove = (e) => {
      if (drawToolRef.current === 'none' || drawPointsRef.current.length === 0) {
        setMousePreview(null);
        return;
      }
      const last = drawPointsRef.current[drawPointsRef.current.length - 1];
      const [mx, my] = latLngToUtm(e.latlng.lat, e.latlng.lng, utmZone);
      const d = Math.hypot(mx - last.x, my - last.y);
      const dx = mx - last.x;
      const dy = my - last.y;
      let azimuth = Math.atan2(dx, dy) * (180 / Math.PI);
      if (azimuth < 0) azimuth += 360;

      setMousePreview({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        dist: d,
        azimuth,
      });
    };

    map.on('click', onMapClick);
    map.on('mousemove', onMapMouseMove);

    return () => {
      map.off('click', onMapClick);
      map.off('mousemove', onMapMouseMove);
    };
  }, [utmZone, handleAddDrawnPoint]);

  // Render drawing layers
  useEffect(() => {
    const group = drawLayersGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (drawTool === 'none' || drawPoints.length === 0) return;

    const isMeasure = drawTool === 'measure';
    const mainColor = isMeasure ? '#06b6d4' : '#ec4899';
    const coords = drawPoints.map((p) => [p.lat, p.lng]);

    // 1. Path polyline
    if (coords.length >= 2) {
      L.polyline(coords, {
        color: mainColor,
        weight: 7,
        opacity: 0.35,
      }).addTo(group);

      L.polyline(coords, {
        color: mainColor,
        weight: 3.5,
        dashArray: isMeasure ? '6, 6' : null,
        opacity: 0.95,
      }).addTo(group);
    }

    // 2. Rubber-band line from last vertex to mouse preview
    if (mousePreview && drawPoints.length > 0) {
      const last = drawPoints[drawPoints.length - 1];
      L.polyline([[last.lat, last.lng], [mousePreview.lat, mousePreview.lng]], {
        color: isMeasure ? '#22d3ee' : '#f43f5e',
        weight: 2,
        dashArray: '4, 4',
        opacity: 0.85,
      }).addTo(group);

      const midLat = (last.lat + mousePreview.lat) / 2;
      const midLng = (last.lng + mousePreview.lng) / 2;
      const distLabel = `${mousePreview.dist.toFixed(2)} m${isMeasure ? ` (${mousePreview.azimuth.toFixed(0)}°)` : ''}`;

      const tagIcon = L.divIcon({
        className: 'drawing-dist-tag',
        html: `<div style="background: rgba(15, 23, 42, 0.9); color: #38bdf8; padding: 2px 7px; border-radius: 9999px; font-size: 10px; font-weight: bold; border: 1px solid rgba(56, 189, 248, 0.4); white-space: nowrap; transform: translate(-50%, -50%); pointer-events: none; backdrop-filter: blur(4px); box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-family: monospace;">${distLabel}</div>`,
        iconSize: [0, 0],
      });
      L.marker([midLat, midLng], { icon: tagIcon, interactive: false }).addTo(group);
    }

    // 3. Vertices
    drawPoints.forEach((p, idx) => {
      const isLast = idx === drawPoints.length - 1;

      L.circleMarker([p.lat, p.lng], {
        radius: isLast ? 8 : 6,
        fillColor: p.isSnapped ? '#10b981' : mainColor,
        color: '#ffffff',
        weight: 2.5,
        fillOpacity: 1,
        opacity: 1,
      }).addTo(group);

      const labelText = p.isSnapped
        ? `🎯 ${p.name}`
        : `P${idx + 1}${p.distFromPrev > 0 ? ` (+${p.distFromPrev.toFixed(1)}m)` : ''}`;

      const vIcon = L.divIcon({
        className: 'drawing-vertex-tag',
        html: `<div style="background: ${p.isSnapped ? '#047857' : '#9d174d'}; color: #ffffff; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; border: 1px solid rgba(255, 255, 255, 0.9); white-space: nowrap; transform: translate(-50%, -135%); pointer-events: none; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-family: monospace;">${labelText}</div>`,
        iconSize: [0, 0],
      });
      L.marker([p.lat, p.lng], { icon: vIcon, interactive: false }).addTo(group);
    });
  }, [drawTool, drawPoints, mousePreview]);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div ref={mapContainerRef} className="w-full h-full z-0 transition-colors duration-300" />

      {/* Top Controls: Basemap Switcher & Actions */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 flex-wrap justify-end">
        {/* Toggle Garis Potongan Penampang Melintang (Dashed Lines) - 3 Modes */}
        <button
          type="button"
          onClick={() => {
            if (crossSectionMode === 'none') setCrossSectionMode('selected');
            else if (crossSectionMode === 'selected') setCrossSectionMode('all');
            else setCrossSectionMode('none');
          }}
          className={`px-2.5 py-1.5 rounded-lg shadow-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            crossSectionMode === 'all'
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
              : crossSectionMode === 'selected'
              ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-2xs'
              : 'bg-white/95 hover:bg-white text-slate-700 border border-slate-200'
          }`}
          title="Klik untuk mengganti mode tampilan garis potongan melintang: Mati -> Hanya Titik Aktif -> Semua STA"
        >
          <span className="w-3.5 border-b-2 border-dashed border-current inline-block" />
          <span>
            {crossSectionMode === 'all'
              ? 'Garis Potongan: Semua STA'
              : crossSectionMode === 'selected'
              ? 'Garis Potongan: Titik Aktif'
              : 'Garis Potongan: Mati (Sembunyi)'}
          </span>
        </button>

        {/* Manual Draw Line / Trase Tool Button */}
        <button
          type="button"
          onClick={() => {
            if (drawTool === 'line') {
              setDrawTool('none');
              setDrawnPoints([]);
            } else {
              setDrawTool('line');
              setIsManualPickMode(false);
              setDrawnPoints([]);
            }
          }}
          className={`px-2.5 py-1.5 rounded-lg shadow-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            drawTool === 'line'
              ? 'bg-pink-600 hover:bg-pink-700 text-white ring-2 ring-pink-400 animate-pulse'
              : 'bg-white/95 hover:bg-white text-slate-700 hover:text-pink-600 border border-slate-200'
          }`}
          title="Tarik garis trase manual di atas peta (klik bebas atau snap ke titik ukur)"
        >
          <PenTool className="w-3.5 h-3.5 text-pink-500" />
          <span>{drawTool === 'line' ? '✏️ Mode Gambar Garis (Aktif)' : '✏️ Tarik Garis Manual'}</span>
        </button>

        {/* Measure / Ruler Tool Button */}
        <button
          type="button"
          onClick={() => {
            if (drawTool === 'measure') {
              setDrawTool('none');
              setDrawnPoints([]);
            } else {
              setDrawTool('measure');
              setIsManualPickMode(false);
              setDrawnPoints([]);
            }
          }}
          className={`px-2.5 py-1.5 rounded-lg shadow-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            drawTool === 'measure'
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white ring-2 ring-cyan-400'
              : 'bg-white/95 hover:bg-white text-slate-700 hover:text-cyan-600 border border-slate-200'
          }`}
          title="Ukur jarak dan sudut antar titik di peta secara manual"
        >
          <Ruler className="w-3.5 h-3.5 text-cyan-500" />
          <span>{drawTool === 'measure' ? '📐 Ukur Jarak (Aktif)' : '📐 Ukur Jarak'}</span>
        </button>

        {/* Manual Centerline Pick Mode Button */}
        <button
          type="button"
          onClick={() => {
            setIsManualPickMode(!isManualPickMode);
            if (!isManualPickMode) setDrawTool('none');
          }}
          className={`px-2.5 py-1.5 rounded-lg shadow-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            isManualPickMode
              ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-400 animate-pulse'
              : 'bg-white/95 hover:bg-white text-slate-700 hover:text-red-600 border border-slate-200'
          }`}
          title="Klik langsung titik mana saja di peta untuk menjadikannya As Jalan (CL)"
        >
          <Crosshair className="w-3.5 h-3.5 text-red-500" />
          <span>{isManualPickMode ? '🎯 Klik Titik untuk Set As (Aktif)' : '🎯 Mode Pilih As Cepat'}</span>
        </button>

        {onAutoFixTrajectory && (
          <button
            type="button"
            onClick={onAutoFixTrajectory}
            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
            title="Rapikan garis as jalan yang menyilang & kembalikan titik yang nyasar ke stasiun terdekat"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-100 fill-yellow-200" /> Auto-Rapikan
          </button>
        )}

        <button
          type="button"
          onClick={handleFitAll}
          className="px-2.5 py-1.5 bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 rounded-lg shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
          title="Pusatkan peta ke seluruh trase jalan"
        >
          <Focus className="w-3.5 h-3.5 text-blue-600" /> Zoom Trase
        </button>

        {/* Compact Basemap Switcher */}
        <div className="bg-white/95 backdrop-blur-md p-0.5 rounded-lg shadow-md border border-slate-200 flex items-center gap-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveBasemap('osm')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeBasemap === 'osm'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Peta Jalan OpenStreetMap"
          >
            🗺️ Peta
          </button>
          <button
            type="button"
            onClick={() => setActiveBasemap('satellite')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeBasemap === 'satellite'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Satelit Hybrid Google"
          >
            🛰️ Satelit
          </button>
          <button
            type="button"
            onClick={() => setActiveBasemap('none-light')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeBasemap === 'none-light'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Latar Putih Grid CAD"
          >
            <Square className="w-2.5 h-2.5 inline mr-1" /> Putih
          </button>
          <button
            type="button"
            onClick={() => setActiveBasemap('none-dark')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeBasemap === 'none-dark'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Mode Gelap CAD"
          >
            <Moon className="w-2.5 h-2.5 inline mr-1" /> Gelap
          </button>
        </div>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 text-xs max-w-xs">
        <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-blue-600" /> Legenda WebGIS Multi-Trase
        </div>
        <div className="space-y-1.5 text-slate-600 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200"></span>
            <span className="font-semibold text-slate-800">As Jalan / CL (Centerline)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200"></span>
            <span>Tepi Kiri (Ki)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
            <span>Tepi Kanan (Ka)</span>
          </div>
          {intersections.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-600 bg-amber-400"></span>
              <span className="font-semibold text-amber-800">Node Persimpangan (Simpang)</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-6 border-b border-dashed border-sky-400"></span>
            <span>Penampang Melintang (Cross-Section)</span>
          </div>
        </div>

        {/* Multi-segment list if available */}
        {segments.length > 1 && (
          <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
              Daftar Ruas Jalan:
            </span>
            {segments.map((seg) => (
              <div
                key={seg.id}
                onClick={() => onSelectSegment && onSelectSegment(seg.id)}
                className={`flex items-center justify-between gap-2 p-1 rounded cursor-pointer transition-colors ${
                  seg.id === activeSegmentId ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color || '#ef4444' }}
                  />
                  <span className="truncate text-[11px]">{seg.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {seg.stations?.length || 0} STA
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Active Drawing Tool HUD */}
      {drawTool !== 'none' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 text-xs font-semibold flex items-center gap-3 backdrop-blur-md max-w-2xl flex-wrap justify-center animate-in fade-in duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
            {drawTool === 'line' ? (
              <PenTool className="w-4 h-4 text-pink-400 shrink-0 animate-pulse" />
            ) : (
              <Ruler className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
            )}
            <div>
              <span className="font-bold block text-white text-[11px]">
                {drawTool === 'line' ? '✏️ Mode Tarik Garis Manual' : '📐 Mode Penggaris / Ukur Jarak'}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {drawPoints.length === 0
                  ? 'Klik titik di peta atau klik titik ukur untuk snap'
                  : `${drawPoints.length} Titik | Total: ${(drawPoints[drawPoints.length - 1]?.cumDist || 0).toFixed(2)} m`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              disabled={drawPoints.length === 0}
              onClick={handleUndoDrawnPoint}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors border border-slate-600 cursor-pointer"
              title="Hapus titik terakhir"
            >
              <Undo2 className="w-3 h-3 text-slate-300" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              disabled={drawPoints.length === 0}
              onClick={handleClearDrawnPoints}
              className="px-2.5 py-1 bg-slate-800 hover:bg-red-900/60 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-red-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors border border-slate-600 cursor-pointer"
              title="Reset semua titik"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Reset</span>
            </button>

            {drawTool === 'line' && drawPoints.length >= 2 && (
              <>
                {drawPoints.filter((p) => p.ptId).length >= 2 && onGroupPointsIntoCrossSection && (
                  <button
                    type="button"
                    onClick={() => {
                      const snappedPts = drawPoints.filter((p) => p.ptId);
                      const snappedIds = snappedPts.map((p) => p.ptId);
                      const firstPt = snappedPts[0];
                      const defaultStaName =
                        firstPt?.station ||
                        firstPt?.rawCode ||
                        stations.find((s) => s.points.some((pt) => pt.id === snappedIds[0]))?.stationName ||
                        `STA ${Math.floor((stations.length * 25) / 1000)}+${String((stations.length * 25) % 1000).padStart(3, '0')}`;
                      const customName = window.prompt(
                        'Masukkan Nama Stasiun untuk Penampang Melintang ini:',
                        defaultStaName
                      );
                      if (customName !== null) {
                        onGroupPointsIntoCrossSection(snappedIds, customName.trim() || undefined);
                        setCrossSectionMode('selected');
                        setDrawnPoints([]);
                        setDrawTool('none');
                      }
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Jadikan titik-titik yang dipilih ini sebagai 1 Stasiun Penampang Melintang (Cross-Section)"
                  >
                    <Scissors className="w-3 h-3 text-indigo-200" />
                    <span>✂️ Jadikan 1 Cross Section</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApplyAsCenterline}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Jadikan titik-titik yang dilewati garis ini sebagai As Jalan (CL) pada ruas aktif"
                >
                  <Target className="w-3 h-3 text-red-200" />
                  <span>Jadikan As (CL)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAsNewSegment}
                  className="px-2.5 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-[11px] font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Simpan garis ini sebagai Ruas Jalan Baru lengkap dengan stasiun penampang"
                >
                  <PlusCircle className="w-3 h-3 text-pink-200" />
                  <span>Simpan Ruas Baru</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setDrawTool('none');
                setDrawnPoints([]);
                setMousePreview(null);
              }}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ml-1"
            >
              <X className="w-3 h-3" />
              <span>Tutup</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Active Pick Banner */}
      {isManualPickMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[400] bg-red-600/95 text-white px-4 py-2 rounded-full shadow-2xl border border-red-300 text-xs font-semibold flex items-center gap-2.5 backdrop-blur-xs">
          <Target className="w-4 h-4 text-white shrink-0" />
          <span>Mode Pilih As Cepat: Klik titik mana saja di peta untuk menjadikannya As Jalan (CL)</span>
          <button
            type="button"
            onClick={() => setIsManualPickMode(false)}
            className="ml-1 px-2.5 py-0.5 bg-white text-red-700 hover:bg-red-50 rounded-full text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
          >
            Selesai
          </button>
        </div>
      )}

      {/* Manual Mode Hint (when all stations have no CL) */}
      {stations.length > 0 && stations.every((s) => !s.clPoint) && !isManualPickMode && (
        <div className="absolute top-14 left-4 z-[400] bg-slate-900/90 text-white px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-sm max-w-sm text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Target className="w-3.5 h-3.5" />
              <span>Mode Manual: As Jalan Belum Ditentukan</span>
            </div>
            <button
              type="button"
              onClick={() => setIsManualPickMode(true)}
              className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer"
            >
              Aktifkan Pilih As
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Auto-trase as dinonaktifkan saat upload data. Klik titik mana saja di peta lalu pilih <strong>★ Jadikan As (CL)</strong>, atau aktifkan <strong>Mode Pilih As Cepat</strong> di atas.
          </p>
        </div>
      )}
    </div>
  );
}
