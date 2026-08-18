<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * සිංහල: Subtitle සහ quality checks දත්ත ගබඩා කිරීම සඳහා අවශ්‍ය tables නිර්මාණය කිරීම.
     */
    public function up(): void
    {
        // Create subtitles table if not exists
        if (!Schema::hasTable('subtitles')) {
            Schema::create('subtitles', function (Blueprint $table) {
                $table->id();
                $table->string('file_path');
                $table->string('language')->default('Sinhala');
                $table->string('version')->default('1.0');
                $table->string('format')->default('srt');
                $table->unsignedInteger('season_number')->nullable();
                $table->unsignedInteger('episode_number')->nullable();
                $table->string('media_type'); // Movie or Drama
                $table->unsignedBigInteger('media_id');
                $table->string('approval_status')->default('Pending'); // Pending, Approved, Rejected
                $table->string('quality_status')->default('Pending'); // Pending, Passed, Failed
                $table->unsignedInteger('overlap_count')->default(0);
                $table->unsignedBigInteger('uploader_id')->nullable();
                $table->text('release_notes')->nullable();
                $table->text('moderator_notes')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('subtitles', function (Blueprint $table) {
                if (!Schema::hasColumn('subtitles', 'quality_status')) {
                    $table->string('quality_status')->default('Pending')->after('approval_status');
                }
                if (!Schema::hasColumn('subtitles', 'overlap_count')) {
                    $table->unsignedInteger('overlap_count')->default(0)->after('quality_status');
                }
            });
        }

        // Subtitle Quality checks audit log
        Schema::create('subtitle_quality_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subtitle_id')->constrained()->onDelete('cascade');
            $table->string('check_type'); // e.g., 'timing_overlap', 'formatting', 'spam_filter'
            $table->boolean('passed');
            $table->json('details')->nullable(); // JSON payload of issues found
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subtitle_quality_checks');
    }
};
