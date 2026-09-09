-- הביס הבא — initial schema
-- Array/object fields (cuisine, suitable_for, tags, images, want_to_try, happy_hours, visits)
-- are stored as JSON strings for a simple, stable single-table design.

CREATE TABLE IF NOT EXISTS restaurants (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,

  name            TEXT NOT NULL,
  cuisine         TEXT,            -- JSON array of cuisines

  city            TEXT,
  area            TEXT,
  address         TEXT,

  maps_url        TEXT,
  website_url     TEXT,
  reservation_url TEXT,
  menu_url        TEXT,
  delivery_url    TEXT,
  phone           TEXT,

  status          TEXT,            -- visitStatus (visited / notVisited)
  craving         TEXT,
  next_up         INTEGER DEFAULT 0,
  price_level     TEXT,            -- kept as TEXT per spec; numeric values are stringified
  visit_count     INTEGER DEFAULT 0,

  suitable_for    TEXT,            -- JSON array (occasions)
  tags            TEXT,            -- JSON array

  -- Rich Happy Hour model kept intact as JSON. The individual happy_* columns
  -- below exist for compatibility / future normalization but the app reads happy_hours.
  happy_hours     TEXT,           -- JSON array of {id,enabled,days,start,end,offer,conditions}
  happy_days      TEXT,
  happy_benefit   TEXT,
  happy_conditions TEXT,

  want_to_try     TEXT,            -- JSON array (dishesToTry)
  saved_reason    TEXT,            -- whySaved
  notes           TEXT,

  visits          TEXT,            -- JSON array of visit records
  images          TEXT,            -- JSON array of image URLs
  source_url      TEXT,

  emoji           TEXT,
  theme_key       TEXT,            -- chosen cover image key

  created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restaurants_updated_at ON restaurants(updated_at);
CREATE INDEX IF NOT EXISTS idx_restaurants_next_up ON restaurants(next_up);
