
import { useEffect, useState } from 'react'
import './App.css'

type Finger = {
  name: string
  flex: number
  fsr: number
}

const initialFingers: Finger[] = [
  { name: 'Ngón cái', flex: 35, fsr: 120 },
  { name: 'Ngón trỏ', flex: 28, fsr: 95 },
  { name: 'Ngón giữa', flex: 42, fsr: 140 },
  { name: 'Ngón áp út', flex: 31, fsr: 110 },
  { name: 'Ngón út', flex: 25, fsr: 80 },
]

function App() {
  const [fingers, setFingers] = useState(initialFingers)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [history, setHistory] = useState<number[]>([30, 35, 32, 45, 40, 48, 43, 52])
  const [sessionCount, setSessionCount] = useState(0)

  useEffect(() => {
    if (!isRecording) return

    const timer = window.setInterval(() => {
      setElapsed((previous) => previous + 1)

      setFingers((previous) =>
        previous.map((finger) => ({
          ...finger,
          flex: Math.max(
            0,
            Math.min(100, finger.flex + (Math.random() - 0.5) * 8),
          ),
          fsr: Math.max(
            0,
            Math.round(finger.fsr + (Math.random() - 0.5) * 20),
          ),
        })),
      )

      setHistory((previous) => [
        ...previous.slice(-19),
        Math.round(20 + Math.random() * 70),
      ])
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  }

  const startSession = () => {
    setElapsed(0)
    setSessionCount((previous) => previous + 1)
    setIsRecording(true)
  }

  const stopSession = () => {
    setIsRecording(false)
  }

  const resetData = () => {
    setIsRecording(false)
    setElapsed(0)
    setFingers(initialFingers)
    setHistory([30, 35, 32, 45, 40, 48, 43, 52])
  }

  const exportCsv = () => {
    const rows = [
      ['Ngón tay', 'Flex (%)', 'FSR (raw)'],
      ...fingers.map((finger) => [
        finger.name,
        finger.flex.toFixed(1),
        String(finger.fsr),
      ]),
    ]

    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'hand-rehab-sample.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const chartPoints = history
    .map((value, index) => {
      const x = history.length <= 1 ? 0 : (index / (history.length - 1)) * 100
      const y = 100 - value
      return `${x},${y}`
    })
    .join(' ')

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">H</div>
          <div>
            <h1>Hand Rehab Analytics</h1>
            <p>Hệ thống theo dõi phục hồi chức năng bàn tay</p>
          </div>
        </div>
        <div className="demo-badge">
          <span className="status-dot" />
          CHẾ ĐỘ MÔ PHỎNG
        </div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">BẢNG ĐIỀU KHIỂN PHỤC HỒI</p>
          <h2>Theo dõi từng chuyển động.</h2>
          <p className="welcome-text">
            Theo dõi tín hiệu gập ngón tay và áp lực bóp trong mỗi phiên tập.
          </p>
        </div>
        <div className="session-clock">
          <span>THỜI GIAN PHIÊN</span>
          <strong>{formatTime(elapsed)}</strong>
          <small>{isRecording ? 'Đang ghi phiên tập' : 'Chưa ghi phiên tập'}</small>
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <span className="card-label">SỐ NGÓN TAY</span>
          <strong>05</strong>
          <small>Đang theo dõi</small>
        </article>
        <article className="summary-card">
          <span className="card-label">KÊNH CẢM BIẾN</span>
          <strong>10</strong>
          <small>5 Flex + 5 FSR</small>
        </article>
        <article className="summary-card">
          <span className="card-label">PHIÊN ĐÃ BẮT ĐẦU</span>
          <strong>{sessionCount}</strong>
          <small>Trong lần mở trang này</small>
        </article>
        <article className="summary-card">
          <span className="card-label">KẾT NỐI THIẾT BỊ</span>
          <strong className="not-connected">Chưa kết nối</strong>
          <small>ESP32 chưa được kết nối</small>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">DỮ LIỆU THEO THỜI GIAN</p>
              <h3>Biểu đồ chuyển động</h3>
            </div>
            <span className="unit-label">Giá trị mô phỏng (%)</span>
          </div>

          <div className="chart">
            <div className="chart-grid">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              role="img"
              aria-label="Biểu đồ dữ liệu mô phỏng"
            >
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <polygon points={`0,100 ${chartPoints} 100,100`} fill="url(#chartFill)" />
              <polyline
                points={chartPoints}
                fill="none"
                stroke="#0284c7"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="chart-footer">
            <span>Thời gian →</span>
            <span>{isRecording ? 'Đang cập nhật dữ liệu mô phỏng' : 'Chờ bắt đầu phiên'}</span>
          </div>
        </article>

        <article className="panel action-panel">
          <p className="eyebrow">ĐIỀU KHIỂN PHIÊN TẬP</p>
          <h3>Phiên phục hồi</h3>
          <p className="panel-description">
            Bắt đầu ghi để xem các chỉ số mô phỏng thay đổi theo thời gian.
          </p>
          <button
            className="primary-button"
            onClick={startSession}
            disabled={isRecording}
          >
            {isRecording ? 'Đang ghi dữ liệu…' : '▶ Bắt đầu phiên'}
          </button>
          <button
            className="secondary-button"
            onClick={stopSession}
            disabled={!isRecording}
          >
            ■ Kết thúc phiên
          </button>
          <button className="secondary-button" onClick={resetData}>
            ↻ Đặt lại dữ liệu
          </button>
          <button className="export-button" onClick={exportCsv}>
            ↓ Xuất dữ liệu CSV
          </button>
          <p className="notice">
            Dữ liệu hiện tại là dữ liệu mô phỏng, chưa phải số đo của người tập.
          </p>
        </article>
      </section>

      <section className="panel sensors-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">GIÁM SÁT 10 KÊNH</p>
            <h3>Trạng thái cảm biến theo ngón tay</h3>
          </div>
          <span className="unit-label">Giá trị minh họa</span>
        </div>

        <div className="sensor-list">
          {fingers.map((finger) => (
            <article className="sensor-card" key={finger.name}>
              <div className="finger-heading">
                <strong>{finger.name}</strong>
                <span className="sensor-status">Mô phỏng</span>
              </div>
              <div className="sensor-reading">
                <div>
                  <span>Flex</span>
                  <strong>{finger.flex.toFixed(1)}%</strong>
                </div>
                <div>
                  <span>FSR raw</span>
                  <strong>{finger.fsr}</strong>
                </div>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${finger.flex}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        Hand Rehab Analytics · Bản mẫu phát triển · Không dùng để đưa ra quyết định lâm sàng
      </footer>
    </main>
  )
}

export default App
