import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";

// Tell Neon to use a fetch that opts out of Next.js's data cache.
// Without this, Next.js 15 can silently cache Neon's HTTP responses and
// serve stale (often empty) DB results on every subsequent request.
neonConfig.fetchFunction = (url: RequestInfo | URL, init?: RequestInit) =>
  fetch(url, { ...init, cache: "no-store" });

let _sql: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}
