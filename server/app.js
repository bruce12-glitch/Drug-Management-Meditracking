const path = require("path");
const express = require("express");
const session = require("express-session");
const { openDb, today, nowTime12, ensureSettings } = require("./db");
const {
  esc,
  escJs,
  csrfToken,
  validCsrf,
  isValidTime,
  isValidRemindBefore,
  inList,
  requireCustomer,
  requireSeller,
} = require("./security");

const app = express();
const db = openDb();
const WEB = path.join(__dirname, "..", "WebContent");
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";

app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "meditracking-demo-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: false },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

function customerNav(active) {
  const items = [
    ["Homepage.jsp", "HOME"],
    ["Buy.jsp", "BUY"],
    ["Orders.jsp", "ORDERS"],
    ["TrackerDashboard.jsp", "MEDITRACKER"],
  ];
  return items
    .map(([href, label]) => `<a href="${href}"${active === label ? ' class="active-nav"' : ""}>${label}</a>`)
    .join("\n\t\t\t\t");
}

function sellerNav() {
  return `<a href="SellerHomepage.jsp">HOME</a>
				<a href="AddProduct.html">ADD</a>
				<a href="AddInventory.jsp">RESTOCK</a>
				<a href="SellerOrders.jsp">ORDERS</a>`;
}

function storeChrome(title, css, nav, body) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="css/${css}">
</head>
<body>
<div class="main">
	<div class="topbar1"></div>
	<div class="topbar2">
		<div class="container1">
			<div class="logout-btn">
				<a href="Logout.jsp">Logout</a>
			</div>
		</div>
	</div>
	<div class="header">
		<div class="container2">
			<div class="navbar">
				${nav}
			</div>
		</div>
	</div>
</div>
<div class="active">
${body}
</div>
</body>
</html>`;
}

function trackerShell(title, settings, bodyHtml, extraFields, extraScript) {
  const theme = settings.theme || "light";
  const accent = settings.accentColor || "blue";
  const language = settings.language || "en";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="ISO-8859-1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="css/Tracker.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="js/translations.js"></script>
<script src="js/i18n.js"></script>
</head>
<body>
${bodyHtml}
  <script>
    window.TRACKER_SETTINGS = { theme: '${escJs(theme)}', accentColor: '${escJs(accent)}', language: '${escJs(language)}'${extraFields || ""} };
    ${extraScript || ""}
  </script>
  <script src="js/tracker.js"></script>
</body>
</html>`;
}

function getSettings(uid) {
  ensureSettings(db, uid);
  const row = db.prepare("SELECT * FROM userSettings WHERE uid=?").get(uid) || {};
  return {
    theme: row.theme || "light",
    accentColor: row.accentColor || "blue",
    language: row.language || "en",
    remindBefore: row.remindBefore == null ? "10" : String(row.remindBefore),
    repeatReminder: row.repeatReminder ? "true" : "false",
    vibration: row.vibration ? "true" : "false",
    dndStart: row.dndStart || "22:00",
    dndEnd: row.dndEnd || "08:00",
    timeFormat: row.timeFormat || "12h",
  };
}

// ---------- Auth ----------
app.get(["/Login.jsp", "/Pharmacy-Drug-Mangement/Login.jsp"], (req, res) => {
  res.redirect("/Login.html");
});
app.get(["/Register.jsp", "/Pharmacy-Drug-Mangement/Register.jsp"], (req, res) => {
  res.redirect("/Register.html");
});
app.get(["/SellerRegister.jsp", "/Pharmacy-Drug-Mangement/SellerRegister.jsp"], (req, res) => {
  res.redirect("/SellerRegister.html");
});

function requireSellerFile(file) {
  return (req, res) => {
    if (!requireSeller(req, res)) return;
    res.sendFile(path.join(WEB, file));
  };
}
app.get(["/AddProduct.html", "/Pharmacy-Drug-Mangement/AddProduct.html"], requireSellerFile("AddProduct.html"));
app.get(["/AddProductError.html", "/Pharmacy-Drug-Mangement/AddProductError.html"], requireSellerFile("AddProductError.html"));
app.get(["/AddProductError2.html", "/Pharmacy-Drug-Mangement/AddProductError2.html"], requireSellerFile("AddProductError2.html"));

app.post(["/Login.jsp", "/Pharmacy-Drug-Mangement/Login.jsp"], (req, res) => {
  const uid1 = req.body.userid;
  const pass1 = req.body.password;
  const u2 = req.body.utype;
  if (!uid1 || !String(uid1).trim() || !pass1) return res.redirect("/LoginError2.html");
  if (String(uid1).length > 20 || String(pass1).length > 20) return res.redirect("/LoginError2.html");
  const u = Number(u2);
  if (u !== 1 && u !== 2) return res.redirect("/LoginError2.html");
  const row =
    u === 2
      ? db.prepare("SELECT sid AS id, pass FROM seller WHERE sid=?").get(uid1)
      : db.prepare("SELECT uid AS id, pass FROM customer WHERE uid=?").get(uid1);
  if (!row) return res.redirect("/LoginError2.html");
  if (row.pass !== pass1) return res.redirect("/LoginError1.html");
  req.session.currentuser = uid1;
  req.session.currentusertype = String(u);
  return res.redirect(u === 1 ? "/Homepage.jsp" : "/SellerHomepage.jsp");
});

app.post(["/Register.jsp", "/Pharmacy-Drug-Mangement/Register.jsp"], (req, res) => {
  try {
    const { fname, lname, email, phno, uid, address, pass1, pass2 } = req.body;
    if (![fname, lname, email, phno, uid, address, pass1, pass2].every((v) => v && String(v).trim())) {
      return res.redirect("/RegisterError2.html");
    }
    if (String(uid).length > 20 || String(pass1).length > 20) return res.redirect("/RegisterError2.html");
    if (!/^\d{6,15}$/.test(String(phno))) return res.redirect("/RegisterError2.html");
    if (db.prepare("SELECT uid FROM customer WHERE uid=?").get(uid)) {
      return res.redirect("/RegisterError1.html");
    }
    if (pass1 !== pass2) return res.redirect("/RegisterError2.html");
    db.prepare(
      "INSERT INTO customer(uid,pass,fname,lname,email,address,phno) VALUES (?,?,?,?,?,?,?)"
    ).run(String(uid).trim(), pass1, fname.trim(), lname.trim(), email.trim(), address.trim(), Number(phno));
    ensureSettings(db, String(uid).trim());
    return res.redirect("/Login.html");
  } catch (e) {
    res.redirect("/RegisterError2.html");
  }
});

