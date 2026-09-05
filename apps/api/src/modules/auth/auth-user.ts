import { Role } from '@aria/contracts';

export type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  username: string;
  fullName: string;
  roles: Role[];
};
