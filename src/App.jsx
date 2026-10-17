import React, { useState, useMemo } from 'react';
import {
  parseSurveyRawText,
  parseMultiSegmentRawText,
  processSurveyData,
  updateStationPointRoles,
  harmonizeAllStations,
  flipStationSides,
  updatePointAttributes,
  deletePoint,
  autoFixTrajectory,
  clearAllStationCenterlines,
  groupPointsIntoCrossSection,
} from './utils/surveyParser';
import {
  exportSurveyToCsv,
  exportProjectToJson,
} from './utils/saveExportUtils';
import {
  loadWorkspaceFromStorage,
  saveWorkspaceToStorage,
  createDefaultProject,
  tieIntersectionElevations,
  isSampleProject,
} from './utils/multiProjectManager';

import MapGISView from './components/MapGISView';
import PointClassifierPanel from './components/PointClassifierPanel';
import LongSectionView from './components/LongSectionView';
import CrossSectionView from './components/CrossSectionView';
import AttributeTableView from './components/AttributeTableView';
import DataImportModal from './components/DataImportModal';
import CadExportModal from './components/CadExportModal';
import PointEditModal from './components/PointEditModal';
import ProjectManagerModal from './components/ProjectManagerModal';
import IntersectionModal from './components/IntersectionModal';
import SegmentManagerBar from './components/SegmentManagerBar';
import RoadCorridor3DView from './components/RoadCorridor3DView';
import EarthworkReportModal from './components/EarthworkReportModal';
import SurveyAuditModal from './components/SurveyAuditModal';
import TitleBlockModal from './components/TitleBlockModal';

import { exportToGoogleEarthKml } from './utils/kmlExportUtils';
import { downloadLandXmlFile } from './utils/landxmlUtils';
import { DEFAULT_ROAD_TEMPLATE } from './utils/roadDesignTemplate';

import {
  Map,
  Compass,
  FileCode,
  Upload,
  Maximize2,
  TrendingUp,
  Check,
  FileSpreadsheet,
  Table,
  FolderKanban,
  Box,
  Scale,
  ShieldCheck,
  Printer,
  Globe,
  ChevronDown,
  Download,
  PanelRightOpen,
  Target,
} from 'lucide-react';

