import { api } from './client'

export interface POSCategory {
  id: number
  name: string
  description?: string
  created_at?: string
  updated_at?: string
}

export interface POSProduct {
  id: number
  category_id: number
  category_name?: string
  name: string
  sku?: string
  barcode?: string
  description?: string
  price: number
  stock_quantity: number
  reorder_level: number
  image_url?: string
  status: 'active' | 'inactive'
  created_at?: string
  updated_at?: string
}

export interface CartItem extends POSProduct {
  cart_quantity: number
}

export interface POSOrder {
  id: number
  order_number: string
  cashier_id: number
  cashier_name?: string
  customer_id?: number
  customer_name?: string
  total_amount: number
  payment_method: 'cash' | 'card' | 'e-wallet' | 'room_charge'
  status: 'completed' | 'refunded' | 'cancelled'
  notes?: string
  created_at: string
}

export interface POSOrderItem {
  id: number
  order_id: number
  product_id: number
  product_name?: string
  quantity: number
  unit_price: number
  subtotal: number
}

export const posApi = {
  // Categories
  getCategories: () => api.get<POSCategory[]>('/api/pos/categories'),
  createCategory: (data: Partial<POSCategory>) => 
    api.post<POSCategory>('/api/pos/categories', data, { showSuccessToast: true, successMessage: 'Category created' }),
    
  // Products
  getProducts: () => api.get<POSProduct[]>('/api/pos/products'),
  createProduct: (data: FormData | Partial<POSProduct>) => 
    api.post<{ message: string, id: number }>('/api/pos/products', data, { showSuccessToast: true, successMessage: 'Product created' }),
  updateProduct: (id: number, data: FormData | Partial<POSProduct>) => 
    api.put<{ message: string }>(`/api/pos/products/${id}`, data, { showSuccessToast: true, successMessage: 'Product updated' }),
  updateStock: (id: number, adjustment: number) => 
    api.patch<{ message: string }>(`/api/pos/products/${id}/stock`, { adjustment }, { showSuccessToast: true, successMessage: 'Stock updated' }),
    
  // Checkout
  checkout: (data: { items: { product_id: number, quantity: number }[], payment_method: string, customer_id?: number, notes?: string }) => 
    api.post<{ message: string, order_id: number, order_number: string }>('/api/pos/checkout', data, { showSuccessToast: true, successMessage: 'Checkout successful' }),
    
  // Reporting
  getOrders: (date?: string) => api.get<POSOrder[]>(`/api/pos/orders${date ? `?date=${date}` : ''}`),
  getOrderItems: (orderId: number) => api.get<POSOrderItem[]>(`/api/pos/orders/${orderId}/items`),
  
  // Guest
  getMyOrders: () => api.get<(POSOrder & { items: POSOrderItem[] })[]>('/api/pos/orders/me')
}
