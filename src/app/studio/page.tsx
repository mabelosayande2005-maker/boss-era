"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Check, Upload, ChevronRight } from "lucide-react";

// ── types ──────────────────────────────────────────────────────────────────────
type Video = {
  id: string;
  account: AccountKey;
  style: string;
  title: string | null;
  post_date: string | null;
  brand_deal_deadline: string | null;
  status: "Editing" | "Ready to review" | "Ready to post" | "Posted";
  progress_find: boolean;
  progress_sort: boolean;
  progress_build: boolean;
  progress_check: boolean;
  progress_done: boolean;
  var_a_url: string | null;
  var_b_url: string | null;
  thumb_a_url: string | null;
  thumb_b_url: string | null;
  notes: string | null;
};

type VideoRequest = {
  id: string;
  video_id: string;
  type: "change" | "variation" | "capcut" | "approve";
  message: string | null;
  status: "pending" | "done";
  created_at: string;
};

type AccountKey = "BossEra" | "Studyglowbiz" | "Thatgirlmabel";

// ── config ─────────────────────────────────────────────────────────────────────
const ACCOUNTS: Record<AccountKey, {
  styles: string[];
  color: string;
  colorHex: string;
  bg: string;
  borderColor: string;
  tag: string;
  emoji: string;
}> = {
  BossEra: {
    styles: ["Social Anxiety Isn't Real", "Talking to Camera Videos", "Vlogs"],
    color: "var(--gold)",
    colorHex: "#d4a853",
    bg: "#fdf8ec",
    borderColor: "rgba(212,168,83,0.4)",
    tag: "tag-gold",
    emoji: "👑",
  },
  Studyglowbiz: {
    styles: ["Flashcard and Tutoring Promos", "Study Tips"],
    color: "var(--lavender)",
    colorHex: "#c8b8e0",
    bg: "var(--lavender-pale)",
    borderColor: "rgba(200,184,224,0.4)",
    tag: "tag-lavender",
    emoji: "✨",
  },
  Thatgirlmabel: {
    styles: ["Hair Videos", "Hair showcase", "Talking to Camera Videos", "TikTok Shop", "TikTok Shop showcase"],
    color: "var(--rose)",
    colorHex: "#e8b4b8",
    bg: "var(--rose-pale)",
    borderColor: "rgba(232,180,184,0.4)",
    tag: "tag-rose",
    emoji: "🎀",
  },
};

const STATUS_META: Record<string, { bg: string; color: string; dot: string }> = {
  "Editing":          { bg: "#fdf8ec",              color: "#d4a853",        dot: "●" },
  "Ready to review":  { bg: "var(--rose-pale)",      color: "#b06070",        dot: "◆" },
  "Ready to post":    { bg: "var(--lavender-pale)",  color: "#7060a0",        dot: "★" },
  "Posted":           { bg: "var(--sage-pale)",      color: "var(--sage)",    dot: "✓" },
};

const STEPS: { key: keyof Video; label: string }[] = [
  { key: "progress_find",  label: "Find"  },
  { key: "progress_sort",  label: "Sort"  },
  { key: "progress_build", label: "Build" },
  { key: "progress_check", label: "Check" },
  { key: "progress_done",  label: "Done"  },
];

function formatDate(d: string | null) {
  if (!d) return null;
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function makeId(account: string, style: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `${account.toLowerCase()}_${style.toLowerCase().replace(/[^a-z0-9]+/g, "")}_${date}`;
}

// ── toast ──────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    clearTimeout(t.current);
    t.current = setTimeout(() => setShow(false), 3000);
  }, []);
  return { msg, show, toast };
}

