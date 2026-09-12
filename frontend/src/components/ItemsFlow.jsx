import { useEffect, useState, useCallback } from 'react'
import { getCategories, getCategoryVendorItems } from '../api/endpoints'
import CategoryGrid from './CategoryGrid'
import CategoryVendorItemList from './CategoryVendorItemList'
import EditPriceModal from './EditPriceModal'
import PriceHistoryModal from './PriceHistoryModal'

export default function ItemsFlow({ refreshKey }) {
  const [step, setStep] = useState('categories') // 'categories' | 'items'

  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [activeCategory, setActiveCategory] = useState(null)
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  const [editCell, setEditCell] = useState(null)
  const [historyCell, setHistoryCell] = useState(null)

  const loadCategories = useCallback(() => {
    setLoadingCategories(true)
    getCategories().then(({ data }) => setCategories(data)).finally(() => setLoadingCategories(false))
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories, refreshKey])

  const loadItems = useCallback((categoryId) => {
    setLoadingItems(true)
    getCategoryVendorItems(categoryId).then(({ data }) => setItems(data.items)).finally(() => setLoadingItems(false))
  }, [])

  // Re-fetch the open category's items after an edit elsewhere
  useEffect(() => {
    if (step === 'items' && activeCategory) loadItems(activeCategory.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const handleSelectCategory = (category) => {
    setActiveCategory(category)
    setStep('items')
    loadItems(category.id)
  }

  const handleBackToCategories = () => {
    setStep('categories')
    setActiveCategory(null)
    setItems([])
  }

  const refreshItems = () => {
    if (activeCategory) loadItems(activeCategory.id)
  }

  return (
    <div>
      {step === 'categories' && (
        <CategoryGrid categories={categories} loading={loadingCategories} onSelect={handleSelectCategory} />
      )}

      {step === 'items' && activeCategory && (
        <CategoryVendorItemList
          category={activeCategory}
          items={items}
          loading={loadingItems}
          onBack={handleBackToCategories}
          onEdit={(item) =>
            setEditCell({
              supplier_product_id: item.supplier_product_id,
              product_id: item.product_id,
              supplier_id: item.supplier_id,
              total_price: item.total_price,
              total_length_or_quantity: item.total_length_or_quantity,
              pricing_mode: item.pricing_mode,
              length: item.length,
              length_unit: item.length_unit,
              width: item.width,
              width_unit: item.width_unit,
              productName: item.product_name,
              supplierName: item.supplier_name,
            })
          }
          onHistory={(item) =>
            setHistoryCell({
              supplier_product_id: item.supplier_product_id,
              productName: item.product_name,
              supplierName: item.supplier_name,
              total_length_or_quantity: item.total_length_or_quantity,
              pricing_mode: item.pricing_mode,
            })
          }
        />
      )}

      {editCell && (
        <EditPriceModal
          cell={editCell}
          onClose={() => setEditCell(null)}
          onSaved={() => {
            setEditCell(null)
            refreshItems()
          }}
        />
      )}

      {historyCell && (
        <PriceHistoryModal
          supplierProductId={historyCell.supplier_product_id}
          cellInfo={historyCell}
          onClose={() => setHistoryCell(null)}
        />
      )}
    </div>
  )
}