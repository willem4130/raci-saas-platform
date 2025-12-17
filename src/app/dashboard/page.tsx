'use client'

import Link from 'next/link'
import {
  Plus,
  FolderOpen,
  Users,
  Grid3x3,
  ArrowRight,
  Loader2,
  Activity,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/trpc/client'

export default function DashboardPage() {
  // Fetch organizations
  const { data: organizations, isLoading: orgsLoading } = api.organization.list.useQuery()

  const isLoading = orgsLoading

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back. Here&apos;s what&apos;s happening.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link href="/dashboard/matrices/new">
              <Plus className="mr-2 h-4 w-4" />
              New Matrix
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link href="/dashboard/organizations">
            <FolderOpen className="mr-3 h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium">Organizations</div>
              <div className="text-xs text-muted-foreground">Manage workspaces</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link href="/dashboard/projects">
            <FolderOpen className="mr-3 h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium">Projects</div>
              <div className="text-xs text-muted-foreground">View all projects</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link href="/dashboard/matrices">
            <Grid3x3 className="mr-3 h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium">Matrices</div>
              <div className="text-xs text-muted-foreground">View all matrices</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link href="/dashboard/analytics">
            <Activity className="mr-3 h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium">Analytics</div>
              <div className="text-xs text-muted-foreground">View insights</div>
            </div>
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        {/* Quick Stats */}
        <Card className="max-w-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quick Stats</CardTitle>
            <CardDescription>Your workspace overview</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>Organizations</span>
                  </div>
                  <span className="font-semibold">{organizations?.length ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Total Members</span>
                  </div>
                  <span className="font-semibold">
                    {organizations?.reduce((acc: number, org: any) => acc + (org._count?.members ?? 0), 0) ?? 0}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Organizations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Your Organizations</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/organizations">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !organizations || organizations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
              <p className="text-muted-foreground mb-4 text-center text-sm max-w-md">
                Create your first organization to start managing projects and RACI matrices
              </p>
              <Button size="sm" asChild>
                <Link href="/dashboard/organizations/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Organization
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.slice(0, 6).map((org: any) => (
              <Link key={org.id} href={`/dashboard/organizations/${org.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>{org._count?.projects ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{org._count?.members ?? 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