app.post(["/SellerRegister.jsp", "/Pharmacy-Drug-Mangement/SellerRegister.jsp"], (req, res) => {
  try {
    const { name, phno, uid, address, pass1, pass2 } = req.body;
    if (![name, phno, uid, address, pass1, pass2].every((v) => v && String(v).trim())) {
      return res.redirect("/SellerRegisterError2.html");
    }
    if (String(uid).length > 20 || String(pass1).length > 20) return res.redirect("/SellerRegisterError2.html");
    if (!/^\d{6,15}$/.test(String(phno))) return res.redirect("/SellerRegisterError2.html");
    if (db.prepare("SELECT sid FROM seller WHERE sid=?").get(uid)) {
      return res.redirect("/SellerRegisterError1.html");
    }
    if (pass1 !== pass2) return res.redirect("/SellerRegisterError2.html");
    db.prepare("INSERT INTO seller(sid,pass,sname,address,phno) VALUES (?,?,?,?,?)").run(
      String(uid).trim(),
      pass1,
      name.trim(),
      address.trim(),
      Number(phno)
    );
    return res.redirect("/Login.html");
  } catch (e) {
    res.redirect("/SellerRegisterError2.html");
  }
});

app.all(["/Logout.jsp", "/Pharmacy-Drug-Mangement/Logout.jsp"], (req, res) => {
  req.session.destroy(() => res.redirect("/Index.html"));
});

// ---------- Customer store ----------
app.get(["/Homepage.jsp", "/Pharmacy-Drug-Mangement/Homepage.jsp"], (req, res) => {
  if (!requireCustomer(req, res)) return;
  const guid = req.session.currentuser;
  const rs = db.prepare("SELECT fname,uid,address,phno,email FROM customer WHERE uid=?").get(guid);
  const card = rs
    ? `<div class="filler2"></div>
			<div class="card">
  				<img src="images/User.png" class="Avatar" width=234 height=234>
  				<div class="container">
    			 <div class="space1"><b>${esc(rs.fname)}</b></div>
    			 <div class="filler3"></div>
   					<div class="space"><b>ID: </b>${esc(rs.uid)}</div>
   					<div class="space"><b>Address: </b>${esc(rs.address)}</div>
   					<div class="space"><b>Phone: </b>${esc(rs.phno)}</div>
   					<div class="space"><b>Email: </b>${esc(rs.email)}</div>
  				</div>
			</div>`
    : "";
  res.type("html").send(
    storeChrome(
      "Home Page",
      "Homepage.css",
      customerNav("HOME"),
      `<div class="filler"></div>
    <h2>Welcome ${esc(guid)}</h2>
    ${card}`
    )
  );
});

app.get(["/Buy.jsp", "/Pharmacy-Drug-Mangement/Buy.jsp"], (req, res) => {
  if (!requireCustomer(req, res)) return;
  const rows = db
    .prepare(
      "SELECT p.pname,p.pid,p.manufacturer,p.mfg,p.price,i.quantity FROM product p, inventory i WHERE p.pid=i.pid ORDER BY p.pname"
    )
    .all();
  const notice =
    req.query.error === "stock"
      ? `<div class="flash-error">Not enough stock for that order. Please choose a smaller quantity.</div>`
      : req.query.error === "qty"
        ? `<div class="flash-error">Enter a valid quantity of at least 1.</div>`
        : "";
  let html = `<div class="filler"></div>${notice}<div class="filler2"></div><div class="product-grid">`;
  if (!rows.length) {
    html += `<div class="empty-note">No medicines are listed for sale yet.</div>`;
  }
  for (const rs of rows) {
    const buy =
      rs.quantity > 0
        ? `<form action="PlaceOrder.jsp" method="post">
  					<input type="number" name="orderquantity" min="1" max="${rs.quantity}" step="1" placeholder="Enter quantity" required >
  					<input type="hidden" name="pid" value="${esc(rs.pid)}">
  					<p></p>
  					<button>Buy</button></form>`
        : `<button type="button" disabled>Out Of Stock</button>`;
    html += `<div class="card">
    				<img src="images/pills.png" width=180 height=200 alt="">
  					<h1>${esc(rs.pname)}</h1>
  					<p><b>ID: </b>${esc(rs.pid)}</p>
					<p><b>Manufacturer: </b>${esc(rs.manufacturer)}</p>
					<p><b>Mfg Date: </b>${esc(rs.mfg)}</p>
					<p><b>Stock: </b>${esc(rs.quantity)}</p>
					<p><b>Price: </b>${esc(rs.price)}</p>
					${buy}</div>`;
  }
  html += `</div>`;
  res.type("html").send(storeChrome("Buy", "Buy.css", customerNav("BUY"), html));
});

app.post(["/PlaceOrder.jsp", "/Pharmacy-Drug-Mangement/PlaceOrder.jsp"], (req, res) => {
  if (!requireCustomer(req, res)) return;
  try {
    const pid = req.body.pid;
    const qr = Number(req.body.orderquantity);
    const guid = req.session.currentuser;
    if (!Number.isInteger(qr) || qr < 1) return res.redirect("/Buy.jsp?error=qty");
    const rs = db
      .prepare(
        "SELECT P.pid, O.sid, P.price, O.quantity FROM inventory O, product P WHERE P.pid=? AND P.pid=O.pid"
      )
      .get(pid);
    if (!rs) return res.redirect("/Buy.jsp?error=stock");
    if (rs.quantity < qr) return res.redirect("/Buy.jsp?error=stock");
    const updated = db
      .prepare("UPDATE inventory SET quantity=quantity-? WHERE pid=? AND sid=? AND quantity>=?")
      .run(qr, rs.pid, rs.sid, qr);
    if (!updated.changes) return res.redirect("/Buy.jsp?error=stock");
    db.prepare("INSERT INTO orders(pid,sid,uid,quantity,price) VALUES (?,?,?,?,?)").run(
      rs.pid,
      rs.sid,
      guid,
      qr,
      qr * rs.price
    );
    res.redirect("/Orders.jsp");
  } catch (e) {
    res.redirect("/Buy.jsp?error=stock");
  }
});

