import React, { useState, useEffect } from 'react'
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  FolderTree,
  X
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
                        if (product.has_variants) {
                          setShowVariantModal(true)
                        } else {
                          setEditingProduct(product)
                          setShowProductModal(true)
                        }
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
                             setEditingProduct(product)
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

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="productForm" onSubmit={handleSaveProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Product Name *</label>
                    <input required name="name" defaultValue={editingProduct?.name} type="text" className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Category *</label>
                    <select required name="category_id" defaultValue={editingProduct?.category_id || ''} onChange={(e) => {
                      const cat = categories.find(c => c.id.toString() === e.target.value);
                      if (cat) {
                        const hasVarSelect = e.target.form?.elements.namedItem('has_variants') as HTMLSelectElement;
                        if (hasVarSelect) {
                          hasVarSelect.value = cat.name.toLowerCase().includes('merchandise') ? 'true' : 'false';
                        }
                      }
                    }} className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]">
                      <option value="" disabled>Select category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Price (₱) *</label>
                    <input required name="price" defaultValue={editingProduct?.price || ''} type="number" step="0.01" min="0" className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Stock Quantity *</label>
                    <input required name="stock_quantity" defaultValue={editingProduct?.stock_quantity ?? 0} type="number" min="0" className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Reorder Level *</label>
                    <input required name="reorder_level" defaultValue={editingProduct?.reorder_level ?? 5} type="number" min="0" className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Status</label>
                    <select name="status" defaultValue={editingProduct?.status || 'active'} className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Has Size/Design Variants?</label>
                    <select name="has_variants" defaultValue={editingProduct ? (editingProduct.has_variants ? 'true' : 'false') : 'false'} className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]">
                      <option value="true">Yes, has variants (e.g. Shirts)</option>
                      <option value="false">No, simple stock (e.g. Beverages)</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Product Image (Optional)</label>
                    <input name="image" type="file" accept="image/jpeg, image/png, image/webp" className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E] file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#6B7A5E]/10 file:text-[#6B7A5E] hover:file:bg-[#6B7A5E]/20" />
                    {editingProduct?.image_url && (
                      <p className="mt-1 text-xs text-neutral-500">Current image: {editingProduct.image_url.split('/').pop()}</p>
                    )}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#1A1D24] flex justify-end gap-3">
              <button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="submit" form="productForm" className="px-4 py-2 bg-[#6B7A5E] text-white text-sm font-medium rounded-xl hover:bg-[#5A684D] transition-colors shadow-sm">
                Save Product
              </button>
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

      {/* Variant Manager Modal */}
      {showVariantModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowVariantModal(false)}>
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Manage Variants</h3>
                <p className="text-sm text-neutral-500">{selectedProduct.name}</p>
              </div>
              <button onClick={() => {
                setShowVariantModal(false)
                setEditingVariantId(null)
                setExpandedRows(new Set())
              }} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              <div className="bg-neutral-50 dark:bg-[#121418] p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{editingVariantId ? 'Edit Design & Sizes' : 'Add New Design & Sizes'}</h4>
                  {editingVariantId && (
                    <button onClick={() => setEditingVariantId(null)} className="text-xs text-neutral-500 hover:text-neutral-700">Cancel Edit</button>
                  )}
                </div>
                <form 
                  key={editingVariantId || 'new'}
                  onSubmit={(e) => {
                    e.preventDefault()
                    const form = e.currentTarget
                    const formData = new FormData(form)
                    const file = formData.get('image') as File
                    
                    const sizes = ['OS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
                    
                    const saveVariant = (base64Image: string | null) => {
                      const variantName = formData.get('variant_name') as string
                      const variantPrice = Number(formData.get('variant_price'))

                      const variantSizes: Record<string, number> = {}
                      sizes.forEach((size) => {
                        const stock = Number(formData.get(`stock_${size}`))
                        if (stock > 0) {
                          variantSizes[size] = stock
                        }
                      })
                      
                      if (Object.keys(variantSizes).length > 0) {
                        if (editingVariantId) {
                          setMockVariants(mockVariants.map(v => v.id === editingVariantId ? {
                            ...v,
                            name: variantName,
                            price: variantPrice,
                            sizes: variantSizes,
                            image: base64Image !== null ? base64Image : v.image
                          } : v))
                          setEditingVariantId(null)
                          showToast.success(`Variant updated`)
                        } else {
                          const newVariant = {
                            id: Date.now().toString(),
                            name: variantName,
                            price: variantPrice,
                            image: base64Image,
                            sizes: variantSizes
                          }
                          setMockVariants([...mockVariants, newVariant])
                          form.reset()
                          showToast.success(`Variant added`)
                        }
                      } else {
                        showToast.error('Please enter stock for at least one size')
                      }
                    }

                    if (file && file.size > 0) {
                      const reader = new FileReader()
                      reader.onload = (e) => {
                        const img = new Image()
                        img.onload = () => {
                          const canvas = document.createElement('canvas')
                          const MAX_WIDTH = 400
                          const MAX_HEIGHT = 400
                          let width = img.width
                          let height = img.height
                          if (width > height) {
                            if (width > MAX_WIDTH) {
                              height *= MAX_WIDTH / width
                              width = MAX_WIDTH
                            }
                          } else {
                            if (height > MAX_HEIGHT) {
                              width *= MAX_HEIGHT / height
                              height = MAX_HEIGHT
                            }
                          }
                          canvas.width = width
                          canvas.height = height
                          const ctx = canvas.getContext('2d')
                          ctx?.drawImage(img, 0, 0, width, height)
                        // Compress image to save localStorage quota
                        saveVariant(canvas.toDataURL('image/jpeg', 0.6))
                      }
                      img.src = e.target?.result as string
                    }
                    reader.readAsDataURL(file)
                  } else {
                    saveVariant(null)
                  }
                }} 
                className="space-y-6"
              >
                {(() => {
                  const editingData = editingVariantId ? mockVariants.find(v => v.id === editingVariantId) : null;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Variant Name *</label>
                          <input required name="variant_name" type="text" defaultValue={editingData?.name} placeholder="e.g. White Cambacay Shirt" className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Variant Price (₱) *</label>
                          <input required name="variant_price" type="number" step="0.01" min="0" defaultValue={editingData?.price} placeholder="e.g. 500.00" className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Design Picture {editingData?.image ? '(Leave empty to keep current)' : '(Applies to all sizes with stock below)'}</label>
                        <input name="image" type="file" accept="image/*" className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#6B7A5E]/10 file:text-[#6B7A5E] hover:file:bg-[#6B7A5E]/20" />
                        {editingData?.image && <img src={editingData.image} alt="Preview" className="h-12 w-12 object-cover rounded mt-2 border border-neutral-200" />}
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-3">Stock per Size (Leave 0 if none)</label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
                          {['OS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(size => (
                            <div key={size} className="flex flex-col gap-1">
                              <label className="text-[10px] font-semibold text-center text-neutral-500">{size}</label>
                              <input 
                                name={`stock_${size}`} 
                                type="number" 
                                min="0" 
                                defaultValue={editingData?.sizes?.[size] || 0} 
                                className="w-full px-2 py-1.5 text-center bg-white dark:bg-[#1A1D24] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E]" 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <button type="submit" className="w-full flex items-center justify-center gap-2 bg-[#6B7A5E] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#5A684D] transition-colors">
                          {editingVariantId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                          {editingVariantId ? 'Save Changes' : 'Add Variants'}
                        </button>
                      </div>
                    </>
                  )
                })()}
                </form>
              </div>

              {/* Variant List */}
              <div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Existing Variants</h4>
                {mockVariants.length > 0 ? (
                  <div className="space-y-3">
                    {mockVariants.map(variant => {
                      const isExpanded = expandedRows.has(variant.id)
                      const sizeKeys = variant.sizes ? Object.keys(variant.sizes) : []
                      const totalStock = sizeKeys.reduce((acc, size) => acc + variant.sizes[size], 0)

                      return (
                        <div key={variant.id} className="flex flex-col bg-white dark:bg-[#121418] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden transition-all">
                          {/* Collapsed Row */}
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
                                  setEditingVariantId(variant.id)
                                  document.getElementById('productForm')?.scrollIntoView({ behavior: 'smooth' })
                                }}
                                className="p-2 text-neutral-500 hover:text-[#6B7A5E] hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirm(`Are you sure you want to delete ${variant.name}? This removes all sizes.`)) {
                                    setMockVariants(mockVariants.filter(v => v.id !== variant.id))
                                  }
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="p-1 ml-1 text-neutral-400">
                                {isExpanded ? '▴' : '▾'}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Sizes */}
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
                                            setMockVariants(mockVariants.filter(v => v.id !== variant.id))
                                          }
                                        } else {
                                          const nextSizes = { ...variant.sizes }
                                          delete nextSizes[size]
                                          setMockVariants(mockVariants.map(v => v.id === variant.id ? { ...v, sizes: nextSizes } : v))
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
                ) : (
                  <div className="text-center py-8 text-neutral-500 text-sm border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                    No variants added yet.
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#1A1D24] flex justify-end gap-3">
              <button onClick={() => {
                setShowVariantModal(false)
                setEditingVariantId(null)
                setExpandedRows(new Set())
              }} className="px-5 py-2.5 bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 text-sm font-medium rounded-xl hover:opacity-90 transition-colors shadow-sm">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
