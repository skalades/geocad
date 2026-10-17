/**
 * Utilities for saving project, exporting CSV, and saving SVG / PNG drawings
 */

/**
 * Save SVG element as downloadable SVG file
 */
export function saveSvgToFile(svgElement, filename = 'gambar_teknik.svg') {
  if (!svgElement) return;
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // Add xml namespace if not present
  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Save SVG element as high-resolution PNG file
 */
export function saveSvgToPng(svgElement, filename = 'gambar_teknik.png', scale = 2) {
  if (!svgElement) return;
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();

  img.onload = () => {
    const canvas = document.createElement('canvas');
    const attrW = parseFloat(svgElement.getAttribute('width'));
    const attrH = parseFloat(svgElement.getAttribute('height'));
    const bbox = svgElement.getBoundingClientRect();
    const width = attrW || bbox.width || 800;
    const height = attrH || bbox.height || 500;

    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background for technical drawing
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };

  img.src = url;
}

/**
 * Export Survey Points with Roles and Offsets as CSV
 */
export function exportSurveyToCsv(allPoints, filename = 'Data_Hasil_Ukur_Jalan.csv') {
  if (!allPoints || allPoints.length === 0) return;

  const header = ['NO', 'STATION', 'KODE_PERAN', 'X_EASTING', 'Y_NORTHING', 'ELEVATION_Z', 'OFFSET_FROM_CL_M'];
  const rows = allPoints.map((pt, idx) => [
    pt.rawNo || idx + 1,
    `"${pt.station || pt.rawCode}"`,
    `"${pt.role || ''}"`,
    pt?.x != null ? pt.x.toFixed(3) : '',
    pt?.y != null ? pt.y.toFixed(3) : '',
    pt?.z != null ? pt.z.toFixed(3) : '',
    pt?.offset != null ? pt.offset.toFixed(3) : '0.000',
  ]);

  const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Survey Points in Autodesk Civil 3D Standard Point File format (PNEZD / PENZD)
 * Format PNEZD: Point Number, Northing Y, Easting X, Elevation Z, Description
 * Can be imported directly into Civil 3D using "Points > Import Points".
 */
export function exportCivil3dPointsPnezd(allPoints, filename = 'Titik_Survei_Civil3D_PNEZD.csv', format = 'PNEZD') {
  if (!allPoints || allPoints.length === 0) return;

  const isPnezd = format.toUpperCase() === 'PNEZD';
  const header = isPnezd
    ? ['POINT_NO', 'NORTHING_Y', 'EASTING_X', 'ELEVATION_Z', 'DESCRIPTION']
    : ['POINT_NO', 'EASTING_X', 'NORTHING_Y', 'ELEVATION_Z', 'DESCRIPTION'];

  const rows = allPoints.map((pt, idx) => {
    const ptNo = pt.rawNo || idx + 1;
    const easting = pt?.x != null ? Number(pt.x).toFixed(4) : '0.0000';
    const northing = pt?.y != null ? Number(pt.y).toFixed(4) : '0.0000';
    const elev = pt?.z != null ? Number(pt.z).toFixed(4) : '0.0000';
    const desc = (pt.code || pt.role || pt.station || 'SURVEY').replace(/[,\r\n]/g, '_');

    return isPnezd
      ? [ptNo, northing, easting, elev, `"${desc}"`]
      : [ptNo, easting, northing, elev, `"${desc}"`];
  });

  const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export full project state as JSON file
 */
export function exportProjectToJson(projectData, filename = 'Proyek_Survei_Jalan.georoad.json') {
  const jsonContent = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
