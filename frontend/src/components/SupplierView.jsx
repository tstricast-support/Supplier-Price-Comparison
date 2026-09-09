import { useEffect, useState, useCallback } from 'react'
import { Loader2, Pencil, History } from 'lucide-react'
import { getSuppliers, getSupplierProducts } from '../api/endpoints'
import { formatRs } from '../utils/currency'
import EditPriceModal from './EditPriceModal'
import PriceHistoryModal from './PriceHistoryModal'
import SupplierCombobox from './SupplierCombobox'

export default function SupplierView() {
  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [editCell, setEditCell] = useState(null)
  const [historyCell, setHistoryCell] = useState(null)

  useEffect(() => {
    getSuppliers().then(({ data }) => {
      setSuppliers(data)
      if (data.length > 0) setSupplierId(String(data[0].id))
    })
  }, [])

  const loadItems = useCallback(() => {
    if (!supplierId) return
    setLoading(true)
    setError(null)
    getSupplierProducts(supplierId)
      .then(({ data }) => setItems(data))
      .catch(() => setError('Failed to load supplier products.'))
      .finally(() => setLoading(false))
  }, [supplierId])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  return (
    <div>
      <div className="mb-4">
        <SupplierCombobox
          suppliers={suppliers}
          value={supplierId}
          onChange={setSupplierId}
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-10 text-sm text-gray-500">
          <Loader2 className="animate-spin" size={18} /> Loading...
        </div>
      )}
      {error && <p className="py-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Department</th>
                <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold text-gray-700">Total Price</th>
                <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold text-gray-700">Qty/Length</th>
                <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold text-gray-700">Unit Price</th>
                <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border-b border-gray-100 px-4 py-3">
                    <div className="font-medium text-gray-900">{item.product.name}</div>
                    <div className="text-xs text-gray-500">{item.product.variant_code_or_size}</div>
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3 text-gray-600">
                    {item.product.department_id}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3 text-right">{formatRs(item.total_price)}</td>
                  <td className="border-b border-gray-100 px-4 py-3 text-right">{item.total_length_or_quantity}</td>
                  <td className="border-b border-gray-100 px-4 py-3 text-right font-semibold">
                    {formatRs(item.unit_price, 2)}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          setHistoryCell({
                            supplier_product_id: item.id,
                            productName: item.product.name,
                            supplierName: item.supplier.name,
                          })
                        }
                        className="flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                      >
                        <History size={12} /> History
                      </button>
                      <button
                        onClick={() =>
                          setEditCell({
                            supplier_product_id: item.id,
                            total_price: item.total_price,
                            total_length_or_quantity: item.total_length_or_quantity,
                            productName: item.product.name,
                            supplierName: item.supplier.name,
                          })
                        }
                        className="flex items-center gap-1 rounded bg-brand-600 px-2 py-1 text-[11px] text-white hover:bg-brand-700"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    This supplier has no products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editCell && (
        <EditPriceModal
          cell={editCell}
          onClose={() => setEditCell(null)}
          onSaved={() => {
            setEditCell(null)
            loadItems()
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