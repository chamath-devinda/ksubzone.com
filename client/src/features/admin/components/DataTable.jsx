'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  searchPlaceholder = 'Search records...',
  searchKey = null, // key to search locally on if no server-side search
  filterComponent = null,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your filters or search query.',
  initialSortKey = null,
  initialSortDir = 'asc',
  pageSize = 10
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState(initialSortDir);

  // 1. Local Search Filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim() || !searchKey) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(item => {
      const val = item[searchKey];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(term);
    });
  }, [data, searchTerm, searchKey]);

  // 2. Local Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortKey] ?? '';
      let bVal = b[sortKey] ?? '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir]);

  // 3. Local Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, sortedData.length);

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      {(searchKey || filterComponent) && (
        <div className="admin-table-toolbar flex flex-col sm:flex-row gap-3 items-center justify-between border border-white/[0.07] p-3 rounded-[18px]">
          {searchKey && (
            <div className="relative w-full sm:max-w-md">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-11 pl-11 pr-4 bg-black/20 border border-white/[0.08] rounded-[13px] focus:border-violet-400/60 outline-none text-slate-200 text-xs transition placeholder:text-slate-600"
              />
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
            </div>
          )}
          
          {filterComponent && (
            <div className="w-full sm:w-auto self-stretch sm:self-auto">
              {filterComponent}
            </div>
          )}
        </div>
      )}

      {/* Main Grid View / Table */}
      <div className="admin-data-table border border-white/[0.07] rounded-[20px] overflow-hidden">
        {loading ? (
          <Skeleton.Table rows={pageSize} />
        ) : paginatedData.length === 0 ? (
          <div className="py-16">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.07] bg-black/20 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-5 py-3.5 ${col.sortable ? 'cursor-pointer hover:text-white select-none' : ''} ${col.headerAlign || ''}`}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <div className={`flex items-center gap-1.5 ${col.headerAlign === 'text-right' ? 'justify-end' : ''}`}>
                          {col.label}
                          {col.sortable && sortKey === col.key && (
                            sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.055] text-xs text-slate-300">
                  {paginatedData.map((row, idx) => (
                    <tr key={row._id || row.id || idx} className="group hover:bg-violet-500/[0.035] transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className={`px-5 py-[15px] max-w-[320px] truncate ${col.cellAlign || ''}`}>
                          {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden divide-y divide-white/[0.06]">
              {paginatedData.map((row, idx) => (
                <div key={row._id || row.id || idx} className="p-5 space-y-4 hover:bg-violet-500/[0.035] transition-colors">
                  {columns.map((col) => {
                    if (col.key === 'actions') {
                      return (
                        <div key={col.key} className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.04]">
                          {col.render ? col.render(row[col.key], row) : null}
                        </div>
                      );
                    }
                    return (
                      <div key={col.key} className="flex justify-between gap-4 items-start text-xs">
                        <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 pt-0.5">{col.label}</span>
                        <div className="text-slate-200 text-right truncate max-w-[240px]">
                          {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {sortedData.length > pageSize && (
          <div className="px-5 py-4 border-t border-white/[0.07] bg-black/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <span>
              Showing <b className="text-slate-200">{startIdx}</b> to <b className="text-slate-200">{endIdx}</b> of <b className="text-slate-200">{sortedData.length}</b> records
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="flex-1 sm:flex-initial h-9 px-4 rounded-xl border border-white/[0.08] bg-white/[0.025] text-[11px] font-semibold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06] hover:text-white transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="flex-1 sm:flex-initial h-9 px-4 rounded-xl border border-white/[0.08] bg-white/[0.025] text-[11px] font-semibold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06] hover:text-white transition flex items-center justify-center gap-1.5"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
