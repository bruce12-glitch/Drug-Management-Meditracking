-- MediTracker tables (customer medication tracking)
USE drugdatabase;

CREATE TABLE IF NOT EXISTS medicines (
  medid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(20) NOT NULL,
  medicineName VARCHAR(100) NOT NULL,
  dayCycle VARCHAR(100),
  foodReference VARCHAR(50),
  startDate DATE,
  endDate DATE,
  expiryDate DATE,
  reminderTime VARCHAR(10),
  createdAt DATETIME,
  CONSTRAINT fk_medicines_customer FOREIGN KEY (uid) REFERENCES customer(uid)
);

CREATE TABLE IF NOT EXISTS medicineStatus (
  medid INT NOT NULL,
  statusDate DATE NOT NULL,
  status VARCHAR(10),
  statusTime VARCHAR(20),
  PRIMARY KEY (medid, statusDate),
  CONSTRAINT fk_status_medicine FOREIGN KEY (medid) REFERENCES medicines(medid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medicineHistory (
  uid VARCHAR(20) NOT NULL,
  medid INT NOT NULL,
  medicineName VARCHAR(100),
  dayCycle VARCHAR(100),
  foodReference VARCHAR(50),
  endDate VARCHAR(20),
  reminderTime VARCHAR(10),
  historyDate DATE NOT NULL,
  historyTime VARCHAR(20),
  status VARCHAR(20),
  PRIMARY KEY (uid, medid, historyDate)
);

CREATE TABLE IF NOT EXISTS userSettings (
  uid VARCHAR(20) PRIMARY KEY,
  theme VARCHAR(20) DEFAULT 'light',
  accentColor VARCHAR(20) DEFAULT 'blue',
  language VARCHAR(10) DEFAULT 'en',
  remindBefore VARCHAR(10) DEFAULT '10',
  repeatReminder TINYINT(1) DEFAULT 0,
  vibration TINYINT(1) DEFAULT 1,
  dndStart VARCHAR(10) DEFAULT '22:00',
  dndEnd VARCHAR(10) DEFAULT '08:00',
  timeFormat VARCHAR(10) DEFAULT '12h',
  CONSTRAINT fk_settings_customer FOREIGN KEY (uid) REFERENCES customer(uid)
);