export default function App() {
  // Workspace state containing all projects
  const [workspace, setWorkspace] = useState(() => loadWorkspaceFromStorage());
  const [activeTab, setActiveTab] = useState('webgis'); // 'webgis', 'long', 'cross', 'corridor3d', 'table'
  const [selectedPointId, setSelectedPointId] = useState(null);
  const [datasetId, setDatasetId] = useState(1);
  const [showAllSegmentsOnMap, setShowAllSegmentsOnMap] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isIntersectionModalOpen, setIsIntersectionModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEarthworkModalOpen, setIsEarthworkModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isTitleBlockModalOpen, setIsTitleBlockModalOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [roadTemplate, setRoadTemplate] = useState(DEFAULT_ROAD_TEMPLATE);
  const [editingPoint, setEditingPoint] = useState(null);
  const [saveToast, setSaveToast] = useState('');


  // Active Project & Active Segment Resolution
  const activeProject = useMemo(() => {
    return (
      workspace.projects.find((p) => p.id === workspace.activeProjectId) ||
      workspace.projects[0] ||
      createDefaultProject()
    );
  }, [workspace]);

  const activeSegment = useMemo(() => {
    const segs = activeProject.segments || [];
    return segs.find((s) => s.id === activeProject.activeSegmentId) || segs[0] || null;
  }, [activeProject]);

  const utmZone = activeProject.utmZone || '49S';
  const stations = activeSegment?.stations || [];
  const allPoints = activeSegment?.allPoints || [];
  const segments = activeProject.segments || [];
  const intersections = activeProject.intersections || [];

  // Auto-select first point of active segment if current selection is invalid
  const [prevSegId, setPrevSegId] = useState(activeSegment?.id);
  if (activeSegment?.id !== prevSegId) {
    setPrevSegId(activeSegment?.id);
    if (allPoints.length > 0) {
      setSelectedPointId(allPoints[0].id);
    } else {
      setSelectedPointId(null);
    }
  }

  const showToast = (msg) => {
    setSaveToast(msg);
    setTimeout(() => {
      setSaveToast('');
    }, 3000);
  };

  // Helper: Persist updated workspace
  const updateWorkspaceState = (newWorkspace, toastMessage = null) => {
    setWorkspace(newWorkspace);
    saveWorkspaceToStorage(newWorkspace);
    if (toastMessage) showToast(toastMessage);
  };

  // Helper: Update Active Project
  const updateActiveProject = (updatedProject, toastMessage = null) => {
    const newProjects = workspace.projects.map((p) =>
      p.id === updatedProject.id ? updatedProject : p
    );
    const newWs = { ...workspace, projects: newProjects };
    updateWorkspaceState(newWs, toastMessage);
  };

  // Helper: Update Active Segment inside Active Project
  const updateActiveSegment = (updatedSegment, toastMessage = null) => {
    const updatedSegments = activeProject.segments.map((s) =>
      s.id === updatedSegment.id ? updatedSegment : s
    );
    const updatedProj = { ...activeProject, segments: updatedSegments };
    updateActiveProject(updatedProj, toastMessage);
  };

  // Auto-purge any legacy sample survey projects (e.g. Siliwangi / Melati)
  React.useEffect(() => {
    if (workspace && workspace.projects) {
      const filtered = workspace.projects.filter((p) => !isSampleProject(p));
      if (filtered.length !== workspace.projects.length) {
        const cleanProjects = filtered.length > 0 ? filtered : [createDefaultProject()];
        const cleanWs = {
          activeProjectId: cleanProjects[0].id,
          projects: cleanProjects,
        };
        updateWorkspaceState(cleanWs);
        setDatasetId((prev) => prev + 1);
      }
    }
  }, []);

  const handleResetWorkspace = () => {
    try {
      localStorage.removeItem('georoad_survey_project_v1');
      localStorage.removeItem('georoad_survey_workspace');
      localStorage.removeItem('georoad_survey_workspace_v2');
      localStorage.removeItem('georoad_survey_workspace_v3');
    } catch (_) {}
    const defaultProj = createDefaultProject();
    const cleanWs = {
      activeProjectId: defaultProj.id,
      projects: [defaultProj],
    };
    updateWorkspaceState(cleanWs, '✓ Seluruh data dikosongkan (Mulai dari Proyek Bersih)');
    setDatasetId((prev) => prev + 1);
  };

  // ================= PROJECT ACTIONS =================
  const handleSwitchProject = (projectId) => {
    const newWs = { ...workspace, activeProjectId: projectId };
    updateWorkspaceState(newWs, '✓ Berhasil beralih ke proyek baru');
    setDatasetId((prev) => prev + 1);
  };

  const handleCreateProject = ({ name, location, client, surveyor, utmZone }) => {
    const newProject = {
      id: `proj_${Date.now()}`,
      name,
      location,
      client,
      surveyor,
      surveyDate: new Date().toISOString().split('T')[0],
      utmZone,
      activeSegmentId: `seg_${Date.now()}_1`,
      segments: [
        {
          id: `seg_${Date.now()}_1`,
          name: 'Ruas Utama A',
          code: 'A',
          color: '#ef4444',
          rawText: '',
          stations: [],
          allPoints: [],
        },
      ],
      intersections: [],
    };

    const newWs = {
      activeProjectId: newProject.id,
      projects: [newProject, ...workspace.projects],
    };
    updateWorkspaceState(newWs, `✓ Proyek "${name}" berhasil dibuat!`);
    setDatasetId((prev) => prev + 1);
  };

  const handleUpdateProject = (projectId, updates) => {
    const newProjects = workspace.projects.map((p) =>
      p.id === projectId ? { ...p, ...updates } : p
    );
    updateWorkspaceState({ ...workspace, projects: newProjects }, '✓ Proyek diperbarui');
  };

  const handleDeleteProject = (projectId) => {
    if (workspace.projects.length <= 1) {
      alert('Tidak dapat menghapus satu-satunya proyek yang ada.');
      return;
    }
    const remaining = workspace.projects.filter((p) => p.id !== projectId);
    const nextActive =
      workspace.activeProjectId === projectId ? remaining[0].id : workspace.activeProjectId;
    updateWorkspaceState(
      { activeProjectId: nextActive, projects: remaining },
      '✓ Proyek berhasil dihapus'
    );
  };

  const handleDuplicateProject = (projectId) => {
    const source = workspace.projects.find((p) => p.id === projectId);
    if (!source) return;

    const cloned = JSON.parse(JSON.stringify(source));
    cloned.id = `proj_${Date.now()}`;
    cloned.name = `${source.name} (Salinan)`;

    const newWs = {
      activeProjectId: cloned.id,
      projects: [cloned, ...workspace.projects],
    };
    updateWorkspaceState(newWs, `✓ Proyek disalin sebagai "${cloned.name}"`);
    setDatasetId((prev) => prev + 1);
  };

  const handleExportWorkspace = () => {
    exportProjectToJson(workspace, 'GeoRoad_MultiProject_Backup.georoad.json');
    showToast('✓ Backup seluruh proyek berhasil diunduh!');
  };

  const handleImportWorkspace = (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.projects && parsed.projects.length > 0) {
        updateWorkspaceState(parsed, '✓ Database proyek berhasil dipulihkan!');
        setDatasetId((prev) => prev + 1);
      } else if (parsed.stations && parsed.allPoints) {
        // Single project file format
        const importedProject = {
          id: `proj_${Date.now()}`,
          name: parsed.title || 'Proyek Impor',
          location: 'Lokasi Pengukuran',
          client: 'Klien',
          surveyor: 'Surveyor',
          surveyDate: new Date().toISOString().split('T')[0],
          utmZone: parsed.utmZone || '49S',
          activeSegmentId: `seg_${Date.now()}`,
          segments: [
            {
              id: `seg_${Date.now()}`,
              name: 'Segmen Utama',
              code: 'A',
              color: '#ef4444',
              rawText: parsed.rawText || '',
              stations: parsed.stations,
              allPoints: parsed.allPoints,
            },
          ],
          intersections: [],
        };
        const newWs = {
          activeProjectId: importedProject.id,
          projects: [importedProject, ...workspace.projects],
        };
        updateWorkspaceState(newWs, '✓ File proyek berhasil diimpor!');
        setDatasetId((prev) => prev + 1);
      }
    } catch (e) {
      console.error('Gagal memuat file proyek:', e);
      alert('Gagal memuat file proyek: Format JSON tidak valid');
    }
  };

  // ================= SEGMENT ACTIONS =================
  const handleSelectSegment = (segId) => {
    const updatedProj = { ...activeProject, activeSegmentId: segId };
    updateActiveProject(updatedProj);
  };

  const handleAddSegment = (newSegData) => {
    const updatedSegments = [...activeProject.segments, newSegData];
    const updatedProj = {
      ...activeProject,
      activeSegmentId: newSegData.id,
      segments: updatedSegments,
    };
    updateActiveProject(updatedProj, `✓ Ruas "${newSegData.name}" berhasil ditambahkan!`);
  };

  const handleUpdateSegment = (segId, updates) => {
    const updatedSegments = activeProject.segments.map((s) =>
      s.id === segId ? { ...s, ...updates } : s
    );
    updateActiveProject({ ...activeProject, segments: updatedSegments }, '✓ Ruas diperbarui');
  };

  const handleDeleteSegment = (segId) => {
    if (activeProject.segments.length <= 1) {
      alert('Tidak dapat menghapus satu-satunya ruas jalan dalam proyek.');
      return;
    }
    const remaining = activeProject.segments.filter((s) => s.id !== segId);
    const nextActiveSeg =
      activeProject.activeSegmentId === segId ? remaining[0].id : activeProject.activeSegmentId;

    // Also remove intersections referencing this segment
    const remainingIntersections = activeProject.intersections.filter(
      (i) => i.mainSegmentId !== segId && i.branchSegmentId !== segId
    );

    const updatedProj = {
      ...activeProject,
      activeSegmentId: nextActiveSeg,
      segments: remaining,
      intersections: remainingIntersections,
    };
    updateActiveProject(updatedProj, '✓ Ruas jalan berhasil dihapus');
  };

  // ================= INTERSECTION ACTIONS =================
  const handleAddIntersection = (newIntxn) => {
    const updatedIntersections = [...intersections, newIntxn];
    let updatedProj = { ...activeProject, intersections: updatedIntersections };

    // Automatically tie branch road elevation to main road elevation
    updatedProj = tieIntersectionElevations(updatedProj, newIntxn.id);

    updateActiveProject(updatedProj, `✓ Persimpangan "${newIntxn.name}" berhasil ditautkan!`);
  };

  const handleDeleteIntersection = (intxnId) => {
    const updatedIntersections = intersections.filter((i) => i.id !== intxnId);
    updateActiveProject(
      { ...activeProject, intersections: updatedIntersections },
      '✓ Tautan persimpangan dihapus'
    );
  };

  const handleTieElevation = (intxnId) => {
    const updatedProj = tieIntersectionElevations(activeProject, intxnId);
    updateActiveProject(
      updatedProj,
      '✓ Elevasi stasiun cabang berhasil diselaraskan dengan as jalan utama!'
    );
  };

  // ================= DATA IMPORT & PROCESSING =================
  const handleImportSurveyData = (
    text,
    autoSplit = true,
    autoTraseAs = false,
    customSegmentName = null
  ) => {
    if (!text || text.trim() === '') return;

    if (autoSplit) {
      const segGroups = parseMultiSegmentRawText(text);

      if (segGroups.size > 1) {
        // Multi-segment data detected (e.g. A-STA and B-STA)
        const updatedSegments = [...activeProject.segments];
        const segKeys = Array.from(segGroups.keys());

        segKeys.forEach((segKey, idx) => {
          const pts = segGroups.get(segKey);
          const parsed = processSurveyData(pts, { autoTraseAs });
          const isSegmentNamed = /^(SEGMEN|RUAS|SEKSI|JALAN)\b/i.test(segKey);
          const segName = isSegmentNamed
            ? segKey
            : segKey === 'A' || segKey === 'DEFAULT'
            ? 'Ruas Utama (A)'
            : `Ruas ${segKey}`;
          const segColor = idx === 0 ? '#ef4444' : idx === 1 ? '#3b82f6' : '#10b981';

          const existingIdx = updatedSegments.findIndex((s) => s.code === segKey);
          if (existingIdx >= 0) {
            updatedSegments[existingIdx] = {
              ...updatedSegments[existingIdx],
              stations: parsed.stations,
              allPoints: parsed.allPoints,
              rawText: text,
            };
          } else {
            updatedSegments.push({
              id: `seg_${Date.now()}_${idx}`,
              name: segName,
              code: segKey,
              color: segColor,
              stations: parsed.stations,
              allPoints: parsed.allPoints,
              rawText: text,
            });
          }
        });

        // Auto create intersection if 2 segments and matching stations exist
        let updatedIntersections = [...intersections];
        if (segKeys.length >= 2 && updatedIntersections.length === 0) {
          const segA = updatedSegments.find((s) => s.code === segKeys[0]);
          const segB = updatedSegments.find((s) => s.code === segKeys[1]);
          if (segA && segB && segA.stations.length > 2 && segB.stations.length > 0) {
            const junctionSta = segA.stations[Math.floor(segA.stations.length / 2)].stationName;
            const branchSta = segB.stations[0].stationName;
            updatedIntersections.push({
              id: `int_${Date.now()}`,
              name: `Simpang ${segA.name} - ${segB.name}`,
              mainSegmentId: segA.id,
              mainStationName: junctionSta,
              branchSegmentId: segB.id,
              branchStationName: branchSta,
              notes: 'Persimpangan otomatis terdeteksi dari prefix multi-segmen',
            });
          }
        }

        const updatedProj = {
          ...activeProject,
          segments: updatedSegments,
          intersections: updatedIntersections,
        };
        updateActiveProject(
          updatedProj,
          autoTraseAs
            ? `✓ Berhasil mengimpor & memisahkan ${segKeys.length} ruas jalan secara mandiri!`
            : `✓ Berhasil mengimpor ${segKeys.length} ruas jalan (Mode Manual: Bebas tentukan As Jalan)!`
        );
        setDatasetId((prev) => prev + 1);
        return;
      }
    }

    // Default single segment import into active segment
    const rawPts = parseSurveyRawText(text);
    if (!rawPts || rawPts.length === 0) {
      alert('Tidak ada titik ukur yang terbaca dari data. Pastikan format memiliki kolom NO, CODE/STA, X, Y, Z.');
      return;
    }

    const parsed = processSurveyData(rawPts, { autoTraseAs });
    if (!activeSegment) return;

    const targetName = customSegmentName || activeSegment.name;
    const updatedSeg = {
      ...activeSegment,
      name: targetName,
      stations: parsed.stations,
      allPoints: parsed.allPoints,
      rawText: text,
    };
    updateActiveSegment(
      updatedSeg,
      autoTraseAs
        ? `✓ Berhasil memuat ${parsed.stations.length} STA & ${parsed.allPoints.length} titik ukur ke "${targetName}"!`
        : `✓ Berhasil memuat ${parsed.stations.length} STA & ${parsed.allPoints.length} titik ukur ke "${targetName}" (Mode Manual)!`
    );
    setDatasetId((prev) => prev + 1);
  };

  const handleImportCadProject = (cadData, asNewProject = true, autoTraseAs = false) => {
    if (!cadData || !cadData.segments || cadData.segments.length === 0) return;

    if (asNewProject) {
      const isCilamaya = (cadData.projectName || '').toLowerCase().includes('cilamaya');
      const newProject = {
        id: `proj_${Date.now()}`,
        name: cadData.projectName || (isCilamaya ? 'Preservasi Jalan Cilamaya - Cikalong' : 'Proyek CAD'),
        location: isCilamaya ? 'Kab. Karawang, Jawa Barat' : 'Lokasi Pengukuran',
        client: isCilamaya ? 'Dinas Bina Marga & Penataan Ruang Prov. Jawa Barat' : 'Pemberi Kerja',
        surveyor: 'Tim Pengukuran Topografi Lapangan',
        surveyDate: new Date().toISOString().split('T')[0],
        utmZone: cadData.utmZone || '48S',
        activeSegmentId: cadData.segments[0].id,
        segments: cadData.segments,
        intersections: [],
      };

      const newWs = {
        activeProjectId: newProject.id,
        projects: [newProject, ...workspace.projects],
      };
      updateWorkspaceState(
        newWs,
        autoTraseAs
          ? `✓ Proyek CAD "${newProject.name}" (${cadData.segments.length} Seksi Jalan, UTM ${newProject.utmZone}) berhasil dibuka!`
          : `✓ Proyek CAD "${newProject.name}" (${cadData.segments.length} Seksi, Mode Manual: Tentukan As Jalan secara bebas)!`
      );
    } else {
      // Append CAD segments to current active project
      const updatedSegments = [...activeProject.segments, ...cadData.segments];
      const updatedProj = {
        ...activeProject,
        utmZone: cadData.utmZone || activeProject.utmZone,
        activeSegmentId: cadData.segments[0].id,
        segments: updatedSegments,
      };
      updateActiveProject(
        updatedProj,
        autoTraseAs
          ? `✓ Berhasil menambahkan ${cadData.segments.length} seksi CAD ke proyek ${activeProject.name}!`
          : `✓ Berhasil menambahkan ${cadData.segments.length} seksi CAD ke proyek ${activeProject.name} (Mode Manual)!`
      );
    }
    setDatasetId((prev) => prev + 1);
  };

  const handleClearAllCenterlines = () => {
    const result = clearAllStationCenterlines(stations);
    updateActiveSegment(
      { ...activeSegment, stations: result.stations, allPoints: result.allPoints },
      '✓ Semua As Jalan (CL) pada ruas ini dikosongkan (Mode Manual Murni)'
    );
  };

  // ================= POINT EDITING ACTIONS (ACTIVE SEGMENT) =================
  const handleChangePointRole = (pointId, newRole) => {
    const result = updateStationPointRoles(stations, pointId, newRole);
    updateActiveSegment({
      ...activeSegment,
      stations: result.stations,
      allPoints: result.allPoints,
    });
  };

  const handleHarmonizeAll = () => {
    const result = harmonizeAllStations(stations);
    updateActiveSegment(
      { ...activeSegment, stations: result.stations, allPoints: result.allPoints },
      '✓ Sisi Kiri & Kanan seluruh STA ruas ini berhasil disinkronkan!'
    );
  };

  const handleFlipSides = (stationName) => {
    const result = flipStationSides(stations, stationName);
    updateActiveSegment(
      { ...activeSegment, stations: result.stations, allPoints: result.allPoints },
      `✓ Sisi Kiri & Kanan ${stationName} ditukar`
    );
  };

  const handleUpdatePointAttributes = (pointId, newAttrs) => {
    const result = updatePointAttributes(stations, pointId, newAttrs);
    updateActiveSegment(
      { ...activeSegment, stations: result.stations, allPoints: result.allPoints },
      '✓ Atribut titik berhasil diperbarui!'
    );
  };

  const handleDeletePoint = (pointId) => {
    const result = deletePoint(stations, pointId);
    if (selectedPointId === pointId) setSelectedPointId(null);
    updateActiveSegment(
      { ...activeSegment, stations: result.stations, allPoints: result.allPoints },
      '✓ Titik berhasil dihapus!'
    );
  };

  const handleAutoFixTrajectory = () => {
    const result = autoFixTrajectory(stations);
    updateActiveSegment(
      { ...activeSegment, stations: result.stations, allPoints: result.allPoints },
      result.movedCount > 0
        ? `✓ Trase dirapikan & ${result.movedCount} titik nyasar dikembalikan ke STA fisiknya!`
        : '✓ Trase jalan berhasil dirapikan secara spasial!'
    );
  };

  const handleGroupPointsIntoCrossSection = (pointIds, stationName = null) => {
    const result = groupPointsIntoCrossSection(stations, pointIds, stationName);
    updateActiveSegment(
      { ...activeSegment, stations: result.stations, allPoints: result.allPoints },
      `✓ Berhasil membuat 1 Penampang Melintang (Cross-Section) dari ${pointIds.length} titik!`
    );
  };

  const handleBatchShiftZ = (deltaZ) => {
    if (!activeSegment) return;
    const updatedPoints = activeSegment.allPoints.map((pt) => ({
      ...pt,
      z: parseFloat((pt.z + deltaZ).toFixed(3)),
    }));
    const reprocessed = processSurveyData(updatedPoints);
    const updatedSeg = {
      ...activeSegment,
      allPoints: reprocessed.allPoints,
      stations: reprocessed.stations,
    };
    updateActiveSegment(
      updatedSeg,
      `✓ Elevasi seluruh titik berhasil digeser ${deltaZ > 0 ? '+' : ''}${deltaZ} m`
    );
    setDatasetId((prev) => prev + 1);
  };

  const handleExportKml = () => {
    exportToGoogleEarthKml({
      projectName: activeProject.name,
      segments: activeProject.segments || [],
      utmZone,
    });
    showToast('✓ File Google Earth 3D (.KML) berhasil diunduh!');
  };

  const handleExportLandXml = () => {
    if (!activeSegment) return;
    downloadLandXmlFile(activeSegment, utmZone, activeProject.name);
    showToast('✓ File Civil 3D LandXML (.XML) berhasil diunduh!');
  };

  const handleSelectPoint = (pointId) => {
    setSelectedPointId(pointId);
  };


  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 select-none">
      {/* ================= HEADER / NAVBAR ================= */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-2.5 sm:px-3 lg:px-4 border-b border-slate-800 shrink-0 z-20 gap-2 overflow-x-auto scrollbar-none">
        {/* Left Zone: Brand & Project Selector */}
        <div className="flex items-center gap-2 lg:gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg shadow-sm flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm tracking-wide text-white leading-tight">GeoRoad CAD</h1>
                <span className="hidden lg:inline text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                  NADIRLABS
                </span>
              </div>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800 hidden md:block" />

          {/* Project Switcher Pill */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs transition-colors group"
              title={`Kelola atau ganti proyek (Total: ${workspace.projects.length} proyek)`}
            >
              <FolderKanban className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-semibold text-slate-100 truncate max-w-[90px] sm:max-w-[130px] lg:max-w-[180px]">
                {activeProject.name}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Compact UTM Zone Picker */}
            <select
              value={utmZone}
              onChange={(e) => handleUpdateProject(activeProject.id, { utmZone: e.target.value })}
              className="bg-slate-850 text-blue-400 border border-slate-700/80 rounded-lg px-1.5 sm:px-2 py-1.5 text-xs font-mono font-bold cursor-pointer hover:border-slate-500 focus:outline-none focus:border-blue-500 transition-colors w-[92px] sm:w-[105px]"
              title="Zona UTM Proyek"
            >
              <option value="48S">UTM 48S (Jabar)</option>
              <option value="49S">UTM 49S (Jateng)</option>
              <option value="50S">UTM 50S (Jatim)</option>
              <option value="47S">UTM 47S (Sumut)</option>
              <option value="46S">UTM 46S (Aceh)</option>
              <option value="51S">UTM 51S (Sulsel)</option>
              <option value="52S">UTM 52S (Maluku)</option>
              <option value="53S">UTM 53S (Papua Brt)</option>
              <option value="54S">UTM 54S (Papua)</option>
            </select>
          </div>
        </div>

        {/* Center Zone: Navigation Tabs */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shrink-0">
          <button
            onClick={() => setActiveTab('webgis')}
            className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'webgis'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
            title="Peta WebGIS & Editor As"
          >
            <Map className="w-3.5 h-3.5 shrink-0" />
            <span>Peta<span className="hidden xl:inline"> WebGIS</span></span>
          </button>
          <button
            onClick={() => setActiveTab('long')}
            className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'long'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
            title="Profil Memanjang (Long Section)"
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span>Long<span className="hidden xl:inline"> Section</span></span>
          </button>
          <button
            onClick={() => setActiveTab('cross')}
            className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'cross'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
            title="Profil Melintang (Cross Section)"
          >
            <Maximize2 className="w-3.5 h-3.5 shrink-0" />
            <span>Cross<span className="hidden xl:inline"> Section</span></span>
          </button>
          <button
            onClick={() => setActiveTab('corridor3d')}
            className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'corridor3d'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
            title="Model 3D Koridor Jalan"
          >
            <Box className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>3D<span className="hidden xl:inline"> Koridor</span></span>
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'table'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
            title="Tabel Data Atribut"
          >
            <Table className="w-3.5 h-3.5 shrink-0" />
            <span>Tabel<span className="hidden xl:inline"> Atribut</span></span>
          </button>
        </div>

        {/* Right Zone: Engineering Tools & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Engineering Tools Group */}
          <div className="flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setIsEarthworkModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-700/80 text-emerald-300 rounded-md text-xs font-semibold transition-colors"
              title="Hitung volume galian dan timbunan (Average End Area) & Diagram Mass Haul"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">Kubikasi</span>
            </button>

            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-700/80 text-amber-300 rounded-md text-xs font-semibold transition-colors"
              title="Audit lonjakan elevasi anomali, integritas patok, dan pergeseran elevasi massal"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">QC Trase</span>
            </button>

            <button
              onClick={() => setIsTitleBlockModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-700/80 text-indigo-200 rounded-md text-xs font-semibold transition-colors"
              title="Pengaturan Kop Gambar resmi Dinas PUPR / Bina Marga & Cetak PDF"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xl:inline">Kop & Cetak</span>
            </button>
          </div>

          {/* Import Data */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            title="Import data koordinat survey (Total Station / GPS Geodetik)"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Input Data</span>
          </button>

          {/* Primary CAD DWG/DXF Export */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0 whitespace-nowrap"
            title="Export desain koridor, trase & profil ke file AutoCAD (DWG / DXF) Keseluruhan"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Export DWG<span className="hidden sm:inline"> / DXF Keseluruhan</span></span>
          </button>

          {/* Other Formats Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg text-xs font-semibold transition-colors"
              title="Pilihan ekspor format lain (LandXML, KML, CSV, JSON)"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isExportDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsExportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-60 bg-slate-850 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-40 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/80">
                    Ekspor Berkas Proyek
                  </div>
                  <button
                    onClick={() => {
                      setIsExportModalOpen(true);
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-slate-700/80 hover:text-white transition-colors text-left"
                  >
                    <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">AutoCAD DWG / DXF Keseluruhan</div>
                      <div className="text-[10px] text-slate-400">1 file gabungan semua trase & profil</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      handleExportLandXml();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-slate-700/80 hover:text-white transition-colors text-left"
                  >
                    <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">Civil 3D LandXML (.XML)</div>
                      <div className="text-[10px] text-slate-400">Alignment & Cross Section resmi</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      handleExportKml();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-slate-700/80 hover:text-white transition-colors text-left"
                  >
                    <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">Google Earth 3D (.KML)</div>
                      <div className="text-[10px] text-slate-400">Visualisasi 3D medan & koridor</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      exportSurveyToCsv(allPoints, `${activeSegment?.name || 'Hasil_Ukur'}_${utmZone}.csv`);
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-slate-700/80 hover:text-white transition-colors text-left"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">Tabel Titik Koordinat (.CSV)</div>
                      <div className="text-[10px] text-slate-400">Point, STA, Offset & Elevasi</div>
                    </div>
                  </button>
                  <div className="border-t border-slate-700/80 my-1" />
                  <button
                    onClick={() => {
                      exportProjectToJson(activeProject);
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-slate-700/80 hover:text-white transition-colors text-left"
                  >
                    <FolderKanban className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">Cadangan Proyek (.JSON)</div>
                      <div className="text-[10px] text-slate-400">Simpan seluruh segmen & simpang</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>


      {/* ================= SECONDARY SUB-BAR: SEGMENTS & INTERSECTIONS ================= */}
      <SegmentManagerBar
        project={activeProject}
        activeSegmentId={activeSegment?.id}
        onSelectSegment={handleSelectSegment}
        onOpenIntersectionModal={() => setIsIntersectionModalOpen(true)}
        onAddSegment={handleAddSegment}
        onUpdateSegment={handleUpdateSegment}
        onDeleteSegment={handleDeleteSegment}
        showAllSegmentsOnMap={showAllSegmentsOnMap}
        setShowAllSegmentsOnMap={setShowAllSegmentsOnMap}
      />

      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-28 right-6 z-[1100] bg-slate-900/90 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2 backdrop-blur-md animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 overflow-hidden relative flex">
        <div className={`w-full h-full ${activeTab === 'webgis' ? 'flex' : 'hidden'}`}>
          {/* Interactive WebGIS View with Multi-Segment and Junction Support */}
          <div className="flex-1 h-full relative">
            <MapGISView
              stations={stations}
              allPoints={allPoints}
              utmZone={utmZone}
              selectedPointId={selectedPointId}
              datasetId={datasetId}
              isActive={activeTab === 'webgis'}
              onSelectPoint={handleSelectPoint}
              onChangePointRole={handleChangePointRole}
              onEditPoint={setEditingPoint}
              onAutoFixTrajectory={handleAutoFixTrajectory}
              segments={segments}
              activeSegmentId={activeSegment?.id}
              showAllSegments={showAllSegmentsOnMap}
              intersections={intersections}
              onSelectSegment={handleSelectSegment}
              onAddSegment={handleAddSegment}
              onUpdateSegment={handleUpdateSegment}
              onGroupPointsIntoCrossSection={handleGroupPointsIntoCrossSection}
            />

            {/* Floating button to restore Point Classifier Panel when collapsed */}
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-3 right-3 z-[400] px-3 py-1.5 bg-white/95 hover:bg-white text-slate-800 border border-slate-200 shadow-md rounded-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition-all hover:border-blue-400 cursor-pointer"
                title="Buka Panel Klasifikasi Titik & As Jalan"
              >
                <Target className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Klasifikasi Titik</span>
                <PanelRightOpen className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}
          </div>

          {/* Side Panel: Point Classifier for Active Segment */}
          {isSidebarOpen && (
            <PointClassifierPanel
              stations={stations}
              selectedPointId={selectedPointId}
              onSelectPoint={handleSelectPoint}
              onChangePointRole={handleChangePointRole}
              onFlipSides={handleFlipSides}
              onHarmonizeAll={handleHarmonizeAll}
              onAutoFixTrajectory={handleAutoFixTrajectory}
              onClearAllCenterlines={handleClearAllCenterlines}
              onEditPoint={setEditingPoint}
              onClose={() => setIsSidebarOpen(false)}
            />
          )}
        </div>

        {activeTab === 'long' && (
          <div className="w-full h-full">
            <LongSectionView
              stations={stations}
              selectedStationIndex={stations.findIndex((s) =>
                s.points.some((p) => p.id === selectedPointId)
              )}
              onExportDxf={() => setIsExportModalOpen(true)}
              activeSegmentName={activeSegment?.name}
              activeSegmentColor={activeSegment?.color}
              intersections={intersections}
              segments={segments}
              onSelectSegment={handleSelectSegment}
            />
          </div>
        )}

        {activeTab === 'cross' && (
          <div className="w-full h-full">
            <CrossSectionView
              stations={stations}
              selectedStationIndex={stations.findIndex((s) =>
                s.points.some((p) => p.id === selectedPointId)
              )}
              onExportDxf={() => setIsExportModalOpen(true)}
              activeSegmentName={activeSegment?.name}
              activeSegmentColor={activeSegment?.color}
              intersections={intersections}
              segments={segments}
              onSelectSegment={handleSelectSegment}
              roadTemplate={roadTemplate}
              onOpenEarthwork={(t) => {
                setRoadTemplate(t);
                setIsEarthworkModalOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'corridor3d' && (
          <div className="w-full h-full">
            <RoadCorridor3DView
              stations={stations}
              activeSegmentName={activeSegment?.name}
              activeSegmentColor={activeSegment?.color}
              utmZone={utmZone}
            />
          </div>
        )}

        {activeTab === 'table' && (
          <div className="w-full h-full">
            <AttributeTableView
              stations={stations}
              allPoints={allPoints}
              onEditPoint={setEditingPoint}
              onDeletePoint={handleDeletePoint}
            />
          </div>
        )}
      </main>

      {/* ================= MODALS ================= */}
      {/* 1. Project Manager Modal (Multi-Project & Multi-Location) */}
      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projects={workspace.projects}
        activeProjectId={workspace.activeProjectId}
        onSwitchProject={handleSwitchProject}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onDuplicateProject={handleDuplicateProject}
        onExportWorkspace={handleExportWorkspace}
        onImportWorkspace={handleImportWorkspace}
        onResetWorkspace={handleResetWorkspace}
      />

      {/* 2. Intersection Manager Modal (Road Intersections & Junction Ties) */}
      <IntersectionModal
        isOpen={isIntersectionModalOpen}
        onClose={() => setIsIntersectionModalOpen(false)}
        project={activeProject}
        onAddIntersection={handleAddIntersection}
        onDeleteIntersection={handleDeleteIntersection}
        onTieElevation={handleTieElevation}
      />

      {/* 3. Data Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        utmZone={utmZone}
        setUtmZone={(z) => handleUpdateProject(activeProject.id, { utmZone: z })}
        onImportData={handleImportSurveyData}
        onImportCadProject={handleImportCadProject}
        activeSegmentName={activeSegment?.name}
        activeSegmentColor={activeSegment?.color}
      />

      {/* 4. CAD Export Modal */}
      <CadExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        stations={stations}
        allPoints={allPoints}
        segments={segments}
        activeSegmentId={activeSegment?.id}
        activeSegmentName={activeSegment?.name}
        utmZone={utmZone}
      />

      {/* 5. Earthwork Cut & Fill Computation Modal */}
      <EarthworkReportModal
        isOpen={isEarthworkModalOpen}
        onClose={() => setIsEarthworkModalOpen(false)}
        stations={stations}
        activeSegmentName={activeSegment?.name}
        selectedTemplate={roadTemplate}
        onChangeTemplate={setRoadTemplate}
      />

      {/* 6. Survey Quality Control & Audit Modal */}
      <SurveyAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        stations={stations}
        allPoints={allPoints}
        activeSegmentName={activeSegment?.name}
        onApplyBatchShift={handleBatchShiftZ}
        onAutoHarmonize={handleHarmonizeAll}
      />

      {/* 7. Title Block & Official PUPR Print Layout Modal */}
      <TitleBlockModal
        isOpen={isTitleBlockModalOpen}
        onClose={() => setIsTitleBlockModalOpen(false)}
        projectInfo={activeProject}
        activeSegmentName={activeSegment?.name}
        stationsCount={stations.length}
      />

      {/* 8. Point Attributes Edit Modal */}
      <PointEditModal
        isOpen={!!editingPoint}
        onClose={() => setEditingPoint(null)}
        point={editingPoint}
        onSaveAttributes={handleUpdatePointAttributes}
        onDeletePoint={handleDeletePoint}
      />

    </div>
  );
}

