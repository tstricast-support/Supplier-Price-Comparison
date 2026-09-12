import { useEffect, useState, useCallback } from 'react'
import { getCategories, getCategoryVendorItems } from '../api/endpoints'
import CategoryGrid from './CategoryGrid'
import CategoryVendorItemList from './CategoryVendorItemList'
import EditPriceModal from './EditPriceModal'
import PriceHistoryModal from './PriceHistoryModal'

export default function ItemsFlow({ refreshKey, navRequest, onNavConsumed }) {
  const [step, setStep] = useState('categories') // 'categories' | 'items'

  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [activeCategory, setActiveCategory] = useState(null)
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [highlightProductId, setHighlightProductId] = useState(null)

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

  useEffect(() => {
    if (step === 'items' && activeCategory) loadItems(activeCategory.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  // Jump straight to a category (and optionally highlight one item) when
  // the global search bar sends a navigation request.
  useEffect(() => {
    if (navRequest && navRequest.categoryId) {
      setActiveCategory({ id: navRequest.categoryId, name: navRequest.categoryName })
      setStep('items')
      loadItems(navRequest.categoryId)
      setHighlightProductId(navRequest.highlightProductId || null)
      onNavConsumed && onNavConsumed()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navRequest])

  const handleSelectCategory = (category) => {
    setActiveCategory(category)
    setStep('items')
    setHighlightProductId(null)
    loadItems(category.id)
  }

  const handleBackToCategories = () => {
    setStep('categories'); setActiveCategory(null); setItems([]); setHighlightProductId(null)
  }
  const refreshItems = () => { if (activeCategory) loadItems(activeCategory.id) }

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
              variant_code_or_size: item.variant_code_or_size,
              department_id: item.department_id,
              category_id: activeCategory.id,
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
          highlightProductId={highlightProductId}
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