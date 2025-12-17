/**
 * NextAuth API Route Handler
 *
 * Handles all authentication-related API routes:
 * - GET /api/auth/session
 * - POST /api/auth/signin
 * - POST /api/auth/signout
 * - GET /api/auth/csrf
 * - GET /api/auth/providers
 */

import { handlers } from '@/server/auth';

export const { GET, POST } = handlers;
