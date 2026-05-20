import type { QuestionStatus } from "@/types/Progress";

type StatusButtonsProps = {
  onMark: (status: QuestionStatus) => void;
  currentStatus?: QuestionStatus;
};

const statuses: { status: QuestionStatus; label: string; className: string }[] = [
  { status: "known", label: "Known", className: "bg-emerald-700 text-white hover:bg-emerald-800" },
  { status: "review", label: "Review", className: "bg-brass text-white hover:bg-[#9d712d]" },
  { status: "weak", label: "Weak", className: "bg-signal text-white hover:bg-[#b93e1f]" }
];

export function StatusButtons({ onMark, currentStatus }: StatusButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map(({ status, label, className }) => (
        <button
          className={`rounded-full px-4 py-2 text-sm font-bold transition focus-ring ${className} ${
            currentStatus === status ? "ring-2 ring-ink ring-offset-2" : ""
          }`}
          key={status}
          onClick={() => onMark(status)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
