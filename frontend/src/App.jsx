import { useState } from 'react'
import { LayoutGrid, Building2, Settings } from 'lucide-react'
import MatrixTable from './components/MatrixTable'
import SupplierView from './components/SupplierView'
import AdminPanel from './components/AdminPanel'

export default function App() {
  const [tab, setTab] = useState('matrix') // 'matrix' | 'supplier' | 'manage'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-brand-600 p-1.5">
              <LayoutGrid size={18} className="text-white" />
            </div>
            <h1 className="text-base font-semibold text-gray-900">
              Supplier Price Comparison
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-6">
          <TabButton active={tab === 'matrix'} onClick={() => setTab('matrix')} icon={<LayoutGrid size={15} />}>
            Matrix Comparison
          </TabButton>
          <TabButton active={tab === 'supplier'} onClick={() => setTab('supplier')} icon={<Building2 size={15} />}>
            Supplier View
          </TabButton>
          <TabButton active={tab === 'manage'} onClick={() => setTab('manage')} icon={<Settings size={15} />}>
            Manage
          </TabButton>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {tab === 'matrix' && <MatrixTable />}
        {tab === 'supplier' && <SupplierView />}
        {tab === 'manage' && <AdminPanel />}
      </main>
    </div>
  )
}

function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'border-brand-600 text-brand-700'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}