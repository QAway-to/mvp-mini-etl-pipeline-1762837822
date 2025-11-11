import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import etlFallback from '../src/mock-data/etl.json';
import { loadLaunches, buildMetrics } from '../src/lib/spacex';

const container = {
  fontFamily: 'Inter, sans-serif',
  padding: '16px 20px',
  background: '#0b1120',
  color: '#f8fafc',
  minHeight: '100vh',
  maxWidth: 1400,
  margin: '0 auto'
};

const card = {
  background: '#111c33',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  border: '1px solid rgba(56,189,248,0.25)',
  boxShadow: '0 20px 28px rgba(8, 47, 73, 0.45)'
};

export default function MiniETL({
  initialMetrics,
  initialLaunches,
  sourceUrl: initialSource,
  fallbackUsed: initialFallback,
  fetchedAt: initialFetchedAt
}) {
  const steps = useMemo(() => etlFallback.pipeline, []);
  const [launches, setLaunches] = useState(initialLaunches);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [sourceUrl, setSourceUrl] = useState(initialSource);
  const [fallbackUsed, setFallbackUsed] = useState(initialFallback);
  const [fetchedAt, setFetchedAt] = useState(initialFetchedAt);
  const [stepStatuses, setStepStatuses] = useState(() => steps.map((_, idx) => (idx === 0 ? 'active' : 'pending')));
  const [logLines, setLogLines] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);

  useEffect(() => {
    const statuses = steps.map(() => 'pending');
    const logs = [
      `Extract ▸ Получено ${launches.length} запусков (${fallbackUsed ? 'демо-данные' : extractDomain(sourceUrl)})`,
      `Transform ▸ Оставлено ${metrics.rows_out} успешных миссий, удалено ${metrics.dedup_removed}`,
      `Load ▸ Данные готовы. Последняя миссия: ${metrics.lastMission || 'n/a'}`
    ];
    const timers = [];

    setStepStatuses(statuses);
    setLogLines([]);

    timers.push(setTimeout(() => {
      setStepStatuses((prev) => prev.map((_, idx) => (idx === 0 ? 'active' : idx > 0 ? 'pending' : _)));
      setLogLines([logs[0]]);
    }, 200));

    timers.push(setTimeout(() => {
      setStepStatuses((prev) => prev.map((_, idx) => (idx === 0 ? 'done' : idx === 1 ? 'active' : 'pending')));
      setLogLines(logs.slice(0, 2));
    }, 1200));

    timers.push(setTimeout(() => {
      setStepStatuses((prev) => prev.map((_, idx) => (idx < 2 ? 'done' : 'active')));
      setLogLines(logs);
    }, 2200));

    timers.push(setTimeout(() => {
      setStepStatuses((prev) => prev.map(() => 'done'));
    }, 3200));

    return () => timers.forEach(clearTimeout);
  }, [launches, metrics, fallbackUsed, sourceUrl, steps]);

  const handleRestart = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/etl/restart');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      setLaunches(payload.launches);
      setMetrics(payload.metrics);
      setSourceUrl(payload.sourceUrl);
      setFallbackUsed(payload.fallbackUsed);
      setFetchedAt(payload.fetchedAt);
      setLogLines((prev) => [...prev, '🔁 Конвейер перезапущен']);
    } catch (error) {
      setLogLines((prev) => [...prev, `⚠️ Ошибка перезапуска: ${error}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    const headers = ['id', 'name', 'date_utc', 'success', 'upcoming', 'rocket', 'launchpad'];
    const csvRows = [headers.join(',')];
    launches.forEach((launch) => {
      const row = headers
        .map((key) => formatCsvValue(key === 'date_utc' ? new Date(launch[key]).toISOString() : launch[key]))
        .join(',');
      csvRows.push(row);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mini-etl-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setLogLines((prev) => [...prev, `📤 Экспортировано ${launches.length} строк в CSV`]);
  };

  const isLive = !fallbackUsed;

  return (
    <main style={container}>
      <header style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>🔄 Mini‑ETL Pipeline</h1>
          <p style={{ color: '#94a3b8', marginTop: 6, fontSize: 14 }}>
            Proof-of-Concept: вытягиваем реальные данные из SpaceX API, прогоняем через шаги Extract → Transform → Load и показываем метрики.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <StatusBadge live={isLive} />
            <span style={{ color: '#64748b', fontSize: 12 }}>
              Источник: {extractDomain(sourceUrl)} · Обновлено: {new Date(fetchedAt).toLocaleString()}
            </span>
          </div>
        </div>
        <button
          onClick={handleRestart}
          disabled={isProcessing}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            background: isProcessing ? '#0f172a' : 'linear-gradient(135deg,#38bdf8,#0ea5e9)',
            border: 'none',
            color: isProcessing ? '#475569' : '#0b1120',
            fontWeight: 700,
            cursor: isProcessing ? 'wait' : 'pointer',
            minWidth: 160,
            fontSize: 13
          }}
        >
          {isProcessing ? 'Перезапуск...' : 'Перезапустить конвейер'}
        </button>
      </header>

      <section style={{ ...card, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {steps.map((step, idx) => (
          <PipelinePill key={step} step={step} index={idx} status={stepStatuses[idx]} />
        ))}
      </section>

      <section style={{ ...card }}>
        <h2 style={{ marginTop: 0, fontSize: 18, marginBottom: 12 }}>📊 Metrics</h2>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <Metric label="Rows in" value={metrics.rows_in} max={metrics.rows_in} />
          <Metric label="Rows out" value={metrics.rows_out} max={metrics.rows_in} />
          <Metric label="Removed" value={metrics.dedup_removed} max={metrics.rows_in} />
          <Metric label="Upcoming" value={metrics.upcoming} max={metrics.rows_in} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <section style={{ ...card }}>
          <h2 style={{ marginTop: 0, fontSize: 18, marginBottom: 10 }}>📝 Live Log</h2>
          <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, minHeight: 80, maxHeight: 120, overflowY: 'auto' }}>
            {logLines.map((line, idx) => (
              <div key={idx} style={{ color: '#cbd5f5', marginBottom: 4 }}>
                {line}
              </div>
            ))}
            {!logLines.length && <span style={{ color: '#475569' }}>Лог обновляется автоматически...</span>}
          </div>
        </section>

        <section style={{ ...card }}>
          <h2 style={{ marginTop: 0, fontSize: 18, marginBottom: 10 }}>⚙️ Управление</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SecondaryButton onClick={() => setShowSourceModal(true)}>Посмотреть исходный файл</SecondaryButton>
            <SecondaryButton onClick={handleExport}>Экспортировать отчёт (CSV)</SecondaryButton>
          </div>
          <p style={{ color: '#94a3b8', marginTop: 10, fontSize: 12 }}>
            <Link href="/analytics" style={{ color: '#38bdf8' }}>Analytics</Link> для подробного отчёта
          </p>
        </section>
      </div>

      <section style={{ ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>🚀 Миссии ({launches.length})</h2>
          <span style={{ color: '#64748b', fontSize: 12 }}>Данные из SpaceX API</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#94a3b8', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Миссия</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#94a3b8', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Дата</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#94a3b8', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Ракета</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#94a3b8', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Статус</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#94a3b8', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Грузы</th>
              </tr>
            </thead>
            <tbody>
              {launches
                .slice()
                .reverse()
                .slice(0, 20)
                .map((launch) => (
                  <tr key={launch.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', cursor: 'pointer' }} onClick={() => window.location.href = `/launch/${launch.id}`}>
                    <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>
                      <Link href={`/launch/${launch.id}`} style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}>
                        {launch.name || 'Unknown'}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#cbd5f5', fontSize: 12 }}>
                      {new Date(launch.date_utc).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#cbd5f5', fontSize: 12 }}>
                      {launch.rocket?.name || launch.rocket || 'N/A'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {launch.success ? (
                        <span style={{ color: '#22c55e', fontSize: 12 }}>✅ Success</span>
                      ) : launch.upcoming ? (
                        <span style={{ color: '#fbbf24', fontSize: 12 }}>🕒 Upcoming</span>
                      ) : (
                        <span style={{ color: '#ef4444', fontSize: 12 }}>⚠️ Failed</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#cbd5f5', fontSize: 12 }}>
                      {launch.payloads_count || launch.payloads?.length || 0}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {launches.length > 20 && (
          <p style={{ color: '#64748b', marginTop: 12, fontSize: 12, textAlign: 'center' }}>
            Показано 20 из {launches.length} миссий. <Link href="/analytics" style={{ color: '#38bdf8' }}>Смотреть все</Link>
          </p>
        )}
      </section>

      {showSourceModal && (
        <Modal onClose={() => setShowSourceModal(false)} title="Raw JSON payload">
          <pre style={{ maxHeight: 320, overflow: 'auto', margin: 0 }}>{JSON.stringify(launches, null, 2)}</pre>
        </Modal>
      )}
    </main>
  );
}

export async function getServerSideProps() {
  const meta = await loadLaunches(true);
  const metrics = meta.launches.length ? buildMetrics(meta.launches) : etlFallback.metrics;

  return {
    props: {
      initialMetrics: metrics,
      initialLaunches: meta.launches,
      sourceUrl: meta.sourceUrl,
      fallbackUsed: meta.fallbackUsed,
      fetchedAt: meta.fetchedAt
    }
  };
}

function Metric({ label, value, max = 100 }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: '#0f172a', borderRadius: 10, padding: 12 }}>
      <p style={{ margin: 0, color: '#64748b', fontSize: 12, marginBottom: 6 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{value}</p>
      <div style={{ background: '#1e293b', borderRadius: 4, height: 4, overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', height: '100%', width: `${percentage}%`, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

function PipelinePill({ step, index, status }) {
  const palette = {
    pending: { background: '#1f2a44', color: '#64748b', border: '1px solid rgba(148,163,184,0.3)' },
    active: { background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', color: '#0b1120', border: 'none' },
    done: { background: 'linear-gradient(135deg,#22d3ee,#14b8a6)', color: '#022c22', border: 'none' }
  };

  return (
    <div
      style={{
        padding: '10px 18px',
        borderRadius: 12,
        fontWeight: 700,
        transition: 'all 0.3s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        ...palette[status]
      }}
    >
      <span style={{ opacity: 0.7 }}>{index + 1}.</span> {step.toUpperCase()}
    </div>
  );
}

function StatusBadge({ live }) {
  const color = live ? '#22c55e' : '#f97316';
  const label = live ? 'LIVE API' : 'DEMO DATA';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 999,
        background: `${color}1A`,
        color
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 18px',
        borderRadius: 12,
        background: '#1d293a',
        border: '1px solid rgba(56,189,248,0.3)',
        color: '#e2e8f0',
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  );
}

function Modal({ children, title, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 50
      }}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: '#111c33',
          borderRadius: 16,
          padding: 24,
          maxWidth: 720,
          width: '100%',
          color: '#f8fafc',
          boxShadow: '0 25px 60px rgba(8,47,73,0.6)'
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: 24,
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

function formatCsvValue(value) {
  if (value === undefined || value === null) return '';
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

