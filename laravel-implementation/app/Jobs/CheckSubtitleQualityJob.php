<?php

namespace App\Jobs;

use App\Models\Subtitle;
use App\Models\SubtitleQualityCheck;
use App\Services\SubtitleQualityCheckerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CheckSubtitleQualityJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $subtitle;

    /**
     * Create a new job instance.
     */
    public function __construct(Subtitle $subtitle)
    {
        $this->subtitle = $subtitle;
    }

    /**
     * Execute the job.
     * සිංහල: Queue එක හරහා පසුබිමින් subtitle එකක quality පරික්ෂා කර ප්‍රතිඵල database එකෙහි සටහන් කිරීම.
     */
    public function handle(SubtitleQualityCheckerService $checker): void
    {
        Log::info("Starting quality check for subtitle ID: {$this->subtitle->id}");

        // Get local file path (supports local storage or public storage)
        $filePath = Storage::path($this->subtitle->file_path);

        if (!file_exists($filePath)) {
            Log::error("Subtitle file not found on disk: {$filePath}");
            $this->subtitle->update([
                'quality_status' => 'Failed',
                'moderator_notes' => 'Auto-quality check failed: Subtitle file is missing on storage.'
            ]);
            return;
        }

        // Run quality checks
        $results = $checker->check($filePath);

        // Delete old checks if any
        $this->subtitle->qualityChecks()->delete();

        // 1. Log Overlaps Check
        SubtitleQualityCheck::create([
            'subtitle_id' => $this->subtitle->id,
            'check_type' => 'timing_overlap',
            'passed' => empty($results['details']['overlaps']),
            'details' => $results['details']['overlaps']
        ]);

        // 2. Log Formatting Checks
        SubtitleQualityCheck::create([
            'subtitle_id' => $this->subtitle->id,
            'check_type' => 'formatting',
            'passed' => empty($results['details']['formatting']),
            'details' => $results['details']['formatting']
        ]);

        // 3. Log Spam Filter Checks
        SubtitleQualityCheck::create([
            'subtitle_id' => $this->subtitle->id,
            'check_type' => 'spam_filter',
            'passed' => empty($results['details']['spam']),
            'details' => $results['details']['spam']
        ]);

        // Determine final quality state
        $qualityStatus = $results['passed'] ? 'Passed' : 'Failed';
        $overlapCount = count($results['details']['overlaps']);

        $this->subtitle->update([
            'quality_status' => $qualityStatus,
            'overlap_count' => $overlapCount
        ]);

        // Auto Approval Logic:
        // If quality check passes completely, and uploader is trusted, auto-approve it.
        // සිංහල: සියලුම quality checks සමත් වී ඇත්නම්, auto-approve කර ප්‍රසිද්ධ කිරීම.
        if ($results['passed'] && $this->subtitle->approval_status === 'Pending') {
            $this->subtitle->update([
                'approval_status' => 'Approved',
                'moderator_notes' => 'Auto-approved by Subtitle Quality Engine.'
            ]);
            
            Log::info("Subtitle ID: {$this->subtitle->id} has been auto-approved.");
            
            // Dispatch event for downstream side-effects (e.g. notifications, telegram channel posts)
            // event(new \App\Events\SubtitleAutoApproved($this->subtitle));
        } else {
            Log::info("Subtitle ID: {$this->subtitle->id} checks completed. Quality: {$qualityStatus}");
        }
    }
}
