import { useEffect, useState, useCallback } from 'react'
import { getSuppliers, getSupplierCategories, getSupplierCategoryItems } from '../api/endpoints'
import VendorGrid from './VendorGrid'
import VendorCategoryList from './VendorCategoryList'
import VendorCategoryItemList from './VendorCategoryItemList'
import EditPriceModal from './EditPriceModal'
import PriceHistoryModal from './PriceHistoryModal'

/**
 * Vendor View: Vendors (A-Z, searchable) -> Categories -> Items.
 * Each item already carries this vendor's own price, so Edit/History wire
 * straight to it - no separate vendor-picking step needed at the leaf.
 */
export default function SupplierView() {
  const [step, setStep] = useState('vendors') // 'vendors' | 'categories' | 'items'

  const [suppliers, setSuppliers] = useState([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)

  const [activeSupplier, setActiveSupplier] = useState(null)
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  const [activeCategory, setActiveCategory] = useState(null)
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  const [editCell, setEditCell] = useState(null)
  const [historyCell, setHistoryCell] = useState(null)

  const loadSuppliers = useCallback(() => {
    setLoadingSuppliers(true)
    getSuppliers().then(({ data }) => setSuppliers(data)).finally(() => setLoadingSuppliers(false))
  }, [])

  useEffect(() => { loadSuppliers() }, [loadSuppliers])

  const loadCategories = useCallback((supplierId) => {
    setLoadingCategories(true)
    getSupplierCategories(supplierId).then(({ data }) => setCategories(data)).finally(() => setLoadingCategories(false))
  }, [])

  const loadItems = useCallback((supplierId, categoryId) => {
    setLoadingItems(true)
    getSupplierCategoryItems(supplierId, categoryId)
      .then(({ data }) => setItems(data.items))
      .finally(() => setLoadingItems(false))
  }, [])

  const handleSelectSupplier = (supplier) => {
    setActiveSupplier(supplier)
    setStep('categories')
    loadCategories(supplier.id)
  }

  const handleSelectCategory = (category) => {
    setActiveCategory({ id: category.category_id, name: category.category_name })
    setStep('items')
    loadItems(activeSupplier.id, category.category_id)
  }

  const handleBackToVendors = () => {
    setStep('vendors'); setActiveSupplier(null); setCategories([])
  }
  const handleBackToCategories = () => {
    setStep('categories'); setActiveCategory(null); setItems([])
  }

  const refreshItems = () => {
    if (activeSupplier && activeCategory) loadItems(activeSupplier.id, activeCategory.id)
  }

  return (
    <div>
      {step === 'vendors' && (
        <VendorGrid suppliers={suppliers} loading={loadingSuppliers} onSelect={handleSelectSupplier} />
      )}

      {step === 'categories' && activeSupplier && (
        <VendorCategoryList
          supplier={activeSupplier}
          categories={categories}
          loading={loadingCategories}
          onBack={handleBackToVendors}
          onSelect={handleSelectCategory}
        />
      )}

      {step === 'items' && activeSupplier && activeCategory && (
        <VendorCategoryItemList
          supplier={activeSupplier}
          category={activeCategory}
          items={items}
          loading={loadingItems}
          onBack={handleBackToCategories}
          onEdit={(item) =>
            setEditCell({
              supplier_product_id: item.supplier_product_id,
              product_id: item.product_id,
              supplier_id: activeSupplier.id,
              total_price: item.total_price,
              total_length_or_quantity: item.total_length_or_quantity,
              pricing_mode: item.pricing_mode,
              length: item.length,
              length_unit: item.length_unit,
              width: item.width,
              width_unit: item.width_unit,
              productName: item.product_name,
              supplierName: activeSupplier.name,
            })
          }
          onHistory={(item) =>
            setHistoryCell({
              supplier_product_id: item.supplier_product_id,
              productName: item.product_name,
              supplierName: activeSupplier.name,
              total_length_or_quantity: item.total_length_or_quantity,
              pricing_mode: item.pricing_mode,
            })
          }
        />
      )}

      {editCell && (
        <EditPriceModal cell={editCell} onClose={() => setEditCell(null)} onSaved={() => { setEditCell(null); refreshItems() }} />
      )}

      {historyCell && (
        <PriceHistoryModal supplierProductId={historyCell.supplier_product_id} cellInfo={historyCell} onClose={() => setHistoryCell(null)} />
      )}
    </div>
  )
}