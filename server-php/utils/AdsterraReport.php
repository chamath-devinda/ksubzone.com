<?php
namespace Utils;

final class AdsterraReport {
    public static function normalize(array $payload, string $start, string $finish): array {
        $rows = $payload;
        if (!array_is_list($rows)) {
            $rows = null;
            foreach (['items', 'data', 'result', 'results', 'stats', 'report'] as $key) {
                if (!isset($payload[$key]) || !is_array($payload[$key])) continue;
                $candidate = $payload[$key];
                if (!array_is_list($candidate)) $candidate = $candidate['items'] ?? $candidate['rows'] ?? $candidate['data'] ?? null;
                if (is_array($candidate) && array_is_list($candidate)) { $rows = $candidate; break; }
            }
            if ($rows === null) throw new \UnexpectedValueException('Invalid report envelope');
        }
        $daily = [];
        foreach ($rows as $row) {
            if (!is_array($row)) throw new \UnexpectedValueException('Invalid report row');
            $date = $row['date'] ?? $row['day'] ?? '';
            $parsed = is_string($date) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $date) : false;
            if (!$parsed || $parsed->format('Y-m-d') !== $date || $date < $start || $date > $finish) throw new \UnexpectedValueException('Invalid report date');
            $values = ['impressions' => $row['impressions'] ?? $row['impression'] ?? null,
                'clicks' => $row['clicks'] ?? null, 'revenue' => $row['revenue'] ?? $row['profit'] ?? null];
            $daily[$date] ??= ['date' => $date, 'impressions' => 0, 'clicks' => 0, 'revenue' => 0];
            foreach ($values as $key => $value) {
                if (!is_numeric($value) || !is_finite((float)$value) || (float)$value < 0) throw new \UnexpectedValueException('Invalid report metric');
                $daily[$date][$key] += (float)$value;
            }
        }
        ksort($daily);
        $summary = ['impressions' => 0, 'clicks' => 0, 'revenue' => 0];
        foreach ($daily as &$row) {
            foreach (array_keys($summary) as $key) $summary[$key] += $row[$key];
            $row = self::ratios($row);
        }
        unset($row);
        return ['summary' => self::ratios($summary), 'daily' => array_values($daily)];
    }
    private static function ratios(array $row): array {
        $row['impressions'] = (int)round($row['impressions']);
        $row['clicks'] = (int)round($row['clicks']);
        $row['revenue'] = round($row['revenue'], 6);
        $row['ctr'] = $row['impressions'] > 0 ? round($row['clicks'] / $row['impressions'] * 100, 4) : 0;
        $row['cpm'] = $row['impressions'] > 0 ? round($row['revenue'] / $row['impressions'] * 1000, 4) : 0;
        return $row;
    }
}
