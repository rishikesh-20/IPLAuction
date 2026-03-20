import { useAuction } from '../../context/AuctionContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useAuction();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-medium animate-slide-in cursor-pointer
            ${t.type === 'error' ? 'bg-red-900 border border-red-700 text-red-200' : 'bg-emerald-900 border border-emerald-700 text-emerald-200'}`}
        >
          <span>{t.type === 'error' ? '⚠' : '✓'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
