// Route handlers for /api/restaurants[/:id]
import {
  listRestaurants, getRestaurant, createRestaurant, updateRestaurant, deleteRestaurant,
} from '../db/queries.js';
import { validateForCreate } from '../db/mapping.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const err = (message, status) => json({ error: message }, status);

// Handle everything under /api/restaurants. `id` is null for the collection.
export async function handleRestaurants(request, env, id) {
  const db = env.DB;
  if (!db) return err('D1 binding "DB" is not configured', 500);
  const method = request.method.toUpperCase();

  try {
    // Collection: /api/restaurants
    if (id === null || id === undefined) {
      if (method === 'GET') {
        return json(await listRestaurants(db));
      }
      if (method === 'POST') {
        const body = await readJson(request);
        const errors = validateForCreate(body);
        if (errors.length) return err(errors.join('; '), 400);
        const created = await createRestaurant(db, body);
        return json(created, 201);
      }
      return err('method not allowed', 405);
    }

    // Item: /api/restaurants/:id
    if (method === 'GET') {
      const r = await getRestaurant(db, id);
      return r ? json(r) : err('restaurant not found', 404);
    }
    if (method === 'PUT' || method === 'PATCH') {
      const body = await readJson(request);
      if (!body || typeof body !== 'object') return err('body must be a JSON object', 400);
      const updated = await updateRestaurant(db, id, body, { partial: method === 'PATCH' });
      return updated ? json(updated) : err('restaurant not found', 404);
    }
    if (method === 'DELETE') {
      const ok = await deleteRestaurant(db, id);
      return ok ? json({ ok: true, id }) : err('restaurant not found', 404);
    }
    return err('method not allowed', 405);
  } catch (e) {
    return err('server error: ' + (e && e.message ? e.message : String(e)), 500);
  }
}

async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}
