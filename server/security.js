function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escJs(s) {
  if (s == null) return "";
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function csrfToken(session) {
  if (!session.csrfToken) {
    session.csrfToken = require("crypto").randomUUID();
  }
  return session.csrfToken;
}

function validCsrf(session, submitted) {
  return !!(submitted && session.csrfToken && session.csrfToken === submitted);
}

function isValidTime(s) {
  return typeof s === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(s);
}

function isValidRemindBefore(s) {
  return s === "0" || s === "5" || s === "10" || s === "15";
}

function inList(value, allowed) {
  return allowed.includes(value);
}

function requireCustomer(req, res) {
  if (!req.session.currentuser || req.session.currentusertype !== "1") {
    res.redirect("/Login.html");
    return false;
  }
  return true;
}

function requireSeller(req, res) {
  if (!req.session.currentuser || req.session.currentusertype !== "2") {
    res.redirect("/Login.html");
    return false;
  }
  return true;
}

module.exports = {
  esc,
  escJs,
  csrfToken,
  validCsrf,
  isValidTime,
  isValidRemindBefore,
  inList,
  requireCustomer,
  requireSeller,
};
