import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import {
  AdminStatusCounts,
  CONFESSION_CATEGORIES,
  Confession,
  ConfessionCategory,
  ConfessionSort,
  ConfessionStatus,
  REACTION_EMOJIS,
  ReactionCounts,
  ReactionEmoji,
} from '@/types';
import { generateAIReaction } from './nvidia';
import { isSupabaseConfigured } from './supabase/config';
import { getSupabaseAdmin } from './supabase/server';

interface DbReactionRow {
  emoji: string;
  count: number;
}

interface DbConfessionRow {
  id: string;
  content: string;
  category?: string | null;
  status: ConfessionStatus;
  ai_emoji: string | null;
  ai_comment: string | null;
  moderation_reason: string | null;
  report_count?: number | null;
  ip_hash?: string | null;
  created_at: string;
  reactions?: DbReactionRow[] | null;
}

interface LocalStoreRecord extends Confession {
  ip_hash: string | null;
}

const CONFESSION_SELECT_COLUMNS =
  'id, content, category, status, ai_emoji, ai_comment, moderation_reason, report_count, created_at, reactions(emoji, count)';

export function emptyReactions(): ReactionCounts {
  return {
    '❤️': 0,
    '😂': 0,
    '😢': 0,
    '😮': 0,
  };
}

export function buildReactionCounts(rows?: DbReactionRow[] | null): ReactionCounts {
  const counts = emptyReactions();
  if (!rows) return counts;

  for (const row of rows) {
    if ((REACTION_EMOJIS as readonly string[]).includes(row.emoji)) {
      counts[row.emoji as ReactionEmoji] = Math.max(0, row.count ?? 0);
    }
  }
  return counts;
}

function normalizeCategory(value: string | null | undefined): ConfessionCategory {
  if (value && (CONFESSION_CATEGORIES as readonly string[]).includes(value)) {
    return value as ConfessionCategory;
  }
  return 'Confession';
}

function formatRow(row: DbConfessionRow, includeModerationReason: boolean): Confession {
  return {
    id: row.id,
    content: row.content,
    category: normalizeCategory(row.category),
    status: row.status,
    ai_emoji: row.ai_emoji,
    ai_comment: row.ai_comment,
    moderation_reason: includeModerationReason ? row.moderation_reason : null,
    report_count: row.report_count ?? 0,
    created_at: row.created_at,
    reactions: buildReactionCounts(row.reactions),
  };
}

function totalReactionScore(reactions: ReactionCounts): number {
  return REACTION_EMOJIS.reduce((sum, emoji) => sum + (reactions[emoji] ?? 0), 0);
}

// ============================================================================
// Local JSON File Store Fallback (used when Supabase env vars are placeholders)
// ============================================================================

function getLocalStorePath(): string {
  if (process.env.CONFESSION_DATA_FILE) {
    return process.env.CONFESSION_DATA_FILE;
  }
  return path.join(process.cwd(), '.data', 'confessions.json');
}

function buildSeedRecords(): LocalStoreRecord[] {
  const now = Date.now();
  return [
    {
      id: '11111111-1111-4111-8111-111111111111',
      content:
        'I still keep the handwritten note a stranger left on my car windshield three years ago when I was having the worst week of my life. It just said "You matter more than you know."',
      category: 'Secret',
      status: 'approved',
      ai_emoji: '🫂',
      ai_comment:
        'Sometimes a tiny act of kindness becomes an anchor for years. Keeping that note is a quiet reminder of how much light can come from unexpected places.',
      moderation_reason: null,
      report_count: 0,
      ip_hash: null,
      created_at: new Date(now - 1000 * 60 * 42).toISOString(),
      reactions: { '❤️': 18, '😂': 0, '😢': 6, '😮': 4 },
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      content:
        'At work everyone thinks I am a productivity wizard, but half of my "deep focus blocks" are just me staring at a bug until my brain reboots.',
      category: 'Work',
      status: 'approved',
      ai_emoji: '😅',
      ai_comment:
        'To be fair, tactical staring is an underrated debugging technique. If the bug eventually yields, the wizard title stands.',
      moderation_reason: null,
      report_count: 0,
      ip_hash: null,
      created_at: new Date(now - 1000 * 60 * 115).toISOString(),
      reactions: { '❤️': 7, '😂': 24, '😢': 1, '😮': 2 },
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      content:
        'I learned how to bake sourdough just so I would have an excuse to bring extra loaves to my neighbor without making things awkward.',
      category: 'Love',
      status: 'approved',
      ai_emoji: '🫶',
      ai_comment:
        'Using artisanal bread as a stealth affection strategy is genuinely adorable. Wishing your loaves and your conversations both rise nicely.',
      moderation_reason: null,
      report_count: 0,
      ip_hash: null,
      created_at: new Date(now - 1000 * 60 * 240).toISOString(),
      reactions: { '❤️': 31, '😂': 9, '😢': 0, '😮': 5 },
    },
  ];
}

