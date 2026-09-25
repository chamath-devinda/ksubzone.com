'use client';

import React, { useMemo, useState } from 'react';

const WIDTH = 760;
const HEIGHT = 266;
const PADDING = { top: 16, right: 56, bottom: 42, left: 16 };

function makeSmoothPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] || points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] || next;
    const controlOneX = current.x + (next.x - previous.x) / 6;
    const controlOneY = current.y + (next.y - previous.y) / 6;
    const controlTwoX = next.x - (afterNext.x - current.x) / 6;
    const controlTwoY = next.y - (afterNext.y - current.y) / 6;

    path += ` C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${next.x} ${next.y}`;
  }

  return path;
}

function displayDate(value, index) {
  if (!value) return `Day ${index + 1}`;
  const date = String(value);
  return date.length >= 10 ? date.slice(5, 10) : date;
}

function displayAxisValue(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

/**
 * Google Search Console-inspired performance chart. The optional comparison
 * series is data-driven (currently unique visitors) and disappears when the
 * dashboard API has not reported it.
 */
export default function VelocityChart({ series = [], comparison = null }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [showPrimary, setShowPrimary] = useState(true);
  const [showComparison, setShowComparison] = useState(true);

  const hasComparison = Array.isArray(comparison?.values)
    && comparison.values.length === series.length
    && comparison.values.some((value) => Number(value) > 0);

  const { primaryPoints, comparisonPoints, axisTicks } = useMemo(() => {
    const primaryValues = series.map((entry) => Math.max(0, Number(entry?.views || 0)));
    const secondaryValues = hasComparison
      ? comparison.values.map((value) => Math.max(0, Number(value || 0)))
      : [];
    const maximum = Math.max(...primaryValues, ...secondaryValues, 1);
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const toPoint = (value, index, values) => ({
      x: PADDING.left + (values.length <= 1 ? plotWidth / 2 : (index / (values.length - 1)) * plotWidth),
      y: PADDING.top + plotHeight - (value / maximum) * plotHeight,
      value,
      date: series[index]?.date,
    });

    return {
      primaryPoints: primaryValues.map(toPoint),
      comparisonPoints: secondaryValues.map(toPoint),
      axisTicks: [1, 0.75, 0.5, 0.25, 0].map((progress) => ({
        value: maximum * progress,
        y: PADDING.top + plotHeight - plotHeight * progress,
      })),
    };
  }, [comparison, hasComparison, series]);

  const primaryPath = useMemo(() => makeSmoothPath(primaryPoints), [primaryPoints]);
  const comparisonPath = useMemo(() => makeSmoothPath(comparisonPoints), [comparisonPoints]);
  const baseline = HEIGHT - PADDING.bottom;
  const areaPath = primaryPoints.length
    ? `${primaryPath} L ${primaryPoints[primaryPoints.length - 1].x} ${baseline} L ${primaryPoints[0].x} ${baseline} Z`
    : '';
  const activePrimary = activeIndex === null ? null : primaryPoints[activeIndex];
  const activeComparison = activeIndex === null ? null : comparisonPoints[activeIndex];
  const tooltipAnchor = showPrimary ? activePrimary : showComparison ? activeComparison : null;

  const selectPointAtPointer = (event) => {
    if (primaryPoints.length < 2) {
      setActiveIndex(0);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    setActiveIndex(Math.round(progress * (primaryPoints.length - 1)));
  };

  const moveActivePoint = (step) => {
    setActiveIndex((current) => {
      const index = current === null ? 0 : current;
      return Math.max(0, Math.min(primaryPoints.length - 1, index + step));
    });
  };

  if (!primaryPoints.length) {
    return <div className="velocity-chart-empty">No daily telemetry reported by the analytics gateway.</div>;
  }

  const tooltipLeft = Math.max(9, Math.min(88, (tooltipAnchor?.x / WIDTH) * 100));
  const tooltipTop = Math.max(8, Math.min(72, (tooltipAnchor?.y / HEIGHT) * 100));
  const labelInterval = Math.max(1, Math.ceil(primaryPoints.length / 7));
  const chartKey = `${series.map((entry) => `${entry.date}:${entry.views}`).join('|')}:${comparison?.values?.join('|') || ''}`;

  return (
    <div className="velocity-chart" onPointerLeave={() => setActiveIndex(null)}>
      <div className="velocity-chart-legend" aria-label="Chart series controls">
        <button
          type="button"
          className={!showPrimary ? 'is-muted' : undefined}
          aria-pressed={showPrimary}
          onClick={() => setShowPrimary((value) => !value)}
        >
          <span className="velocity-chart-legend-dot velocity-chart-legend-dot-primary" />
          Total Views
        </button>
        {hasComparison && (
          <button
            type="button"
            className={!showComparison ? 'is-muted' : undefined}
            aria-pressed={showComparison}
            onClick={() => setShowComparison((value) => !value)}
          >
            <span className="velocity-chart-legend-dot velocity-chart-legend-dot-comparison" />
            {comparison?.label || 'Comparison'}
          </button>
        )}
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="velocity-chart-svg"
        role="img"
        aria-label="Streaming viewership performance over the selected period"
        tabIndex={0}
        onPointerMove={selectPointAtPointer}
        onFocus={() => setActiveIndex(0)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            moveActivePoint(1);
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            moveActivePoint(-1);
          }
        }}
      >
        <defs>
          <linearGradient id="velocity-area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </linearGradient>
          <filter id="velocity-primary-glow" x="-20%" y="-30%" width="140%" height="160%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {axisTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={tick.y}
              y2={tick.y}
              className="velocity-chart-gridline"
            />
            <text x={WIDTH - 4} y={tick.y + 3.5} textAnchor="end" className="velocity-chart-y-label">
              {displayAxisValue(tick.value)}
            </text>
          </g>
        ))}

        {showPrimary && <path key={`area-${chartKey}`} d={areaPath} className="velocity-chart-area" />}
        {showComparison && hasComparison && (
          <path key={`comparison-${chartKey}`} d={comparisonPath} className="velocity-chart-comparison-line" />
        )}
        {showPrimary && (
          <path
            key={`primary-${chartKey}`}
            d={primaryPath}
            className="velocity-chart-primary-line"
            filter="url(#velocity-primary-glow)"
          />
        )}

        {tooltipAnchor && (
          <>
            <line
              x1={tooltipAnchor.x}
              x2={tooltipAnchor.x}
              y1={tooltipAnchor.y}
              y2={baseline}
              className="velocity-chart-guideline"
            />
            {showPrimary && activePrimary && (
              <>
                <circle cx={activePrimary.x} cy={activePrimary.y} r="7" className="velocity-chart-marker-halo velocity-chart-marker-halo-primary" />
                <circle cx={activePrimary.x} cy={activePrimary.y} r="3.5" className="velocity-chart-marker velocity-chart-marker-primary" />
              </>
            )}
            {showComparison && hasComparison && activeComparison && (
              <>
                <circle cx={activeComparison.x} cy={activeComparison.y} r="7" className="velocity-chart-marker-halo velocity-chart-marker-halo-comparison" />
                <circle cx={activeComparison.x} cy={activeComparison.y} r="3.5" className="velocity-chart-marker velocity-chart-marker-comparison" />
              </>
            )}
          </>
        )}

        {primaryPoints.map((point, index) => {
          const shouldShow = index === 0 || index === primaryPoints.length - 1 || index % labelInterval === 0;
          if (!shouldShow) return null;
          return (
            <text key={`${point.date || 'day'}-${index}`} x={point.x} y={HEIGHT - 13} textAnchor="middle" className="velocity-chart-label">
              {displayDate(point.date, index)}
            </text>
          );
        })}
      </svg>

      {tooltipAnchor && (
        <div className="velocity-chart-tooltip" role="status" style={{ left: `${tooltipLeft}%`, top: `${tooltipTop}%` }}>
          <span className="velocity-chart-tooltip-date">{displayDate(tooltipAnchor.date, activeIndex)}</span>
          {showPrimary && activePrimary && (
            <span className="velocity-chart-tooltip-value velocity-chart-tooltip-value-primary">
              <i /> Total Views <strong>{activePrimary.value.toLocaleString()}</strong>
            </span>
          )}
          {showComparison && hasComparison && activeComparison && (
            <span className="velocity-chart-tooltip-value velocity-chart-tooltip-value-comparison">
              <i /> {comparison?.label || 'Comparison'} <strong>{activeComparison.value.toLocaleString()}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
