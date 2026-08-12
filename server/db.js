const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "drugdatabase.sqlite");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime12() {
  return new Date().toLocaleTimeString("en-US", { hour12: true });
}

function openDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer (
      uid TEXT PRIMARY KEY,
      pass TEXT NOT NULL,
      fname TEXT,
      lname TEXT,
      email TEXT,
      address TEXT,
      phno INTEGER
    );
    CREATE TABLE IF NOT EXISTS seller (
      sid TEXT PRIMARY KEY,
      pass TEXT NOT NULL,
      sname TEXT,
      address TEXT,
      phno INTEGER
    );
    CREATE TABLE IF NOT EXISTS product (
      pid TEXT PRIMARY KEY,
      pname TEXT,
      manufacturer TEXT,
      mfg TEXT,
      exp TEXT,
      price INTEGER
    );
    CREATE TABLE IF NOT EXISTS inventory (
      pid TEXT,
      pname TEXT,
      quantity INTEGER,
      sid TEXT,
      PRIMARY KEY (pid, sid)
    );
    CREATE TABLE IF NOT EXISTS orders (
      oid INTEGER PRIMARY KEY AUTOINCREMENT,
      pid TEXT,
      sid TEXT,
      uid TEXT,
      quantity INTEGER,
      price INTEGER,
      orderdatetime TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS medicines (
      medid INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL,
      medicineName TEXT NOT NULL,
      dayCycle TEXT,
      foodReference TEXT,
      startDate TEXT,
      endDate TEXT,
      expiryDate TEXT,
      reminderTime TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS medicineStatus (
      medid INTEGER NOT NULL,
      statusDate TEXT NOT NULL,
      status TEXT,
      statusTime TEXT,
      PRIMARY KEY (medid, statusDate)
    );
    CREATE TABLE IF NOT EXISTS medicineHistory (
      uid TEXT NOT NULL,
      medid INTEGER NOT NULL,
      medicineName TEXT,
      dayCycle TEXT,
      foodReference TEXT,
      endDate TEXT,
      reminderTime TEXT,
      historyDate TEXT NOT NULL,
      historyTime TEXT,
      status TEXT,
      PRIMARY KEY (uid, medid, historyDate)
    );
    CREATE TABLE IF NOT EXISTS userSettings (
      uid TEXT PRIMARY KEY,
      theme TEXT DEFAULT 'light',
      accentColor TEXT DEFAULT 'blue',
      language TEXT DEFAULT 'en',
      remindBefore TEXT DEFAULT '10',
      repeatReminder INTEGER DEFAULT 0,
      vibration INTEGER DEFAULT 1,
      dndStart TEXT DEFAULT '22:00',
      dndEnd TEXT DEFAULT '08:00',
      timeFormat TEXT DEFAULT '12h'
    );
  `);
  seed(db);
  return db;
}

function seed(db) {
  const customers = db.prepare("SELECT COUNT(*) AS n FROM customer").get().n;
  if (customers === 0) {
    db.prepare(
      "INSERT INTO customer(uid,pass,fname,lname,email,address,phno) VALUES (?,?,?,?,?,?,?)"
    ).run("demo", "demo123", "Asha", "Patel", "asha@example.com", "12 Lake View, Pune", 9876543210);
    db.prepare(
      "INSERT INTO userSettings(uid,theme,accentColor,language,remindBefore,repeatReminder,vibration,dndStart,dndEnd,timeFormat) VALUES (?,?,?,?,?,?,?,?,?,?)"
    ).run("demo", "light", "blue", "en", "10", 0, 1, "22:00", "08:00", "12h");
  }
  const sellers = db.prepare("SELECT COUNT(*) AS n FROM seller").get().n;
  if (sellers === 0) {
    db.prepare("INSERT INTO seller(sid,pass,sname,address,phno) VALUES (?,?,?,?,?)").run(
      "vendor",
      "vendor123",
      "MediCare Pharmacy",
      "88 Market Street, Pune",
      9123456780
    );
  }
  const products = db.prepare("SELECT COUNT(*) AS n FROM product").get().n;
  if (products === 0) {
    const items = [
      ["P101", "Paracetamol 500mg", "Cipla", "2025-01-15", "2028-01-15", 45, 120],
      ["P102", "Amoxicillin 250mg", "Sun Pharma", "2025-03-01", "2027-09-01", 90, 80],
      ["P103", "Vitamin D3", "Himalaya", "2025-06-10", "2028-06-10", 160, 60],
      ["P104", "Cetirizine 10mg", "Dr Reddy", "2025-02-20", "2027-12-20", 35, 150],
    ];
    const insP = db.prepare(
      "INSERT INTO product(pid,pname,manufacturer,mfg,exp,price) VALUES (?,?,?,?,?,?)"
    );
    const insI = db.prepare("INSERT INTO inventory(pid,pname,sid,quantity) VALUES (?,?,?,?)");
    for (const [pid, pname, mfr, mfg, exp, price, qty] of items) {
      insP.run(pid, pname, mfr, mfg, exp, price);
      insI.run(pid, pname, "vendor", qty);
    }
  }
  const meds = db.prepare("SELECT COUNT(*) AS n FROM medicines").get().n;
  if (meds === 0) {
    const start = today();
    const end = new Date();
    end.setDate(end.getDate() + 14);
    const endStr = end.toISOString().slice(0, 10);
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    db.prepare(
      "INSERT INTO medicines(uid,medicineName,dayCycle,foodReference,startDate,endDate,expiryDate,reminderTime,createdAt) VALUES (?,?,?,?,?,?,?,?,datetime('now','localtime'))"
    ).run("demo", "Paracetamol 500mg", "Morning,Night", "After Food", start, endStr, expiry.toISOString().slice(0, 10), "08:00");
    db.prepare(
      "INSERT INTO medicines(uid,medicineName,dayCycle,foodReference,startDate,endDate,expiryDate,reminderTime,createdAt) VALUES (?,?,?,?,?,?,?,?,datetime('now','localtime'))"
    ).run("demo", "Vitamin D3", "Morning", "After Food", start, endStr, expiry.toISOString().slice(0, 10), "09:30");
  }
}

function ensureSettings(db, uid) {
  const row = db.prepare("SELECT uid FROM userSettings WHERE uid=?").get(uid);
  if (!row) {
    db.prepare(
      "INSERT INTO userSettings(uid,theme,accentColor,language,remindBefore,repeatReminder,vibration,dndStart,dndEnd,timeFormat) VALUES (?,'light','blue','en','10',0,1,'22:00','08:00','12h')"
    ).run(uid);
  }
}

module.exports = { openDb, today, nowTime12, ensureSettings, DB_PATH };