app.get(["/Orders.jsp", "/Pharmacy-Drug-Mangement/Orders.jsp"], (req, res) => {
  if (!requireCustomer(req, res)) return;
  const rows = db
    .prepare(
      `SELECT o.oid, o.pid, o.price, o.quantity, o.sid, o.orderdatetime,
              COALESCE(p.pname, o.pid) AS pname
         FROM orders o
    LEFT JOIN product p ON p.pid = o.pid
        WHERE o.uid=?
     ORDER BY o.orderdatetime DESC`
    )
    .all(req.session.currentuser);
  const empty = rows.length
    ? ""
    : `<div class="empty-note">You have not placed any orders yet. Visit BUY to order medicines.</div>`;
  const tr = rows
    .map(
      (rs) => `<tr>
    			<td>${esc(rs.oid)}</td>
    			<td>${esc(rs.pname)} (${esc(rs.pid)})</td>
    			<td>${esc(rs.price)}</td>
    			<td>${esc(rs.quantity)}</td>
    			<td>${esc(rs.sid)}</td>
    			<td>${esc(rs.orderdatetime)}</td>
  			</tr>`
    )
    .join("");
  res.type("html").send(
    storeChrome(
      "Orders",
      "Orders.css",
      customerNav("ORDERS"),
      `<div class="filler"></div><div class="filler2"></div>
		<table class="tables">
			<tr>
    			<th>Order ID</th>
    			<th>Product</th>
    			<th>Price</th>
    			<th>Quantity</th>
    			<th>Seller ID</th>
    			<th>Order Date and Time</th>
  			</tr>
		${tr}
		</table>
		${empty}`
    )
  );
});

// ---------- Seller ----------
app.get(["/SellerHomepage.jsp", "/Pharmacy-Drug-Mangement/SellerHomepage.jsp"], (req, res) => {
  if (!requireSeller(req, res)) return;
  const guid = req.session.currentuser;
  const rs = db.prepare("SELECT sname,sid,address,phno FROM seller WHERE sid=?").get(guid);
  const card = rs
    ? `<div class="filler2"></div>
			<div class="card">
  				<img src="images/vendor.png" class="Avatar" width=264 height=194>
  				<div class="container">
    				<h4><b>${esc(rs.sname)}</b></h4>
   					<p><b>ID: </b>${esc(rs.sid)} </p>
   					<p><b>Address: </b>${esc(rs.address)}</p>
   					<p><b>Phone: </b>${esc(rs.phno)}</p>
  				</div>
			</div>`
    : "";
  res.type("html").send(
    storeChrome(
      "Home Page",
      "Homepage.css",
      sellerNav(),
      `<div class="filler"></div><h2>welcome ${esc(guid)}</h2>${card}`
    )
  );
});

app.post(["/AddProduct.jsp", "/Pharmacy-Drug-Mangement/AddProduct.jsp"], (req, res) => {
  if (!requireSeller(req, res)) return;
  try {
    const guid = req.session.currentuser;
    const { prname, prid, mfname, mdate, edate, price, quantity } = req.body;
    const priceN = Number(price);
    const qtyN = Number(quantity);
    if (![prname, prid, mfname, mdate, edate].every((v) => v && String(v).trim())) {
      return res.redirect("/AddProductError2.html");
    }
    if (!Number.isInteger(priceN) || priceN < 1 || !Number.isInteger(qtyN) || qtyN < 1) {
      return res.redirect("/AddProductError2.html");
    }
    if (db.prepare("SELECT pid FROM product WHERE pid=?").get(prid)) {
      return res.redirect("/AddProductError.html");
    }
    db.prepare("INSERT INTO product(pid,pname,manufacturer,mfg,exp,price) VALUES (?,?,?,?,?,?)").run(
      String(prid).trim(),
      prname.trim(),
      mfname.trim(),
      mdate,
      edate,
      priceN
    );
    db.prepare("INSERT INTO inventory(pid,pname,sid,quantity) VALUES (?,?,?,?)").run(
      String(prid).trim(),
      prname.trim(),
      guid,
      qtyN
    );
    res.redirect("/AddInventory.jsp");
  } catch (e) {
    res.redirect("/AddProductError2.html");
  }
});

app.get(["/AddInventory.jsp", "/Pharmacy-Drug-Mangement/AddInventory.jsp"], (req, res) => {
  if (!requireSeller(req, res)) return;
  const rows = db
    .prepare(
      "SELECT p.pid,i.quantity,p.pname,p.manufacturer,p.mfg,p.exp,p.price FROM product p, inventory i WHERE p.pid=i.pid AND i.sid=? ORDER BY p.pname"
    )
    .all(req.session.currentuser);
  const notice =
    req.query.error === "qty"
      ? `<div class="flash-error">Enter a valid restock quantity of at least 1.</div>`
      : "";
  let html = `<div class="filler"></div>${notice}<div class="filler2"></div><div class="product-grid">`;
  if (!rows.length) {
    html += `<div class="empty-note">No products yet. Use ADD to list a medicine.</div>`;
  }
  for (const rs of rows) {
    html += `<div class="card">
    					<form action="UpdateInventory.jsp" method="post">
    						<img src="images/pills.png" width=180 height=200 alt="">
  							<h1>${esc(rs.pname)}</h1>
  							<p><b>ID: </b>${esc(rs.pid)}</p>
							<p><b>Manufacturer: </b>${esc(rs.manufacturer)}</p>
							<p><b>Mfg Date: </b>${esc(rs.mfg)}</p>
							<p><b>Exp Date: </b>${esc(rs.exp)}</p>
							<p><b>Stock: </b>${esc(rs.quantity)}</p>
							<p><b>Price: </b>${esc(rs.price)}</p>
							<p><input type="number" name="restock" min="1" step="1" placeholder="quantity" required></p>
							<input type="hidden" name="pid" value="${esc(rs.pid)}" >
							<p></p>
  							<button>ReStock</button>
  						</form>
  					</div>`;
  }
  html += `</div>`;
  res.type("html").send(storeChrome("ReStock", "Buy.css", sellerNav(), html));
});

