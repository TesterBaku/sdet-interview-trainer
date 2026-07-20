import Link from "next/link";
import { cheatSheetSelfTest } from "@/lib/cheatsheets";
import { formatAudioMinutes, getCheatSheetAudio } from "@/lib/audio";
import type { CheatSheet } from "@/types/CheatSheet";

export function CheatSheetCard({ sheet }: { sheet: CheatSheet }) {
  const selfTest = cheatSheetSelfTest(sheet);
  const audio = getCheatSheetAudio(sheet.id);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-ink/10 bg-white/75 p-5 pl-6 shadow-panel transition hover:-translate-y-1 hover:bg-white">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: sheet.accent }} />
      <div className="flex items-start justify-between gap-3">
        <span
          className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]"
          style={{ backgroundColor: `${sheet.accent}1a`, color: sheet.accent }}
        >
          {sheet.group}
        </span>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-bold text-ink/60">{sheet.sections.length} sections</span>
          {audio ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-ink/60">
              <span aria-hidden>🎧</span> {formatAudioMinutes(audio.durationSec)}
            </span>
          ) : null}
        </div>
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-blueprint">{sheet.title}</h2>
      <p className="mt-3 flex-1 text-sm leading-6 text-ink/70 line-clamp-4">{sheet.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {sheet.tags.slice(0, 4).map((tag) => (
          <span className="rounded-md bg-paper/80 px-2 py-1 text-[11px] font-semibold text-ink/60" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <Link
          className="inline-flex flex-1 items-center justify-center rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-paper transition hover:bg-blueprint focus-ring"
          href={`/cheatsheets/${sheet.id}`}
        >
          Open cheat sheet
        </Link>
        {selfTest ? (
          <Link
            className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-white/70 px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-white focus-ring"
            href={selfTest.href}
          >
            {selfTest.kind === "quiz" ? "Quiz" : "Mock Exam"}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
