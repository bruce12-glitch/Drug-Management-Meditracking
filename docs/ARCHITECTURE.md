# Architecture

MediTracking is one product with two runtimes that share the same screens and rules.

```
Browser
   │
   ▼
Index / Login / Register
   │
   ├── Customer ──► HOME, BUY, ORDERS, MEDITRACKER
   │                      │
   │                      ├── Today / Add / History / Settings
   │                      └── Place order against seller inventory
   │
   └── Vendor ────► HOME, ADD, RESTOCK, ORDERS
```

## Live runtime (recommended)

- **Process:** Node 22 + Express (`server/app.js`)
- **Session:** `express-session` (in-memory)
- **Data:** SQLite file at `data/drugdatabase.sqlite` (`node:sqlite`)
- **UI:** same HTML/CSS/JS under `WebContent/`
- **Auth:** customer (`currentusertype=1`) vs vendor (`currentusertype=2`)

JSP filenames (`Homepage.jsp`, `TrackerToday.jsp`, …) are kept as routes so the original navigation still works.

## Tomcat runtime (original sources)

- **Pages:** JSP under `WebContent/`
- **Driver:** `WebContent/WEB-INF/lib/mysql-connector-java-5.1.48.jar`
- **Schema:** `sql/drugdatabase.sql` + `sql/meditracker_migration.sql`
- **JDBC:** `jdbc:mysql://mysql:3306/drugdatabase` (Docker DNS name `mysql`)

## Data model

| Table | Role |
|---|---|
| `customer` | Shoppers who can buy and use MediTracker |
| `seller` | Vendors who stock products |
| `product` / `inventory` | Catalogue and per-seller stock |
| `orders` | Purchases (stock decremented on place) |
| `medicines` | A customer's scheduled medicines |
| `medicineStatus` | Taken / not taken for a calendar day |
| `medicineHistory` | Audit of daily marks |
| `userSettings` | Theme, language, reminder preferences |

## Security (demo)

Tracker state-changing actions require POST + CSRF. Store buy/restock require a role session. Raw `.jsp` files and `WEB-INF` are not served by the Node runtime. Passwords are still stored in plain text — see `docs/SECURITY.md`.
