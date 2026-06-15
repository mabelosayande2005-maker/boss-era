"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Pin, X } from "lucide-react";

type Note = { id: number; title: string; content: string | null; tags: string | null; color: string; is_pinned: boolean; created_at: string; updated_at: string };

const NOTE_COLORS = [
  { value: "#deeee8", label: "Sage" },
  { value: "#fdf0f1", label: "Rose" },
  { value: "#ede8f5", label: "Lavender" },
  { value: "#f0e8dc", label: "Cream" },
  { value: "#fdf8e8", label: "Gold" },
  { value: "#fff", label: "White" },
];

const dateStr = (d: string) => {
  try { return format(parseISO(d), "d MMM yy, HH:mm"); }
  catch { return ""; }
};

function NoteCard({ note, onPin, onDelete, onSelect }: {
  note: Note; onPin: () => void; onDelete: () => void; onSelect: () => void;
}) {
  const tags = note.tags ? note.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  return (
    <div onClick={onSelect}
      className="card px-4 py-4 cursor-pointer hover:shadow-md transition-shadow group"
      style={{ background: note.color || "#fff", borderTop: note.is_pinned ? "2.5px solid var(--lavender)" : undefined }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold" style={{ color: "var(--text-dark)" }}>{note.title}</p>
          {note.content && (
            <p className="text-sm mt-1 line-clamp-3" style={{ color: "var(--text-mid)", whiteSpace: "pre-line" }}>{note.content}</p>
          )}
          {tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(143,173,160,0.2)", color: "var(--sage)" }}>#{tag}</span>
              ))}
            </div>
          )}
          <p className="text-xs mt-2" style={{ color: "var(--text-soft)" }}>{dateStr(note.updated_at || note.created_at)}</p>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={e => { e.stopPropagation(); onPin(); }} className="p-1" title={note.is_pinned ? "Unpin" : "Pin"}>
            <Pin size={14} fill={note.is_pinned ? "var(--lavender)" : "transparent"} stroke={note.is_pinned ? "var(--lavender)" : "var(--text-soft)"} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1 opacity-60 hover:opacity-100">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [eTitle, setETitle] = useState("");
  const [eContent, setEContent] = useState("");
  const [eTags, setETags] = useState("");
  const [eColor, setEColor] = useState(NOTE_COLORS[0].value);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = tagFilter ? `/api/notes?tag=${encodeURIComponent(tagFilter)}` : "/api/notes";
      const res = await fetch(url);
      const data = await res.json();
      setNotes(data.notes || []);
      setTags(data.tags || []);
    } catch {/* */}
    setLoading(false);
  }, [tagFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const openNew = () => {
    setEditing(null); setIsNew(true);
    setETitle(""); setEContent(""); setETags(""); setEColor(NOTE_COLORS[0].value);
  };

  const openEdit = (note: Note) => {
    setEditing(note); setIsNew(false);
    setETitle(note.title); setEContent(note.content || ""); setETags(note.tags || ""); setEColor(note.color || NOTE_COLORS[0].value);
  };

  const saveNote = async () => {
    if (!eTitle.trim()) return;
    if (isNew) {
      await post({ action: "add", title: eTitle, content: eContent || null, tags: eTags || null, color: eColor });
    } else if (editing) {
      await post({ action: "update", id: editing.id, title: eTitle, content: eContent || null, tags: eTags || null, color: eColor });
    }
    setEditing(null); setIsNew(false);
    fetchData();
  };

  const pinned = notes.filter(n => n.is_pinned);
  const unpinned = notes.filter(n => !n.is_pinned);

  const isEditorOpen = isNew || editing !== null;

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(237,232,245,0.85) 0%, rgba(222,238,232,0.75) 60%, rgba(245,213,216,0.5) 100%)",
      }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Quick Notes</p>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>Notes 📝</h1>
          </div>
          <span className="text-4xl float select-none">✨</span>
        </div>
      </div>

      {/* Tag filters + New */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => setTagFilter(null)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{ background: !tagFilter ? "var(--lavender)" : "var(--lavender-pale)", color: !tagFilter ? "white" : "var(--text-mid)" }}>
            All
          </button>
          {tags.map(tag => (
            <button key={tag} onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{ background: tagFilter === tag ? "var(--sage)" : "var(--sage-pale)", color: tagFilter === tag ? "white" : "var(--text-mid)" }}>
              #{tag}
            </button>
          ))}
        </div>
        <button onClick={openNew} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1 shrink-0">
          <Plus size={14} /> Note
        </button>
      </div>

      {/* Editor */}
      {isEditorOpen && (
        <div className="card px-5 py-4 space-y-3" style={{ background: eColor }}>
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>
              {isNew ? "New note" : "Edit note"}
            </h3>
            <button onClick={() => { setEditing(null); setIsNew(false); }}>
              <X size={18} style={{ color: "var(--text-soft)" }} />
            </button>
          </div>
          <input value={eTitle} onChange={e => setETitle(e.target.value)} className="input-fairy w-full font-semibold" placeholder="Title…" style={{ background: "rgba(255,255,255,0.7)" }} />
          <textarea value={eContent} onChange={e => setEContent(e.target.value)} className="input-fairy w-full text-sm leading-relaxed" rows={8} placeholder="Write anything here…" style={{ resize: "vertical", background: "rgba(255,255,255,0.7)" }} />
          <input value={eTags} onChange={e => setETags(e.target.value)} className="input-fairy w-full text-sm" placeholder="Tags (comma separated, e.g. ideas, work, recipes)" style={{ background: "rgba(255,255,255,0.7)" }} />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {NOTE_COLORS.map(c => (
                <button key={c.value} onClick={() => setEColor(c.value)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c.value, borderColor: eColor === c.value ? "var(--text-dark)" : "rgba(0,0,0,0.15)" }}
                  title={c.label} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              <button onClick={saveNote} className="btn-primary text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Notes grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
      ) : notes.length === 0 ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-3xl mb-2">📝</p>
          <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No notes yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Capture your thoughts, ideas, and inspiration</p>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>📌 Pinned</p>
              <div className="grid md:grid-cols-2 gap-3">
                {pinned.map(note => (
                  <NoteCard key={note.id} note={note}
                    onPin={() => post({ action: "toggle-pin", id: note.id }).then(() => fetchData())}
                    onDelete={() => post({ action: "delete", id: note.id }).then(() => fetchData())}
                    onSelect={() => openEdit(note)} />
                ))}
              </div>
            </div>
          )}
          {unpinned.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>All notes</p>}
              <div className="grid md:grid-cols-2 gap-3">
                {unpinned.map(note => (
                  <NoteCard key={note.id} note={note}
                    onPin={() => post({ action: "toggle-pin", id: note.id }).then(() => fetchData())}
                    onDelete={() => post({ action: "delete", id: note.id }).then(() => fetchData())}
                    onSelect={() => openEdit(note)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