app.post(["/UpdateInventory.jsp", "/Pharmacy-Drug-Mangement/UpdateInventory.jsp"], (req, res) => {
  if (!requireSeller(req, res)) return;
  const qty = Number(req.body.restock);
  if (!Number.isInteger(qty) || qty < 1) return res.redirect("/AddInventory.jsp?error=qty");
  db.prepare("UPDATE inventory SET quantity=quantity+? WHERE sid=? AND pid=?").run(
    qty,
    req.session.currentuser,
    req.body.pid
  );
  res.redirect("/AddInventory.jsp");
});

app.get(["/SellerOrders.jsp", "/Pharmacy-Drug-Mangement/SellerOrders.jsp"], (req, res) => {
  if (!requireSeller(req, res)) return;
  const rows = db
    .prepare(
      `SELECT o.oid, o.pid, o.price, o.quantity, o.uid, o.orderdatetime,
              COALESCE(p.pname, o.pid) AS pname
         FROM orders o
    LEFT JOIN product p ON p.pid = o.pid
        WHERE o.sid=?
     ORDER BY o.orderdatetime DESC`
    )
    .all(req.session.currentuser);
  const empty = rows.length
    ? ""
    : `<div class="empty-note">No customer orders yet.</div>`;
  const tr = rows
    .map(
      (rs) => `<tr>
    			<td>${esc(rs.oid)}</td>
    			<td>${esc(rs.pname)} (${esc(rs.pid)})</td>
    			<td>${esc(rs.price)}</td>
    			<td>${esc(rs.quantity)}</td>
    			<td>${esc(rs.uid)}</td>
    			<td>${esc(rs.orderdatetime)}</td>
  			</tr>`
    )
    .join("");
  res.type("html").send(
    storeChrome(
      "Orders",
      "Orders.css",
      sellerNav(),
      `<div class="filler"></div><div class="filler2"></div>
		<table class="tables">
			<tr>
    			<th>Order ID</th>
    			<th>Product</th>
    			<th>Price</th>
    			<th>Quantity</th>
    			<th>CUSTOMER ID</th>
    			<th>Order Date and Time</th>
  			</tr>
		${tr}
		</table>
		${empty}`
    )
  );
});

// ---------- MediTracker ----------
app.get(["/TrackerDashboard.jsp", "/Pharmacy-Drug-Mangement/TrackerDashboard.jsp"], (req, res) => {
  if (!requireCustomer(req, res)) return;
  const guid = req.session.currentuser;
  const settings = getSettings(guid);
  const cust = db.prepare("SELECT fname FROM customer WHERE uid=?").get(guid);
  const fname = (cust && cust.fname) || guid;
  const body = `  <div class="container">
    <header class="dashboard-header">
      <div>
        <h1 class="title" data-i18n-key="dashboardTitle">MEDITRACKER</h1>
        <p class="subtitle" id="welcome-message">${esc(fname)}</p>
      </div>
      <div class="menu-container">
        <button id="menuButton" class="hamburger-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div id="dropdownMenu" class="dropdown-menu">
          <a href="TrackerDashboard.jsp" class="dropdown-item" data-i18n-key="dashboardButton">Dashboard</a>
          <a href="TrackerSettings.jsp" class="dropdown-item" data-i18n-key="settings">Settings</a>
          <a href="Homepage.jsp" class="dropdown-item">Pharmacy Store</a>
          <a href="Logout.jsp" class="dropdown-item" data-i18n-key="logout">Logout</a>
        </div>
      </div>
    </header>
    <main class="dashboard-grid">
      <a class="dashboard-btn" href="TrackerToday.jsp">
        <div class="icon-container" style="background-color: #EBF5FF;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007BFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <span data-i18n-key="todaysMedicine">Today's Medicine</span>
      </a>
      <a class="dashboard-btn" href="TrackerAddMedicine.jsp">
        <div class="icon-container" style="background-color: #E8F5E9;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        </div>
        <span data-i18n-key="addMedicine">Add Medicine</span>
      </a>
      <a class="dashboard-btn" href="TrackerHistory.jsp">
        <div class="icon-container" style="background-color: #F3E5F5;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9C27B0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
        </div>
        <span data-i18n-key="history">History</span>
      </a>
      <a class="dashboard-btn" href="TrackerSettings.jsp">
        <div class="icon-container" style="background-color: #FBE9E7;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5722" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </div>
        <span data-i18n-key="settings">Settings</span>
      </a>
    </main>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      var menuButton = document.getElementById('menuButton');
      var dropdownMenu = document.getElementById('dropdownMenu');
      menuButton.addEventListener('click', function (event) {
        event.stopPropagation();
        dropdownMenu.classList.toggle('show');
      });
      window.addEventListener('click', function () {
        dropdownMenu.classList.remove('show');
      });
    });
  </script>`;
  res.type("html").send(trackerShell("MediTracker Dashboard", settings, body));
});

