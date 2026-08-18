@extends('layouts.admin')

@section('content')
<div class="container mx-auto px-4 py-8 max-w-6xl">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
            <nav class="text-sm text-slate-500 mb-2">
                <a href="{{ route('admin.subtitles.index') }}" class="hover:underline">Subtitles Queue</a>
                <span class="mx-2">/</span>
                <span class="text-slate-300">File Audit Report</span>
            </nav>
            <h1 class="text-3xl font-black text-white tracking-tight uppercase">Audit Report: Subtitle ID #{{ $subtitle->id }}</h1>
            <p class="text-slate-400 text-sm mt-1">Review timing overlap checks, format validations, and spam markers before releasing to live catalog.</p>
        </div>
        
        <div class="flex items-center gap-2">
            <form action="{{ route('admin.subtitles.recheck', $subtitle) }}" method="POST">
                @csrf
                <button type="submit" class="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-200 hover:bg-white/10 flex items-center gap-2 transition">
                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4"/></svg>
                    Dispatch Audit Recheck
                </button>
            </form>
            <a href="{{ Storage::url($subtitle->file_path) }}" target="_blank" class="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-200 hover:bg-white/10 flex items-center gap-2 transition">
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Download Subtitle
            </a>
        </div>
    </div>

    @if (session('success'))
        <div class="p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ session('success') }}
        </div>
    @endif

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Audit Details -->
        <div class="lg:col-span-2 space-y-6">
            
            <!-- Quality Checklist -->
            <div class="rounded-3xl border border-white/5 bg-slate-900/50 p-6 backdrop-blur-md">
                <h2 class="text-lg font-extrabold text-white mb-6 uppercase tracking-wider">Automated Audit Checklist</h2>
                
                <div class="space-y-4">
                    <!-- Overlap Checker Status -->
                    <div class="p-4 rounded-2xl border {{ ($checks['timing_overlap']['passed'] ?? true) ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10' }}">
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <span class="w-8 h-8 rounded-full flex items-center justify-center {{ ($checks['timing_overlap']['passed'] ?? true) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400' }}">
                                    @if ($checks['timing_overlap']['passed'] ?? true)
                                        ✓
                                    @else
                                        ✗
                                    @endif
                                </span>
                                <div>
                                    <h3 class="text-sm font-bold text-white uppercase tracking-wide">Timing Overlap Checker</h3>
                                    <p class="text-xs text-slate-400 mt-0.5">Scans srt line bounds to verify next block starts after previous one closes.</p>
                                </div>
                            </div>
                            <span class="text-xs font-black uppercase {{ ($checks['timing_overlap']['passed'] ?? true) ? 'text-emerald-400' : 'text-rose-400' }}">
                                {{ ($checks['timing_overlap']['passed'] ?? true) ? 'PASSED' : 'FAILED' }}
                            </span>
                        </div>
                        
                        @if (!($checks['timing_overlap']['passed'] ?? true))
                            <div class="mt-4 border-t border-rose-500/10 pt-4 space-y-2.5">
                                <p class="text-xs font-semibold text-rose-300">Detected overlap occurrences ({{ count($checks['timing_overlap']['details'] ?? []) }}):</p>
                                <div class="max-h-60 overflow-y-auto space-y-2 pr-2">
                                    @foreach ($checks['timing_overlap']['details'] ?? [] as $overlap)
                                        <div class="p-2.5 bg-black/40 rounded-xl text-xs font-mono text-slate-300 border border-white/5">
                                            {{ $overlap['message'] }} (Overlap: <span class="text-rose-400 font-bold">{{ $overlap['overlap_duration_ms'] }}ms</span>)
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        @endif
                    </div>

                    <!-- Formatting Status -->
                    <div class="p-4 rounded-2xl border {{ ($checks['formatting']['passed'] ?? true) ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10' }}">
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <span class="w-8 h-8 rounded-full flex items-center justify-center {{ ($checks['formatting']['passed'] ?? true) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400' }}">
                                    @if ($checks['formatting']['passed'] ?? true)
                                        ✓
                                    @else
                                        ✗
                                    @endif
                                </span>
                                <div>
                                    <h3 class="text-sm font-bold text-white uppercase tracking-wide">Format and Velocity Validator</h3>
                                    <p class="text-xs text-slate-400 mt-0.5">Scans duration bounds, empty tags, block numbers, and excessive reading speed.</p>
                                </div>
                            </div>
                            <span class="text-xs font-black uppercase {{ ($checks['formatting']['passed'] ?? true) ? 'text-emerald-400' : 'text-rose-400' }}">
                                {{ ($checks['formatting']['passed'] ?? true) ? 'PASSED' : 'FAILED' }}
                            </span>
                        </div>
                        
                        @if (!($checks['formatting']['passed'] ?? true))
                            <div class="mt-4 border-t border-rose-500/10 pt-4 space-y-2.5">
                                <p class="text-xs font-semibold text-rose-300">Format or Duration violations found:</p>
                                <div class="max-h-60 overflow-y-auto space-y-2 pr-2">
                                    @foreach ($checks['formatting']['details'] ?? [] as $issue)
                                        <div class="p-2.5 bg-black/40 rounded-xl text-xs font-mono text-slate-300 border border-white/5 flex items-start gap-2">
                                            <span class="px-1.5 py-0.5 bg-rose-500/25 text-rose-400 rounded text-[9px] font-bold uppercase">{{ $issue['type'] }}</span>
                                            <div>
                                                <span class="text-slate-400 font-bold">Block #{{ $issue['block_index'] }}:</span> {{ $issue['message'] }}
                                            </div>
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        @endif
                    </div>

                    <!-- Spam filter Status -->
                    <div class="p-4 rounded-2xl border {{ ($checks['spam_filter']['passed'] ?? true) ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10' }}">
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <span class="w-8 h-8 rounded-full flex items-center justify-center {{ ($checks['spam_filter']['passed'] ?? true) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400' }}">
                                    @if ($checks['spam_filter']['passed'] ?? true)
                                        ✓
                                    @else
                                        ✗
                                    @endif
                                </span>
                                <div>
                                    <h3 class="text-sm font-bold text-white uppercase tracking-wide">Promotional & Spam Filter</h3>
                                    <p class="text-xs text-slate-400 mt-0.5">Checks for Telegram links, casino/slot advertising, and external watermark links.</p>
                                </div>
                            </div>
                            <span class="text-xs font-black uppercase {{ ($checks['spam_filter']['passed'] ?? true) ? 'text-emerald-400' : 'text-rose-400' }}">
                                {{ ($checks['spam_filter']['passed'] ?? true) ? 'PASSED' : 'FAILED' }}
                            </span>
                        </div>
                        
                        @if (!($checks['spam_filter']['passed'] ?? true))
                            <div class="mt-4 border-t border-rose-500/10 pt-4 space-y-2.5">
                                <p class="text-xs font-semibold text-rose-300">Detected spam keywords or links:</p>
                                <div class="max-h-60 overflow-y-auto space-y-2 pr-2">
                                    @foreach ($checks['spam_filter']['details'] ?? [] as $spam)
                                        <div class="p-2.5 bg-black/40 rounded-xl text-xs font-mono text-slate-300 border border-white/5">
                                            Block #{{ $spam['block_index'] }}: Found <span class="text-rose-400 font-bold">{{ $spam['matched'] }}</span> - {{ $spam['message'] }}
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        @endif
                    </div>
                </div>
            </div>

        </div>

        <!-- Sidebar Moderation Action Desk -->
        <div class="space-y-6">
            
            <!-- Metadata Summary Card -->
            <div class="rounded-3xl border border-white/5 bg-slate-900/50 p-6 backdrop-blur-md">
                <h2 class="text-sm font-black text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-3">File Summary</h2>
                
                <div class="space-y-3 text-xs">
                    <div class="flex justify-between"><span class="text-slate-500">Language:</span> <span class="font-bold text-slate-200">{{ $subtitle->language }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Format:</span> <span class="font-bold text-slate-200 font-mono">{{ strtoupper($subtitle->format) }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Version:</span> <span class="font-bold text-slate-200">v{{ $subtitle->version }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Target Type:</span> <span class="font-bold text-slate-200">{{ $subtitle->media_type }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Target ID:</span> <span class="font-bold text-slate-200 font-mono">#{{ $subtitle->media_id }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Episode Context:</span> <span class="font-bold text-slate-200">{{ $subtitle->season_number ? 'S' . $subtitle->season_number . ' E' . $subtitle->episode_number : 'N/A' }}</span></div>
                    <hr class="border-white/5 my-2">
                    <div class="flex justify-between"><span class="text-slate-500">Quality Status:</span> 
                        <span class="px-2 py-0.5 rounded font-black uppercase text-[10px] {{ $subtitle->quality_status === 'Passed' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400' }}">
                            {{ $subtitle->quality_status }}
                        </span>
                    </div>
                    <div class="flex justify-between"><span class="text-slate-500">Moderation Status:</span> 
                        <span class="px-2 py-0.5 rounded font-black uppercase text-[10px] {{ $subtitle->approval_status === 'Approved' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : ($subtitle->approval_status === 'Rejected' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400') }}">
                            {{ $subtitle->approval_status }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Moderation actions form -->
            <div class="rounded-3xl border border-white/5 bg-slate-900/50 p-6 backdrop-blur-md">
                <h2 class="text-sm font-black text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-3">Moderation Actions</h2>

                <form action="{{ route('admin.subtitles.approve', $subtitle) }}" method="POST" class="space-y-4">
                    @csrf
                    @method('PUT')
                    <div>
                        <label for="moderator_notes" class="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Moderator Review Remarks</label>
                        <textarea 
                            name="moderator_notes" 
                            id="moderator_notes" 
                            rows="4" 
                            placeholder="Add reason for approval, timing corrections, or rejection warnings..."
                            class="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-brand-primary placeholder:text-slate-600 focus:ring-1 focus:ring-brand-primary"
                        >{{ $subtitle->moderator_notes }}</textarea>
                    </div>

                    <div class="flex gap-2">
                        <!-- Reject trigger (Submit via different action URL) -->
                        <button 
                            type="submit" 
                            formaction="{{ route('admin.subtitles.reject', $subtitle) }}"
                            class="flex-1 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                            ✗ Reject File
                        </button>
                        <!-- Approve trigger -->
                        <button 
                            type="submit"
                            class="flex-1 h-10 rounded-xl bg-brand-primary text-white text-xs font-black uppercase tracking-wider hover:bg-brand-primary/85 transition flex items-center justify-center gap-1.5 shadow-lg shadow-brand-primary/25"
                        >
                            ✓ Approve & Publish
                        </button>
                    </div>
                </form>
            </div>
            
        </div>
    </div>
</div>
@endsection
