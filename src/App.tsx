import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type Finger = { name: string; flex: number; fsr: number };
type Sample = {
  timestamp: number;
  time: string;
  flex: number;
  fsr: number;
  fingerFlex: number[];
  fingerFsr: number[];
};
type Session = {
  id: number;
  date: string;
  duration: number;
  avgFlex: number;
  avgFsr: number;
  samples: number;
  fingerFlex: number[];
  fingerFsr: number[];
};
type View = "overview" | "analytics" | "history";
type Metric = "fingerFlex" | "fingerFsr";

const NAMES = [
  "Ngón cái",
  "Ngón trỏ",
  "Ngón giữa",
  "Ngón áp út",
  "Ngón út",
];

const COLORS = [
  "#D99A3D",
  "#4D8FE8",
  "#159782",
  "#9470DB",
  "#E47788",
];

const INITIAL: Finger[] = [
  { name: NAMES[0], flex: 32, fsr: 125 },
  { name: NAMES[1], flex: 45, fsr: 180 },
  { name: NAMES[2], flex: 52, fsr: 215 },
  { name: NAMES[3], flex: 38, fsr: 155 },
  { name: NAMES[4], flex: 25, fsr: 80 },
];

const SESSIONS_KEY = "hand-rehab-sessions-v2";
const SAMPLES_KEY = "hand-rehab-latest-samples-v2";

function average(values: number[]) {
  return values.length
    ? Math.round(
        values.reduce((a, b) => a + b, 0) / values.length,
      )
    : 0;
}

