import AdminLostAndFound from '../admin/LostAndFound'

export default function StaffLostAndFound() {
  // We can pass a prop like `userRole="staff"` if needed, but for Lost & Found
  // both Staff and Admin have the same permissions to report and claim items.
  return <AdminLostAndFound />
}
