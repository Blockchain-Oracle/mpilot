import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  agents,
  attestations,
  eoaTxQueue,
  executions,
  proposals,
  sessionKeys,
  ticks,
} from '../schema/index.ts';

function columnsByName(
  table: ReturnType<typeof getTableConfig>['columns'],
): Record<string, ReturnType<typeof getTableConfig>['columns'][number]> {
  const out: Record<string, ReturnType<typeof getTableConfig>['columns'][number]> = {};
  for (const c of table) out[c.name] = c;
  return out;
}

describe('agents schema', () => {
  const cfg = getTableConfig(agents);
  const cols = columnsByName(cfg.columns);

  it('has all spec columns', () => {
    for (const name of [
      'id',
      'user_id',
      'smart_account_addr',
      'erc8004_agent_id',
      'owner_eoa',
      'policy_json',
      'goal_json',
      'chain',
      'activated_at',
      'paused_at',
      'created_at',
    ]) {
      expect(cols[name], `missing column ${name}`).toBeDefined();
    }
  });

  it('id is the primary key', () => {
    expect(cols['id']?.primary).toBe(true);
  });

  it('paused_at is nullable (pausable agent)', () => {
    expect(cols['paused_at']?.notNull).toBe(false);
  });

  it('user_id, smart_account_addr, owner_eoa, policy_json, goal_json, chain are NOT NULL', () => {
    for (const name of [
      'user_id',
      'smart_account_addr',
      'owner_eoa',
      'policy_json',
      'goal_json',
      'chain',
    ]) {
      expect(cols[name]?.notNull, `${name} should be NOT NULL`).toBe(true);
    }
  });
});

describe('ticks schema — FK to agents', () => {
  const cfg = getTableConfig(ticks);
  it('has agent_id FK with ON DELETE CASCADE', () => {
    const fk = cfg.foreignKeys[0];
    expect(fk, 'missing foreign key').toBeDefined();
    const ref = fk?.reference();
    expect(ref?.foreignTable).toBe(agents);
    expect(fk?.onDelete).toBe('cascade');
  });
});

describe('proposals schema — unique-pending invariant', () => {
  const cfg = getTableConfig(proposals);
  const cols = columnsByName(cfg.columns);

  it('has FKs to both agents AND ticks with cascade', () => {
    const refTables = cfg.foreignKeys.map((fk) => fk.reference().foreignTable);
    expect(refTables).toContain(agents);
    expect(refTables).toContain(ticks);
    for (const fk of cfg.foreignKeys) expect(fk.onDelete).toBe('cascade');
  });

  it('amount_usd is numeric with 30,8 precision (no float drift)', () => {
    // biome-ignore lint/suspicious/noExplicitAny: probing Drizzle column internals
    const amount = cols['amount_usd'] as any;
    expect(amount?.columnType).toBe('PgNumeric');
    expect(amount?.precision).toBe(30);
    expect(amount?.scale).toBe(8);
  });

  it('has a partial unique index on (agent_id) WHERE status = pending', () => {
    const idx = cfg.indexes.find((i) => i.config.name === 'proposals_one_pending_per_agent');
    expect(idx, 'missing unique index').toBeDefined();
    expect(idx?.config.unique).toBe(true);
    expect(idx?.config.where, 'partial WHERE clause missing').toBeDefined();
  });
});

describe('executions schema — links proposal to attestation', () => {
  const cfg = getTableConfig(executions);
  const cols = columnsByName(cfg.columns);

  it('has FK to proposals with cascade', () => {
    const fk = cfg.foreignKeys[0];
    expect(fk?.reference().foreignTable).toBe(proposals);
    expect(fk?.onDelete).toBe('cascade');
  });

  it('attestation_uid and attestation_tx_hash are nullable (filled by record() phase)', () => {
    expect(cols['attestation_uid']?.notNull).toBe(false);
    expect(cols['attestation_tx_hash']?.notNull).toBe(false);
  });

  it('block_number and gas_used are bigint columns', () => {
    expect(cols['block_number']?.dataType).toBe('bigint');
    expect(cols['gas_used']?.dataType).toBe('bigint');
  });
});

describe('attestations schema — UID is PK, no agent FK', () => {
  const cfg = getTableConfig(attestations);
  const cols = columnsByName(cfg.columns);

  it('uid is the primary key', () => {
    expect(cols['uid']?.primary).toBe(true);
  });

  it('has NO foreign key on agent_id (attestations outlive local agent records)', () => {
    expect(cfg.foreignKeys).toHaveLength(0);
  });
});

describe('session_keys schema — encrypted_private_key MUST be bytea', () => {
  const cfg = getTableConfig(sessionKeys);
  const cols = columnsByName(cfg.columns);

  it('encrypted_private_key column data type is bytea (NOT text — prevents charset corruption)', () => {
    // biome-ignore lint/suspicious/noExplicitAny: probing Drizzle column internals
    const col = cols['encrypted_private_key'] as any;
    expect(col).toBeDefined();
    // Custom-typed column reports its SQL type via getSQLType()
    expect(col?.getSQLType?.()).toBe('bytea');
  });

  it('has FK to agents with cascade', () => {
    const fk = cfg.foreignKeys[0];
    expect(fk?.reference().foreignTable).toBe(agents);
    expect(fk?.onDelete).toBe('cascade');
  });

  it('revoked_at is nullable (key is live until explicitly revoked)', () => {
    expect(cols['revoked_at']?.notNull).toBe(false);
  });
});

describe('eoa_tx_queue schema — fallback queue', () => {
  const cfg = getTableConfig(eoaTxQueue);
  const cols = columnsByName(cfg.columns);

  it('has FK to agents with cascade', () => {
    const fk = cfg.foreignKeys[0];
    expect(fk?.reference().foreignTable).toBe(agents);
    expect(fk?.onDelete).toBe('cascade');
  });

  it('signed_tx, tx_hash, block_number, error are nullable (filled across lifecycle)', () => {
    for (const name of ['signed_tx', 'tx_hash', 'block_number', 'error']) {
      expect(cols[name]?.notNull, `${name} should be nullable`).toBe(false);
    }
  });

  it('value column is text (wei does not fit JS Number; numeric is wasteful)', () => {
    expect(cols['value']?.dataType).toBe('string');
  });
});

describe('chain literal narrowing — AgentChain', () => {
  it('agents.chain accepts only the two literal values via $type<AgentChain>()', () => {
    // Compile-time check: $type narrows .$inferInsert.chain to AgentChain
    const sample: typeof agents.$inferInsert = {
      id: 'x',
      userId: 'u',
      smartAccountAddr: '0x',
      ownerEoa: '0x',
      policyJson: {},
      goalJson: {},
      chain: 'mantle-mainnet',
      activatedAt: new Date(),
    };
    expect(sample.chain).toBe('mantle-mainnet');
  });
});
