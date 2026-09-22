import React, { useState, useRef } from 'react';
import apiClient from '@/services/api/apiClient';
import {
  Sparkles,
  Bot,
  Upload,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  Copy,
  ChevronRight,
  RefreshCw,
  Edit3,
  Layers,
  Languages,
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { StatCard } from '../ui/StatCard';

interface SubtitleBlock {
  id: number;
  start: string;
  end: string;
  originalText: string;
  translatedText: string;
  isModified?: boolean;
}

// Regex for parsing standard SRT blocks
function parseSRT(text: string): SubtitleBlock[] {
  const blocks: SubtitleBlock[] = [];
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawBlocks = normalized.split(/\n\s*\n/);

  let fallbackId = 1;
  for (const raw of rawBlocks) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    let id = fallbackId++;
    let timeIndex = 0;

    if (/^\d+$/.test(lines[0])) {
      id = parseInt(lines[0], 10);
      timeIndex = 1;
    }

    if (!lines[timeIndex] || !lines[timeIndex].includes('-->')) continue;

    const timeParts = lines[timeIndex].split('-->');
    const start = timeParts[0].trim();
    const end = timeParts[1].trim();
    const originalText = lines.slice(timeIndex + 1).join('\n');

    blocks.push({
      id,
      start,
      end,
      originalText,
      translatedText: '',
    });
  }

  return blocks;
}

function stringifySRT(blocks: SubtitleBlock[]): string {
  return blocks
    .map(b => `${b.id}\n${b.start} --> ${b.end}\n${b.translatedText || b.originalText}\n`)
    .join('\n');
}

