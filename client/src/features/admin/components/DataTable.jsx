'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // 1. Local Search Filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim() || !searchKey) return safeData;
    const term = searchTerm.toLowerCase();
    return safeData.filter(item => {
      const val = item[searchKey];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(term);
    });
  }, [safeData, searchTerm, searchKey]);

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
  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);
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
        <div className="dashstack-card doit-table-toolbar flex flex-col sm:flex-row gap-3 items-center justify-between p-3.5 rounded-[20px]">
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
                className="w-full h-9.5 pl-9 pr-3.5 bg-[#F5F6FA] dark:bg-[#1B2431] border border-[#EAEBF0] dark:border-[#313D4F] rounded-xl focus:border-[#490570] focus:ring-2 focus:ring-[#490570]/20 outline-none text-[#202224] dark:text-slate-100 text-xs transition placeholder:text-slate-400"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
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
      <div className="dashstack-card doit-data-table rounded-[22px] overflow-hidden">
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
                  <tr className="border-b border-[#EAEBF0] dark:border-[#313D4F] bg-[#F9FAFB] dark:bg-[#1B2431]/70 text-[11px] font-bold uppercase tracking-wider text-[#404040] dark:text-slate-300">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3.5 ${col.sortable ? 'cursor-pointer hover:text-[#B85ADB] select-none' : ''} ${col.headerAlign || ''}`}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <div className={`flex items-center gap-1.5 ${col.headerAlign === 'text-right' ? 'justify-end' : ''}`}>
                          {col.label}
                          {col.sortable && sortKey === col.key && (
                            sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#B85ADB]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#B85ADB]" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEBF0] dark:divide-[#313D4F]/60 text-xs text-[#202224] dark:text-slate-200">
                  {paginatedData.map((row, idx) => (
                    <tr key={row._id || row.id || idx} className="group hover:bg-[#F9FAFC] dark:hover:bg-[#313D4F]/30 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3.5 max-w-[320px] truncate ${col.cellAlign || ''}`}>
                          {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden divide-y divide-[#EAEBF0] dark:divide-[#313D4F]/60">
              {paginatedData.map((row, idx) => (
                <div key={row._id || row.id || idx} className="p-4 space-y-3 hover:bg-[#F9FAFC] dark:hover:bg-[#313D4F]/30 transition-colors">
                  {columns.map((col) => {
                    if (col.key === 'actions') {
                      return (
                        <div key={col.key} className="flex justify-end gap-2 pt-2 border-t border-[#EAEBF0] dark:border-[#313D4F]/60">
                          {col.render ? col.render(row[col.key], row) : null}
                        </div>
                      );
                    }
                    return (
                      <div key={col.key} className="flex items-center justify-between text-xs gap-3">
                        <span className="text-[#606060] dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">{col.label}</span>
                        <div className="text-[#202224] dark:text-slate-200 truncate font-medium">
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-[#EAEBF0] dark:border-[#313D4F] bg-[#F9FAFB] dark:bg-[#1B2431]/40 text-xs text-[#606060] dark:text-slate-400">
            <span className="text-[11.5px] font-mono">
              Showing <b className="text-[#202224] dark:text-slate-200">{startIdx}</b> to <b className="text-[#202224] dark:text-slate-200">{endIdx}</b> of <b className="text-[#202224] dark:text-slate-200">{sortedData.length}</b> records
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] text-xs font-semibold text-[#202224] dark:text-slate-200 hover:bg-[#F5F6FA] dark:hover:bg-[#313D4F] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              
              <span className="px-2 text-xs font-mono font-semibold text-[#B85ADB]">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] text-xs font-semibold text-[#202224] dark:text-slate-200 hover:bg-[#F5F6FA] dark:hover:bg-[#313D4F] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition"
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
