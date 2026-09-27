import { useState, useEffect } from 'react'
import { Tag, Plus, CheckCircle2, XCircle, Power, Loader2, Calendar, Trash2 } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { promosApi, PromoCode } from '../../api/promos'

export default function Promos() {
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [newCode, setNewCode] = useState('')
  const [newDiscount, setNewDiscount] = useState(10)
  const [newValidUntil, setNewValidUntil] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [promoToDelete, setPromoToDelete] = useState<PromoCode | null>(null)

  const { showToast } = useToast()

  const fetchPromos = async () => {
    try {
      setLoading(true)
      const data = await promosApi.getAllPromos()
      setPromos(data)
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch promo codes', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromos()
  }, [])

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCode || !newDiscount || !newValidUntil) return
    try {
      setSubmitting(true)
      await promosApi.createPromo({
        code: newCode,
        discount_percentage: newDiscount,
        valid_until: newValidUntil
      })
      showToast('Promo code created successfully!', 'success')
      setIsModalOpen(false)
      setNewCode('')
      setNewDiscount(10)
      setNewValidUntil('')
      fetchPromos()
    } catch (err: any) {
      showToast(err.message || 'Failed to create promo code', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (promo: PromoCode) => {
    const newStatus = promo.status === 'active' ? 'inactive' : 'active'
    
    // Optimistic UI update for instant feedback
    setPromos(prev => prev.map(p => p.id == promo.id ? { ...p, status: newStatus } : p))
    
    try {
      await promosApi.updatePromoStatus(promo.id, newStatus)
      showToast(`Promo code is now ${newStatus}`, 'success')
    } catch (err: any) {
      // Revert if API fails
      setPromos(prev => prev.map(p => p.id == promo.id ? { ...p, status: promo.status } : p))
      showToast(err.message || 'Failed to update status', 'error')
    }
  }

  const handleDeletePromo = async () => {
    if (!promoToDelete) return
    const idToDelete = promoToDelete.id
    
    // Optimistic UI update
    setPromos(prev => prev.filter(p => p.id != idToDelete))
    setPromoToDelete(null)
    
    try {
      await promosApi.deletePromo(idToDelete)
      showToast('Promo code deleted', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to delete promo code', 'error')
      fetchPromos() // Re-fetch to restore state if deletion failed
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B7A5E]" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5 max-w-6xl mx-auto space-y-5 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-neutral-900 dark:text-white">Promo & Discounts</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Manage seasonal promo codes and apply discounts to bookings.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#6B7A5E] text-white rounded-lg text-sm font-semibold hover:bg-[#5a664e] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Promo Code
        </button>
      </div>

      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.08] dark:border-white/[0.08] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-black/[0.08] dark:border-white/[0.08]">
                <th className="px-4 py-3 text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Promo Code</th>
                <th className="px-4 py-3 text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Discount</th>
                <th className="px-4 py-3 text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Valid Until</th>
                <th className="px-4 py-3 text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {promos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    No promo codes found. Create one to get started!
                  </td>
                </tr>
              ) : promos.map((promo) => {
                const isExpired = new Date(promo.valid_until) < new Date()
                return (
                  <tr key={promo.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                        <span className="font-mono font-bold text-neutral-900 dark:text-white uppercase tracking-wider">{promo.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      {promo.discount_percentage}% OFF
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(promo.valid_until).toLocaleDateString()}
                        {isExpired && <span className="text-xs text-rose-500 font-medium ml-1">(Expired)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        promo.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                      }`}>
                        {promo.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {promo.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleStatus(promo)}
                          title={promo.status === 'active' ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            promo.status === 'active'
                              ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPromoToDelete(promo)}
                          title="Delete Promo"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-[#1C1F26] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-black/[0.08] dark:border-white/[0.08]">
              <h2 className="text-xl font-bold font-display text-neutral-900 dark:text-white">Create Promo Code</h2>
            </div>
            
            <form onSubmit={handleCreatePromo} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER20"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#181B20] border border-black/[0.1] dark:border-white/[0.1] rounded-xl text-sm font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E] uppercase"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Discount %</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#181B20] border border-black/[0.1] dark:border-white/[0.1] rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Valid Until</label>
                <input
                  type="date"
                  required
                  value={newValidUntil}
                  onChange={(e) => setNewValidUntil(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#181B20] border border-black/[0.1] dark:border-white/[0.1] rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm font-bold text-white bg-[#6B7A5E] hover:bg-[#5a664e] rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!promoToDelete}
        title="Delete Promo Code"
        message={`Are you sure you want to permanently delete the promo code "${promoToDelete?.code}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeletePromo}
        onCancel={() => setPromoToDelete(null)}
      />
    </div>
  )
}
