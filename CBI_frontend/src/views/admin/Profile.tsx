/**
 * Admin Profile View
 * Re-uses the CustomerProfile component — same layout and API endpoints work
 * for all roles since /api/auth/me and /api/auth/change-password are role-agnostic.
 */
import CustomerProfile from '../customer/Profile'

interface AdminProfileProps {
  userName: string
  userId: string
  onPasswordChanged?: () => void
}

export default function AdminProfile({ userName, userId, onPasswordChanged }: AdminProfileProps) {
  return <CustomerProfile userName={userName} userId={userId} onPasswordChanged={onPasswordChanged} />
}
