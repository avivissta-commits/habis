// Central mapping between the frontend/API model (camelCase) and the D1 row (snake_case).
// This is the single source of truth for the schema<->object contract. If a field changes,
// update it here only.
//
// Columns that hold arrays or objects are stored as JSON strings in D1 and parsed back out.

// scalar (string/number/bool) columns: dbColumn -> apiField
export const SCALAR_FIELDS = {
  name: 'name',
  city: 'city',
  area: 'area',
  address: 'address',
  maps_url: 'mapUrl',
  website_url: 'website',
  reservation_url: 'bookingUrl',
  menu_url: 'menuUrl',
  delivery_url: 'deliveryUrl',
  opening_hours: 'openingHours',
  phone: 'phone',
  status: 'visitStatus',
  craving: 'craving',
  price_level: 'priceLevel',
  saved_reason: 'whySaved',
  notes: 'notes',
  source_url: 'sourceUrl',
  emoji: 'emoji',
  theme_key: 'themeKey',
};

// JSON-encoded columns: dbColumn -> apiField (value is an array or object)
export const JSON_FIELDS = {
  cuisine: 'cuisines',
  suitable_for: 'occasions',
  tags: 'tags',
  images: 'images',
  want_to_try: 'dishesToTry',
  happy_hours: 'happyHours',
  visits: 'visits',
};

// boolean-ish integer column
// next_up stored as INTEGER 0/1
// visit_count stored as INTEGER

function parseJSON(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

// Convert a D1 row -> API object (camelCase, arrays parsed).
export function rowToApi(row) {
  if (!row) return null;
  const out = { id: row.id };
  for (const [col, field] of Object.entries(SCALAR_FIELDS)) {
    if (row[col] !== null && row[col] !== undefined) out[field] = row[col];
  }
  for (const [col, field] of Object.entries(JSON_FIELDS)) {
    const arr = parseJSON(row[col], undefined);
    if (arr !== undefined) out[field] = arr;
  }
  out.nextUp = !!row.next_up;
  if (row.visit_count !== null && row.visit_count !== undefined) out.visitCount = row.visit_count;
  if (row.price_level !== null && row.price_level !== undefined) {
    // price_level may be numeric; keep as number when it looks numeric
    const n = Number(row.price_level);
    out.priceLevel = Number.isFinite(n) && String(n) === String(row.price_level) ? n : row.price_level;
  }
  if (row.created_at) out.createdAt = row.created_at;
  if (row.updated_at) out.updatedAt = row.updated_at;
  return out;
}

// Convert an API object (camelCase) -> { columns, values } for INSERT/UPDATE.
// Only includes fields that are actually present in the input (so PATCH works).
export function apiToColumns(obj) {
  const cols = {};
  for (const [col, field] of Object.entries(SCALAR_FIELDS)) {
    if (obj[field] !== undefined) cols[col] = obj[field] === null ? null : String(obj[field]);
  }
  for (const [col, field] of Object.entries(JSON_FIELDS)) {
    if (obj[field] !== undefined) cols[col] = obj[field] === null ? null : JSON.stringify(obj[field]);
  }
  if (obj.nextUp !== undefined) cols.next_up = obj.nextUp ? 1 : 0;
  if (obj.visitCount !== undefined) cols.visit_count = Number(obj.visitCount) || 0;
  if (obj.priceLevel !== undefined && cols.price_level === undefined) {
    cols.price_level = obj.priceLevel === null ? null : String(obj.priceLevel);
  }
  return cols;
}

// Basic validation for create. Returns an array of error strings (empty = valid).
export function validateForCreate(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') { errors.push('body must be a JSON object'); return errors; }
  if (!obj.name || String(obj.name).trim() === '') errors.push('name is required');
  return errors;
}
