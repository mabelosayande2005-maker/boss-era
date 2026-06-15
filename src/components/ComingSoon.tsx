export default function ComingSoon({
  title,
  description,
  emoji,
}: {
  title: string;
  description: string;
  emoji: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card text-center px-8 py-12 max-w-sm" style={{
        background: "linear-gradient(135deg, rgba(222,238,232,0.85), rgba(237,232,245,0.85))",
      }}>
        <div className="text-5xl mb-4 float">{emoji}</div>
        <h1 className="font-display font-black italic text-2xl mb-2" style={{ color: "var(--text-dark)" }}>
          {title}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>{description}</p>
        <div className="iridescent-bar h-0.5 rounded-full mb-6" />
        <p className="text-xs italic" style={{ color: "var(--text-soft)" }}>
          ✦ Coming next — ask me to build this section
        </p>
      </div>
    </div>
  );
}
