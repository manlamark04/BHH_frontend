import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  Coffee,
  X
} from 'lucide-react'
import { posApi, type POSProduct, type POSCategory, type CartItem } from '../../api/pos'
import { usersApi, type User as Customer } from '../../api/users'
import { showToast } from '../../context/ToastContext'
import Modal from '../../components/Modal'
import { OfficialReceiptModal } from '../../components/OfficialReceiptModal'
import { type OfficialReceiptData } from '../../api/billing'

export default function POSRegister({ staffName = 'Staff' }: { staffName?: string }) {
  const [products, setProducts] = useState<POSProduct[]>([])
  const [categories, setCategories] = useState<POSCategory[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'e-wallet' | 'room_charge'>('cash')
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  
  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [receiptData, setReceiptData] = useState<OfficialReceiptData | null>(null)
  
  // Variant selection states
  const [variantSelectionProduct, setVariantSelectionProduct] = useState<POSProduct | null>(null)
  const [productVariants, setProductVariants] = useState<any[]>([])
  const [currentVariantGroupIndex, setCurrentVariantGroupIndex] = useState(0)
  
  const groupedVariants = useMemo(() => {
    if (!productVariants || productVariants.length === 0) return []
    const groups = new Map<string, any[]>()
    productVariants.forEach(v => {
      const key = v.image || 'no-image'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(v)
    })
    return Array.from(groups.entries())
  }, [productVariants])

  // Keyboard navigation for variant modal
  useEffect(() => {
    if (!variantSelectionProduct || groupedVariants.length <= 1) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrentVariantGroupIndex(prev => prev === 0 ? groupedVariants.length - 1 : prev - 1)
      if (e.key === 'ArrowRight') setCurrentVariantGroupIndex(prev => (prev + 1) % groupedVariants.length)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [variantSelectionProduct, groupedVariants.length])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [prods, cats, custs] = await Promise.all([
        posApi.getProducts(),
        posApi.getCategories(),
        usersApi.getCustomers()
      ])
      // Filter out inactive products
      setProducts(prods.filter(p => p.status === 'active'))
      setCategories(cats)
      setCustomers(custs)
    } catch (err) {
      console.error(err)
      showToast.error('Failed to load POS data')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                           (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
      const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory
      return matchesSearch && matchesCat
    })
  }, [products, search, selectedCategory])

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.cart_quantity), 0)
  }, [cart])

  const handleProductClick = (product: POSProduct) => {
    if (product.stock_quantity <= 0) {
      showToast.error('Product is out of stock')
      return
    }

    const savedVariants = localStorage.getItem(`variants_${product.id}`)
    if (savedVariants) {
      const parsed = JSON.parse(savedVariants)
      if (parsed && parsed.length > 0) {
        setProductVariants(parsed)
        setCurrentVariantGroupIndex(0)
        setVariantSelectionProduct(product)
        return
      }
    }

    addToCart(product)
  }

  const addToCart = (product: POSProduct, variant?: any) => {
    const stockToUse = variant ? variant.stock : product.stock_quantity
    if (stockToUse <= 0) {
      showToast.error('Selected item is out of stock')
      return
    }

    const cartItemId = variant ? `${product.id}-${variant.id}` : product.id

    setCart(prev => {
      const existing = prev.find(item => ((item as any).cartItemId || item.id) === cartItemId)
      if (existing) {
        if (existing.cart_quantity >= stockToUse) {
          showToast.error(`Only ${stockToUse} left in stock`)
          return prev
        }
        return prev.map(item => 
          ((item as any).cartItemId || item.id) === cartItemId 
            ? { ...item, cart_quantity: item.cart_quantity + 1 }
            : item
        )
      }
      return [...prev, { ...product, cartItemId, selected_variant: variant, cart_quantity: 1 } as any]
    })
  }

  const updateQuantity = (cartItemId: string | number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        const idToMatch = (item as any).cartItemId || item.id
        if (idToMatch === cartItemId) {
          const stockToUse = (item as any).selected_variant ? (item as any).selected_variant.stock : item.stock_quantity
          const newQ = item.cart_quantity + delta
          if (newQ > stockToUse) {
            showToast.error(`Only ${stockToUse} left in stock`)
            return item
          }
          if (newQ < 1) return item
          return { ...item, cart_quantity: newQ }
        }
        return item
      })
    })
  }

  const removeFromCart = (cartItemId: string | number) => {
    setCart(prev => prev.filter(item => ((item as any).cartItemId || item.id) !== cartItemId))
  }

  const initiateCheckout = () => {
    if (cart.length === 0) return
    setPaymentAmount(cartTotal.toString())
    setPaymentNotes('')
    setShowPaymentModal(true)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    
    setProcessing(true)
    try {
      const res = await posApi.checkout({
        items: cart.map(c => ({ product_id: c.id, quantity: c.cart_quantity })),
        payment_method: paymentMethod,
        customer_id: selectedCustomer ? Number(selectedCustomer) : undefined,
        notes: paymentNotes
      })
      
      const customer = customers.find(c => c.id === Number(selectedCustomer))
      // Handle customer name depending on API response format
      const custName = customer 
        ? ((customer as any).full_name || [customer.first_name, customer.last_name].filter(Boolean).join(' ') || (customer as any).name || 'Guest Customer')
        : 'Walk-in Customer'
      
      // Decrement variant stock in localStorage
      cart.forEach(item => {
        const variantItem = item as any
        if (variantItem.selected_variant) {
          const savedVariantsStr = localStorage.getItem(`variants_${item.id}`)
          if (savedVariantsStr) {
            try {
              let variants = JSON.parse(savedVariantsStr)
              variants = variants.map((v: any) => {
                if (v.id === variantItem.selected_variant.id) {
                  return { ...v, stock: Math.max(0, v.stock - item.cart_quantity) }
                }
                return v
              })
              localStorage.setItem(`variants_${item.id}`, JSON.stringify(variants))
            } catch (e) {}
          }
        }
      })

      setReceiptData({
        receipt_number: `POS-${res.order_number}`,
        invoice_number: res.order_number,
        bill_id: res.order_id,
        payment_id: res.order_id,
        customer_name: custName,
        service_name: 'Store Purchase',
        items: cart.map(c => ({
          name: c.name,
          variant: (c as any).selected_variant ? `Size ${(c as any).selected_variant.size}` : undefined,
          quantity: c.cart_quantity,
          price: c.price,
          total: c.price * c.cart_quantity
        })),
        total_amount: cartTotal,
        previous_paid: 0,
        amount_paid: Number(paymentAmount) || cartTotal,
        remaining_balance: Math.max(0, cartTotal - (Number(paymentAmount) || cartTotal)),
        status: 'PAID',
        method: paymentMethod,
        notes: paymentNotes,
        staff_name: staffName,
        paid_at: new Date().toISOString()
      })
      
      showToast.success('Transaction completed')
      setCart([])
      setSelectedCustomer('')
      setPaymentMethod('cash')
      setShowPaymentModal(false)
      
      // Refresh inventory
      fetchData()
    } catch (err) {
      console.error(err)
      // Error toast is handled by api client
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Loading POS...</div>
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      
      {/* Left Area: Products Grid */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-neutral-200 dark:border-neutral-800 bg-[#FDFBF7] dark:bg-[#121418]">
        {/* Header & Search */}
        <div className="p-6 pb-0 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">POS Register</h1>
            <p className="text-sm text-neutral-500 mt-1">Process walk-in purchases</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search by name or barcode..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1A1D24] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/20 focus:border-[#6B7A5E] transition-all"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all' 
                  ? 'bg-[#6B7A5E] text-white' 
                  : 'bg-white dark:bg-[#1A1D24] text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-[#6B7A5E]/30'
              }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#6B7A5E] text-white' 
                    : 'bg-white dark:bg-[#1A1D24] text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-[#6B7A5E]/30'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => {
              const savedVariantsStr = localStorage.getItem(`variants_${product.id}`)
              let hasVariants = false
              let totalVariantStock = 0
              if (savedVariantsStr) {
                try {
                  const parsed = JSON.parse(savedVariantsStr)
                  if (parsed && parsed.length > 0) {
                    hasVariants = true
                    totalVariantStock = parsed.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
                  }
                } catch (e) {}
              }

              const displayedStock = hasVariants ? totalVariantStock : product.stock_quantity;
              const outOfStock = displayedStock <= 0;

              return (
                <button
                  key={product.id}
                  disabled={outOfStock}
                  onClick={() => handleProductClick(product)}
                  className={`relative flex flex-col bg-white dark:bg-[#1A1D24] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all text-left ${
                    outOfStock ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:border-[#6B7A5E]/50 hover:shadow-lg hover:-translate-y-1'
                  }`}
                >
                  <div className="h-32 bg-neutral-100 dark:bg-neutral-800 w-full flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Coffee className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <span className="text-xs font-semibold text-[#6B7A5E] uppercase tracking-wider mb-1">{product.category_name}</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-2 mb-2 leading-snug flex-1">{product.name}</span>
                    <div className="flex items-end justify-between mt-auto">
                      <span className="font-bold text-neutral-900 dark:text-white">₱{Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <div className="text-right flex flex-col items-end">
                        <span className={`text-xs font-medium ${displayedStock <= product.reorder_level ? 'text-rose-500' : 'text-neutral-500'}`}>
                          {displayedStock} left
                        </span>
                        {hasVariants && (
                          <span className="text-[10px] text-neutral-400 mt-0.5 leading-none">Multiple sizes available</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {outOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-[2px]">
                      <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">Out of Stock</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-neutral-400">
              <Search className="w-8 h-8 mb-3 opacity-20" />
              <p>No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Cart */}
      <div className="w-96 bg-white dark:bg-[#1A1D24] border-l border-neutral-200 dark:border-neutral-800 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-10">
        
        {/* Cart Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-[#FDFBF7]/50 dark:bg-[#1A1D24]/50">
          <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
            <ShoppingCart className="w-5 h-5 text-[#6B7A5E]" />
            Current Order
          </h2>
          {cart.length > 0 && (
            <button 
              onClick={() => setCart([])}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Customer Select (Optional) */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <select
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value ? Number(e.target.value) : '')}
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 dark:bg-[#121418] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/20 focus:border-[#6B7A5E] appearance-none"
            >
              <option value="">Walk-in Customer (Anonymous)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.full_name} ({c.unique_id})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-3">
              <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800/50 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 opacity-50" />
              </div>
              <p className="text-sm font-medium">Cart is empty</p>
            </div>
          ) : (
            cart.map(item => {
              const cartItemId = (item as any).cartItemId || item.id;
              const variant = (item as any).selected_variant;
              return (
                <div key={cartItemId} className="flex gap-3 bg-neutral-50 dark:bg-[#121418] p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800/50">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-neutral-900 dark:text-white truncate pr-2">
                      {item.name} {variant && <span className="text-neutral-500">({variant.size})</span>}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">₱{Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="font-semibold text-sm text-neutral-900 dark:text-white">
                      ₱{(item.price * item.cart_quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    
                    <div className="flex items-center gap-1 bg-white dark:bg-[#1A1D24] rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5 shadow-sm">
                      {item.cart_quantity > 1 ? (
                        <button onClick={() => updateQuantity(cartItemId, -1)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors text-neutral-500"><Minus className="w-3.5 h-3.5" /></button>
                      ) : (
                        <button onClick={() => removeFromCart(cartItemId)} className="p-1 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                      <span className="w-6 text-center text-xs font-semibold">{item.cart_quantity}</span>
                      <button onClick={() => updateQuantity(cartItemId, 1)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors text-neutral-500"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Checkout Section */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1A1D24] p-6 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500 font-medium">Subtotal</span>
              <span className="font-semibold text-neutral-900 dark:text-white">₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500 font-medium">Tax</span>
              <span className="font-semibold text-neutral-900 dark:text-white">₱0.00</span>
            </div>
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-end">
              <span className="text-base font-medium text-neutral-900 dark:text-neutral-300">Total</span>
              <span className="text-3xl font-bold text-[#6B7A5E]">₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all ${paymentMethod === 'cash' ? 'border-[#6B7A5E] bg-[#6B7A5E]/5 text-[#6B7A5E]' : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Cash</span>
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all ${paymentMethod === 'card' ? 'border-[#6B7A5E] bg-[#6B7A5E]/5 text-[#6B7A5E]' : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Card</span>
            </button>
            <button
              onClick={() => setPaymentMethod('e-wallet')}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all ${paymentMethod === 'e-wallet' ? 'border-[#6B7A5E] bg-[#6B7A5E]/5 text-[#6B7A5E]' : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
            >
              <Smartphone className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">E-Wallet</span>
            </button>
          </div>

          <button
            disabled={cart.length === 0 || processing}
            onClick={initiateCheckout}
            className="w-full bg-[#6B7A5E] hover:bg-[#5A684D] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold tracking-wide shadow-lg shadow-[#6B7A5E]/20 transition-all flex justify-center items-center gap-2"
          >
            {processing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Process Payment'
            )}
          </button>
        </div>
      </div>
      
      {/* ─── RECORD PAYMENT MODAL ─── */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment Transaction"
        size="md"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="p-4 bg-sand/40 border border-stone/20 rounded-2xl space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#6B7A5E]">TRANSACTION SUMMARY</span>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-stone/15">
              <span className="text-ink-muted">Total Bill Amount:</span>
              <span className="font-display font-bold text-xl text-[#6B7A5E]">
                ₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-semibold">
              <Banknote className="w-4 h-4" />
              <span>Settlement Mode</span>
            </div>
            <div className="px-2 py-1 bg-emerald-600 text-white text-[10px] uppercase tracking-wider font-bold rounded">
              {paymentMethod.replace('_', ' ')} PAYMENT
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-ink uppercase tracking-wider">Payment Received (₱) *</label>
              <input
                type="number"
                min={0}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-ink uppercase tracking-wider">Payment Date</label>
              <input
                type="text"
                disabled
                value={new Date().toLocaleDateString('en-GB')}
                className="w-full px-4 py-2.5 rounded-xl border border-stone/30 bg-neutral-50/50 text-ink-muted"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-ink uppercase tracking-wider">Remarks / Payment Notes</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. Exact amount, kept change"
              className="w-full px-4 py-2.5 rounded-xl border border-stone/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            />
          </div>

          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl flex justify-between items-center text-sm">
            <span className="font-semibold text-emerald-800 dark:text-emerald-400">Change:</span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
              ₱{Math.max(0, (Number(paymentAmount) || 0) - cartTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="px-6 py-2.5 rounded-xl text-ink font-semibold hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={processing || !paymentAmount}
              onClick={handleCheckout}
              className="px-6 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>

      <OfficialReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        receipt={receiptData}
      />

      {/* Variant Selection Modal */}
      {variantSelectionProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setVariantSelectionProduct(null)}>
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Select Variant</h3>
                <p className="text-sm text-neutral-500">{variantSelectionProduct.name}</p>
              </div>
              <button onClick={() => setVariantSelectionProduct(null)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center">
              {(() => {
                if (groupedVariants.length === 0) return null
                
                const [image, variants] = groupedVariants[currentVariantGroupIndex]
                const totalGroups = groupedVariants.length
                
                const handlePrev = () => setCurrentVariantGroupIndex(prev => prev === 0 ? totalGroups - 1 : prev - 1)
                const handleNext = () => setCurrentVariantGroupIndex(prev => (prev + 1) % totalGroups)

                return (
                  <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-center gap-6 w-full">
                      {/* Prev Button */}
                      {totalGroups > 1 ? (
                        <button onClick={handlePrev} className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-full transition-colors text-neutral-600 dark:text-neutral-300">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                      ) : <div className="w-10"></div>}

                      {/* Product Photo */}
                      <div className="w-48 h-48 shrink-0 bg-white dark:bg-[#1A1D24] rounded-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800 flex items-center justify-center p-3 shadow-sm">
                        {image !== 'no-image' ? (
                          <img src={image} alt="design" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                        ) : (
                          <Coffee className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
                        )}
                      </div>

                      {/* Next Button */}
                      {totalGroups > 1 ? (
                        <button onClick={handleNext} className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-full transition-colors text-neutral-600 dark:text-neutral-300">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      ) : <div className="w-10"></div>}
                    </div>
                    
                    <div className="mt-8 w-full max-w-lg">
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4 text-center">Select Size</h4>
                      <div className="flex flex-wrap justify-center gap-3">
                        {variants.map((variant: any) => {
                          const outOfStock = variant.stock <= 0
                          return (
                            <button
                              key={variant.id}
                              disabled={outOfStock}
                              onClick={() => {
                                addToCart(variantSelectionProduct, variant)
                                setVariantSelectionProduct(null)
                              }}
                              className={`flex flex-col items-center justify-center px-5 py-3 rounded-xl border transition-all min-w-[75px] ${
                                outOfStock 
                                  ? 'opacity-50 cursor-not-allowed border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/50' 
                                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1A1D24] hover:border-[#6B7A5E] hover:shadow-md hover:-translate-y-0.5'
                              }`}
                            >
                              <span className="font-bold text-sm text-neutral-900 dark:text-white">{variant.size}</span>
                              <span className={`text-[10px] uppercase font-bold mt-1 ${outOfStock ? 'text-rose-500' : 'text-[#6B7A5E]'}`}>
                                {outOfStock ? '0 left' : `${variant.stock} left`}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Position Indicator */}
                    {totalGroups > 1 && (
                      <div className="mt-8 flex gap-1.5 items-center justify-center">
                        {Array.from({ length: totalGroups }).map((_, i) => (
                           <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentVariantGroupIndex ? 'w-4 bg-[#6B7A5E]' : 'w-1.5 bg-neutral-300 dark:bg-neutral-700'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
