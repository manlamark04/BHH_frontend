import { useState, useEffect } from 'react'

/**
 * Delays updating a value until after `delay` ms have elapsed
 * since the last change. Use in search inputs to reduce re-renders.
 *
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 300)
 * // use debouncedSearch in useMemo/useEffect instead of searchQuery
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
