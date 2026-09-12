import { useState } from 'react'
import { LayoutGrid, Settings, PlusCircle, Tag } from 'lucide-react'
import BrowseFlow from './components/BrowseFlow'
import SupplierView from './components/SupplierView'
import AdminPanel from './components/AdminPanel'
import CreateProductModal from './components/CreateProductModal'
import ItemsFlow from './components/ItemsFlow'
import GlobalSearchBar from './components/GlobalSearchBar'

export default function App() {
  const [tab, setTab] = useState('browse') // 'browse' | 'items' | 'supplier' | 'manage'
  const [showCreateProduct, setShowCreateProduct] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const bumpRefresh = () => setRefreshKey((k) => k + 1)

  // Navigation requests fired by the global search bar - consumed once by
  // the Items tab / Vendors tab, then cleared.
  const [itemsNav, setItemsNav] = useState(null)
  const [vendorNav, setVendorNav] = useState(null)

  const handleSearchSelectCategory = (cat) => {
    setTab('items')
    setItemsNav({ categoryId: cat.id, categoryName: cat.name, highlightProductId: null })
  }

  const handleSearchSelectVendor = (vendor) => {
    setTab('supplier')
    setVendorNav({ vendorId: vendor.id })
  }

  const handleSearchSelectItem = (item) => {
    if (!item.category_id) {
      // Item has no category yet - just land on the Items tab's category list.
      setTab('items')
      return
    }
    setTab('items')
    setItemsNav({
      categoryId: item.category_id,
      categoryName: item.category_name || '',
      highlightProductId: item.product_id,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-lg text-base font-bold text-black">Tricast Price Comparison</h1>
          </div>

          <GlobalSearchBar
            onSelectCategory={handleSearchSelectCategory}
            onSelectVendor={handleSearchSelectVendor}
            onSelectItem={handleSearchSelectItem}
          />

          <button
            onClick={() => setShowCreateProduct(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 active:scale-[0.98] sm:px-4"
          >
            <PlusCircle size={16} />
            <span className="hidden sm:inline">New Product</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
          <TabButton active={tab === 'browse'} onClick={() => setTab('browse')} icon={<LayoutGrid size={15} />}>
            Home
          </TabButton>
          <TabButton active={tab === 'items'} onClick={() => setTab('items')} icon={<Tag size={15} />}>
            Items
          </TabButton>
          <TabButton active={tab === 'supplier'} onClick={() => setTab('supplier')}>
            Vendors
          </TabButton>
          <TabButton active={tab === 'manage'} onClick={() => setTab('manage')} icon={<Settings size={15} />}>
            Manage
          </TabButton>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {tab === 'browse' && <BrowseFlow refreshKey={refreshKey} />}
        {tab === 'items' && (
          <ItemsFlow
            refreshKey={refreshKey}
            navRequest={itemsNav}
            onNavConsumed={() => setItemsNav(null)}
          />
        )}
        {tab === 'supplier' && (
          <SupplierView navRequest={vendorNav} onNavConsumed={() => setVendorNav(null)} />
        )}
        {tab === 'manage' && <AdminPanel />}
      </main>

      {showCreateProduct && (
        <CreateProductModal
          onClose={() => setShowCreateProduct(false)}
          onCreated={() => {
            setShowCreateProduct(false)
            bumpRefresh()
          }}
        />
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
        active ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}