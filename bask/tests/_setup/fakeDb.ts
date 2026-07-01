/**
 * In-memory fake SQLite for repository tests.
 *
 * Mocks the subset of @capacitor-community/sqlite's SQLiteDBConnection that the
 * repositories actually use: query / run / execute / executeSet. SQL is parsed
 * best-effort (paren-aware) to route to per-table row arrays. Covers INSERT,
 * UPDATE, DELETE, SELECT (incl. COALESCE(SUM,...)), upserts (ON CONFLICT and
 * OR IGNORE), `datetime('now')` literals, NULL literals, and the
 * date(col,'localtime') filters the repos rely on.
 *
 * Limits (accepted per plan): does not validate SQL syntax, does not enforce
 * types/constraints, does not handle arbitrary expressions, and approximates
 * SQLite date() with local-date-key math. Anything unhandled throws loudly so
 * the fake can be extended deliberately.
 */

export type Row = Record<string, any>;

export interface FakeResult {
  values?: Row[];
  changes?: { changes?: number; lastId?: number };
}

export interface FakeConnection {
  query(sql: string, params?: any[]): Promise<FakeResult>;
  run(sql: string, params?: any[]): Promise<FakeResult>;
  execute(sql: string, params?: any[]): Promise<FakeResult>;
  executeSet(statements: { statement: string; values: any[] }[]): Promise<FakeResult>;
}

export interface FakeDatabaseService {
  getConnection(): Promise<FakeConnection>;
  isNative(): boolean;
  isReady(): boolean;
}

export interface FakeDb {
  connection: FakeConnection;
  databaseService: FakeDatabaseService;
  reset(seed?: Record<string, Row[]>): void;
  getTable(name: string): Row[];
  setNative(value: boolean): void;
}

function localDateKey(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayLocalKey(): string {
  return localDateKey(new Date());
}

/** Split on a single-character delimiter, ignoring delimiters inside () or quotes. */
function splitTopLevel(s: string, delim: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inStr = false;
  let strCh = '';
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      buf += ch;
      if (ch === strCh) inStr = false;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inStr = true;
      strCh = ch;
      buf += ch;
      continue;
    }
    if (ch === '(') {
      depth++;
      buf += ch;
    } else if (ch === ')') {
      depth--;
      buf += ch;
    } else if (ch === delim && depth === 0) {
      out.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  out.push(buf);
  return out.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Find the substring inside the first balanced (...) group starting at `openIdx`. */
function readBalanced(s: string, openIdx: number): { inner: string; end: number } {
  let depth = 0;
  let inStr = false;
  let strCh = '';
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (ch === strCh) inStr = false;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inStr = true;
      strCh = ch;
    } else if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return { inner: s.slice(openIdx + 1, i), end: i };
    }
  }
  throw new Error(`[fakeDb] unbalanced parens in: ${s}`);
}

interface TokenValue {
  isParam: boolean;
  literal?: any;
}

function interpretToken(tok: string): TokenValue {
  const t = tok.trim();
  if (t === '?') return { isParam: true };
  if (/^-?\d+(\.\d+)?$/.test(t)) return { isParam: false, literal: Number(t) };
  if (t.toUpperCase() === 'NULL') return { isParam: false, literal: null };
  if (t.startsWith("'") && t.endsWith("'")) return { isParam: false, literal: t.slice(1, -1) };
  // Function call (e.g. datetime('now')) or other expression — store raw, value irrelevant for assertions.
  return { isParam: false, literal: t };
}

/** Extract table name from a statement. */
function extractTable(sql: string): string {
  let m =
    sql.match(/insert\s+(?:or\s+\w+\s+)?into\s+(\w+)/i) ??
    sql.match(/update\s+(\w+)\s+set/i) ??
    sql.match(/delete\s+from\s+(\w+)/i) ??
    sql.match(/from\s+(\w+)/i);
  if (!m) throw new Error(`[fakeDb] cannot parse table from: ${sql}`);
  return m[1];
}

interface SetAssignment {
  col: string;
  value: TokenValue;
}

