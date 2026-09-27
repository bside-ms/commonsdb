/**
 * Public surface of the tasks feature.
 *
 * Everything not exported here is internal. Other features and routes
 * import from '$features/tasks' only — never from a path inside it.
 */
export { default as TaskCard } from './components/TaskCard.svelte';
export { default as TaskFilters } from './components/TaskFilters.svelte';

export { listTasks, getTask, claimShift, releaseShift } from './api/tasks.remote';

export type { Task, Shift, ShiftStatus } from './types';
