import type { Address } from 'viem';

export interface Row {
  id: string;
  agentId: string;
  publicAddress: Address;
  revokedAt: Date | null;
}

export interface ExtractedParams {
  literals: string[];
  hasIsNull: boolean;
}

export function extractParams(where: unknown): ExtractedParams {
  const literals: string[] = [];
  let hasIsNull = false;
  const seen = new WeakSet<object>();
  function walk(node: unknown): void {
    if (node === null || typeof node !== 'object') return;
    if (seen.has(node as object)) return;
    seen.add(node as object);
    // biome-ignore lint/suspicious/noExplicitAny: drizzle internals
    const n = node as any;
    if (typeof n.value === 'string') {
      if (/is null/i.test(n.value)) {
        hasIsNull = true;
      } else if (n.value.length >= 8) {
        literals.push(n.value);
      }
    }
    if (Array.isArray(n.queryChunks)) for (const c of n.queryChunks) walk(c);
  }
  walk(where);
  return { literals, hasIsNull };
}

export interface DbHandle {
  // biome-ignore lint/suspicious/noExplicitAny: stub
  db: any;
  rows: Row[];
  failNextUpdate(err: Error): void;
}

export function makeDb(initial: Row[]): DbHandle {
  const rows: Row[] = initial.map((r) => ({ ...r }));
  let nextUpdateError: Error | null = null;
  // biome-ignore lint/suspicious/noExplicitAny: stub
  const db: any = {
    update: () => ({
      // biome-ignore lint/suspicious/noExplicitAny: drizzle
      set: (patch: any) => ({
        where: (w: unknown) => ({
          returning: async () => {
            if (nextUpdateError) {
              const e = nextUpdateError;
              nextUpdateError = null;
              throw e;
            }
            const { literals } = extractParams(w);
            const [id, agentId] = literals;
            const updated: Row[] = [];
            for (const r of rows) {
              if (r.id === id && r.agentId === agentId && r.revokedAt === null) {
                r.revokedAt = patch.revokedAt;
                updated.push(r);
              }
            }
            return updated.map((r) => ({
              id: r.id,
              agentId: r.agentId,
              publicAddress: r.publicAddress,
              revokedAt: r.revokedAt,
            }));
          },
        }),
      }),
    }),
    select: () => ({
      from: () => ({
        where: (w: unknown) => {
          const { literals } = extractParams(w);
          let matched: Row[] = [];
          if (literals.length === 1) {
            const lit = literals[0];
            const byId = rows.filter((r) => r.id === lit);
            if (byId.length > 0) {
              matched = byId;
            } else {
              matched = rows.filter((r) => r.agentId === lit && r.revokedAt === null);
            }
          }
          const project = matched.map((r) => ({
            id: r.id,
            agentId: r.agentId,
            publicAddress: r.publicAddress,
            revokedAt: r.revokedAt,
          }));
          return {
            limit: async (_n: number) => project,
            // biome-ignore lint/suspicious/noThenProperty: stub mimics drizzle's awaitable query builder
            then: (resolve: (v: unknown) => unknown) => resolve(project),
          };
        },
      }),
    }),
  };
  return {
    db,
    rows,
    failNextUpdate(err: Error) {
      nextUpdateError = err;
    },
  };
}