// ── progress dots row ──────────────────────────────────────────────────────────
function ProgressDots({ video, onClick }: { video: Video; onClick?: (key: keyof Video) => void }) {
  return (
    <div className="flex items-center gap-0.5 mt-2.5">
      {STEPS.map((step, i) => {
        const done = video[step.key] as boolean;
        return (
          <div key={step.key} className="flex items-center gap-0.5">
            {i > 0 && (
              <div
                className="h-px w-3 flex-shrink-0 rounded"
                style={{ background: done ? "var(--rose-light)" : "var(--cream-dark)" }}
              />
            )}
            <button
              title={step.label}
              onClick={() => onClick?.(step.key)}
              className="flex flex-col items-center gap-0.5 group"
              style={{ cursor: onClick ? "pointer" : "default" }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                style={
                  done
                    ? { background: "var(--rose)", borderColor: "var(--rose)" }
                    : { background: "white", borderColor: "var(--cream-dark)" }
                }
              >
                {done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-[8px] leading-none" style={{ color: "var(--text-soft)" }}>
                {step.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── video sidebar card ─────────────────────────────────────────────────────────
function VideoCard({
  video,
  isActive,
  onSelect,
}: {
  video: Video;
  isActive: boolean;
  onSelect: () => void;
}) {
  const acc = ACCOUNTS[video.account];
  const st  = STATUS_META[video.status] ?? STATUS_META["Editing"];
  const doneCount = STEPS.filter(s => video[s.key] as boolean).length;
  const pct = Math.round((doneCount / STEPS.length) * 100);

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-2xl border p-3 mb-2 transition-all"
      style={{
        background: isActive ? acc.bg : "rgba(255,255,255,0.7)",
        borderColor: isActive ? acc.colorHex : "rgba(200,184,224,0.3)",
        boxShadow: isActive ? `0 2px 12px ${acc.colorHex}20` : "none",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-dark)" }}>
          {video.style}
        </p>
        <span
          className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: st.bg, color: st.color }}
        >
          {st.dot} {video.status}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-1">
        {video.post_date && (
          <span className="text-[11px]" style={{ color: "var(--text-soft)" }}>
            📅 {formatDate(video.post_date)}
          </span>
        )}
        {video.brand_deal_deadline && (
          <span className="text-[11px] font-medium" style={{ color: "#b06070" }}>
            ⚡ Deal: {formatDate(video.brand_deal_deadline)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--cream-dark)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: acc.colorHex }}
          />
        </div>
        <span className="text-[10px] font-medium flex-shrink-0" style={{ color: "var(--text-soft)" }}>
          {doneCount}/{STEPS.length}
        </span>
      </div>

      <ProgressDots video={video} />
    </button>
  );
}

// ── player placeholder ─────────────────────────────────────────────────────────
function PlayerBox({ url, label }: { url: string | null; label: string }) {
  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{ background: "#1a0f0f", border: "1px solid rgba(200,184,224,0.2)" }}
    >
      <div
        className="absolute top-2.5 left-2.5 z-10 text-[10px] font-bold px-2 py-1 rounded-full"
        style={{ background: "rgba(0,0,0,0.55)", color: "white", backdropFilter: "blur(4px)", letterSpacing: "1px" }}
      >
        {label}
      </div>
      {url ? (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="w-full block"
          style={{ aspectRatio: "9/16", objectFit: "contain", maxHeight: "400px" }}
        />
      ) : (
        <div
          className="w-full flex flex-col items-center justify-center"
          style={{ aspectRatio: "9/16", maxHeight: "400px" }}
        >
          <span className="text-3xl mb-2 opacity-30">🎬</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>No preview yet</span>
        </div>
      )}
    </div>
  );
}

// ── thumbnail ──────────────────────────────────────────────────────────────────
function ThumbBox({ url, label }: { url: string | null; label: string }) {
  if (!url) return null;
  return (
    <div className="relative flex-shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={label}
        className="rounded-xl object-cover"
        style={{ width: "72px", height: "128px", border: "2px solid rgba(200,184,224,0.4)" }}
      />
      <span
        className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
      >
        {label}
      </span>
    </div>
  );
}

// ── add video form ─────────────────────────────────────────────────────────────
function AddVideoForm({
  account,
  onSave,
  onClose,
}: {
  account: AccountKey;
  onSave: (v: Video) => void;
  onClose: () => void;
}) {
  const acc = ACCOUNTS[account];
  const [style, setStyle]     = useState(acc.styles[0]);
  const [postDate, setPostDate] = useState("");
  const [dealDate, setDealDate] = useState("");
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    const id = makeId(account, style);
    const res = await fetch("/api/studio/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        id,
        account,
        style,
        post_date: postDate || null,
        brand_deal_deadline: dealDate || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.video) {
      onSave(data.video as Video);
      onClose();
    }
  };

  return (
    <div
      className="card p-4 mb-4"
      style={{ border: `1.5px solid ${acc.borderColor}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold italic text-base" style={{ color: "var(--text-dark)" }}>
          {acc.emoji} New {account} video
        </h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}
        >
          <X size={13} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>Style</label>
          <div className="flex gap-1.5 flex-wrap">
            {acc.styles.map(s => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: style === s ? acc.bg : "rgba(250,246,240,0.8)",
                  color: style === s ? acc.colorHex : "var(--text-soft)",
                  border: `1.5px solid ${style === s ? acc.colorHex + "60" : "rgba(200,184,224,0.25)"}`,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>
              Post date
            </label>
            <input
              type="date"
              className="input-fairy text-sm"
              value={postDate}
              onChange={e => setPostDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>
              Brand deal deadline
            </label>
            <input
              type="date"
              className="input-fairy text-sm"
              value={dealDate}
              onChange={e => setDealDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <button
        className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
        onClick={save}
        disabled={saving}
        style={{
          background: saving ? "var(--cream-dark)" : acc.colorHex,
          color: "white",
          border: "none",
        }}
      >
        <Check size={14} />
        {saving ? "Saving…" : "Add video ✦"}
      </button>
    </div>
  );
}

// ── upload button ──────────────────────────────────────────────────────────────
function UploadButton({
  videoId,
  slot,
  label,
  onDone,
}: {
  videoId: string;
  slot: "varA" | "varB" | "thumbA" | "thumbB";
  label: string;
  onDone: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10 MB");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch("/api/studio/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.url) {
      // Save the URL to the video record
      await fetch("/api/studio/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_urls",
          id: videoId,
          [`${slot === "varA" ? "var_a_url" : slot === "varB" ? "var_b_url" : slot === "thumbA" ? "thumb_a_url" : "thumb_b_url"}`]: data.url,
        }),
      });
      onDone(data.url);
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept="video/*,image/*" className="hidden" onChange={handleFile} />
      <button
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
        style={{
          background: "rgba(255,255,255,0.8)",
          color: "var(--text-soft)",
          border: "1.5px dashed rgba(200,184,224,0.5)",
        }}
      >
        <Upload size={11} />
        {uploading ? "Uploading…" : label}
      </button>
    </>
  );
}

// ── video detail panel ─────────────────────────────────────────────────────────
function VideoDetail({
  video,
  requests,
  onProgressToggle,
  onRequest,
  onUpload,
  onStatusChange,
}: {
  video: Video;
  requests: VideoRequest[];
  onProgressToggle: (key: keyof Video) => void;
  onRequest: (type: VideoRequest["type"], message?: string) => void;
  onUpload: (slot: "varA" | "varB" | "thumbA" | "thumbB", url: string) => void;
  onStatusChange: (status: Video["status"]) => void;
}) {
  const acc = ACCOUNTS[video.account];
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeText, setChangeText] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const pendingReqs = requests.filter(r => r.status === "pending");

  const sendRequest = async (type: VideoRequest["type"], message?: string) => {
    setSending(type);
    await onRequest(type, message);
    setSending(null);
  };

  const submitChange = async () => {
    if (!changeText.trim()) return;
    await sendRequest("change", changeText.trim());
    setChangeText("");
    setChangeOpen(false);
  };

  const handleApprove = async () => {
    await sendRequest("approve");
    onStatusChange("Ready to post");
  };

  const handleMarkPosted = async () => {
    setSending("mark_posted");
    onStatusChange("Posted");
    setSending(null);
  };

  return (
    <div>
      {/* Heading */}
      <div
        className="flex items-start justify-between mb-4 pb-3"
        style={{ borderBottom: `1px solid ${acc.borderColor}` }}
      >
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: acc.colorHex }}>
            {acc.emoji} {video.account}
          </p>
          <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
            {video.style}
          </h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {video.post_date && (
              <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                📅 Post: {formatDate(video.post_date)}
              </span>
            )}
            {video.brand_deal_deadline && (
              <span className="text-xs font-medium" style={{ color: "#b06070" }}>
                ⚡ Deal deadline: {formatDate(video.brand_deal_deadline)}
              </span>
            )}
          </div>
        </div>

        {/* Status picker */}
        <div className="flex gap-1.5">
          {(["Editing", "Ready to review", "Ready to post", "Posted"] as Video["status"][]).map(s => {
            const m = STATUS_META[s];
            return (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className="text-[10px] font-bold px-2 py-1 rounded-full transition-all"
                style={{
                  background: video.status === s ? m.bg : "transparent",
                  color: video.status === s ? m.color : "var(--text-soft)",
                  border: `1.5px solid ${video.status === s ? m.color + "40" : "rgba(200,184,224,0.2)"}`,
                }}
              >
                {m.dot} {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* A/B Players */}
      <h3 className="font-display font-bold italic text-base mb-3" style={{ color: "var(--text-dark)" }}>
        Previews
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <PlayerBox url={video.var_a_url} label="VAR A" />
        <PlayerBox url={video.var_b_url} label="VAR B" />
      </div>

      {/* Upload buttons */}
      <div className="flex gap-2 flex-wrap mb-5">
        {!video.var_a_url && (
          <UploadButton videoId={video.id} slot="varA" label="Upload Var A" onDone={url => onUpload("varA", url)} />
        )}
        {!video.var_b_url && (
          <UploadButton videoId={video.id} slot="varB" label="Upload Var B" onDone={url => onUpload("varB", url)} />
        )}
        {video.var_a_url && (
          <UploadButton videoId={video.id} slot="varA" label="Replace Var A" onDone={url => onUpload("varA", url)} />
        )}
        {video.var_b_url && (
          <UploadButton videoId={video.id} slot="varB" label="Replace Var B" onDone={url => onUpload("varB", url)} />
        )}
      </div>

      {/* Thumbnails */}
      {(video.thumb_a_url || video.thumb_b_url) && (
        <div className="mb-5">
          <h3 className="font-display font-bold italic text-base mb-2" style={{ color: "var(--text-dark)" }}>
            Thumbnails
          </h3>
          <div className="flex gap-3">
            <ThumbBox url={video.thumb_a_url} label="A" />
            <ThumbBox url={video.thumb_b_url} label="B" />
          </div>
        </div>
      )}

      {/* Thumbnail upload if missing */}
      {(!video.thumb_a_url || !video.thumb_b_url) && (
        <div className="flex gap-2 flex-wrap mb-5">
          {!video.thumb_a_url && (
            <UploadButton videoId={video.id} slot="thumbA" label="Upload thumbnail A" onDone={url => onUpload("thumbA", url)} />
          )}
          {!video.thumb_b_url && (
            <UploadButton videoId={video.id} slot="thumbB" label="Upload thumbnail B" onDone={url => onUpload("thumbB", url)} />
          )}
        </div>
      )}

      {/* Progress checklist */}
      <h3 className="font-display font-bold italic text-base mb-3" style={{ color: "var(--text-dark)" }}>
        Progress checklist
      </h3>
      <div
        className="card p-4 mb-5"
        style={{ background: "rgba(255,255,255,0.8)" }}
      >
        <div className="space-y-2">
          {STEPS.map(step => {
            const done = video[step.key] as boolean;
            return (
              <button
                key={step.key}
                onClick={() => onProgressToggle(step.key)}
                className="w-full flex items-center gap-3 text-left transition-all group"
              >
                <div
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={
                    done
                      ? { background: acc.colorHex, borderColor: acc.colorHex }
                      : { background: "white", borderColor: "var(--cream-dark)" }
                  }
                >
                  {done && <Check size={11} color="white" strokeWidth={3} />}
                </div>
                <span
                  className="text-sm font-medium"
                  style={{
                    color: done ? "var(--text-soft)" : "var(--text-dark)",
                    textDecoration: done ? "line-through" : "none",
                  }}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor notes */}
      {video.notes && (
        <div
          className="card p-3.5 mb-5 text-sm"
          style={{
            background: "rgba(255,255,255,0.8)",
            color: "var(--text-mid)",
            border: `1px solid ${acc.borderColor}`,
          }}
        >
          <span className="font-semibold" style={{ color: "var(--text-dark)" }}>Editor notes: </span>
          {video.notes}
        </div>
      )}

      {/* Pending requests summary */}
      {pendingReqs.length > 0 && (
        <div className="mb-4">
          <h3 className="font-display font-bold italic text-sm mb-2" style={{ color: "var(--text-dark)" }}>
            Pending requests ({pendingReqs.length})
          </h3>
          <div className="space-y-1.5">
            {pendingReqs.map(r => (
              <div
                key={r.id}
                className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: "#fdf8ec", border: "1px solid rgba(212,168,83,0.3)" }}
              >
                <span className="font-bold" style={{ color: "#d4a853" }}>
                  {r.type === "change" ? "✏️" : r.type === "variation" ? "✦" : r.type === "capcut" ? "▶" : "✓"}
                </span>
                <span style={{ color: "var(--text-dark)" }}>
                  {r.message || r.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <h3 className="font-display font-bold italic text-base mb-3" style={{ color: "var(--text-dark)" }}>
        What do you want to do?
      </h3>
      <div
        className="card p-4"
        style={{ background: "rgba(255,255,255,0.9)" }}
      >
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* Change something */}
          <button
            onClick={() => setChangeOpen(o => !o)}
            className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: changeOpen ? "var(--lavender-pale)" : "var(--cream-dark)",
              color: changeOpen ? "#7060a0" : "var(--text-dark)",
              border: `1.5px solid ${changeOpen ? "rgba(200,184,224,0.5)" : "rgba(200,184,224,0.2)"}`,
            }}
          >
            ✏️ Change something
          </button>

          {/* Make a variation */}
          <button
            onClick={() => sendRequest("variation")}
            disabled={sending === "variation"}
            className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "var(--cream-dark)",
              color: "var(--text-dark)",
              border: "1.5px solid rgba(200,184,224,0.2)",
            }}
          >
            {sending === "variation" ? "Sending…" : "✦ Make a variation"}
          </button>

          {/* Open in CapCut */}
          <button
            onClick={() => sendRequest("capcut")}
            disabled={sending === "capcut"}
            className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "#1a1a1a",
              color: "white",
              border: "1.5px solid #333",
            }}
          >
            {sending === "capcut" ? "Sending…" : "▶ Open in CapCut"}
          </button>

          {/* Looks good, finish it → Ready to post */}
          <button
            onClick={handleApprove}
            disabled={sending === "approve"}
            className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #b8a0d0, #c8b8e0)",
              color: "white",
              border: "none",
            }}
          >
            {sending === "approve" ? "Sending…" : "★ Looks good, finish it"}
          </button>
        </div>

        {/* Mark as posted — only show when Ready to post */}
        {video.status === "Ready to post" && (
          <button
            onClick={handleMarkPosted}
            disabled={sending === "mark_posted"}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all mt-2"
            style={{
              background: "linear-gradient(135deg, var(--sage-light), var(--sage))",
              color: "white",
              border: "none",
            }}
          >
            {sending === "mark_posted" ? "Saving…" : "✓ Mark as posted"}
          </button>
        )}

        {/* Change textarea */}
        {changeOpen && (
          <div className="space-y-2">
            <textarea
              className="input-fairy resize-none text-sm"
              rows={3}
              placeholder="Describe what you'd like changed — e.g. 'make the hook shorter' or 'use a different caption style'…"
              value={changeText}
              onChange={e => setChangeText(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setChangeOpen(false); setChangeText(""); }}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{ color: "var(--text-soft)" }}
              >
                Cancel
              </button>
              <button
                onClick={submitChange}
                disabled={!changeText.trim() || sending === "change"}
                className="btn-primary text-xs"
              >
                {sending === "change" ? "Sending…" : "Send request →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function StudioPage() {
  const [account, setAccount]       = useState<AccountKey>("Thatgirlmabel");
  const [videos, setVideos]         = useState<Video[]>([]);
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [requests, setRequests]     = useState<VideoRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const detailRef                   = useRef<HTMLDivElement>(null);
  const { msg: toastMsg, show: toastShow, toast } = useToast();

  const activeVideo = videos.find(v => v.id === activeId) ?? null;
  const accVideos   = videos.filter(v => v.account === account);

  // Fetch all videos
  const fetchVideos = useCallback(async () => {
    try {
      const res  = await fetch("/api/studio/videos", { cache: "no-store" });
      const data = await res.json();
      setVideos(data.videos ?? []);
    } catch {}
    setLoading(false);
  }, []);

  // Fetch requests for active video
  const fetchRequests = useCallback(async (videoId: string) => {
    try {
      const res  = await fetch(`/api/studio/requests?videoId=${videoId}`, { cache: "no-store" });
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);
  useEffect(() => {
    if (activeId) fetchRequests(activeId);
    else setRequests([]);
  }, [activeId, fetchRequests]);

  const selectVideo = (id: string) => {
    setActiveId(id);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  // Toggle a single progress step
  const handleProgressToggle = async (key: keyof Video) => {
    if (!activeVideo) return;
    const updated = { ...activeVideo, [key]: !activeVideo[key] };
    // Optimistic update
    setVideos(vs => vs.map(v => v.id === updated.id ? updated : v));

    await fetch("/api/studio/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "progress",
        id: updated.id,
        progress_find:  updated.progress_find,
        progress_sort:  updated.progress_sort,
        progress_build: updated.progress_build,
        progress_check: updated.progress_check,
        progress_done:  updated.progress_done,
        status: updated.status,
        notes: updated.notes,
      }),
    });
  };

  const handleStatusChange = async (status: Video["status"]) => {
    if (!activeVideo) return;
    const updated = { ...activeVideo, status };
    setVideos(vs => vs.map(v => v.id === updated.id ? updated : v));
    await fetch("/api/studio/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: updated.id, status, title: updated.title, post_date: updated.post_date, brand_deal_deadline: updated.brand_deal_deadline }),
    });
  };

  const handleRequest = async (type: VideoRequest["type"], message?: string) => {
    if (!activeVideo) return;
    const labels: Record<string, string> = {
      change:    "Request sent to your editor ✦",
      variation: "Making a new variation — check back soon!",
      capcut:    "Sending to CapCut…",
      approve:   "Marked as done — moving to Finished ✓",
    };
    const res = await fetch("/api/studio/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", videoId: activeVideo.id, type, message }),
    });
    const data = await res.json();
    if (data.request) setRequests(rs => [data.request, ...rs]);
    toast(labels[type] ?? "Request sent!");
  };

  const handleUpload = (slot: "varA" | "varB" | "thumbA" | "thumbB", url: string) => {
    if (!activeVideo) return;
    const field = slot === "varA" ? "var_a_url" : slot === "varB" ? "var_b_url" : slot === "thumbA" ? "thumb_a_url" : "thumb_b_url";
    setVideos(vs => vs.map(v => v.id === activeVideo.id ? { ...v, [field]: url } : v));
    toast("Preview uploaded ✦");
  };

  const handleAddVideo = (v: Video) => {
    setVideos(vs => [v, ...vs]);
    setActiveId(v.id);
    toast("Video added ✦");
  };

  const acc = ACCOUNTS[account];

  return (
    <div className="space-y-4 py-2">

      {/* Hero */}
      <div
        className="card px-6 py-5"
        style={{
          background: "linear-gradient(135deg, rgba(212,168,83,0.2) 0%, rgba(200,184,224,0.2) 50%, rgba(232,180,184,0.2) 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>
              Content Studio
            </div>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>
              🎬 Edit Room ✦
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
              {videos.length} video{videos.length !== 1 ? "s" : ""} across 3 accounts
            </p>
          </div>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="btn-primary flex items-center gap-1.5"
            style={showAdd ? { background: "var(--cream-dark)", color: "var(--text-dark)", border: "none" } : {}}
          >
            {showAdd ? <X size={14} /> : <Plus size={14} />}
            {showAdd ? "Cancel" : "Add video"}
          </button>
        </div>
      </div>

      {/* Account tabs */}
      <div
        className="flex gap-0 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.7)",
          border: "1px solid rgba(200,184,224,0.3)",
        }}
      >
        {(Object.keys(ACCOUNTS) as AccountKey[]).map(key => {
          const a = ACCOUNTS[key];
          const count = videos.filter(v => v.account === key).length;
          const isActive = account === key;
          return (
            <button
              key={key}
              onClick={() => { setAccount(key); setActiveId(null); setShowAdd(false); }}
              className="flex-1 flex flex-col items-center gap-0.5 px-3 py-3 text-sm font-semibold transition-all"
              style={{
                background: isActive ? a.bg : "transparent",
                color: isActive ? a.colorHex : "var(--text-soft)",
                borderRight: key !== "Thatgirlmabel" ? "1px solid rgba(200,184,224,0.3)" : "none",
              }}
            >
              <span className="text-base">{a.emoji}</span>
              <span className="text-xs hidden sm:block">{key}</span>
              {count > 0 && (
                <span
                  className="text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: isActive ? a.colorHex : "var(--cream-dark)", color: isActive ? "white" : "var(--text-soft)" }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {showAdd && (
        <AddVideoForm
          account={account}
          onSave={handleAddVideo}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Main layout: sidebar + detail */}
      <div className="flex flex-col md:flex-row gap-4 items-start">

        {/* Sidebar */}
        <aside className="w-full md:w-72 flex-shrink-0 md:sticky md:top-20">
          <div
            className="card p-3"
            style={{ background: "rgba(255,255,255,0.85)" }}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <h2
                className="font-display font-bold italic text-sm"
                style={{ color: acc.colorHex }}
              >
                {acc.emoji} {account}
              </h2>
              <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                {accVideos.length} video{accVideos.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />
                ))}
              </div>
            ) : accVideos.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2 opacity-30">{acc.emoji}</div>
                <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                  No videos yet for {account}.
                  <br />
                  Tap &ldquo;Add video&rdquo; above.
                </p>
              </div>
            ) : (
              acc.styles.map(style => {
                const styleVideos = accVideos.filter(v => v.style === style);
                if (styleVideos.length === 0) return null;
                return (
                  <div key={style} className="mb-3">
                    <div
                      className="text-[9px] font-bold uppercase tracking-widest px-1 mb-1"
                      style={{ color: "var(--text-soft)" }}
                    >
                      {style}
                    </div>
                    {styleVideos.map(v => (
                      <VideoCard
                        key={v.id}
                        video={v}
                        isActive={activeId === v.id}
                        onSelect={() => selectVideo(v.id)}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Detail panel */}
        <div className="flex-1 min-w-0" ref={detailRef}>
          {!activeVideo ? (
            <div
              className="card px-5 py-16 text-center"
              style={{ background: "rgba(255,255,255,0.7)" }}
            >
              <div className="text-4xl mb-3 opacity-30">✦</div>
              <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>
                Select a video
              </p>
              <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                Pick a video from the sidebar to review it, check off progress, and send requests to your editor.
              </p>
              {accVideos.length === 0 && (
                <button
                  className="btn-primary mt-4 flex items-center gap-1.5 mx-auto"
                  onClick={() => setShowAdd(true)}
                >
                  <Plus size={14} /> Add your first {account} video
                </button>
              )}
            </div>
          ) : (
            <div
              className="card p-4 md:p-6"
              style={{
                background: "rgba(255,255,255,0.9)",
                border: `1.5px solid ${acc.borderColor}`,
              }}
            >
              <VideoDetail
                video={activeVideo}
                requests={requests}
                onProgressToggle={handleProgressToggle}
                onRequest={handleRequest}
                onUpload={handleUpload}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <div
        className="fixed bottom-24 md:bottom-6 left-1/2 z-50 pointer-events-none transition-all duration-300"
        style={{
          transform: `translateX(-50%) translateY(${toastShow ? "0" : "80px"})`,
          opacity: toastShow ? 1 : 0,
        }}
      >
        <div
          className="px-5 py-2.5 rounded-full text-sm font-medium shadow-lg"
          style={{ background: "var(--text-dark)", color: "white" }}
        >
          {toastMsg}
        </div>
      </div>

      {/* Back to top on mobile when detail is open */}
      {activeVideo && (
        <button
          className="md:hidden fixed bottom-24 right-4 z-40 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: acc.colorHex, color: "white" }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ChevronRight size={18} style={{ transform: "rotate(-90deg)" }} />
        </button>
      )}
    </div>
  );
}