function renderToday(req, res) {
  const guid = req.session.currentuser;
  const settings = getSettings(guid);
  const csrf = csrfToken(req.session);
  const day = today();
  const statusRows = db
    .prepare(
      "SELECT medid, status, statusTime FROM medicineStatus WHERE medid IN (SELECT medid FROM medicines WHERE uid=?) AND statusDate=?"
    )
    .all(guid, day);
  const statusMap = {};
  const statusTimeMap = {};
  for (const r of statusRows) {
    statusMap[r.medid] = r.status;
    statusTimeMap[r.medid] = r.statusTime;
  }
  const meds = db
    .prepare(
      "SELECT * FROM medicines WHERE uid=? AND startDate<=? AND endDate>=? AND expiryDate>=? ORDER BY reminderTime"
    )
    .all(guid, day, day, day);
  const medsJson = [];
  let listHtml = "";
  let index = 0;
  for (const rs of meds) {
    index += 1;
    const status = statusMap[rs.medid];
    const statusTime = statusTimeMap[rs.medid];
    medsJson.push(
      `{"medid":${rs.medid},"medicineName":"${escJs(rs.medicineName)}","reminderTime":"${escJs(rs.reminderTime)}","taken":${status === "yes" ? "true" : "false"}}`
    );
    const cycleDisplay = (rs.dayCycle || "").replace(/,/g, ", ");
    let actionHtml = "";
    if (status === "yes") {
      actionHtml = `<div class='status-badge status-taken'>Taken at ${esc(statusTime || "")}</div>`;
    } else if (status === "no") {
      actionHtml = `<div class='status-badge status-not-taken'>Marked as Not Taken at ${esc(statusTime || "")}</div>`;
    } else {
      actionHtml =
        `<span class='action-prompt'>Did you take this medicine?</span>` +
        `<form method='post' action='TrackerAction.jsp' class='inline-form'>` +
        `<input type='hidden' name='csrf' value='${esc(csrf)}'>` +
        `<input type='hidden' name='action' value='mark'>` +
        `<input type='hidden' name='medid' value='${rs.medid}'>` +
        `<button type='submit' name='status' value='no' class='action-btn no-btn'>No</button>` +
        `<button type='submit' name='status' value='yes' class='action-btn yes-btn'>Yes</button>` +
        `</form>` +
        `<form method='post' action='TrackerAction.jsp' class='inline-form' onsubmit='return confirm("Remove this medicine permanently?")'>` +
        `<input type='hidden' name='csrf' value='${esc(csrf)}'>` +
        `<input type='hidden' name='action' value='remove'>` +
        `<input type='hidden' name='medid' value='${rs.medid}'>` +
        `<button type='submit' class='action-btn remove-btn'>Remove</button>` +
        `</form>`;
    }
    listHtml +=
      `<li><div class='medicine-card'>` +
      `<div class='med-serial'>#${index}</div>` +
      `<div class='med-header'><h3 class='med-name'>${esc(rs.medicineName)}</h3>` +
      `<span class='med-cycle'>${esc(cycleDisplay)}</span></div>` +
      `<div class='med-details-grid'>` +
      `<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'></path><circle cx='12' cy='7' r='4'></circle></svg><span>${esc(rs.foodReference)}</span></div>` +
      `<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='18' rx='2' ry='2'></rect><line x1='16' y1='2' x2='16' y2='6'></line><line x1='8' y1='2' x2='8' y2='6'></line><line x1='3' y1='10' x2='21' y2='10'></line></svg><span>Ends: ${esc(rs.endDate)}</span></div>` +
      `<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><polyline points='12 6 12 12 16 14'></polyline></svg><span>Reminder: ${esc(rs.reminderTime)}</span></div>` +
      `</div><div class='med-actions'>${actionHtml}</div></div></li>`;
  }
  const empty = index === 0 ? `<div class="no-meds-card" data-i18n-key="noMedsToday">You have no medicines scheduled for today.</div>` : "";
  const extraFields = `, remindBefore: '${escJs(settings.remindBefore)}', repeatReminder: '${escJs(settings.repeatReminder)}', vibration: '${escJs(settings.vibration)}', dndStart: '${escJs(settings.dndStart)}', dndEnd: '${escJs(settings.dndEnd)}'`;
  const extraScript = `window.TRACKER_ENABLE_NOTIFICATIONS = true; window.TRACKER_MEDICINES = [ ${medsJson.join(",")} ];`;
  const body = `  <div class="container">
    <header class="header">
      <h1 data-i18n-key="todayMedTitle">Today's Medicine</h1>
      <div class="header-buttons">
        <form method="post" action="TrackerAction.jsp" class="inline-form" onsubmit="return confirm('Reset all statuses for today?')">
          <input type="hidden" name="csrf" value="${esc(csrf)}">
          <input type="hidden" name="action" value="reset">
          <button type="submit" class="reset-btn" data-i18n-key="resetStatusButton">Reset Status</button>
        </form>
        <a href="TrackerDashboard.jsp" class="back-btn" data-i18n-key="dashboardButton">Dashboard</a>
      </div>
    </header>
    <ul class="medicine-list" id="today-medicines">${listHtml}</ul>
    ${empty}
  </div>`;
  res.type("html").send(trackerShell("Today's Medicine - MediTracker", settings, body, extraFields, extraScript));
}

app.get(["/TrackerToday.jsp", "/Pharmacy-Drug-Mangement/TrackerToday.jsp"], (req, res) => {
  if (!requireCustomer(req, res)) return;
  renderToday(req, res);
});

