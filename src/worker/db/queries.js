// D1 data-access helpers for the restaurants table.
// All SQL lives here so routes stay thin. Uses parameterized statements (no string interpolation).

import { rowToApi, apiToColumns } from './mapping.js';

const nowIso = () => new Date().toISOString();

export async function listRestaurants(db) {
  const { results } = await db.prepare(
    'SELECT * FROM restaurants ORDER BY datetime(updated_at) DESC, id DESC'
  ).all();
  return (results || []).map(rowToApi);
}

export async function getRestaurant(db, id) {
  const row = await db.prepare('SELECT * FROM restaurants WHERE id = ?').bind(id).first();
  return rowToApi(row);
}

export async function createRestaurant(db, obj) {
  const cols = apiToColumns(obj);
  const ts = nowIso();
  cols.created_at = ts;
  cols.updated_at = ts;
  const names = Object.keys(cols);
  const placeholders = names.map(() => '?').join(', ');
  const values = names.map((n) => cols[n]);
  const sql = `INSERT INTO restaurants (${names.join(', ')}) VALUES (${placeholders})`;
  const res = await db.prepare(sql).bind(...values).run();
  const id = res.meta && res.meta.last_row_id;
  return getRestaurant(db, id);
}

export async function updateRestaurant(db, id, obj, { partial } = {}) {
  const existing = await db.prepare('SELECT id FROM restaurants WHERE id = ?').bind(id).first();
  if (!existing) return null;
  const cols = apiToColumns(obj);
  cols.updated_at = nowIso();
  const names = Object.keys(cols);
  if (names.length === 0) return getRestaurant(db, id);
  const assignments = names.map((n) => `${n} = ?`).join(', ');
  const values = names.map((n) => cols[n]);
  const sql = `UPDATE restaurants SET ${assignments} WHERE id = ?`;
  await db.prepare(sql).bind(...values, id).run();
  return getRestaurant(db, id);
}

export async function deleteRestaurant(db, id) {
  const res = await db.prepare('DELETE FROM restaurants WHERE id = ?').bind(id).run();
  return res.meta && res.meta.changes > 0;
}
