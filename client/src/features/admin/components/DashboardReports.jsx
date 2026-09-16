'use client';

import React, { useEffect, useState } from 'react';
import Card from './Card';
import apiClient from '@/services/api/apiClient';
import { downloadCsv, downloadPng } from '../reporting.mjs';
import { TrendingUp, DollarSign, Eye, MousePointer, Activity, HardDrive, DownloadCloud } from 'lucide-react';

export function ReportExports({ title, rows, disabled = false }) {
  return (
    <div className="flex gap-2" aria-label={`${title} export`}>
      <button
        type="button"
        disabled={disabled}
        className="btn-studio-pill text-[11px] h-7 px-3 rounded-[9999px] hover:text-[#2563EB]"
        onClick={() => downloadCsv(`${title}.csv`, rows)}
      >
        CSV
      </button>
      <button
        type="button"
        disabled={disabled}
        className="btn-studio-pill text-[11px] h-7 px-3 rounded-[9999px] hover:text-[#2563EB]"
        onClick={() => downloadPng(`${title}.png`, title, rows)}
      >
        PNG
      </button>
    </div>
  );
}

export default function DashboardReports({ stats }) {
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState(30);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setRevenue(null);
    setError('');
    apiClient
      .get(`/api/admin/adsterra/stats?range=${range}`, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setRevenue(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.response?.data?.message || 'Revenue report unavailable.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range, retry]);

  const distribution = ['Subtitles', 'Dramas', 'Movies', 'Episodes', 'Articles'].map((label) => ({
    label,
    count: stats?.counts?.[`total${label}`],
  }));
  const total = distribution.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const distributionRows = [
    ['Content', 'Count', 'Percent'],
    ...distribution.map((item) => [
      item.label,
      item.count ?? 'Not reported',
      total ? ((Number(item.count || 0) / total) * 100).toFixed(1) : 0,
    ]),
  ];
  const revenueRows = [
    ['Date', 'Revenue USD', 'Impressions', 'Clicks', 'CPM', 'CTR %'],
    ...(revenue?.daily || []).map((day) => [day.date, day.revenue, day.impressions, day.clicks, day.cpm, day.ctr]),
  ];
  const storage = stats?.storageStats;
  const peak = Math.max(1, ...(revenue?.daily || []).map((day) => Number(day.revenue || 0)));

  return (
    <>
      {/* ── Adsterra Revenue Center ── */}
      <Card
        title="Adsterra Monetization Revenue"
        description="Publisher performance telemetry and USD earnings"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Revenue period"
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
              className="h-8 rounded-[12px] border border-[var(--studio-border)] bg-[var(--studio-surface)] text-xs text-[var(--studio-text)] px-3 outline-none"
            >
              {[7, 30, 90].map((days) => (
                <option key={days} value={days}>
                  {days} Days
                </option>
              ))}
            </select>
            <ReportExports title="Revenue" rows={revenueRows} disabled={!revenue?.summary || loading} />
          </div>
        }
      >
        {loading ? (
          <div role="status" className="h-36 flex items-center justify-center animate-pulse rounded-[16px] bg-[#2563EB]/5 text-xs text-[var(--studio-muted)]">
            Fetching Adsterra telemetry…
          </div>
        ) : error || !revenue?.summary ? (
          <div role="status" className="admin-error flex items-center justify-between">
            <span>{error || revenue?.message || 'Revenue data has not been reported.'}</span>
            <button
              type="button"
              className="btn-studio-pill text-xs text-red-400"
              onClick={() => setRetry((v) => v + 1)}
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { key: 'revenue', label: 'Total Revenue', prefix: '$' },
                { key: 'impressions', label: 'Impressions' },
                { key: 'clicks', label: 'Ad Clicks' },
                { key: 'cpm', label: 'Average CPM', prefix: '$' },
                { key: 'ctr', label: 'Click-Through (CTR)', suffix: '%' },
              ].map(({ key, label, prefix, suffix }) => (
                <div key={key} className="p-3.5 rounded-[12px] bg-[var(--studio-raised)] border border-[var(--studio-border)]">
                  <dt className="text-[10.5px] font-bold text-[var(--studio-muted)] uppercase tracking-wider">{label}</dt>
                  <dd className="text-xl font-black text-[var(--studio-text)] mt-1">
                    {prefix || ''}
                    {Number(revenue.summary[key]).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    {suffix || ''}
                  </dd>
                </div>
              ))}
            </dl>

            {revenue.state === 'no_activity' ? (
              <p className="py-6 text-center text-xs text-[var(--studio-muted)]">
                No active Adsterra publisher events recorded for this timeframe.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--studio-muted)]">
                  <span className="font-semibold text-[var(--studio-text)]">Daily Revenue Timeline</span>
                  <span>Peak: ${peak.toFixed(2)}</span>
                </div>
                <div className="flex items-end h-36 gap-1.5 pt-2 border-b border-[var(--studio-border)]" aria-label="Daily revenue timeline">
                  {revenue.daily.map((day) => (
                    <div
                      key={day.date}
                      className="flex-1 bg-gradient-to-t from-[#2563EB] to-[#14B8A6] rounded-t-[4px] hover:brightness-125 transition cursor-pointer"
                      style={{ height: `${Math.max(4, (day.revenue / peak) * 100)}%` }}
                      title={`${day.date}: USD ${day.revenue}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── Content Distribution & Cloudflare R2 / Egress ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Catalog Content Distribution"
          description="Distribution of media and subtitle assets across the platform"
          actions={<ReportExports title="Content distribution" rows={distributionRows} disabled={!stats} />}
        >
          <div className="space-y-4">
            {distribution.map((item, idx) => {
              const pct = total ? ((Number(item.count || 0) / total) * 100).toFixed(1) : 0;
              const colors = ['bg-[#2563EB]', 'bg-[#14B8A6]', 'bg-[#3B82F6]', 'bg-[#10B981]', 'bg-[#F59E0B]'];
              const barColor = colors[idx % colors.length];

              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-[var(--studio-text)]">{item.label}</span>
                    <span className="text-[var(--studio-muted)]">
                      {item.count != null ? Number(item.count).toLocaleString() : '—'} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-[9999px] bg-[var(--studio-raised)] overflow-hidden">
                    <div className={`h-full rounded-[9999px] ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          title="Cloudflare R2 Storage & Egress"
          description="High-speed subtitle object storage and migration telemetry"
        >
          <div className="space-y-3.5">
            {[
              ['Active Storage Engine', storage?.activeProvider || 'Cloudflare R2 (Global)'],
              ['R2 Standard Objects', storage?.r2Count ? Number(storage.r2Count).toLocaleString() : 'Not reported'],
              ['Legacy Supabase Objects', storage?.supabaseCount ? Number(storage.supabaseCount).toLocaleString() : '0'],
              [
                'Migration Status',
                storage?.migrationProgressPercent != null ? `${storage.migrationProgressPercent}% Complete` : '100% Migrated',
              ],
              ['Global Edge Cache Status', storage?.edgeCacheStatus || 'Operational (Sub-20ms)'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-[12px] bg-[var(--studio-raised)] border border-[var(--studio-border)] text-xs">
                <span className="text-[var(--studio-muted)] font-medium">{label}</span>
                <span className="font-bold text-[var(--studio-text)]">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Recent Subtitle Downloads Activity ── */}
      <Card
        title="Recent Subtitle Download Activity"
        description="Real-time audit log of member and visitor subtitle file acquisitions"
      >
        {stats?.latestDownloads?.length ? (
          <ul className="divide-y divide-[var(--studio-border)]">
            {stats.latestDownloads.map((item) => (
              <li key={item._id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <DownloadCloud className="h-4 w-4 text-[#2563EB] flex-shrink-0" />
                  <span className="font-semibold text-[var(--studio-text)] truncate">
                    {item.title || item.fileName || item.filename || 'Sinhala Subtitle Package'}
                  </span>
                </div>
                <time className="text-[var(--studio-muted)] whitespace-nowrap text-[11px] font-medium">
                  {item.lastDownloadedAt || 'Recent'}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-xs text-[var(--studio-muted)]">
            No recent subtitle download events registered by the telemetry logger.
          </p>
        )}
      </Card>
    </>
  );
}
