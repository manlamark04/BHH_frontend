import { useState, useEffect, useMemo } from 'react'
import { Search, Coffee, Store as StoreIcon } from 'lucide-react'
import { posApi, type POSProduct, type POSCategory } from '../../api/pos'
import { useToast } from '../../context/ToastContext'

export default function CustomerStore() {
  const [products, setProducts] = useState<POSProduct[]>([])
  const [categories, setCategories] = useState<POSCategory[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const showToast = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [prods, cats] = await Promise.all([
        posApi.getProducts(),
        posApi.getCategories()
      ])
      // Only show active products for guests
      setProducts(prods.filter(p => p.status === 'active'))
      setCategories(cats)
    } catch (err) {
      console.error(err)
      showToast.error('Failed to load store items')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
      const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategory])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <div className="w-8 h-8 border-2 border-[#6B7A5E] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading store...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-[#1A1D24] p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <StoreIcon className="w-6 h-6 text-[#6B7A5E]" />
            Snacks & Beverages
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Browse our available items. Please proceed to the front desk to purchase.
          </p>
        </div>

        <div className="w-full sm:w-auto flex-shrink-0 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search products..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-72 pl-9 pr-4 py-2 bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/20 focus:border-[#6B7A5E] transition-all"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === 'all' 
              ? 'bg-[#6B7A5E] text-white shadow-md shadow-[#6B7A5E]/20' 
              : 'bg-white dark:bg-[#1A1D24] text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-[#6B7A5E]/30'
          }`}
        >
          All Items
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-[#6B7A5E] text-white shadow-md shadow-[#6B7A5E]/20' 
                : 'bg-white dark:bg-[#1A1D24] text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-[#6B7A5E]/30'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredProducts.map(product => {
          const outOfStock = product.stock_quantity <= 0;
          return (
            <div
              key={product.id}
              className={`relative flex flex-col bg-white dark:bg-[#1A1D24] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all text-left ${
                outOfStock ? 'opacity-50 grayscale' : 'hover:border-[#6B7A5E]/50 hover:shadow-lg'
              }`}
            >
              <div className="h-40 bg-neutral-100 dark:bg-neutral-800 w-full flex items-center justify-center">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Coffee className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <span className="text-xs font-semibold text-[#6B7A5E] uppercase tracking-wider mb-1.5">{product.category_name}</span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-2 mb-3 leading-snug flex-1">{product.name}</span>
                <div className="flex items-end justify-between mt-auto">
                  <span className="font-bold text-lg text-neutral-900 dark:text-white">₱{Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className={`text-xs font-medium ${product.stock_quantity <= product.reorder_level ? 'text-rose-500' : 'text-neutral-500'}`}>
                    {outOfStock ? 'Out of Stock' : `${product.stock_quantity} left`}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-[#1A1D24] rounded-2xl border border-neutral-200 dark:border-neutral-800 border-dashed text-neutral-400">
          <StoreIcon className="w-10 h-10 mb-4 opacity-20" />
          <p className="font-medium">No items found</p>
          <p className="text-sm opacity-60">Try selecting a different category or adjusting your search.</p>
        </div>
      )}
    </div>
  )
}
