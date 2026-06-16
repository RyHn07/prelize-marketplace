import "server-only";

import { query } from "@/lib/db";

type Filter = {
  column: string;
  operator: "=" | "!=" | "in" | "is not";
  value: unknown;
};

type OrderBy = {
  column: string;
  ascending: boolean;
};

type Mutation = {
  type: "insert" | "update" | "delete" | "upsert" | null;
  payload?: Record<string, unknown> | Record<string, unknown>[];
  conflictColumn?: string;
};

function quoteIdentifier(value: string) {
  return value
    .split(".")
    .map((part) => `"${part.replace(/"/g, '""')}"`)
    .join(".");
}

function normalizeColumnList(columns: string) {
  const trimmed = columns.trim();

  if (!trimmed || trimmed === "*" || trimmed.includes(":") || trimmed.includes("(")) {
    return "*";
  }

  return trimmed
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean)
    .map((column) => quoteIdentifier(column))
    .join(", ");
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

class PgTableQuery {
  private selectedColumns = "*";
  private filters: Filter[] = [];
  private orderBy: OrderBy[] = [];
  private rowLimit: number | null = null;
  private mutation: Mutation = { type: null };
  private shouldReturnSingle = false;
  private shouldReturnMaybeSingle = false;

  constructor(private readonly tableName: string) {}

