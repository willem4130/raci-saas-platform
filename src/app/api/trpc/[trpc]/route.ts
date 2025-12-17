/**
 * tRPC API Route Handler
 *
 * Handles all tRPC requests through Next.js App Router.
 * Available at: /api/trpc/*
 */

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type NextRequest } from 'next/server';

import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';

/**
 * Configure tRPC request handler
 */
const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}:`,
              error.message
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
