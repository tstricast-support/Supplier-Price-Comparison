import SearchableSelect from './SearchableSelect'

/** Thin wrapper kept for backward compatibility with SupplierView; new code
 * should use SearchableSelect directly (it supports the "create new" row too). */
export default function SupplierCombobox({ suppliers, value, onChange }) {
  const options = suppliers.map((s) => ({ id: s.id, label: s.name }))
  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Search vendor, or leave empty for all vendors..."
      clearLabel="Show all vendors"
    />
  )
}