  select(columns = "*") {
    this.selectedColumns = normalizeColumnList(columns);
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: "=", value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, operator: "!=", value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ column, operator: "in", value });
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === "is") {
      this.filters.push({ column, operator: "is not", value });
    }
    return this;
  }

  or(_expression?: string) {
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  maybeSingle() {
    this.shouldReturnMaybeSingle = true;
    this.rowLimit = 1;
    return this;
  }

  single() {
    this.shouldReturnSingle = true;
    this.rowLimit = 1;
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.mutation = { type: "insert", payload };
    return this;
  }

  upsert(payload: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) {
    this.mutation = { type: "upsert", payload, conflictColumn: options?.onConflict };
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.mutation = { type: "update", payload };
    return this;
  }

  delete() {
    this.mutation = { type: "delete" };
    return this;
  }

  private buildWhere(values: unknown[]) {
    if (this.filters.length === 0) {
      return "";
    }

    const clauses = this.filters.map((filter) => {
      const column = quoteIdentifier(filter.column);

      if (filter.operator === "in") {
        values.push(filter.value);
        return `${column} = any($${values.length})`;
      }

      if (filter.operator === "is not") {
        return `${column} is not null`;
      }

      values.push(filter.value);
      return `${column} ${filter.operator} $${values.length}`;
    });

    return ` where ${clauses.join(" and ")}`;
  }

  private buildOrder() {
    if (this.orderBy.length === 0) {
      return "";
    }

    return ` order by ${this.orderBy
      .map((order) => `${quoteIdentifier(order.column)} ${order.ascending ? "asc" : "desc"}`)
      .join(", ")}`;
  }

  private buildLimit(values: unknown[]) {
    if (!this.rowLimit) {
      return "";
    }

    values.push(this.rowLimit);
    return ` limit $${values.length}`;
  }

  private async executeSelect() {
    const values: unknown[] = [];
    const sql = `select ${this.selectedColumns} from public.${quoteIdentifier(this.tableName)}${this.buildWhere(values)}${this.buildOrder()}${this.buildLimit(values)}`;
    const result = await query(sql, values);
    const data = this.shouldReturnSingle || this.shouldReturnMaybeSingle ? result.rows[0] ?? null : result.rows;

    if (this.shouldReturnSingle && !data) {
      return { data: null, error: { message: "No rows returned." } };
    }

    return { data, error: null };
  }

  private async executeInsert() {
    const rows = Array.isArray(this.mutation.payload) ? this.mutation.payload : [this.mutation.payload ?? {}];
    const cleanRows = rows.map((row) => compactPayload(row));

    if (cleanRows.length === 0) {
      return { data: null, error: null };
    }

    const columns = Object.keys(cleanRows[0]);
    const values: unknown[] = [];
    const rowSql = cleanRows
      .map((row) => `(${columns.map((column) => {
        values.push(row[column]);
        return `$${values.length}`;
      }).join(", ")})`)
      .join(", ");
    const sql = `insert into public.${quoteIdentifier(this.tableName)} (${columns.map(quoteIdentifier).join(", ")}) values ${rowSql} returning *`;
    const result = await query(sql, values);
    const data = this.shouldReturnSingle || this.shouldReturnMaybeSingle ? result.rows[0] ?? null : result.rows;

    return { data, error: null };
  }

  private async executeUpsert() {
    const rows = Array.isArray(this.mutation.payload) ? this.mutation.payload : [this.mutation.payload ?? {}];
    const cleanRows = rows.map((row) => compactPayload(row));

    if (cleanRows.length === 0) {
      return { data: null, error: null };
    }

    const columns = Object.keys(cleanRows[0]);
    const conflictColumn = this.mutation.conflictColumn ?? "id";
    const values: unknown[] = [];
    const rowSql = cleanRows
      .map((row) => `(${columns.map((column) => {
        values.push(row[column]);
        return `$${values.length}`;
      }).join(", ")})`)
      .join(", ");
    const updateSql = columns
      .filter((column) => column !== conflictColumn)
      .map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
      .join(", ");
    const sql = `insert into public.${quoteIdentifier(this.tableName)} (${columns.map(quoteIdentifier).join(", ")}) values ${rowSql} on conflict (${quoteIdentifier(conflictColumn)}) do update set ${updateSql} returning *`;
    const result = await query(sql, values);
    const data = this.shouldReturnSingle || this.shouldReturnMaybeSingle ? result.rows[0] ?? null : result.rows;

    return { data, error: null };
  }

  private async executeUpdate() {
    const payload = compactPayload((this.mutation.payload as Record<string, unknown>) ?? {});
    const values: unknown[] = [];
    const assignments = Object.keys(payload).map((column) => {
      values.push(payload[column]);
      return `${quoteIdentifier(column)} = $${values.length}`;
    });
    const sql = `update public.${quoteIdentifier(this.tableName)} set ${assignments.join(", ")}${this.buildWhere(values)} returning *`;
    const result = await query(sql, values);
    const data = this.shouldReturnSingle || this.shouldReturnMaybeSingle ? result.rows[0] ?? null : result.rows;

    return { data, error: null };
  }

  private async executeDelete() {
    const values: unknown[] = [];
    const sql = `delete from public.${quoteIdentifier(this.tableName)}${this.buildWhere(values)} returning *`;
    const result = await query(sql, values);
    const data = this.shouldReturnSingle || this.shouldReturnMaybeSingle ? result.rows[0] ?? null : result.rows;

    return { data, error: null };
  }

  private async execute() {
    try {
      if (this.mutation.type === "insert") {
        return await this.executeInsert();
      }
      if (this.mutation.type === "upsert") {
        return await this.executeUpsert();
      }
      if (this.mutation.type === "update") {
        return await this.executeUpdate();
      }
      if (this.mutation.type === "delete") {
        return await this.executeDelete();
      }
      return await this.executeSelect();
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : "Database query failed." },
      };
    }
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export type PgDataClient = {
  from: (tableName: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }>;
  auth?: any;
  storage?: any;
};

export function getDatabaseServiceClient(): PgDataClient {
  return {
    from(tableName: string) {
      return new PgTableQuery(tableName);
    },
    async rpc(name: string, args: Record<string, unknown> = {}) {
      try {
        const values = Object.values(args);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
        const result = await query(`select * from public.${quoteIdentifier(name)}(${placeholders})`, values);
        return { data: result.rows, error: null };
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : "Database function failed." },
        };
      }
    },
  };
}