let writeQueue: Promise<unknown> = Promise.resolve();

function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.catch(() => undefined);
  return next;
}

async function readLocalStore(): Promise<LocalStoreRecord[]> {
  const filePath = getLocalStorePath();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as LocalStoreRecord[];
    }
  } catch {
    // Initialize with seed confessions on first read
  }

  const seeded = buildSeedRecords();
  await writeLocalStore(seeded);
  return seeded;
}

async function writeLocalStore(records: LocalStoreRecord[]): Promise<void> {
  const filePath = getLocalStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(records, null, 2), 'utf8');
}

function toPublicConfession(record: LocalStoreRecord): Confession {
  return {
    id: record.id,
    content: record.content,
    category: normalizeCategory(record.category),
    status: record.status,
    ai_emoji: record.ai_emoji,
    ai_comment: record.ai_comment,
    moderation_reason: null,
    report_count: record.report_count ?? 0,
    created_at: record.created_at,
    reactions: { ...emptyReactions(), ...record.reactions },
  };
}

function toAdminConfession(record: LocalStoreRecord): Confession {
  return {
    ...toPublicConfession(record),
    moderation_reason: record.moderation_reason ?? null,
  };
}

// ============================================================================
// Unified Store Operations
// ============================================================================

export interface ListPublicParams {
  q?: string;
  category?: string;
  sort?: ConfessionSort;
  limit?: number;
  offset?: number;
}

export interface ListPublicResult {
  confessions: Confession[];
  total: number;
  hasMore: boolean;
}

