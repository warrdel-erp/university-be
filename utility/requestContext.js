import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Global request context utilizing AsyncLocalStorage.
 * Stores:
 * - universityId: number
 * - instituteId: number
 * - academicYearId: number
 * - userId: number
 * - role: string (lowercased, e.g., 'admin' | 'teacher' | 'student')
 * - bypass: boolean (if true, bypasses scope filters)
 */
export const requestContext = new AsyncLocalStorage();
