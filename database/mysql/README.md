# KDramaVerse MySQL/MariaDB Migration

This folder contains the relational schema for moving the current MongoDB data into a free MySQL-compatible database.

Recommended free target:
- Local development: XAMPP MariaDB
- Shared hosting: cPanel MySQL/MariaDB
- VPS: MariaDB or MySQL Community Server

## Environment

Add these to `server/.env`:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=kdramaverse
```

## Migrate Current Mongo Data

1. Start MySQL/MariaDB.
2. Keep `MONGODB_URI` in `server/.env` so the script can read the current imported data.
3. Run:

```powershell
npm --prefix server run migrate:mysql
```

The script creates the `kdramaverse` database, creates tables, and upserts movies, dramas, episodes, users, admin roles, subtitles, articles, settings, analytics, and notifications.

## Important

This is the data migration layer. The current Node API still uses Mongoose/MongoDB until the controllers/models are rewritten to query MySQL. Use this as the clean first step before switching the live API.
