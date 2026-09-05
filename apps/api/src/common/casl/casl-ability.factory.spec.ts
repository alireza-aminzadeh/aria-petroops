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
});
