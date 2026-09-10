-- הביס הבא — migration 0003: opening hours for existing restaurants (LIVE D1).
--
-- WHAT THIS DOES: fills opening_hours for each existing restaurant, matched by name.
-- It does NOT create, delete, rename, or touch any other field.
--
-- STEP A (run once): add the column. If your DB already has opening_hours
--   (e.g. a fresh deploy with the updated 0001 schema), SKIP this line — it will
--   error with "duplicate column name" and that is fine to ignore.
ALTER TABLE restaurants ADD COLUMN opening_hours TEXT;

-- STEP B: per-restaurant updates (exact name match).
UPDATE restaurants SET opening_hours = 'א׳–ה׳, ש׳ 07:00–01:00
ו׳ 07:00–16:00' WHERE name = 'מתחת לעץ';
UPDATE restaurants SET opening_hours = 'א׳–ה׳ 08:30–22:00
ו׳ 09:00–16:00
ש׳ 10:00–16:00' WHERE name = 'אנסטסיה';
UPDATE restaurants SET opening_hours = 'ב׳–ד׳ 11:00–22:30
ה׳ 11:00–23:00
ו׳ 09:00–17:00
א׳, ש׳ סגור' WHERE name = 'גברת קוואיטיאו';
UPDATE restaurants SET opening_hours = 'א׳–ד׳, ו׳ 12:00–00:00
ה׳, ש׳ 12:00–01:00' WHERE name = 'TYO';
UPDATE restaurants SET opening_hours = 'ב׳–ה׳ 18:00–22:30
ו׳ 14:00–22:00
ש׳ 18:00–22:30
א׳ סגור' WHERE name = 'Cichukai';
UPDATE restaurants SET opening_hours = 'א׳–ו׳ 12:00–23:00
ש׳ סגור' WHERE name = 'Rothschild 48 Brasserie';
UPDATE restaurants SET opening_hours = 'א׳–ש׳ 12:00–16:00, 17:00–23:00' WHERE name = 'נאם';
UPDATE restaurants SET opening_hours = 'א׳ 12:30–22:00
ב׳–ד׳ 12:00–22:00
ה׳ 12:00–22:30
ו׳–ש׳ סגור' WHERE name = 'WABI Ramen';
UPDATE restaurants SET opening_hours = 'א׳–ה׳ 11:00–22:30
ו׳–ש׳ סגור' WHERE name = 'טאלי לאמה';
UPDATE restaurants SET opening_hours = 'א׳–ה׳ 10:30–16:30
ו׳ 10:00–16:00
ש׳ סגור' WHERE name = 'הכרמל 40';
UPDATE restaurants SET opening_hours = 'א׳–ד׳, ש׳ 11:30–23:30
ה׳ 11:30–00:30
ו׳ 11:30–22:00' WHERE name = 'Joseph ''N'' Sons';
UPDATE restaurants SET opening_hours = 'ב׳–ה׳, ש׳ 19:00–22:30
ו׳ 18:00–22:30
א׳ סגור' WHERE name = 'Selas';
UPDATE restaurants SET opening_hours = 'א׳–ש׳ 12:00–23:30' WHERE name = 'Thai 148';
UPDATE restaurants SET opening_hours = 'ב׳–ד׳, ו׳–ש׳ 12:00–23:00
ה׳ 12:00–00:00
א׳ סגור' WHERE name = 'Sachi Ramen & Sushi';
UPDATE restaurants SET opening_hours = 'א׳–ש׳ 12:00–22:30' WHERE name = 'Grinberg Burger';
UPDATE restaurants SET opening_hours = 'א׳–ה׳ 09:30–16:00, 17:00–22:00
ו׳ 09:00–15:00
ש׳ סגור' WHERE name = 'Brasserie 18';
UPDATE restaurants SET opening_hours = 'ב׳–ו׳ 18:00–23:00
א׳, ש׳ סגור' WHERE name = 'פופינה';
UPDATE restaurants SET opening_hours = 'א׳ 18:00–00:00
ב׳–ד׳ 18:00–01:00
ה׳ 18:00–02:00
ו׳–ש׳ 12:00–01:00' WHERE name = 'NOEMA';
UPDATE restaurants SET opening_hours = 'א׳–ד׳ 18:00–23:30
ה׳ 18:00–00:00
ו׳–ש׳ סגור' WHERE name = 'Gaijin Izakaya';
UPDATE restaurants SET opening_hours = 'א׳–ו׳ 11:30–22:00
ש׳ 12:00–22:00' WHERE name = 'קפה טאיזו';
UPDATE restaurants SET opening_hours = 'א׳–ה׳ 18:00–01:00
ו׳–ש׳ סגור' WHERE name = 'רובע א׳';
UPDATE restaurants SET opening_hours = 'ב׳–ה׳ 18:00–00:00
ו׳ 10:00–18:00
א׳, ש׳ סגור' WHERE name = 'הקטן';
UPDATE restaurants SET opening_hours = 'א׳–ה׳, ש׳ 17:00–23:30
ו׳ סגור' WHERE name = 'ASA Izakaya';
UPDATE restaurants SET opening_hours = 'ב׳–ה׳ 18:00–23:00
ו׳–ש׳ 12:00–16:30, 18:00–23:00
א׳ סגור' WHERE name = 'Kimura-ya.J';
UPDATE restaurants SET opening_hours = 'א׳–ה׳ 18:00–03:00
ו׳ 13:00–03:00
ש׳ 16:00–03:00' WHERE name = 'אליבי';
UPDATE restaurants SET opening_hours = 'א׳–ג׳ 17:00–01:00
ד׳ 17:00–02:00
ה׳ 17:00–03:00
ו׳ 12:00–01:00
ש׳ 17:00–01:00' WHERE name = 'Saka Ba';
UPDATE restaurants SET opening_hours = 'א׳–ה׳, ש׳ 18:00–00:30
ו׳ סגור' WHERE name = 'OBI';
UPDATE restaurants SET opening_hours = 'א׳–ש׳ 12:00–23:00' WHERE name = 'אונמי';
UPDATE restaurants SET opening_hours = 'ב׳–ה׳ 09:00–19:00
ו׳ 08:00–16:00
ש׳ 09:00–18:00
א׳ סגור' WHERE name = 'בטשון';
UPDATE restaurants SET opening_hours = 'לפי מועדי אירועים אין שעות פתיחה קבועות' WHERE name = 'האומקאסה של עומר ניצן';
UPDATE restaurants SET opening_hours = 'בתיאום ובהזמנה מראש אין ימים ושעות קבועים' WHERE name = 'UMAI';
UPDATE restaurants SET opening_hours = 'ד׳–ש׳ 20:30–00:00; לפי סבבים ובהזמנה
א׳–ג׳ סגור' WHERE name = 'טראסו';
UPDATE restaurants SET opening_hours = 'לפי תאריכים המתפרסמים מדי חודש סבבים ב־18:45 וב־21:30' WHERE name = 'הגלריה של השף אורי זיסו';

-- STEP C (verify): should list every restaurant and its hours. Rows with NULL
-- opening_hours are ones whose live name differs from the file (edit + re-run).
--   SELECT name, opening_hours FROM restaurants ORDER BY name;
