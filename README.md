# הביס הבא — Habiss Haba

אפליקציית "הביס הבא" לשמירת מסעדות, עם **Cloudflare Worker** כ‑Backend/API, **Cloudflare D1** כמסד נתונים, וה‑Frontend הקיים מוגש מאותו Worker. הפרויקט מוכן ל‑GitHub ולפריסה אוטומטית דרך Cloudflare.

> ה‑source of truth של המסעדות הוא **Cloudflare D1**. ה‑Frontend קורא ושומר את כל המסעדות דרך ה‑API. LocalStorage משמש רק ל‑cache מקומי מהיר ולהעדפות UI (מיון, טאב אחרון וכו׳) — לא לשמירת המסעדות עצמן.

---

## מבנה הפרויקט

```
/
├── src/
│   ├── frontend/
│   │   ├── index.html        # ה-shell של האפליקציה
│   │   ├── app.js            # כל הלוגיקה של ה-UI + API client
│   │   ├── styles.css        # כל העיצוב + תמונות מוטמעות (base64)
│   │   └── assets/
│   └── worker/
│       ├── index.js          # נקודת הכניסה: ניתוב API + הגשת ה-Frontend
│       ├── routes/
│       │   └── restaurants.js # handlers ל-/api/restaurants
│       └── db/
│           ├── mapping.js     # מיפוי מרכזי camelCase <-> snake_case
│           └── queries.js     # שאילתות D1 (CRUD)
├── migrations/
│   ├── 0001_initial.sql       # סכמת הטבלה
│   └── 0002_seed.sql          # כל 33 המסעדות הקיימות (idempotent)
├── wrangler.toml
├── package.json
├── .gitignore
└── README.md
```

---

## דרישות מוקדמות

- **Node.js 18+**
- חשבון **Cloudflare** (התוכנית החינמית מספיקה)
- **Wrangler** (מותקן כ‑devDependency — אין צורך בהתקנה גלובלית)

---

## התקנה מהירה

```bash
# 1. התקנת dependencies
npm install

# 2. התחברות ל-Cloudflare
npx wrangler login

# 3. יצירת מסד הנתונים D1
npm run db:create
```

הפקודה `db:create` תדפיס משהו כזה:

```
✅ Successfully created DB 'habiss-haba-db'
[[d1_databases]]
binding = "DB"
database_name = "habiss-haba-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**העתק את ה‑`database_id`** ושים אותו ב‑`wrangler.toml` במקום `TO_BE_FILLED`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "habiss-haba-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   # <-- כאן
```

```bash
# 4. הרצת המיגרציות (סכמה + seed של כל המסעדות הקיימות)
#    מקומי:
npm run db:migrate:local
#    בענן (production):
npm run db:migrate
```

---

## הרצה מקומית

```bash
npm run dev
```

זה מריץ `wrangler dev` — Worker מקומי שמגיש גם את ה‑API וגם את ה‑Frontend, מול D1 מקומי.
פתח את הכתובת שמודפסת (בדרך כלל `http://localhost:8787`).

בדוק שהפעולות עובדות:

```bash
# רשימת מסעדות
curl http://localhost:8787/api/restaurants

# יצירת מסעדה
curl -X POST http://localhost:8787/api/restaurants \
  -H 'content-type: application/json' \
  -d '{"name":"מקום חדש","cuisines":["בורגר"],"city":"תל אביב"}'

# עדכון
curl -X PUT http://localhost:8787/api/restaurants/1 \
  -H 'content-type: application/json' \
  -d '{"name":"שם מעודכן"}'

# מחיקה
curl -X DELETE http://localhost:8787/api/restaurants/1
```

> אם הרצת מקומית, השתמש ב‑`db:migrate:local` כדי שהנתונים יופיעו ב‑D1 המקומי.

---

## פריסה (Deploy)

```bash
npm run deploy
```

זה בונה ופורס את ה‑Worker (כולל ה‑Frontend) ל‑Cloudflare. ודא שהרצת קודם `npm run db:migrate` על ה‑DB בענן.

---

## חיבור ל‑GitHub + פריסה אוטומטית

### אפשרות א׳ — Cloudflare Git Integration (מומלץ, בלי Actions)

1. העלה את הפרויקט ל‑GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit — habiss haba with D1 backend"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
2. ב‑Cloudflare Dashboard → **Workers & Pages** → פרויקט ה‑Worker → **Settings → Build** → חבר את ה‑repo.
3. הגדר את פקודת ה‑build ל‑`npm run deploy` (או Wrangler auto‑deploy).
4. מעכשיו כל `push` ל‑`main` יבצע deploy אוטומטי.

### אפשרות ב׳ — GitHub Actions

אם אתה מעדיף Actions, צור `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

שים את `CLOUDFLARE_API_TOKEN` ו‑`CLOUDFLARE_ACCOUNT_ID` ב‑**GitHub → Settings → Secrets**.
אם אתה משתמש ב‑Git Integration של Cloudflare, אין צורך ב‑Actions.

---

## ה‑API

| Method | Endpoint | תיאור |
|--------|----------|-------|
| GET    | `/api/restaurants`      | כל המסעדות |
| GET    | `/api/restaurants/:id`  | מסעדה בודדת |
| POST   | `/api/restaurants`      | יצירה (מחזיר את הרשומה עם `id`) |
| PUT    | `/api/restaurants/:id`  | עדכון מלא |
| PATCH  | `/api/restaurants/:id`  | עדכון חלקי |
| DELETE | `/api/restaurants/:id`  | מחיקה |
| GET    | `/api/health`           | בדיקת חיים |

**שמות השדות ב‑API הם camelCase** (מתאים ל‑Frontend), וממופים אוטומטית ל‑snake_case ב‑DB:

```
delivery_url    <-> deliveryUrl
website_url     <-> website
reservation_url <-> bookingUrl
menu_url        <-> menuUrl
maps_url        <-> mapUrl
price_level     <-> priceLevel
suitable_for    <-> occasions
want_to_try     <-> dishesToTry
saved_reason    <-> whySaved
```

שדות מסוג מערך/אובייקט (`cuisines`, `tags`, `occasions`, `images`, `dishesToTry`, `happyHours`, `visits`) נשמרים כ‑JSON ומוחזרים כמערכים/אובייקטים.

הלוגיקה של המיפוי נמצאת במקום אחד בלבד: `src/worker/db/mapping.js`.

---

## המסעדות הקיימות

כל 33 המסעדות שהיו באפליקציה הועברו ל‑`migrations/0002_seed.sql` (כולל Happy Hours, תגיות, קישורים, `deliveryUrl` וכו׳). ה‑seed מוגן מפני כפילויות — הרצה חוזרת לא תיצור רשומות כפולות.

---

## סביבה וסודות

- אין tokens/credentials בקוד.
- ל‑deploy דרך Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` כ‑GitHub Secrets.
- ה‑`database_id` ב‑`wrangler.toml` אינו סוד (מזהה משאב), אך הוא ספציפי לחשבון שלך.

---

## סקריפטים

```json
"dev":              "wrangler dev",
"deploy":           "wrangler deploy",
"db:create":        "wrangler d1 create habiss-haba-db",
"db:migrate":       "wrangler d1 migrations apply habiss-haba-db --remote",
"db:migrate:local": "wrangler d1 migrations apply habiss-haba-db --local",
"db:console":       "wrangler d1 execute habiss-haba-db --remote --command \"SELECT id,name FROM restaurants\"",
"tail":             "wrangler tail"
```
