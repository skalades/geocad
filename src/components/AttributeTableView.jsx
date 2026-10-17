import React, { useState, useMemo } from 'react';
import { Search, Edit3, Trash2, Download } from 'lucide-react';
import { exportSurveyToCsv } from '../utils/saveExportUtils';

export default function AttributeTableView({
  stations,
  allPoints,
  onEditPoint,
  onDeletePoint,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaFilter, setSelectedStaFilter] = useState('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Filtered points
  const filteredPoints = useMemo(() => {
    return allPoints.filter(pt => {
      // Station filter
      if (selectedStaFilter !== 'ALL' && pt.station !== selectedStaFilter) {
        return false;
      }
      // Role filter
      if (selectedRoleFilter !== 'ALL') {
        if (selectedRoleFilter === 'CL' && pt.role !== 'CL') return false;
        if (selectedRoleFilter === 'Ki' && !pt.role?.startsWith('Ki')) return false;
        if (selectedRoleFilter === 'Ka' && !pt.role?.startsWith('Ka')) return false;
      }
      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const noMatch = String(pt.rawNo || '').includes(term);
        const staMatch = String(pt.station || '').toLowerCase().includes(term);
        const remarkMatch = String(pt.remark || '').toLowerCase().includes(term);
        const roleMatch = String(pt.role || '').toLowerCase().includes(term);
        if (!noMatch && !staMatch && !remarkMatch && !roleMatch) return false;
      }
      return true;
    });
  }, [allPoints, selectedStaFilter, selectedRoleFilter, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Top Filter Toolbar */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari No, STA, atau Keterangan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Station Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Stasiun:</span>
            <select
              value={selectedStaFilter}
              onChange={e => setSelectedStaFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700"
            >
              <option value="ALL">Semua Stasiun ({stations.length})</option>
              {stations.map(s => (
                <option key={s.stationName} value={s.stationName}>
                  {s.stationName} ({s.points.length} titik)
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Peran:</span>
            <select
              value={selectedRoleFilter}
              onChange={e => setSelectedRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700"
            >
              <option value="ALL">Semua Peran</option>
              <option value="CL">★ As Jalan (CL)</option>
              <option value="Ki">Sisi Kiri (Ki)</option>
              <option value="Ka">Sisi Kanan (Ka)</option>
            </select>
          </div>
        </div>

        {/* Right Info & Export */}
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-[11px] font-mono">
            Menampilkan <strong>{filteredPoints.length}</strong> dari {allPoints.length} titik
          </span>
          <button
            onClick={() => exportSurveyToCsv(filteredPoints, 'Tabel_Atribut_Titik_Ukur.csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">#No</th>
                <th className="py-2.5 px-3">Stasiun (STA)</th>
                <th className="py-2.5 px-3">Peran Geometri</th>
                <th className="py-2.5 px-3 text-right">X (Easting)</th>
                <th className="py-2.5 px-3 text-right">Y (Northing)</th>
                <th className="py-2.5 px-3 text-right">Elevasi Z (m)</th>
                <th className="py-2.5 px-3 text-right">Offset (m)</th>
                <th className="py-2.5 px-3">Keterangan</th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredPoints.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                    Tidak ada titik yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredPoints.map((pt) => {
                  const isCL = pt.role === 'CL';
                  const isKi = pt.role?.startsWith('Ki');
                  const isKa = pt.role?.startsWith('Ka');

                  return (
                    <tr
                      key={pt.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCL ? 'bg-red-50/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-slate-700">
                        #{pt.rawNo}
                      </td>
                      <td className="py-2 px-3 font-sans font-semibold text-blue-700">
                        {pt.station || pt.rawCode}
                        {pt.codeDetail && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                            {pt.codeDetail}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            isCL
                              ? 'bg-red-100 text-red-700'
                              : isKi
                              ? 'bg-blue-100 text-blue-700'
                              : isKa
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isCL ? '★ CL (As Jalan)' : pt.role || 'P'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {pt?.x != null ? pt.x.toFixed(3) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {pt?.y != null ? pt.y.toFixed(3) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800">
                        {pt?.z != null ? pt.z.toFixed(3) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        <span className={isCL ? 'text-red-600' : 'text-slate-700'}>
                          {pt?.offset == null ? '-' : pt.offset === 0 ? '0.000' : (pt.offset > 0 ? `+${pt.offset.toFixed(3)}` : pt.offset.toFixed(3))}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-500 max-w-[200px] truncate">
                        {pt.remark || '-'}
                      </td>
                      <td className="py-2 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditPoint(pt)}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                            title="Edit Atribut Titik"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Hapus titik #${pt.rawNo} (${pt.station})?`)) {
                                onDeletePoint(pt.id);
                              }
                            }}
                            className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors"
                            title="Hapus Titik"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
