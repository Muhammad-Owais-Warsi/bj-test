import React, { useState } from "react";

function renderTree(nodeObj) {
    if (!nodeObj || typeof nodeObj !== "object") return null;
    return Object.entries(nodeObj).map(([key, val]) => (
        <div key={key}>
            <div style={s.treeItem}>
                <span style={s.treeDot}>◦</span>
                <span style={s.treeKey}>{key}</span>
            </div>
            {val && Object.keys(val).length > 0 && (
                <div style={s.treeChildren}>{renderTree(val)}</div>
            )}
        </div>
    ));
}

function syntaxHighlight(json) {
    const str = JSON.stringify(json, null, 2);
    const tokens = [];
    let i = 0;
    while (i < str.length) {
        if (str[i] === '"') {
            let end = i + 1;
            while (
                end < str.length &&
                !(str[end] === '"' && str[end - 1] !== "\\")
            )
                end++;
            end++;
            const raw = str.slice(i, end);
            const isKey = str.slice(end).trimStart().startsWith(":");
            tokens.push(
                <span key={i} style={isKey ? s.jKey : s.jStr}>
                    {raw}
                </span>,
            );
            i = end;
            continue;
        }

        const numMatch = str.slice(i).match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
        if (numMatch) {
            tokens.push(
                <span key={i} style={s.jNum}>
                    {numMatch[0]}
                </span>,
            );
            i += numMatch[0].length;
            continue;
        }

        const kwMatch = str.slice(i).match(/^(true|false|null)/);
        if (kwMatch) {
            tokens.push(
                <span key={i} style={s.jBool}>
                    {kwMatch[0]}
                </span>,
            );
            i += kwMatch[0].length;
            continue;
        }
        tokens.push(<span key={i}>{str[i]}</span>);
        i++;
    }
    return tokens;
}

const DEFAULT_INPUT = `A->B
A->C
B->D
C->E
E->F
X->Y
Y->Z
Z->X
P->Q
Q->R
G->H
G->H
G->I
hello
1->2
A->`;

