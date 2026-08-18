<?php

namespace App\Services;

class SubtitleQualityCheckerService
{
    /**
     * Run all quality validation assertions on an SRT file.
     * සිංහල: උපසිරැසි ගොනුවේ සියලුම quality checks සිදුකර වාර්තාවක් ලබා දීම.
     */
    public function check(string $filePath): array
    {
        try {
            $blocks = $this->parseSrt($filePath);
            
            $overlaps = $this->checkTimingOverlaps($blocks);
            $formattingIssues = $this->checkFormatting($blocks);
            $spamIssues = $this->checkSpamFilter($blocks);
            
            $passed = empty($overlaps) && empty($formattingIssues) && empty($spamIssues);

            return [
                'passed' => $passed,
                'summary' => [
                    'total_blocks' => count($blocks),
                    'overlap_count' => count($overlaps),
                    'format_issue_count' => count($formattingIssues),
                    'spam_trigger_count' => count($spamIssues),
                ],
                'details' => [
                    'overlaps' => $overlaps,
                    'formatting' => $formattingIssues,
                    'spam' => $spamIssues,
                ]
            ];
        } catch (\Exception $e) {
            return [
                'passed' => false,
                'error' => $e->getMessage(),
                'summary' => [
                    'total_blocks' => 0,
                    'overlap_count' => 0,
                    'format_issue_count' => 0,
                    'spam_trigger_count' => 0,
                ],
                'details' => []
            ];
        }
    }

