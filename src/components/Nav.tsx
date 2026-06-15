"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "✦ Home", emoji: "" },
  { href: "/income", label: "Income", emoji: "💸" },
  { href: "/summer-plan", label: "Summer Plan", emoji: "☀️" },
  { href: "/habits", label: "Habits", emoji: "🌿" },
  { href: "/content", label: "Content", emoji: "🎬" },
  { href: "/vinted", label: "Vinted", emoji: "🛍️" },
  { href: "/career", label: "Career", emoji: "💼" },
  { href: "/wellbeing", label: "Wellbeing", emoji: "🌸" },
  { href: "/wardrobe", label: "Wardrobe", emoji: "👗" },
  { href: "/finance", label: "Finance", emoji: "📊" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden md:block sticky top-0 z-40" style={{
        background: "rgba(250, 246, 240, 0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(200,184,224,0.25)",
      }}>
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center gap-1 py-3 overflow-x-auto">
            <div className="flex items-center gap-2 mr-6 shrink-0">
              <span className="text-2xl">🦋</span>
              <span className="font-display font-bold italic text-lg" style={{ color: "var(--sage)" }}>
                Boss Era
              </span>
            </div>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("nav-item flex items-center gap-1", {
                  active: pathname === item.href,
                })}
              >
                {item.emoji && <span className="text-sm">{item.emoji}</span>}
                {item.label.replace(/^✦ /, "")}
              </Link>
            ))}
          </div>
        </div>
        <div className="iridescent-bar h-0.5 opacity-60" />
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background: "rgba(250, 246, 240, 0.95)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(200,184,224,0.25)",
        }}>
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

      {/* Mobile bottom nav */}
      <nav className="mobile-nav md:hidden flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn("flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all", {
              "": pathname === item.href,
            })}
          >
            <span className="text-lg">{item.emoji || "✦"}</span>
            <span className="text-xs font-medium" style={{
              color: pathname === item.href ? "var(--sage)" : "var(--text-soft)",
            }}>
              {item.label.replace(/^✦ /, "").split(" ")[0]}
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
