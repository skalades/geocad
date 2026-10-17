import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Square } from 'lucide-react';

export default function RoadCorridor3DView({
  stations = [],
  activeSegmentName = '',
  activeSegmentColor = '#ef4444',
  _utmZone = '49S',
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const reqAnimRef = useRef(null);
  const isPlayingDriveThroughRef = useRef(false);
  const driveProgressRef = useRef(0);

  const [zExaggeration, setZExaggeration] = useState(3.0); // 3x vertical exaggeration
  const [isPlayingDrive, setIsPlayingDrive] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);

  // Extract valid centerline and station points
  const corridorData = React.useMemo(() => {
    if (!stations || stations.length === 0) return null;
    const valid = stations.filter((s) => s.clPoint);
    if (valid.length === 0) return null;

    // Local coordinates centered around first CL point
    const originX = valid[0].clPoint.x;
    const originY = valid[0].clPoint.y;
    const originZ = valid[0].clPoint.z;

    const clPoints = valid.map((s) => ({
      stationName: s.stationName,
      x: s.clPoint.x - originX,
      y: s.clPoint.y - originY,
      z: s.clPoint.z - originZ,
      cumDist: s.cumulativeDist,
      pts: (s.points || []).map((p) => ({
        x: p.x - originX,
        y: p.y - originY,
        z: p.z - originZ,
        offset: p.offset || 0,
        role: p.role,
      })),
    }));

    return { originX, originY, originZ, clPoints };
  }, [stations]);

  // Setup Three.js Scene
  useEffect(() => {
    if (!mountRef.current || !corridorData) return;

    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 550;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d); // Deep blueprint CAD dark
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0015);
    sceneRef.current = scene;

    // Camera (Z is Up in engineering, so we orient Three.js camera)
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
    camera.up.set(0, 0, 1); // Z-up!
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    mountRef.current.replaceChildren(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(300, 300, 500);
    scene.add(dirLight);

    // Grid Floor
    const grid = new THREE.GridHelper(1000, 40, 0x1e293b, 0x0f172a);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    // Build 3D Road Mesh & Ribs
    const { clPoints } = corridorData;

    // 1. Centerline 3D Line
    const clLinePts = clPoints.map(
      (p) => new THREE.Vector3(p.x, p.y, p.z * zExaggeration + 0.1)
    );
    const clCurve = new THREE.CatmullRomCurve3(clLinePts);

    const clGeom = new THREE.BufferGeometry().setFromPoints(clCurve.getPoints(clPoints.length * 8));
    const clMat = new THREE.LineBasicMaterial({ color: 0xff3366, linewidth: 3 });
    const clLine = new THREE.Line(clGeom, clMat);
    scene.add(clLine);

    // 2. Terrain Surface & Road Ribs
    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    // Connect cross section points between adjacent stations to form road corridor mesh
    for (let i = 0; i < clPoints.length - 1; i++) {
      const s1 = clPoints[i];
      const s2 = clPoints[i + 1];

      // Sort points Left to Right
      const pts1 = [...s1.pts].sort((a, b) => a.offset - b.offset);
      const pts2 = [...s2.pts].sort((a, b) => a.offset - b.offset);

      if (pts1.length >= 2 && pts2.length >= 2) {
        // Build corridor ribbon
        const geom = new THREE.BufferGeometry();
        const vertices = [];

        // Sample along cross-sections
        const minL = Math.min(pts1.length, pts2.length);
        for (let j = 0; j < minL - 1; j++) {
          const p1A = pts1[j];
          const p1B = pts1[j + 1];
          const p2A = pts2[j];
          const p2B = pts2[j + 1];

          // Triangle 1
          vertices.push(
            p1A.x, p1A.y, p1A.z * zExaggeration,
            p2A.x, p2A.y, p2A.z * zExaggeration,
            p1B.x, p1B.y, p1B.z * zExaggeration
          );
          // Triangle 2
          vertices.push(
            p1B.x, p1B.y, p1B.z * zExaggeration,
            p2A.x, p2A.y, p2A.z * zExaggeration,
            p2B.x, p2B.y, p2B.z * zExaggeration
          );
        }

        geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geom.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
          color: 0x334155, // Asphalt dark
          roughness: 0.8,
          metalness: 0.2,
          wireframe: wireframeMode,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geom, mat);
        terrainGroup.add(mesh);
      }

      // Draw Station Rib Cross-lines
      const ribPts = s1.pts.map(
        (p) => new THREE.Vector3(p.x, p.y, p.z * zExaggeration)
      );
      if (ribPts.length > 1) {
        const ribGeom = new THREE.BufferGeometry().setFromPoints(ribPts);
        const ribMat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.7 });
        terrainGroup.add(new THREE.Line(ribGeom, ribMat));
      }

      // Station Marker Spheres at Centerline
      const markerGeom = new THREE.SphereGeometry(1.2, 12, 12);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const marker = new THREE.Mesh(markerGeom, markerMat);
      marker.position.set(s1.x, s1.y, s1.z * zExaggeration);
      terrainGroup.add(marker);
    }

    // Default Camera Position: Look at center of road
    const midPt = clPoints[Math.floor(clPoints.length / 2)];
    const cameraTarget = new THREE.Vector3(midPt.x, midPt.y, midPt.z * zExaggeration);

    camera.position.set(midPt.x - 120, midPt.y - 120, midPt.z * zExaggeration + 80);
    camera.lookAt(cameraTarget);

    // Orbit Drag State
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = {
      radius: 180,
      theta: Math.PI / 4,
      phi: Math.PI / 3,
    };

    const updateCameraFromOrbit = () => {
      const x = cameraTarget.x + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      const y = cameraTarget.y + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      const z = cameraTarget.z + spherical.radius * Math.cos(spherical.phi);
      camera.position.set(x, y, Math.max(cameraTarget.z + 5, z));
      camera.lookAt(cameraTarget);
    };

    updateCameraFromOrbit();

    // Mouse handlers
    const dom = renderer.domElement;
    const onMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging || isPlayingDriveThroughRef.current) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      spherical.theta -= dx * 0.008;
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi - dy * 0.008));
      updateCameraFromOrbit();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      spherical.radius = Math.max(20, Math.min(1000, spherical.radius + e.deltaY * 0.25));
      updateCameraFromOrbit();
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Render loop
    const animate = () => {
      reqAnimRef.current = requestAnimationFrame(animate);

      // Handle Drive-Through animation along centerline
      if (isPlayingDriveThroughRef.current && clCurve) {
        driveProgressRef.current = (driveProgressRef.current + 0.0018) % 1.0;
        const pt = clCurve.getPointAt(driveProgressRef.current);
        const lookAheadPt = clCurve.getPointAt(Math.min(1.0, driveProgressRef.current + 0.02));

        // Camera sitting at windshield level (height 1.8m above road)
        camera.position.set(pt.x, pt.y, pt.z + 2.5);
        camera.lookAt(lookAheadPt.x, lookAheadPt.y, lookAheadPt.z + 2.0);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqAnimRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('mousedown', onMouseDown);
      dom.removeEventListener('wheel', onWheel);

      // Dispose all GPU geometries and materials to prevent VRAM memory leak
      scene.traverse((obj) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
    };
  }, [corridorData, zExaggeration, wireframeMode]);

  // Toggle Drive-through
  const handleToggleDrive = () => {
    const next = !isPlayingDrive;
    setIsPlayingDrive(next);
    isPlayingDriveThroughRef.current = next;
    if (!next && cameraRef.current && corridorData) {
      // Reset view
      const midPt = corridorData.clPoints[Math.floor(corridorData.clPoints.length / 2)];
      cameraRef.current.position.set(midPt.x - 120, midPt.y - 120, midPt.z * zExaggeration + 80);
      cameraRef.current.lookAt(midPt.x, midPt.y, midPt.z * zExaggeration);
    }
  };

  if (!corridorData) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 bg-slate-900">
        Belum ada data stasiun jalan untuk divisualisasikan dalam bentuk 3D.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] relative overflow-hidden select-none">
      {/* 3D Top Floating Toolbar */}
      <div className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700 p-1.5 rounded-xl text-xs text-slate-200 shadow-xl">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-lg font-bold border border-slate-700">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: activeSegmentColor }}
            />
            <span>3D Koridor: {activeSegmentName}</span>
          </div>

          <div className="w-px h-4 bg-slate-700" />

          {/* Drive-Through Button */}
          <button
            onClick={handleToggleDrive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all shadow-xs ${
              isPlayingDrive
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isPlayingDrive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlayingDrive ? 'Hentikan Simulasi' : 'Simulasi Drive-Through 3D'}</span>
          </button>

          <div className="w-px h-4 bg-slate-700" />

          {/* Wireframe Toggle */}
          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
              wireframeMode ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 hover:bg-slate-800 text-slate-300'
            }`}
          >
            TIN Wireframe
          </button>
        </div>

        {/* Right Exaggeration Controls */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-200 shadow-xl">
          <span className="font-semibold text-slate-400">Skala Z:</span>
          {[1, 2, 3, 5].map((zVal) => (
            <button
              key={zVal}
              onClick={() => setZExaggeration(zVal)}
              className={`px-2 py-0.5 rounded font-bold font-mono transition-colors ${
                zExaggeration === zVal
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {zVal}x
            </button>
          ))}
        </div>
      </div>

      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Bottom Information Tip */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900/80 backdrop-blur-md border border-slate-800 px-4 py-1.5 rounded-full text-[11px] text-slate-400 shadow-lg flex items-center gap-3">
        <span>🖱️ Drag Kiri: Putar Kamera Orbit</span>
        <span className="text-slate-600">&bull;</span>
        <span>Scroll: Zoom In / Out</span>
        <span className="text-slate-600">&bull;</span>
        <span className="text-blue-400 font-bold">Total {corridorData.clPoints.length} Stasiun</span>
      </div>
    </div>
  );
}
