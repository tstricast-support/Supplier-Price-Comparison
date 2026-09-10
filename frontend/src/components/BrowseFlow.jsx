import { useEffect, useState, useCallback } from 'react'
import { getDepartments, getDepartmentItems, getItemVendors } from '../api/endpoints'
import DepartmentGrid from './DepartmentGrid'
import ItemList from './ItemList'
import VendorList from './VendorList'
import EditPriceModal from './EditPriceModal'
import PriceHistoryModal from './PriceHistoryModal'
import AddVendorModal from './AddVendorModal'

/**
 * The main Browse experience:
 *   Departments -> Items (A-Z) -> Vendors (A-Z) -> Price Edit / History
 * Each step is its own screen (not nested accordions) so it works well on
 * a small phone screen - one focused list at a time, with a back button.
 */
export default function BrowseFlow({ refreshKey }) {
  const [step, setStep] = useState('departments') // 'departments' | 'items' | 'vendors'

  const [departments, setDepartments] = useState([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)

  const [activeDepartment, setActiveDepartment] = useState(null)
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  const [activeItem, setActiveItem] = useState(null)
  const [vendors, setVendors] = useState([])
  const [loadingVendors, setLoadingVendors] = useState(false)

  const [editCell, setEditCell] = useState(null)
  const [historyCell, setHistoryCell] = useState(null)
  const [addingVendor, setAddingVendor] = useState(false)

  const loadDepartments = useCallback(() => {
    setLoadingDepartments(true)
    getDepartments()
      .then(({ data }) => setDepartments(data))
      .finally(() => setLoadingDepartments(false))
  }, [])

  useEffect(() => {
    loadDepartments()
  }, [loadDepartments, refreshKey])

  const loadItems = useCallback((departmentId) => {
    setLoadingItems(true)
    getDepartmentItems(departmentId)
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
    if (step === 'items' && activeDepartment) loadItems(activeDepartment.id)
    if (step === 'vendors' && activeItem) loadVendors(activeItem.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const handleSelectDepartment = (dept) => {
    setActiveDepartment(dept)
    setStep('items')
    loadItems(dept.id)
  }

  const handleSelectItem = (item) => {
    setActiveItem({ id: item.product_id, name: item.product_name, variant_code_or_size: item.variant_code_or_size })
    setStep('vendors')
    loadVendors(item.product_id)
  }

  const handleBackToDepartments = () => {
    setStep('departments')
    setActiveDepartment(null)
    setItems([])
  }

  const handleBackToItems = () => {
    setStep('vendors' === step ? 'items' : step)
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

      {step === 'items' && activeDepartment && (
        <ItemList
          department={activeDepartment}
          items={items}
          loading={loadingItems}
          onBack={handleBackToDepartments}
          onSelect={handleSelectItem}
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
    </div>
  )
}
