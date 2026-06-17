"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Star } from "lucide-react";

type Book = { id: number; title: string; author: string | null; genre: string; status: string; rating: number | null; notes: string | null; cover_emoji: string };
type Course = { id: number; title: string; platform: string | null; category: string; progress_pct: number; status: string; link: string | null; emoji: string; notes: string | null };

const BOOK_STATUSES = ["want", "reading", "read"] as const;
const BOOK_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  want: { label: "Want to read", color: "#9b8c8c", bg: "rgba(155,140,140,0.12)" },
  reading: { label: "Reading", color: "#d4a853", bg: "rgba(212,168,83,0.15)" },
  read: { label: "Read", color: "#8fada0", bg: "rgba(143,173,160,0.2)" },
};

const COURSE_CATS = ["Skill", "Language", "Fitness", "Creative", "Business", "Tech", "Other"];

export default function LearningPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"books" | "courses">("books");
  const [bookFilter, setBookFilter] = useState<"all" | "want" | "reading" | "read">("all");
  const [showBookForm, setShowBookForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);

  const [bTitle, setBTitle] = useState("");
  const [bAuthor, setBAuthor] = useState("");
  const [bGenre, setBGenre] = useState("Non-fiction");
  const [bEmoji, setBEmoji] = useState("📖");
  const [bNotes, setBNotes] = useState("");

  const [cTitle, setCTitle] = useState("");
  const [cPlatform, setCPlatform] = useState("");
  const [cCat, setCCat] = useState("Skill");
  const [cLink, setCLink] = useState("");
  const [cEmoji, setCEmoji] = useState("🎓");
  const [cNotes, setCNotes] = useState("");

  const [editBookId, setEditBookId] = useState<number | null>(null);
  const [editCourseId, setEditCourseId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/learning", { cache: "no-store" });
      const data = await res.json();
      setBooks(data.books || []);
      setCourses(data.courses || []);
      setStats(data.stats || {});
    } catch {/* */}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/learning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const addBook = async () => {
    if (!bTitle) return;
    await post({ action: "add-book", title: bTitle, author: bAuthor || null, genre: bGenre, coverEmoji: bEmoji, notes: bNotes || null });
    setBTitle(""); setBAuthor(""); setBGenre("Non-fiction"); setBEmoji("📖"); setBNotes("");
    setShowBookForm(false); fetchData();
  };

  const updateBookStatus = async (id: number, status: string, rating?: number) => {
    await post({ action: "update-book", id, status, rating: rating ?? null });
    setEditBookId(null); fetchData();
  };

  const addCourse = async () => {
    if (!cTitle) return;
    await post({ action: "add-course", title: cTitle, platform: cPlatform || null, category: cCat, link: cLink || null, emoji: cEmoji, notes: cNotes || null });
    setCTitle(""); setCPlatform(""); setCCat("Skill"); setCLink(""); setCEmoji("🎓"); setCNotes("");
    setShowCourseForm(false); fetchData();
  };

  const updateCourseProgress = async (id: number, progress: number) => {
    await post({ action: "update-course", id, progress });
    setEditCourseId(null); fetchData();
  };

  const filteredBooks = books.filter(b => bookFilter === "all" ? true : b.status === bookFilter);

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(222,238,232,0.85) 0%, rgba(237,232,245,0.75) 60%, rgba(212,168,83,0.2) 100%)",
      }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Books & Courses</p>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>Learning 📚</h1>
          </div>
          <span className="text-4xl float select-none">🎓</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-5">
          {[
            { label: "read", value: stats.booksRead || 0, color: "var(--sage)" },
            { label: "reading", value: stats.booksReading || 0, color: "var(--gold)" },
            { label: "want", value: stats.booksWant || 0, color: "var(--lavender)" },
            { label: "courses", value: (stats.coursesCompleted || 0) + (stats.coursesActive || 0), color: "var(--rose)" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl px-2 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.65)" }}>
              <div className="font-display font-bold italic text-2xl leading-none" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["books", "courses"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-full text-sm font-medium capitalize transition-all"
            style={{ background: tab === t ? "var(--sage)" : "var(--sage-pale)", color: tab === t ? "white" : "var(--text-mid)" }}>
            {t === "books" ? "📖 Books" : "🎓 Courses"}
          </button>
        ))}
      </div>

      {/* Books tab */}
      {tab === "books" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(["all", ...BOOK_STATUSES] as const).map(s => (
                <button key={s} onClick={() => setBookFilter(s as typeof bookFilter)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
                  style={{
                    background: bookFilter === s ? (s !== "all" ? BOOK_STATUS_META[s]?.bg || "var(--cream-dark)" : "var(--cream-dark)") : "var(--cream-dark)",
                    color: bookFilter === s ? "var(--text-dark)" : "var(--text-soft)",
                    border: bookFilter === s ? "1.5px solid rgba(143,173,160,0.4)" : "1.5px solid transparent",
                  }}>
                  {s === "all" ? "All" : BOOK_STATUS_META[s]?.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowBookForm(!showBookForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Book
            </button>
          </div>

          {showBookForm && (
            <div className="card px-5 py-4 space-y-3">
              <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>Add book</h3>
              <div className="flex gap-2">
                <input value={bEmoji} onChange={e => setBEmoji(e.target.value)} className="input-fairy w-16 text-center text-xl" placeholder="📖" />
                <input value={bTitle} onChange={e => setBTitle(e.target.value)} className="input-fairy flex-1" placeholder="Book title" />
              </div>
              <div className="flex gap-2">
                <input value={bAuthor} onChange={e => setBAuthor(e.target.value)} className="input-fairy flex-1" placeholder="Author" />
                <input value={bGenre} onChange={e => setBGenre(e.target.value)} className="input-fairy flex-1" placeholder="Genre" />
              </div>
              <textarea value={bNotes} onChange={e => setBNotes(e.target.value)} className="input-fairy w-full text-sm" rows={2} placeholder="Notes (optional)" style={{ resize: "none" }} />
              <div className="flex gap-2">
                <button onClick={addBook} className="btn-primary text-sm">Add book</button>
                <button onClick={() => setShowBookForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
          ) : filteredBooks.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-3xl mb-2">📚</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No books yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Track your reading journey</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBooks.map(book => {
                const meta = BOOK_STATUS_META[book.status];
                const isEditing = editBookId === book.id;
                return (
                  <div key={book.id} className="card px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{book.cover_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold" style={{ color: "var(--text-dark)" }}>{book.title}</p>
                        <p className="text-xs" style={{ color: "var(--text-soft)" }}>{book.author || "Unknown"} · {book.genre}</p>
                        {book.notes && <p className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>{book.notes}</p>}
                        {book.rating && (
                          <div className="flex gap-0.5 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={12} fill={i < book.rating! ? "var(--gold)" : "transparent"} stroke="var(--gold)" />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                        <button onClick={() => setEditBookId(isEditing ? null : book.id)} className="text-xs font-semibold" style={{ color: "var(--sage)" }}>
                          {isEditing ? "✕" : "Edit"}
                        </button>
                        <button onClick={() => post({ action: "delete-book", id: book.id }).then(() => fetchData())} className="opacity-40 hover:opacity-80">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {isEditing && (
                      <div className="mt-3 pl-11 flex flex-wrap gap-2">
                        {BOOK_STATUSES.map(s => (
                          <button key={s} onClick={() => updateBookStatus(book.id, s)}
                            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                            style={{ background: book.status === s ? BOOK_STATUS_META[s].bg : "var(--cream-dark)", color: "var(--text-dark)", border: `1.5px solid ${book.status === s ? "rgba(143,173,160,0.5)" : "transparent"}` }}>
                            {BOOK_STATUS_META[s].label}
                          </button>
                        ))}
                        {book.status === "read" && (
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(r => (
                              <button key={r} onClick={() => updateBookStatus(book.id, "read", r)}>
                                <Star size={16} fill={book.rating && r <= book.rating ? "var(--gold)" : "transparent"} stroke="var(--gold)" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Courses tab */}
      {tab === "courses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Courses & Skills</h2>
            <button onClick={() => setShowCourseForm(!showCourseForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Course
            </button>
          </div>

          {showCourseForm && (
            <div className="card px-5 py-4 space-y-3">
              <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>Add course</h3>
              <div className="flex gap-2">
                <input value={cEmoji} onChange={e => setCEmoji(e.target.value)} className="input-fairy w-16 text-center text-xl" placeholder="🎓" />
                <input value={cTitle} onChange={e => setCTitle(e.target.value)} className="input-fairy flex-1" placeholder="Course / skill title" />
              </div>
              <div className="flex gap-2">
                <input value={cPlatform} onChange={e => setCPlatform(e.target.value)} className="input-fairy flex-1" placeholder="Platform (e.g. Udemy)" />
                <select value={cCat} onChange={e => setCCat(e.target.value)} className="input-fairy flex-1">
                  {COURSE_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <input value={cLink} onChange={e => setCLink(e.target.value)} className="input-fairy w-full" placeholder="Link (optional)" />
              <textarea value={cNotes} onChange={e => setCNotes(e.target.value)} className="input-fairy w-full text-sm" rows={2} placeholder="Notes" style={{ resize: "none" }} />
              <div className="flex gap-2">
                <button onClick={addCourse} className="btn-primary text-sm">Add course</button>
                <button onClick={() => setShowCourseForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              </div>
            </div>
          )}

          {courses.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-3xl mb-2">🎓</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No courses tracked</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Add courses, skills, and things you&apos;re learning</p>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map(course => {
                const pct = course.progress_pct || 0;
                const isEditing = editCourseId === course.id;
                return (
                  <div key={course.id} className="card px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{course.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold" style={{ color: "var(--text-dark)" }}>{course.title}</p>
                        <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                          {course.platform || course.category} · {course.category}
                          {course.status === "completed" && " ✓ Complete"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 progress-track" style={{ height: "6px" }}>
                            <div className="progress-fill" style={{ width: `${pct}%`, transition: "width 0.4s ease" }} />
                          </div>
                          <span className="text-xs font-bold shrink-0" style={{ color: "var(--sage)" }}>{pct}%</span>
                        </div>
                        {isEditing && (
                          <input type="range" min={0} max={100} value={pct}
                            onChange={e => setCourses(prev => prev.map(c => c.id === course.id ? { ...c, progress_pct: parseInt(e.target.value) } : c))}
                            onMouseUp={() => updateCourseProgress(course.id, pct)}
                            onTouchEnd={() => updateCourseProgress(course.id, pct)}
                            className="w-full mt-1" style={{ accentColor: "var(--sage)" }}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setEditCourseId(isEditing ? null : course.id)} className="text-xs font-semibold" style={{ color: "var(--sage)" }}>
                          {isEditing ? "Done" : "Update"}
                        </button>
                        <button onClick={() => post({ action: "delete-course", id: course.id }).then(() => fetchData())} className="opacity-40 hover:opacity-80">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
