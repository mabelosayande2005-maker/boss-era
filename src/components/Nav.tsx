"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", emoji: "✦" },
  { href: "/income", label: "Income", emoji: "💸" },
  { href: "/summer-plan", label: "Summer", emoji: "☀️" },
  { href: "/habits", label: "Habits", emoji: "🌿" },
  { href: "/content", label: "Content", emoji: "🎬" },
  { href: "/vinted", label: "Vinted", emoji: "🛍️" },
  { href: "/career", label: "Career", emoji: "💼" },
  { href: "/wellbeing", label: "Wellbeing", emoji: "🌸" },
  { href: "/finance", label: "Finance", emoji: "📊" },
  { href: "/goals", label: "Goals", emoji: "🌟" },
  { href: "/learning", label: "Learning", emoji: "📚" },
  { href: "/cookbook", label: "Cookbook", emoji: "🍽️" },
  { href: "/travel", label: "Travel", emoji: "✈️" },
  { href: "/social", label: "Social", emoji: "🥂" },
  { href: "/music", label: "Music", emoji: "🎵" },
  { href: "/notes", label: "Notes", emoji: "📝" },
];

// First 4 always visible in the mobile bottom bar
const PINNED = navItems.slice(0, 4);
// Everything else lives in the "More" drawer
const OVERFLOW = navItems.slice(4);

export default function Nav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  if (pathname === "/auth") return null;

  // "More" button lights up when the active page is in the overflow list
  const overflowActive = OVERFLOW.some(item => item.href === pathname);

  const close = () => setShowMore(false);

  return (
    <>
      {/* ── Desktop top nav ───────────────────────────────────────── */}
      <header className="hidden md:block sticky top-0 z-40" style={{
        background: "rgba(250, 246, 240, 0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(200,184,224,0.25)",
      }}>
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center gap-1 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <div className="flex items-center gap-2 mr-6 shrink-0">
              <span className="text-2xl">🦋</span>
              <span className="font-display font-bold italic text-lg" style={{ color: "var(--sage)" }}>
                Boss Era
              </span>
            </div>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("nav-item flex items-center gap-1 shrink-0", {
                  active: pathname === item.href,
                })}
              >
                <span className="text-sm">{item.emoji}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="iridescent-bar h-0.5 opacity-60" />
      </header>

      {/* ── Mobile top bar ────────────────────────────────────────── */}
      <header
        className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background: "rgba(250, 246, 240, 0.95)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(200,184,224,0.25)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🦋</span>
          <span className="font-display font-bold italic text-base" style={{ color: "var(--sage)" }}>
            Boss Era
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-soft)" }}>
          {navItems.find(n => n.href === pathname)?.label || ""}
        </span>
      </header>

      {/* ── More drawer overlay ───────────────────────────────────── */}
      <div
        className={cn("nav-drawer-overlay md:hidden", { open: showMore })}
        onClick={close}
        aria-hidden="true"
      />

      {/* ── More drawer panel ─────────────────────────────────────── */}
      <div className={cn("nav-drawer md:hidden", { open: showMore })} role="dialog" aria-modal="true" aria-label="All sections">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-0.5">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(200,184,224,0.5)" }} />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>
            All Sections ✦
          </span>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ background: "var(--cream-dark)" }}
            aria-label="Close"
          >
            <X size={15} style={{ color: "var(--text-soft)" }} />
          </button>
        </div>

        {/* Section grid */}
        <div className="grid grid-cols-4 gap-1 px-4 pb-1">
          {OVERFLOW.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="flex flex-col items-center gap-1 py-3 px-1 rounded-2xl transition-all active:scale-95"
                style={{
                  background: isActive ? "var(--sage-pale)" : "transparent",
                }}
              >
                <span className="text-[26px] leading-none">{item.emoji}</span>
                <span
                  className="text-[10px] font-medium text-center leading-tight"
                  style={{ color: isActive ? "var(--sage)" : "var(--text-soft)" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────── */}
      <nav className="mobile-nav md:hidden flex items-center justify-around">
        {PINNED.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all"
              style={{ minWidth: "3rem" }}
            >
              <span className="text-[22px] leading-none">
                {item.href === "/" ? (
                  <span style={{ color: isActive ? "var(--sage)" : "var(--text-soft)", fontWeight: 700, fontSize: "18px" }}>✦</span>
                ) : (
                  item.emoji
                )}
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? "var(--sage)" : "var(--text-soft)" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setShowMore(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all active:scale-95"
          style={{ minWidth: "3rem" }}
          aria-label="More sections"
          aria-expanded={showMore}
        >
          <LayoutGrid
            size={22}
            style={{ color: overflowActive || showMore ? "var(--sage)" : "var(--text-soft)" }}
          />
          <span
            className="text-[10px] font-medium"
            style={{ color: overflowActive || showMore ? "var(--sage)" : "var(--text-soft)" }}
          >
            More
          </span>
        </button>
      </nav>
    </>
  );
}
