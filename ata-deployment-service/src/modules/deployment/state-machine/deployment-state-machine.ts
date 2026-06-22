/**
 * Phase 6 — Deployment state machine.
 *
 * The orchestrator is the ONLY component allowed to transition state, and it
 * must do so through `assertTransition`. Transitions are append-only events;
 * the stored `deployments.state` is just the latest projection.
 */

export type DeploymentState =
  | 'queued'
  | 'planning'
  | 'plan_ready'
  | 'awaiting_approval'
  | 'applying'
  | 'applied'
  | 'failed'
  | 'destroying'
  | 'destroyed'
  | 'rolled_back';

export type DeploymentEventName =
  | 'plan_requested'
  | 'plan_succeeded'
  | 'plan_failed'
  | 'approved'
  | 'apply_requested'
  | 'apply_succeeded'
  | 'apply_failed'
  | 'destroy_requested'
  | 'destroy_succeeded'
  | 'destroy_failed'
  | 'rolled_back';

interface Transition {
  from: DeploymentState;
  to: DeploymentState;
}

// Single source of truth for legal transitions, keyed by event.
const TRANSITIONS: Record<DeploymentEventName, Transition[]> = {
  plan_requested: [
    { from: 'queued', to: 'planning' },
    { from: 'plan_ready', to: 'planning' }, // re-plan
    { from: 'failed', to: 'planning' }, // retry
  ],
  plan_succeeded: [{ from: 'planning', to: 'plan_ready' }],
  plan_failed: [{ from: 'planning', to: 'failed' }],
  // Approval gate sits between a ready plan and apply.
  approved: [{ from: 'plan_ready', to: 'awaiting_approval' }],
  apply_requested: [
    { from: 'awaiting_approval', to: 'applying' },
    { from: 'failed', to: 'applying' }, // retry a failed apply
  ],
  apply_succeeded: [{ from: 'applying', to: 'applied' }],
  apply_failed: [{ from: 'applying', to: 'failed' }],
  destroy_requested: [
    { from: 'applied', to: 'destroying' },
    { from: 'failed', to: 'destroying' },
  ],
  destroy_succeeded: [{ from: 'destroying', to: 'destroyed' }],
  destroy_failed: [{ from: 'destroying', to: 'failed' }],
  rolled_back: [{ from: 'applied', to: 'rolled_back' }],
};

export const TERMINAL_STATES: ReadonlySet<DeploymentState> = new Set([
  'destroyed',
  'rolled_back',
]);

export class IllegalTransitionError extends Error {
  constructor(from: DeploymentState, event: DeploymentEventName) {
    super(`Illegal transition: cannot apply "${event}" from state "${from}"`);
    this.name = 'IllegalTransitionError';
  }
}

/** Returns the target state for an event, or throws if the transition is illegal. */
export function nextState(
  current: DeploymentState,
  event: DeploymentEventName,
): DeploymentState {
  const match = TRANSITIONS[event]?.find((t) => t.from === current);
  if (!match) throw new IllegalTransitionError(current, event);
  return match.to;
}

export function canTransition(
  current: DeploymentState,
  event: DeploymentEventName,
): boolean {
  return !!TRANSITIONS[event]?.some((t) => t.from === current);
}

export function isTerminal(state: DeploymentState): boolean {
  return TERMINAL_STATES.has(state);
}
