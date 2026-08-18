export type Role = 'admin' | 'staff' | 'customer'

export type AccountStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'REJECTED'

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_APPROVAL'
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CHECKED-IN'
  | 'CHECKED-OUT'
  | 'CANCELLED'
  | 'REJECTED'
  | 'COMPLETED'

export type RoomStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'OCCUPIED'
  | 'CLEANING'
  | 'MAINTENANCE'
  | 'UNAVAILABLE'

export type PaymentStatus = 'UNPAID' | 'PARTIALLY PAID' | 'PAID' | 'REFUNDED' | 'CANCELLED'

export type RentalStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_APPROVAL'
  | 'PENDING'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'OVERDUE'

export interface User {
  id: string
  userId: string
  name: string
  email: string
  role: Role
  status: AccountStatus
  createdAt: string
  lastLogin: string
  firstLogin: boolean
}

export interface Customer {
  customerId: string
  userId: string
  firstName: string
  middleName: string
  lastName: string
  contact: string
  email: string
  address: string
  dob: string
  gender: string
  civilStatus: string
  createdBy: string
  createdAt: string
}

export interface Staff {
  staffId: string
  userId: string
  firstName: string
  lastName: string
  contact: string
  email: string
  position: string
}

export interface Room {
  roomId: string
  roomNumber: string
  roomType: string
  name: string
  description: string
  price: number
  capacity: number
  amenities: string[]
  image: string
  status: RoomStatus
}

export interface Booking {
  bookingId: string
  customerId: string
  customerName: string
  roomId: string
  roomName: string
  checkIn: string
  checkOut: string
  nights: number
  totalAmount: number
  status: BookingStatus
  createdAt: string
  acceptedBy?: string
  actualCheckIn?: string
  actualCheckOut?: string
  isNoShow?: boolean
}

export interface Activity {
  activityId: string
  name: string
  description: string
  price: number
  unit: string
  duration: string
  image: string
  status: 'AVAILABLE' | 'UNAVAILABLE'
}

export interface ActivityRental {
  rentalId: string
  customerId: string
  customerName: string
  activityId: string
  activityName: string
  date: string
  startTime: string
  duration: number
  quantity: number
  totalAmount: number
  status: RentalStatus
}

export interface Bill {
  billId: string
  customerId: string
  customerName: string
  bookingId?: string
  rentalId?: string
  subtotal: number
  additionalCharges: number
  discount: number
  totalAmount: number
  amountPaid: number
  balance: number
  paymentStatus: PaymentStatus
  createdBy: string
  createdAt: string
}

export interface Transaction {
  transactionId: string
  customerId: string
  customerName: string
  billId: string
  type: string
  amount: number
  paymentMethod: string
  status: PaymentStatus
  processedBy: string
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  createdAt: string
}

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  module: string
  description: string
  createdAt: string
}

export type ServiceStatus = 'AVAILABLE' | 'UNAVAILABLE'

export interface Service {
  serviceId: string
  name: string
  category: string
  description: string
  price: number
  unit: string
  image: string
  status: ServiceStatus
}

export type View =
  | 'landing'
  | 'login'
  | 'register'
  | 'customer-dashboard'
  | 'customer-rooms'
  | 'customer-activities'
  | 'customer-motorcycles'
  | 'customer-pickleball'
  | 'customer-transactions'
  | 'customer-profile'
  | 'staff-dashboard'
  | 'staff-bookings'
  | 'staff-rooms'
  | 'staff-walkin'
  | 'staff-motorcycles'
  | 'staff-pickleball'
  | 'staff-billing'
  | 'staff-customers'
  | 'admin-dashboard'
  | 'admin-bookings'
  | 'admin-users'
  | 'admin-rooms'
  | 'admin-guests'
  | 'admin-reports'
  | 'admin-audit'
  | 'admin-services'
  | 'admin-checkinout'
  | 'admin-payments'
  | 'staff-checkinout'
