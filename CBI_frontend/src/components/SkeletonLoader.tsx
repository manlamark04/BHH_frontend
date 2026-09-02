// ─── Skeleton Loader Components ─────────────────────────────
// Uses .bhh-skeleton CSS class defined in index.css for the shimmer animation

interface SkeletonRowProps {
  cols?: number
  height?: string
}

/** A single skeleton table row */
export function SkeletonRow({ cols = 5, height = 'h-4' }: SkeletonRowProps) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className={`bhh-skeleton ${height} rounded-md`}
            style={{ width: i === 0 ? '40%' : i === cols - 1 ? '60%' : `${55 + (i * 10) % 30}%` }}
          />
        </td>
      ))}
    </tr>
  )
}

/** A placeholder for a stat/KPI card */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#1C221A] border border-black/[0.06] dark:border-neutral-800 rounded-2xl p-4 space-y-3 ${className}`}>
      <div className="bhh-skeleton h-3 w-24 rounded" />
      <div className="bhh-skeleton h-7 w-16 rounded" />
      <div className="bhh-skeleton h-2.5 w-32 rounded" />
    </div>
  )
}

/** A full table skeleton (header + N rows) */
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-4 py-3 text-left">
              <div className="bhh-skeleton h-3 rounded w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  )
}
