import { z } from 'zod';

export const loginSchema = z
  .object({
    username: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(1),
  })
  .refine((value) => Boolean(value.username || value.email), {
    message: 'نام کاربری الزامی است.',
  });

export type LoginDto = z.infer<typeof loginSchema>;

export const roles = [
  'ADMIN',
  'PLANNER',
  'TECHNICIAN',
  'RELIABILITY_ENGINEER',
  'ENERGY_MANAGER',
] as const;

export type Role = (typeof roles)[number];
