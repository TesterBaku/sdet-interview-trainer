// Single source of truth for the per-"kind" audio namespaces, shared by the pipeline
// scripts (synthesize-podcast / captions / publish). A "kind" is a self-contained audio
// format that must never overwrite another's files, so each pins its own build subdir,
// transcript subdir, public-staging subdir, Blob prefix, and manifest basename. Interview
// is fully namespaced because it shares cheat-sheet ids with the podcast (same id, different
// audio). Adding or renaming a format is a one-line change here instead of an edit spread
// across three scripts.
//
// NOTE: lib/audio.ts mirrors the interview `manifestBase` + `transcriptSubdir` (it can't
// import this .mjs cleanly from the typed Next bundle without extra config). If you change
// those here, update the pointer-marked constants there too.

export const KIND_NAMESPACES = {
  single: {
    buildSubdir: [],
    transcriptSubdir: [],
    publicSubdir: [],
    blobPrefix: "audio",
    manifestBase: "manifest",
  },
  podcast: {
    buildSubdir: ["podcast"],
    transcriptSubdir: [],
    publicSubdir: [],
    blobPrefix: "audio",
    manifestBase: "manifest",
  },
  interview: {
    buildSubdir: ["interview"],
    transcriptSubdir: ["interview"],
    publicSubdir: ["interview"],
    blobPrefix: "audio/interview",
    manifestBase: "manifest.interview",
  },
};

// Resolve the kind from CLI args: a bare --interview / --podcast flag wins, else "single".
// synthesize-podcast additionally honors --kind=<k> (see there); captions/publish are
// podcast/interview/single only, which this covers.
export function kindFromArgs(args) {
  return args.includes("--interview") ? "interview" : args.includes("--podcast") ? "podcast" : "single";
}