    /**
     * Parse an SRT subtitle file into structured subtitle blocks.
     */
    public function parseSrt(string $filePath): array
    {
        if (!file_exists($filePath)) {
            throw new \Exception("SRT file path does not exist on disk: " . $filePath);
        }

        $content = file_get_contents($filePath);
        
        // Normalize line endings to LF (\n)
        $content = str_replace("\r\n", "\n", $content);
        $content = str_replace("\r", "\n", $content);
        
        $lines = explode("\n", $content);
        $blocks = [];
        $currentBlock = [];
        
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === "") {
                if (!empty($currentBlock)) {
                    $blocks[] = $this->parseBlock($currentBlock);
                    $currentBlock = [];
                }
            } else {
                $currentBlock[] = $trimmed;
            }
        }
        
        if (!empty($currentBlock)) {
            $blocks[] = $this->parseBlock($currentBlock);
        }
        
        return array_filter($blocks); // Filter out empty or unparseable blocks
    }

    /**
     * Parse a single subtitle block line stack.
     */
    private function parseBlock(array $rawLines): ?array
    {
        if (count($rawLines) < 2) {
            return null; // Empty block
        }

        $index = intval($rawLines[0]);
        $timeLine = $rawLines[1];
        
        $timePattern = '/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/';
        
        if (!preg_match($timePattern, $timeLine, $matches)) {
            // Check if line index is missing and the timeline is at line 0
            if (preg_match($timePattern, $rawLines[0], $matches)) {
                $timeLine = $rawLines[0];
                $index = null;
                $textLines = array_slice($rawLines, 1);
            } else {
                return [
                    'index' => $index,
                    'error' => 'Invalid timing syntax: ' . $timeLine,
                    'raw' => $rawLines
                ];
            }
        } else {
            $textLines = array_slice($rawLines, 2);
        }

        $startText = $matches[1];
        $endText = $matches[2];
        
        return [
            'index' => $index,
            'start_text' => $startText,
            'end_text' => $endText,
            'start_ms' => $this->parseTimestamp($startText),
            'end_ms' => $this->parseTimestamp($endText),
            'text' => implode("\n", $textLines),
            'raw' => $rawLines
        ];
    }

    /**
     * Convert timing string (00:01:23,450) to milliseconds.
     */
    private function parseTimestamp(string $timestamp): int
    {
        $timestamp = str_replace(',', '.', $timestamp);
        $parts = explode(':', $timestamp);
        
        $hours = intval($parts[0] ?? 0);
        $minutes = intval($parts[1] ?? 0);
        
        $secParts = explode('.', $parts[2] ?? '0.000');
        $seconds = intval($secParts[0] ?? 0);
        $ms = intval($secParts[1] ?? 0);
        
        return ($hours * 3600 * 1000) + ($minutes * 60 * 1000) + ($seconds * 1000) + $ms;
    }

    /**
     * Detect timings overlap.
     * සිංහල: කලින් කොටස අවසන් වීමට පෙර ඊළඟ කොටස ආරම්භ වන timing overlaps සෙවීම.
     */
    private function checkTimingOverlaps(array $blocks): array
    {
        $overlaps = [];
        $prevBlock = null;

        foreach ($blocks as $idx => $block) {
            if (isset($block['error'])) {
                continue;
            }
            
            if ($prevBlock !== null) {
                if ($block['start_ms'] < $prevBlock['end_ms']) {
                    $overlapDuration = $prevBlock['end_ms'] - $block['start_ms'];
                    
                    // Filter out rounding differences (< 50ms)
                    if ($overlapDuration > 50) {
                        $overlaps[] = [
                            'block_index' => $block['index'] ?? ($idx + 1),
                            'prev_block_index' => $prevBlock['index'] ?? $idx,
                            'overlap_duration_ms' => $overlapDuration,
                            'start_text' => $block['start_text'],
                            'prev_end_text' => $prevBlock['end_text'],
                            'message' => "Block #{$block['index']} starts at {$block['start_text']} before Block #{$prevBlock['index']} ends at {$prevBlock['end_text']}"
                        ];
                    }
                }
            }
            $prevBlock = $block;
        }

        return $overlaps;
    }

    /**
     * Check timing validity, durations, and reading speed.
     */
    private function checkFormatting(array $blocks): array
    {
        $issues = [];

        foreach ($blocks as $idx => $block) {
            $index = $block['index'] ?? ($idx + 1);
            
            if (isset($block['error'])) {
                $issues[] = [
                    'block_index' => $index,
                    'type' => 'syntax_error',
                    'message' => $block['error']
                ];
                continue;
            }

            $duration = $block['end_ms'] - $block['start_ms'];
            
            if ($duration <= 0) {
                $issues[] = [
                    'block_index' => $index,
                    'type' => 'invalid_duration',
                    'message' => "Zero or negative duration subtitle block ({$duration}ms)"
                ];
            } elseif ($duration > 10000) {
                $issues[] = [
                    'block_index' => $index,
                    'type' => 'excessive_duration',
                    'message' => "Dialogue displayed for too long: " . round($duration / 1000, 2) . "s"
                ];
            }

            if (empty(trim($block['text']))) {
                $issues[] = [
                    'block_index' => $index,
                    'type' => 'empty_text',
                    'message' => "Empty dialogue content"
                ];
            }

            // Word velocity check (hard boundary limit)
            $wordCount = str_word_count(strip_tags($block['text']));
            if ($duration > 0 && $wordCount > 0) {
                $wps = ($wordCount / $duration) * 1000;
                if ($wps > 9.0) {
                    $issues[] = [
                        'block_index' => $index,
                        'type' => 'reading_velocity',
                        'message' => "Excessive reading speed: " . round($wps, 1) . " words per second"
                    ];
                }
            }
        }

        return $issues;
    }

    /**
     * Scan dialogs for ad signatures, telegram channels, gambling spam.
     */
    private function checkSpamFilter(array $blocks): array
    {
        $spamIssues = [];
        $spamRegexPatterns = [
            '/(https?:\/\/|www\.)[a-z0-9-]+(\.[a-z0-9-]+)+/i',
            '/t\.me\/[a-z0-9_]+/i',
            '/join.*telegram/i',
            '/subscribe.*channel/i',
            '/casino|slot|betting|1xbet|melbet|linebet/i',
            '/@?adl_drama/i'
        ];

        foreach ($blocks as $idx => $block) {
            if (isset($block['error'])) {
                continue;
            }
            
            foreach ($spamRegexPatterns as $pattern) {
                if (preg_match($pattern, $block['text'], $matches)) {
                    $spamIssues[] = [
                        'block_index' => $block['index'] ?? ($idx + 1),
                        'matched' => $matches[0],
                        'message' => "Promotional spam trigger detected: '{$matches[0]}'"
                    ];
                    break;
                }
            }
        }

        return $spamIssues;
    }
}
