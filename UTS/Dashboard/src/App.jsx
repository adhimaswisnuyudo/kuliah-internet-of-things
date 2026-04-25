import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-GB', { hour12: false });
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [health, setHealth] = useState(null);
  const [realtimeTopic, setRealtimeTopic] = useState('');
  const [realtimeName, setRealtimeName] = useState('');
  const [realtimePoints, setRealtimePoints] = useState([]);

  const load = useCallback(async () => {
    try {
      setErr('');
      const [h, r] = await Promise.all([
        fetch('/api/health').then((x) => x.json()),
        fetch('/api/history').then((x) => {
          if (!x.ok) throw new Error(`HTTP ${x.status}`);
          return x.json();
        }),
      ]);
      setHealth(h);
      setRows(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!realtimeTopic) return;
    const row = rows.find((r) => r.topic === realtimeTopic);
    if (!row || row.suhu == null || Number.isNaN(Number(row.suhu))) return;
    const suhu = Number(row.suhu);
    const waktu = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setRealtimePoints((prev) => {
      const next = [...prev, { suhu, waktu }];
      return next.slice(-40);
    });
  }, [rows, realtimeTopic]);

  const openRealtime = useCallback((row) => {
    setRealtimeTopic(row.topic);
    setRealtimeName(row.nama || row.slug || row.topic);
    setRealtimePoints([]);
  }, []);

  const closeRealtime = useCallback(() => {
    setRealtimeTopic('');
    setRealtimeName('');
    setRealtimePoints([]);
  }, []);

  return (
    <div>
      <header className="header">
        <h1 className="title">Digitech UTS — Dashboard</h1>
        {health ? (
          <div className="meta">
            <span className={`badge ${health.mqtt_connected ? 'badge-ok' : 'badge-wait'}`}>
              MQTT: {health.mqtt_connected ? 'Connected' : 'Disconnected'}
            </span>
            <span className={`badge ${health.telegram_connected ? 'badge-ok' : 'badge-wait'}`}>
              Telegram: {health.telegram_connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        ) : null}
      </header>

      {err ? <div className="err">{err}</div> : null}

      <div className="table-wrap">
        {rows.length === 0 ? (
          <p className="empty">
            No history yet. Make sure the board publishes to the correct topic.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="th-num">No</th>
                <th>Topic</th>
                <th>Name</th>
                <th>Temp</th>
                <th>First Update</th>
                <th>Last Update</th>
                <th>Telegram</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.topic}>
                  <td className="td-num">{i + 1}</td>
                  <td>
                    <code>{row.topic}</code>
                  </td>
                  <td>{row.nama || '—'}</td>
                  <td>{row.suhu != null ? `${row.suhu} °C` : '—'}</td>
                  <td>{formatDateTime(row.first_seen_at)}</td>
                  <td>{formatDateTime(row.last_seen_at)}</td>
                  <td>
                    {row.telegram_sent ? (
                      <span className="badge badge-ok">Sent</span>
                    ) : (
                      <span className="badge badge-wait">Pending / failed</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-live" onClick={() => openRealtime(row)}>
                      Open Chart
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {realtimeTopic ? (
        <section className="live-wrap">
          <div className="live-head">
            <h3 className="live-title">Live temperature — {realtimeName}</h3>
            <button className="btn-live close" onClick={closeRealtime}>
              Close
            </button>
          </div>
          <p className="live-sub">
            Topic: <code>{realtimeTopic}</code> | Data points: {realtimePoints.length}
          </p>
          <div className="live-chart">
            {realtimePoints.length < 2 ? (
              <p className="empty">Collecting live data…</p>
            ) : (
              <RealtimeSuhuChart points={realtimePoints} />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Live chart: axes, grid, legend, hover tooltip */
function RealtimeSuhuChart({ points }) {
  const [hover, setHover] = useState(null);

  const layout = useMemo(() => {
    const W = 920;
    const H = 340;
    const padL = 72;
    const padR = 28;
    const padT = 52;
    const padB = 56;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const vals = points.map((p) => p.suhu);
    let minY = Math.min(...vals);
    let maxY = Math.max(...vals);
    if (minY === maxY) {
      minY -= 0.5;
      maxY += 0.5;
    }
    const rangeY = maxY - minY || 1;
    const tickCount = 5;
    const yTicks = Array.from({ length: tickCount }, (_, i) => {
      const v = maxY - (i / (tickCount - 1)) * (maxY - minY);
      return Number(v.toFixed(2));
    });

    const pts = points.map((p, i) => {
      const x = padL + (i / Math.max(points.length - 1, 1)) * plotW;
      const y = padT + plotH - ((p.suhu - minY) / rangeY) * plotH;
      return { ...p, x, y, i };
    });

    const path = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    const xLabelCount = Math.min(6, pts.length);
    const xLabels = Array.from({ length: xLabelCount }, (_, j) => {
      const idx = Math.round((j / Math.max(xLabelCount - 1, 1)) * (pts.length - 1));
      const p = pts[idx];
      return { x: p.x, text: p.waktu, idx };
    });

    const hGrids = yTicks.map((val) => {
      const y = padT + plotH - ((val - minY) / rangeY) * plotH;
      return { y, val };
    });

    return { W, H, padL, padT, plotW, plotH, yTicks, pts, path, xLabels, hGrids, minY, maxY };
  }, [points]);

  const tip =
    hover != null && layout.pts[hover]
      ? `${layout.pts[hover].suhu.toFixed(2)} °C @ ${layout.pts[hover].waktu}`
      : null;

  return (
    <div className="chart-interactive">
      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-swatch" />
          <span>Temp (°C)</span>
        </span>
        <span className="legend-item muted">
          <span className="legend-line-x" />
          <span>Time (local)</span>
        </span>
      </div>
      {tip ? <div className="chart-tooltip">{tip}</div> : null}
      <svg
        viewBox={`0 0 ${layout.W} ${layout.H}`}
        className="svg-live"
        role="img"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="utsPlotBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(59,199,196,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <rect
          x={layout.padL}
          y={layout.padT}
          width={layout.plotW}
          height={layout.plotH}
          fill="url(#utsPlotBg)"
          rx="8"
        />

        {layout.xLabels.map((xl, i) => (
          <line
            key={`vx-${xl.idx}-${i}`}
            x1={xl.x}
            y1={layout.padT}
            x2={xl.x}
            y2={layout.padT + layout.plotH}
            stroke="rgba(148,163,184,0.12)"
            strokeDasharray="3 6"
          />
        ))}

        {layout.hGrids.map((g, i) => (
          <g key={i}>
            <line
              x1={layout.padL}
              y1={g.y}
              x2={layout.padL + layout.plotW}
              y2={g.y}
              stroke="rgba(148,163,184,0.2)"
              strokeDasharray="4 4"
            />
            <text
              x={layout.padL - 10}
              y={g.y + 4}
              textAnchor="end"
              className="axis-text"
            >
              {g.val.toFixed(1)}
            </text>
          </g>
        ))}

        <line
          x1={layout.padL}
          y1={layout.padT + layout.plotH}
          x2={layout.padL + layout.plotW}
          y2={layout.padT + layout.plotH}
          stroke="#5b7ab5"
          strokeWidth="1.5"
        />
        <line
          x1={layout.padL}
          y1={layout.padT}
          x2={layout.padL}
          y2={layout.padT + layout.plotH}
          stroke="#5b7ab5"
          strokeWidth="1.5"
        />

        {layout.xLabels.map((xl, i) => (
          <text
            key={i}
            x={xl.x}
            y={layout.padT + layout.plotH + 22}
            textAnchor="middle"
            className="axis-text axis-text--x"
          >
            {xl.text}
          </text>
        ))}

        <text
          x={layout.padL + layout.plotW / 2}
          y={layout.H - 12}
          textAnchor="middle"
          className="axis-title"
        >
          Time
        </text>
        <text
          x={18}
          y={layout.padT + layout.plotH / 2}
          textAnchor="middle"
          className="axis-title axis-title--y"
          transform={`rotate(-90 18 ${layout.padT + layout.plotH / 2})`}
        >
          Temp (°C)
        </text>

        <path
          d={layout.path}
          fill="none"
          stroke="#3bc7c4"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {layout.pts.map((p) => (
          <g key={p.i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="12"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover(p.i)}
              onMouseLeave={() => setHover(null)}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === p.i ? 6 : 4}
              fill={hover === p.i ? '#bffffd' : '#3bc7c4'}
              stroke="#0f172a"
              strokeWidth="1"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
