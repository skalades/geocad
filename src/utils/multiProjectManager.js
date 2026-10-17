/**
 * Multi-Project & Multi-Segment Management Utility
 * Supports independent projects, distinct locations / UTM zones,
 * multiple road segments per project, and road intersection (junction) connections.
 */

import {
  SAMPLE_SURVEY_DATA,
  parseSurveyRawText,
  processSurveyData,
  harmonizeAllStations,
} from './surveyParser';

export const WORKSPACE_STORAGE_KEY = 'georoad_survey_workspace_v3';
export const PREV_STORAGE_KEY = 'georoad_survey_workspace_v2';
export const LEGACY_STORAGE_KEY = 'georoad_survey_project_v1';

// Sample Branch Road Data (heads North from STA 0+050 of main road)
export const SAMPLE_BRANCH_ROAD_DATA = `NO	CODE	X	Y	ELEVATION
101	STA00	759221.484	9297048.333	43.337
102	STA00	759218.484	9297048.333	43.310
103	STA00	759224.484	9297048.333	43.310
110	STA025	759221.500	9297073.333	43.520
111	STA025	759218.200	9297073.333	43.480
112	STA025	759224.800	9297073.333	43.490
120	STA050	759221.600	9297098.333	43.710
121	STA050	759218.000	9297098.333	43.680
122	STA050	759225.000	9297098.333	43.690`;

/**
 * Creates the initial default project (Clean & Empty by default)
 */
export function createDefaultProject() {
  return {
    id: 'proj_default_01',
    name: 'Proyek Survei Baru',
    location: 'Karawang, Jawa Barat',
    client: 'Dinas Bina Marga & Penataan Ruang',
    surveyor: 'Tim Survei Topografi Geodesi',
    surveyDate: new Date().toISOString().split('T')[0],
    utmZone: '48S',
    activeSegmentId: 'seg_main_01',
    segments: [
      {
        id: 'seg_main_01',
        name: 'Ruas Utama',
        code: 'A',
        color: '#ef4444', // Red
        rawText: '',
        stations: [],
        allPoints: [],
      },
    ],
    intersections: [],
  };
}

/**
 * Detects if a project is legacy sample/demo data (Siliwangi / Melati)
 */
export function isSampleProject(p) {
  if (!p) return true;
  if (p.id === 'proj_default_01' || p.id === 'proj_migrated_01') {
    // If it has points or stations, it's the old sample project!
    const hasAnyPoints = (p.segments || []).some(
      (s) => (s.stations && s.stations.length > 0) || (s.allPoints && s.allPoints.length > 0)
    );
    if (hasAnyPoints) return true;
  }
  const name = (p.name || '').toLowerCase();
  if (name.includes('siliwangi') || name.includes('preservasi')) return true;
  const segs = p.segments || [];
  for (const s of segs) {
    const sName = (s.name || '').toLowerCase();
    if (sName.includes('siliwangi') || sName.includes('melati')) return true;
    if (s.rawText && (s.rawText.includes('759221.484') || s.rawText.includes('STA00\t759221'))) return true;
  }
  return false;
}

/**
 * Load workspace from LocalStorage or initialize with clean empty default
 */
export function loadWorkspaceFromStorage() {
  try {
    // Purge legacy storage keys completely
    try {
      localStorage.removeItem('georoad_survey_project_v1');
      localStorage.removeItem('georoad_survey_workspace');
      localStorage.removeItem('georoad_survey_workspace_v2');
    } catch (_) {}

    const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projects && parsed.projects.length > 0) {
        // Discard any sample/demo projects
        const validProjects = parsed.projects.filter((p) => !isSampleProject(p));
        if (validProjects.length > 0) {
          const activeId = validProjects.some((p) => p.id === parsed.activeProjectId)
            ? parsed.activeProjectId
            : validProjects[0].id;
          return {
            activeProjectId: activeId,
            projects: validProjects,
          };
        }
      }
    }
  } catch (e) {
    console.error('Error reading workspace storage:', e);
  }

  // Otherwise initialize default clean & empty project
  const defaultProj = createDefaultProject();
  const initialWorkspace = {
    activeProjectId: defaultProj.id,
    projects: [defaultProj],
  };
  saveWorkspaceToStorage(initialWorkspace);
  return initialWorkspace;
}

/**
 * Save workspace state to storage
 */
export function saveWorkspaceToStorage(workspace) {
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  } catch (e) {
    console.warn('Failed to save workspace to localStorage:', e);
  }
}

/**
 * Synchronize / Tie elevation of branch road CL to main road CL at intersection
 */
export function tieIntersectionElevations(project, intersectionId) {
  const intxn = project.intersections.find(i => i.id === intersectionId);
  if (!intxn) return project;

  const mainSeg = project.segments.find(s => s.id === intxn.mainSegmentId);
  const branchSeg = project.segments.find(s => s.id === intxn.branchSegmentId);
  if (!mainSeg || !branchSeg) return project;

  const mainSta = mainSeg.stations.find(s => s.stationName === intxn.mainStationName);
  const branchSta = branchSeg.stations.find(s => s.stationName === intxn.branchStationName);
  if (!mainSta || !branchSta || !mainSta.clPoint || !branchSta.clPoint) return project;

  const targetElev = mainSta.clPoint.z;
  const targetX = mainSta.clPoint.x;
  const targetY = mainSta.clPoint.y;

  // Clone project
  const updatedProject = JSON.parse(JSON.stringify(project));
  const updatedBranch = updatedProject.segments.find(s => s.id === intxn.branchSegmentId);
  const updatedBranchSta = updatedBranch.stations.find(s => s.stationName === intxn.branchStationName);

  if (updatedBranchSta && updatedBranchSta.clPoint) {
    // Tie branch CL elevation and position to junction
    updatedBranchSta.clPoint.z = targetElev;
    updatedBranchSta.clPoint.x = targetX;
    updatedBranchSta.clPoint.y = targetY;

    // Also update in allPoints
    const ptInAll = updatedBranch.allPoints.find(p => p.id === updatedBranchSta.clPoint.id);
    if (ptInAll) {
      ptInAll.z = targetElev;
      ptInAll.x = targetX;
      ptInAll.y = targetY;
    }
  }

  return updatedProject;
}
