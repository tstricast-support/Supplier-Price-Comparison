import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start gap-3">
          <div className={`rounded-full p-2 ${danger ? 'bg-red-50' : 'bg-brand-50'}`}>
            <AlertTriangle size={20} className={danger ? 'text-red-600' : 'text-brand-600'} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
          </div>
          <button onClick={onCancel} className="rounded-full p-1 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