function formatTime(total: number) {
  const s = Math.max(0, Math.floor(total));

  return [
    Math.floor(s / 3600),
    Math.floor((s % 3600) / 60),
    s % 60,
  ]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

function formatDate(value: number | string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function downloadCSV(
  filename: string,
  rows: (string | number)[][],
) {
  const csv =
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(/"/g, '""')}"`,
          )
          .join(","),
      )
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function LineChart({
  title,
  subtitle,
  data,
  colors,
  maxValue,
  unit,
  multi = false,
}: {
  title: string;
  subtitle: string;
  data: number[][];
  colors: string[];
  maxValue: number;
  unit: string;
  multi?: boolean;
}) {
  const width = 760;
  const height = 260;
  const left = 48;
  const right = 18;
  const top = 18;
  const bottom = 34;

  const chartW = width - left - right;
  const chartH = height - top - bottom;
  const series = data.length ? data : [[]];
  const hasData = series.some((s) => s.length > 0);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <span className="unit-pill">{unit}</span>
      </div>

      {!hasData ? (
        <div className="empty-state">
          Chưa có dữ liệu. Hãy bắt đầu phiên tập để ghi các mẫu cảm biến.
        </div>
      ) : (
        <>
          <div className="chart-scroll">
            <svg
              className="line-chart"
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={title}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((r) => {
                const y = top + chartH * r;

                return (
                  <g key={r}>
                    <line
                      x1={left}
                      y1={y}
                      x2={width - right}
                      y2={y}
                      stroke="#e7edf4"
                      strokeDasharray="4 5"
                    />

                    <text
                      x={left - 9}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="#8794a8"
                    >
                      {Math.round(maxValue * (1 - r))}
                    </text>
                  </g>
                );
              })}

              {series.map((values, si) => {
                if (!values.length) return null;

                const points = values
                  .map((v, i) => {
                    const x =
                      left +
                      (i / Math.max(1, values.length - 1)) *
                        chartW;

                    const y =
                      top +
                      chartH -
                      (Math.max(0, Math.min(maxValue, v)) /
                        maxValue) *
                        chartH;

                    return `${x},${y}`;
                  })
                  .join(" ");

                return (
                  <g key={si}>
                    <polyline
                      points={points}
                      fill="none"
                      stroke={colors[si % colors.length]}
                      strokeWidth="2.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {values.length <= 18 &&
                      values.map((v, i) => (
                        <circle
                          key={i}
                          cx={
                            left +
                            (i /
                              Math.max(1, values.length - 1)) *
                              chartW
                          }
                          cy={
                            top +
                            chartH -
                            (Math.max(0, Math.min(maxValue, v)) /
                              maxValue) *
                              chartH
                          }
                          r="3"
                          fill={colors[si % colors.length]}
                        />
                      ))}
                  </g>
                );
              })}

              <text
                x={left}
                y={height - 8}
                fontSize="11"
                fill="#8794a8"
              >
                Mẫu đầu
              </text>

              <text
                x={width - right}
                y={height - 8}
                textAnchor="end"
                fontSize="11"
                fill="#8794a8"
              >
                Mẫu mới nhất
              </text>
            </svg>
          </div>

          {multi && (
            <div className="legend">
              {NAMES.map((name, i) => (
                <span className="legend-item" key={name}>
                  <i style={{ background: COLORS[i] }} />
                  {name}
                </span>
              ))}
            </div>
          )}

          <p className="chart-note">
            {series[0]?.length ?? 0} mẫu đang hiển thị ·{" "}
            {multi
              ? "Mỗi màu tương ứng một ngón tay"
              : "Giá trị trung bình của 5 ngón"}
          </p>
        </>
      )}
    </section>
  );
}

function HandDiagram({
  fingers,
  selected,
  onSelect,
}: {
  fingers: Finger[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  const shapes = [
    { x: 48, y: 100, w: 39, h: 88 },
    { x: 94, y: 49, w: 37, h: 132 },
    { x: 139, y: 25, w: 38, h: 156 },
    { x: 184, y: 55, w: 37, h: 126 },
    { x: 229, y: 91, w: 36, h: 90 },
  ];

  return (
    <div className="hand-wrap">
      <svg
        viewBox="0 0 320 300"
        role="img"
        aria-label="Bản đồ bàn tay 5 ngón"
        className="hand-svg"
      >
        <ellipse
          cx="160"
          cy="276"
          rx="90"
          ry="8"
          fill="#142e3b"
          opacity=".07"
        />

        {shapes.map((s, i) => (
          <g
            key={NAMES[i]}
            role="button"
            tabIndex={0}
            aria-label={`Chọn ${NAMES[i]}`}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(i);
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx={s.w / 2}
              fill={selected === i ? COLORS[i] : "#d8e7e3"}
              stroke={selected === i ? COLORS[i] : "#b9d0ca"}
              strokeWidth={selected === i ? 3 : 1.5}
            />

            <line
              x1={s.x + 6}
              y1={s.y + s.h * 0.5}
              x2={s.x + s.w - 6}
              y2={s.y + s.h * 0.5}
              stroke={selected === i ? "#fff" : "#abc6bf"}
              strokeWidth="2"
            />

            <text
              x={s.x + s.w / 2}
              y={s.y - 8}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={COLORS[i]}
            >
              {fingers[i].flex}%
            </text>
          </g>
        ))}

        <path
          d="M73 163 Q77 145 95 155 L119 178 L123 168 Q129 155 143 161 L160 165 L177 160 Q193 157 196 176 L200 188 L215 174 Q229 166 237 181 L242 198 L242 215 Q239 254 201 258 L142 258 Q101 256 96 219 Z"
          fill="#dceee9"
          stroke="#b9d0ca"
          strokeWidth="1.5"
        />

        <path
          d="M124 202 Q160 186 208 203 M137 229 Q165 241 195 229"
          fill="none"
          stroke="#b3d1c9"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <text
          x="160"
          y="290"
          textAnchor="middle"
          fontSize="11"
          fill="#718096"
        >
          Chọn một ngón để xem chỉ số
        </text>
      </svg>
    </div>
  );
}

export default function App() {
  const [fingers, setFingers] = useState<Finger[]>(INITIAL);
  const fingersRef = useRef<Finger[]>(INITIAL);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedFinger, setSelectedFinger] = useState(2);
  const [view, setView] = useState<View>("overview");
  const [metric, setMetric] = useState<Metric>("fingerFlex");

  const [samples, setSamples] = useState<Sample[]>(() =>
    readStorage(SAMPLES_KEY, [] as Sample[]),
  );

  const [sessions, setSessions] = useState<Session[]>(() =>
    readStorage(SESSIONS_KEY, [] as Session[]),
  );

  const [sessionStart, setSessionStart] = useState<number | null>(
    null,
  );

  const [notice, setNotice] = useState(
    "Dữ liệu đang ở chế độ mô phỏng; chưa kết nối ESP32.",
  );

  const [sessionLabel, setSessionLabel] = useState("Phiên tập");

  useEffect(() => {
    fingersRef.current = fingers;
  }, [fingers]);

  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch {
      setNotice(
        "Không thể lưu lịch sử: bộ nhớ trình duyệt có thể đã đầy.",
      );
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SAMPLES_KEY,
        JSON.stringify(samples.slice(-300)),
      );
    } catch {
      // Bộ nhớ mẫu cảm biến là tùy chọn.
    }
  }, [samples]);

  useEffect(() => {
    if (!isRecording) return;

    const timer = window.setInterval(() => {
      setElapsed((v) => v + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;

    const timer = window.setInterval(() => {
      const updated = fingersRef.current.map((finger) => ({
        ...finger,
        flex: Math.max(
          0,
          Math.min(
            100,
            Math.round(finger.flex + (Math.random() - 0.48) * 12),
          ),
        ),
        fsr: Math.max(
          0,
          Math.min(
            1023,
            Math.round(finger.fsr + (Math.random() - 0.48) * 38),
          ),
        ),
      }));

      fingersRef.current = updated;
      setFingers(updated);

      const sample: Sample = {
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString("vi-VN"),
        flex: average(updated.map((f) => f.flex)),
        fsr: average(updated.map((f) => f.fsr)),
        fingerFlex: updated.map((f) => f.flex),
        fingerFsr: updated.map((f) => f.fsr),
      };

      setSamples((old) => [...old.slice(-299), sample]);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  const averageFlex = average(fingers.map((f) => f.flex));
  const averageFsr = average(fingers.map((f) => f.fsr));

  const totalDuration = sessions.reduce(
    (sum, s) => sum + s.duration,
    0,
  );

  const selected = fingers[selectedFinger] ?? fingers[0];

  const flexRange =
    Math.max(...fingers.map((f) => f.flex)) -
    Math.min(...fingers.map((f) => f.flex));

  const fsrRange =
    Math.max(...fingers.map((f) => f.fsr)) -
    Math.min(...fingers.map((f) => f.fsr));

  const averageFlexSeries = useMemo(
    () => samples.map((s) => s.flex),
    [samples],
  );

  const averageFsrSeries = useMemo(
    () => samples.map((s) => s.fsr),
    [samples],
  );

  const fingerSeries = useMemo(
    () =>
      NAMES.map((_, i) =>
        samples.map((s) => s[metric][i] ?? 0),
      ),
    [samples, metric],
  );

  function startRecording() {
    if (isRecording) return;

    setSamples([]);
    setElapsed(0);
    setSessionStart(Date.now());
    setIsRecording(true);

    setNotice(
      "Đã bắt đầu phiên tập. Dữ liệu cảm biến hiện đang được mô phỏng.",
    );
  }

  function stopRecording() {
    if (!isRecording) return;

    const start = sessionStart ?? Date.now();

    const duration = Math.max(
      elapsed,
      Math.floor((Date.now() - start) / 1000),
    );

    const captured = samples;

    const avgFlex = captured.length
      ? average(captured.map((s) => s.flex))
      : averageFlex;

    const avgFsr = captured.length
      ? average(captured.map((s) => s.fsr))
      : averageFsr;

    const fingerFlex = NAMES.map((_, i) =>
      captured.length
        ? average(captured.map((s) => s.fingerFlex[i] ?? 0))
        : fingers[i].flex,
    );

    const fingerFsr = NAMES.map((_, i) =>
      captured.length
        ? average(captured.map((s) => s.fingerFsr[i] ?? 0))
        : fingers[i].fsr,
    );

    const session: Session = {
      id: Date.now(),
      date: formatDate(start),
      duration,
      avgFlex,
      avgFsr,
      samples: captured.length,
      fingerFlex,
      fingerFsr,
    };

    setSessions((old) => [session, ...old].slice(0, 100));
    setIsRecording(false);
    setSessionStart(null);

    setNotice(
      `Đã lưu "${sessionLabel || "Phiên tập"}" vào lịch sử trên trình duyệt này.`,
    );
  }

  function exportSamples() {
    if (!samples.length) {
      setNotice(
        "Chưa có mẫu dữ liệu để xuất. Hãy bắt đầu phiên tập trước.",
      );
      return;
    }

    downloadCSV("hand-rehab-sensor-data.csv", [
      [
        "Timestamp",
        "Thời gian",
        "Ngón tay",
        "Flex (%)",
        "FSR (raw)",
      ],
      ...samples.flatMap((s) =>
        NAMES.map((name, i) => [
          s.timestamp,
          s.time,
          name,
          s.fingerFlex[i] ?? 0,
          s.fingerFsr[i] ?? 0,
        ]),
      ),
    ]);
  }

  function exportHistory() {
    downloadCSV("hand-rehab-session-history.csv", [
      [
        "ID",
        "Thời điểm bắt đầu",
        "Thời lượng (giây)",
        "Flex trung bình (%)",
        "FSR trung bình (raw)",
        "Số mẫu",
        ...NAMES.flatMap((n) => [
          `${n} Flex (%)`,
          `${n} FSR (raw)`,
        ]),
      ],
      ...sessions.map((s) => [
        s.id,
        s.date,
        s.duration,
        s.avgFlex,
        s.avgFsr,
        s.samples,
        ...NAMES.flatMap((_, i) => [
          s.fingerFlex?.[i] ?? "",
          s.fingerFsr?.[i] ?? "",
        ]),
      ]),
    ]);
  }

  function clearHistory() {
    if (
      !window.confirm(
        "Bạn có chắc muốn xóa toàn bộ lịch sử phiên tập đã lưu trên trình duyệt này?",
      )
    ) {
      return;
    }

    setSessions([]);
    setNotice("Đã xóa lịch sử phiên tập.");
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">H</div>
          <div>
            <h1>Hand Rehab</h1>
            <p>Analytics platform</p>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav className="nav" aria-label="Điều hướng chính">
          <button
            className={view === "overview" ? "active" : ""}
            onClick={() => setView("overview")}
          >
            <span>▦</span>
            Tổng quan
          </button>

          <button
            className={view === "analytics" ? "active" : ""}
            onClick={() => setView("analytics")}
          >
            <span>⌁</span>
            Phân tích
          </button>

          <button
            className={view === "history" ? "active" : ""}
            onClick={() => setView("history")}
          >
            <span>◷</span>
            Lịch sử phiên tập
          </button>
        </nav>

        <div className="sidebar-device">
          <p className="nav-label">THIẾT BỊ</p>

          <div className="device-card">
            <span className="device-dot" />
            <strong>Chế độ mô phỏng</strong>
            <p>
              Chưa kết nối ESP32. Dữ liệu không phải số đo thực tế.
            </p>
          </div>
        </div>

        <div className="sidebar-foot">
          HAND REHAB ANALYTICS
          <br />
          Prototype · v2.0
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">REHABILITATION WORKSPACE</p>

            <h1>
              {view === "overview"
                ? "Tổng quan phục hồi"
                : view === "analytics"
                  ? "Phân tích cảm biến"
                  : "Lịch sử phiên tập"}
            </h1>

            <p className="page-subtitle">
              Theo dõi chuyển động ngón tay và lực nắm theo thời gian.
            </p>
          </div>

          <div className="header-actions">
            <span
              className={`status-badge ${
                isRecording ? "recording" : ""
              }`}
            >
              <i />
              {isRecording ? "Đang ghi dữ liệu" : "Sẵn sàng"}
            </span>

            <button
              className="btn btn-light"
              onClick={exportSamples}
              disabled={!samples.length}
            >
              ↓ Xuất dữ liệu
            </button>
          </div>
        </header>

        {notice && (
          <div className="notice" role="status">
            <span>ⓘ</span>
            {notice}

            <button
              aria-label="Ẩn thông báo"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}

        {view !== "history" && (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-icon teal">↗</span>
                  <span className="stat-label">FLEX TRUNG BÌNH</span>
                </div>
                <div className="stat-value">
                  {averageFlex}
                  <small>%</small>
                </div>
                <p className="stat-description">
                  Trung bình của 5 ngón tay
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-icon blue">◉</span>
                  <span className="stat-label">FSR TRUNG BÌNH</span>
                </div>
                <div className="stat-value">{averageFsr}</div>
                <p className="stat-description">
                  Tín hiệu ADC mô phỏng (raw)
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-icon purple">◷</span>
                  <span className="stat-label">THỜI GIAN TẬP</span>
                </div>
                <div className="stat-value time-value">
                  {formatTime(elapsed)}
                </div>
                <p className="stat-description">
                  {isRecording
                    ? "Đang ghi dữ liệu"
                    : "Thời gian phiên hiện tại"}
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-icon orange">▤</span>
                  <span className="stat-label">PHIÊN ĐÃ LƯU</span>
                </div>
                <div className="stat-value">{sessions.length}</div>
                <p className="stat-description">
                  Tổng thời lượng {formatTime(totalDuration)}
                </p>
              </div>
            </section>

            {view === "overview" && (
              <>
                <div className="content-grid overview-grid">
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Bản đồ ngón tay</h2>
                        <p>
                          Chọn ngón để xem dữ liệu cảm biến hiện tại.
                        </p>
                      </div>

                      <span className="unit-pill">5 Flex · 5 FSR</span>
                    </div>

                    <HandDiagram
                      fingers={fingers}
                      selected={selectedFinger}
                      onSelect={setSelectedFinger}
                    />

                    <div className="selected-readings">
                      <div className="reading-card">
                        <span>{selected.name} · Flex</span>
                        <strong>{selected.flex}%</strong>

                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${selected.flex}%`,
                              background: COLORS[selectedFinger],
                            }}
                          />
                        </div>
                      </div>

                      <div className="reading-card">
                        <span>{selected.name} · FSR</span>
                        <strong>
                          {selected.fsr} <small>/ 1023</small>
                        </strong>

                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${(selected.fsr / 1023) * 100}%`,
                              background: COLORS[selectedFinger],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="panel action-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Điều khiển phiên tập</h2>
                        <p>Ghi nhận và lưu kết quả đo.</p>
                      </div>

                      <span
                        className={`mini-state ${
                          isRecording ? "on" : ""
                        }`}
                      >
                        {isRecording
                          ? "ĐANG GHI"
                          : "CHỜ BẮT ĐẦU"}
                      </span>
                    </div>

                    <label
                      className="field-label"
                      htmlFor="session-label"
                    >
                      Tên phiên tập
                    </label>

                    <input
                      id="session-label"
                      value={sessionLabel}
                      maxLength={60}
                      onChange={(e) => setSessionLabel(e.target.value)}
                      placeholder="Ví dụ: Buổi tập sáng"
                      disabled={isRecording}
                    />

                    <div className="timer-box">
                      <span>THỜI GIAN ĐÃ TẬP</span>
                      <strong>{formatTime(elapsed)}</strong>
                      <small>
                        {samples.length} mẫu dữ liệu · chu kỳ khoảng
                        1,2 giây
                      </small>
                    </div>

                    {!isRecording ? (
                      <button
                        className="btn btn-primary full-btn"
                        onClick={startRecording}
                      >
                        ▶ Bắt đầu tập
                      </button>
                    ) : (
                      <button
                        className="btn btn-danger full-btn"
                        onClick={stopRecording}
                      >
                        ■ Dừng và lưu phiên
                      </button>
                    )}

                    <button
                      className="btn btn-light full-btn"
                      onClick={exportSamples}
                      disabled={!samples.length}
                    >
                      ↓ Xuất dữ liệu CSV
                    </button>

                    <div className="capture-info">
                      <div>
                        <span>Kênh Flex</span>
                        <strong>5</strong>
                      </div>
                      <div>
                        <span>Kênh FSR</span>
                        <strong>5</strong>
                      </div>
                      <div>
                        <span>Mẫu hiện tại</span>
                        <strong>{samples.length}/300</strong>
                      </div>
                      <div>
                        <span>Nguồn dữ liệu</span>
                        <strong>Mô phỏng</strong>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="panel section-gap">
                  <div className="panel-heading">
                    <div>
                      <h2>So sánh giữa các ngón</h2>
                      <p>
                        Giá trị hiện tại; không phải đánh giá y khoa.
                      </p>
                    </div>

                    <span className="unit-pill">
                      Phân tích nhanh
                    </span>
                  </div>

                  <div className="range-cards">
                    <div>
                      <span>Khoảng chênh Flex</span>
                      <strong>{flexRange}%</strong>
                      <small>Giá trị lớn nhất trừ nhỏ nhất</small>
                    </div>

                    <div>
                      <span>Khoảng chênh FSR</span>
                      <strong>{fsrRange}</strong>
                      <small>Chênh lệch tín hiệu thô</small>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Ngón tay</th>
                          <th>Flex (%)</th>
                          <th>FSR (raw)</th>
                          <th>So với Flex trung bình</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>

                      <tbody>
                        {fingers.map((f, i) => (
                          <tr
                            key={f.name}
                            className={
                              selectedFinger === i ? "row-selected" : ""
                            }
                            onClick={() => setSelectedFinger(i)}
                          >
                            <td>
                              <span className="finger-cell">
                                <i style={{ background: COLORS[i] }} />
                                {f.name}
                              </span>
                            </td>

                            <td>{f.flex}%</td>
                            <td>{f.fsr}</td>

                            <td>
                              {f.flex - averageFlex > 0 ? "+" : ""}
                              {f.flex - averageFlex}%
                            </td>

                            <td>
                              <span className="neutral-tag">
                                Mô phỏng
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="content-grid section-gap">
                  <LineChart
                    title="Flex trung bình"
                    subtitle="Xu hướng độ gập trung bình của bàn tay"
                    data={[averageFlexSeries]}
                    colors={["#159782"]}
                    maxValue={100}
                    unit="%"
                  />

                  <LineChart
                    title="FSR trung bình"
                    subtitle="Xu hướng tín hiệu lực nắm thô"
                    data={[averageFsrSeries]}
                    colors={["#4D8FE8"]}
                    maxValue={1023}
                    unit="raw"
                  />
                </div>
              </>
            )}

            {view === "analytics" && (
              <>
                <section className="panel section-gap">
                  <div className="panel-heading">
                    <div>
                      <h2>Phân tích theo từng ngón</h2>
                      <p>
                        Đối chiếu năm kênh cảm biến theo thời gian.
                      </p>
                    </div>

                    <label className="select-wrap">
                      <span>Chỉ số</span>

                      <select
                        value={metric}
                        onChange={(e) =>
                          setMetric(e.target.value as Metric)
                        }
                      >
                        <option value="fingerFlex">Flex (%)</option>
                        <option value="fingerFsr">FSR (raw)</option>
                      </select>
                    </label>
                  </div>
                </section>

                <LineChart
                  title={
                    metric === "fingerFlex"
                      ? "Biểu đồ Flex — 5 ngón tay"
                      : "Biểu đồ FSR — 5 ngón tay"
                  }
                  subtitle={
                    metric === "fingerFlex"
                      ? "Độ gập mô phỏng theo từng mẫu"
                      : "Tín hiệu FSR thô theo từng mẫu"
                  }
                  data={fingerSeries}
                  colors={COLORS}
                  maxValue={metric === "fingerFlex" ? 100 : 1023}
                  unit={metric === "fingerFlex" ? "%" : "raw"}
                  multi
                />

                <div className="content-grid section-gap">
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Flex theo ngón</h2>
                        <p>
                          Giá trị hiện tại trên thang 0–100%.
                        </p>
                      </div>
                    </div>

                    {fingers.map((f, i) => (
                      <div className="metric-row" key={f.name}>
                        <div>
                          <span>{f.name}</span>
                          <strong>{f.flex}%</strong>
                        </div>

                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${f.flex}%`,
                              background: COLORS[i],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </section>

                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>FSR theo ngón</h2>
                        <p>
                          Tín hiệu thô trên thang hiển thị 0–1023.
                        </p>
                      </div>
                    </div>

                    {fingers.map((f, i) => (
                      <div className="metric-row" key={f.name}>
                        <div>
                          <span>{f.name}</span>
                          <strong>{f.fsr}</strong>
                        </div>

                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${(f.fsr / 1023) * 100}%`,
                              background: COLORS[i],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </section>
                </div>

                <section className="panel section-gap">
                  <div className="panel-heading">
                    <div>
                      <h2>Giá trị mới nhất</h2>
                      <p>
                        Chọn một ngón để xem chi tiết ở trang Tổng quan.
                      </p>
                    </div>

                    <button
                      className="btn btn-light"
                      onClick={() => setView("overview")}
                    >
                      Xem bàn tay →
                    </button>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Ngón</th>
                          <th>Flex (%)</th>
                          <th>FSR (raw)</th>
                          <th>Thanh Flex</th>
                        </tr>
                      </thead>

                      <tbody>
                        {fingers.map((f, i) => (
                          <tr key={f.name}>
                            <td>
                              <span className="finger-cell">
                                <i style={{ background: COLORS[i] }} />
                                {f.name}
                              </span>
                            </td>

                            <td>{f.flex}%</td>
                            <td>{f.fsr}</td>

                            <td>
                              <div className="progress-track table-progress">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${f.flex}%`,
                                    background: COLORS[i],
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {view === "history" && (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-icon teal">▤</span>
                  <span className="stat-label">TỔNG PHIÊN TẬP</span>
                </div>
                <div className="stat-value">{sessions.length}</div>
                <p className="stat-description">
                  Lưu trên trình duyệt này
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-icon blue">◷</span>
                  <span className="stat-label">TỔNG THỜI GIAN</span>
                </div>
                <div className="stat-value time-value">
                  {formatTime(totalDuration)}
                </div>
                <p className="stat-description">
                  Tổng thời lượng các phiên
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-icon purple">↗</span>
                  <span className="stat-label">FLEX GẦN NHẤT</span>
                </div>
                <div className="stat-value">
                  {sessions[0] ? `${sessions[0].avgFlex}%` : "—"}
                </div>
                <p className="stat-description">
                  Trung bình phiên mới nhất
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span className="stat-icon orange">◉</span>
                  <span className="stat-label">FSR GẦN NHẤT</span>
                </div>
                <div className="stat-value">
                  {sessions[0]?.avgFsr ?? "—"}
                </div>
                <p className="stat-description">
                  Giá trị ADC trung bình
                </p>
              </div>
            </section>

            <section className="panel section-gap">
              <div className="panel-heading">
                <div>
                  <h2>Lịch sử phiên tập</h2>
                  <p>
                    Lịch sử được giữ lại sau khi tải lại trang trên cùng
                    trình duyệt.
                  </p>
                </div>

                <div className="header-actions">
                  <button
                    className="btn btn-light"
                    onClick={exportHistory}
                    disabled={!sessions.length}
                  >
                    ↓ Xuất lịch sử CSV
                  </button>

                  <button
                    className="btn btn-outline-danger"
                    onClick={clearHistory}
                    disabled={!sessions.length}
                  >
                    Xóa lịch sử
                  </button>
                </div>
              </div>

              {!sessions.length ? (
                <div className="empty-state">
                  <div className="empty-icon">◷</div>
                  <strong>Chưa có phiên tập nào</strong>
                  <p>
                    Bắt đầu tập rồi nhấn “Dừng và lưu phiên” để tạo lịch
                    sử.
                  </p>

                  <button
                    className="btn btn-primary"
                    onClick={() => setView("overview")}
                  >
                    Đi đến tổng quan
                  </button>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Phiên</th>
                        <th>Tên / thời điểm</th>
                        <th>Thời lượng</th>
                        <th>Flex TB</th>
                        <th>FSR TB</th>
                        <th>Số mẫu</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sessions.map((s, i) => (
                        <tr key={s.id}>
                          <td>
                            <strong>#{sessions.length - i}</strong>
                          </td>
                          <td>{s.date}</td>
                          <td>{formatTime(s.duration)}</td>
                          <td>{s.avgFlex}%</td>
                          <td>{s.avgFsr}</td>
                          <td>{s.samples}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel section-gap">
              <div className="panel-heading">
                <div>
                  <h2>So sánh các phiên</h2>
                  <p>
                    Chênh lệch trung bình so với phiên kế tiếp trong lịch
                    sử.
                  </p>
                </div>
              </div>

              {sessions.length < 2 ? (
                <div className="empty-state">
                  Cần ít nhất hai phiên đã lưu để so sánh.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Phiên</th>
                        <th>Flex TB</th>
                        <th>Chênh Flex</th>
                        <th>FSR TB</th>
                        <th>Chênh FSR</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sessions.map((s, i) => {
                        const prev = sessions[i + 1];
                        const fd = prev
                          ? s.avgFlex - prev.avgFlex
                          : null;
                        const sd = prev
                          ? s.avgFsr - prev.avgFsr
                          : null;

                        return (
                          <tr key={s.id}>
                            <td>#{sessions.length - i}</td>
                            <td>{s.avgFlex}%</td>
                            <td>
                              {fd === null
                                ? "—"
                                : `${fd > 0 ? "+" : ""}${fd}%`}
                            </td>
                            <td>{s.avgFsr}</td>
                            <td>
                              {sd === null
                                ? "—"
                                : `${sd > 0 ? "+" : ""}${sd}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        <footer className="footer">
          Hand Rehab Analytics · Prototype · Dữ liệu mô phỏng, không phải
          phép đo lâm sàng.
        </footer>
      </main>
    </div>
  );
}