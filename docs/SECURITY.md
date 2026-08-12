# Security and scope

This repository is an **educational pharmacy + medication tracker demo**.

## Allowed

- Classroom / portfolio demonstration
- Local or sandbox live preview
- Teaching JSP/Node session and CRUD flows

## Not allowed

- Real patient or prescription data
- Real payments or pharmacy operations
- Claiming medical, HIPAA, or DPDP compliance

## Known demo limits

| Topic | Current state |
|---|---|
| Passwords | Stored in plain text |
| Sessions | In-memory; lost on process restart |
| CSRF | Enforced on MediTracker writes only |
| Transport | App binds HTTP; put TLS at a reverse proxy |
| Rate limits | None |
| Backups | Local SQLite file, not replicated |
| Audit | Medicine history only; no admin audit log |

## Hardening if you fork it

1. Hash passwords (argon2/bcrypt) and stop shipping demo credentials.
2. Persist sessions (Redis or signed cookies) and set `secure` cookies behind HTTPS.
3. CSRF-protect every POST (buy, restock, register).
4. Rate-limit login and lock accounts after failures.
5. Move data to MySQL/Postgres with backups and least-privilege DB users.
6. Add a privacy policy, medical disclaimer, and access audit trail before any real users.
