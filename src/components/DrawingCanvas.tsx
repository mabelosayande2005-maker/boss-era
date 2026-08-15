"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Eraser, Trash2 } from "lucide-react";

const DRAW_COLORS = [
  { value: "#1a1a2e", label: "Ink" },
  { value: "#8fada0", label: "Sage" },
  { value: "#c07b85", label: "Rose" },
  { value: "#8d78c4", label: "Lavender" },
  { value: "#c49a3c", label: "Gold" },
  { value: "#4a7fa5", label: "Blue" },
  { value: "#b35b2a", label: "Rust" },
];

const CANVAS_W = 1200;
const CANVAS_H = 720;

type Tool = "pen" | "eraser";

export function DrawingCanvas({
  initialData,
  onChange,
}: {
  initialData?: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const initialDataRef = useRef(initialData);

  const [tool, setTool] = useState<Tool>("pen");
  const [penColor, setPenColor] = useState(DRAW_COLORS[0].value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    if (initialDataRef.current) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
      img.src = initialDataRef.current;
    }
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
      isStylus: e.pointerType === "pen",
    };
  };

  const calcLineWidth = (pressure: number, isStylus: boolean, eraser: boolean) => {
    if (eraser) return 40;
    const base = isStylus ? 2 : 3;
    const scale = isStylus ? 7 : 3;
    return Math.max(1, base + pressure * scale);
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getPoint(e);
    if (!pt) return;
    lastPtRef.current = { x: pt.x, y: pt.y };
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const lw = calcLineWidth(pt.pressure, pt.isStylus, tool === "eraser");
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, lw / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === "eraser" ? "#ffffff" : penColor;
    ctx.fill();
  }, [tool, penColor]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pt = getPoint(e);
    const last = lastPtRef.current;
    if (!pt || !last) return;
    const lw = calcLineWidth(pt.pressure, pt.isStylus, tool === "eraser");
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : penColor;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPtRef.current = { x: pt.x, y: pt.y };
  }, [tool, penColor]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPtRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    onChange(null);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {DRAW_COLORS.map(c => (
          <button
            key={c.value}
            onClick={() => { setTool("pen"); setPenColor(c.value); }}
            className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110 shrink-0"
            style={{
              background: c.value,
              borderColor: tool === "pen" && penColor === c.value ? "var(--text-dark)" : "rgba(0,0,0,0.12)",
              transform: tool === "pen" && penColor === c.value ? "scale(1.2)" : undefined,
            }}
            title={c.label}
          />
        ))}
        <div className="w-px h-5 mx-0.5 shrink-0" style={{ background: "rgba(0,0,0,0.12)" }} />
        <button
          onClick={() => setTool("eraser")}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all shrink-0"
          style={{
            background: tool === "eraser" ? "rgba(181,164,212,0.3)" : "rgba(0,0,0,0.05)",
            color: "var(--text-mid)",
            border: `1.5px solid ${tool === "eraser" ? "var(--lavender)" : "transparent"}`,
          }}
        >
          <Eraser size={12} /> Erase
        </button>
        <button
          onClick={clear}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ml-auto transition-all shrink-0"
          style={{ background: "rgba(0,0,0,0.05)", color: "var(--text-soft)" }}
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      <div
        className="w-full rounded-xl overflow-hidden"
        style={{ border: "1.5px solid rgba(0,0,0,0.1)", background: "#fff", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.04)" }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", touchAction: "none", cursor: tool === "eraser" ? "cell" : "crosshair" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      <p className="text-xs text-center" style={{ color: "var(--text-soft)" }}>
        ✏️ Apple Pencil &amp; touch · pressure sensitive
      </p>
    </div>
  );
}
