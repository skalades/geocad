/**
 * LandXML (v1.2) Importer & Exporter for AutoCAD Civil 3D, Bentley OpenRoads, 12d Model
 * Exports road alignments, profiles, and survey cross-sections.
 */

/**
 * Generate LandXML 1.2 string from segment stations
 */
export function exportSegmentToLandXml(segment, utmZone = '49S', projectName = 'GeoRoad CAD') {
  const rawStations = segment?.stations || [];
  const stations = rawStations.map(s => {
    let clPoint = s.clPoint;
    if (!clPoint && s.points && s.points.length > 0) {
      const byCode = s.points.find(p => p.role === 'CL' || /^cl\b/i.test(p.code || '') || /^as\b/i.test(p.code || ''));
      const byOffset = s.points.find(p => Math.abs(p.offset || 0) < 0.05);
      clPoint = byCode || byOffset || s.points[Math.floor(s.points.length / 2)];
    }
    return { ...s, clPoint };
  });

  const valid = stations.filter((s) => s.clPoint);
  if (valid.length === 0) return '';

  let runningDist = 0;
  valid.forEach((s, idx) => {
    if (idx > 0) {
      const d = Math.hypot(s.clPoint.x - valid[idx - 1].clPoint.x, s.clPoint.y - valid[idx - 1].clPoint.y);
      runningDist += d;
      if (s.cumulativeDist == null) s.cumulativeDist = runningDist;
    } else {
      if (s.cumulativeDist == null) s.cumulativeDist = 0;
    }
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const segName = escapeXml(segment.name || 'Alignment_1');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.landxml.org/schema/LandXML-1.2 http://www.landxml.org/schema/LandXML-1.2/LandXML-1.2.xsd"
  date="${dateStr}" time="12:00:00" version="1.2" language="English" readOnly="false">
  <Project name="${escapeXml(projectName)}" />
  <Application name="GeoRoad CAD" version="1.0" manufacturer="GeoRoad Engineering" />
  <CoordinateSystem desc="UTM Zone ${utmZone}" epsgCode="${utmZone}" />
  <Alignments name="${segName}_Alignments">
    <Alignment name="${segName}" length="${valid[valid.length - 1].cumulativeDist.toFixed(3)}" staStart="0.0">
      <CoordGeom>
`;

  // Alignment Line segments between successive CL points
  for (let i = 0; i < valid.length - 1; i++) {
    const p1 = valid[i].clPoint;
    const p2 = valid[i + 1].clPoint;
    // Note: LandXML uses Northing(Y) Easting(X)
    xml += `        <Line dir="${calculateAzimuth(p1, p2).toFixed(4)}" length="${Math.hypot(p2.x - p1.x, p2.y - p1.y).toFixed(3)}">
          <Start>${p1.y.toFixed(4)} ${p1.x.toFixed(4)}</Start>
          <End>${p2.y.toFixed(4)} ${p2.x.toFixed(4)}</End>
        </Line>\n`;
  }

  xml += `      </CoordGeom>
      <Profile name="${segName}_Existing_Ground">
        <ProfAlign name="ExistingGround_CL">
`;

  // Profile PVI points along centerline
  valid.forEach((s) => {
    xml += `          <PVI>${s.cumulativeDist.toFixed(3)} ${s.clPoint.z.toFixed(3)}</PVI>\n`;
  });

  xml += `        </ProfAlign>
      </Profile>
      <CrossSections>
`;

  // Cross Sections for each station
  valid.forEach((s) => {
    const pts = [...(s.points || [])].sort((a, b) => a.offset - b.offset);
    xml += `        <CrossSect sta="${s.cumulativeDist.toFixed(3)}">
          <DesignCrossSect surfType="existing">
            <CrossSectSurf name="EG">
`;
    // CrossSectPnt: offset elevation
    pts.forEach((p) => {
      xml += `              <CrossSectPnt>${p.offset.toFixed(3)} ${p.z.toFixed(3)}</CrossSectPnt>\n`;
    });

    xml += `            </CrossSectSurf>
          </DesignCrossSect>
        </CrossSect>\n`;
  });

  xml += `      </CrossSections>
    </Alignment>
  </Alignments>
</LandXML>`;

  return xml;
}

/**
 * Download LandXML file
 */
export function downloadLandXmlFile(segment, utmZone = '49S', projectName = 'GeoRoad') {
  const xml = exportSegmentToLandXml(segment, utmZone, projectName);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = (segment.name || 'Segment').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `${safeName}_Civil3D.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function calculateAzimuth(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let rad = Math.atan2(dx, dy);
  if (rad < 0) rad += 2 * Math.PI;
  return rad;
}

function escapeXml(unsafe = '') {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
