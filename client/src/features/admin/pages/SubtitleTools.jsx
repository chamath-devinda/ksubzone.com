'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import { useToast } from '@/features/admin/components/Toast';
import {
  Languages, Sparkles, UploadCloud, Download, AlertTriangle, Play,
  CheckCircle, Plus, Trash2, Edit2, RefreshCw, Layers, ArrowRight, Check, Eye, Settings, FileText, Undo, Wand2
} from 'lucide-react';

// Time Conversions
const timeToMs = (timeStr) => {
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

const msToTime = (ms) => {
  const hrs = Math.floor(ms / 3600000);
  ms %= 3600000;
  const mins = Math.floor(ms / 60000);
  ms %= 60000;
  const secs = Math.floor(ms / 1000);
  const mss = ms % 1000;

  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(mss, 3)}`;
};

// Robust SRT Parser
const parseSRT = (text) => {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalizedText.split('\n\n');
  const subtitles = [];
  let sequence = 1;

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;
    
    const lines = block.split('\n');
    if (lines.length >= 2) {
      let timeIndex = 1;
      if (!lines[timeIndex]?.includes('-->') && lines[0]?.includes('-->')) {
        timeIndex = 0;
      }

      if (lines[timeIndex]?.includes('-->')) {
        const times = lines[timeIndex].split('-->').map(t => t.trim());
        const start = times[0];
        const end = times[1];
        const textLines = timeIndex === 1 ? lines.slice(2) : lines.slice(1);
        const subtitleText = textLines.join('\n').trim();
        subtitles.push({
          id: sequence++,
          start,
          end,
          text: subtitleText
        });
      }
    }
  }
  return subtitles;
};

// SRT Stringifier
const stringifySRT = (subs) => {
  return subs.map((sub, index) => {
    return `${index + 1}\n${sub.start} --> ${sub.end}\n${sub.text}`;
  }).join('\n\n') + '\n';
};

// Clean base name helper
const cleanBaseName = (fileName) => {
  let base = fileName.replace(/\.[a-zA-Z0-9]+$/i, '');
  while (true) {
    const prev = base;
    base = base.replace(/_(KSubZone|KSubZone_branded|cleaned|www\.ksubzone\.com|branded|KSubZonesrt)/gi, '');
    base = base.replace(/-(cleaned|branded)/gi, '');
    // Remove forbidden word @ADL_Drama (and any surrounding spaces/underscores/hyphens)
    base = base.replace(/[-_@\s]*ADL_Drama[-_@\s]*/gi, '');
    if (base === prev) break;
  }
  return base.trim().replace(/\.+$/, '');
};

// Parse Drama name and Episode number from file name
const parseDramaAndEpisode = (fileName) => {
  let base = fileName.replace(/\.[a-zA-Z0-9]+$/i, '').trim();
  
  // Clean branding suffixes first
  while (true) {
    const prev = base;
    base = base.replace(/_(KSubZone|KSubZone_branded|cleaned|www\.ksubzone\.com|branded|KSubZonesrt)/gi, '');
    base = base.replace(/-(cleaned|branded)/gi, '');
    base = base.replace(/[-_@\s]*ADL_Drama[-_@\s]*/gi, '');
    if (base === prev) break;
  }

  let dramaName = '';
  let episodeNum = '';

  // Match standard SxxExx pattern (e.g. S01E09, S1E9)
  const sxxexxMatch = base.match(/(.*?)\b[sS](\d+)[eE](\d+)\b/i);
  if (sxxexxMatch) {
    dramaName = sxxexxMatch[1];
    episodeNum = sxxexxMatch[3];
  } else {
    // Match Exx / EPxx pattern (e.g. E09, Ep09, Episode 09)
    const exxMatch = base.match(/(.*?)\b(?:[eE]|ep|episode|ep\.)\s*(\d+)\b/i);
    if (exxMatch) {
      dramaName = exxMatch[1];
      episodeNum = exxMatch[2];
    } else {
      // Match hyphenated numbers at the end, e.g. "Drama Name - 09"
      const hyphenNumMatch = base.match(/(.*?)\s*[-_ ]\s*(\d+)$/);
      if (hyphenNumMatch) {
        dramaName = hyphenNumMatch[1];
        episodeNum = hyphenNumMatch[2];
      } else {
        // Fallback to any trailing number
        const trailingNumMatch = base.match(/(.*?)\s+(\d+)\s*$/);
        if (trailingNumMatch) {
          dramaName = trailingNumMatch[1];
          episodeNum = trailingNumMatch[2];
        } else {
          dramaName = base;
          episodeNum = '';
        }
      }
    }
  }

  // Clean drama name from quality tags, dots, underscores
  dramaName = dramaName
    .replace(/\b(?:720p|1080p|2160p|480p|576p|hdtv|web\-dl|webdl|webrip|web|bluray|brrip|bdrip|x264|x265|h264|h265|hevc|aac|mp3|dts|dd5\.1|ac3|nf|netflix|dnp|dnp\+)\b/gi, '')
    .replace(/[\.\-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Format year in parentheses if it's a standalone year (e.g. "Drama Name 2026" -> "Drama Name (2026)")
  dramaName = dramaName.replace(/\b(19\d\d|20\d\d)\b(?!\))/g, '($1)');

  // Pad single digit episodes with leading zero
  if (episodeNum && episodeNum.length === 1) {
    episodeNum = '0' + episodeNum;
  }

  return {
    drama: dramaName || 'Unknown Drama',
    episode: episodeNum || '01'
  };
};

export default function SubtitleTools() {
  const { admin } = useAuth();
  const fileInputRef = useRef(null);
  const toast = useToast();

  // Batch Files State
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);

  // Transfer files helper
  const navigateToCleaner = () => {
    if (files.length === 0) return;

    toast.info("Preparing files for SRT Cleaner...");
    const transferData = files.map(fileObj => ({
      name: fileObj.name,
      content: fileObj.originalText
    }));

    sessionStorage.setItem("sub_transfer_files", JSON.stringify(transferData));
    window.location.href = "/management/srt-cleaner";
  };

  useEffect(() => {
    const rawData = sessionStorage.getItem("sub_transfer_files");
    if (rawData) {
      try {
        const transferFiles = JSON.parse(rawData);
        sessionStorage.removeItem("sub_transfer_files");

        if (transferFiles && transferFiles.length > 0) {
          const loadedFiles = transferFiles.map(tf => {
            const parsed = parseSRT(tf.content);
            
            // Detect Gaps
            const gaps = [];
            for (let i = 0; i < parsed.length - 1; i++) {
              const endMs = timeToMs(parsed[i].end);
              const nextStartMs = timeToMs(parsed[i + 1].start);
              const gapMs = nextStartMs - endMs;

              if (gapMs >= minGapSeconds * 1000) {
                gaps.push({
                  index: i,
                  start: parsed[i].end,
                  end: parsed[i + 1].start,
                  durationSec: Math.floor(gapMs / 1000),
                  recommendedStart: msToTime(endMs + 3000),
                  recommendedEnd: msToTime(Math.min(endMs + 33000, nextStartMs - 3000))
                });
              }
            }

            // Detect Competitor Brandings
            const competitorKeywords = [
              'baiscope', 'cineru', 'zoom.lk', 'subz.lk', 'sinhalasub',
              'subz.site', 'subzlk', 'baiscopelk', 'zoom', 'බයිස්කෝප්', 'සිනේරු',
              'cinerulk', 'subz', 'adl_drama', '@adl_drama'
            ];

            const detected = [];
            const initialActions = {};

            parsed.forEach((sub) => {
              const textLower = (sub.text || '').toLowerCase();
              const matches = competitorKeywords.some(keyword => textLower.includes(keyword));

              if (matches) {
                detected.push(sub);
                initialActions[sub.id] = 'replace';
              }
            });

            const parsedInfo = parseDramaAndEpisode(tf.name);
            return {
              id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
              name: tf.name,
              dramaName: parsedInfo.drama,
              episodeNum: parsedInfo.episode,
              originalText: tf.content,
              subtitles: parsed,
              processedSubs: JSON.parse(JSON.stringify(parsed)),
              editableSrtText: tf.content,
              detectedCompetitors: detected,
              competitorActions: initialActions,
              detectedGaps: gaps,
              selectedGaps: gaps.map((_, idx) => idx),
              isProcessed: false,
              isTranslated: false,
              translationProgress: 0,
              translateStatusMsg: '',
              translationError: '',
              isTranslating: false
            };
          });

          setFiles(prev => {
            const combined = [...prev, ...loadedFiles];
            setSelectedFileId(combined[0].id);
            return combined;
          });
          setActiveTab('brand');
          toast.success(`Successfully loaded ${transferFiles.length} file(s) from SRT Cleaner.`);
        }
      } catch (err) {
        console.error("Failed to restore files from session storage", err);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Editing Block State (for Visual Preview inline editor)
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [translationEngine, setTranslationEngine] = useState('gemini');

  // Global Configs
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'brand', 'translate', 'export'
  const [previewMode, setPreviewMode] = useState('blocks'); // 'blocks' | 'raw'
  const [brandingText, setBrandingText] = useState(
    `<font color="#ffcc00">නවතම කොරියානු චිත්‍රපටවල සහා රූපවාහිනි කතාමාලා සඳහා සිංහල උපසිරැසි</font>\n<font color="#ff9416">ලබා ගෑනිමට පිවිසෙන්න </font>www.ksubzone.com <font color="#ff9416">අපගේ වෙබ් අඩවියට.</font>`
  );
  const [startBrandingText, setStartBrandingText] = useState(
    `{\\an5}{\\fad(1000,1000)}<font color="#FF2400" size="34"><b>✤ {drama} ✤</b></font>\n<font color="#FFFFFF" size="22"><b>— Episode | {episode} —</b></font>\n<font color="#ffcc00">නවතම කොරියානු චිත්රපටවල සහා රූපවාහිනි කතාමාලා සඳහා සිංහල උපසිරැසි</font>\n<font color="#ff9416">ලබා ගෑනිමට පිවිසෙන්න </font>www.ksubzone.com <font color="#ff9416">අපගේ වෙබ් අඩවියට.</font>`
  );
  const [endingBrandingText, setEndingBrandingText] = useState(
    `{\\an5}{\\fad(1000,1000)}<font color="#FF2400" size="34"><b>මීලඟ කතාංගයත් සමඟ නැවත හමුවෙමු...!</b></font>\n<font color="#ffcc00">නවතම කොරියානු චිත්‍රපටවල සහා රූපවාහිනි කතාමාලා සඳහා සිංහල උපසිරැසි</font>\n<font color="#ff9416">ලබා ගෑනිමට පිවිසෙන්න </font>www.ksubzone.com <font color="#ff9416">අපගේ වෙබ් අඩවියට.</font>`
  );

  // Ad Inject Configs
  const [insertStart, setInsertStart] = useState(true);
  const [startTimeStart, setStartTimeStart] = useState('00:00:10,650');
  const [startTimeEnd, setStartTimeEnd] = useState('00:00:50,650');

  const [insertEnd, setInsertEnd] = useState(true);
  const [endDuration, setEndDuration] = useState(30); // in seconds

  const [insertGaps, setInsertGaps] = useState(true);
  const [minGapSeconds, setMinGapSeconds] = useState(45); // minimum gap size to inject ad

  // Helper to update a specific file's state
  const updateFileState = (fileId, updater) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updater } : f));
  };

  const activeFile = files.find(f => f.id === selectedFileId);

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList) => {
    const srtFiles = Array.from(fileList).filter(f => f.name.endsWith('.srt'));
    if (srtFiles.length === 0) {
      toast.error('Only .srt files are currently supported.');
      return;
    }

    const newFilesPromises = srtFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target.result;
          const parsed = parseSRT(text);
          
          // Detect Gaps
          const gaps = [];
          for (let i = 0; i < parsed.length - 1; i++) {
            const endMs = timeToMs(parsed[i].end);
            const nextStartMs = timeToMs(parsed[i + 1].start);
            const gapMs = nextStartMs - endMs;

            if (gapMs >= minGapSeconds * 1000) {
              gaps.push({
                index: i,
                start: parsed[i].end,
                end: parsed[i + 1].start,
                durationSec: Math.floor(gapMs / 1000),
                recommendedStart: msToTime(endMs + 3000),
                recommendedEnd: msToTime(Math.min(endMs + 33000, nextStartMs - 3000))
              });
            }
          }

          // Detect Competitor Brandings
          const competitorKeywords = [
            'baiscope', 'cineru', 'zoom.lk', 'subz.lk', 'sinhalasub',
            'subz.site', 'subzlk', 'baiscopelk', 'zoom', 'බයිස්කෝප්', 'සිනේරු',
            'cinerulk', 'subz', 'adl_drama', '@adl_drama'
          ];

          const detected = [];
          const initialActions = {};

          parsed.forEach((sub) => {
            const textLower = (sub.text || '').toLowerCase();
            const matches = competitorKeywords.some(keyword => textLower.includes(keyword)) ||
                            textLower.includes('.lk') || textLower.includes('.com') ||
                            textLower.includes('පරිවර්තනය') || textLower.includes('උපසිරැසි');

            if (matches) {
              detected.push(sub);
              initialActions[sub.id] = 'replace';
            }
          });

          const parsedInfo = parseDramaAndEpisode(file.name);
          resolve({
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            name: file.name,
            dramaName: parsedInfo.drama,
            episodeNum: parsedInfo.episode,
            originalText: text,
            subtitles: parsed,
            processedSubs: JSON.parse(JSON.stringify(parsed)), // Deep copy
            editableSrtText: text,
            detectedCompetitors: detected,
            competitorActions: initialActions,
            detectedGaps: gaps,
            selectedGaps: gaps.map((_, idx) => idx),
            isProcessed: false,
            isTranslated: false,
            translationProgress: 0,
            translateStatusMsg: '',
            translationError: '',
            isTranslating: false
          });
        };
        reader.readAsText(file);
      });
    });

    Promise.all(newFilesPromises).then(newFiles => {
      setFiles(prev => {
        const combined = [...prev, ...newFiles];
        // Select first uploaded file if nothing was selected
        if (!selectedFileId && combined.length > 0) {
          setSelectedFileId(combined[0].id);
        }
        return combined;
      });

      // Auto-adjust start ad times based on the first subtitle of the first loaded file
      if (newFiles.length > 0 && newFiles[0].subtitles.length > 0) {
        const firstStartMs = timeToMs(newFiles[0].subtitles[0].start);
        if (firstStartMs > 5000) {
          setInsertStart(true);
          setStartTimeStart('00:00:01,000');
          const endMs = Math.min(31000, firstStartMs - 1500);
          setStartTimeEnd(msToTime(endMs));
        } else {
          setInsertStart(false);
          setStartTimeStart('00:00:00,500');
          setStartTimeEnd(msToTime(Math.max(500, firstStartMs - 500)));
        }
      }

      setActiveTab('brand');
    });
  };

  // Re-scan gaps for a specific file when Min Gap Size is modified
  const reanalyzeFileGaps = (fileId, limitSeconds) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;

      const gaps = [];
      for (let i = 0; i < f.subtitles.length - 1; i++) {
        const endMs = timeToMs(f.subtitles[i].end);
        const nextStartMs = timeToMs(f.subtitles[i + 1].start);
        const gapMs = nextStartMs - endMs;

        if (gapMs >= limitSeconds * 1000) {
          gaps.push({
            index: i,
            start: f.subtitles[i].end,
            end: f.subtitles[i + 1].start,
            durationSec: Math.floor(gapMs / 1000),
            recommendedStart: msToTime(endMs + 3000),
            recommendedEnd: msToTime(Math.min(endMs + 33000, nextStartMs - 3000))
          });
        }
      }
      return {
        ...f,
        detectedGaps: gaps,
        selectedGaps: gaps.map((_, idx) => idx)
      };
    }));
  };

  // Run Subtitle Processing (Branding & Replacements) for a single file
  const processFileBranding = (file) => {
    let workingSubs = JSON.parse(JSON.stringify(file.subtitles));

    // 1. Handle Competitor Replacements
    workingSubs = workingSubs.map((sub) => {
      const action = file.competitorActions[sub.id];
      if (action === 'replace') {
        return { ...sub, text: brandingText };
      } else if (action === 'remove') {
        return null; // Flag for deletion
      }
      return sub;
    }).filter(sub => sub !== null);

    // 2. Inject Ads (Start, End, Gaps)
    const adsToInject = [];

    // Start Ad
    if (insertStart) {
      const resolvedStartBranding = startBrandingText
        .replace(/{drama}/g, file.dramaName || 'Unknown Drama')
        .replace(/{episode}/g, file.episodeNum || '01');

      adsToInject.push({
        start: startTimeStart,
        end: startTimeEnd,
        text: resolvedStartBranding
      });
    }

    // End Ad
    if (insertEnd && workingSubs.length > 0) {
      const lastSub = workingSubs[workingSubs.length - 1];
      const lastEndMs = timeToMs(lastSub.end);
      const adStartMs = lastEndMs + 2000;
      const adEndMs = adStartMs + (endDuration * 1000);

      adsToInject.push({
        start: msToTime(adStartMs),
        end: msToTime(adEndMs),
        text: endingBrandingText
      });
    }

    // Gap Ads
    if (insertGaps) {
      file.selectedGaps.forEach((gapIdx) => {
        const gap = file.detectedGaps[gapIdx];
        if (gap) {
          adsToInject.push({
            start: gap.recommendedStart,
            end: gap.recommendedEnd,
            text: brandingText
          });
        }
      });
    }

    // Combine and sort by start timestamp
    const allSubs = [...workingSubs, ...adsToInject.map((ad, idx) => ({
      id: `ad-${idx}`,
      start: ad.start,
      end: ad.end,
      text: ad.text
    }))];

    allSubs.sort((a, b) => timeToMs(a.start) - timeToMs(b.start));

    // Renumber IDs sequentially
    const finalized = allSubs.map((sub, idx) => ({
      ...sub,
      id: idx + 1
    }));

    return {
      ...file,
      processedSubs: finalized,
      editableSrtText: stringifySRT(finalized), // Sync raw text
      isProcessed: true
    };
  };

  // Run Subtitle Processing for ALL uploaded files
  const processBrandingBatch = () => {
    if (files.length === 0) return;
    setFiles(prev => prev.map(file => processFileBranding(file)));
    toast.success('All subtitles branded and updated successfully.');
    setActiveTab('export');
  };

  // AI Translate a Single File
  const translateSingleFile = async (fileId) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    updateFileState(fileId, {
      isTranslating: true,
      translationError: '',
      translationProgress: 0,
      translateStatusMsg: 'Initializing AI translation...'
    });

    const chunkSize = translationEngine === 'gemini' ? 40 : 150; // Optimal chunk size (smaller for Gemini timeouts, larger for Google Translate efficiency)
    const totalSubs = file.processedSubs.length;
    const totalChunks = Math.ceil(totalSubs / chunkSize);
    const updatedSubs = [...file.processedSubs];

    try {
      for (let c = 0; c < totalChunks; c++) {
        const startIndex = c * chunkSize;
        const endIndex = Math.min(startIndex + chunkSize, totalSubs);
        const chunk = updatedSubs.slice(startIndex, endIndex);

        updateFileState(fileId, {
          translateStatusMsg: `Translating subtitle blocks ${startIndex + 1} to ${endIndex} of ${totalSubs}...`
        });

        const chunkSrtText = stringifySRT(chunk);
        
        // Add a delay between requests to avoid rate limits (HTTP 429)
        if (c > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Post to backend translation API with automatic retry and exponential backoff for rate limits
        let response;
        let retries = 5;
        let backoffDelay = 6000; // 6 seconds initial delay

        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            response = await apiClient.post('/api/admin/ai/translate', {
              srtContent: chunkSrtText,
              engine: translationEngine
            }, {
              timeout: 120000
            });
            break; // Success, break out of retry loop
          } catch (apiErr) {
            const status = apiErr.response?.status;
            const isRateLimit = status === 429 || (apiErr.message && apiErr.message.includes('429')) || (apiErr.response?.data?.error && apiErr.response.data.error.includes('429'));
            
            if (isRateLimit && attempt < retries) {
              const currentDelay = backoffDelay * attempt + Math.floor(Math.random() * 2000); // Backoff + jitter
              updateFileState(fileId, {
                translateStatusMsg: `Rate limit hit (429). Retrying chunk ${c + 1}/${totalChunks} (attempt ${attempt + 1}/${retries}) in ${Math.round(currentDelay / 1000)}s...`
              });
              await new Promise(resolve => setTimeout(resolve, currentDelay));
            } else if (!status && attempt < retries) {
              // Network/Timeout error retry
              const currentDelay = 3000 * attempt;
              updateFileState(fileId, {
                translateStatusMsg: `Network error. Retrying chunk ${c + 1}/${totalChunks} (attempt ${attempt + 1}/${retries}) in ${Math.round(currentDelay / 1000)}s...`
              });
              await new Promise(resolve => setTimeout(resolve, currentDelay));
            } else {
              throw apiErr; // Permanent error or exceeded max retries
            }
          }
        }

        const translatedChunkText = response.data.translatedSrt;
        const parsedTranslatedChunk = parseSRT(translatedChunkText);

        // Map translations back by index matching
        for (let j = 0; j < chunk.length; j++) {
          const translatedItem = parsedTranslatedChunk[j];
          if (translatedItem) {
            updatedSubs[startIndex + j].text = translatedItem.text;
          }
        }
        
        const percentage = Math.round(((c + 1) / totalChunks) * 100);
        updateFileState(fileId, {
          translationProgress: percentage
        });
      }

      updateFileState(fileId, {
        processedSubs: updatedSubs,
        editableSrtText: stringifySRT(updatedSubs),
        isTranslating: false,
        isTranslated: true,
        translateStatusMsg: 'AI Subtitle Translation completed successfully!'
      });
    } catch (err) {
      console.error(err);
      updateFileState(fileId, {
        isTranslating: false,
        translationError: err.response?.data?.error || err.message || 'An error occurred during translation. Please verify backend setup.'
      });
      throw err;
    }
  };

  const handleTranslateSelected = async () => {
    if (!selectedFileId) return;
    try {
      await translateSingleFile(selectedFileId);
    } catch (e) {
      // Handled inside
    }
  };

  const handleTranslateAll = async () => {
    if (files.length === 0) return;
    for (const file of files) {
      try {
        await translateSingleFile(file.id);
      } catch (e) {
        console.error(`Failed to translate file: ${file.name}`);
      }
    }
  };

  // Download a single file
  const triggerDownload = (file) => {
    const srtText = file.editableSrtText || stringifySRT(file.processedSubs);
    const blob = new Blob([srtText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const baseName = cleanBaseName(file.name);
    link.href = url;
    link.download = `${baseName}_www.ksubzone.com.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSelected = () => {
    if (activeFile) {
      triggerDownload(activeFile);
    }
  };

  const handleDownloadAll = () => {
    if (files.length === 0) return;
    files.forEach(file => {
      triggerDownload(file);
    });
  };

  // Reset tool state completely
  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear all loaded files and start a new batch?')) {
      setFiles([]);
      setSelectedFileId(null);
      setEditingBlockId(null);
      setEditingText('');
      setActiveTab('upload');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Inline Subtitle Block Editing
  const startBlockEdit = (sub) => {
    setEditingBlockId(sub.id);
    setEditingText(sub.text || '');
  };

  const saveBlockEdit = (blockId) => {
    if (!selectedFileId) return;
    setFiles(prev => prev.map(f => {
      if (f.id !== selectedFileId) return f;

      const updatedSubs = f.processedSubs.map(sub => 
        sub.id === blockId ? { ...sub, text: editingText } : sub
      );

      return {
        ...f,
        processedSubs: updatedSubs,
        editableSrtText: stringifySRT(updatedSubs)
      };
    }));
    setEditingBlockId(null);
  };

  const deleteBlock = (blockId) => {
    if (!selectedFileId) return;
    if (!window.confirm('Are you sure you want to delete this subtitle block?')) return;

    setFiles(prev => prev.map(f => {
      if (f.id !== selectedFileId) return f;

      const filtered = f.processedSubs.filter(sub => sub.id !== blockId);
      const updatedSubs = filtered.map((sub, idx) => ({
        ...sub,
        id: idx + 1
      }));

      return {
        ...f,
        processedSubs: updatedSubs,
        editableSrtText: stringifySRT(updatedSubs)
      };
    }));
  };

  return (
    <div className="min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase flex items-center gap-3">
                <Languages className="w-8 h-8 text-brand-accent animate-pulse" />
                Subtitle Branding & AI Translator
              </h1>
              <p className="text-slate-400 text-xs mt-1">
                Upload English/Sinhala subtitles, automatically inject branding credits, clean competitor ads, and translate using Gemini 1.5.
              </p>
            </div>
            {files.length > 0 && (
              <button
                type="button"
                onClick={navigateToCleaner}
                className="px-4 py-2.5 bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 text-brand-primary rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5"
              >
                <Wand2 className="w-4 h-4" /> Send to SRT Cleaner
              </button>
            )}
          </div>

          {/* Workflow Tabs */}
          <div className="flex overflow-x-auto whitespace-nowrap border-b border-white/5 mb-6 scrollbar-none">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-3 border-b-2 text-xs uppercase tracking-widest font-black transition-all ${
                activeTab === 'upload'
                  ? 'border-brand-primary text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              1. Upload
            </button>
            <button
              onClick={() => { if (files.length > 0) setActiveTab('brand'); }}
              disabled={files.length === 0}
              className={`px-6 py-3 border-b-2 text-xs uppercase tracking-widest font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'brand'
                  ? 'border-brand-primary text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              2. Clean & Brand
            </button>
            <button
              onClick={() => { if (files.length > 0) setActiveTab('translate'); }}
              disabled={files.length === 0}
              className={`px-6 py-3 border-b-2 text-xs uppercase tracking-widest font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'translate'
                  ? 'border-brand-primary text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              3. AI Translation
            </button>
            <button
              onClick={() => { if (files.length > 0) setActiveTab('export'); }}
              disabled={files.length === 0}
              className={`px-6 py-3 border-b-2 text-xs uppercase tracking-widest font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'export'
                  ? 'border-brand-primary text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              4. Export Preview
            </button>
          </div>

          {/* Active Files Selector Bar */}
          {files.length > 0 && activeTab !== 'upload' && (
            <div className="bg-luxury-900 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-primary" /> Active Batch Subtitles ({files.length})
                </span>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Clear & Reset
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                {files.map((file) => {
                  const isSelected = file.id === selectedFileId;
                  return (
                    <button
                      key={file.id}
                      onClick={() => {
                        setSelectedFileId(file.id);
                        setEditingBlockId(null);
                      }}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                        isSelected
                          ? 'bg-brand-primary/10 border-brand-primary text-white shadow-neon-accent'
                          : 'bg-luxury-950 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate max-w-[180px]">{file.name}</span>
                      {file.isTranslated && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">Translated</span>
                      )}
                      {file.isProcessed && !file.isTranslated && (
                        <span className="text-[9px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded font-black uppercase">Branded</span>
                      )}
                      {!file.isProcessed && (
                        <span className="text-[9px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">Pending</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="space-y-6">
            
            {/* 1. UPLOAD TAB */}
            {activeTab === 'upload' && (
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 hover:border-brand-primary/50 bg-luxury-900/50 hover:bg-luxury-900 transition-all rounded-3xl p-16 flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[350px] text-center"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".srt" 
                  multiple
                  className="hidden" 
                />
                <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Drag & drop your subtitle files here</h3>
                  <p className="text-slate-400 text-xs mt-1">Supports uploading multiple standard SubRip (.srt) subtitle files at once</p>
                </div>
                <button className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition">
                  Browse Files
                </button>
              </div>
            )}

            {/* 2. CLEAN & BRAND TAB */}
            {activeTab === 'brand' && activeFile && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Configuration Left Panel */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Selected File Branding Details */}
                  <div className="bg-luxury-900 border border-white/5 rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-brand-accent" /> Selected File Branding Details
                    </h2>
                    <p className="text-slate-400 text-xs">
                      Verify or edit the drama name and episode number parsed from <b className="text-slate-300">{activeFile.name}</b>.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block mb-1">Drama Name</span>
                        <input
                          type="text"
                          value={activeFile.dramaName || ''}
                          onChange={(e) => updateFileState(activeFile.id, { dramaName: e.target.value })}
                          className="w-full bg-luxury-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-brand-primary"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block mb-1">Episode Number</span>
                        <input
                          type="text"
                          value={activeFile.episodeNum || ''}
                          onChange={(e) => updateFileState(activeFile.id, { episodeNum: e.target.value })}
                          className="w-full bg-luxury-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none focus:border-brand-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Start Advertisement Template Card */}
                  <div className="bg-luxury-900 border border-white/5 rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-primary" /> Start Advertisement Template (Dynamic)
                    </h2>
                    <p className="text-slate-400 text-xs">
                      Use <code>{'{drama}'}</code> and <code>{'{episode}'}</code> placeholders. They will be replaced dynamically for each file in the batch.
                    </p>
                    <textarea
                      value={startBrandingText}
                      onChange={(e) => setStartBrandingText(e.target.value)}
                      rows={5}
                      className="w-full bg-luxury-950 border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-200 outline-none focus:border-brand-primary resize-none"
                    />
                  </div>

                  {/* Branding Template Card */}
                  <div className="bg-luxury-900 border border-white/5 rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-brand-accent" /> Middle Gap & Competitor Branding Template
                    </h2>
                    <p className="text-slate-400 text-xs">
                      This template is used for middle timeline gaps and when replacing competitor credits.
                    </p>
                    <textarea
                      value={brandingText}
                      onChange={(e) => setBrandingText(e.target.value)}
                      rows={3}
                      className="w-full bg-luxury-950 border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-200 outline-none focus:border-brand-primary resize-none"
                    />
                  </div>

                  {/* Ad Placements Configuration */}
                  <div className="bg-luxury-900 border border-white/5 rounded-2xl p-6 space-y-6">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Settings className="w-4 h-4 text-brand-primary" /> Placement Settings
                    </h2>

                    {/* Start Ad */}
                    <div className="border-b border-white/5 pb-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={insertStart} 
                            onChange={(e) => setInsertStart(e.target.checked)}
                            className="rounded accent-brand-primary bg-luxury-950 border-white/10" 
                          />
                          Inject Advertisement at Start
                        </label>
                        <span className="text-[10px] bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-2 py-0.5 rounded font-black">START</span>
                      </div>
                      {insertStart && (
                        <div className="space-y-3 pl-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block mb-1">Start Time</span>
                              <input 
                                type="text" 
                                value={startTimeStart} 
                                onChange={(e) => setStartTimeStart(e.target.value)}
                                className="w-full bg-luxury-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none focus:border-brand-primary"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block mb-1">End Time</span>
                              <input 
                                type="text" 
                                value={startTimeEnd} 
                                onChange={(e) => setStartTimeEnd(e.target.value)}
                                className="w-full bg-luxury-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none focus:border-brand-primary"
                              />
                            </div>
                          </div>
                          
                          {activeFile.subtitles.length > 0 && (
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-white/5">
                              <span className="text-[10px] text-slate-400">
                                First dialogue starts at: <span className="font-mono text-brand-primary font-bold">{activeFile.subtitles[0].start}</span>
                              </span>
                              
                              {timeToMs(startTimeEnd) >= timeToMs(activeFile.subtitles[0].start) ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Overlaps dialogue!
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const firstStartMs = timeToMs(activeFile.subtitles[0].start);
                                      setStartTimeStart('00:00:01,000');
                                      const endMs = Math.max(2000, firstStartMs - 1500);
                                      setStartTimeEnd(msToTime(endMs));
                                    }}
                                    className="px-2 py-0.5 bg-brand-primary/20 border border-brand-primary/30 hover:bg-brand-primary/30 text-brand-primary rounded text-[9px] font-black uppercase tracking-wider transition"
                                  >
                                    Auto-Adjust
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Time slot fits timeline
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* End Ad */}
                    <div className="border-b border-white/5 pb-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={insertEnd} 
                            onChange={(e) => setInsertEnd(e.target.checked)}
                            className="rounded accent-brand-primary bg-luxury-950 border-white/10" 
                          />
                          Inject Advertisement at End
                        </label>
                        <span className="text-[10px] bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-2 py-0.5 rounded font-black">END</span>
                      </div>
                      {insertEnd && (
                        <div className="grid grid-cols-1 gap-4 pl-6">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1">Duration (Seconds)</span>
                            <input 
                              type="number" 
                              value={endDuration} 
                              onChange={(e) => setEndDuration(parseInt(e.target.value, 10) || 30)}
                              className="w-full max-w-[150px] bg-luxury-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Will automatically insert 2 seconds after the final subtitle block finishes.</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1">Ending Advertisement Template</span>
                            <textarea
                              value={endingBrandingText}
                              onChange={(e) => setEndingBrandingText(e.target.value)}
                              rows={4}
                              className="w-full bg-luxury-950 border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-200 outline-none focus:border-brand-primary resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Gap Ads */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={insertGaps} 
                            onChange={(e) => setInsertGaps(e.target.checked)}
                            className="rounded accent-brand-primary bg-luxury-950 border-white/10" 
                          />
                          Inject Advertisement in Middle Gaps
                        </label>
                        <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-black">TIMELINE GAPS</span>
                      </div>
                      
                      {insertGaps && (
                        <div className="pl-6 space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 uppercase">Min Gap Size:</span>
                            <input 
                              type="number" 
                              value={minGapSeconds} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 30;
                                setMinGapSeconds(val);
                                // Re-run gap analysis for selected file
                                reanalyzeFileGaps(activeFile.id, val);
                              }}
                              className="w-20 bg-luxury-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-center font-mono text-slate-300 outline-none"
                            />
                            <span className="text-[10px] text-slate-500">Seconds</span>
                            <button 
                              onClick={() => reanalyzeFileGaps(activeFile.id, minGapSeconds)}
                              className="p-1.5 hover:bg-white/5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition"
                              title="Rescan Gaps"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Gaps List */}
                          {activeFile.detectedGaps.length === 0 ? (
                            <div className="p-4 bg-luxury-950 border border-white/5 rounded-xl text-center text-xs text-slate-500">
                              No subtitle gaps longer than {minGapSeconds} seconds were found in {activeFile.name}.
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-none">
                              <span className="text-[10px] text-slate-500 uppercase font-black">Select gaps to inject branding ad:</span>
                              {activeFile.detectedGaps.map((gap, idx) => (
                                <div 
                                  key={idx}
                                  className="flex items-center justify-between p-2.5 bg-luxury-950 border border-white/5 rounded-xl text-xs hover:border-white/10 transition"
                                >
                                  <div className="flex items-center gap-3">
                                    <input 
                                      type="checkbox" 
                                      checked={activeFile.selectedGaps.includes(idx)}
                                      onChange={(e) => {
                                        const updatedGaps = e.target.checked
                                          ? [...activeFile.selectedGaps, idx]
                                          : activeFile.selectedGaps.filter(v => v !== idx);
                                        updateFileState(activeFile.id, { selectedGaps: updatedGaps });
                                      }}
                                      className="rounded accent-brand-primary"
                                    />
                                    <div>
                                      <span className="font-bold text-slate-300">Gap #{idx + 1}</span>
                                      <span className="text-[10px] text-slate-500 ml-2">Duration: {gap.durationSec}s</span>
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center">
                                    {gap.start.split(',')[0]} <ArrowRight className="inline w-3 h-3 mx-1 text-slate-500" /> {gap.end.split(',')[0]}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>

                </div>

                {/* Competitor Removal Right Panel */}
                <div className="space-y-6">
                  
                  {/* Competitor Detections Card */}
                  <div className="bg-luxury-900 border border-white/5 rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-4.5 h-4.5 text-amber-500" /> Competitor Ads Clean Up
                    </h2>
                    <p className="text-slate-400 text-xs">
                      Scanned competitor branding lines for <b className="text-slate-300">{activeFile.name}</b>.
                    </p>

                    {activeFile.detectedCompetitors.length === 0 ? (
                      <div className="p-8 bg-luxury-950 border border-white/5 rounded-2xl text-center text-xs text-emerald-400 flex flex-col items-center justify-center gap-2">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                        No competitor brandings found in this subtitle!
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-none">
                        {activeFile.detectedCompetitors.map((sub) => (
                          <div 
                            key={sub.id}
                            className="bg-luxury-950 border border-white/10 rounded-xl p-3.5 space-y-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-slate-500">Block #{sub.id} ({sub.start.split(',')[0]})</span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => {
                                    const actions = { ...activeFile.competitorActions, [sub.id]: 'replace' };
                                    updateFileState(activeFile.id, { competitorActions: actions });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    activeFile.competitorActions[sub.id] === 'replace'
                                      ? 'bg-brand-primary text-white font-black'
                                      : 'bg-white/5 text-slate-400 hover:text-slate-300'
                                  }`}
                                >
                                  Replace
                                </button>
                                <button
                                  onClick={() => {
                                    const actions = { ...activeFile.competitorActions, [sub.id]: 'remove' };
                                    updateFileState(activeFile.id, { competitorActions: actions });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    activeFile.competitorActions[sub.id] === 'remove'
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      : 'bg-white/5 text-slate-400 hover:text-slate-300'
                                  }`}
                                >
                                  Remove
                                </button>
                                <button
                                  onClick={() => {
                                    const actions = { ...activeFile.competitorActions, [sub.id]: 'ignore' };
                                    updateFileState(activeFile.id, { competitorActions: actions });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    activeFile.competitorActions[sub.id] === 'ignore'
                                      ? 'bg-white/10 text-white'
                                      : 'bg-white/5 text-slate-400 hover:text-slate-300'
                                  }`}
                                >
                                  Keep
                                </button>
                              </div>
                            </div>
                            <div className="p-2 bg-luxury-900 border border-white/5 rounded-lg text-slate-400 font-mono text-[10px] break-all whitespace-pre-wrap">
                              {sub.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Process Action */}
                  <button
                    onClick={processBrandingBatch}
                    className="w-full py-4 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-95 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4.5 h-4.5" /> Inject Branding & Clean All
                  </button>

                </div>

              </div>
            )}

            {/* 3. AI TRANSLATION TAB */}
            {activeTab === 'translate' && activeFile && (
              <div className="max-w-3xl mx-auto bg-luxury-900 border border-white/5 rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">AI Subtitle Translator (Gemini)</h2>
                    <p className="text-slate-400 text-xs mt-0.5">Translate your English subtitle dialogues to natural, high-quality Sinhala.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 text-xs text-slate-300 leading-relaxed space-y-2">
                  <p className="font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-brand-primary" /> Batch AI Translation:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>Subtitles are split into batches of 40 blocks and translated sequentially.</li>
                    <li>You can translate only the selected file, or trigger all files in a batch.</li>
                    <li>Exact timestamps, sequence numbers, and formatting tags are preserved.</li>
                  </ul>
                </div>

                {/* Translation Engine Selector */}
                <div className="bg-luxury-950 border border-white/5 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-200">Translation Engine</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Choose between Gemini 1.5 Flash (AI) or Google Translate (Free)</p>
                  </div>
                  <select
                    value={translationEngine}
                    onChange={(e) => setTranslationEngine(e.target.value)}
                    className="h-10 px-3.5 bg-luxury-900 border border-white/10 rounded-xl outline-none focus:border-brand-primary text-slate-300 text-xs cursor-pointer min-w-[180px]"
                  >
                    <option value="gemini">Gemini 1.5 Flash (AI)</option>
                    <option value="google">Google Translate (Free)</option>
                  </select>
                </div>

                {/* Progress Indicators for All Files */}
                <div className="space-y-4">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block">Translation Queue & Status:</span>
                  {files.map((file) => (
                    <div 
                      key={file.id}
                      className={`p-4 rounded-xl border text-xs flex flex-col gap-2 transition ${
                        file.id === selectedFileId 
                          ? 'bg-luxury-950 border-brand-primary/30' 
                          : 'bg-luxury-950/40 border-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-300 truncate max-w-[250px]">{file.name}</span>
                        {file.isTranslating ? (
                          <span className="text-[10px] text-brand-accent font-mono animate-pulse">Translating ({file.translationProgress}%)</span>
                        ) : file.isTranslated ? (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Queued</span>
                        )}
                      </div>
                      
                      {file.isTranslating && (
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/10">
                          <div 
                            className="bg-gradient-to-r from-brand-primary to-brand-accent h-full transition-all duration-300"
                            style={{ width: `${file.translationProgress}%` }}
                          />
                        </div>
                      )}

                      {file.translateStatusMsg && file.isTranslating && (
                        <p className="text-[9px] text-slate-500 font-mono">{file.translateStatusMsg}</p>
                      )}

                      {file.translationError && (
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono mt-1">
                          {file.translationError}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    disabled={files.some(f => f.isTranslating)}
                    onClick={() => setActiveTab('brand')}
                    className="px-5 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold border border-white/10 transition"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleTranslateSelected}
                    disabled={files.some(f => f.isTranslating) || !activeFile}
                    className="px-5 py-3 bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 text-brand-primary rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Languages className="w-4 h-4" /> Translate Selected
                  </button>
                  <button
                    onClick={handleTranslateAll}
                    disabled={files.some(f => f.isTranslating)}
                    className="px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 text-white rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {files.some(f => f.isTranslating) ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Translating Batch...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Translate All Files
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 4. EXPORT TAB */}
            {activeTab === 'export' && activeFile && (
              <div className="space-y-6">
                
                {/* File summary and download */}
                <div className="bg-luxury-900 border border-white/5 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Processed Subtitle Ready</h3>
                    <p className="text-slate-400 text-xs mt-1">
                      File: <b className="text-slate-300">{cleanBaseName(activeFile.name)}_www.ksubzone.com.srt</b> • Blocks: <b className="text-brand-primary font-mono">{activeFile.processedSubs.length}</b>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setActiveTab('translate')}
                      className="px-5 py-3 bg-brand-accent/10 border border-brand-accent/25 hover:bg-brand-accent/20 text-brand-accent rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" /> AI Translate
                    </button>
                    {files.length > 1 && (
                      <button
                        onClick={handleDownloadAll}
                        className="px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" /> Download All ({files.length})
                      </button>
                    )}
                    <button
                      onClick={handleDownloadSelected}
                      className="px-5 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg"
                    >
                      <Download className="w-4 h-4" /> Download Selected
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-5 py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5"
                      title="Clear and upload new subtitles"
                    >
                      <Undo className="w-4 h-4" /> Reset & Start New
                    </button>
                  </div>
                </div>

                {/* Subtitle Side by Side Preview */}
                <div className="bg-luxury-900 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[600px]">
                  <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-brand-primary" />
                      <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">
                        {previewMode === 'blocks' ? 'Live Subtitle Content Preview & Edit' : 'Raw SRT Text Editor (Full)'}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      {previewMode === 'blocks' && (
                        <span className="text-[10px] text-slate-500">Click Edit to modify or Trash to delete individual blocks</span>
                      )}
                      <div className="flex bg-luxury-950 p-1 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setPreviewMode('blocks')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all ${
                            previewMode === 'blocks'
                              ? 'bg-brand-primary text-white shadow-neon-accent'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Visual Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('raw')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all ${
                            previewMode === 'raw'
                              ? 'bg-brand-primary text-white shadow-neon-accent'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Raw Editor (Full)
                        </button>
                      </div>
                    </div>
                  </div>

                  {previewMode === 'blocks' ? (
                    <div className="flex-grow overflow-auto p-6 space-y-4 select-text scrollbar-none">
                      {activeFile.processedSubs.map((sub) => {
                        const isAd = String(sub.id).includes('ad-') || (sub.text || '').includes('ksubzone');
                        const isEditingThis = editingBlockId === sub.id;

                        return (
                          <div 
                            key={sub.id}
                            className={`p-4 border rounded-2xl flex flex-col sm:flex-row gap-4 items-start relative group transition-colors ${
                              isAd 
                                ? 'bg-brand-primary/5 border-brand-primary/20' 
                                : 'bg-luxury-950 border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2 sm:flex-col sm:items-start flex-shrink-0">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black font-mono ${
                                isAd ? 'bg-brand-primary/20 text-brand-primary' : 'bg-white/5 text-slate-400'
                              }`}>
                                {sub.id}
                              </span>
                              <div className="text-[10px] text-slate-500 font-mono">
                                <div>{sub.start.split(',')[0]}</div>
                                <div className="sm:hidden text-center my-0.5">↓</div>
                                <div>{sub.end.split(',')[0]}</div>
                              </div>
                            </div>

                            <div className="flex-grow w-full">
                              {isAd && (
                                <span className="inline-block px-1.5 py-0.5 mb-1.5 text-[8px] font-black uppercase tracking-wider rounded bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
                                  injected KSubZone ad
                                </span>
                              )}

                              {isEditingThis ? (
                                <div className="space-y-2 mt-1">
                                  <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full bg-luxury-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-slate-200 outline-none focus:border-brand-primary resize-y"
                                    rows={Math.max(2, editingText.split('\n').length)}
                                    autoFocus
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => setEditingBlockId(null)}
                                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded text-[10px] uppercase font-black transition"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => saveBlockEdit(sub.id)}
                                      className="px-3 py-1 bg-brand-primary hover:bg-brand-primary/95 text-white rounded text-[10px] uppercase font-black transition"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed select-text" dangerouslySetInnerHTML={{ __html: sub.text || '' }} />
                              )}
                            </div>

                            {/* Block Actions (Hover overlay) */}
                            {!isEditingThis && (
                              <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-luxury-900 border border-white/10 rounded-xl p-1 shadow-lg">
                                <button
                                  onClick={() => startBlockEdit(sub)}
                                  className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded transition"
                                  title="Edit Block Content"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteBlock(sub.id)}
                                  className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition"
                                  title="Delete Block"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col p-6 bg-luxury-950/40 relative">
                      <textarea
                        value={activeFile.editableSrtText}
                        onChange={(e) => {
                          const newText = e.target.value;
                          const parsed = parseSRT(newText);
                          updateFileState(activeFile.id, {
                            editableSrtText: newText,
                            processedSubs: parsed
                          });
                        }}
                        placeholder="Paste or edit subtitle content here in standard SRT format..."
                        className="flex-grow w-full bg-luxury-950/80 border border-white/10 rounded-2xl p-4 text-xs font-mono text-slate-200 outline-none focus:border-brand-primary resize-none overflow-y-auto"
                      />
                      <div className="mt-3 flex justify-between items-center text-[10px] text-slate-500 font-mono px-2">
                        <span>Characters: {activeFile.editableSrtText.length}</span>
                        <span>Subtitle Blocks: {activeFile.processedSubs.length}</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}
