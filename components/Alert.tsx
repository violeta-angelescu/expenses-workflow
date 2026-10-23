export function Alert({ title = "Error", children }: { title?: string; children: React.ReactNode }) {
  return (
    <div role="alert" className="mb-3">
      <div className="bg-red-500 text-white font-bold rounded-t px-4 py-2">{title}</div>
      <div className="border border-t-0 border-red-400 rounded-b bg-red-100 px-4 py-3 text-red-700 flex items-center justify-between gap-3">
        {children}
      </div>
    </div>
  );
}
