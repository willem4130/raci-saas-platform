/**
 * Root tRPC Router
 *
 * Combines all individual routers into a single root router.
 * This is the main API that will be exposed to the client.
 */

import { createTRPCRouter } from '@/server/api/trpc';
import { organizationRouter } from './routers/organization';
import { memberRouter } from './routers/member';
import { projectRouter } from './routers/project';
import { matrixRouter } from './routers/matrix';
import { taskRouter } from './routers/task';
import { assignmentRouter } from './routers/assignment';

/**
 * Main application router
 */
export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  member: memberRouter,
  project: projectRouter,
  matrix: matrixRouter,
  task: taskRouter,
  assignment: assignmentRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
