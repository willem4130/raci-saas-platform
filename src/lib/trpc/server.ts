/**
 * tRPC Server Utilities
 *
 * Provides utilities for calling tRPC procedures from server components
 * and server actions in Next.js App Router.
 */

import 'server-only';

import { headers } from 'next/headers';
import { cache } from 'react';

import { appRouter } from '@/server/api/root';
import { createTRPCContext, createCallerFactory } from '@/server/api/trpc';

/**
 * Create a server-side tRPC caller
 * This wrapper properly handles React cache() and awaits headers
 */
const createCaller = cache(async () => {
  // Await the headers promise
  const headersList = await headers();

  const context = await createTRPCContext({
    headers: headersList,
  });

  const callerFactory = createCallerFactory(appRouter);
  return callerFactory(context);
});

/**
 * Server-side tRPC client for use in:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 * - Middleware
 */
export const trpcServer = async () => {
  return await createCaller();
};
