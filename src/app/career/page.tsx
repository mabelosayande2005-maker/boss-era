"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { Plus, X, Check, Pencil, ExternalLink, Briefcase, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// ── types ──────────────────────────────────────────────────────────────────────
type Application = {
  id: number;
  role: string;
  company: string;
  category: string;
  status: "wishlist" | "applied" | "interview" | "offer" | "rejected" | "withdrawn";
  deadline: string | null;
  date_applied: string | null;
  link: string | null;
  notes: string | null;
};

type BrandCollab = {
  id: number;
  brand: string;
  platform: string;
  category: string | null;
  status: "dream" | "reached_out" | "in_talks" | "active" | "archived";
  email: string | null;
  notes: string | null;
};

type Contact = {
  id: number;
  name: string;
  role: string | null;
  company: string | null;
  how_met: string | null;
  date_met: string | null;
  follow_up_date: string | null;
  notes: string | null;
};

type Stats = {
  totalApps: number;
  activeApps: number;
  interviews: number;
  offers: number;
  dreamBrands: number;
  activeBrands: number;
};

type Tab = "applications" | "brands" | "networking";

// ── constants ──────────────────────────────────────────────────────────────────
const APP_STATUS_META = {
  wishlist:  { label: "Wishlist",  emoji: "⭐", color: "var(--gold)",      bg: "rgba(253,248,236,0.9)" },
  applied:   { label: "Applied",   emoji: "📨", color: "var(--lavender)",  bg: "var(--lavender-pale)"  },
  interview: { label: "Interview", emoji: "💬", color: "var(--sage)",      bg: "var(--sage-pale)"      },
  offer:     { label: "Offer",     emoji: "🎉", color: "#b06070",          bg: "var(--rose-pale)"      },
  rejected:  { label: "Rejected",  emoji: "🚫", color: "var(--text-soft)", bg: "rgba(240,234,228,0.8)" },
  withdrawn: { label: "Withdrawn", emoji: "↩️", color: "var(--text-soft)", bg: "rgba(240,234,228,0.8)" },
} as const;

const BRAND_STATUS_META = {
  dream:       { label: "Dream",       emoji: "✨", color: "var(--gold)",      bg: "rgba(253,248,236,0.9)" },
  reached_out: { label: "Reached Out", emoji: "📩", color: "var(--lavender)",  bg: "var(--lavender-pale)"  },
  in_talks:    { label: "In Talks",    emoji: "💬", color: "var(--sage)",      bg: "var(--sage-pale)"      },
  active:      { label: "Active",      emoji: "🌟", color: "#b06070",          bg: "var(--rose-pale)"      },
  archived:    { label: "Archived",    emoji: "📁", color: "var(--text-soft)", bg: "rgba(240,234,228,0.8)" },
} as const;

const APP_STATUS_ORDER: Application["status"][] = ["wishlist","applied","interview","offer","rejected","withdrawn"];
const APP_CATEGORIES   = ["Internship","Graduate Scheme","Part-time","Full-time","Placement Year","Other"] as const;
const PLATFORMS        = ["TikTok","Instagram","YouTube","Pinterest","Multiple","Other"] as const;
const HOW_MET_OPTIONS  = ["LinkedIn","Event / networking","Mutual connection","Cold outreach","Course / uni","Other"] as const;

