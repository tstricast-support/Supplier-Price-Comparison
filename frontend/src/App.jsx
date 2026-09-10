import { useState } from 'react'
import { LayoutGrid, Building2, Settings, PlusCircle } from 'lucide-react'
import BrowseFlow from './components/BrowseFlow'
import SupplierView from './components/SupplierView'
import AdminPanel from './components/AdminPanel'
import CreateProductModal from './components/CreateProductModal'

export default function App() {
  const [tab, setTab] = useState('browse') // 'browse' | 'supplier' | 'manage'
  const [showCreateProduct, setShowCreateProduct] = useState(false)
  // Bumped whenever data changes anywhere (new product, edited price, etc.)
  // so every screen re-fetches instead of showing stale data.
  const [refreshKey, setRefreshKey] = useState(0)
  const bumpRefresh = () => setRefreshKey((k) => k + 1)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            
            <h1 className="truncate text-lg text-base font-bold text-black">Tricast Price Comparison</h1>
          </div>

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
            Browse
          </TabButton>
          <TabButton active={tab === 'supplier'} onClick={() => setTab('supplier')} >
            Vendor View
          </TabButton>
          <TabButton active={tab === 'manage'} onClick={() => setTab('manage')} icon={<Settings size={15} />}>
            Manage
          </TabButton>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {tab === 'browse' && <BrowseFlow refreshKey={refreshKey} />}
        {tab === 'supplier' && <SupplierView />}
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
