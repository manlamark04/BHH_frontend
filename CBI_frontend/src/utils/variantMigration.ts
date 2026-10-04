export function migrateVariants(parsed: any[], productId?: number | string): any[] {
  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) return []
  
  // If the first element has 'size' but no 'sizes', it's the old flat structure
  if (parsed[0].size !== undefined && parsed[0].sizes === undefined) {
    const groups = new Map<string, any>()
    parsed.forEach((v: any) => {
      // Use name as the grouping key.
      const key = v.name || v.image || 'Unnamed Variant'
      if (!groups.has(key)) {
        groups.set(key, {
          id: v.id ? v.id.split('-')[0] : Date.now().toString(), // try to keep base ID
          name: v.name || 'Unnamed Variant',
          price: v.price || 0,
          image: v.image || null,
          sizes: {}
        })
      }
      const group = groups.get(key)
      if (v.size && v.stock > 0) {
        group.sizes[v.size] = (group.sizes[v.size] || 0) + v.stock
      }
    })
    const migrated = Array.from(groups.values())
    
    // Save back to local storage if productId is provided
    if (productId) {
      localStorage.setItem(`variants_${productId}`, JSON.stringify(migrated))
    }
    
    return migrated
  }
  
  return parsed
}
