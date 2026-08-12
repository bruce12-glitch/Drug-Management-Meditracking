-- Pharmacy Drug Management + MediTracker schema
-- Compatible with MySQL 5.7+/8 and MariaDB 10+
-- Also used as the reference schema for the local live server.

CREATE DATABASE IF NOT EXISTS drugdatabase;
USE drugdatabase;

CREATE TABLE IF NOT EXISTS customer (
  uid VARCHAR(20) PRIMARY KEY,
  pass VARCHAR(20) NOT NULL,
  fname VARCHAR(30),
  lname VARCHAR(30),
  email VARCHAR(50),
  address VARCHAR(80),
  phno BIGINT
);

CREATE TABLE IF NOT EXISTS seller (
  sid VARCHAR(20) PRIMARY KEY,
  pass VARCHAR(20) NOT NULL,
  sname VARCHAR(30),
  address VARCHAR(80),
  phno BIGINT
);

CREATE TABLE IF NOT EXISTS product (
  pid VARCHAR(20) PRIMARY KEY,
  pname VARCHAR(40),
  manufacturer VARCHAR(40),
  mfg DATE,
  exp DATE,
  price INT
);

CREATE TABLE IF NOT EXISTS inventory (
  pid VARCHAR(20),
  pname VARCHAR(40),
  quantity INT,
  sid VARCHAR(20),
  PRIMARY KEY (pid, sid)
);

CREATE TABLE IF NOT EXISTS orders (
  oid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pid VARCHAR(20),
  sid VARCHAR(20),
  uid VARCHAR(20),
  quantity INT,
  price INT,
  orderdatetime DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS updateinventory;
DELIMITER //
CREATE TRIGGER updateinventory
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
  UPDATE inventory
     SET quantity = quantity - NEW.quantity
   WHERE pid = NEW.pid AND sid = NEW.sid;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS getorders;
DELIMITER //
CREATE PROCEDURE getorders(IN user_id VARCHAR(20))
BEGIN
  SELECT oid, pid, price, quantity, sid, orderdatetime
    FROM orders
   WHERE uid = user_id
   ORDER BY orderdatetime DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS getsellerorders;
DELIMITER //
CREATE PROCEDURE getsellerorders(IN seller_id VARCHAR(20))
BEGIN
  SELECT oid, pid, price, quantity, uid, orderdatetime
    FROM orders
   WHERE sid = seller_id
   ORDER BY orderdatetime DESC;
END //
DELIMITER ;
