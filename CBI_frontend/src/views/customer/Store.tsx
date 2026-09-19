import { useState, useEffect, useMemo } from 'react'
import { Search, Coffee, Store as StoreIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { posApi, type POSProduct, type POSCategory } from '../../api/pos'
import { useToast } from '../../context/ToastContext'
import { migrateVariants } from '../../utils/variantMigration'

export default function CustomerStore() {
  const [products, setProducts] = useState<POSProduct[]>([])
  const [categories, setCategories] = useState<POSCategory[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [selectedProduct, setSelectedProduct] = useState<POSProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [productVariants, setProductVariants] = useState<any[]>([])
  const [selectedVariantSize, setSelectedVariantSize] = useState<string | null>(null)
  const showToast = useToast()

  // Grouped variants for carousel
  const groupedVariants = useMemo<any[]>(() => {
    if (!selectedProduct) return []
    if (productVariants.length === 0) {
      return [{
         id: 'default',
         image: selectedProduct.image_url,
         name: selectedProduct.name,
         price: selectedProduct.price,
         sizes: {}
      }]
    }
    return productVariants
  }, [productVariants, selectedProduct])

  // Reset index when product changes
  useEffect(() => {
    setCurrentImageIndex(0)
    if (selectedProduct) {
      const saved = localStorage.getItem(`variants_${selectedProduct.id}`)
      if (saved) {
        try {
          let variants = JSON.parse(saved)
          variants = migrateVariants(variants, selectedProduct.id)
          setProductVariants(variants)
          if (variants.length > 0 && variants[0].sizes) {
            const firstSizes = Object.keys(variants[0].sizes)
            if (firstSizes.length > 0) {
              setSelectedVariantSize(firstSizes[0])
            }
          }
        } catch (e) {
          setProductVariants([])
          setSelectedVariantSize(null)
        }
      } else {
        setProductVariants([])
        setSelectedVariantSize(null)
      }
    } else {
      setProductVariants([])
      setSelectedVariantSize(null)
    }
  }, [selectedProduct])

  useEffect(() => {
    if (groupedVariants.length > 0 && groupedVariants[currentImageIndex]?.sizes) {
      const sizes = Object.keys(groupedVariants[currentImageIndex].sizes)
      if (sizes.length > 0 && (!selectedVariantSize || !sizes.includes(selectedVariantSize))) {
        setSelectedVariantSize(sizes[0])
      }
    }
  }, [currentImageIndex, groupedVariants])

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
            Convenience Store
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
          const savedVariantsStr = localStorage.getItem(`variants_${product.id}`)
          let hasVariants = !!product.has_variants
          let totalVariantStock = 0
          if (hasVariants && savedVariantsStr) {
            try {
              const parsed = JSON.parse(savedVariantsStr)
              const migrated = migrateVariants(parsed, product.id)
              if (migrated && migrated.length > 0) {
                totalVariantStock = migrated.reduce((sum: number, v: any) => {
                  const sizesStock = v.sizes ? Object.values(v.sizes).reduce((a: number, b: any) => a + (Number(b) || 0), 0) : 0
                  return sum + sizesStock
                }, 0)
              }
            } catch (e) {}
          }

          const displayedStock = hasVariants ? totalVariantStock : product.stock_quantity;
          const outOfStock = displayedStock <= 0;

          return (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className={`relative flex flex-col bg-white dark:bg-[#1A1D24] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all text-left group focus:outline-none focus:ring-2 focus:ring-[#6B7A5E] ${
                outOfStock ? 'opacity-50 grayscale' : 'hover:border-[#6B7A5E]/50 hover:shadow-lg'
              }`}
            >
              <div className="h-40 bg-neutral-100 dark:bg-neutral-800 w-full flex items-center justify-center group-hover:opacity-90 transition-opacity">
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
                  <div className="text-right flex flex-col items-end">
                    <span className={`text-xs font-medium ${displayedStock <= product.reorder_level ? 'text-rose-500' : 'text-neutral-500'}`}>
                      {outOfStock ? 'Out of Stock' : `${displayedStock} left`}
                    </span>
                    {hasVariants && (
                      <span className="text-[10px] text-neutral-400 mt-0.5 leading-none">Multiple options available</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
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
      
      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="relative h-64 bg-white dark:bg-neutral-800 w-full flex items-center justify-center p-4 group/image">
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-black/50 dark:hover:bg-black/90 rounded-full transition-colors text-neutral-900 dark:text-white z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              {groupedVariants[currentImageIndex]?.image ? (
                <img key={currentImageIndex} src={groupedVariants[currentImageIndex].image} alt={selectedProduct.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
              ) : (
                <Coffee className="w-12 h-12 text-neutral-300 dark:text-neutral-600" />
              )}

              {/* Carousel Arrows */}
              {groupedVariants.length > 1 && (
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentImageIndex(prev => prev === 0 ? groupedVariants.length - 1 : prev - 1)
                    }}
                    className="w-10 h-10 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur shadow-lg flex items-center justify-center text-neutral-900 dark:text-white pointer-events-auto hover:bg-white dark:hover:bg-black transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentImageIndex(prev => prev === groupedVariants.length - 1 ? 0 : prev + 1)
                    }}
                    className="w-10 h-10 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur shadow-lg flex items-center justify-center text-neutral-900 dark:text-white pointer-events-auto hover:bg-white dark:hover:bg-black transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              )}

              {/* Image Indicators */}
              {groupedVariants.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                  {groupedVariants.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        idx === currentImageIndex 
                          ? 'bg-[#6B7A5E] w-4' 
                          : 'bg-white/60 dark:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Details Section */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <span className="text-xs font-semibold text-[#6B7A5E] uppercase tracking-wider mb-2 block">{selectedProduct.category_name}</span>
                {(() => {
                  const currentVariant = groupedVariants[currentImageIndex]
                  const displayName = currentVariant?.name || selectedProduct.name
                  const displayPrice = currentVariant?.price !== undefined ? currentVariant.price : selectedProduct.price
                  
                  return (
                    <>
                      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">{displayName}</h2>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xl font-bold text-neutral-900 dark:text-white">₱{Number(displayPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        {(() => {
                          let displayedStock = selectedProduct.stock_quantity;
                          if (selectedVariantSize && currentVariant?.sizes) {
                            const stock = currentVariant.sizes[selectedVariantSize];
                            if (stock !== undefined) displayedStock = stock;
                          }
                          
                          return (
                            <span className={`text-sm font-medium px-3 py-1 rounded-full ${displayedStock <= 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {displayedStock <= 0 ? 'Out of Stock' : `${displayedStock} in stock`}
                            </span>
                          )
                        })()}
                      </div>
                    </>
                  )
                })()}
              </div>
              
              {/* Variants Section - Visible for products with variants */}
              {selectedProduct.has_variants && (
                <div className="space-y-6 border-t border-neutral-200 dark:border-neutral-800 pt-6">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Select Option</h3>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const currentVariant = groupedVariants[currentImageIndex]
                        const sizes = currentVariant?.sizes ? Object.keys(currentVariant.sizes) : []
                        if (sizes.length === 0) return null

                        return (
                          <div className="grid grid-cols-4 gap-2 w-full">
                            {sizes.map(size => {
                              const stock = currentVariant.sizes[size]
                              const isOutOfStock = stock <= 0
                              const isSelected = selectedVariantSize === size
                              
                              return (
                                <button
                                  key={size}
                                  disabled={isOutOfStock}
                                  onClick={() => setSelectedVariantSize(size)}
                                  className={`py-2 rounded-xl text-sm font-semibold transition-all border-2
                                    ${isSelected 
                                      ? 'border-[#6B7A5E] bg-[#6B7A5E] text-white shadow-md' 
                                      : isOutOfStock 
                                        ? 'border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#121418] text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1A1D24] text-neutral-700 dark:text-neutral-300 hover:border-[#6B7A5E] hover:text-[#6B7A5E]'
                                    }
                                  `}
                                >
                                  {size}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {selectedProduct.description && (
                <div className="mt-6 border-t border-neutral-200 dark:border-neutral-800 pt-6">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">Description</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-sm text-center text-neutral-500">
                  Please proceed to the front desk to purchase this item.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
