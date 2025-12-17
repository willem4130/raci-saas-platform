import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Loading skeleton for Analytics page
 * Displays placeholder content while data is being fetched
 */
export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div>
        <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-96 bg-gray-100 rounded animate-pulse mt-2" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-300 rounded animate-pulse mb-1" />
              <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="h-6 w-44 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-6 w-36 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
