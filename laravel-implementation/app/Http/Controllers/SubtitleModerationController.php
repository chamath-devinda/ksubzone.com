<?php

namespace App\Http\Controllers;

use App\Models\Subtitle;
use App\Jobs\CheckSubtitleQualityJob;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class SubtitleModerationController extends Controller
{
    /**
     * Display a queue of subtitles pending moderation.
     * සිංහල: අනුමැතිය සඳහා පොරොත්තු ලේඛනයේ ඇති උපසිරැසි ලැයිස්තුව පෙන්වීම.
     */
    public function index(Request $request): View
    {
        $this->authorize('approve_subtitles', Subtitle::class);

        $query = Subtitle::query();

        // Optional filtering by quality status
        if ($request->has('quality')) {
            $query->where('quality_status', $request->input('quality'));
        }

        $subtitles = $query->with('qualityChecks')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return view('admin.subtitles.index', compact('subtitles'));
    }

    /**
     * Display a detailed report of quality checks, timing overlaps, and formatting details.
     * සිංහල: උපසිරැසියේ සියලුම timing overlaps, spam, සහ formatting වාර්තා විස්තරාත්මකව බැලීම.
     */
    public function show(Subtitle $subtitle): View
    {
        $this->authorize('approve_subtitles', $subtitle);

        $subtitle->load('qualityChecks');

        // Extract issues grouped by check type for easier rendering in Blade templates
        $checks = [];
        foreach ($subtitle->qualityChecks as $check) {
            $checks[$check->check_type] = [
                'passed' => $check->passed,
                'details' => $check->details ?? []
            ];
        }

        return view('admin.subtitles.show', compact('subtitle', 'checks'));
    }

    /**
     * Manually approve a subtitle file.
     */
    public function approve(Subtitle $subtitle, Request $request): RedirectResponse
    {
        $this->authorize('approve_subtitles', $subtitle);

        $request->validate([
            'moderator_notes' => 'nullable|string|max:1000'
        ]);

        $subtitle->update([
            'approval_status' => 'Approved',
            'moderator_notes' => $request->input('moderator_notes')
        ]);

        return redirect()
            ->route('admin.subtitles.show', $subtitle)
            ->with('success', 'Subtitle file has been approved successfully.');
    }

    /**
     * Manually reject a subtitle file.
     */
    public function reject(Subtitle $subtitle, Request $request): RedirectResponse
    {
        $this->authorize('approve_subtitles', $subtitle);

        $request->validate([
            'moderator_notes' => 'required|string|max:1000'
        ]);

        $subtitle->update([
            'approval_status' => 'Rejected',
            'moderator_notes' => $request->input('moderator_notes')
        ]);

        return redirect()
            ->route('admin.subtitles.index')
            ->with('success', 'Subtitle file has been rejected.');
    }

    /**
     * Manually dispatch the Quality Check queue Job.
     * සිංහල: උපසිරැසිය සඳහා quality check queue job එක නැවත ආරම්භ කිරීම.
     */
    public function recheck(Subtitle $subtitle): RedirectResponse
    {
        $this->authorize('approve_subtitles', $subtitle);

        $subtitle->update([
            'quality_status' => 'Pending'
        ]);

        // Dispatch background queue worker job
        CheckSubtitleQualityJob::dispatch($subtitle);

        return redirect()
            ->route('admin.subtitles.show', $subtitle)
            ->with('success', 'Quality check job dispatched to the worker queue.');
    }
}
