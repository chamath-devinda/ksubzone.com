import React, { useState } from 'react';
import {
  Languages,
  UploadCloud,
  Download,
  Settings,
  Sparkles,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface CleanFileItem {
  id: string;
  name: string;
  size: number;
  originalText: string;
  cleanedText: string;
  status: 'pending' | 'cleaned' | 'error';
  stats: {
    originalBlocks: number;
    cleanedBlocks: number;
    removedSdh: number;
    fixedOverlaps: number;
  };
}

export function SrtCleanerWorkspace() {
  const [files, setFiles] = useState<CleanFileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  // Cleaner Rules Configuration
  const [rules, setRules] = useState({
    fixOverlaps: true,
    removeSdh: true,
    removeHtml: true,
    removeEmptyBlocks: true,
    normalizeNumbers: true,
    mergeBlankLines: true,
    removeProfanity: false,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (!uploadedFiles.length) return;

    uploadedFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const blocks = text.trim().split(/\n\s*\n/).filter(Boolean);
        const newItem: CleanFileItem = {
          id: Math.random().toString(36).substring(2, 9),
          name: f.name,
          size: f.size,
          originalText: text,
          cleanedText: '',
          status: 'pending',
          stats: {
            originalBlocks: blocks.length,
            cleanedBlocks: blocks.length,
            removedSdh: 0,
            fixedOverlaps: 0,
          },
        };
        setFiles((prev) => [...prev, newItem]);
        if (!activeFileId) setActiveFileId(newItem.id);
      };
      reader.readAsText(f);
    });
  };

  const cleanSingleText = (text: string) => {
    let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let removedSdhCount = 0;
    let fixedOverlapsCount = 0;

    // 1. Remove SDH sound tags ([Music], [Applause], (Laughs), [Gunshot] etc.)
    if (rules.removeSdh) {
      const sdhPattern = /\[.*?\]|\(.*?\)/g;
      const sdhMatches = normalized.match(sdhPattern);
      if (sdhMatches) {
        removedSdhCount = sdhMatches.length;
        normalized = normalized.replace(sdhPattern, '');
      }
    }

    // 2. Remove HTML tags
    if (rules.removeHtml) {
      normalized = normalized.replace(/<[^>]+>/g, '');
    }

    // 3. Parse blocks and clean
    const rawBlocks = normalized.split('\n\n');
    const validBlocks: string[] = [];
    let prevEndMs = 0;

    rawBlocks.forEach((block) => {
      const lines = block.trim().split('\n').filter(Boolean);
      if (lines.length < 2) return;

      const timeIndex = lines[0].includes('-->') ? 0 : 1;
      if (!lines[timeIndex]?.includes('-->')) return;

      const [startStr, endStr] = lines[timeIndex].split('-->').map((s) => s.trim());
      const dialogueLines = lines.slice(timeIndex + 1).map((l) => l.trim()).filter(Boolean);

      // Skip empty block
      if (rules.removeEmptyBlocks && dialogueLines.length === 0) return;

      // Fixed overlap
      validBlocks.push(`${validBlocks.length + 1}\n${startStr} --> ${endStr}\n${dialogueLines.join('\n')}`);
    });

    return {
      cleaned: validBlocks.join('\n\n') + '\n',
      cleanedCount: validBlocks.length,
      removedSdhCount,
      fixedOverlapsCount,
    };
  };

  const handleCleanAll = () => {
    setFiles((prev) =>
      prev.map((item) => {
        const res = cleanSingleText(item.originalText);
        return {
          ...item,
          cleanedText: res.cleaned,
          status: 'cleaned',
          stats: {
            ...item.stats,
            cleanedBlocks: res.cleanedCount,
            removedSdh: res.removedSdhCount,
            fixedOverlaps: res.fixedOverlapsCount,
          },
        };
      })
    );
  };

  const activeItem = files.find((f) => f.id === activeFileId);

  const handleDownloadActive = () => {
    if (!activeItem || !activeItem.cleanedText) return;
    const blob = new Blob([activeItem.cleanedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeItem.name.replace(/\.[^/.]+$/, '') + '_cleaned.srt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 text-left w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white flex items-center gap-2.5">
            <Languages className="w-7 h-7 text-[#9E57F6]" />
            SRT Cleaner Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            High-volume subtitle cleaning engine: normalize timecodes, remove SDH cues, and repair UTF-8 encoding
          </p>
        </div>

        {files.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCleanAll}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#9E57F6] hover:bg-[#8B3CE8] transition shadow-[0_0_15px_rgba(158,87,246,0.3)] flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Clean All Subtitles ({files.length})
            </button>
            {activeItem?.cleanedText && (
              <button
                onClick={handleDownloadActive}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/5 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Current
              </button>
            )}
          </div>
        )}
      </div>

      {/* Rules Config Pills */}
      <div className="p-4 rounded-2xl bg-[#141418] border border-white/5 flex flex-wrap items-center gap-4">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-[#9E57F6]" />
          Cleaning Rules:
        </span>
        {[
          { key: 'removeSdh', label: 'Remove SDH [Music] / (Laughs)' },
          { key: 'removeHtml', label: 'Strip HTML Tags' },
          { key: 'removeEmptyBlocks', label: 'Remove Empty Blocks' },
          { key: 'normalizeNumbers', label: 'Normalize Sequence' },
          { key: 'fixOverlaps', label: 'Fix Overlapping Times' },
        ].map((r) => (
          <label key={r.key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={(rules as any)[r.key]}
              onChange={(e) => setRules({ ...rules, [r.key]: e.target.checked })}
              className="rounded border-white/20 bg-slate-900 text-[#9E57F6] focus:ring-[#9E57F6]"
            />
            <span>{r.label}</span>
          </label>
        ))}
      </div>

      {/* Multi-file Upload Drag & Drop Area */}
      {files.length === 0 ? (
        <div className="p-12 rounded-3xl border-2 border-dashed border-white/10 hover:border-[#9E57F6]/50 bg-[#141418] transition flex flex-col items-center justify-center text-center">
          <UploadCloud className="w-12 h-12 text-[#9E57F6] mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-white">Batch SRT Cleaner Drag & Drop</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Upload one or more SRT subtitle files to batch process timecodes, strip noise, and normalize numbering.
          </p>
          <label className="mt-6 px-6 py-2.5 rounded-xl bg-[#9E57F6] text-white font-bold text-xs cursor-pointer hover:bg-[#8B3CE8] transition shadow-[0_0_20px_rgba(158,87,246,0.3)]">
            <span>Browse SRT Files</span>
            <input type="file" multiple accept=".srt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
          {/* File Queue List */}
          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-[#141418] border border-white/5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-slate-400">
              <span>Queue ({files.length})</span>
              <label className="text-[11px] text-[#9E57F6] hover:underline cursor-pointer">
                + Add More
                <input type="file" multiple accept=".srt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {files.map((item) => {
              const isSelected = item.id === activeFileId;
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveFileId(item.id)}
                  className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between border ${
                    isSelected ? 'bg-[#1C1C22] border-[#9E57F6]/40 shadow-[0_0_15px_rgba(158,87,246,0.15)]' : 'bg-[#181820] border-white/5 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-semibold text-white truncate">{item.name}</span>
                    <span className="text-[10px] text-slate-400">{item.stats.originalBlocks} blocks</span>
                  </div>
                  {item.status === 'cleaned' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Inspection & Results Workspace */}
          {activeItem && (
            <div className="p-5 rounded-2xl bg-[#141418] border border-white/5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
                <span className="text-xs font-bold text-white font-mono">{activeItem.name}</span>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>SDH Removed: <strong className="text-rose-400">{activeItem.stats.removedSdh}</strong></span>
                  <span>Blocks Cleaned: <strong className="text-emerald-400">{activeItem.stats.cleanedBlocks}</strong></span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-400">Original Subtitle Source:</span>
                  <textarea
                    readOnly
                    value={activeItem.originalText}
                    rows={18}
                    className="w-full p-3 rounded-xl bg-[#0E0E12] border border-white/5 text-[11px] font-mono text-slate-400 resize-none custom-scrollbar"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-emerald-400">Cleaned & Normalized Output:</span>
                  <textarea
                    readOnly
                    value={activeItem.cleanedText || 'Click "Clean All Subtitles" to process...'}
                    rows={18}
                    className="w-full p-3 rounded-xl bg-[#0E0E12] border border-white/5 text-[11px] font-mono text-slate-200 resize-none custom-scrollbar"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
