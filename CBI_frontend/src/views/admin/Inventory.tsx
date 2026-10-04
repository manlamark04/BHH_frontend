import React, { useState, useEffect } from 'react'
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  FolderTree,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { posApi, type POSProduct, type POSCategory } from '../../api/pos'
import { showToast, useToast } from '../../context/ToastContext'
import { migrateVariants } from '../../utils/variantMigration'

export default function Inventory() {
  const [products, setProducts] = useState<POSProduct[]>([])
  const [categories, setCategories] = useState<POSCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products')

  // Guided flow state
  const [productFormStep, setProductFormStep] = useState<1 | 2>(1)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [hasVariantsSelection, setHasVariantsSelection] = useState<boolean | null>(null)
  const [hasMainImage, setHasMainImage] = useState(false)
  
  // Temporary variant state during creation flow
  const [tempVariantSizes, setTempVariantSizes] = useState<{size: string, stock: number}[]>([])
  
  // Modals state
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Partial<POSProduct> | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<POSProduct | null>(null)
  
  // Mock variants state for UI demonstration
  const [mockVariants, setMockVariants] = useState<any[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)

  // Load variants when product is selected
  useEffect(() => {
    if (selectedProduct && selectedProduct.has_variants) {
      const saved = localStorage.getItem(`variants_${selectedProduct.id}`)
      if (saved) {
        try {
          let parsed = JSON.parse(saved)
          parsed = migrateVariants(parsed, selectedProduct.id)
          setMockVariants(parsed)
        } catch (e) {
          setMockVariants([])
        }
      } else {
        setMockVariants([])
      }
    }
  }, [selectedProduct])

  // Save variants whenever they change
  useEffect(() => {
    if (selectedProduct) {
      try {
        localStorage.setItem(`variants_${selectedProduct.id}`, JSON.stringify(mockVariants))
      } catch (err) {
        console.error('Failed to save variants:', err)
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          showToast.error('Storage limit exceeded. Try using smaller images for variants.')
        }
      }
    }
  }, [mockVariants, selectedProduct])
  
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prods, cats] = await Promise.all([
        posApi.getProducts(),
        posApi.getCategories()
      ])
      setProducts(prods)
      setCategories(cats)
    } catch (err) {
      console.error(err)
      showToast.error('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      await posApi.createCategory({
        name: formData.get('name') as string,
        description: formData.get('description') as string
      })
      setShowCategoryModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      if (editingProduct?.id) {
        await posApi.updateProduct(editingProduct.id, formData)
      } else {
        await posApi.createProduct(formData)
      }
      setShowProductModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Loading Inventory...</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">POS Inventory</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage products, categories, and stock levels</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-xl inline-flex">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'categories' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Categories
            </button>
          </div>
          
          <button 
            onClick={() => {
              if (activeTab === 'products') {
                setEditingProduct(null)
                setProductFormStep(1)
                setHasVariantsSelection(null)
                setShowAdvancedSettings(false)
                setMockVariants([])
                setTempVariantSizes([])
                setHasMainImage(false)
                setShowProductModal(true)
              } else {
                setShowCategoryModal(true)
              }
            }}
            className="flex items-center gap-2 bg-[#6B7A5E] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#5A684D] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add {activeTab === 'products' ? 'Product' : 'Category'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1A1D24] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        
        {activeTab === 'products' && (
          <>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-[#FDFBF7]/50 dark:bg-[#1A1D24]/50">
              <div className="relative w-full sm:w-72 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#121418] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/20 focus:border-[#6B7A5E] transition-all"
                />
              </div>

              <div className="flex overflow-x-auto gap-2 pb-1 sm:pb-0 scrollbar-hide max-w-full">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
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
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-[#6B7A5E] text-white shadow-md shadow-[#6B7A5E]/20' 
                        : 'bg-white dark:bg-[#1A1D24] text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-[#6B7A5E]/30'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-[#FDFBF7]/30 dark:bg-[#1A1D24]/30">
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
                  const isLowStock = displayedStock <= product.reorder_level;
                  const outOfStock = displayedStock <= 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product)
                        setEditingProduct(product)
                        setProductFormStep(1)
                        setHasVariantsSelection(!!product.has_variants)
                        setShowAdvancedSettings(false)
                        setTempVariantSizes([])
                        setHasMainImage(!!product.image_url)
                        setShowProductModal(true)
                      }}
                      className={`relative flex flex-col bg-white dark:bg-[#1A1D24] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all text-left group cursor-pointer ${
                        outOfStock ? 'opacity-70 grayscale-[0.5]' : 'hover:border-[#6B7A5E]/50 hover:shadow-lg'
                      }`}
                    >
                      {/* Actions overlay */}
                      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation()
                             setSelectedProduct(product)
                             setEditingProduct(product)
                             setProductFormStep(1)
                             setHasVariantsSelection(!!product.has_variants)
                             setShowAdvancedSettings(false)
                             setTempVariantSizes([])
                             setHasMainImage(!!product.image_url)
                             setShowProductModal(true)
                           }}
                           className="p-2 bg-white/90 dark:bg-black/90 text-neutral-700 dark:text-neutral-300 hover:text-[#6B7A5E] rounded-xl shadow-sm backdrop-blur-sm transition-colors"
                           title="Edit Product"
                         >
                           <Edit2 className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={async (e) => {
                             e.stopPropagation()
                             if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
                               try {
                                 await posApi.deleteProduct(product.id)
                                 fetchData()
                               } catch (err) {
                                 console.error(err)
                               }
                             }
                           }}
                           className="p-2 bg-white/90 dark:bg-black/90 text-neutral-700 dark:text-neutral-300 hover:text-rose-500 rounded-xl shadow-sm backdrop-blur-sm transition-colors"
                           title="Delete Product"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>

                      <div className="h-40 bg-white dark:bg-neutral-800 w-full flex items-center justify-center p-4">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                        ) : (
                          <Package className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-xs font-semibold text-[#6B7A5E] uppercase tracking-wider">{product.category_name}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            product.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}>
                            {product.status}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-2 mb-3 leading-snug flex-1">{product.name}</span>
                        <div className="flex items-end justify-between mt-auto">
                          <span className="font-bold text-lg text-neutral-900 dark:text-white">₱{Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <div className="text-right flex flex-col items-end">
                            <span className={`text-xs font-medium flex items-center gap-1 ${isLowStock ? 'text-rose-500' : 'text-neutral-500'}`}>
                              {isLowStock && !outOfStock && <AlertTriangle className="w-3 h-3" />}
                              {outOfStock ? 'Out of Stock' : `${displayedStock} left`}
                            </span>
                            {hasVariants && (
                              <span className="text-[10px] text-neutral-400 mt-0.5 leading-none">Multiple options available</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-[#1A1D24] rounded-2xl border border-neutral-200 dark:border-neutral-800 border-dashed text-neutral-400">
                  <Package className="w-10 h-10 mb-4 opacity-20" />
                  <p className="font-medium">No products found</p>
                  <p className="text-sm opacity-60">Add your first product to get started.</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'categories' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
                  <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Category Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Products</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FolderTree className="w-5 h-5 text-neutral-400" />
                        <span className="font-medium text-neutral-900 dark:text-white">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                      {cat.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500 text-right">
                      {products.filter(p => p.category_id === cat.id).length}
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-neutral-500">
                      No categories found. Create a category to start adding products.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unified Product Modal — 2-Step Guided Flow */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white dark:bg-[#1A1D24] z-10">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
                {productFormStep === 2 && <span className="text-sm font-normal text-neutral-500">· Step 2</span>}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="productForm" onSubmit={handleSaveProduct} className="space-y-6">
                
                {/* ── STEP 1: Basic Info ── */}
                <div className={`space-y-6 ${productFormStep === 1 ? 'block' : 'hidden'}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Product Name *</label>
                      <input required name="name" defaultValue={editingProduct?.name} type="text" placeholder="e.g. Red Horse 1L" className="w-full px-3 py-2.5 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]" />
                    </div>
                    
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Category *</label>
                      <select required name="category_id" defaultValue={editingProduct?.category_id || ''} className="w-full px-3 py-2.5 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]">
                        <option value="" disabled>Select category...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="col-span-2 space-y-3 mt-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Does this product come in different sizes or designs?</label>
                      <div className="space-y-2">
                        <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${hasVariantsSelection === false ? 'border-[#6B7A5E] bg-[#6B7A5E]/5' : 'border-neutral-200 dark:border-neutral-700 hover:border-[#6B7A5E]/50'}`}>
                          <input type="radio" name="has_variants" value="false" checked={hasVariantsSelection === false} onChange={() => setHasVariantsSelection(false)} className="w-4 h-4 text-[#6B7A5E] focus:ring-[#6B7A5E] border-neutral-300" />
                          <span className="ml-3 text-sm font-medium text-neutral-900 dark:text-white">No — simple stock item (e.g. beverages, snacks)</span>
                        </label>
                        <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${hasVariantsSelection === true ? 'border-[#6B7A5E] bg-[#6B7A5E]/5' : 'border-neutral-200 dark:border-neutral-700 hover:border-[#6B7A5E]/50'}`}>
                          <input type="radio" name="has_variants" value="true" checked={hasVariantsSelection === true} onChange={() => setHasVariantsSelection(true)} className="w-4 h-4 text-[#6B7A5E] focus:ring-[#6B7A5E] border-neutral-300" />
                          <span className="ml-3 text-sm font-medium text-neutral-900 dark:text-white">Yes — has sizes/designs (e.g. shirts, bags)</span>
                        </label>
                      </div>
                    </div>

                    {hasVariantsSelection === false && (
                      <div className="col-span-2 pt-2">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Price (₱) *</label>
                        <input required name="price" defaultValue={editingProduct?.price || ''} type="number" step="0.01" min="0" placeholder="0.00" className="w-full px-3 py-2.5 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]" />
                      </div>
                    )}

                    <div className="col-span-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 mt-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Product Image (Optional)</label>
                      <input name="image" type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => setHasMainImage((e.target.files?.length ?? 0) > 0)} className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E] file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#6B7A5E]/10 file:text-[#6B7A5E] hover:file:bg-[#6B7A5E]/20" />
                      {editingProduct?.image_url && (
                        <p className="mt-1 text-xs text-neutral-500 truncate">Current: {editingProduct.image_url.split('/').pop()}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button 
                      type="button" 
                      disabled={hasVariantsSelection === null}
                      onClick={() => {
                         if (hasVariantsSelection !== null) setProductFormStep(2);
                      }} 
                      className="px-6 py-2.5 bg-[#6B7A5E] text-white text-sm font-medium rounded-xl hover:bg-[#5A684D] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>

                {/* ── STEP 2a: Simple Product ── */}
                {productFormStep === 2 && hasVariantsSelection === false && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Stock Quantity *</label>
                        <input required name="stock_quantity" defaultValue={editingProduct?.stock_quantity ?? 0} type="number" min="0" className="w-full px-3 py-2.5 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]" />
                      </div>
                    </div>

                    {/* Collapsible Advanced Settings */}
                    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-neutral-50/50 dark:bg-[#121418]/50">
                      <button 
                        type="button" 
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#1A1D24] transition-colors"
                      >
                        Advanced Settings
                        {showAdvancedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      
                      {showAdvancedSettings && (
                        <div className="p-4 pt-2 grid grid-cols-2 gap-4 border-t border-neutral-200 dark:border-neutral-800">
                           <div>
                             <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Reorder Level</label>
                             <input name="reorder_level" defaultValue={editingProduct?.reorder_level ?? 5} type="number" min="0" className="w-full px-3 py-2 bg-white dark:bg-[#1A1D24] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E]" />
                           </div>
                           <div>
                             <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Status</label>
                             <select name="status" defaultValue={editingProduct?.status || 'active'} className="w-full px-3 py-2 bg-white dark:bg-[#1A1D24] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E]">
                               <option value="active">Active</option>
                               <option value="inactive">Inactive</option>
                             </select>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── STEP 2b: Variant Product ── */}
                {productFormStep === 2 && hasVariantsSelection === true && (
                  <div className="space-y-8">
                    {/* Inline Design Builder */}
                    <div id="variant-builder" className="bg-neutral-50 dark:bg-[#121418] p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{editingVariantId ? 'Edit Design' : 'Add a Design'}</h4>
                        {editingVariantId && (
                          <button type="button" onClick={() => {
                            setEditingVariantId(null)
                            setTempVariantSizes([])
                            ;(document.getElementById('v_name') as HTMLInputElement).value = ''
                            ;(document.getElementById('v_price') as HTMLInputElement).value = ''
                          }} className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors underline">
                            Cancel Edit
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Variant Name *</label>
                          <input id="v_name" type="text" placeholder="e.g. White Cambacay Shirt" className="w-full px-3 py-2 bg-white dark:bg-[#1A1D24] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E]" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Variant Price (₱) *</label>
                          <input id="v_price" type="number" step="0.01" min="0" placeholder="e.g. 500.00" className="w-full px-3 py-2 bg-white dark:bg-[#1A1D24] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E]" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Design Picture</label>
                          <input id="v_image" type="file" accept="image/*" className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#6B7A5E]/10 file:text-[#6B7A5E] hover:file:bg-[#6B7A5E]/20" />
                          {!hasMainImage && mockVariants.length === 0 && !editingProduct?.image_url && (
                            <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded inline-block font-medium border border-emerald-100 dark:border-emerald-500/20">
                              * This photo will also be used as your product's main image in the inventory list, since none was set yet.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Dynamic Size Rows */}
                      <div className="space-y-3">
                         <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Which sizes does this come in? (Leave empty if no specific sizes)</label>
                         
                         {tempVariantSizes.map((s, idx) => (
                           <div key={idx} className="flex gap-3 items-end">
                             <div className="flex-1">
                               <label className="block text-[10px] text-neutral-500 mb-1">Size (Optional)</label>
                               <input type="text" value={s.size} onChange={e => {
                                 const next = [...tempVariantSizes]
                                 next[idx].size = e.target.value
                                 setTempVariantSizes(next)
                               }} placeholder="e.g. S, M, L" className="w-full px-3 py-2 bg-white dark:bg-[#1A1D24] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E]" />
                             </div>
                             <div className="flex-1">
                               <label className="block text-[10px] text-neutral-500 mb-1">Stock</label>
                               <input type="number" min="0" value={s.stock} onChange={e => {
                                 const next = [...tempVariantSizes]
                                 next[idx].stock = Number(e.target.value) || 0
                                 setTempVariantSizes(next)
                               }} className="w-full px-3 py-2 bg-white dark:bg-[#1A1D24] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E]" />
                             </div>
                             <button type="button" onClick={() => {
                               setTempVariantSizes(tempVariantSizes.filter((_, i) => i !== idx))
                             }} className="p-2 mb-0.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                         ))}
                         
                         <button 
                           type="button"
                           onClick={() => setTempVariantSizes([...tempVariantSizes, { size: '', stock: 0 }])}
                           className="text-sm font-medium text-[#6B7A5E] hover:text-[#5A684D] transition-colors"
                         >
                           + Add Size/Stock
                         </button>
                      </div>

                      <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                        <button type="button" onClick={() => {
                          const nameEl = document.getElementById('v_name') as HTMLInputElement
                          const priceEl = document.getElementById('v_price') as HTMLInputElement
                          const imageEl = document.getElementById('v_image') as HTMLInputElement
                          const name = nameEl?.value
                          const price = Number(priceEl?.value)
                          const imageFile = imageEl?.files?.[0]
                          
                          if (!name || isNaN(price) || price <= 0) {
                            showToast.error('Variant name and a valid price are required')
                            return
                          }
                          if (tempVariantSizes.length === 0) {
                            showToast.error('Please specify the stock amount')
                            return
                          }
                          if (tempVariantSizes.length > 1 && tempVariantSizes.some(s => !s.size.trim())) {
                            showToast.error('Please provide names for all sizes if you have multiple')
                            return
                          }
                          
                          const variantSizesObj: Record<string, number> = {}
                          tempVariantSizes.forEach(s => {
                            const sizeName = s.size.trim() || 'Standard'
                            variantSizesObj[sizeName] = s.stock
                          })

                          const finishAdd = (imgData: string | null) => {
                            if (editingVariantId) {
                              // Update existing variant
                              setMockVariants(mockVariants.map((v: any) => v.id === editingVariantId ? {
                                ...v,
                                name,
                                price,
                                sizes: variantSizesObj,
                                image: imgData !== null ? imgData : v.image
                              } : v))
                              setEditingVariantId(null)
                              showToast.success('Design updated!')
                            } else {
                              // Add new variant
                              const newVariant = {
                                id: Date.now().toString(),
                                name, price, sizes: variantSizesObj, image: imgData
                              }
                              setMockVariants([...mockVariants, newVariant])
                              showToast.success('Design added!')
                            }
                            setTempVariantSizes([])
                            nameEl.value = ''
                            priceEl.value = ''
                            imageEl.value = ''
                          }

                          if (imageFile) {
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              const img = new Image()
                              img.onload = () => {
                                const canvas = document.createElement('canvas')
                                const MAX = 400
                                let w = img.width, h = img.height
                                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX } }
                                else { if (h > MAX) { w *= MAX / h; h = MAX } }
                                canvas.width = w; canvas.height = h
                                canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
                                finishAdd(canvas.toDataURL('image/jpeg', 0.6))
                              }
                              img.src = ev.target?.result as string
                            }
                            reader.readAsDataURL(imageFile)
                          } else {
                            finishAdd(null)
                          }
                        }} className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${
                            editingVariantId 
                              ? 'bg-[#6B7A5E] text-white hover:bg-[#5A684D]' 
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700'
                          }`}>
                          {editingVariantId ? 'Save Changes' : '+ Add Design'}
                        </button>
                      </div>
                    </div>

                    {/* Designs Added List */}
                    {mockVariants.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Designs Added</h4>
                        <div className="space-y-3">
                          {mockVariants.map(variant => {
                            const isExpanded = expandedRows.has(variant.id)
                            const sizeKeys = variant.sizes ? Object.keys(variant.sizes) : []
                            const totalStock = sizeKeys.reduce((acc: number, size: string) => acc + (variant.sizes[size] || 0), 0)

                            return (
                              <div key={variant.id} className={`flex flex-col border rounded-xl overflow-hidden transition-all ${
                                editingVariantId === variant.id
                                  ? 'bg-[#6B7A5E]/5 border-[#6B7A5E]'
                                  : 'bg-white dark:bg-[#121418] border-neutral-200 dark:border-neutral-800'
                              }`}>
                                <div 
                                  className="flex items-center gap-4 p-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-[#1A1D24]/50"
                                  onClick={() => {
                                    const next = new Set(expandedRows)
                                    if (isExpanded) next.delete(variant.id)
                                    else next.add(variant.id)
                                    setExpandedRows(next)
                                  }}
                                >
                                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 flex items-center justify-center">
                                    {variant.image ? <img src={variant.image} alt={variant.name} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-neutral-300" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-semibold text-neutral-900 dark:text-white text-sm truncate">{variant.name || 'Unnamed Variant'}</span>
                                      <span className="text-sm text-neutral-500">—</span>
                                      <span className="font-semibold text-neutral-900 dark:text-white text-sm whitespace-nowrap">₱{Number(variant.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                                      <span>{sizeKeys.length} size{sizeKeys.length !== 1 ? 's' : ''}</span>
                                      <span>·</span>
                                      <span>{totalStock} total in stock</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // Populate the builder form with this variant's data
                                        setEditingVariantId(variant.id)
                                        const nameEl = document.getElementById('v_name') as HTMLInputElement
                                        const priceEl = document.getElementById('v_price') as HTMLInputElement
                                        if (nameEl) nameEl.value = variant.name || ''
                                        if (priceEl) priceEl.value = variant.price?.toString() || ''
                                        // Load sizes into tempVariantSizes
                                        const sizes = variant.sizes ? Object.entries(variant.sizes).map(([size, stock]) => ({ size, stock: stock as number })) : []
                                        setTempVariantSizes(sizes)
                                        // Scroll to builder
                                        document.getElementById('variant-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                      }}
                                      className="p-2 text-neutral-500 hover:text-[#6B7A5E] hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                      title="Edit design"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (confirm(`Are you sure you want to delete ${variant.name}? This removes all sizes.`)) {
                                          setMockVariants(mockVariants.filter((v: any) => v.id !== variant.id))
                                          if (editingVariantId === variant.id) {
                                            setEditingVariantId(null)
                                            setTempVariantSizes([])
                                          }
                                        }
                                      }}
                                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                      title="Delete design"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="p-1 ml-1 text-neutral-400">
                                      {isExpanded ? '▴' : '▾'}
                                    </div>
                                  </div>
                                </div>

                                {isExpanded && sizeKeys.length > 0 && (
                                  <div className="bg-neutral-50 dark:bg-[#1A1D24]/30 p-3 border-t border-neutral-100 dark:border-neutral-800/50">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {sizeKeys.map(size => (
                                        <div key={size} className="flex items-center justify-between bg-white dark:bg-[#121418] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-xs text-neutral-900 dark:text-white w-6">{size}</span>
                                            <span className="text-xs text-neutral-500">{variant.sizes[size]} left</span>
                                          </div>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              if (sizeKeys.length === 1) {
                                                if (confirm(`This is the last size. Delete the entire variant?`)) {
                                                  setMockVariants(mockVariants.filter((v: any) => v.id !== variant.id))
                                                }
                                              } else {
                                                const nextSizes = { ...variant.sizes }
                                                delete nextSizes[size]
                                                setMockVariants(mockVariants.map((v: any) => v.id === variant.id ? { ...v, sizes: nextSizes } : v))
                                              }
                                            }}
                                            className="text-neutral-400 hover:text-rose-500 transition-colors p-0.5"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Advanced Settings for variant products */}
                    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-neutral-50/50 dark:bg-[#121418]/50">
                      <button 
                        type="button" 
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#1A1D24] transition-colors"
                      >
                        Advanced Settings
                        {showAdvancedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      
                      {showAdvancedSettings && (
                        <div className="p-4 pt-2 grid grid-cols-2 gap-4 border-t border-neutral-200 dark:border-neutral-800">
                           <div>
                             <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Reorder Level</label>
                             <input name="reorder_level" defaultValue={editingProduct?.reorder_level ?? 5} type="number" min="0" className="w-full px-3 py-2 bg-white dark:bg-[#1A1D24] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E]" />
                           </div>
                           <div>
                             <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Status</label>
                             <select name="status" defaultValue={editingProduct?.status || 'active'} className="w-full px-3 py-2 bg-white dark:bg-[#1A1D24] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E]">
                               <option value="active">Active</option>
                               <option value="inactive">Inactive</option>
                             </select>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Hidden fields for the API */}
                <input type="hidden" name="has_variants" value={hasVariantsSelection ? 'true' : 'false'} />

              </form>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#1A1D24] flex justify-between gap-3 sticky bottom-0 z-10">
              {productFormStep === 2 ? (
                 <button type="button" onClick={() => setProductFormStep(1)} className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors">
                   ← Back
                 </button>
              ) : (
                 <div />
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors">
                  Cancel
                </button>
                {productFormStep === 2 && (
                  <button type="button" onClick={async (e) => {
                    const btn = e.currentTarget
                    btn.disabled = true
                    const form = document.getElementById('productForm') as HTMLFormElement
                    
                    if (!form || !form.checkValidity()) {
                      form?.reportValidity()
                      btn.disabled = false
                      return
                    }
                    
                    const fd = new FormData(form)
                    
                    // Fill defaults for conditionally-hidden fields
                    if (!fd.get('price') || fd.get('price') === '') {
                       if (hasVariantsSelection && mockVariants.length > 0) {
                          fd.set('price', mockVariants[0].price.toString())
                       } else {
                          fd.set('price', '0')
                       }
                    }
                    if (!fd.get('stock_quantity')) fd.set('stock_quantity', '0')
                    if (!fd.get('reorder_level')) fd.set('reorder_level', '5')
                    if (!fd.get('status')) fd.set('status', 'active')
                    
                    fd.set('has_variants', hasVariantsSelection ? '1' : '0')
                    
                    const imageFile = fd.get('image') as File
                    if ((!imageFile || imageFile.size === 0) && !editingProduct?.image_url && hasVariantsSelection && mockVariants.length > 0 && mockVariants[0].image) {
                        try {
                            const base64Data = mockVariants[0].image.split(',')[1]
                            const byteCharacters = atob(base64Data)
                            const byteNumbers = new Array(byteCharacters.length)
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i)
                            }
                            const byteArray = new Uint8Array(byteNumbers)
                            const blob = new Blob([byteArray], { type: 'image/jpeg' })
                            fd.set('image', blob, 'main_image_from_variant.jpg')
                        } catch (e) {
                            console.error('Failed to convert variant image to blob', e)
                        }
                    }
                    
                    try {
                      let savedProduct: any
                      if (editingProduct?.id) {
                        await posApi.updateProduct(editingProduct.id, fd)
                        savedProduct = editingProduct
                      } else {
                        savedProduct = await posApi.createProduct(fd)
                      }
                      
                      if (hasVariantsSelection && savedProduct?.id) {
                         localStorage.setItem(`variants_${savedProduct.id}`, JSON.stringify(mockVariants))
                      }
                      
                      setShowProductModal(false)
                      fetchData()
                    } catch(err) {
                      console.error(err)
                      showToast.error('Failed to save product')
                    } finally {
                      btn.disabled = false
                    }
                  }} className="px-6 py-2 bg-[#6B7A5E] text-white text-sm font-medium rounded-xl hover:bg-[#5A684D] transition-colors shadow-sm">
                    {hasVariantsSelection ? 'Save Product & Variants' : 'Save Product'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Add Category</h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form id="categoryForm" onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Category Name *</label>
                  <input required name="name" type="text" className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
                  <textarea name="description" rows={3} className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]"></textarea>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#1A1D24] flex justify-end gap-3">
              <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="submit" form="categoryForm" className="px-4 py-2 bg-[#6B7A5E] text-white text-sm font-medium rounded-xl hover:bg-[#5A684D] transition-colors shadow-sm">
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
