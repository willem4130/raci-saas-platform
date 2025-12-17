'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Server Configuration Error',
    description:
      'There is a problem with the server configuration. Please contact support.',
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to access this resource.',
  },
  Verification: {
    title: 'Verification Failed',
    description:
      'The verification token has expired or has already been used. Please try signing in again.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An error occurred during authentication. Please try again.',
  },
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') ?? 'Default'

  const errorInfo = errorMessages[error] ?? errorMessages.Default

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <CardTitle className="text-2xl font-bold">
              {errorInfo?.title || 'Authentication Error'}
            </CardTitle>
          </div>
          <CardDescription>{errorInfo?.description || 'An error occurred during authentication.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">
                <strong>Error Code:</strong> {error}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/auth/signin">
                  Return to Sign In
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">
                  Go to Homepage
                </Link>
              </Button>
            </div>

            <div className="mt-6 border-t pt-6 text-center">
              <p className="text-sm text-gray-600">
                Need help?{' '}
                <Link
                  href="/support"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Contact Support
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
