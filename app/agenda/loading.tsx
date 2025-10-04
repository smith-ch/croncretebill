export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 bg-gray-200 rounded-2xl"></div>
                <div>
                  <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-48"></div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-6 bg-gray-200 rounded w-24"></div>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
                <div className="h-6 bg-gray-200 rounded w-28"></div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 bg-gray-200 rounded w-36"></div>
              <div className="h-10 bg-gray-200 rounded w-28"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>

          {/* Month-End Alert */}
          <div className="h-32 bg-gray-200 rounded-lg"></div>

          {/* Tabs */}
          <div className="space-y-6">
            <div className="flex space-x-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded w-24"></div>
              ))}
            </div>

            {/* Content */}
            <div className="grid gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}