/** Parse "col = ?, col2 = datetime('now')" into assignments (paren-aware). */
function parseSetList(setSql: string): SetAssignment[] {
  return splitTopLevel(setSql, ',').map((part) => {
    const eqIdx = part.indexOf('=');
    if (eqIdx < 0) throw new Error(`[fakeDb] unhandled SET clause (no =): "${part}"`);
    const col = part.slice(0, eqIdx).trim();
    const rhs = part.slice(eqIdx + 1).trim();
    if (!/^[\w]+$/.test(col)) throw new Error(`[fakeDb] unhandled SET column: "${col}"`);
    return { col, value: interpretToken(rhs) };
  });
}

interface WherePredicate {
  predicate: (row: Row) => boolean;
  consumed: number;
}

function buildWhere(whereSql: string | null, params: any[]): WherePredicate {
  if (!whereSql || !whereSql.trim()) return { predicate: () => true, consumed: 0 };

  const clauses = splitTopLevel(whereSql, 'AND').length
    ? whereSql.split(/\s+AND\s+/i).map((c) => c.trim()).filter(Boolean)
    : [];
  // Note: splitTopLevel with 'AND' isn't single-char; use regex split above for AND.
  // (splitTopLevel is used elsewhere for commas only.)
  let paramIdx = 0;
  const checks: Array<(row: Row) => boolean> = [];

  for (const clause of clauses) {
    // date(col,'localtime') = ?  |  = date('now','localtime')  |  = 'literal'
    let m = clause.match(
      /^date\(\s*([\w]+)\s*,\s*'localtime'\s*\)\s*=\s*(\?|date\(\s*'now'\s*,\s*'localtime'\s*\)|'[^']*'|[\w.-]+)$/i,
    );
    if (m) {
      const col = m[1];
      const rhs = m[2];
      if (rhs === '?') {
        const target = params[paramIdx++];
        checks.push((row) => localDateKey(row[col]) === target);
      } else if (/^date\(/i.test(rhs)) {
        const today = todayLocalKey();
        checks.push((row) => localDateKey(row[col]) === today);
      } else {
        const literal = rhs.replace(/^'|'$/g, '');
        checks.push((row) => localDateKey(row[col]) === literal);
      }
      continue;
    }

    // col IN (?, ?, ...)
    m = clause.match(/^([\w]+)\s+IN\s*\(([^)]*)\)$/i);
    if (m) {
      const col = m[1];
      const placeholders = splitTopLevel(m[2], ',');
      const list: any[] = [];
      for (const p of placeholders) {
        const tv = interpretToken(p);
        list.push(tv.isParam ? params[paramIdx++] : tv.literal);
      }
      checks.push((row) => list.includes(row[col]));
      continue;
    }

    // comparison: col = ? | col = literal | col >= ? | col <= ? | col > ? | col < ?
    m = clause.match(/^([\w]+)\s*(=|>=|<=|>|<)\s*(.+)$/i);
    if (m) {
      const col = m[1];
      const op = m[2];
      const tv = interpretToken(m[3].trim());
      const value = tv.isParam ? params[paramIdx++] : tv.literal;
      checks.push((row) => {
        const left = row[col];
        // SQLite compares TEXT lexically; mirror that when either side is a string.
        const asStr = typeof left === 'string' || typeof value === 'string';
        const l = asStr ? String(left) : Number(left);
        const r = asStr ? String(value) : Number(value);
        switch (op) {
          case '=':
            return left === value || (left == null && value == null);
          case '>=':
            return l >= r;
          case '<=':
            return l <= r;
          case '>':
            return l > r;
          case '<':
            return l < r;
          default:
            return false;
        }
      });
      continue;
    }

    throw new Error(`[fakeDb] unhandled WHERE clause: "${clause}"`);
  }

  return { predicate: (row) => checks.every((fn) => fn(row)), consumed: paramIdx };
}

function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