app.all(["/TrackerAction.jsp", "/Pharmacy-Drug-Mangement/TrackerAction.jsp"], (req, res) => {
  if (!requireCustomer(req, res)) return;
  if (req.method !== "POST") return res.redirect("/TrackerToday.jsp");
  if (!validCsrf(req.session, req.body.csrf)) return res.redirect("/TrackerToday.jsp");
  const guid = req.session.currentuser;
  const action = req.body.action;
  const day = today();
  const statusTime = nowTime12();
  try {
    if (action === "mark") {
      const medid = Number(req.body.medid);
      const status = req.body.status;
      if (!Number.isInteger(medid) || !(status === "yes" || status === "no")) {
        return res.redirect("/TrackerToday.jsp");
      }
      const owned = db.prepare("SELECT medid FROM medicines WHERE medid=? AND uid=?").get(medid, guid);
      if (!owned) return res.redirect("/TrackerToday.jsp");
      const existing = db.prepare("SELECT medid FROM medicineStatus WHERE medid=? AND statusDate=?").get(medid, day);
      if (existing) {
        db.prepare("UPDATE medicineStatus SET status=?, statusTime=? WHERE medid=? AND statusDate=?").run(
          status,
          statusTime,
          medid,
          day
        );
      } else {
        db.prepare("INSERT INTO medicineStatus (medid, statusDate, status, statusTime) VALUES (?,?,?,?)").run(
          medid,
          day,
          status,
          statusTime
        );
      }
      const med = db
        .prepare("SELECT medicineName, dayCycle, foodReference, endDate, reminderTime FROM medicines WHERE medid=? AND uid=?")
        .get(medid, guid) || {};
      const statusLabel = status === "yes" ? "Taken" : "Not Taken";
      const hist = db
        .prepare("SELECT medid FROM medicineHistory WHERE uid=? AND medid=? AND historyDate=?")
        .get(guid, medid, day);
      if (hist) {
        db.prepare(
          "UPDATE medicineHistory SET status=?, historyTime=?, medicineName=?, dayCycle=?, foodReference=?, endDate=?, reminderTime=? WHERE uid=? AND medid=? AND historyDate=?"
        ).run(
          statusLabel,
          statusTime,
          med.medicineName,
          med.dayCycle,
          med.foodReference,
          med.endDate,
          med.reminderTime,
          guid,
          medid,
          day
        );
      } else {
        db.prepare(
          "INSERT INTO medicineHistory (uid, medid, medicineName, dayCycle, foodReference, endDate, reminderTime, historyDate, historyTime, status) VALUES (?,?,?,?,?,?,?,?,?,?)"
        ).run(
          guid,
          medid,
          med.medicineName,
          med.dayCycle,
          med.foodReference,
          med.endDate,
          med.reminderTime,
          day,
          statusTime,
          statusLabel
        );
      }
    } else if (action === "remove") {
      const medid = Number(req.body.medid);
      if (!Number.isInteger(medid)) return res.redirect("/TrackerToday.jsp");
      db.prepare("DELETE FROM medicineStatus WHERE medid IN (SELECT medid FROM medicines WHERE medid=? AND uid=?)").run(
        medid,
        guid
      );
      db.prepare("DELETE FROM medicines WHERE medid=? AND uid=?").run(medid, guid);
    } else if (action === "reset") {
      db.prepare(
        "DELETE FROM medicineStatus WHERE medid IN (SELECT medid FROM medicines WHERE uid=?) AND statusDate=?"
      ).run(guid, day);
    }
    res.redirect("/TrackerToday.jsp");
  } catch (e) {
    res.type("html").send("error: " + esc(String(e)));
  }
});

function renderAddMedicine(req, res, formError) {
  const settings = getSettings(req.session.currentuser);
  const csrf = csrfToken(req.session);
  const err = formError
    ? `<div class="no-meds-card" style="font-style: normal; color: #842029; background-color: #f8d7da;">${esc(formError)}</div>`
    : "";
  const body = `  <div class="container">
    <header class="header">
      <h1 data-i18n-key="addMedTitle">Add New Medicine</h1>
      <div class="header-buttons">
        <a href="TrackerDashboard.jsp" class="back-btn" data-i18n-key="dashboardButton">Dashboard</a>
      </div>
    </header>
    <div class="form-card">
      ${err}
      <form method="post" action="TrackerAddMedicine.jsp">
        <input type="hidden" name="csrf" value="${esc(csrf)}">
        <div class="form-group">
          <label for="medicineName" data-i18n-key="medNameLabel">Medicine Name</label>
          <input type="text" id="medicineName" name="medicineName" required maxlength="100">
        </div>
        <div class="form-group">
          <label data-i18n-key="dayCycleLabel">Day Cycle</label>
          <div class="check-group">
            <label><input type="checkbox" name="daycycle" value="Morning"> <span data-i18n-key="morning">Morning</span></label>
            <label><input type="checkbox" name="daycycle" value="Afternoon"> <span data-i18n-key="afternoon">Afternoon</span></label>
            <label><input type="checkbox" name="daycycle" value="Evening"> <span data-i18n-key="evening">Evening</span></label>
            <label><input type="checkbox" name="daycycle" value="Night"> <span data-i18n-key="night">Night</span></label>
          </div>
        </div>
        <div class="form-group">
          <label data-i18n-key="foodRefLabel">Food Reference</label>
          <div class="check-group">
            <label><input type="radio" name="food" value="Before Food" checked> <span data-i18n-key="beforeFood">Before Food</span></label>
            <label><input type="radio" name="food" value="After Food"> <span data-i18n-key="afterFood">After Food</span></label>
          </div>
        </div>
        <div class="form-group">
          <label for="reminderTime" data-i18n-key="reminderTimeLabel">Reminder Time</label>
          <input type="time" id="reminderTime" name="reminderTime" required>
        </div>
        <div class="form-group">
          <label data-i18n-key="durationLabel">Duration of Medicine</label>
        </div>
        <div class="form-group">
          <label for="startDate" data-i18n-key="startDateLabel">Start Date</label>
          <input type="date" id="startDate" name="startDate" required>
        </div>
        <div class="form-group">
          <label for="endDate" data-i18n-key="endDateLabel">End Date</label>
          <input type="date" id="endDate" name="endDate" required>
        </div>
        <div class="form-group">
          <label for="expiryDate" data-i18n-key="expiryDateLabel">Expiry Date</label>
          <input type="date" id="expiryDate" name="expiryDate" required>
        </div>
        <button type="submit" class="done-btn" data-i18n-key="addMedButton">Add Medicine</button>
      </form>
    </div>
  </div>`;
  res.type("html").send(trackerShell("Add Medicine - MediTracker", settings, body));
}

app.get(["/TrackerAddMedicine.jsp", "/Pharmacy-Drug-Mangement/TrackerAddMedicine.jsp"], (req, res) => {
  if (!requireCustomer(req, res)) return;
  renderAddMedicine(req, res, "");
});

