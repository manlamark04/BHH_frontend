/**
 * Staff Profile View
 * Re-uses CustomerProfile — auth endpoints are role-agnostic so the same
 * form and API work identically for staff users.
 */
import CustomerProfile from '../customer/Profile'

interface StaffProfileProps {
  userName: string
  userId: string
  mustChangePassword?: boolean
  onPasswordChanged?: () => void
}

export default function StaffProfile({ userName, userId, mustChangePassword, onPasswordChanged }: StaffProfileProps) {
  return <CustomerProfile userName={userName} userId={userId} mustChangePassword={mustChangePassword} onPasswordChanged={onPasswordChanged} />
}