export default function App() {
    const [input, setInput] = useState(DEFAULT_INPUT);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [jsonOpen, setJsonOpen] = useState(true);

    const handleSubmit = async () => {
        setError("");
        setResult(null);
        setLoading(true);

        try {
            let parsedData = [];
            const trimmed = input.trim();

            if (trimmed.startsWith("{")) {
                const json = JSON.parse(trimmed);

                if (!Array.isArray(json.data)) {
                    throw new Error(
                        "Invalid JSON format: 'data' must be an array",
                    );
                }

                parsedData = json.data;
            } else if (trimmed.includes(",") && trimmed.includes("->")) {
                parsedData = trimmed
                    .split(",")
                    .map((item) => item.replace(/["']/g, "").trim())
                    .filter(Boolean);
            } else {
                parsedData = trimmed
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean);
            }

            const res = await fetch("https://bj-test.onrender.com/bfhl", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ data: parsedData }),
            });

            if (!res.ok) {
                throw new Error("API request failed");
            }

            const json = await res.json();
            setResult(json);
        } catch (err) {
            console.error(err);
            setError("Invalid input format or API error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <div style={s.container}>
                <h1 style={s.title}>Hierarchy Builder</h1>
                <p style={s.subtitle}>
                    Parse edge lists into tree structures, detect cycles and
                    duplicates.
                </p>

                <p style={s.sectionLabel}>Input</p>
                <textarea
                    rows={10}
                    style={s.textarea}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    spellCheck={false}
                />
                <button style={s.btn} onClick={handleSubmit} disabled={loading}>
                    {loading ? "Processing…" : "Submit"}
                </button>

                {error && <div style={s.errorBar}>{error}</div>}

                {result && (
                    <div style={{ marginTop: "2rem" }}>
                        <hr style={s.divider} />

                        <p style={s.sectionLabel}>Overview</p>
                        <div style={s.metricsRow}>
                            <div style={s.metric}>
                                <div style={s.metricLabel}>Trees</div>
                                <div style={s.metricValue}>
                                    {result.summary?.total_trees ?? "—"}
                                </div>
                            </div>
                            <div style={s.metric}>
                                <div style={s.metricLabel}>Cycles</div>
                                <div style={s.metricValue}>
                                    {result.summary?.total_cycles ?? "—"}
                                </div>
                            </div>
                            <div style={s.metric}>
                                <div style={s.metricLabel}>Largest root</div>
                                <div
                                    style={{
                                        ...s.metricValue,
                                        fontSize: "16px",
                                        marginTop: "4px",
                                    }}
                                >
                                    {result.summary?.largest_tree_root ?? "—"}
                                </div>
                            </div>
                        </div>

                        <div style={s.jsonCard}>
                            <button
                                style={s.jsonCardHeader}
                                onClick={() => setJsonOpen((v) => !v)}
                            >
                                <div style={s.jsonCardLeft}>
                                    <span style={s.jsonDot} />
                                    <span style={s.jsonCardTitle}>
                                        Raw JSON response
                                    </span>
                                    <span style={s.jsonCardHint}>
                                        API output
                                    </span>
                                </div>
                                <div style={s.jsonCardRight}>
                                    <span style={s.jsonCardCta}>
                                        {jsonOpen ? "Collapse" : "Expand"}
                                    </span>
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 12 12"
                                        fill="none"
                                        style={{
                                            transform: jsonOpen
                                                ? "rotate(180deg)"
                                                : "none",
                                            transition: "transform 0.15s",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <path
                                            d="M3 4.5L6 7.5L9 4.5"
                                            stroke="currentColor"
                                            strokeWidth="1.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                            </button>
                            {jsonOpen && (
                                <pre style={s.jsonBlock}>
                                    {syntaxHighlight(result)}
                                </pre>
                            )}
                        </div>

                        <p style={s.sectionLabel}>Hierarchies</p>
                        <div style={s.hGrid}>
                            {(result.hierarchies || []).map((h, idx) => (
                                <div key={idx} style={s.hCard}>
                                    <div style={s.hRoot}>{h.root}</div>
                                    {h.has_cycle ? (
                                        <>
                                            <div style={s.hMeta}>
                                                cyclic graph
                                            </div>
                                            <span style={s.cycleBadge}>
                                                cycle detected
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <div style={s.hMeta}>
                                                depth {h.depth}
                                            </div>
                                            <div style={s.treeWrap}>
                                                {renderTree(h.tree)}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <hr style={s.divider} />

                        <div style={s.infoRow}>
                            <div style={s.infoCard}>
                                <div style={s.infoCardTitle}>
                                    Invalid entries
                                </div>
                                <div style={s.tagRow}>
                                    {result.invalid_entries?.length ? (
                                        result.invalid_entries.map((x) => (
                                            <span key={x} style={s.tagWarn}>
                                                {x}
                                            </span>
                                        ))
                                    ) : (
                                        <span style={s.tagNone}>none</span>
                                    )}
                                </div>
                            </div>
                            <div style={s.infoCard}>
                                <div style={s.infoCardTitle}>
                                    Duplicate edges
                                </div>
                                <div style={s.tagRow}>
                                    {result.duplicate_edges?.length ? (
                                        result.duplicate_edges.map((x) => (
                                            <span key={x} style={s.tag}>
                                                {x}
                                            </span>
                                        ))
                                    ) : (
                                        <span style={s.tagNone}>none</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const s = {
    page: {
        background: "#ffffff",
        minHeight: "100vh",
        padding: "2rem 1.5rem",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#111",
    },
    container: {
        maxWidth: "860px",
        margin: "0 auto",
    },
    title: {
        fontSize: "20px",
        fontWeight: 500,
        letterSpacing: "-0.02em",
        marginBottom: "0.25rem",
    },
    subtitle: {
        fontSize: "13px",
        color: "#888",
        marginBottom: "2rem",
    },
    sectionLabel: {
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "#aaa",
        marginBottom: "0.75rem",
    },
    divider: {
        border: "none",
        borderTop: "0.5px solid #e5e5e5",
        margin: "1.5rem 0",
    },
    textarea: {
        width: "100%",
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontSize: "13px",
        lineHeight: 1.6,
        background: "#f8f8f8",
        color: "#111",
        border: "0.5px solid #e0e0e0",
        borderRadius: "8px",
        padding: "12px 14px",
        resize: "vertical",
        outline: "none",
    },
    btn: {
        marginTop: "0.75rem",
        padding: "8px 20px",
        fontSize: "13px",
        fontWeight: 500,
        border: "0.5px solid #d0d0d0",
        borderRadius: "8px",
        background: "#fff",
        color: "#111",
        cursor: "pointer",
    },
    errorBar: {
        fontSize: "13px",
        color: "#c0392b",
        background: "#fdf2f2",
        border: "0.5px solid #f5c6c6",
        borderRadius: "8px",
        padding: "10px 14px",
        marginTop: "1rem",
    },
    metricsRow: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
        marginBottom: "1.5rem",
    },
    metric: {
        background: "#f8f8f8",
        borderRadius: "8px",
        padding: "12px 14px",
    },
    metricLabel: {
        fontSize: "11px",
        color: "#aaa",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "4px",
    },
    metricValue: {
        fontSize: "22px",
        fontWeight: 500,
        letterSpacing: "-0.02em",
    },
    hGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "10px",
        marginBottom: "1.5rem",
    },
    hCard: {
        background: "#fff",
        border: "0.5px solid #e5e5e5",
        borderRadius: "10px",
        padding: "14px 16px",
    },
    hRoot: {
        fontSize: "13px",
        fontWeight: 500,
        marginBottom: "4px",
    },
    hMeta: {
        fontSize: "11px",
        color: "#aaa",
        marginBottom: "10px",
    },
    cycleBadge: {
        display: "inline-block",
        fontSize: "11px",
        padding: "3px 8px",
        borderRadius: "99px",
        background: "#fef9ec",
        color: "#92600a",
        border: "0.5px solid #f5d78a",
    },
    treeWrap: {
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontSize: "12px",
        lineHeight: 1.8,
    },
    treeItem: {
        display: "flex",
        alignItems: "flex-start",
        gap: "4px",
    },
    treeDot: {
        color: "#ccc",
        fontSize: "10px",
        marginTop: "3px",
        flexShrink: 0,
    },
    treeKey: {
        color: "#111",
    },
    treeChildren: {
        marginLeft: "14px",
        borderLeft: "0.5px solid #e5e5e5",
        paddingLeft: "10px",
    },
    infoRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px",
        marginBottom: "1.5rem",
    },
    infoCard: {
        background: "#f8f8f8",
        borderRadius: "8px",
        padding: "12px 14px",
    },
    infoCardTitle: {
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "#aaa",
        marginBottom: "8px",
    },
    tagRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: "5px",
    },
    tag: {
        fontSize: "11px",
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        background: "#fff",
        border: "0.5px solid #e0e0e0",
        borderRadius: "4px",
        padding: "2px 7px",
        color: "#555",
    },
    tagWarn: {
        fontSize: "11px",
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        background: "#fef9ec",
        border: "0.5px solid #f5d78a",
        borderRadius: "4px",
        padding: "2px 7px",
        color: "#92600a",
    },
    tagNone: {
        fontSize: "11px",
        color: "#bbb",
        fontStyle: "italic",
    },
    jsonCard: {
        border: "1px solid #e0e0e0",
        borderRadius: "10px",
        marginBottom: "1.5rem",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    },
    jsonCardHeader: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        background: "#f4f4f4",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        borderBottom: "0.5px solid #e0e0e0",
    },
    jsonCardLeft: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    jsonDot: {
        display: "inline-block",
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: "#0550ae",
        flexShrink: 0,
    },
    jsonCardTitle: {
        fontSize: "13px",
        fontWeight: 500,
        color: "#111",
    },
    jsonCardHint: {
        fontSize: "11px",
        color: "#aaa",
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        background: "#e8e8e8",
        padding: "1px 6px",
        borderRadius: "4px",
    },
    jsonCardRight: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        color: "#666",
    },
    jsonCardCta: {
        fontSize: "11px",
        color: "#0550ae",
        fontWeight: 500,
    },
    jsonBlock: {
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontSize: "11.5px",
        lineHeight: 1.7,
        background: "#f8f8f8",
        border: "0.5px solid #e5e5e5",
        borderRadius: "8px",
        padding: "14px",
        overflowX: "auto",
        whiteSpace: "pre",
        margin: 0,
    },
    jKey: { color: "#0550ae" },
    jStr: { color: "#116329" },
    jNum: { color: "#953800" },
    jBool: { color: "#8250df" },
};
