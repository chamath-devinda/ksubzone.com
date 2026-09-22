import React, { useState } from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import {
  WandSparkles,
  UploadCloud,
  Download,
  Clock,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

const timeToMs = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().replace(',', '.').split(':');
  if (parts.length < 3) return 0;
  const hrs = parseInt(parts[0], 10) * 3600000;
  const mins = parseInt(parts[1], 10) * 60000;
  const secsParts = parts[2].split('.');
  const secs = parseInt(secsParts[0], 10) * 1000;
  const ms = secsParts[1] ? parseInt(secsParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
  return hrs + mins + secs + ms;
};

const msToTime = (ms: number): string => {
  if (ms < 0) ms = 0;
  const hrs = Math.floor(ms / 3600000);
  ms %= 3600000;
  const mins = Math.floor(ms / 60000);
  ms %= 60000;
  const secs = Math.floor(ms / 1000);
  const mss = ms % 1000;
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(mss, 3)}`;
};

export function SubtitleStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [timeShiftMs, setTimeShiftMs] = useState(0);
  const [activeTab, setActiveTab] = useState<'timeline' | 'branding' | 'watermark' | 'converter'>('timeline');
  const [isCopied, setIsCopied] = useState(false);
  const [stats, setStats] = useState<{ originalBlocks: number; processedBlocks: number; changesMade: string[] }>({
    originalBlocks: 0,
    processedBlocks: 0,
    changesMade: [],
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setFile(uploaded);
    setFileName(uploaded.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      setProcessedText(content);
      const blocks = content.trim().split(/\n\s*\n/).length;
      setStats({ originalBlocks: blocks, processedBlocks: blocks, changesMade: ['Loaded file'] });
    };
    reader.readAsText(uploaded);
  };

  // 1. Timeline Adjustment
  const handleApplyTimeShift = () => {
    if (!rawText) return;
    const blocks = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n\n');
    const shifted = blocks.map((block) => {
      const lines = block.trim().split('\n');
      if (lines.length >= 2) {
        const timeIndex = lines[0].includes('-->') ? 0 : 1;
        if (lines[timeIndex]?.includes('-->')) {
          const [startStr, endStr] = lines[timeIndex].split('-->').map((s) => s.trim());
          const newStartMs = Math.max(0, timeToMs(startStr) + timeShiftMs);
          const newEndMs = Math.max(0, timeToMs(endStr) + timeShiftMs);
          lines[timeIndex] = `${msToTime(newStartMs)} --> ${msToTime(newEndMs)}`;
          return lines.join('\n');
        }
      }
      return block;
    });

    const result = shifted.join('\n\n') + '\n';
    setProcessedText(result);
    setStats((prev) => ({
      ...prev,
      changesMade: [...prev.changesMade, `Applied timing shift of ${timeShiftMs > 0 ? '+' : ''}${timeShiftMs}ms`],
    }));
  };

  // 2. Auto Branding
  const handleApplyBranding = () => {
    if (!processedText) return;
    const introCard = `1\n00:00:02,000 --> 00:00:07,000\n<font color="#ffcc00">නවතම කොරියානු චිත්‍රපට සහා රූපවාහිනි කතාමාලා සඳහා සිංහල උපසිරැසි</font>\n<font color="#ff9416">ලබා ගෑනිමට පිවිසෙන්න </font>www.ksubzone.com <font color="#ff9416">අපගේ වෙබ් අඩවියට.</font>\n\n`;

    if (processedText.includes('www.ksubzone.com')) {
      alert('Official KSubZone branding card is already present in this subtitle.');
      return;
    }

    const result = introCard + processedText;
    setProcessedText(result);
    setStats((prev) => ({
      ...prev,
      changesMade: [...prev.changesMade, 'Injected official KSubZone intro branding card'],
    }));
  };

  // 3. Watermark / Competitor Stripping
  const handleStripWatermarks = () => {
    if (!processedText) return;
    const competitorPatterns = [
      /https?:\/\/[^\s]+/gi,
      /t\.me\/[a-zA-Z0-9_-]+/gi,
      /telegram\.me\/[a-zA-Z0-9_-]+/gi,
      /@ADL[-_]?Drama/gi,
      /ADL[-_\s]*Drama/gi,
      /baiscopelk/gi,
      /zoom\.lk/gi,
      /piratelk/gi,
      /subz\.lk/gi,
    ];

    let cleaned = processedText;
    let strippedCount = 0;

    competitorPatterns.forEach((pattern) => {
      const matches = cleaned.match(pattern);
      if (matches) {
        strippedCount += matches.length;
        cleaned = cleaned.replace(pattern, '');
      }
    });

    setProcessedText(cleaned);
    setStats((prev) => ({
      ...prev,
      changesMade: [...prev.changesMade, `Removed ${strippedCount} competitor ads and links`],
    }));
  };

  // 4. Format Conversion (SRT -> VTT / ASS)
  const handleConvertToVtt = () => {
    if (!processedText) return;
    let vtt = 'WEBVTT\n\n';
    vtt += processedText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    setProcessedText(vtt);
    setStats((prev) => ({
      ...prev,
      changesMade: [...prev.changesMade, 'Converted format from SRT to WebVTT'],
    }));
  };

  const handleDownloadResult = () => {
    if (!processedText) return;
    const blob = new Blob([processedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.[^/.]+$/, '') + '_ksubzone.srt';
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
            <WandSparkles className="w-7 h-7 text-[#9E57F6]" />
            Subtitle Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global timeline adjustments, auto branding injection, competitor watermark removal, and format conversion
          </p>
        </div>

        {processedText && (
          <button
            onClick={handleDownloadResult}
            className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#9E57F6] hover:bg-[#8B3CE8] transition shadow-[0_0_15px_rgba(158,87,246,0.3)] flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Processed Subtitle
          </button>
        )}
      </div>

      {/* Upload Zone if no file loaded */}
      {!rawText ? (
        <div className="p-12 rounded-3xl border-2 border-dashed border-white/10 hover:border-[#9E57F6]/50 bg-[#141418] transition flex flex-col items-center justify-center text-center">
          <UploadCloud className="w-12 h-12 text-[#9E57F6] mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-white">Upload Subtitle for Studio Processing</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Drag & drop an SRT, VTT, or ASS file or click below to adjust timing, brand, or convert.
          </p>
          <label className="mt-6 px-6 py-2.5 rounded-xl bg-[#9E57F6] text-white font-bold text-xs cursor-pointer hover:bg-[#8B3CE8] transition shadow-[0_0_20px_rgba(158,87,246,0.3)]">
            <span>Browse Subtitle File</span>
            <input type="file" accept=".srt,.vtt,.ass" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
          {/* Studio Controls Column */}
          <div className="flex flex-col gap-5">
            {/* Tool Selection Tabs */}
            <div className="flex items-center gap-1 bg-[#141418] p-1.5 rounded-2xl border border-white/5 overflow-x-auto">
              {[
                { id: 'timeline', label: 'Timeline Shift', icon: Clock },
                { id: 'branding', label: 'Auto Branding', icon: Sparkles },
                { id: 'watermark', label: 'Strip Ads', icon: ShieldCheck },
                { id: 'converter', label: 'Converter', icon: FileCode },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      isActive ? 'bg-[#9E57F6] text-white shadow-[0_0_15px_rgba(158,87,246,0.3)]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tool Panel */}
            <div className="p-6 rounded-2xl bg-[#141418] border border-white/5 flex flex-col gap-4">
              {activeTab === 'timeline' && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#9E57F6]" />
                    Global Subtitle Timing Shift
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Shift all timestamps forward or backward by milliseconds. Start times will never drop below 00:00:00,000.
                  </p>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step={50}
                      placeholder="e.g. +500 or -750"
                      value={timeShiftMs || ''}
                      onChange={(e) => setTimeShiftMs(parseInt(e.target.value, 10) || 0)}
                      className="flex-grow bg-[#181820] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#9E57F6]"
                    />
                    <button
                      onClick={handleApplyTimeShift}
                      disabled={timeShiftMs === 0}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#9E57F6] hover:bg-[#8B3CE8] transition disabled:opacity-50"
                    >
                      Apply Shift
                    </button>
                  </div>

                  <div className="flex gap-2 flex-wrap text-xs">
                    {[-1000, -500, +500, +1000, +2000].map((ms) => (
                      <button
                        key={ms}
                        onClick={() => setTimeShiftMs(ms)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-mono text-[11px]"
                      >
                        {ms > 0 ? `+${ms}ms` : `${ms}ms`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'branding' && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Inject KSubZone Official Intro Card
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Adds the official synchronized Sinhala subtitle intro card at 00:00:02. Duplicates are automatically prevented.
                  </p>
                  <button
                    onClick={handleApplyBranding}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#9E57F6] to-pink-500 hover:opacity-90 transition shadow-[0_0_15px_rgba(158,87,246,0.3)] self-start"
                  >
                    Inject Official Intro Card
                  </button>
                </div>
              )}

              {activeTab === 'watermark' && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-rose-400" />
                    Strip Competitor Ads & Telegram Watermarks
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Scans dialogue lines for competitor tags (e.g. ADL-Drama, Telegram channels, pirate domains) and removes them while leaving legitimate dialogue intact.
                  </p>
                  <button
                    onClick={handleStripWatermarks}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-[0_0_15px_rgba(239,68,68,0.3)] self-start"
                  >
                    Strip Competitor Watermarks
                  </button>
                </div>
              )}

              {activeTab === 'converter' && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-sky-400" />
                    Subtitle Format Converter
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Convert between SRT and WebVTT while preserving line breaks, timing tokens, and Sinhala characters.
                  </p>
                  <button
                    onClick={handleConvertToVtt}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition shadow-[0_0_15px_rgba(56,189,248,0.3)] self-start"
                  >
                    Convert SRT to WebVTT (.vtt)
                  </button>
                </div>
              )}
            </div>

            {/* Audit Log / History */}
            <div className="p-4 rounded-2xl bg-[#141418] border border-white/5 flex flex-col gap-2 text-xs">
              <span className="font-bold text-slate-300">Session Operations:</span>
              <ul className="flex flex-col gap-1.5 text-slate-400 list-disc list-inside">
                {stats.changesMade.map((c, i) => (
                  <li key={i} className="text-[11px] text-emerald-400 font-medium">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Real-time Subtitle Preview Column */}
          <div className="p-5 rounded-2xl bg-[#141418] border border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono">{fileName}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(processedText);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <textarea
              value={processedText}
              onChange={(e) => setProcessedText(e.target.value)}
              rows={22}
              className="w-full p-4 rounded-xl bg-[#0E0E12] border border-white/5 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#9E57F6] leading-relaxed resize-none custom-scrollbar"
            />
          </div>
        </div>
      )}
    </div>
  );
}
