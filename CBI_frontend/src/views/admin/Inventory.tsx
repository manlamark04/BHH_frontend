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
import { showToast } from '../../context/ToastContext'

export default function Inventory() {
  const [products, setProducts] = useState<POSProduct[]>([])
  const [categories, setCategories] = useState<POSCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products')

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Partial<POSProduct> | null>(null)
  
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  )

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
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-[#FDFBF7]/50 dark:bg-[#1A1D24]/50">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#121418] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/20 focus:border-[#6B7A5E] transition-all"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredProducts.map(product => {
                    const isLowStock = product.stock_quantity <= product.reorder_level;
                    return (
                      <tr key={product.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5 text-neutral-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-neutral-900 dark:text-white">{product.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                          {product.category_name}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-white">
                          ₱{Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium ${
                            isLowStock ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'text-neutral-900 dark:text-white'
                          }`}>
                            {product.stock_quantity}
                            {isLowStock && <AlertTriangle className="w-3.5 h-3.5" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            product.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setEditingProduct(product)
                              setShowProductModal(true)
                            }}
                            className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                        No products found. Add your first product to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                    <select required name="category_id" defaultValue={editingProduct?.category_id || ''} className="w-full px-3 py-2 bg-white dark:bg-[#121418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-[#6B7A5E] focus:ring-1 focus:ring-[#6B7A5E]">
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

    </div>
  )
}
