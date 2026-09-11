import { useEffect, useState, useCallback } from 'react'
import {
  getDepartments,
  getDepartmentCategories,
  getDepartmentCategoryItems,
  getItemVendors,
} from '../api/endpoints'
import DepartmentGrid from './DepartmentGrid'
import DepartmentCategoryList from './DepartmentCategoryList'
import ItemList from './ItemList'
import VendorList from './VendorList'
import EditPriceModal from './EditPriceModal'
import PriceHistoryModal from './PriceHistoryModal'
import AddVendorModal from './AddVendorModal'
import EditItemModal from './EditItemModal'

/**
 * The main Browse experience:
 *   Departments -> Categories (A-Z) -> Items (A-Z) -> Vendors (A-Z) -> Price Edit / History
 * Each step is its own screen (not nested accordions) so it works well on
 * a small phone screen - one focused list at a time, with a back button.
 */
export default function BrowseFlow({ refreshKey }) {
  const [step, setStep] = useState('departments') // 'departments' | 'categories' | 'items' | 'vendors'

  const [departments, setDepartments] = useState([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)

  const [activeDepartment, setActiveDepartment] = useState(null)
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)

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
    getDepartmentCategoryItems(departmentId, categoryId)
      .then(({ data }) => setItems(data.items))
      .finally(() => setLoadingItems(false))
  }, [])

  const loadVendors = useCallback((productId) => {
    setLoadingVendors(true)
    getItemVendors(productId)
      .then(({ data }) => setVendors(data.vendors))
      .finally(() => setLoadingVendors(false))
  }, [])

  // Re-fetch whatever screen is currently active after an edit/create elsewhere
  useEffect(() => {
    if (step === 'categories' && activeDepartment) loadCategories(activeDepartment.id)
    if (step === 'items' && activeDepartment && activeCategory) loadItems(activeDepartment.id, activeCategory.category_id)
    if (step === 'vendors' && activeItem) loadVendors(activeItem.id)
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

  const handleSelectItem = (item) => {
    setActiveItem({
      id: item.product_id,
      name: item.product_name,
      variant_code_or_size: item.variant_code_or_size,
      category_id: item.category_id,
      category_name: item.category_name,
    })
    setStep('vendors')
    loadVendors(item.product_id)
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

  const handleBackToItems = () => {
    setStep('items')
    setActiveItem(null)
    setVendors([])
  }

  const refreshVendors = () => {
    if (activeItem) loadVendors(activeItem.id)
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
        <ItemList
          department={{ ...activeDepartment, name: `${activeDepartment.name} / ${activeCategory.category_name}` }}
          items={items}
          loading={loadingItems}
          onBack={handleBackToCategories}
          onSelect={handleSelectItem}
          onEdit={(item) => setEditingItem(item)}
        />
      )}

      {step === 'vendors' && activeItem && activeDepartment && (
        <VendorList
          item={activeItem}
          department={activeDepartment}
          vendors={vendors}
          loading={loadingVendors}
          onBack={handleBackToItems}
          onAddVendor={() => setAddingVendor(true)}
          onEdit={(v) =>
              setEditCell({
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
              })
            }
          onHistory={(v) =>
            setHistoryCell({
              supplier_product_id: v.supplier_product_id,
              productName: activeItem.name,
              supplierName: v.supplier_name,
              total_length_or_quantity: v.total_length_or_quantity,
              pricing_mode: v.pricing_mode,
            })
          }
        />
      )}

      {addingVendor && activeItem && (
        <AddVendorModal
          item={activeItem}
          existingVendorIds={vendors.map((v) => v.supplier_id)}
          onClose={() => setAddingVendor(false)}
          onCreated={() => {
            setAddingVendor(false)
            refreshVendors()
          }}
        />
      )}

      {editCell && (
        <EditPriceModal
          cell={editCell}
          onClose={() => setEditCell(null)}
          onSaved={() => {
            setEditCell(null)
            refreshVendors()
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

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null)
            if (activeDepartment && activeCategory) loadItems(activeDepartment.id, activeCategory.category_id)
          }}
        />
      )}
    </div>
  )
}