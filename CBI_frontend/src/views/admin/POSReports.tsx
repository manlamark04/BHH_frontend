import React, { useState, useEffect, useMemo } from 'react'
import {
  Banknote,
  Calendar,
  Receipt,
  Search,
  ArrowRight,
  X
} from 'lucide-react'
import { posApi, type POSOrder, type POSOrderItem } from '../../api/pos'
import { showToast } from '../../context/ToastContext'

export default function POSReports() {
  const [orders, setOrders] = useState<POSOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  
  const [selectedOrder, setSelectedOrder] = useState<POSOrder | null>(null)
  const [orderItems, setOrderItems] = useState<POSOrderItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [dateFilter])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await posApi.getOrders(dateFilter)
      setOrders(data)
    } catch (err) {
      console.error(err)
      showToast.error('Failed to load POS orders')
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrder = async (order: POSOrder) => {
    setSelectedOrder(order)
    setLoadingItems(true)
    try {
      const items = await posApi.getOrderItems(order.id)
      setOrderItems(items)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingItems(false)
    }
  }

  const { totalSales, totalTransactions } = useMemo(() => {
    return {
      totalSales: orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + Number(o.total_amount), 0),
      totalTransactions: orders.length
    }
  }, [orders])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">POS Sales Reports</h1>
          <p className="text-sm text-neutral-500 mt-1">View point-of-sale transactions and daily totals</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="date" 
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-[#1A1D24] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/20 focus:border-[#6B7A5E] transition-all"
            />
          </div>
          <button onClick={() => setDateFilter('')} className="text-sm text-neutral-500 hover:text-neutral-700">Clear</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1A1D24] p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-500">Total Sales (Completed)</div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
              ₱{totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#1A1D24] p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-500">Total Transactions</div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
              {totalTransactions}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1A1D24] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Order No.</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Cashier</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">Loading orders...</td>
                </tr>
              ) : orders.map(order => (
                <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">
                    {order.order_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-500">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white">
                    {order.cashier_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-500">
                    {order.customer_name || 'Walk-in'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-medium uppercase">
                      {order.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                    ₱{Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleViewOrder(order)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-[#6B7A5E] hover:text-[#5A684D]"
                    >
                      View <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    No transactions found for the selected date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Receipt {selectedOrder.order_number}</h3>
                <p className="text-xs text-neutral-500">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {loadingItems ? (
                <div className="text-center text-neutral-500 py-8">Loading receipt details...</div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-neutral-50 dark:bg-[#121418] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                    {orderItems.map(item => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm text-neutral-900 dark:text-white">{item.product_name}</div>
                          <div className="text-xs text-neutral-500">{item.quantity} x ₱{Number(item.unit_price).toLocaleString()}</div>
                        </div>
                        <div className="font-semibold text-sm text-neutral-900 dark:text-white">
                          ₱{Number(item.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Payment Method</span>
                      <span className="font-medium text-neutral-900 dark:text-white uppercase">{selectedOrder.payment_method}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Cashier</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedOrder.cashier_name}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-neutral-100 dark:border-neutral-800/50">
                      <span className="text-neutral-900 dark:text-white">Total</span>
                      <span className="text-[#6B7A5E]">₱{Number(selectedOrder.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
