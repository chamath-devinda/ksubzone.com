const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const sqlite3 = require('sqlite3');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, 'server-php', '.env');
const sqlitePath = path.join(rootDir, 'server-php', 'ksubzone.sqlite');

const collections = [
  'users',
  'admins',
  'roles',
  'permissions',
  'movies',
  'dramas',
  'seasons',
  'episodes',
  'genres',
  'subtitles',
  'reviews',
  'comments',
  'analytics',
  'settings',
  'articles',
  'notifications',
  'reports',
  'homepagesections',
  'rolepermissions'
];

function readEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalize(value) {
  if (value instanceof ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = normalize(item);
    }
    return out;
  }
  return value;
}

function sqliteRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function sqliteGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function ensureCollectionTable(db, collection) {
  await sqliteRun(db, `CREATE TABLE IF NOT EXISTS \`${collection}\` (
    _id TEXT PRIMARY KEY,
    data TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`);
}

function dateFor(doc, key) {
  const value = doc[key];
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function publicDoc(doc) {
  const clean = normalize(doc);
  const id = clean._id;
  const createdAt = clean.createdAt;
  const updatedAt = clean.updatedAt;
  delete clean._id;
  delete clean.createdAt;
  delete clean.updatedAt;
  return { id, createdAt, updatedAt, data: clean };
}

async function upsertDoc(db, collection, doc) {
  const clean = publicDoc(doc);
  if (!clean.id) return false;

  await sqliteRun(
    db,
    `INSERT INTO \`${collection}\` (_id, data, createdAt, updatedAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(_id) DO UPDATE SET
       data = excluded.data,
       createdAt = excluded.createdAt,
       updatedAt = excluded.updatedAt`,
    [
      String(clean.id),
      JSON.stringify(clean.data),
      clean.createdAt || dateFor(doc, 'createdAt'),
      clean.updatedAt || dateFor(doc, 'updatedAt')
    ]
  );
  return true;
}

async function removeSeedMediaIfImported(db, importedCounts) {
  if ((importedCounts.movies || 0) <= 0 && (importedCounts.dramas || 0) <= 0) return;

  const sampleTmdbIds = [555501, 555502, 999901];
  for (const collection of ['movies', 'dramas']) {
    await ensureCollectionTable(db, collection);
    for (const tmdbId of sampleTmdbIds) {
      const row = await sqliteGet(
        db,
        `SELECT _id, data FROM \`${collection}\` WHERE json_extract(data, '$.tmdbId') = ?`,
        [tmdbId]
      );
      if (row) {
        await sqliteRun(db, `DELETE FROM \`${collection}\` WHERE _id = ?`, [row._id]);
      }
    }
  }
}

async function main() {
  const env = readEnv(envPath);
  const mongoUri = env.MONGODB_URI || process.env.MONGODB_URI;
  if (!mongoUri || mongoUri.includes('your_mongodb_connection_string')) {
    throw new Error('MONGODB_URI is missing in server-php/.env');
  }

  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 15000
  });

  const db = new sqlite3.Database(sqlitePath);
  const importedCounts = {};

  try {
    await client.connect();
    const mongoDb = client.db();

    for (const collection of collections) {
      await ensureCollectionTable(db, collection);

      const exists = await mongoDb
        .listCollections({ name: collection }, { nameOnly: true })
        .hasNext();
      if (!exists) {
        importedCounts[collection] = 0;
        continue;
      }

      const docs = await mongoDb.collection(collection).find({}).toArray();
      let count = 0;
      for (const doc of docs) {
        if (await upsertDoc(db, collection, doc)) count += 1;
      }
      importedCounts[collection] = count;
    }

    await removeSeedMediaIfImported(db, importedCounts);

    console.log('MongoDB to SQLite import completed.');
    for (const [collection, count] of Object.entries(importedCounts)) {
      if (count > 0) console.log(`${collection}: ${count}`);
    }
  } finally {
    await client.close().catch(() => {});
    db.close();
  }
}

main().catch((error) => {
  console.error(`Import failed: ${error.message}`);
  process.exit(1);
});