export function createFakeDb(seed?: Record<string, Row[]>): FakeDb {
  const tables: Map<string, Row[]> = new Map();
  const idCounters: Map<string, number> = new Map();

  function table(name: string): Row[] {
    let t = tables.get(name);
    if (!t) {
      t = [];
      tables.set(name, t);
    }
    return t;
  }

  function nextId(name: string): number {
    const existing = table(name);
    const maxId = existing.reduce((m, r) => (typeof r.id === 'number' ? Math.max(m, r.id) : m), 0);
    const counter = Math.max(idCounters.get(name) ?? 0, maxId) + 1;
    idCounters.set(name, counter);
    return counter;
  }

  let native = true;

  const connection: FakeConnection = {
    async query(sql, params = []) {
      const s = normalize(sql);
      const tname = extractTable(s);
      const rows = table(tname);

      const whereMatch = s.match(
        /\bwhere\b(.+?)(?=\s+\b(order\s+by|limit|group\s+by)\b|$)/i,
      );
      const whereSql = whereMatch ? whereMatch[1].trim() : null;
      const { predicate } = buildWhere(whereSql, params);

      // COALESCE(SUM(col), 0) as total
      const sumMatch = s.match(/coalesce\s*\(\s*sum\s*\(\s*([\w]+)\s*\)\s*,\s*0\s*\)\s+as\s+total/i);
      if (sumMatch) {
        const col = sumMatch[1];
        const total = rows.filter(predicate).reduce((sum, r) => sum + (Number(r[col]) || 0), 0);
        return { values: [{ total }] };
      }

      let result = rows.filter(predicate);

      // ORDER BY col DESC|ASC (may appear multiple — apply in order)
      const orderMatches = [...s.matchAll(/\border\s+by\s+([\w]+)\s*(desc|asc)?/gi)];
      if (orderMatches.length) {
        for (let i = orderMatches.length - 1; i >= 0; i--) {
          const col = orderMatches[i][1];
          const dir = (orderMatches[i][2] || 'asc').toLowerCase();
          result = [...result].sort((a, b) => {
            const av = a[col];
            const bv = b[col];
            if (av === bv) return 0;
            const cmp = av < bv ? -1 : 1;
            return dir === 'desc' ? -cmp : cmp;
          });
        }
      }

      // LIMIT n
      const limitMatch = s.match(/\blimit\s+(\d+)/i);
      if (limitMatch) result = result.slice(0, Number(limitMatch[1]));

      return { values: result };
    },

    async run(sql, params = []) {
      const s = normalize(sql);

      // ----- INSERT (with optional OR IGNORE / ON CONFLICT) -----
      const insertHead = s.match(/insert\s+(or\s+\w+\s+)?into\s+(\w+)\s*\(/i);
      if (insertHead) {
        const tname = insertHead[2];
        const isIgnore = /^insert\s+or\s+ignore/i.test(s);
        const openColParen = s.indexOf('(', s.indexOf(tname));
        const colsRead = readBalanced(s, openColParen);
        const cols = splitTopLevel(colsRead.inner, ',');
        const lower = s.toLowerCase();
        const valuesIdx = lower.indexOf('values', colsRead.end);
        const openValParen = s.indexOf('(', valuesIdx);
        const valsRead = readBalanced(s, openValParen);
        const valTokens = splitTopLevel(valsRead.inner, ',');

        if (cols.length !== valTokens.length) {
          throw new Error(`[fakeDb] INSERT column/value mismatch: ${cols.length} vs ${valTokens.length} in: ${s}`);
        }

        // Optional ON CONFLICT (cols) DO UPDATE SET ...
        const conflictCols: string[] | null = (() => {
          const c = s.match(/on\s+conflict\s*\(([^)]*)\)\s*do\s+update\s+set\s+(.+?)$/i);
          if (!c) return null;
          return c[1].split(',').map((x) => x.trim());
        })();
        const setSqlAfterConflict = (() => {
          const c = s.match(/on\s+conflict\s*\([^)]*\)\s*do\s+update\s+set\s+(.+?)$/i);
          return c ? c[1] : null;
        })();

        // Resolve value tokens, consuming params in order
        let paramIdx = 0;
        const row: Row = {};
        cols.forEach((col, i) => {
          const tv = interpretToken(valTokens[i]);
          row[col] = tv.isParam ? params[paramIdx++] : tv.literal;
        });

        const rows = table(tname);

        // Upsert path
        if (conflictCols) {
          const existing = rows.find((r) => conflictCols.every((c) => r[c] === row[c]));
          if (existing) {
            if (setSqlAfterConflict) {
              const assignments = parseSetList(setSqlAfterConflict);
              for (const a of assignments) {
                existing[a.col] = a.value.isParam ? params[paramIdx++] : a.value.literal;
              }
            }
            return { changes: { changes: 1, lastId: existing.id } };
          }
        } else if (isIgnore) {
          const dup = rows.find((r) => r.id === row.id || (row.id === undefined && false));
          if (dup) return { changes: { changes: 0, lastId: dup.id } };
        }

        if (row.id === undefined || row.id === null) {
          row.id = nextId(tname);
        }
        rows.push(row);
        return { changes: { changes: 1, lastId: row.id } };
      }

      // ----- UPDATE t SET ... WHERE ... -----
      const updateMatch = s.match(/update\s+(\w+)\s+set\s+(.+?)\s+where\s+(.+?)$/i);
      if (updateMatch) {
        const tname = updateMatch[1];
        const setSql = updateMatch[2];
        const whereSql = updateMatch[3];
        const assignments = parseSetList(setSql);
        const numSetParams = assignments.filter((a) => a.value.isParam).length;
        const setParams = params.slice(0, numSetParams);
        const whereParams = params.slice(numSetParams);
        const { predicate } = buildWhere(whereSql, whereParams);

        const rows = table(tname);
        let count = 0;
        let setPi = 0;
        for (const row of rows) {
          if (predicate(row)) {
            for (const a of assignments) {
              if (a.value.isParam) row[a.col] = setParams[setPi++];
              else row[a.col] = a.value.literal;
            }
            setPi = 0; // reset per matched row (params reused per row in SQLite)
            count++;
          }
        }
        return { changes: { changes: count, lastId: rows.length ? rows[rows.length - 1].id : 0 } };
      }

      // ----- UPDATE t SET ... (no WHERE) — e.g. UPDATE bask_user_profile SET ... -----
      const updateNoWhere = s.match(/update\s+(\w+)\s+set\s+(.+?)$/i);
      if (updateNoWhere) {
        const tname = updateNoWhere[1];
        const setSql = updateNoWhere[2];
        const assignments = parseSetList(setSql);
        const numSetParams = assignments.filter((a) => a.value.isParam).length;
        const setParams = params.slice(0, numSetParams);
        const rows = table(tname);
        let count = 0;
        for (const row of rows) {
          let setPi = 0;
          for (const a of assignments) {
            if (a.value.isParam) row[a.col] = setParams[setPi++];
            else row[a.col] = a.value.literal;
          }
          count++;
        }
        return { changes: { changes: count, lastId: rows.length ? rows[rows.length - 1].id : 0 } };
      }

      // ----- DELETE FROM t WHERE ... -----
      const deleteMatch = s.match(/delete\s+from\s+(\w+)\s+where\s+(.+?)$/i);
      if (deleteMatch) {
        const tname = deleteMatch[1];
        const rows = table(tname);
        const { predicate } = buildWhere(deleteMatch[2], params);
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) {
          if (predicate(rows[i])) rows.splice(i, 1);
        }
        return { changes: { changes: before - rows.length, lastId: 0 } };
      }

      // ----- DELETE FROM t (no where) -----
      const deleteAll = s.match(/^delete\s+from\s+(\w+)$/i);
      if (deleteAll) {
        const tname = deleteAll[1];
        const rows = table(tname);
        const count = rows.length;
        rows.length = 0;
        return { changes: { changes: count, lastId: 0 } };
      }

      throw new Error(`[fakeDb] unhandled run statement: ${s}`);
    },

    async execute(sql, params = []) {
      return connection.run(sql, params);
    },

    async executeSet(statements) {
      let total = 0;
      let lastId = 0;
      for (const stmt of statements) {
        const res = await connection.run(stmt.statement, stmt.values);
        total += res.changes?.changes ?? 0;
        lastId = res.changes?.lastId ?? lastId;
      }
      return { changes: { changes: total, lastId } };
    },
  };

  const databaseService: FakeDatabaseService = {
    getConnection: async () => connection,
    isNative: () => native,
    isReady: () => true,
  };

  function reset(next?: Record<string, Row[]>) {
    tables.clear();
    idCounters.clear();
    if (next) {
      for (const [name, rows] of Object.entries(next)) {
        tables.set(name, rows.map((r) => ({ ...r })));
      }
    }
  }

  reset(seed);

  return {
    connection,
    databaseService,
    reset,
    getTable: (name) => table(name),
    setNative: (value) => {
      native = value;
    },
  };
}
