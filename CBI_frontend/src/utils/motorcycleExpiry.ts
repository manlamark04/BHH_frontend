export interface MotorcycleExpiryInfo {
  expiryDateStr: string
  diffDays: number
  isExpired: boolean
  isExpiringSoon: boolean // <= 30 days and >= 0 days
  badgeLabel: string
  detailLabel: string
  formattedDate: string
}

/**
 * Calculates motorcycle registration expiry status based on registration_expiry_date.
 * Handles both 'YYYY-MM-DD' and ISO string formats safely.
 */
export function getMotorRegistrationExpiry(expiryDateRaw?: string | null): MotorcycleExpiryInfo | null {
  if (!expiryDateRaw) return null

  const clean = String(expiryDateRaw).trim()
  if (!clean || clean === 'null' || clean === 'undefined') return null

  // Extract YYYY-MM-DD
  const dateOnly = clean.split('T')[0].split(' ')[0]
  const parts = dateOnly.split('-')
  if (parts.length !== 3) return null

  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null

  const expDate = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expDate.setHours(0, 0, 0, 0)

  const diffMs = expDate.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  const isExpired = diffDays < 0
  const isExpiringSoon = diffDays >= 0 && diffDays <= 30

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const formattedDate = `${months[month - 1]} ${day}, ${year}`

  let badgeLabel = ''
  let detailLabel = ''

  if (isExpired) {
    const daysAgo = Math.abs(diffDays)
    badgeLabel = daysAgo === 0 ? 'Expired Today' : `Expired (${daysAgo}d ago)`
    detailLabel = daysAgo === 0 ? `Expired today (${formattedDate})` : `Expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago (${formattedDate})`
  } else if (isExpiringSoon) {
    if (diffDays === 0) {
      badgeLabel = 'Expires Today!'
      detailLabel = `Registration expires today! (${formattedDate})`
    } else {
      badgeLabel = `Expiring in ${diffDays}d`
      detailLabel = `Registration expires in ${diffDays} day${diffDays === 1 ? '' : 's'} (${formattedDate})`
    }
  }

  return {
    expiryDateStr: dateOnly,
    diffDays,
    isExpired,
    isExpiringSoon,
    badgeLabel,
    detailLabel,
    formattedDate
  }
}
