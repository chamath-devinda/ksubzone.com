'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="space-y-3.5">
      {/* Search & Filter Toolbar */}
      {(searchKey || filterComponent) && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border border-white/[0.06] bg-[#11131A] p-2.5 sm:p-3 rounded-xl shadow-sm">
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
                className="w-full h-9 pl-9 pr-3.5 bg-[#08090D] border border-white/[0.08] rounded-lg focus:border-violet-500 outline-none text-slate-100 text-xs transition placeholder:text-slate-500"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
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
      <div className="border border-white/[0.06] bg-[#11131A] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <Skeleton.Table rows={pageSize} />
        ) : paginatedData.length === 0 ? (
          <div className="py-14">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[#151821] text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 ${col.sortable ? 'cursor-pointer hover:text-slate-200 select-none' : ''} ${col.headerAlign || ''}`}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <div className={`flex items-center gap-1.5 ${col.headerAlign === 'text-right' ? 'justify-end' : ''}`}>
                          {col.label}
                          {col.sortable && sortKey === col.key && (
                            sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-violet-400" /> : <ChevronDown className="w-3 h-3 text-violet-400" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs text-slate-300">
                  {paginatedData.map((row, idx) => (
                    <tr key={row._id || row.id || idx} className="group hover:bg-[#151821]/60 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3 max-w-[320px] truncate ${col.cellAlign || ''}`}>
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
                <div key={row._id || row.id || idx} className="p-4 space-y-3 hover:bg-[#151821]/60 transition-colors">
                  {columns.map((col) => {
                    if (col.key === 'actions') {
                      return (
                        <div key={col.key} className="flex justify-end gap-2 pt-2 border-t border-white/[0.04]">
                          {col.render ? col.render(row[col.key], row) : null}
                        </div>
                      );
                    }
                    return (
                      <div key={col.key} className="flex items-center justify-between text-xs gap-3">
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{col.label}</span>
                        <div className="text-slate-200 truncate font-medium">
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

        {/* Bottom Pagination */}
        {sortedData.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.06] bg-[#0D0F15] text-xs text-slate-400">
            <span className="text-[11px] text-slate-500 font-mono">
              Showing <b className="text-slate-300">{startIdx}</b> to <b className="text-slate-300">{endIdx}</b> of <b className="text-slate-300">{sortedData.length}</b> records
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-[#151821] text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              
              <span className="px-2 text-xs font-mono text-slate-400">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-[#151821] text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
