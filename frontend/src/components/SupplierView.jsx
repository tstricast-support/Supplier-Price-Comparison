import { useEffect, useState, useCallback } from 'react'
import {
  getSuppliers,
  getSupplierCategories,
  getSupplierProducts,
  getDepartments,
} from '../api/endpoints'
import VendorGrid from './VendorGrid'
import VendorCategoryList from './VendorCategoryList'
import EditPriceModal from './EditPriceModal'
import PriceHistoryModal from './PriceHistoryModal'
import { printVendorItemList } from '../utils/printVendorList'

/**
 * Vendor View: Vendors (A-Z) -> Categories, accordion style. Clicking a
 * category expands it inline to show its items, instead of navigating to
 * a separate items screen.
 */
export default function SupplierView({ navRequest, onNavConsumed }) {
  const [step, setStep] = useState('vendors') // 'vendors' | 'categories'

  const [suppliers, setSuppliers] = useState([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)

  const [departmentsById, setDepartmentsById] = useState({})

  const [activeSupplier, setActiveSupplier] = useState(null)
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  const [editCell, setEditCell] = useState(null)
  const [historyCell, setHistoryCell] = useState(null)
  const [onEditSavedExtra, setOnEditSavedExtra] = useState(null) // per-category refresh callback

  const [printingAll, setPrintingAll] = useState(false)

  useEffect(() => {
    getSuppliers().then(({ data }) => setSuppliers(data)).finally(() => setLoadingSuppliers(false))
    getDepartments().then(({ data }) => {
      const map = {}
      data.forEach((d) => { map[d.id] = d.name })
      setDepartmentsById(map)
    })
  }, [])

  const loadCategories = useCallback((supplierId) => {
    setLoadingCategories(true)
    getSupplierCategories(supplierId).then(({ data }) => setCategories(data)).finally(() => setLoadingCategories(false))
  }, [])

  const handleSelectSupplier = (supplier) => {
    setActiveSupplier(supplier)
    setStep('categories')
    loadCategories(supplier.id)
  }

  // Jump straight to a vendor's category list when the global search bar
  // sends a navigation request.
  useEffect(() => {
    if (navRequest && navRequest.vendorId && suppliers.length > 0) {
      const supplier = suppliers.find((s) => s.id === navRequest.vendorId)
      if (supplier) handleSelectSupplier(supplier)
      onNavConsumed && onNavConsumed()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navRequest, suppliers])

  const handleBackToVendors = () => {
    setStep('vendors')
    setActiveSupplier(null)
    setCategories([])
  }

  const handlePrintAll = async () => {
    if (!activeSupplier) return

    // Open the window SYNCHRONOUSLY, right here in the click handler,
    // before the await below - iOS Safari only allows window.open() inside
    // the original user-gesture call stack.
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow pop-ups for this site to print the item list.')
      return
    }
    printWindow.document.write(
      '<p style="font-family: Arial, sans-serif; padding: 24px; color: #555;">Preparing print list...</p>'
    )

    setPrintingAll(true)
    try {
      const { data } = await getSupplierProducts(activeSupplier.id)
      printVendorItemList(activeSupplier.name, data, departmentsById, printWindow)
    } catch {
      printWindow.close()
      alert('Failed to load items for printing. Please try again.')
    } finally {
      setPrintingAll(false)
    }
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
          onPrintAll={handlePrintAll}
          printingAll={printingAll}
          onEditVendor={(item, refreshCallback) => {
            setOnEditSavedExtra(() => refreshCallback)
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
              variant_code_or_size: item.variant_code_or_size,
              department_id: item.department_id,
              category_id: item.category_id,
            })
          }}
          onHistoryVendor={(item) =>
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
        <EditPriceModal
          cell={editCell}
          onClose={() => { setEditCell(null); setOnEditSavedExtra(null) }}
          onSaved={() => {
            setEditCell(null)
            if (onEditSavedExtra) onEditSavedExtra()
            setOnEditSavedExtra(null)
            loadCategories(activeSupplier.id) // item counts may have shifted
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