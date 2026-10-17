/**
 * KML / KMZ Exporter for Google Earth 3D Visualization
 * Exports 3D Centerline road alignment, left/right edge corridors,
 * and station placemarks with survey elevations.
 */

import { utmToLatLng } from './coordinateTransform';

/**
 * Generate 3D KML text string from project segments
 */
export function generateProjectKml({
  projectName = 'GeoRoad Project',
  segments = [],
  utmZone = '49S',
}) {
  const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(projectName)}</name>
    <description>Trase Jalan &amp; Titik Survei GeoRoad CAD (3D Elevation)</description>

    <!-- Styles -->
    <Style id="clRoadStyle">
      <LineStyle>
        <color>ff0000ff</color> <!-- Red ABGR -->
        <width>4</width>
      </LineStyle>
      <PolyStyle>
        <color>440000ff</color>
      </PolyStyle>
    </Style>

    <Style id="edgeRoadStyle">
      <LineStyle>
        <color>ff00ffff</color> <!-- Yellow ABGR -->
        <width>2</width>
      </LineStyle>
    </Style>

    <Style id="stationPinStyle">
      <IconStyle>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <scale>0.8</scale>
        <color>ffffffff</color>
      </LabelStyle>
    </Style>
`;

  let kmlBody = '';

  segments.forEach((seg) => {
    const stations = seg.stations || [];
    const validStations = stations.filter((s) => s.clPoint);
    if (validStations.length === 0) return;

    kmlBody += `    <Folder>
      <name>${escapeXml(seg.name || 'Ruas Jalan')}</name>
      <open>1</open>
`;

    // 1. Centerline 3D LineString
    const clCoords = validStations
      .map((s) => {
        const [lat, lng] = utmToLatLng(s.clPoint.x, s.clPoint.y, utmZone);
        return `${lng},${lat},${s.clPoint.z.toFixed(2)}`;
      })
      .join(' ');

    kmlBody += `      <Placemark>
        <name>As Jalan (CL) - ${escapeXml(seg.name)}</name>
        <styleUrl>#clRoadStyle</styleUrl>
        <LineString>
          <extrude>1</extrude>
          <tessellate>1</tessellate>
          <altitudeMode>absolute</altitudeMode>
          <coordinates>${clCoords}</coordinates>
        </LineString>
      </Placemark>
`;

    // 2. Left and Right Edges 3D LineStrings
    const leftCoords = [];
    const rightCoords = [];

    validStations.forEach((s) => {
      const sortedPts = [...(s.points || [])].sort((a, b) => a.offset - b.offset);
      if (sortedPts.length > 0) {
        const leftPt = sortedPts[0];
        const rightPt = sortedPts[sortedPts.length - 1];
        if (leftPt) {
          const [latL, lngL] = utmToLatLng(leftPt.x, leftPt.y, utmZone);
          leftCoords.push(`${lngL},${latL},${leftPt.z.toFixed(2)}`);
        }
        if (rightPt) {
          const [latR, lngR] = utmToLatLng(rightPt.x, rightPt.y, utmZone);
          rightCoords.push(`${lngR},${latR},${rightPt.z.toFixed(2)}`);
        }
      }
    });

    if (leftCoords.length > 1) {
      kmlBody += `      <Placemark>
        <name>Batas Kiri (Ki) - ${escapeXml(seg.name)}</name>
        <styleUrl>#edgeRoadStyle</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <altitudeMode>absolute</altitudeMode>
          <coordinates>${leftCoords.join(' ')}</coordinates>
        </LineString>
      </Placemark>
`;
    }

    if (rightCoords.length > 1) {
      kmlBody += `      <Placemark>
        <name>Batas Kanan (Ka) - ${escapeXml(seg.name)}</name>
        <styleUrl>#edgeRoadStyle</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <altitudeMode>absolute</altitudeMode>
          <coordinates>${rightCoords.join(' ')}</coordinates>
        </LineString>
      </Placemark>
`;
    }

    // 3. Station Placemarks
    kmlBody += `      <Folder>
        <name>Stasiun Patok (STA)</name>
`;
    validStations.forEach((s) => {
      const [lat, lng] = utmToLatLng(s.clPoint.x, s.clPoint.y, utmZone);
      const descHtml = `<![CDATA[
        <h3>${escapeXml(s.stationName)}</h3>
        <table border="1" cellpadding="4" style="border-collapse:collapse;font-family:sans-serif;font-size:12px;">
          <tr><td><b>Ruas</b></td><td>${escapeXml(seg.name)}</td></tr>
          <tr><td><b>Jarak Kumulatif</b></td><td>${s.cumulativeDist.toFixed(2)} m</td></tr>
          <tr><td><b>Elevasi As (CL)</b></td><td>${s.clPoint.z.toFixed(3)} m</td></tr>
          <tr><td><b>Koordinat UTM X (East)</b></td><td>${s.clPoint.x.toFixed(3)} m</td></tr>
          <tr><td><b>Koordinat UTM Y (North)</b></td><td>${s.clPoint.y.toFixed(3)} m</td></tr>
          <tr><td><b>Zona UTM</b></td><td>${utmZone}</td></tr>
          <tr><td><b>Jumlah Titik Potongan</b></td><td>${s.points?.length || 0} titik</td></tr>
        </table>
      ]]>`;

      kmlBody += `        <Placemark>
          <name>${escapeXml(s.stationName)}</name>
          <description>${descHtml}</description>
          <styleUrl>#stationPinStyle</styleUrl>
          <Point>
            <altitudeMode>absolute</altitudeMode>
            <coordinates>${lng},${lat},${s.clPoint.z.toFixed(2)}</coordinates>
          </Point>
        </Placemark>
`;
    });

    kmlBody += `      </Folder>
    </Folder>
`;
  });

  const kmlFooter = `  </Document>
</kml>`;

  return kmlHeader + kmlBody + kmlFooter;
}

/**
 * Trigger download of Google Earth KML
 */
export function exportToGoogleEarthKml({
  projectName = 'GeoRoad',
  segments = [],
  utmZone = '49S',
}) {
  const kmlContent = generateProjectKml({ projectName, segments, utmZone });
  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `${safeName}_GoogleEarth_3D.kml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
