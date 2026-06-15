"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Pin, ExternalLink } from "lucide-react";

type Entry = { id: number; type: string; title: string; artist: string | null; mood: string; notes: string | null; log_date: string | null; is_pinned: boolean };
type Playlist = { id: number; name: string; mood: string; emoji: string; link: string | null; notes: string | null };

const MOODS = ["Vibing", "Main character", "Sad girl era", "Hyped", "Chill", "Romantic", "Powerful", "Nostalgic"];
const MOOD_COLORS: Record<string, string> = {
  "Vibing": "#b8d4c8",
  "Main character": "#d4a853",
  "Sad girl era": "#c8b8e0",
  "Hyped": "#e8b4b8",
  "Chill": "#deeee8",
  "Romantic": "#f5d5d8",
  "Powerful": "#8fada0",
  "Nostalgic": "#f0d080",
};

const dateStr = (d: string | null) => {
  if (!d) return "";
  try { return format(parseISO(String(d).split("T")[0]), "d MMM"); }
  catch { return ""; }
};

export default function MusicPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"diary" | "playlists">("diary");
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showPlaylistForm, setShowPlaylistForm] = useState(false);

  const [eType, setEType] = useState("song");
  const [eTitle, setETitle] = useState("");
  const [eArtist, setEArtist] = useState("");
  const [eMood, setEMood] = useState("Vibing");
  const [eNotes, setENotes] = useState("");
  const [eDate, setEDate] = useState("");

  const [pName, setPName] = useState("");
  const [pMood, setPMood] = useState("Vibing");
  const [pEmoji, setPEmoji] = useState("🎵");
  const [pLink, setPLink] = useState("");
  const [pNotes, setPNotes] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/music");
      const data = await res.json();
      setEntries(data.entries || []);
      setPlaylists(data.playlists || []);
    } catch {/* */}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/music", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const addEntry = async () => {
    if (!eTitle) return;
    await post({ action: "add-entry", type: eType, title: eTitle, artist: eArtist || null, mood: eMood, notes: eNotes || null, logDate: eDate || null });
    setETitle(""); setEArtist(""); setENotes(""); setEDate(""); setEMood("Vibing"); setEType("song");
    setShowEntryForm(false); fetchData();
  };

  const addPlaylist = async () => {
    if (!pName) return;
    await post({ action: "add-playlist", name: pName, mood: pMood, emoji: pEmoji, link: pLink || null, notes: pNotes || null });
    setPName(""); setPMood("Vibing"); setPEmoji("🎵"); setPLink(""); setPNotes("");
    setShowPlaylistForm(false); fetchData();
  };

  const pinned = entries.filter(e => e.is_pinned);
  const recent = entries.filter(e => !e.is_pinned);

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(200,184,224,0.5) 0%, rgba(245,213,216,0.6) 50%, rgba(240,208,128,0.3) 100%)",
      }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Sound Diary</p>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>Music 🎵</h1>
          </div>
          <span className="text-4xl float select-none">🎧</span>
        </div>
        {/* Mood pills */}
        <div className="flex gap-2 mt-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {MOODS.map(m => (
            <div key={m} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: `${MOOD_COLORS[m]}40`, color: "var(--text-dark)", border: `1.5px solid ${MOOD_COLORS[m]}80` }}>
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["diary", "playlists"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-full text-sm font-medium capitalize transition-all"
            style={{ background: tab === t ? "var(--lavender)" : "var(--lavender-pale)", color: tab === t ? "white" : "var(--text-mid)" }}>
            {t === "diary" ? "🎵 Sound Diary" : "📻 Playlists"}
          </button>
        ))}
      </div>

      {/* Diary */}
      {tab === "diary" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Songs & Artists</h2>
            <button onClick={() => setShowEntryForm(!showEntryForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Add
            </button>
          </div>

          {showEntryForm && (
            <div className="card px-5 py-4 space-y-3">
              <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>What are you listening to?</h3>
              <div className="flex gap-2">
                {["song", "artist", "album", "podcast"].map(t => (
                  <button key={t} onClick={() => setEType(t)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-medium capitalize transition-all"
                    style={{ background: eType === t ? "var(--lavender)" : "var(--lavender-pale)", color: eType === t ? "white" : "var(--text-soft)" }}>
                    {t}
                  </button>
                ))}
              </div>
              <input value={eTitle} onChange={e => setETitle(e.target.value)} className="input-fairy w-full" placeholder={`${eType} title`} />
              {eType !== "podcast" && (
                <input value={eArtist} onChange={e => setEArtist(e.target.value)} className="input-fairy w-full" placeholder="Artist" />
              )}
              <div className="flex gap-2 flex-wrap">
                {MOODS.map(m => (
                  <button key={m} onClick={() => setEMood(m)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                    style={{ background: eMood === m ? `${MOOD_COLORS[m]}60` : `${MOOD_COLORS[m]}20`, color: "var(--text-dark)", border: `1.5px solid ${eMood === m ? MOOD_COLORS[m] : "transparent"}` }}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={eDate} onChange={e => setEDate(e.target.value)} type="date" className="input-fairy flex-1" placeholder="Date" />
                <input value={eNotes} onChange={e => setENotes(e.target.value)} className="input-fairy flex-1" placeholder="Notes (optional)" />
              </div>
              <div className="flex gap-2">
                <button onClick={addEntry} className="btn-primary text-sm">Log it</button>
                <button onClick={() => setShowEntryForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
          ) : entries.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-3xl mb-2">🎧</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>Empty sound diary</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Log what you&apos;re listening to and what vibe it gives you</p>
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>📌 Pinned</p>
                  {pinned.map(entry => (
                    <EntryCard key={entry.id} entry={entry}
                      onPin={() => post({ action: "toggle-pin", id: entry.id }).then(() => fetchData())}
                      onDelete={() => post({ action: "delete-entry", id: entry.id }).then(() => fetchData())} />
                  ))}
                </div>
              )}
              {recent.length > 0 && (
                <div className="space-y-2">
                  {pinned.length > 0 && <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>Recent</p>}
                  {recent.map(entry => (
                    <EntryCard key={entry.id} entry={entry}
                      onPin={() => post({ action: "toggle-pin", id: entry.id }).then(() => fetchData())}
                      onDelete={() => post({ action: "delete-entry", id: entry.id }).then(() => fetchData())} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Playlists */}
      {tab === "playlists" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Mood Playlists</h2>
            <button onClick={() => setShowPlaylistForm(!showPlaylistForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Playlist
            </button>
          </div>

          {showPlaylistForm && (
            <div className="card px-5 py-4 space-y-3">
              <div className="flex gap-2">
                <input value={pEmoji} onChange={e => setPEmoji(e.target.value)} className="input-fairy w-16 text-center text-xl" placeholder="🎵" />
                <input value={pName} onChange={e => setPName(e.target.value)} className="input-fairy flex-1" placeholder="Playlist name" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {MOODS.map(m => (
                  <button key={m} onClick={() => setPMood(m)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                    style={{ background: pMood === m ? `${MOOD_COLORS[m]}60` : `${MOOD_COLORS[m]}20`, color: "var(--text-dark)" }}>
                    {m}
                  </button>
                ))}
              </div>
              <input value={pLink} onChange={e => setPLink(e.target.value)} className="input-fairy w-full" placeholder="Spotify / Apple Music link (optional)" />
              <textarea value={pNotes} onChange={e => setPNotes(e.target.value)} className="input-fairy w-full text-sm" rows={2} placeholder="Vibe description" style={{ resize: "none" }} />
              <div className="flex gap-2">
                <button onClick={addPlaylist} className="btn-primary text-sm">Save playlist</button>
                <button onClick={() => setShowPlaylistForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              </div>
            </div>
          )}

          {playlists.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-3xl mb-2">📻</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No playlists saved</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Save your go-to playlists for every mood</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {playlists.map(pl => (
                <div key={pl.id} className="card px-4 py-4 group" style={{ borderLeft: `4px solid ${MOOD_COLORS[pl.mood] || "var(--sage)"}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{pl.emoji}</span>
                      <div>
                        <p className="font-semibold" style={{ color: "var(--text-dark)" }}>{pl.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${MOOD_COLORS[pl.mood]}30`, color: "var(--text-mid)" }}>{pl.mood}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {pl.link && <a href={pl.link} target="_blank" rel="noreferrer" className="p-1 opacity-60 hover:opacity-100"><ExternalLink size={14} /></a>}
                      <button onClick={() => post({ action: "delete-playlist", id: pl.id }).then(() => fetchData())} className="p-1 opacity-0 group-hover:opacity-40 hover:opacity-80 transition-opacity">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {pl.notes && <p className="text-xs mt-2" style={{ color: "var(--text-soft)" }}>{pl.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry, onPin, onDelete }: { entry: Entry; onPin: () => void; onDelete: () => void }) {
  const typeEmoji: Record<string, string> = { song: "🎵", artist: "🎤", album: "💿", podcast: "🎙️" };
  return (
    <div className="card px-4 py-3 flex items-center gap-3 group" style={{ borderLeft: `3px solid ${MOOD_COLORS[entry.mood] || "var(--sage)"}` }}>
      <span className="text-lg shrink-0">{typeEmoji[entry.type] || "🎵"}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: "var(--text-dark)" }}>{entry.title}</p>
        <div className="flex items-center gap-2">
          {entry.artist && <p className="text-xs truncate" style={{ color: "var(--text-soft)" }}>{entry.artist}</p>}
          <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${MOOD_COLORS[entry.mood] || "var(--sage-pale)"}30`, color: "var(--text-mid)" }}>{entry.mood}</span>
          {entry.log_date && <span className="text-xs shrink-0" style={{ color: "var(--text-soft)" }}>{dateStr(entry.log_date)}</span>}
        </div>
        {entry.notes && <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{entry.notes}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onPin} className="p-1" title={entry.is_pinned ? "Unpin" : "Pin"}>
          <Pin size={13} fill={entry.is_pinned ? "var(--lavender)" : "transparent"} stroke={entry.is_pinned ? "var(--lavender)" : "var(--text-soft)"} />
        </button>
        <button onClick={onDelete} className="p-1 opacity-60 hover:opacity-100">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