app.post(["/TrackerAddMedicine.jsp", "/Pharmacy-Drug-Mangement/TrackerAddMedicine.jsp"], (req, res) => {
  if (!requireCustomer(req, res)) return;
  if (!validCsrf(req.session, req.body.csrf)) {
    return renderAddMedicine(req, res, "Your session has expired. Please try again.");
  }
  const medName = req.body.medicineName;
  let cycles = req.body.daycycle;
  if (!cycles) cycles = [];
  if (!Array.isArray(cycles)) cycles = [cycles];
  const food = req.body.food;
  const reminderTime = req.body.reminderTime;
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;
  const expiryDate = req.body.expiryDate;
  const validCycles = cycles.every((c) => inList(c, ["Morning", "Afternoon", "Evening", "Night"]));
  const validFood = inList(food, ["Before Food", "After Food"]);
  if (
    !(
      cycles.length > 0 &&
      validCycles &&
      validFood &&
      startDate &&
      endDate &&
      expiryDate &&
      reminderTime &&
      medName &&
      medName.trim() &&
      medName.trim().length <= 100
    )
  ) {
    return renderAddMedicine(req, res, "Please complete all medicine fields before submitting.");
  }
  if (endDate < startDate) return renderAddMedicine(req, res, "End date must be on or after the start date.");
  if (expiryDate < startDate) return renderAddMedicine(req, res, "Expiry date must be on or after the start date.");
  if (!isValidTime(reminderTime)) return renderAddMedicine(req, res, "Reminder time must be a valid 24-hour time.");
  db.prepare(
    "INSERT INTO medicines (uid, medicineName, dayCycle, foodReference, startDate, endDate, expiryDate, reminderTime, createdAt) VALUES (?,?,?,?,?,?,?,?,datetime('now','localtime'))"
  ).run(req.session.currentuser, medName.trim(), cycles.join(","), food, startDate, endDate, expiryDate, reminderTime);
  res.redirect("/TrackerToday.jsp?added=1");
});

app.all(["/TrackerHistory.jsp", "/Pharmacy-Drug-Mangement/TrackerHistory.jsp"], (req, res) => {
  if (!requireCustomer(req, res)) return;
  const guid = req.session.currentuser;
  const csrf = csrfToken(req.session);
  if (req.method === "POST" && req.body.clear === "1" && validCsrf(req.session, req.body.csrf)) {
    db.prepare("DELETE FROM medicineHistory WHERE uid=?").run(guid);
  }
  const settings = getSettings(guid);
  const rows = db
    .prepare("SELECT * FROM medicineHistory WHERE uid=? ORDER BY historyDate DESC, historyTime DESC")
    .all(guid);
  const total = rows.length;
  let listHtml = "";
  rows.forEach((rs, i) => {
    const index = i + 1;
    const cycleDisplay = (rs.dayCycle || "").replace(/,/g, ", ");
    const statusClass = rs.status === "Taken" ? "status-taken" : "status-not-taken";
    const statusText =
      rs.status === "Taken"
        ? `Taken on ${rs.historyDate} at ${rs.historyTime}`
        : `Not Taken on ${rs.historyDate} at ${rs.historyTime}`;
    listHtml +=
      `<li><div class='medicine-card'>` +
      `<div class='med-serial'>#${total - index + 1}</div>` +
      `<div class='med-header'><h3 class='med-name'>${esc(rs.medicineName)}</h3>` +
      `<span class='med-cycle'>${esc(cycleDisplay)}</span></div>` +
      `<div class='med-details-grid'>` +
      `<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'></path><circle cx='12' cy='7' r='4'></circle></svg><span>${esc(rs.foodReference)}</span></div>` +
      `<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='18' rx='2' ry='2'></rect><line x1='16' y1='2' x2='16' y2='6'></line><line x1='8' y1='2' x2='8' y2='6'></line><line x1='3' y1='10' x2='21' y2='10'></line></svg><span>Ends: ${esc(rs.endDate)}</span></div>` +
      `<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><polyline points='12 6 12 12 16 14'></polyline></svg><span>Reminder: ${esc(rs.reminderTime)}</span></div>` +
      `</div><div class='med-actions'><div class='status-badge ${statusClass}'>${esc(statusText)}</div></div></div></li>`;
  });
  const empty = total === 0 ? `<div class="no-meds-card" data-i18n-key="noHistory">You have no medication history yet.</div>` : "";
  const body = `  <div class="container">
    <header class="header">
      <h1 data-i18n-key="historyTitle">Medication History</h1>
      <div class="header-buttons">
        <form method="post" action="TrackerHistory.jsp" class="inline-form" onsubmit="return confirm('Clear all history permanently? This cannot be undone.')">
          <input type="hidden" name="csrf" value="${esc(csrf)}">
          <input type="hidden" name="clear" value="1">
          <button type="submit" class="clear-btn" data-i18n-key="clearHistoryButton">Clear History</button>
        </form>
        <a href="TrackerDashboard.jsp" class="back-btn" data-i18n-key="dashboardButton">Dashboard</a>
      </div>
    </header>
    <ul class="medicine-list" id="history-list">${listHtml}</ul>
    ${empty}
  </div>`;
  res.type("html").send(trackerShell("Medication History - MediTracker", settings, body));
});

