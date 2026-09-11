import { useEffect, useState, useCallback } from 'react'
import { getCategories, getCategoryItems, getItemVendors } from '../api/endpoints'
import CategoryGrid from './CategoryGrid'
import CategoryItemList from './CategoryItemList'
import VendorList from './VendorList'
import EditPriceModal from './EditPriceModal'
import PriceHistoryModal from './PriceHistoryModal'
import AddVendorModal from './AddVendorModal'
import EditItemModal from './EditItemModal'

export default function ItemsFlow({ refreshKey }) {
  const [step, setStep] = useState('categories') // 'categories' | 'items' | 'vendors'

  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [activeCategory, setActiveCategory] = useState(null)
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  const [activeItem, setActiveItem] = useState(null)
  const [vendors, setVendors] = useState([])
  const [loadingVendors, setLoadingVendors] = useState(false)

  const [editCell, setEditCell] = useState(null)
  const [historyCell, setHistoryCell] = useState(null)
  const [addingVendor, setAddingVendor] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const loadCategories = useCallback(() => {
    setLoadingCategories(true)
    getCategories().then(({ data }) => setCategories(data)).finally(() => setLoadingCategories(false))
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories, refreshKey])

  const loadItems = useCallback((categoryId) => {
    setLoadingItems(true)
    getCategoryItems(categoryId).then(({ data }) => setItems(data.items)).finally(() => setLoadingItems(false))
  }, [])

  const loadVendors = useCallback((productId) => {
    setLoadingVendors(true)
    getItemVendors(productId).then(({ data }) => setVendors(data.vendors)).finally(() => setLoadingVendors(false))
  }, [])

  useEffect(() => {
    if (step === 'items' && activeCategory) loadItems(activeCategory.id)
    if (step === 'vendors' && activeItem) loadVendors(activeItem.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const handleSelectCategory = (category) => {
    setActiveCategory(category)
    setStep('items')
    loadItems(category.id)
  }

  const handleSelectItem = (item) => {
    setActiveItem({
      id: item.product_id,
      name: item.product_name,
      variant_code_or_size: item.variant_code_or_size,
      category_id: item.category_id,
      category_name: item.category_name,
      department_id: item.department_id,
      department_name: item.department_name,
    })
    setStep('vendors')
    loadVendors(item.product_id)
  }

  const handleBackToCategories = () => {
    setStep('categories'); setActiveCategory(null); setItems([])
  }
  const handleBackToItems = () => {
    setStep('items'); setActiveItem(null); setVendors([])
  }
  const refreshVendors = () => { if (activeItem) loadVendors(activeItem.id) }

  return (
    <div>
      {step === 'categories' && (
        <CategoryGrid categories={categories} loading={loadingCategories} onSelect={handleSelectCategory} />
      )}

      {step === 'items' && activeCategory && (
        <CategoryItemList
          category={activeCategory}
          items={items}
          loading={loadingItems}
          onBack={handleBackToCategories}
          onSelect={handleSelectItem}
          onEdit={(item) => setEditingItem(item)}
        />
      )}

      {step === 'vendors' && activeItem && (
        <VendorList
          item={activeItem}
          department={{ id: activeItem.department_id, name: activeItem.department_name }}
          vendors={vendors}
          loading={loadingVendors}
          onBack={handleBackToItems}
          onAddVendor={() => setAddingVendor(true)}
          onEdit={(v) => setEditCell({
            supplier_product_id: v.supplier_product_id,
            product_id: activeItem.id,
            supplier_id: v.supplier_id,
            total_price: v.total_price,
            total_length_or_quantity: v.total_length_or_quantity,
            pricing_mode: v.pricing_mode,
            length: v.length,
            length_unit: v.length_unit,
            width: v.width,
            width_unit: v.width_unit,
            productName: activeItem.name,
            supplierName: v.supplier_name,
          })}
          onHistory={(v) => setHistoryCell({
            supplier_product_id: v.supplier_product_id,
            productName: activeItem.name,
            supplierName: v.supplier_name,
            total_length_or_quantity: v.total_length_or_quantity,
            pricing_mode: v.pricing_mode,
          })}
        />
      )}

      {addingVendor && activeItem && (
        <AddVendorModal
          item={activeItem}
          existingVendorIds={vendors.map((v) => v.supplier_id)}
          onClose={() => setAddingVendor(false)}
          onCreated={() => { setAddingVendor(false); refreshVendors() }}
        />
      )}

      {editCell && (
        <EditPriceModal cell={editCell} onClose={() => setEditCell(null)} onSaved={() => { setEditCell(null); refreshVendors() }} />
      )}

      {historyCell && (
        <PriceHistoryModal supplierProductId={historyCell.supplier_product_id} cellInfo={historyCell} onClose={() => setHistoryCell(null)} />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); if (activeCategory) loadItems(activeCategory.id) }}
        />
      )}
    </div>
  )
}