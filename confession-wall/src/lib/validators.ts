import { z } from 'zod';
import { CONFESSION_CATEGORIES, REACTION_EMOJIS } from '@/types';

export const createConfessionSchema = z.object({
  content: z
    .string()
    .trim()
    .min(5, 'Confession must be at least 5 characters long.')
    .max(1000, 'Confession must be 1000 characters or fewer.'),
  category: z.enum(CONFESSION_CATEGORIES).default('Confession'),
});

export const reactSchema = z.object({
  emoji: z.enum(REACTION_EMOJIS),
  action: z.enum(['add', 'remove']).default('add'),
});

export const reportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Please provide a brief reason (at least 5 characters).')
    .max(300, 'Reason must be 300 characters or fewer.'),
});

export const moderateSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Content is required.')
    .max(1000, 'Content must be 1000 characters or fewer.'),
  category: z.enum(CONFESSION_CATEGORIES).optional(),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Password is required.'),
});

export const adminActionSchema = z.object({
  id: z.string().uuid('Invalid confession ID.'),
  action: z.enum(['approve', 'reject', 'delete', 'regenerate_ai']),
  reason: z.string().max(500).optional(),
});

export type CreateConfessionInput = z.infer<typeof createConfessionSchema>;
export type ReactInput = z.infer<typeof reactSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type ModerateInput = z.infer<typeof moderateSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AdminActionInput = z.infer<typeof adminActionSchema>;