app.all(["/TrackerSettings.jsp", "/Pharmacy-Drug-Mangement/TrackerSettings.jsp"], (req, res) => {
  if (!requireCustomer(req, res)) return;
  const guid = req.session.currentuser;
  const csrf = csrfToken(req.session);
  let saved = false;
  if (req.method === "POST" && req.body.save === "1" && validCsrf(req.session, req.body.csrf)) {
    const newTheme = req.body.themeSelector;
    const newAccent = req.body.accentColor;
    const newLang = req.body.language;
    const newRemind = req.body.remindBefore;
    const newTimeFormat = req.body.timeFormat;
    const newDndStart = req.body.dndStart;
    const newDndEnd = req.body.dndEnd;
    let valid = true;
    if (!inList(newTheme, ["light", "dark"])) valid = false;
    if (!inList(newAccent, ["blue", "green", "purple"])) valid = false;
    if (!inList(newLang, ["en", "ta"])) valid = false;
    if (!isValidRemindBefore(newRemind)) valid = false;
    if (!inList(newTimeFormat, ["12h", "24h"])) valid = false;
    if (!isValidTime(newDndStart)) valid = false;
    if (!isValidTime(newDndEnd)) valid = false;
    if (valid) {
      const repeat = req.body.repeatReminder != null ? 1 : 0;
      const vibration = req.body.vibration != null ? 1 : 0;
      const existing = db.prepare("SELECT uid FROM userSettings WHERE uid=?").get(guid);
      if (existing) {
        db.prepare(
          "UPDATE userSettings SET theme=?, accentColor=?, language=?, remindBefore=?, repeatReminder=?, vibration=?, dndStart=?, dndEnd=?, timeFormat=? WHERE uid=?"
        ).run(newTheme, newAccent, newLang, newRemind, repeat, vibration, newDndStart, newDndEnd, newTimeFormat, guid);
      } else {
        db.prepare(
          "INSERT INTO userSettings (uid, theme, accentColor, language, remindBefore, repeatReminder, vibration, dndStart, dndEnd, timeFormat) VALUES (?,?,?,?,?,?,?,?,?,?)"
        ).run(guid, newTheme, newAccent, newLang, newRemind, repeat, vibration, newDndStart, newDndEnd, newTimeFormat);
      }
      saved = true;
    }
  }
  const s = getSettings(guid);
  const sel = (cur, val) => (cur === val ? "selected" : "");
  const chk = (on) => (on === "true" ? "checked" : "");
  const savedBanner = saved
    ? `<div class="no-meds-card" style="font-style: normal; color: #0f5132; background-color: #d1e7dd;" data-i18n-key="settingsSaved">Settings saved successfully!</div>`
    : "";
  const body = `  <div class="container">
    <header class="header">
      <h1 data-i18n-key="settingsTitle">Settings</h1>
      <div class="header-buttons">
        <a href="TrackerDashboard.jsp" class="back-btn" data-i18n-key="dashboardButton">Dashboard</a>
      </div>
    </header>
    ${savedBanner}
    <form method="post" action="TrackerSettings.jsp">
    <input type="hidden" name="csrf" value="${esc(csrf)}">
    <div class="settings-card">
      <h2 data-i18n-key="remindersTitle">Reminder & Notification Settings</h2>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="notificationTime">Notification Time</span>
          <p data-i18n-key="notificationTimeDesc">Choose when you get reminded.</p>
        </div>
        <select id="remindBefore" name="remindBefore">
          <option value="0" ${sel(s.remindBefore, "0")}>At time of medicine</option>
          <option value="5" ${sel(s.remindBefore, "5")}>5 minutes before</option>
          <option value="10" ${sel(s.remindBefore, "10")}>10 minutes before</option>
          <option value="15" ${sel(s.remindBefore, "15")}>15 minutes before</option>
        </select>
      </div>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="repeatReminder">Repeat Reminder</span>
          <p data-i18n-key="repeatReminderDesc">Repeat every 15 min until marked.</p>
        </div>
        <label class="switch"><input type="checkbox" id="repeatReminder" name="repeatReminder" ${chk(s.repeatReminder)}><span class="slider"></span></label>
      </div>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="soundVibration">Sound & Vibration</span>
          <p data-i18n-key="soundVibrationDesc">Enable or disable vibration on alerts.</p>
        </div>
        <label class="switch"><input type="checkbox" id="vibration" name="vibration" ${chk(s.vibration)}><span class="slider"></span></label>
      </div>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="doNotDisturb">Do Not Disturb</span>
          <p data-i18n-key="doNotDisturbDesc">Silence reminders between these hours.</p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <input type="time" id="dndStart" name="dndStart" value="${esc(s.dndStart)}"> to <input type="time" id="dndEnd" name="dndEnd" value="${esc(s.dndEnd)}">
        </div>
      </div>
    </div>
    <div class="settings-card">
      <h2 data-i18n-key="appearanceTitle">Appearance & Theme</h2>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="themeLabel">Theme</span>
          <p data-i18n-key="themeDesc">Choose between light or dark mode.</p>
        </div>
        <select id="themeSelector" name="themeSelector">
          <option value="light" ${sel(s.theme, "light")}>Light</option>
          <option value="dark" ${sel(s.theme, "dark")}>Dark</option>
        </select>
      </div>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="accentLabel">Accent Color</span>
          <p data-i18n-key="accentDesc">Select your favorite color.</p>
        </div>
        <select id="accentColor" name="accentColor">
          <option value="blue" ${sel(s.accentColor, "blue")}>Blue</option>
          <option value="green" ${sel(s.accentColor, "green")}>Green</option>
          <option value="purple" ${sel(s.accentColor, "purple")}>Purple</option>
        </select>
      </div>
    </div>
    <div class="settings-card">
      <h2 data-i18n-key="languageTitle">Language & Region</h2>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="languageLabel">Language</span>
          <p data-i18n-key="langDesc">Choose your preferred language.</p>
        </div>
        <select id="language" name="language">
          <option value="en" ${sel(s.language, "en")}>English</option>
          <option value="ta" ${sel(s.language, "ta")}>தமிழ் (Tamil)</option>
        </select>
      </div>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="timeFormatLabel">Time Format</span>
          <p data-i18n-key="timeFormatDesc">Choose 12-hour or 24-hour format.</p>
        </div>
        <select id="timeFormat" name="timeFormat">
          <option value="12h" ${sel(s.timeFormat, "12h")}>12-hour (AM/PM)</option>
          <option value="24h" ${sel(s.timeFormat, "24h")}>24-hour</option>
        </select>
      </div>
    </div>
    <input type="hidden" name="save" value="1">
    <button type="submit" class="save-btn" data-i18n-key="saveSettings">Save Settings</button>
    </form>
  </div>`;
  res.type("html").send(trackerShell("Settings - MediTracker", s, body));
});

app.get(["/", "/Index.html", "/Pharmacy-Drug-Mangement", "/Pharmacy-Drug-Mangement/", "/Pharmacy-Drug-Mangement/Index.html"], (req, res) => {
  res.sendFile(path.join(WEB, "Index.html"));
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "meditracking", tracker: true });
});

app.use(["/WEB-INF", "/Pharmacy-Drug-Mangement/WEB-INF"], (_req, res) => {
  res.status(404).type("text").send("Not found");
});
app.use((req, res, next) => {
  if (/\.jsp$/i.test(req.path)) return res.redirect("/Login.html");
  next();
});
app.use("/Pharmacy-Drug-Mangement", express.static(WEB));
app.use(express.static(WEB));

app.use((req, res) => {
  res.status(404).type("html").send("Not found: " + esc(req.path));
});

app.listen(PORT, HOST, () => {
  console.log(`MediTracking live server on http://${HOST}:${PORT}`);
});
