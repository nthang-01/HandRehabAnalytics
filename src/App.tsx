import { useEffect, useMemo, useState } from "react";
import "./App.css";

const FINGERS = [
  "Ngón cái",
  "Ngón trỏ",
  "Ngón giữa",
  "Ngón áp út",
  "Ngón út",
];

const STORAGE_KEY = "hand-rehab-flex-sessions-v3";

type Sample = {
  time: number;
  values: number[];
};

type Session = {
  id: string;
  name: string;
  date: string;
  duration: number;
  fingerAverages: number[];
  samples: Sample[];
};

type Page = "overview" | "analysis" | "history";

const INITIAL_VALUES = [32, 45, 52, 38, 25];

function calculateFingerAverages(samples: Sample[]): number[] {
  return FINGERS.map((_, fingerIndex) => {
    const values = samples
      .map((sample) => sample.values[fingerIndex])
      .filter((value) => Number.isFinite(value));

    if (values.length === 0) return 0;

    return (
      values.reduce((sum, value) => sum + value, 0) /
      values.length
    );
  });
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes} phút ${remainingSeconds} giây`;
}

function loadSessions(): Session[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is Session =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.date === "string" &&
        typeof item.duration === "number" &&
        Array.isArray(item.fingerAverages) &&
        Array.isArray(item.samples)
    );
  } catch {
    return [];
  }
}

/* Biểu đồ đường SVG, không cần thư viện bên ngoài */
function LineChart({
  title,
  samples,
  fingerIndex,
  color,
}: {
  title: string;
  samples: Sample[];
  fingerIndex: number;
  color: string;
}) {
  const width = 700;
  const height = 250;
  const paddingLeft = 42;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 34;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const values = samples.map(
    (sample) => sample.values[fingerIndex] ?? 0
  );

  const points = values.map((value, index) => {
    const x =
      paddingLeft +
      (values.length <= 1
        ? plotWidth / 2
        : (index / (values.length - 1)) * plotWidth);

    const y =
      paddingTop + ((100 - value) / 100) * plotHeight;

    return { x, y, value };
  });

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  return (
    <section className="chart-card">
      <div className="chart-heading">
        <h3>{title}</h3>
        <span className="chart-unit">Thang hiển thị 0–100</span>
      </div>

      {samples.length === 0 ? (
        <div className="empty-chart">
          Chưa có dữ liệu để vẽ biểu đồ.
        </div>
      ) : (
        <div className="chart-scroll">
          <svg
            className="line-chart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={title}
          >
            {[0, 25, 50, 75, 100].map((tick) => {
              const y =
                paddingTop + ((100 - tick) / 100) * plotHeight;

              return (
                <g key={tick}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    className="chart-grid-line"
                  />
                  <text
                    x={paddingLeft - 9}
                    y={y + 4}
                    textAnchor="end"
                    className="chart-label"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            <line
              x1={paddingLeft}
              y1={paddingTop}
              x2={paddingLeft}
              y2={height - paddingBottom}
              className="chart-axis"
            />

            <line
              x1={paddingLeft}
              y1={height - paddingBottom}
              x2={width - paddingRight}
              y2={height - paddingBottom}
              className="chart-axis"
            />

            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="3"
                fill={color}
              >
                <title>
                  Mẫu {index + 1}: {point.value.toFixed(2)}
                </title>
              </circle>
            ))}

            <text
              x={paddingLeft}
              y={height - 9}
              className="chart-label"
            >
              Mẫu đầu
            </text>

            <text
              x={width - paddingRight}
              y={height - 9}
              textAnchor="end"
              className="chart-label"
            >
              Mẫu cuối
            </text>
          </svg>
        </div>
      )}
    </section>
  );
}

/* Biểu đồ cột cho giá trị trung bình của từng ngón */
function FingerAverageChart({
  values,
}: {
  values: number[];
}) {
  return (
    <section className="chart-card">
      <div className="chart-heading">
        <h3>Flex trung bình của 5 ngón</h3>
        <span className="chart-unit">Từng ngón riêng biệt</span>
      </div>

      <div className="finger-bars">
        {FINGERS.map((finger, index) => {
          const value = values[index] ?? 0;

          return (
            <div className="finger-bar-row" key={finger}>
              <span className="finger-bar-name">{finger}</span>

              <div className="finger-bar-track">
                <div
                  className="finger-bar-fill"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, value)
                    )}%`,
                  }}
                />
              </div>

              <strong className="finger-bar-value">
                {value.toFixed(2)}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FingerCards({
  values,
}: {
  values: number[];
}) {
  return (
    <div className="finger-grid">
      {FINGERS.map((finger, index) => (
        <article className="finger-card" key={finger}>
          <div className="finger-card-top">
            <span className={`finger-dot finger-dot-${index}`} />
            <span>{finger}</span>
          </div>

          <div className="finger-number">
            {(values[index] ?? 0).toFixed(2)}
          </div>

          <div className="finger-card-caption">
            Flex trung bình
          </div>
        </article>
      ))}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("overview");

  const [sessions, setSessions] = useState<Session[]>(() =>
    loadSessions()
  );

  const [selectedSessionId, setSelectedSessionId] =
    useState<string>("");

  const [sessionName, setSessionName] = useState("Phiên tập mới");

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [currentValues, setCurrentValues] =
    useState<number[]>(INITIAL_VALUES);

  const [currentSamples, setCurrentSamples] = useState<Sample[]>([
    { time: 0, values: INITIAL_VALUES },
  ]);

  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(sessions)
      );
    } catch {
      setNotice(
        "Không thể lưu dữ liệu vào trình duyệt. Hãy kiểm tra dung lượng lưu trữ."
      );
    }
  }, [sessions]);

  /* Mô phỏng giá trị Flex mỗi giây khi đang ghi */
  useEffect(() => {
    if (!isRecording) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);

      setCurrentValues((previous) => {
        const next = previous.map((value) => {
          const change = (Math.random() - 0.5) * 8;

          return Math.max(
            0,
            Math.min(100, value + change)
          );
        });

        setCurrentSamples((samples) => [
          ...samples,
          {
            time: samples.length,
            values: next,
          },
        ]);

        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  const currentFingerAverages = useMemo(
    () => calculateFingerAverages(currentSamples),
    [currentSamples]
  );

  const selectedSession = sessions.find(
    (session) => session.id === selectedSessionId
  );

  



  function startRecording() {
    setCurrentSamples([
      {
        time: 0,
        values: [...currentValues],
      },
    ]);

    setElapsedSeconds(0);
    setSessionName(
      `Phiên tập ${sessions.length + 1}`
    );
    setNotice("");
    setIsRecording(true);
  }

  function stopRecording() {
    setIsRecording(false);
  }

  function saveSession() {
    if (isRecording) {
      setNotice("Hãy dừng ghi trước khi lưu phiên.");
      return;
    }

    if (currentSamples.length === 0) {
      setNotice("Chưa có dữ liệu để lưu.");
      return;
    }

    const fingerAverages =
      calculateFingerAverages(currentSamples);

    const newSession: Session = {
      id: `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      name: sessionName.trim() || "Phiên tập không tên",
      date: new Date().toISOString(),
      duration: elapsedSeconds,
      fingerAverages,
      samples: currentSamples.map((sample) => ({
        ...sample,
        values: [...sample.values],
      })),
    };

    setSessions((previous) => [
      newSession,
      ...previous,
    ]);

    setSelectedSessionId(newSession.id);
    setNotice("Đã lưu phiên tập luyện.");
    setPage("analysis");
  }

  function deleteSession(id: string) {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa phiên tập này?"
    );

    if (!confirmed) return;

    setSessions((previous) =>
      previous.filter((session) => session.id !== id)
    );

    if (selectedSessionId === id) {
      setSelectedSessionId("");
    }

    setNotice("Đã xóa phiên tập.");
  }

  function exportSessionCSV(session: Session) {
    const rows = [
      [
        "Thoi gian mau (s)",
        ...FINGERS,
      ],
      ...session.samples.map((sample) => [
        String(sample.time),
        ...FINGERS.map((_, index) =>
          (sample.values[index] ?? 0).toFixed(4)
        ),
      ]),
      [],
      ["Flex trung binh tung ngon"],
      ...FINGERS.map((finger, index) => [
        finger,
        (session.fingerAverages[index] ?? 0).toFixed(4),
      ]),
    ];

    downloadCSV(
      rows,
      `${session.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`
    );
  }

  function exportAllSessionsCSV() {
    const rows: (string | number)[][] = [
      [
        "Ten phien",
        "Ngay gio",
        "Thoi luong (s)",
        ...FINGERS.map((finger) => `${finger} - Flex TB`),
      ],
    ];

    sessions.forEach((session) => {
      rows.push([
        session.name,
        formatDate(session.date),
        session.duration,
        ...FINGERS.map((_, index) =>
          (session.fingerAverages[index] ?? 0).toFixed(4)
        ),
      ]);
    });

    downloadCSV(rows, "hand-rehab-sessions.csv");
  }

  function downloadCSV(
    rows: (string | number)[][],
    filename: string
  ) {
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "");
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  function resetCurrentData() {
    if (isRecording) {
      setNotice("Hãy dừng phiên trước khi làm mới.");
      return;
    }

    setElapsedSeconds(0);
    setCurrentValues([...INITIAL_VALUES]);
    setCurrentSamples([
      { time: 0, values: [...INITIAL_VALUES] },
    ]);
    setNotice("Đã làm mới dữ liệu phiên hiện tại.");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">HR</div>
          <div>
            <h1>Hand Rehab</h1>
            <p>Analytics Dashboard</p>
          </div>
        </div>

        <div className="nav-label">MENU CHÍNH</div>

        <nav className="navigation">
          <button
            className={`nav-button ${
              page === "overview" ? "active" : ""
            }`}
            onClick={() => setPage("overview")}
          >
            <span>▦</span> Tổng quan
          </button>

          <button
            className={`nav-button ${
              page === "analysis" ? "active" : ""
            }`}
            onClick={() => setPage("analysis")}
          >
            <span>⌁</span> Phân tích Flex
          </button>

          <button
            className={`nav-button ${
              page === "history" ? "active" : ""
            }`}
            onClick={() => setPage("history")}
          >
            <span>◷</span> Lịch sử phiên
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="status-indicator">
            <span className="status-dot" />
            <div>
              <strong>Chế độ mô phỏng</strong>
              <p>Chưa kết nối ESP32</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              Hand Rehab /{" "}
              {page === "overview"
                ? "Tổng quan"
                : page === "analysis"
                  ? "Phân tích Flex"
                  : "Lịch sử phiên"}
            </div>

            <h2>
              {page === "overview"
                ? "Tổng quan vận động bàn tay"
                : page === "analysis"
                  ? "Phân tích Flex"
                  : "Lịch sử tập luyện"}
            </h2>
          </div>

          <div className="topbar-status">
            <span className="status-dot" />
            Dữ liệu mô phỏng
          </div>
        </header>

        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button
              className="notice-close"
              onClick={() => setNotice("")}
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        )}

        {page === "overview" && (
          <>
            <section className="intro-row">
              <div>
                <h3>Theo dõi Flex của 5 ngón tay</h3>
                <p>
                  Ghi nhận dữ liệu, xem biểu đồ và so sánh
                  kết quả giữa các phiên tập.
                </p>
              </div>

              <div className="recording-badge">
                <span
                  className={`status-dot ${
                    isRecording ? "recording-dot" : ""
                  }`}
                />
                {isRecording ? "Đang ghi dữ liệu" : "Đang chờ"}
              </div>
            </section>

            <section className="control-panel">
              <div className="control-heading">
                <div>
                  <h3>Phiên tập hiện tại</h3>
                  <p>
                    {isRecording
                      ? "Dữ liệu mô phỏng đang được cập nhật mỗi giây."
                      : "Bắt đầu ghi để tạo một phiên tập mới."}
                  </p>
                </div>

                <div className="duration-display">
                  <span>Thời lượng</span>
                  <strong>
                    {formatDuration(elapsedSeconds)}
                  </strong>
                </div>
              </div>

              <label className="field-label" htmlFor="sessionName">
                Tên phiên tập
              </label>

              <input
                id="sessionName"
                className="text-input"
                value={sessionName}
                onChange={(event) =>
                  setSessionName(event.target.value)
                }
                disabled={isRecording}
                placeholder="Nhập tên phiên tập"
              />

              <div className="control-actions">
                {!isRecording ? (
                  <button
                    className="button button-primary"
                    onClick={startRecording}
                  >
                    ▶ Bắt đầu ghi
                  </button>
                ) : (
                  <button
                    className="button button-danger"
                    onClick={stopRecording}
                  >
                    ■ Dừng ghi
                  </button>
                )}

                <button
                  className="button button-secondary"
                  onClick={saveSession}
                  disabled={isRecording}
                >
                  Lưu phiên tập
                </button>

                <button
                  className="button button-ghost"
                  onClick={resetCurrentData}
                  disabled={isRecording}
                >
                  Làm mới
                </button>
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <h3>Flex trung bình từng ngón</h3>
                  <p>
                    Tính riêng từng ngón từ các mẫu đo hiện tại.
                  </p>
                </div>
                <span className="subtle-tag">
                  5 ngón tay
                </span>
              </div>

              <FingerCards values={currentFingerAverages} />

              <FingerAverageChart
                values={currentFingerAverages}
              />
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <h3>Diễn biến Flex theo thời gian</h3>
                  <p>
                    Mỗi biểu đồ thể hiện một ngón tay độc lập.
                  </p>
                </div>
              </div>

              <div className="chart-grid">
                {FINGERS.map((finger, index) => (
                  <LineChart
                    key={finger}
                    title={finger}
                    samples={currentSamples}
                    fingerIndex={index}
                    color={[
                      "#2563eb",
                      "#0d9488",
                      "#7c3aed",
                      "#ea580c",
                      "#db2777",
                    ][index]}
                  />
                ))}
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <h3>Phiên tập gần đây</h3>
                  <p>
                    {sessions.length} phiên đã lưu trên thiết bị này.
                  </p>
                </div>

                <button
                  className="text-button"
                  onClick={() => setPage("history")}
                >
                  Xem tất cả →
                </button>
              </div>

              {sessions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">◷</div>
                  <h3>Chưa có phiên tập nào</h3>
                  <p>
                    Bắt đầu ghi dữ liệu rồi lưu phiên để xem
                    lịch sử và so sánh kết quả.
                  </p>
                </div>
              ) : (
                <div className="session-list">
                  {sessions.slice(0, 3).map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      onView={() => {
                        setSelectedSessionId(session.id);
                        setPage("analysis");
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {page === "analysis" && (
          <section className="section-block page-section">
            <div className="section-heading">
              <div>
                <h3>Phân tích theo từng phiên</h3>
                <p>
                  Xem Flex trung bình của từng ngón trong
                  phiên được chọn.
                </p>
              </div>

              {selectedSession && (
                <button
                  className="button button-secondary"
                  onClick={() =>
                    exportSessionCSV(selectedSession)
                  }
                >
                  ↓ Xuất CSV
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⌁</div>
                <h3>Chưa có dữ liệu lịch sử</h3>
                <p>
                  Hãy tạo và lưu một phiên tập trước khi phân tích.
                </p>
                <button
                  className="button button-primary"
                  onClick={() => setPage("overview")}
                >
                  Tạo phiên tập
                </button>
              </div>
            ) : (
              <>
                <label className="field-label" htmlFor="sessionSelect">
                  Chọn phiên tập
                </label>

                <select
                  id="sessionSelect"
                  className="text-input"
                  value={selectedSessionId || sessions[0].id}
                  onChange={(event) =>
                    setSelectedSessionId(event.target.value)
                  }
                >
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name} — {formatDate(session.date)}
                    </option>
                  ))}
                </select>

                {(() => {
                  const session =
                    selectedSession ?? sessions[0];

                  if (!session) return null;

                  return (
                    <>
                      <div className="session-summary">
                        <div>
                          <span>Tên phiên</span>
                          <strong>{session.name}</strong>
                        </div>

                        <div>
                          <span>Ngày thực hiện</span>
                          <strong>{formatDate(session.date)}</strong>
                        </div>

                        <div>
                          <span>Thời lượng</span>
                          <strong>
                            {formatDuration(session.duration)}
                          </strong>
                        </div>

                        <div>
                          <span>Số mẫu đo</span>
                          <strong>{session.samples.length}</strong>
                        </div>
                      </div>

                      <div className="section-heading inner-heading">
                        <div>
                          <h3>Flex trung bình của từng ngón</h3>
                          <p>
                            Mỗi ô là kết quả trung bình của một
                            ngón trong toàn bộ phiên này.
                          </p>
                        </div>
                      </div>

                      <FingerCards
                        values={session.fingerAverages}
                      />

                      <FingerAverageChart
                        values={session.fingerAverages}
                      />

                      <div className="section-heading inner-heading">
                        <div>
                          <h3>Biểu đồ từng ngón trong phiên</h3>
                          <p>
                            Trục ngang là thứ tự mẫu đo; trục dọc
                            là giá trị Flex.
                          </p>
                        </div>
                      </div>

                      <div className="chart-grid">
                        {FINGERS.map((finger, index) => (
                          <LineChart
                            key={finger}
                            title={finger}
                            samples={session.samples}
                            fingerIndex={index}
                            color={[
                              "#2563eb",
                              "#0d9488",
                              "#7c3aed",
                              "#ea580c",
                              "#db2777",
                            ][index]}
                          />
                        ))}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </section>
        )}

        {page === "history" && (
          <section className="section-block page-section">
            <div className="section-heading">
              <div>
                <h3>Lịch sử phiên tập</h3>
                <p>
                  Xem kết quả riêng của từng ngón, mở biểu đồ
                  hoặc xuất dữ liệu.
                </p>
              </div>

              <button
                className="button button-secondary"
                onClick={exportAllSessionsCSV}
                disabled={sessions.length === 0}
              >
                ↓ Xuất tất cả CSV
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◷</div>
                <h3>Chưa có dữ liệu lịch sử</h3>
                <p>
                  Những phiên được lưu sẽ xuất hiện tại đây.
                </p>
                <button
                  className="button button-primary"
                  onClick={() => setPage("overview")}
                >
                  Bắt đầu tập
                </button>
              </div>
            ) : (
              <div className="history-list">
                {sessions.map((session) => (
                  <article
                    className="history-card"
                    key={session.id}
                  >
                    <div className="history-card-header">
                      <div>
                        <h3>{session.name}</h3>
                        <p>{formatDate(session.date)}</p>
                      </div>

                      <span className="subtle-tag">
                        {session.samples.length} mẫu
                      </span>
                    </div>

                    <div className="history-finger-grid">
                      {FINGERS.map((finger, index) => (
                        <div
                          className="history-finger"
                          key={finger}
                        >
                          <span>{finger}</span>
                          <strong>
                            {(
                              session.fingerAverages[index] ?? 0
                            ).toFixed(2)}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div className="history-card-footer">
                      <span>
                        Thời lượng:{" "}
                        {formatDuration(session.duration)}
                      </span>

                      <div className="history-actions">
                        <button
                          className="text-button"
                          onClick={() => {
                            setSelectedSessionId(session.id);
                            setPage("analysis");
                          }}
                        >
                          Xem phân tích
                        </button>

                        <button
                          className="text-button"
                          onClick={() => exportSessionCSV(session)}
                        >
                          Xuất CSV
                        </button>

                        <button
                          className="text-button danger-text"
                          onClick={() => deleteSession(session.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="app-footer">
          <p>
            Hand Rehab Analytics · Công cụ theo dõi dữ liệu Flex
            mang tính thử nghiệm.
          </p>
          <p>
            Giá trị mô phỏng không phải chẩn đoán y tế hoặc
            thước đo phục hồi đã được kiểm định.
          </p>
        </footer>
      </main>
    </div>
  );
}

function SessionRow({
  session,
  onView,
}: {
  session: Session;
  onView: () => void;
}) {
  return (
    <button className="session-row" onClick={onView}>
      <div className="session-row-icon">⌁</div>

      <div className="session-row-main">
        <strong>{session.name}</strong>
        <span>{formatDate(session.date)}</span>
      </div>

      <div className="session-row-values">
        {FINGERS.map((finger, index) => (
          <div key={finger}>
            <span>{finger}</span>
            <strong>
              {(session.fingerAverages[index] ?? 0).toFixed(1)}
            </strong>
          </div>
        ))}
      </div>

      <span className="session-row-arrow">→</span>
    </button>
  );
}