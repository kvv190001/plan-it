export function ProgressRing({
  progress,
  size = 56,
  strokeWidth = 6,
  label,
  caption,
}: {
  progress: number // 0..1
  size?: number
  strokeWidth?: number
  label?: string
  caption?: string // optional second line, e.g. "COMPLETE", for larger rings
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(Math.max(progress, 0), 1))
  const labelFontSize = Math.round(size * 0.28)
  const captionFontSize = Math.max(10, Math.round(size * 0.09))

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="stroke-primary-100" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-primary-600 transition-[stroke-dashoffset]"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute flex flex-col items-center leading-none text-primary-700">
        <span className="font-bold" style={{ fontSize: labelFontSize }}>
          {label ?? `${Math.round(progress * 100)}%`}
        </span>
        {caption && (
          <span
            className="mt-1 font-semibold uppercase tracking-wide text-gray-400"
            style={{ fontSize: captionFontSize }}
          >
            {caption}
          </span>
        )}
      </span>
    </div>
  )
}
