<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subtitle extends Model
{
    protected $fillable = [
        'file_path',
        'language',
        'version',
        'format',
        'season_number',
        'episode_number',
        'media_type',
        'media_id',
        'approval_status', // Pending, Approved, Rejected
        'quality_status',   // Pending, Passed, Failed
        'overlap_count',
        'uploader_id',
        'release_notes',
        'moderator_notes',
    ];

    /**
     * Get quality checks logs for this subtitle file.
     * සිංහල: උපසිරැසියේ සියලුම quality check වාර්තා ලබා ගැනීම.
     */
    public function qualityChecks(): HasMany
    {
        return $this->hasMany(SubtitleQualityCheck::class);
    }

    /**
     * Scope for pending review files.
     */
    public function scopePending($query)
    {
        return $query->where('approval_status', 'Pending');
    }

    /**
     * Scope for subtitles that passed checks.
     */
    public function scopePassedQuality($query)
    {
        return $query->where('quality_status', 'Passed');
    }
}