export function AiTranslationStudio() {
  const [engine, setEngine] = useState<'gemini' | 'groq' | 'openrouter' | 'google'>('gemini');
  const [fileName, setFileName] = useState<string>('');
  const [blocks, setBlocks] = useState<SubtitleBlock[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');
    setStatusMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseSRT(text);
        if (parsed.length === 0) {
          setErrorMsg('No valid subtitle blocks found in the selected file.');
          return;
        }
        setBlocks(parsed);
      } catch (err: any) {
        setErrorMsg('Failed to read or parse the subtitle file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleTranslateAll = async () => {
    if (blocks.length === 0) return;

    setIsTranslating(true);
    setErrorMsg('');
    const chunkSize = engine === 'gemini' ? 40 : 80;
    const count = Math.ceil(blocks.length / chunkSize);
    setTotalChunks(count);

    const updated = [...blocks];

    try {
      for (let c = 0; c < count; c++) {
        setCurrentChunk(c + 1);
        const startIndex = c * chunkSize;
        const endIndex = Math.min(startIndex + chunkSize, blocks.length);
        const chunk = updated.slice(startIndex, endIndex);

        setStatusMsg(`Translating batch ${c + 1}/${count} (Lines ${startIndex + 1} to ${endIndex})...`);

        // Format chunk into minimal SRT
        const chunkSrt = chunk.map(b => `${b.id}\n${b.start} --> ${b.end}\n${b.originalText}\n`).join('\n');

        let retries = 3;
        let responseData: any = null;

        while (retries > 0) {
          try {
            const res = await apiClient.post(
              '/api/admin/ai/translate',
              {
                srtContent: chunkSrt,
                engine,
              },
              { timeout: 90000 }
            );
            responseData = res.data;
            break;
          } catch (apiErr: any) {
            retries--;
            if (retries === 0) throw apiErr;
            await new Promise(r => setTimeout(r, 4000));
          }
        }

        if (responseData?.translatedSrt) {
          const parsedTranslated = parseSRT(responseData.translatedSrt);
          const transMap = new Map<number, string>();
          parsedTranslated.forEach(p => {
            transMap.set(p.id, p.originalText || p.translatedText);
          });

          for (let i = startIndex; i < endIndex; i++) {
            const originalBlock = updated[i];
            const trans = transMap.get(originalBlock.id);
            if (trans) {
              updated[i].translatedText = trans;
            }
          }
          setBlocks([...updated]);
        }

        // Brief cooldown to respect provider rate limits
        await new Promise(r => setTimeout(r, 1200));
      }

      setStatusMsg('AI Sinhala translation completed successfully! You can inspect and edit blocks below.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Translation error encountered.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTextEdit = (id: number, val: string) => {
    setBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, translatedText: val, isModified: true } : b))
    );
  };

  const handleDownload = () => {
    if (blocks.length === 0) return;
    const content = stringifySRT(blocks);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'translated_subtitle';
    link.download = `${baseName}_Sinhala_KSubZone.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredBlocks = blocks.filter(b => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      b.originalText.toLowerCase().includes(s) ||
      b.translatedText.toLowerCase().includes(s) ||
      String(b.id) === s
    );
  });

  const translatedCount = blocks.filter(b => Boolean(b.translatedText)).length;
  const progressPercent = blocks.length > 0 ? Math.round((translatedCount / blocks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">AI Translation Studio</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9E57F6]/15 text-[#9E57F6] border border-[#9E57F6]/30">
              PRO STUDIO
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Batch translate foreign SRT subtitles into natural Sinhala Unicode with timestamp preservation and side-by-side editing.
          </p>
        </div>

        {/* Engine Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#141418] border border-white/[0.08] p-1 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-violet-400" /> Model:
            </span>
            {(['gemini', 'groq', 'openrouter', 'google'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setEngine(opt)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  engine === opt
                    ? 'bg-[#9E57F6] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {opt === 'gemini' && 'Gemini 1.5'}
                {opt === 'groq' && 'Groq (Llama)'}
                {opt === 'openrouter' && 'OpenRouter'}
                {opt === 'google' && 'Google API'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-[#141418] border border-white/[0.1] text-slate-200 hover:bg-white/[0.06] transition"
          >
            <Upload className="w-3.5 h-3.5 text-violet-400" />
            <span>{fileName ? 'Replace File' : 'Upload Subtitle'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Metrics & Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Subtitle Blocks"
          value={blocks.length}
          trend={{ direction: 'neutral', label: fileName || 'No file loaded' }}
          icon={FileText}
          accentColor="violet"
        />
        <StatCard
          label="Translated Blocks"
          value={translatedCount}
          trend={{ direction: 'up', label: `${progressPercent}% completed` }}
          icon={Languages}
          accentColor="cyan"
        />
        <StatCard
          label="Engine Status"
          value={engine.toUpperCase()}
          trend={{ direction: 'neutral', label: 'Rate-limit protected' }}
          icon={Bot}
          accentColor="pink"
        />
        <StatCard
          label="Quality Guard"
          value="Sinhala UTF-8"
          trend={{ direction: 'up', label: 'Safe Unicode & Timestamps' }}
          icon={CheckCircle2}
          accentColor="emerald"
        />
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            {isTranslating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-violet-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <span>{statusMsg}</span>
          </div>
          {isTranslating && (
            <span className="font-mono text-xs font-bold text-violet-300">
              Chunk {currentChunk}/{totalChunks}
            </span>
          )}
        </div>
      )}

      {/* Translation Toolbar */}
      {blocks.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#141418] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isTranslating}
              onClick={handleTranslateAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#9E57F6] text-white hover:bg-[#8B3CE8] disabled:opacity-50 transition shadow-lg shadow-[#9E57F6]/20"
            >
              {isTranslating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Translating ({currentChunk}/{totalChunks})...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start AI Translation</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={translatedCount === 0}
              onClick={handleDownload}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sinhala SRT</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search in subtitles..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#9E57F6]"
            />
            <span className="text-[11px] text-slate-500 font-mono">
              Showing {filteredBlocks.length} of {blocks.length}
            </span>
          </div>
        </div>
      )}

      {/* Side-by-Side Subtitle Inspection Grid */}
      {blocks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#141418] border border-dashed border-white/[0.1] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 mx-auto flex items-center justify-center border border-violet-500/20">
            <Languages className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">No Subtitle Loaded</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Upload an English or foreign language .SRT subtitle file above to begin the AI translation process.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#9E57F6] text-white hover:bg-[#8B3CE8] transition"
          >
            Select SRT File
          </button>
        </div>
      ) : (
        <div className="bg-[#141418] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-[#0C0C0E]/70 border-b border-white/[0.06] text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <div className="col-span-1">#</div>
            <div className="col-span-2">Timecode</div>
            <div className="col-span-4">Original Dialogue</div>
            <div className="col-span-5">Sinhala Translation (Editable)</div>
          </div>

          <div className="divide-y divide-white/[0.04] max-h-[640px] overflow-y-auto">
            {filteredBlocks.map(block => (
              <div
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`grid grid-cols-12 gap-3 px-4 py-3 text-xs transition ${
                  selectedBlockId === block.id
                    ? 'bg-[#9E57F6]/5'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="col-span-1 font-mono text-slate-500 text-[11px] pt-1">
                  {block.id}
                </div>
                <div className="col-span-2 font-mono text-slate-400 text-[10px] pt-1 leading-relaxed">
                  <div>{block.start}</div>
                  <div className="text-slate-600">to {block.end}</div>
                </div>
                <div className="col-span-4 text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                  {block.originalText}
                </div>
                <div className="col-span-5 space-y-1">
                  <textarea
                    rows={2}
                    value={block.translatedText}
                    onChange={e => handleTextEdit(block.id, e.target.value)}
                    placeholder="Translation will appear here or type manually..."
                    className={`w-full p-2 rounded-lg bg-[#0C0C0E] border text-xs leading-relaxed focus:outline-none transition resize-none font-sans ${
                      block.isModified
                        ? 'border-amber-500/40 text-amber-200'
                        : block.translatedText
                        ? 'border-emerald-500/30 text-emerald-300'
                        : 'border-white/[0.08] text-slate-400 placeholder-slate-600 focus:border-[#9E57F6]'
                    }`}
                  />
                  {block.isModified && (
                    <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                      <Edit3 className="w-3 h-3" /> Manually edited
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
