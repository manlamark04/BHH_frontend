/**
 * Admin Profile View
 * Re-uses the CustomerProfile component — same layout and API endpoints work
 * for all roles since /api/auth/me and /api/auth/change-password are role-agnostic.
 */
import CustomerProfile from '../customer/Profile'

interface AdminProfileProps {
  userName: string
  userId: string
  mustChangePassword?: boolean
  onPasswordChanged?: () => void
  onProfileUpdated?: (updated: { name?: string; photoUrl?: string | null }) => void
}

export default function AdminProfile({ userName, userId, mustChangePassword, onPasswordChanged, onProfileUpdated }: AdminProfileProps) {
  return <CustomerProfile userName={userName} userId={userId} mustChangePassword={mustChangePassword} onPasswordChanged={onPasswordChanged} onProfileUpdated={onProfileUpdated} />
}
