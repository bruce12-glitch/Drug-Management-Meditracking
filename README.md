# MediTracking — Pharmacy Drug Management

Customer pharmacy store **plus** a daily medication tracker (MediTracker), in one web app.

**Project status:** complete educational / portfolio demo. Not a certified medical product and not for real patient data or payments. See [docs/SECURITY.md](docs/SECURITY.md).

## What you get

| Role | Capabilities |
|---|---|
| **Customer** | Register, login, buy medicines, view orders, MediTracker (today / add / history / settings, EN + TA) |
| **Vendor** | Register, login, add products, restock, view customer orders |

## Quick start

Needs **Node.js 22+**.

```bash
npm install
npm start
```

Open http://localhost:8080

| Role | Account type on login | User ID | Password |
|---|---|---|---|
| Customer | Customer | `demo` | `demo123` |
| Vendor | Seller | `vendor` | `vendor123` |

After customer login, use the **MEDITRACKER** tab.

```bash
npm run start:prod   # same server; set PORT / SESSION_SECRET in the environment
```

## Repository layout

```
├── WebContent/          UI (HTML, JSP sources, CSS, JS, images)
├── server/              Live Node runtime (Express + SQLite)
├── sql/                 MySQL schema + MediTracker migration
├── docs/                Architecture, user guide, security
├── docker-compose.yml   Optional MySQL + app compose file
├── package.json         npm start
└── build.xml            Original Ant / Tomcat WAR build
```

## Docs

- [User guide](docs/USER_GUIDE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security and scope](docs/SECURITY.md)

## Tomcat + MySQL (original JSP path)

```bash
mysql -u root -p < sql/drugdatabase.sql
mysql -u root -p < sql/meditracker_migration.sql
```

JSP pages use `jdbc:mysql://mysql:3306/drugdatabase` (Docker DNS). For a host MySQL, map `mysql` to `127.0.0.1` in `/etc/hosts`. Then build a WAR with Ant and deploy to Tomcat under `/Pharmacy-Drug-Mangement`.

## License

MIT — see [LICENSE](LICENSE). Demo only; no warranty.
