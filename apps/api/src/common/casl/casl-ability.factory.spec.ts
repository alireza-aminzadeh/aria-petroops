import { subject } from '@casl/ability';
import { CaslAbilityFactory } from './casl-ability.factory';
import { AuthUser } from '../../modules/auth/auth-user';

function user(roles: AuthUser['roles']): AuthUser {
  return {
    id: 'u1',
    tenantId: 't1',
    email: 'u@example.com',
    username: 'u',
    fullName: 'User',
    roles,
  };
}

describe('CaslAbilityFactory', () => {
  const factory = new CaslAbilityFactory();

  it('lets ADMIN manage everything', () => {
    const ability = factory.createForUser(user(['ADMIN']));
    expect(ability.can('approve', 'WorkOrder')).toBe(true);
    expect(ability.can('import', 'Telemetry')).toBe(true);
  });

  it('lets PLANNER approve and assign work orders', () => {
    const ability = factory.createForUser(user(['PLANNER']));
    expect(ability.can('create', 'WorkOrder')).toBe(true);
    expect(ability.can('approve', 'WorkOrder')).toBe(true);
    expect(ability.can('start', 'WorkOrder')).toBe(false);
  });

  it('lets TECHNICIAN start and submit only', () => {
    const ability = factory.createForUser(user(['TECHNICIAN']));
    expect(ability.can('start', 'WorkOrder')).toBe(true);
    expect(ability.can('submit', 'WorkOrder')).toBe(true);
    expect(ability.can('approve', 'WorkOrder')).toBe(false);
    expect(ability.can('create', 'Equipment')).toBe(false);
  });

  it('ABAC: TECHNICIAN can start/submit only a WorkOrder assigned to them (not any technician\'s)', () => {
    const tech = user(['TECHNICIAN']); // id: 'u1', tenantId: 't1'
    const ability = factory.createForUser(tech);

    const assignedToMe = subject('WorkOrder', { tenantId: 't1', assignedToId: 'u1' });
    const assignedToSomeoneElse = subject('WorkOrder', { tenantId: 't1', assignedToId: 'u2' });
    const unassigned = subject('WorkOrder', { tenantId: 't1', assignedToId: null });

    expect(ability.can('start', assignedToMe)).toBe(true);
    expect(ability.can('submit', assignedToMe)).toBe(true);
    expect(ability.can('start', assignedToSomeoneElse)).toBe(false);
    expect(ability.can('start', unassigned)).toBe(false);
  });

  it('ABAC: TECHNICIAN cannot act on a WorkOrder from another tenant even if assigned to them', () => {
    const tech = user(['TECHNICIAN']); // tenantId: 't1'
    const ability = factory.createForUser(tech);
    const otherTenantButAssignedToMe = subject('WorkOrder', { tenantId: 't2', assignedToId: 'u1' });
    expect(ability.can('start', otherTenantButAssignedToMe)).toBe(false);
  });

  it('ABAC: PLANNER can approve/reject/close/cancel within their own tenant, not cross-tenant', () => {
    const planner = user(['PLANNER']); // tenantId: 't1'
    const ability = factory.createForUser(planner);
    const ownTenant = subject('WorkOrder', { tenantId: 't1', assignedToId: null });
    const otherTenant = subject('WorkOrder', { tenantId: 't2', assignedToId: null });

    expect(ability.can('approve', ownTenant)).toBe(true);
    expect(ability.can('reject', ownTenant)).toBe(true);
    expect(ability.can('close', ownTenant)).toBe(true);
    expect(ability.can('cancel', ownTenant)).toBe(true);
    expect(ability.can('approve', otherTenant)).toBe(false);
  });

  it('PLANNER cannot start/submit (that is the technician-only, assignment-based action)', () => {
    const ability = factory.createForUser(user(['PLANNER']));
    const anyWorkOrder = subject('WorkOrder', { tenantId: 't1', assignedToId: null });
    expect(ability.can('start', anyWorkOrder)).toBe(false);
    expect(ability.can('submit', anyWorkOrder)).toBe(false);
  });
});
