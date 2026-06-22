import {
  canTransition,
  isTerminal,
  IllegalTransitionError,
  nextState,
} from './deployment-state-machine';

describe('deployment state machine', () => {
  it('walks the happy path queued → applied', () => {
    expect(nextState('queued', 'plan_requested')).toBe('planning');
    expect(nextState('planning', 'plan_succeeded')).toBe('plan_ready');
    expect(nextState('plan_ready', 'approved')).toBe('awaiting_approval');
    expect(nextState('awaiting_approval', 'apply_requested')).toBe('applying');
    expect(nextState('applying', 'apply_succeeded')).toBe('applied');
  });

  it('forbids apply before approval', () => {
    expect(canTransition('plan_ready', 'apply_requested')).toBe(false);
    expect(() => nextState('plan_ready', 'apply_requested')).toThrow(IllegalTransitionError);
  });

  it('cannot approve from queued', () => {
    expect(() => nextState('queued', 'approved')).toThrow(IllegalTransitionError);
  });

  it('allows retry of a failed apply', () => {
    expect(nextState('failed', 'apply_requested')).toBe('applying');
  });

  it('supports destroy and rollback from applied', () => {
    expect(nextState('applied', 'destroy_requested')).toBe('destroying');
    expect(nextState('destroying', 'destroy_succeeded')).toBe('destroyed');
    expect(nextState('applied', 'rolled_back')).toBe('rolled_back');
  });

  it('marks destroyed and rolled_back as terminal', () => {
    expect(isTerminal('destroyed')).toBe(true);
    expect(isTerminal('rolled_back')).toBe(true);
    expect(isTerminal('applied')).toBe(false);
  });

  it('records a failed plan', () => {
    expect(nextState('planning', 'plan_failed')).toBe('failed');
  });
});