export async function listPublicConfessions(
  params: ListPublicParams = {}
): Promise<ListPublicResult> {
  const q = params.q?.trim().toLowerCase() || '';
  const category =
    params.category &&
    params.category !== 'All' &&
    (CONFESSION_CATEGORIES as readonly string[]).includes(params.category)
      ? params.category
      : null;
  const sort: ConfessionSort = params.sort === 'top' ? 'top' : 'newest';
  const limit = Math.min(Math.max(Math.trunc(params.limit ?? 20), 1), 100);
  const offset = Math.max(Math.trunc(params.offset ?? 0), 0);

  if (!isSupabaseConfigured()) {
    const records = await readLocalStore();
    let filtered = records.filter((r) => r.status === 'approved');
    if (category) {
      filtered = filtered.filter((r) => r.category === category);
    }
    if (q) {
      filtered = filtered.filter(
        (r) =>
          r.content.toLowerCase().includes(q) ||
          (r.ai_comment && r.ai_comment.toLowerCase().includes(q)) ||
          r.category.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      if (sort === 'top') {
        const diff = totalReactionScore(b.reactions) - totalReactionScore(a.reactions);
        if (diff !== 0) return diff;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const total = filtered.length;
    const slice = filtered.slice(offset, offset + limit).map(toPublicConfession);
    return {
      confessions: slice,
      total,
      hasMore: offset + slice.length < total,
    };
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('confessions')
    .select(CONFESSION_SELECT_COLUMNS, { count: 'exact' })
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }
  if (q) {
    query = query.ilike('content', `%${q}%`);
  }

  if (sort === 'top') {
    const { data, error, count } = await query.limit(200);
    if (error) throw error;
    const all = ((data ?? []) as DbConfessionRow[]).map((r) => formatRow(r, false));
    all.sort((a, b) => {
      const diff = totalReactionScore(b.reactions) - totalReactionScore(a.reactions);
      if (diff !== 0) return diff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const total = count ?? all.length;
    const slice = all.slice(offset, offset + limit);
    return {
      confessions: slice,
      total,
      hasMore: offset + slice.length < total,
    };
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  const confessions = ((data ?? []) as DbConfessionRow[]).map((r) =>
    formatRow(r, false)
  );
  const total = count ?? confessions.length;
  return {
    confessions,
    total,
    hasMore: offset + confessions.length < total,
  };
}

export async function getPublicConfessionById(
  id: string
): Promise<Confession | null> {
  if (!isSupabaseConfigured()) {
    const records = await readLocalStore();
    const match = records.find((r) => r.id === id && r.status === 'approved');
    return match ? toPublicConfession(match) : null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('confessions')
    .select(CONFESSION_SELECT_COLUMNS)
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) throw error;
  return data ? formatRow(data as DbConfessionRow, false) : null;
}

export async function getRandomPublicConfession(): Promise<Confession | null> {
  if (!isSupabaseConfigured()) {
    const records = await readLocalStore();
    const approved = records.filter((r) => r.status === 'approved');
    if (approved.length === 0) return null;
    const pick = approved[Math.floor(Math.random() * approved.length)];
    return toPublicConfession(pick);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('confessions')
    .select(CONFESSION_SELECT_COLUMNS)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  const rows = (data ?? []) as DbConfessionRow[];
  if (rows.length === 0) return null;
  const pick = rows[Math.floor(Math.random() * rows.length)];
  return formatRow(pick, false);
}

export interface CreateConfessionRecordInput {
  content: string;
  category: ConfessionCategory;
  status: ConfessionStatus;
  ai_emoji: string | null;
  ai_comment: string | null;
  moderation_reason: string | null;
  ip_hash: string;
}

export async function createConfessionRecord(
  input: CreateConfessionRecordInput
): Promise<Confession> {
  if (!isSupabaseConfigured()) {
    return withStoreLock(async () => {
      const records = await readLocalStore();
      const record: LocalStoreRecord = {
        id: crypto.randomUUID(),
        content: input.content,
        category: input.category,
        status: input.status,
        ai_emoji: input.ai_emoji,
        ai_comment: input.ai_comment,
        moderation_reason: input.moderation_reason,
        report_count: 0,
        ip_hash: input.ip_hash,
        created_at: new Date().toISOString(),
        reactions: emptyReactions(),
      };
      records.unshift(record);
      await writeLocalStore(records);
      return toAdminConfession(record);
    });
  }

  const supabase = getSupabaseAdmin();
  const { data: inserted, error: insertError } = await supabase
    .from('confessions')
    .insert({
      content: input.content,
      category: input.category,
      status: input.status,
      ai_emoji: input.ai_emoji,
      ai_comment: input.ai_comment,
      moderation_reason: input.moderation_reason,
      ip_hash: input.ip_hash,
    })
    .select(
      'id, content, category, status, ai_emoji, ai_comment, moderation_reason, report_count, created_at'
    )
    .single();

  if (insertError || !inserted) {
    throw insertError || new Error('Failed to insert confession');
  }

  const initialReactions = REACTION_EMOJIS.map((emoji) => ({
    confession_id: inserted.id,
    emoji,
    count: 0,
  }));

  const { error: reactionsError } = await supabase
    .from('reactions')
    .insert(initialReactions);

  if (reactionsError) {
    console.error('Failed to initialize reactions:', reactionsError);
  }

  return formatRow(
    {
      ...(inserted as DbConfessionRow),
      reactions: initialReactions.map(({ emoji, count }) => ({ emoji, count })),
    },
    true
  );
}

export async function adjustConfessionReaction(
  id: string,
  emoji: ReactionEmoji,
  action: 'add' | 'remove' = 'add'
): Promise<{
  confessionId: string;
  emoji: ReactionEmoji;
  count: number;
  reactions: ReactionCounts;
} | null> {
  const delta = action === 'remove' ? -1 : 1;

  if (!isSupabaseConfigured()) {
    return withStoreLock(async () => {
      const records = await readLocalStore();
      const idx = records.findIndex((r) => r.id === id && r.status === 'approved');
      if (idx === -1) return null;

      const current = records[idx].reactions?.[emoji] ?? 0;
      const nextCount = Math.max(0, current + delta);
      records[idx] = {
        ...records[idx],
        reactions: {
          ...emptyReactions(),
          ...records[idx].reactions,
          [emoji]: nextCount,
        },
      };
      await writeLocalStore(records);
      return {
        confessionId: id,
        emoji,
        count: nextCount,
        reactions: records[idx].reactions,
      };
    });
  }

  const supabase = getSupabaseAdmin();
  const { data: confession, error: confessionError } = await supabase
    .from('confessions')
    .select('id')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (confessionError) throw confessionError;
  if (!confession) return null;

  const { data: newCount, error: rpcError } = await supabase.rpc(
    'adjust_reaction',
    {
      p_confession_id: id,
      p_emoji: emoji,
      p_delta: delta,
    }
  );

  if (rpcError) throw rpcError;

  const { data: reactionRows } = await supabase
    .from('reactions')
    .select('emoji, count')
    .eq('confession_id', id);

  return {
    confessionId: id,
    emoji,
    count: typeof newCount === 'number' ? newCount : Math.max(0, delta),
    reactions: buildReactionCounts((reactionRows ?? []) as DbReactionRow[]),
  };
}

export async function reportConfessionById(
  id: string,
  reason: string
): Promise<{ id: string; report_count: number; status: ConfessionStatus } | null> {
  if (!isSupabaseConfigured()) {
    return withStoreLock(async () => {
      const records = await readLocalStore();
      const idx = records.findIndex((r) => r.id === id && r.status === 'approved');
      if (idx === -1) return null;

      const nextCount = (records[idx].report_count ?? 0) + 1;
      records[idx] = {
        ...records[idx],
        report_count: nextCount,
        status: 'flagged',
        moderation_reason: `User report: ${reason}`,
      };
      await writeLocalStore(records);
      return {
        id,
        report_count: nextCount,
        status: 'flagged',
      };
    });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await supabase
    .from('confessions')
    .select('id, report_count')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) return null;

  const nextCount = ((existing.report_count as number | null) ?? 0) + 1;
  const { data: updated, error: updateError } = await supabase
    .from('confessions')
    .update({
      report_count: nextCount,
      status: 'flagged',
      moderation_reason: `User report: ${reason}`,
    })
    .eq('id', id)
    .select('id, report_count, status')
    .single();

  if (updateError || !updated) throw updateError || new Error('Report failed');
  return {
    id: updated.id,
    report_count: updated.report_count ?? nextCount,
    status: updated.status as ConfessionStatus,
  };
}

export async function listAdminConfessions(params: {
  status?: ConfessionStatus | 'all';
  q?: string;
}): Promise<{ confessions: Confession[]; counts: AdminStatusCounts }> {
  const statusFilter = params.status && params.status !== 'all' ? params.status : null;
  const q = params.q?.trim().toLowerCase() || '';

  if (!isSupabaseConfigured()) {
    const records = await readLocalStore();
    const counts: AdminStatusCounts = {
      all: records.length,
      flagged: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const r of records) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }

    let filtered = statusFilter
      ? records.filter((r) => r.status === statusFilter)
      : [...records];
    if (q) {
      filtered = filtered.filter(
        (r) =>
          r.content.toLowerCase().includes(q) ||
          (r.moderation_reason && r.moderation_reason.toLowerCase().includes(q)) ||
          r.category.toLowerCase().includes(q)
      );
    }

    filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      confessions: filtered.map(toAdminConfession),
      counts,
    };
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('confessions')
    .select(CONFESSION_SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }
  if (q) {
    query = query.ilike('content', `%${q}%`);
  }

  const [{ data, error }, { data: allStatuses }] = await Promise.all([
    query,
    supabase.from('confessions').select('status'),
  ]);

  if (error) throw error;

  const counts: AdminStatusCounts = {
    all: 0,
    flagged: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  for (const row of (allStatuses ?? []) as Array<{ status: ConfessionStatus }>) {
    counts.all += 1;
    if (row.status in counts) {
      counts[row.status] += 1;
    }
  }

  return {
    confessions: ((data ?? []) as DbConfessionRow[]).map((r) => formatRow(r, true)),
    counts,
  };
}

export async function deleteConfessionById(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return withStoreLock(async () => {
      const records = await readLocalStore();
      const idx = records.findIndex((r) => r.id === id);
      if (idx === -1) return false;
      records.splice(idx, 1);
      await writeLocalStore(records);
      return true;
    });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('confessions')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function moderateAdminConfession(params: {
  id: string;
  action: 'approve' | 'reject' | 'delete' | 'regenerate_ai';
  reason?: string;
}): Promise<
  | { deleted: true; id: string }
  | { deleted?: false; confession: Confession }
  | null
> {
  const { id, action, reason } = params;

  if (action === 'delete') {
    const deleted = await deleteConfessionById(id);
    return deleted ? { deleted: true, id } : null;
  }

  if (!isSupabaseConfigured()) {
    // Load first without holding lock across slow AI network call
    const snapshot = await readLocalStore();
    const target = snapshot.find((r) => r.id === id);
    if (!target) return null;

    let aiEmoji = target.ai_emoji;
    let aiComment = target.ai_comment;
    if (
      action === 'regenerate_ai' ||
      (action === 'approve' && !target.ai_comment)
    ) {
      const aiReaction = await generateAIReaction(target.content, target.category);
      aiEmoji = aiReaction.emoji;
      aiComment = aiReaction.comment;
    }

    return withStoreLock(async () => {
      const records = await readLocalStore();
      const idx = records.findIndex((r) => r.id === id);
      if (idx === -1) return null;

      const current = records[idx];
      const nextStatus: ConfessionStatus =
        action === 'regenerate_ai'
          ? current.status
          : action === 'approve'
            ? 'approved'
            : 'rejected';

      records[idx] = {
        ...current,
        status: nextStatus,
        ai_emoji: aiEmoji,
        ai_comment: aiComment,
        moderation_reason:
          reason !== undefined
            ? reason || null
            : action === 'approve'
              ? null
              : current.moderation_reason,
      };
      await writeLocalStore(records);
      return { confession: toAdminConfession(records[idx]) };
    });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await supabase
    .from('confessions')
    .select(CONFESSION_SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) return null;

  const existingRow = existing as DbConfessionRow;
  const nextStatus: ConfessionStatus =
    action === 'regenerate_ai'
      ? existingRow.status
      : action === 'approve'
        ? 'approved'
        : 'rejected';

  const updatePayload: {
    status: ConfessionStatus;
    moderation_reason?: string | null;
    ai_emoji?: string | null;
    ai_comment?: string | null;
  } = {
    status: nextStatus,
  };

  if (reason !== undefined) {
    updatePayload.moderation_reason = reason || null;
  } else if (action === 'approve') {
    updatePayload.moderation_reason = null;
  }

  if (
    action === 'regenerate_ai' ||
    (action === 'approve' && !existingRow.ai_comment)
  ) {
    const aiReaction = await generateAIReaction(
      existingRow.content,
      existingRow.category ?? undefined
    );
    updatePayload.ai_emoji = aiReaction.emoji;
    updatePayload.ai_comment = aiReaction.comment;
  }

  const { data: updated, error: updateError } = await supabase
    .from('confessions')
    .update(updatePayload)
    .eq('id', id)
    .select(CONFESSION_SELECT_COLUMNS)
    .single();

  if (updateError || !updated) {
    throw updateError || new Error('Failed to update confession');
  }

  if (action === 'approve') {
    const existingReactions = existingRow.reactions ?? [];
    if (existingReactions.length === 0) {
      await supabase.from('reactions').upsert(
        REACTION_EMOJIS.map((emoji) => ({
          confession_id: id,
          emoji,
          count: 0,
        })),
        { onConflict: 'confession_id,emoji', ignoreDuplicates: true }
      );
    }
  }

  return { confession: formatRow(updated as DbConfessionRow, true) };
}
