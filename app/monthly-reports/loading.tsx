export default function MonthlyReportsLoading() {
  return (
    <div className="space-y-8 p-6">
      {/* Header skeleton */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="w-64 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="w-96 h-6 bg-gray-200 rounded animate-pulse mx-auto"></div>
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>

      {/* Additional charts skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 h-96 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>

      {/* Monthly cards skeleton */}
      <div>
        <div className="w-48 h-8 bg-gray-200 rounded animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
