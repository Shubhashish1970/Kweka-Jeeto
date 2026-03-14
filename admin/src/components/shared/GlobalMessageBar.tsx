/**
 * Info banner per UI_STANDARDS — Kweka Reach aligned.
 * Renders inside main content; scrolls with the page. Not fixed.
 * Use for section-level contextual message (workflow, how to use the page).
 */
interface GlobalMessageBarProps {
  title: string;
  description: string;
  className?: string;
}

export default function GlobalMessageBar({
  title,
  description,
  className = '',
}: GlobalMessageBarProps) {
  return (
    <div
      className={`bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-4 ${className}`}
      role="region"
      aria-label="Information"
    >
      <div
        className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0"
        aria-hidden
      >
        <svg
          className="w-4 h-4 text-blue-600"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-blue-900">{title}</p>
        <p className="text-sm text-blue-700 leading-relaxed mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}