// ── helpers ───────────────────────────────────────────────────────────────────
function deadlineBadge(dateStr: string | null): { label: string; urgent: boolean } | null {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    if (isPast(d) && !isToday(d)) return { label: "Passed", urgent: false };
    if (isToday(d))               return { label: "Today!", urgent: true  };
    return { label: format(d, "d MMM"), urgent: false };
  } catch { return null; }
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function CareerPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [brands,       setBrands]       = useState<BrandCollab[]>([]);
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [tab,          setTab]          = useState<Tab>("applications");
  const [loading,      setLoading]      = useState(true);

  // form visibility
  const [showAppForm,     setShowAppForm]     = useState(false);
  const [showBrandForm,   setShowBrandForm]   = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editApp,         setEditApp]         = useState<Application | null>(null);
  const [editBrand,       setEditBrand]       = useState<BrandCollab | null>(null);
  const [editContact,     setEditContact]     = useState<Contact | null>(null);

  // ── app form fields ──────────────────────────────────────────────────────────
  const [fRole,        setFRole]        = useState("");
  const [fCompany,     setFCompany]     = useState("");
  const [fCategory,    setFCategory]    = useState("Internship");
  const [fAppStatus,   setFAppStatus]   = useState<Application["status"]>("wishlist");
  const [fDeadline,    setFDeadline]    = useState("");
  const [fDateApplied, setFDateApplied] = useState("");
  const [fLink,        setFLink]        = useState("");
  const [fAppNotes,    setFAppNotes]    = useState("");

  // ── brand form fields ────────────────────────────────────────────────────────
  const [fBrand,       setFBrand]       = useState("");
  const [fPlatform,    setFPlatform]    = useState("TikTok");
  const [fBrandCat,    setFBrandCat]    = useState("");
  const [fBrandStatus, setFBrandStatus] = useState<BrandCollab["status"]>("dream");
  const [fEmail,       setFEmail]       = useState("");
  const [fBrandNotes,  setFBrandNotes]  = useState("");

  // ── contact form fields ──────────────────────────────────────────────────────
  const [fCName,    setFCName]    = useState("");
  const [fCRole,    setFCRole]    = useState("");
  const [fCCompany, setFCCompany] = useState("");
  const [fHowMet,   setFHowMet]   = useState("");
  const [fDateMet,  setFDateMet]  = useState("");
  const [fFollowUp, setFFollowUp] = useState("");
  const [fCNotes,   setFCNotes]   = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/career", { cache: "no-store" });
      const data = await res.json();
      setApplications(data.applications ?? []);
      setBrands(data.brands             ?? []);
      setContacts(data.contacts          ?? []);
      setStats(data.stats                ?? null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── app CRUD ─────────────────────────────────────────────────────────────────
  const openAddApp = () => {
    setEditApp(null);
    setFRole(""); setFCompany(""); setFCategory("Internship");
    setFAppStatus("wishlist"); setFDeadline(""); setFDateApplied(""); setFLink(""); setFAppNotes("");
    setShowAppForm(true);
  };
  const openEditApp = (a: Application) => {
    setEditApp(a);
    setFRole(a.role); setFCompany(a.company); setFCategory(a.category);
    setFAppStatus(a.status);
    setFDeadline(a.deadline?.split("T")[0] ?? "");
    setFDateApplied(a.date_applied?.split("T")[0] ?? "");
    setFLink(a.link ?? ""); setFAppNotes(a.notes ?? "");
    setShowAppForm(true);
  };
  const saveApp = async () => {
    if (!fRole.trim() || !fCompany.trim()) return;
    const res  = await fetch("/api/career", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: editApp ? "update-app" : "add-app", id: editApp?.id,
        role: fRole.trim(), company: fCompany.trim(), category: fCategory,
        status: fAppStatus, deadline: fDeadline || null, dateApplied: fDateApplied || null,
        link: fLink.trim() || null, notes: fAppNotes.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.app) {
      if (editApp) setApplications((p) => p.map((a) => a.id === editApp.id ? data.app : a));
      else         setApplications((p) => [data.app, ...p]);
    }
    setShowAppForm(false); setEditApp(null);
    fetchData();
  };
  const advanceStatus = async (app: Application) => {
    if (!["wishlist","applied","interview"].includes(app.status)) return;
    const next = APP_STATUS_ORDER[APP_STATUS_ORDER.indexOf(app.status) + 1];
    setApplications((p) => p.map((a) => a.id === app.id ? { ...a, status: next } : a));
    await fetch("/api/career", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status-app", id: app.id, status: next }) });
    fetchData();
  };
  const rejectApp = async (id: number) => {
    setApplications((p) => p.map((a) => a.id === id ? { ...a, status: "rejected" } : a));
    await fetch("/api/career", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status-app", id, status: "rejected" }) });
    fetchData();
  };
  const deleteApp = async (id: number) => {
    setApplications((p) => p.filter((a) => a.id !== id));
    await fetch("/api/career", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-app", id }) });
    fetchData();
  };

  // ── brand CRUD ────────────────────────────────────────────────────────────────
  const openAddBrand = () => {
    setEditBrand(null);
    setFBrand(""); setFPlatform("TikTok"); setFBrandCat(""); setFBrandStatus("dream"); setFEmail(""); setFBrandNotes("");
    setShowBrandForm(true);
  };
  const openEditBrand = (b: BrandCollab) => {
    setEditBrand(b);
    setFBrand(b.brand); setFPlatform(b.platform); setFBrandCat(b.category ?? "");
    setFBrandStatus(b.status); setFEmail(b.email ?? ""); setFBrandNotes(b.notes ?? "");
    setShowBrandForm(true);
  };
  const saveBrand = async () => {
    if (!fBrand.trim()) return;
    const res  = await fetch("/api/career", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: editBrand ? "update-brand" : "add-brand", id: editBrand?.id,
        brand: fBrand.trim(), platform: fPlatform, category: fBrandCat.trim() || null,
        status: fBrandStatus, email: fEmail.trim() || null, notes: fBrandNotes.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.brand) {
      if (editBrand) setBrands((p) => p.map((b) => b.id === editBrand.id ? data.brand : b));
      else           setBrands((p) => [data.brand, ...p]);
    }
    setShowBrandForm(false); setEditBrand(null);
  };
  const deleteBrand = async (id: number) => {
    setBrands((p) => p.filter((b) => b.id !== id));
    await fetch("/api/career", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-brand", id }) });
  };

  // ── contact CRUD ──────────────────────────────────────────────────────────────
  const openAddContact = () => {
    setEditContact(null);
    setFCName(""); setFCRole(""); setFCCompany(""); setFHowMet(""); setFDateMet(""); setFFollowUp(""); setFCNotes("");
    setShowContactForm(true);
  };
  const openEditContact = (c: Contact) => {
    setEditContact(c);
    setFCName(c.name); setFCRole(c.role ?? ""); setFCCompany(c.company ?? "");
    setFHowMet(c.how_met ?? ""); setFDateMet(c.date_met?.split("T")[0] ?? "");
    setFFollowUp(c.follow_up_date?.split("T")[0] ?? ""); setFCNotes(c.notes ?? "");
    setShowContactForm(true);
  };
  const saveContact = async () => {
    if (!fCName.trim()) return;
    const res  = await fetch("/api/career", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: editContact ? "update-contact" : "add-contact", id: editContact?.id,
        name: fCName.trim(), role: fCRole.trim() || null, company: fCCompany.trim() || null,
        howMet: fHowMet || null, dateMet: fDateMet || null,
        followUpDate: fFollowUp || null, notes: fCNotes.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.contact) {
      if (editContact) setContacts((p) => p.map((c) => c.id === editContact.id ? data.contact : c));
      else             setContacts((p) => [data.contact, ...p]);
    }
    setShowContactForm(false); setEditContact(null);
  };
  const deleteContact = async (id: number) => {
    setContacts((p) => p.filter((c) => c.id !== id));
    await fetch("/api/career", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-contact", id }) });
  };

  const activeApps  = applications.filter((a) => !["rejected","withdrawn"].includes(a.status));
  const archiveApps = applications.filter((a) =>  ["rejected","withdrawn"].includes(a.status));

  return (
    <div className="space-y-5 py-2">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(237,232,245,0.95) 0%, rgba(200,184,224,0.2) 40%, rgba(222,238,232,0.8) 100%)",
      }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>Career Hub</span>
            <h1 className="font-display font-black italic text-3xl md:text-4xl mt-0.5" style={{ color: "var(--text-dark)" }}>
              💼 Boss Moves
            </h1>
          </div>
          <button className="btn-primary flex items-center gap-1.5" onClick={
            tab === "applications" ? openAddApp : tab === "brands" ? openAddBrand : openAddContact
          }>
            <Plus size={14} />
            {tab === "applications" ? "Add application" : tab === "brands" ? "Add brand" : "Add contact"}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Active applications", value: loading ? "—" : stats?.activeApps ?? 0, sub: `${stats?.totalApps ?? 0} total`, color: "var(--lavender)", icon: <Briefcase size={15} /> },
            { label: "Interviews / Offers", value: loading ? "—" : `${stats?.interviews ?? 0} / ${stats?.offers ?? 0}`, sub: "in progress", color: "var(--sage)", icon: <Check size={15} /> },
            { label: "Dream brands",        value: loading ? "—" : stats?.dreamBrands ?? 0,  sub: `${stats?.activeBrands ?? 0} active`, color: "var(--gold)", icon: <Star size={15} /> },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.65)" }}>
              <div className="flex items-center gap-1.5 mb-1" style={{ color: s.color }}>
                {s.icon}
                <span className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>{s.label}</span>
              </div>
              <div className="font-display font-bold italic text-2xl" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          { key: "applications", label: "Applications",   emoji: "📨", count: activeApps.length },
          { key: "brands",       label: "Brand Collabs",  emoji: "✨", count: brands.filter(b => b.status !== "archived").length },
          { key: "networking",   label: "Networking",     emoji: "🤝", count: contacts.length },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("nav-item flex items-center gap-1.5 text-sm", tab === t.key && "active")}>
            <span>{t.emoji}</span> {t.label}
            {t.count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: tab === t.key ? "rgba(255,255,255,0.5)" : "var(--cream-dark)", color: tab === t.key ? "var(--sage)" : "var(--text-soft)" }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── APPLICATIONS ──────────────────────────────────────────────────── */}
      {tab === "applications" && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
          ) : activeApps.length === 0 && archiveApps.length === 0 ? (
            <EmptyState emoji="📨" title="No applications yet"
              body="Track your internship and job applications to stay on top of deadlines."
              cta="Add first application" onCta={openAddApp} />
          ) : (
            <>
              <div className="space-y-2">
                {activeApps.map((app) => (
                  <AppCard key={app.id} app={app}
                    onEdit={openEditApp} onAdvance={advanceStatus}
                    onReject={rejectApp} onDelete={deleteApp} />
                ))}
              </div>
              {archiveApps.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-xs font-medium py-1 px-1 select-none" style={{ color: "var(--text-soft)" }}>
                    {archiveApps.length} archived (rejected / withdrawn)
                  </summary>
                  <div className="space-y-2 mt-2">
                    {archiveApps.map((app) => (
                      <AppCard key={app.id} app={app} onEdit={openEditApp} onDelete={deleteApp} />
                    ))}
                  </div>
                </details>
              )}
            </>
          )}

          {showAppForm && (
            <AppForm
              isEdit={!!editApp}
              role={fRole} setRole={setFRole}
              company={fCompany} setCompany={setFCompany}
              category={fCategory} setCategory={setFCategory}
              status={fAppStatus} setStatus={setFAppStatus}
              deadline={fDeadline} setDeadline={setFDeadline}
              dateApplied={fDateApplied} setDateApplied={setFDateApplied}
              link={fLink} setLink={setFLink}
              notes={fAppNotes} setNotes={setFAppNotes}
              onSave={saveApp}
              onDelete={editApp ? () => { deleteApp(editApp.id); setShowAppForm(false); } : undefined}
              onCancel={() => { setShowAppForm(false); setEditApp(null); }}
            />
          )}
        </div>
      )}

      {/* ── BRAND COLLABS ─────────────────────────────────────────────────── */}
      {tab === "brands" && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
          ) : brands.length === 0 ? (
            <EmptyState emoji="✨" title="No brands yet"
              body="Add brands you'd love to collaborate with — from dream to active."
              cta="Add first brand" onCta={openAddBrand} />
          ) : (
            brands.map((b) => <BrandCard key={b.id} brand={b} onEdit={openEditBrand} onDelete={deleteBrand} />)
          )}

          {showBrandForm && (
            <BrandForm
              isEdit={!!editBrand}
              brand={fBrand} setBrand={setFBrand}
              platform={fPlatform} setPlatform={setFPlatform}
              category={fBrandCat} setCategory={setFBrandCat}
              status={fBrandStatus} setStatus={setFBrandStatus}
              email={fEmail} setEmail={setFEmail}
              notes={fBrandNotes} setNotes={setFBrandNotes}
              onSave={saveBrand}
              onDelete={editBrand ? () => { deleteBrand(editBrand.id); setShowBrandForm(false); } : undefined}
              onCancel={() => { setShowBrandForm(false); setEditBrand(null); }}
            />
          )}
        </div>
      )}

      {/* ── NETWORKING ────────────────────────────────────────────────────── */}
      {tab === "networking" && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
          ) : contacts.length === 0 ? (
            <EmptyState emoji="🤝" title="No contacts yet"
              body="Log people you've met or want to follow up with."
              cta="Add first contact" onCta={openAddContact} />
          ) : (
            contacts.map((c) => <ContactCard key={c.id} contact={c} onEdit={openEditContact} onDelete={deleteContact} />)
          )}

          {showContactForm && (
            <ContactForm
              isEdit={!!editContact}
              name={fCName} setName={setFCName}
              role={fCRole} setRole={setFCRole}
              company={fCCompany} setCompany={setFCCompany}
              howMet={fHowMet} setHowMet={setFHowMet}
              dateMet={fDateMet} setDateMet={setFDateMet}
              followUp={fFollowUp} setFollowUp={setFFollowUp}
              notes={fCNotes} setNotes={setFCNotes}
              onSave={saveContact}
              onDelete={editContact ? () => { deleteContact(editContact.id); setShowContactForm(false); } : undefined}
              onCancel={() => { setShowContactForm(false); setEditContact(null); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── empty state ────────────────────────────────────────────────────────────────
function EmptyState({ emoji, title, body, cta, onCta }: {
  emoji: string; title: string; body: string; cta: string; onCta: () => void;
}) {
  return (
    <div className="card px-5 py-8 text-center">
      <div className="text-3xl mb-3">{emoji}</div>
      <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>{title}</p>
      <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>{body}</p>
      <button className="btn-primary" onClick={onCta}>{cta} ✦</button>
    </div>
  );
}

// ── application card ───────────────────────────────────────────────────────────
function AppCard({ app, onEdit, onAdvance, onReject, onDelete }: {
  app: Application;
  onEdit: (a: Application) => void;
  onAdvance?: (a: Application) => void;
  onReject?: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const meta      = APP_STATUS_META[app.status];
  const badge     = deadlineBadge(app.deadline);
  const canAdv    = ["wishlist","applied","interview"].includes(app.status);
  const isArchive = ["rejected","withdrawn"].includes(app.status);
  const nextLabel = canAdv ? APP_STATUS_META[APP_STATUS_ORDER[APP_STATUS_ORDER.indexOf(app.status) + 1]]?.label : null;

  return (
    <div className="card flex gap-3 px-4 py-3.5 group transition-all" style={{ opacity: isArchive ? 0.65 : 1 }}>
      <div className="w-1 rounded-full flex-shrink-0 self-stretch" style={{ background: meta.color, minHeight: "36px" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm" style={{ color: "var(--text-dark)" }}>{app.role}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{app.company} · {app.category}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
            {badge && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: badge.urgent ? "var(--rose-pale)" : "rgba(240,234,228,0.9)",
                  color: badge.urgent ? "#b06070" : "var(--text-soft)",
                  border: badge.urgent ? "1px solid rgba(176,96,112,0.3)" : "none",
                }}>
                {badge.urgent ? "⚠️ " : "📅 "}{badge.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}>
              {meta.emoji} {meta.label}
            </span>
          </div>
        </div>

        {app.notes && <p className="text-xs mt-1.5 italic line-clamp-1" style={{ color: "var(--text-soft)" }}>{app.notes}</p>}

        {!isArchive && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {canAdv && nextLabel && onAdvance && (
              <button onClick={() => onAdvance(app)}
                className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}>
                → {nextLabel}
              </button>
            )}
            {canAdv && onReject && (
              <button onClick={() => onReject(app.id)}
                className="text-xs px-2.5 py-1 rounded-full transition-all"
                style={{ color: "var(--text-soft)", background: "rgba(240,234,228,0.8)" }}>
                Reject
              </button>
            )}
            {app.link && (
              <a href={app.link} target="_blank" rel="noopener noreferrer"
                className="ml-auto text-xs flex items-center gap-1" style={{ color: "var(--lavender)" }}>
                <ExternalLink size={11} /> Open
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => onEdit(app)} className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--sage-pale)", color: "var(--sage)" }}><Pencil size={11} /></button>
        <button onClick={() => onDelete(app.id)} className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}><X size={11} /></button>
      </div>
    </div>
  );
}

// ── brand card ─────────────────────────────────────────────────────────────────
function BrandCard({ brand, onEdit, onDelete }: { brand: BrandCollab; onEdit: (b: BrandCollab) => void; onDelete: (id: number) => void }) {
  const meta = BRAND_STATUS_META[brand.status];
  return (
    <div className="card flex gap-3 px-4 py-3.5 group" style={{ opacity: brand.status === "archived" ? 0.6 : 1 }}>
      <div className="w-1 rounded-full flex-shrink-0 self-stretch" style={{ background: meta.color, minHeight: "32px" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm flex-1" style={{ color: "var(--text-dark)" }}>{brand.brand}</p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}>
            {meta.emoji} {meta.label}
          </span>
        </div>
        <div className="flex gap-2 mt-0.5 flex-wrap">
          <span className="text-xs" style={{ color: "var(--text-soft)" }}>{brand.platform}</span>
          {brand.category && <><span style={{ color: "var(--text-soft)" }}>·</span><span className="text-xs" style={{ color: "var(--text-soft)" }}>{brand.category}</span></>}
          {brand.email    && <span className="text-xs italic" style={{ color: "var(--lavender)" }}>{brand.email}</span>}
        </div>
        {brand.notes && <p className="text-xs mt-1 italic line-clamp-1" style={{ color: "var(--text-soft)" }}>{brand.notes}</p>}
      </div>
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => onEdit(brand)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--sage-pale)", color: "var(--sage)" }}><Pencil size={11} /></button>
        <button onClick={() => onDelete(brand.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}><X size={11} /></button>
      </div>
    </div>
  );
}

// ── contact card ───────────────────────────────────────────────────────────────
function ContactCard({ contact, onEdit, onDelete }: { contact: Contact; onEdit: (c: Contact) => void; onDelete: (id: number) => void }) {
  const followUpPast = contact.follow_up_date ? (isPast(parseISO(contact.follow_up_date)) && !isToday(parseISO(contact.follow_up_date))) : false;
  return (
    <div className="card flex gap-3 px-4 py-3.5 group">
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
        style={{ background: "var(--lavender-pale)", color: "var(--lavender)" }}>
        {contact.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm" style={{ color: "var(--text-dark)" }}>{contact.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
              {[contact.role, contact.company].filter(Boolean).join(" @ ") || "No role / company"}
            </p>
          </div>
          {contact.follow_up_date && (
            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: followUpPast ? "var(--rose-pale)" : "rgba(200,184,224,0.2)",
                color: followUpPast ? "#b06070" : "var(--lavender)",
                border: `1px solid ${followUpPast ? "rgba(176,96,112,0.3)" : "rgba(200,184,224,0.3)"}`,
              }}>
              {followUpPast ? "⚠️ Follow up" : `📅 ${format(parseISO(contact.follow_up_date), "d MMM")}`}
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-1 flex-wrap">
          {contact.how_met  && <span className="text-xs" style={{ color: "var(--text-soft)" }}>Met via {contact.how_met}</span>}
          {contact.date_met && <span className="text-xs" style={{ color: "var(--text-soft)" }}>{format(parseISO(contact.date_met), "d MMM yyyy")}</span>}
        </div>
        {contact.notes && <p className="text-xs mt-1 italic line-clamp-1" style={{ color: "var(--text-soft)" }}>{contact.notes}</p>}
      </div>
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => onEdit(contact)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--sage-pale)", color: "var(--sage)" }}><Pencil size={11} /></button>
        <button onClick={() => onDelete(contact.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}><X size={11} /></button>
      </div>
    </div>
  );
}

// ── app form ───────────────────────────────────────────────────────────────────
function AppForm({
  isEdit, role, setRole, company, setCompany, category, setCategory,
  status, setStatus, deadline, setDeadline, dateApplied, setDateApplied,
  link, setLink, notes, setNotes, onSave, onDelete, onCancel,
}: {
  isEdit: boolean;
  role: string; setRole: (v: string) => void;
  company: string; setCompany: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  status: Application["status"]; setStatus: (v: Application["status"]) => void;
  deadline: string; setDeadline: (v: string) => void;
  dateApplied: string; setDateApplied: (v: string) => void;
  link: string; setLink: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  onSave: () => void; onDelete?: () => void; onCancel: () => void;
}) {
  return (
    <div className="card px-5 py-5" style={{ border: "1.5px solid rgba(200,184,224,0.4)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
          {isEdit ? "Edit application" : "Add application ✦"}
        </h2>
        <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}><X size={14} /></button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Role *</label>
          <input autoFocus className="input-fairy" placeholder="e.g. Marketing Intern"
            value={role} onChange={e => setRole(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Company *</label>
          <input className="input-fairy" placeholder="e.g. ASOS"
            value={company} onChange={e => setCompany(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Category</label>
          <select className="input-fairy" value={category} onChange={e => setCategory(e.target.value)}>
            {APP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Application link</label>
          <input className="input-fairy" placeholder="https://…" value={link} onChange={e => setLink(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Deadline</label>
          <input type="date" className="input-fairy" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Date applied</label>
          <input type="date" className="input-fairy" value={dateApplied} onChange={e => setDateApplied(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>Status</label>
          <div className="flex gap-2 flex-wrap">
            {(["wishlist","applied","interview","offer","rejected","withdrawn"] as const).map(s => {
              const m = APP_STATUS_META[s];
              return (
                <button key={s} onClick={() => setStatus(s)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: status === s ? m.bg : "rgba(250,246,240,0.8)",
                    color: status === s ? m.color : "var(--text-soft)",
                    border: `1.5px solid ${status === s ? m.color + "60" : "rgba(200,184,224,0.2)"}`,
                    transform: status === s ? "scale(1.05)" : "scale(1)",
                  }}>
                  {m.emoji} {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Notes</label>
          <textarea className="input-fairy resize-none" rows={2}
            placeholder="Contact name, next steps, interview details…"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button className="btn-primary flex-1" onClick={onSave}>
          <Check size={14} className="inline mr-1" />{isEdit ? "Save changes" : "Add application ✦"}
        </button>
        {onDelete && (
          <button onClick={onDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
            style={{ background: "var(--rose-pale)", color: "#b06070", border: "1px solid rgba(232,180,184,0.4)" }}>
            <X size={12} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ── brand form ─────────────────────────────────────────────────────────────────
function BrandForm({
  isEdit, brand, setBrand, platform, setPlatform, category, setCategory,
  status, setStatus, email, setEmail, notes, setNotes, onSave, onDelete, onCancel,
}: {
  isEdit: boolean;
  brand: string; setBrand: (v: string) => void;
  platform: string; setPlatform: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  status: BrandCollab["status"]; setStatus: (v: BrandCollab["status"]) => void;
  email: string; setEmail: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  onSave: () => void; onDelete?: () => void; onCancel: () => void;
}) {
  return (
    <div className="card px-5 py-5" style={{ border: "1.5px solid rgba(212,168,83,0.35)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
          {isEdit ? "Edit brand" : "Add brand ✦"}
        </h2>
        <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}><X size={14} /></button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Brand name *</label>
          <input autoFocus className="input-fairy" placeholder="e.g. PLT, Glossier"
            value={brand} onChange={e => setBrand(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Platform</label>
          <select className="input-fairy" value={platform} onChange={e => setPlatform(e.target.value)}>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Category / niche</label>
          <input className="input-fairy" placeholder="e.g. Beauty, Fashion, Lifestyle"
            value={category} onChange={e => setCategory(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Contact email</label>
          <input type="email" className="input-fairy" placeholder="collab@brand.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>Status</label>
          <div className="flex gap-2 flex-wrap">
            {(["dream","reached_out","in_talks","active","archived"] as const).map(s => {
              const m = BRAND_STATUS_META[s];
              return (
                <button key={s} onClick={() => setStatus(s)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: status === s ? m.bg : "rgba(250,246,240,0.8)",
                    color: status === s ? m.color : "var(--text-soft)",
                    border: `1.5px solid ${status === s ? m.color + "60" : "rgba(200,184,224,0.2)"}`,
                    transform: status === s ? "scale(1.05)" : "scale(1)",
                  }}>
                  {m.emoji} {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Notes</label>
          <textarea className="input-fairy resize-none" rows={2}
            placeholder="Budget range, vibe, previous response…"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button className="btn-primary flex-1" onClick={onSave}>
          <Check size={14} className="inline mr-1" />{isEdit ? "Save changes" : "Add brand ✦"}
        </button>
        {onDelete && (
          <button onClick={onDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
            style={{ background: "var(--rose-pale)", color: "#b06070", border: "1px solid rgba(232,180,184,0.4)" }}>
            <X size={12} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ── contact form ───────────────────────────────────────────────────────────────
function ContactForm({
  isEdit, name, setName, role, setRole, company, setCompany,
  howMet, setHowMet, dateMet, setDateMet, followUp, setFollowUp,
  notes, setNotes, onSave, onDelete, onCancel,
}: {
  isEdit: boolean;
  name: string; setName: (v: string) => void;
  role: string; setRole: (v: string) => void;
  company: string; setCompany: (v: string) => void;
  howMet: string; setHowMet: (v: string) => void;
  dateMet: string; setDateMet: (v: string) => void;
  followUp: string; setFollowUp: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  onSave: () => void; onDelete?: () => void; onCancel: () => void;
}) {
  return (
    <div className="card px-5 py-5" style={{ border: "1.5px solid rgba(200,184,224,0.4)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
          {isEdit ? "Edit contact" : "Add contact ✦"}
        </h2>
        <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}><X size={14} /></button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Name *</label>
          <input autoFocus className="input-fairy" placeholder="e.g. Sarah Johnson"
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Role</label>
          <input className="input-fairy" placeholder="e.g. Marketing Manager"
            value={role} onChange={e => setRole(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Company</label>
          <input className="input-fairy" placeholder="e.g. ASOS"
            value={company} onChange={e => setCompany(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>How met</label>
          <select className="input-fairy" value={howMet} onChange={e => setHowMet(e.target.value)}>
            <option value="">Select…</option>
            {HOW_MET_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Date met</label>
          <input type="date" className="input-fairy" value={dateMet} onChange={e => setDateMet(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Follow-up date</label>
          <input type="date" className="input-fairy" value={followUp} onChange={e => setFollowUp(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Notes</label>
          <textarea className="input-fairy resize-none" rows={2}
            placeholder="What to follow up on, LinkedIn URL, mutual connections…"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button className="btn-primary flex-1" onClick={onSave}>
          <Check size={14} className="inline mr-1" />{isEdit ? "Save changes" : "Add contact ✦"}
        </button>
        {onDelete && (
          <button onClick={onDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
            style={{ background: "var(--rose-pale)", color: "#b06070", border: "1px solid rgba(232,180,184,0.4)" }}>
            <X size={12} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
