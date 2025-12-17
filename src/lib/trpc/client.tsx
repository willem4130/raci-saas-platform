/**
 * tRPC Client Configuration
 *
 * Provides React hooks and utilities for making type-safe API calls
 * from the client-side components.
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import superjson from 'superjson';

import { type AppRouter } from '@/server/api/root';

/**
 * Create tRPC React hooks
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Alias for tRPC hooks (common pattern)
 */
export const api = trpc;

/**
 * Get base URL for tRPC API calls
 */
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser: use relative URL
    return '';
  }

  if (process.env.VERCEL_URL) {
    // SSR on Vercel: use Vercel URL
    return `https://${process.env.VERCEL_URL}`;
  }

  // SSR on localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * tRPC Provider Component
 * Wrap your app with this to enable tRPC hooks
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          headers() {
            return {
              'x-trpc-source': 'react',
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
