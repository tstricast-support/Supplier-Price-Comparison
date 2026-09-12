import { useState, useEffect, useMemo } from 'react'
import { X, Save, Tag, Layers, PlusCircle } from 'lucide-react'
import { getCategories, getDepartments, updateProduct } from '../api/endpoints'
import SearchableSelect from './SearchableSelect'
import QuickCreateCategoryModal from './QuickCreateCategoryModal'

/**
 * Full "product" edit - everything you can set when creating an item
 * (name, variant/size, department, category) except vendor/price, which
 * belong to separate SupplierProduct rows and are edited individually via
 * each vendor's Price Edit button.
 *
 * `item` = { product_id, product_name, variant_code_or_size, department_id,
 * department_name, category_id, category_name }.
 */
export default function EditItemModal({ item, onClose, onSaved }) {
  const [name, setName] = useState(item.product_name)
  const [variant, setVariant] = useState(item.variant_code_or_size || '')
  const [departmentId, setDepartmentId] = useState(item.department_id ? String(item.department_id) : '')
  const [categoryId, setCategoryId] = useState(item.category_id ? String(item.category_id) : '')

  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [quickCategorySeed, setQuickCategorySeed] = useState('')

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    getDepartments().then(({ data }) => setDepartments(data))
    getCategories().then(({ data }) => setCategories(data))
  }, [])

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: c.id, label: c.name })),
    [categories]
  )

  const handleCategoryCreated = (category) => {
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)))
    setCategoryId(String(category.id))
    setShowCreateCategory(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    if (!departmentId) {
      setErr('Select a department.')
      return
    }
    if (!categoryId) {
      setErr('Select or create a category.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await updateProduct(item.product_id, {
        name: name.trim(),
        variant_code_or_size: variant.trim() || null,
        department_id: Number(departmentId),
        category_id: Number(categoryId),
      })
      onSaved()
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to update item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit Item</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Item Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Variant / Size <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder="e.g. 44in, A4, 30m"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Department</label>
            <div className="relative">
              <Layers size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="" disabled>
                  Select department...
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Moving this item to a different department keeps its own vendor prices attached to it.
            </p>
          </div>

          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
              <span>Category</span>
              <button
                type="button"
                onClick={() => {
                  setQuickCategorySeed('')
                  setShowCreateCategory(true)
                }}
                className="flex items-center gap-1 text-brand-600 hover:text-brand-700"
              >
                <PlusCircle size={13} /> Create category
              </button>
            </label>
            <SearchableSelect
              options={categoryOptions}
              value={categoryId}
              onChange={setCategoryId}
              placeholder="search categories..."
              icon={<Tag size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
              onCreateNew={(typed) => {
                setQuickCategorySeed(typed)
                setShowCreateCategory(true)
              }}
              createLabel="+ Create category"
            />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {showCreateCategory && (
        <QuickCreateCategoryModal
          initialName={quickCategorySeed}
          onClose={() => setShowCreateCategory(false)}
          onCreated={handleCategoryCreated}
        />
      )}
    </div>
  )
}