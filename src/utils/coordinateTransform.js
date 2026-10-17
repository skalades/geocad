import proj4 from 'proj4';

// Register standard WGS84
const WGS84 = 'EPSG:4326';

export const UTM_ZONES = [
  { value: '46S', label: 'UTM Zone 46S (Aceh Barat / Simeulue)' },
  { value: '47S', label: 'UTM Zone 47S (Sumatera Utara / Riau Barat)' },
  { value: '48S', label: 'UTM Zone 48S (DKI Jakarta, Banten, Jabar Barat, Lampung)' },
  { value: '49S', label: 'UTM Zone 49S (Jabar Timur, Jateng, DIY, Jatim Barat)' },
  { value: '50S', label: 'UTM Zone 50S (Jatim Timur, Bali, Lombok, Kalsel, Kaltim)' },
  { value: '51S', label: 'UTM Zone 51S (NTB, NTT, Sulawesi Selatan / Tenggara)' },
  { value: '52S', label: 'UTM Zone 52S (Maluku, Maluku Utara, NTT Timur)' },
  { value: '53S', label: 'UTM Zone 53S (Papua Barat, Fakfak, Mimika)' },
  { value: '54S', label: 'UTM Zone 54S (Papua, Jayapura, Merauke)' },
  { value: '47N', label: 'UTM Zone 47N (Banda Aceh utara)' },
  { value: '48N', label: 'UTM Zone 48N (Kepulauan Riau / Natuna Barat)' },
  { value: '49N', label: 'UTM Zone 49N (Natuna, Kalimantan Barat Utara)' },
  { value: '50N', label: 'UTM Zone 50N (Kalimantan Utara)' },
  { value: '51N', label: 'UTM Zone 51N (Sulawesi Utara, Sangihe)' },
  { value: '52N', label: 'UTM Zone 52N (Morotai / Halmahera Utara)' },
];

/**
 * Gets or defines a proj4 UTM projection string
 * @param {string} zoneCode - e.g. "49S" or "48N"
 */
export function getUtmProjString(zoneCode) {
  const match = zoneCode.match(/^(\d+)([NnSs])$/);
  if (!match) {
    throw new Error(`Format zona UTM tidak valid: ${zoneCode}`);
  }
  const zone = parseInt(match[1], 10);
  const isSouth = match[2].toUpperCase() === 'S';
  return `+proj=utm +zone=${zone} ${isSouth ? '+south' : ''} +datum=WGS84 +units=m +no_defs`;
}

/**
 * Convert UTM (Easting/X, Northing/Y) to WGS84 Lat/Lng
 * @param {number} x - Easting
 * @param {number} y - Northing
 * @param {string} zoneCode - e.g. "49S"
 * @returns {[number, number]} [lat, lng]
 */
export function utmToLatLng(x, y, zoneCode = '49S') {
  try {
    const utmProj = getUtmProjString(zoneCode);
    // proj4 converts from source to destination. Returns [lng, lat]
    const [lng, lat] = proj4(utmProj, WGS84, [x, y]);
    return [lat, lng];
  } catch (error) {
    console.error('Error transforming UTM to LatLng:', error);
    return [0, 0];
  }
}

/**
 * Convert WGS84 Lat/Lng to UTM (Easting/X, Northing/Y)
 * @param {number} lat
 * @param {number} lng
 * @param {string} zoneCode
 * @returns {[number, number]} [x, y]
 */
export function latLngToUtm(lat, lng, zoneCode = '49S') {
  try {
    const utmProj = getUtmProjString(zoneCode);
    const [x, y] = proj4(WGS84, utmProj, [lng, lat]);
    return [x, y];
  } catch (error) {
    console.error('Error transforming LatLng to UTM:', error);
    return [0, 0];
  }
}
