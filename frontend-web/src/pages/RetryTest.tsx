import { useState, useRef } from "react";
import axiosClient from "../api/axiosClient";

interface TestResult {
    label: string;
    status: "success" | "error";
    message: string;
    retries: number;
    duration: number;
    dataPreview?: string;
}

export default function RetryTest() {
    const [results, setResults] = useState<TestResult[]>([]);
    const [running, setRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const clientIdRef = useRef(0);

    const addResult = (r: TestResult) =>
        setResults((prev) => [...prev, r]);

    const addLog = (msg: string) =>
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const runTest = async (label: string, fn: () => Promise<any>) => {
        addLog(`--- Bắt đầu: ${label} ---`);
        const start = Date.now();
        try {
            const res = await fn();
            const retryCount = res.config?._retryCount ?? 0;

            let dataPreview = "";
            const data = res.data?.data ?? res.data;
            if (data) {
                dataPreview = JSON.stringify(data).slice(0, 120);
                if (JSON.stringify(data).length > 120) dataPreview += "...";
            }

            addLog(`OK sau ${retryCount} retries — nhận ${JSON.stringify(data).length} bytes data`);
            addResult({
                label,
                status: "success",
                message: res.data?.message || "Thành công",
                retries: retryCount,
                duration: Date.now() - start,
                dataPreview,
            });
        } catch (err: any) {
            const retryCount = err.config?._retryCount ?? 0;
            addLog(`FAIL sau ${retryCount} retries — ${err.code || err.message}`);
            addResult({
                label,
                status: "error",
                message: err.code || err.response?.data?.message || err.message || "Unknown",
                retries: retryCount,
                duration: Date.now() - start,
            });
        }
    };

    const runAllTests = async () => {
        setResults([]);
        setLogs([]);
        setRunning(true);

        // Test 1: Backend trả 503 hai lần → lần 3 trả 200 → retry THÀNH CÔNG
        const cid1 = `prod-${++clientIdRef.current}`;
        await runTest(
            "1. Server 503 x2 → retry thành công",
            () => axiosClient.get(`/posts/test-retry?clientId=${cid1}&failCount=2`),
        );

        // Test 2: Backend trả 503 bốn lần → vượt max retry 3 → THẤT BẠI
        const cid2 = `prod-${++clientIdRef.current}`;
        await runTest(
            "2. Server 503 x4 → vượt max retry → thất bại",
            () => axiosClient.get(`/posts/test-retry?clientId=${cid2}&failCount=4`),
        );

        // Test 3: Timeout 1ms → mỗi lần đều bị cắt → retry 3 lần rồi fail
        await runTest(
            "3. Timeout 1ms → ECONNABORTED",
            () => axiosClient.get("/posts/feed", { timeout: 1 }),
        );

        // Test 4: Feed bình thường → thành công ngay, 0 retry, nhận data thật
        await runTest(
            "4. Feed bình thường → data thật, 0 retry",
            () => axiosClient.get("/posts/feed"),
        );

        setRunning(false);
    };

    return (
        <div style={{ padding: 32, fontFamily: "sans-serif", maxWidth: 960, margin: "0 auto" }}>
            <h1 style={{ fontFamily: "monospace" }}>Retry / Timeout — Production Test</h1>
            <p style={{ color: "#666", marginBottom: 24 }}>
                Test này chạy trên <b>server thật</b>. Backend endpoint <code>/posts/test-retry</code> trả
                503 thật qua network → frontend retry → nhận 200 thật.
            </p>

            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <button
                    onClick={runAllTests}
                    disabled={running}
                    style={{
                        padding: "12px 24px", fontSize: 16,
                        background: running ? "#ccc" : "#2563eb",
                        color: "#fff", border: "none", borderRadius: 8,
                        cursor: running ? "not-allowed" : "pointer",
                    }}
                >
                    {running ? "Đang chạy..." : "Chạy 4 tests"}
                </button>
                <button
                    onClick={() => { setResults([]); setLogs([]); }}
                    disabled={running}
                    style={{
                        padding: "12px 24px", fontSize: 16,
                        background: "#e5e7eb", border: "none", borderRadius: 8, cursor: "pointer",
                    }}
                >
                    Xóa kết quả
                </button>
            </div>

            {/* Bảng kết quả */}
            {results.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 24 }}>
                    <thead>
                        <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                            <th style={{ padding: 10, border: "1px solid #d1d5db" }}>Test</th>
                            <th style={{ padding: 10, border: "1px solid #d1d5db", width: 70 }}>Kết quả</th>
                            <th style={{ padding: 10, border: "1px solid #d1d5db" }}>Message</th>
                            <th style={{ padding: 10, border: "1px solid #d1d5db", width: 70 }}>Retries</th>
                            <th style={{ padding: 10, border: "1px solid #d1d5db", width: 80 }}>Thời gian</th>
                            <th style={{ padding: 10, border: "1px solid #d1d5db" }}>Data nhận được</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((r, i) => (
                            <tr key={i} style={{ background: i % 2 ? "#f9fafb" : "#fff" }}>
                                <td style={{ padding: 10, border: "1px solid #d1d5db" }}>{r.label}</td>
                                <td style={{
                                    padding: 10, border: "1px solid #d1d5db", textAlign: "center",
                                    color: r.status === "success" ? "#16a34a" : "#dc2626", fontWeight: 700,
                                }}>
                                    {r.status === "success" ? "OK" : "FAIL"}
                                </td>
                                <td style={{ padding: 10, border: "1px solid #d1d5db", fontSize: 12 }}>{r.message}</td>
                                <td style={{ padding: 10, border: "1px solid #d1d5db", textAlign: "center" }}>
                                    {r.retries}/3
                                </td>
                                <td style={{ padding: 10, border: "1px solid #d1d5db" }}>
                                    {(r.duration / 1000).toFixed(1)}s
                                </td>
                                <td style={{
                                    padding: 10, border: "1px solid #d1d5db", fontSize: 11,
                                    fontFamily: "monospace", maxWidth: 200, overflow: "hidden",
                                    textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280",
                                }}>
                                    {r.dataPreview || "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Log realtime */}
            {logs.length > 0 && (
                <div style={{
                    background: "#1e293b", color: "#e2e8f0", borderRadius: 8,
                    padding: 16, fontFamily: "monospace", fontSize: 12,
                    maxHeight: 300, overflowY: "auto", marginBottom: 24,
                }}>
                    <div style={{ color: "#94a3b8", marginBottom: 8 }}>
                        Timeline (mở thêm F12 Console để xem log retry chi tiết)
                    </div>
                    {logs.map((l, i) => (
                        <div key={i} style={{
                            color: l.includes("OK") ? "#4ade80"
                                : l.includes("FAIL") ? "#f87171"
                                : l.includes("---") ? "#60a5fa" : "#e2e8f0",
                        }}>
                            {l}
                        </div>
                    ))}
                </div>
            )}

            {/* Giải thích */}
            <div style={{ padding: 16, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <h3 style={{ margin: "0 0 12px" }}>Kỳ vọng kết quả trên Production:</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: 6 }}><b>Test 1</b></td>
                            <td style={{ padding: 6, color: "#16a34a" }}>OK</td>
                            <td style={{ padding: 6 }}>2/3</td>
                            <td style={{ padding: 6 }}>Server trả 503 thật 2 lần → retry → lần 3 trả 200 + data</td>
                        </tr>
                        <tr>
                            <td style={{ padding: 6 }}><b>Test 2</b></td>
                            <td style={{ padding: 6, color: "#dc2626" }}>FAIL</td>
                            <td style={{ padding: 6 }}>3/3</td>
                            <td style={{ padding: 6 }}>Server fail 4 lần, retry 3 lần vẫn không đủ</td>
                        </tr>
                        <tr>
                            <td style={{ padding: 6 }}><b>Test 3</b></td>
                            <td style={{ padding: 6, color: "#dc2626" }}>FAIL</td>
                            <td style={{ padding: 6 }}>3/3</td>
                            <td style={{ padding: 6 }}>Timeout 1ms — request bị cắt trước khi server kịp trả</td>
                        </tr>
                        <tr>
                            <td style={{ padding: 6 }}><b>Test 4</b></td>
                            <td style={{ padding: 6, color: "#16a34a" }}>OK</td>
                            <td style={{ padding: 6 }}>0/3</td>
                            <td style={{ padding: 6 }}>Thành công ngay, nhận data feed thật, không retry</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
