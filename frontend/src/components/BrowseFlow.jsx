import { useEffect, useState, useCallback } from 'react'
import {
  getDepartments,
  getDepartmentCategories,
  getDepartmentCategoryVendorItems,
} from '../api/endpoints'
import DepartmentGrid from './DepartmentGrid'
import DepartmentCategoryList from './DepartmentCategoryList'
import DepartmentCategoryItemsList from './DepartmentCategoryItemsList'
import EditPriceModal from './EditPriceModal'
import PriceHistoryModal from './PriceHistoryModal'
import AddVendorModal from './AddVendorModal'

/**
 * The main Browse experience, flattened:
 *   Departments -> Categories (A-Z) -> Items (A-Z), each item showing its
 *   own vendor offers inline (name, unit price, Edit/History) plus a
 *   per-item "+ Add Vendor" action. No separate "pick vendor" sub-screen.
 */
export default function BrowseFlow({ refreshKey }) {
  const [step, setStep] = useState('departments') // 'departments' | 'categories' | 'items'

  const [departments, setDepartments] = useState([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)

  const [activeDepartment, setActiveDepartment] = useState(null)
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  const [activeCategory, setActiveCategory] = useState(null)
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  const [editCell, setEditCell] = useState(null)
  const [historyCell, setHistoryCell] = useState(null)
  const [addVendorItem, setAddVendorItem] = useState(null)

  const loadDepartments = useCallback(() => {
    setLoadingDepartments(true)
    getDepartments()
      .then(({ data }) => setDepartments(data))
      .finally(() => setLoadingDepartments(false))
  }, [])

  useEffect(() => {
    loadDepartments()
  }, [loadDepartments, refreshKey])

  const loadCategories = useCallback((departmentId) => {
    setLoadingCategories(true)
    getDepartmentCategories(departmentId)
      .then(({ data }) => setCategories(data))
      .finally(() => setLoadingCategories(false))
  }, [])

  const loadItems = useCallback((departmentId, categoryId) => {
    setLoadingItems(true)
    getDepartmentCategoryVendorItems(departmentId, categoryId)
      .then(({ data }) => setItems(data.items))
      .finally(() => setLoadingItems(false))
  }, [])

  // Re-fetch whatever screen is currently active after an edit/create elsewhere
  useEffect(() => {
    if (step === 'categories' && activeDepartment) loadCategories(activeDepartment.id)
    if (step === 'items' && activeDepartment && activeCategory) {
      loadItems(activeDepartment.id, activeCategory.category_id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const handleSelectDepartment = (dept) => {
    setActiveDepartment(dept)
    setStep('categories')
    loadCategories(dept.id)
  }

  const handleSelectCategory = (category) => {
    setActiveCategory(category)
    setStep('items')
    loadItems(activeDepartment.id, category.category_id)
  }

  const handleBackToDepartments = () => {
    setStep('departments')
    setActiveDepartment(null)
    setCategories([])
  }

  const handleBackToCategories = () => {
    setStep('categories')
    setActiveCategory(null)
    setItems([])
  }

  const refreshItems = () => {
    if (activeDepartment && activeCategory) loadItems(activeDepartment.id, activeCategory.category_id)
  }

  return (
    <div>
      {step === 'departments' && (
        <DepartmentGrid departments={departments} loading={loadingDepartments} onSelect={handleSelectDepartment} />
      )}

      {step === 'categories' && activeDepartment && (
        <DepartmentCategoryList
          department={activeDepartment}
          categories={categories}
          loading={loadingCategories}
          onBack={handleBackToDepartments}
          onSelect={handleSelectCategory}
        />
      )}

      {step === 'items' && activeDepartment && activeCategory && (
        <DepartmentCategoryItemsList
          department={activeDepartment}
          category={activeCategory}
          items={items}
          loading={loadingItems}
          onBack={handleBackToCategories}
          onAddVendor={(item) =>
            setAddVendorItem({
              id: item.product_id,
              name: item.product_name,
              variant_code_or_size: item.variant_code_or_size,
            })
          }
          onEditVendor={(item, v) =>
            setEditCell({
              supplier_product_id: v.supplier_product_id,
              product_id: item.product_id,
              supplier_id: v.supplier_id,
              total_price: v.total_price,
              total_length_or_quantity: v.total_length_or_quantity,
              pricing_mode: v.pricing_mode,
              length: v.length,
              length_unit: v.length_unit,
              width: v.width,
              width_unit: v.width_unit,
              productName: item.product_name,
              supplierName: v.supplier_name,
            })
          }
          onHistoryVendor={(item, v) =>
            setHistoryCell({
              supplier_product_id: v.supplier_product_id,
              productName: item.product_name,
              supplierName: v.supplier_name,
              total_length_or_quantity: v.total_length_or_quantity,
              pricing_mode: v.pricing_mode,
            })
          }
        />
      )}

      {addVendorItem && (
        <AddVendorModal
          item={addVendorItem}
          existingVendorIds={
            items.find((it) => it.product_id === addVendorItem.id)?.vendors.map((v) => v.supplier_id) || []
          }
          onClose={() => setAddVendorItem(null)}
          onCreated={() => {
            setAddVendorItem(null)
            refreshItems()
          }}
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