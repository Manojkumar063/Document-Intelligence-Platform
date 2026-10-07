export function AuthArtwork() {
  return (
    <aside className="auth-art relative h-36 overflow-hidden rounded-xl border border-slate-700/70 lg:h-[min(680px,calc(100vh-4rem))]">
      <img
        src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=85"
        alt="Detailed computer circuit board and electronic components"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/20 to-slate-950/10" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/10 bg-slate-950/30 px-4 py-3 backdrop-blur-sm sm:px-5">
        <span className="font-mono text-[10px] uppercase text-white/75">RAG // WORKSPACE</span>
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase text-teal-200">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_10px_rgba(94,234,212,0.9)]" />
          DOCUMENT SYSTEM
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase text-teal-200">
          <span className="h-px w-7 bg-teal-300" />
          KNOWLEDGE ENGINE
        </div>
        <p className="font-mono text-xl font-medium text-white sm:text-2xl lg:text-3xl">RAG / 001</p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
          Technical knowledge workspace
        </p>
      </div>
    </aside>
  );
}
