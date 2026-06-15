import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = "dd MMM yyyy") {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt);
}

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export const INCOME_SOURCES = [
  "Stint",
  "Liveforce",
  "Platinum Recruitment",
  "SUSU",
  "TikTok Shop",
  "Brand Deal",
  "Vinted",
  "Tutoring",
  "Other",
] as const;

export type IncomeSource = (typeof INCOME_SOURCES)[number];

export const SUMMER_GOAL = 5000;

export const SUMMER_START = new Date("2026-06-12");
export const SUMMER_END = new Date("2026-08-31");

export function summerProgress(): number {
  const now = new Date();
  const total = SUMMER_END.getTime() - SUMMER_START.getTime();
  const elapsed = now.getTime() - SUMMER_START.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}
