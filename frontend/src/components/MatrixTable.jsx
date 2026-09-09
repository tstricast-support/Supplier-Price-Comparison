import { useEffect, useState, useCallback } from 'react'
import { Search, History, Pencil, Loader2, Trophy } from 'lucide-react'
import { getDepartments, getPriceMatrix } from '../api/endpoints'
import { formatRs } from '../utils/currency'
import EditPriceModal from './EditPriceModal'
import PriceHistoryModal from './PriceHistoryModal'

export default function MatrixTable() {
  const [departments, setDepartments] = useState([])
  const [departmentId, setDepartmentId] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [matrix, setMatrix] = useState({ suppliers: [], rows: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editCell, setEditCell] = useState(null)
  const [historyCell, setHistoryCell] = useState(null)

  useEffect(() => {
    getDepartments()
      .then(({ data }) => setDepartments(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const loadMatrix = useCallback(() => {
    setLoading(true)
    setError(null)
    getPriceMatrix(departmentId || null, debouncedSearch || null)
      .then(({ data }) => setMatrix(data))
      .catch(() => setError('Failed to load price matrix. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [departmentId, debouncedSearch])

  useEffect(() => {
    loadMatrix()
  }, [loadMatrix])

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name or size/variant..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-10 text-sm text-gray-500">
          <Loader2 className="animate-spin" size={18} /> Loading price matrix...
        </div>
      )}

      {error && <p className="py-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && matrix.rows.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-500">
          No products found. Try a different search or department.
        </p>
      )}

      {!loading && !error && matrix.rows.length > 0 && (
        <div className="overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm" style={{ maxHeight: '70vh' }}>
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="matrix-sticky-col matrix-sticky-header border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700">
                  Product
                </th>
                <th className="matrix-sticky-header border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700">
                  Best Offer
                </th>
                <th className="matrix-sticky-header border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700">
                  All Supplier Offers (sorted by lowest unit price)
                </th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => {
                const best = row.offers[0]
                return (
                  <tr key={row.product_id} className="align-top hover:bg-gray-50">
                    <td className="matrix-sticky-col border-b border-r border-gray-100 bg-white px-4 py-3">
                      <div className="font-medium text-gray-900">{row.product_name}</div>
                      <div className="text-xs text-gray-500">
                        {row.variant_code_or_size} · {row.department_name}
                      </div>
                    </td>

                    <td className="border-b border-r border-gray-100 px-4 py-3">
                      {best ? (
                        <div className="min-w-[170px] rounded-lg border border-green-300 bg-green-50 px-3 py-2.5">
                          <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
                            <Trophy size={12} /> Cheapest Supplier
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            {best.supplier_name}
                          </div>
                          <div className="mt-1.5 text-lg font-bold text-green-700">
                            {formatRs(best.unit_price, 2)}
                            <span className="ml-1 text-xs font-normal text-gray-500">/ unit</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            Total {formatRs(best.total_price)} for {best.total_length_or_quantity} units
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No offers</span>
                      )}
                    </td>

                    <td className="border-b border-gray-100 px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.offers.map((offer) => (
                          <div
                            key={offer.supplier_product_id}
                            className={`min-w-[160px] rounded-lg border px-3 py-2 ${
                              offer.is_cheapest
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-800">
                                {offer.supplier_name}
                              </span>
                              {offer.is_cheapest && (
                                <span className="rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                  CHEAPEST
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                              Total: {formatRs(offer.total_price)} for {offer.total_length_or_quantity} units
                            </div>
                            <div className="text-sm font-bold text-gray-900">
                              {formatRs(offer.unit_price, 2)}{' '}
                              <span className="text-xs font-normal text-gray-500">/ unit</span>
                            </div>

                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() =>
                                  setHistoryCell({
                                    supplier_product_id: offer.supplier_product_id,
                                    productName: row.product_name,
                                    supplierName: offer.supplier_name,
                                  })
                                }
                                className="flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                              >
                                <History size={12} /> History
                              </button>
                              <button
                                onClick={() =>
                                  setEditCell({
                                    supplier_product_id: offer.supplier_product_id,
                                    total_price: offer.total_price,
                                    total_length_or_quantity: offer.total_length_or_quantity,
                                    productName: row.product_name,
                                    supplierName: offer.supplier_name,
                                  })
                                }
                                className="flex items-center gap-1 rounded bg-brand-600 px-2 py-1 text-[11px] text-white hover:bg-brand-700"
                              >
                                <Pencil size={12} /> Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
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
            loadMatrix()
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