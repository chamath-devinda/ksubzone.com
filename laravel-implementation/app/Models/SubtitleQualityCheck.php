<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubtitleQualityCheck extends Model
{
    protected $fillable = [
        'subtitle_id',
        'check_type',
        'passed',
        'details',
    ];

    protected $casts = [
        'passed' => 'boolean',
        'details' => 'array', // JSON payload cast to PHP array
    ];

    /**
     * Relationship back to the parent Subtitle record.
     */
    public function subtitle(): BelongsTo
    {
        return $this->belongsTo(Subtitle::class);
    }
}
