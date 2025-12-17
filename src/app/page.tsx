export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between text-sm">
        <h1 className="text-4xl font-bold text-center mb-4">
          RACI Matrix SaaS Platform
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Enterprise-grade task assignment and workload management
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Multi-Tenant</h2>
            <p className="text-sm text-muted-foreground">
              Organization-based isolation with consultancy super-admin access
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">RACI Validation</h2>
            <p className="text-sm text-muted-foreground">
              Automated rules: exactly 1 Accountable, ≥1 Responsible per task
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Workload Analysis</h2>
            <p className="text-sm text-muted-foreground">
              Real-time dashboards with bottleneck identification
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
