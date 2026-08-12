<%@ page language="java" contentType="text/html; charset=ISO-8859-1"
    pageEncoding="ISO-8859-1"%>
<%@ page import="java.sql.*" %>
<%@ page import="javax.sql.*" %>
<%@ include file="WEB-INF/security.jsp" %>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="ISO-8859-1">
<title>Settings - MediTracker</title>
<link rel="stylesheet" href="css/Tracker.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="js/translations.js"></script>
<script src="js/i18n.js"></script>
</head>
<body>
<%
	HttpSession httpSession = request.getSession();
	String guid = (String) httpSession.getAttribute("currentuser");
	String userType = (String) httpSession.getAttribute("currentusertype");
	if (guid == null || !"1".equals(userType)) {
		response.sendRedirect("Login.html");
		return;
	}
	String csrf = csrfToken(httpSession);

	String save = request.getParameter("save");
	String theme = "light";
	String accentColor = "blue";
	String language = "en";
	String remindBefore = "10";
	String repeatReminder = "false";
	String vibration = "true";
	String dndStart = "22:00";
	String dndEnd = "08:00";
	String timeFormat = "12h";
	String saved = "0";

	Connection conn = null;
	PreparedStatement ps = null;
	ResultSet rs = null;
	try {
		Class.forName("com.mysql.jdbc.Driver");
		conn = DriverManager.getConnection("jdbc:mysql://mysql:3306/drugdatabase", "root", "1234");

		// Save is a state-changing action: POST + CSRF only.
		if ("1".equals(save) && "POST".equalsIgnoreCase(request.getMethod())) {
			String submittedCsrf = request.getParameter("csrf");
			if (validCsrf(httpSession, submittedCsrf)) {
				String newTheme = request.getParameter("themeSelector");
				String newAccent = request.getParameter("accentColor");
				String newLang = request.getParameter("language");
				String newRemind = request.getParameter("remindBefore");
				String newRepeat = request.getParameter("repeatReminder");
				String newVibration = request.getParameter("vibration");
				String newDndStart = request.getParameter("dndStart");
				String newDndEnd = request.getParameter("dndEnd");
				String newTimeFormat = request.getParameter("timeFormat");

				// Whitelist all settings values
				boolean valid = true;
				if (!inList(newTheme, "light", "dark")) valid = false;
				if (!inList(newAccent, "blue", "green", "purple")) valid = false;
				if (!inList(newLang, "en", "ta")) valid = false;
				if (!isValidRemindBefore(newRemind)) valid = false;
				if (!inList(newTimeFormat, "12h", "24h")) valid = false;
				if (!isValidTime(newDndStart)) valid = false;
				if (!isValidTime(newDndEnd)) valid = false;

				if (valid) {
					theme = newTheme;
					accentColor = newAccent;
					language = newLang;
					remindBefore = newRemind;
					repeatReminder = (newRepeat != null) ? "true" : "false";
					vibration = (newVibration != null) ? "true" : "false";
					dndStart = newDndStart;
					dndEnd = newDndEnd;
					timeFormat = newTimeFormat;

					ps = conn.prepareStatement("SELECT uid FROM userSettings WHERE uid=?");
					ps.setString(1, guid);
					rs = ps.executeQuery();
					if (rs.next()) {
						rs.close();
						ps = conn.prepareStatement("UPDATE userSettings SET theme=?, accentColor=?, language=?, remindBefore=?, repeatReminder=?, vibration=?, dndStart=?, dndEnd=?, timeFormat=? WHERE uid=?");
						ps.setString(1, theme);
						ps.setString(2, accentColor);
						ps.setString(3, language);
						ps.setString(4, remindBefore);
						ps.setInt(5, "true".equals(repeatReminder) ? 1 : 0);
						ps.setInt(6, "true".equals(vibration) ? 1 : 0);
						ps.setString(7, dndStart);
						ps.setString(8, dndEnd);
						ps.setString(9, timeFormat);
						ps.setString(10, guid);
						ps.executeUpdate();
					} else {
						rs.close();
						ps = conn.prepareStatement("INSERT INTO userSettings (uid, theme, accentColor, language, remindBefore, repeatReminder, vibration, dndStart, dndEnd, timeFormat) VALUES (?,?,?,?,?,?,?,?,?,?)");
						ps.setString(1, guid);
						ps.setString(2, theme);
						ps.setString(3, accentColor);
						ps.setString(4, language);
						ps.setString(5, remindBefore);
						ps.setInt(6, "true".equals(repeatReminder) ? 1 : 0);
						ps.setInt(7, "true".equals(vibration) ? 1 : 0);
						ps.setString(8, dndStart);
						ps.setString(9, dndEnd);
						ps.setString(10, timeFormat);
						ps.executeUpdate();
					}
					ps.close();
					saved = "1";
				}
			}
		}

		ps = conn.prepareStatement("SELECT * FROM userSettings WHERE uid=?");
		ps.setString(1, guid);
		rs = ps.executeQuery();
		if (rs.next()) {
			theme = rs.getString("theme") == null ? "light" : rs.getString("theme");
			accentColor = rs.getString("accentColor") == null ? "blue" : rs.getString("accentColor");
			language = rs.getString("language") == null ? "en" : rs.getString("language");
			remindBefore = rs.getString("remindBefore") == null ? "10" : rs.getString("remindBefore");
			repeatReminder = rs.getBoolean("repeatReminder") ? "true" : "false";
			vibration = rs.getBoolean("vibration") ? "true" : "false";
			dndStart = rs.getString("dndStart") == null ? "22:00" : rs.getString("dndStart");
			dndEnd = rs.getString("dndEnd") == null ? "08:00" : rs.getString("dndEnd");
			timeFormat = rs.getString("timeFormat") == null ? "12h" : rs.getString("timeFormat");
		}
	} catch (Exception e) {
		out.println("error: " + esc(String.valueOf(e)));
	} finally {
		try { if (rs != null) rs.close(); } catch (Exception e) {}
		try { if (ps != null) ps.close(); } catch (Exception e) {}
		try { if (conn != null) conn.close(); } catch (Exception e) {}
	}
%>
  <div class="container">
    <header class="header">
      <h1 data-i18n-key="settingsTitle">Settings</h1>
      <div class="header-buttons">
        <a href="TrackerDashboard.jsp" class="back-btn" data-i18n-key="dashboardButton">Dashboard</a>
      </div>
    </header>

    <% if ("1".equals(saved)) { %>
      <div class="no-meds-card" style="font-style: normal; color: #0f5132; background-color: #d1e7dd;" data-i18n-key="settingsSaved">Settings saved successfully!</div>
    <% } %>

    <form method="post" action="TrackerSettings.jsp">
    <input type="hidden" name="csrf" value="<%= esc(csrf) %>">
    <div class="settings-card">
      <h2 data-i18n-key="remindersTitle">Reminder & Notification Settings</h2>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="notificationTime">Notification Time</span>
          <p data-i18n-key="notificationTimeDesc">Choose when you get reminded.</p>
        </div>
        <select id="remindBefore" name="remindBefore">
          <option value="0" <%= "0".equals(remindBefore) ? "selected" : "" %>>At time of medicine</option>
          <option value="5" <%= "5".equals(remindBefore) ? "selected" : "" %>>5 minutes before</option>
          <option value="10" <%= "10".equals(remindBefore) ? "selected" : "" %>>10 minutes before</option>
          <option value="15" <%= "15".equals(remindBefore) ? "selected" : "" %>>15 minutes before</option>
        </select>
      </div>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="repeatReminder">Repeat Reminder</span>
          <p data-i18n-key="repeatReminderDesc">Repeat every 15 min until marked.</p>
        </div>
        <label class="switch"><input type="checkbox" id="repeatReminder" name="repeatReminder" <%= "true".equals(repeatReminder) ? "checked" : "" %>><span class="slider"></span></label>
      </div>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="soundVibration">Sound & Vibration</span>
          <p data-i18n-key="soundVibrationDesc">Enable or disable vibration on alerts.</p>
        </div>
        <label class="switch"><input type="checkbox" id="vibration" name="vibration" <%= "true".equals(vibration) ? "checked" : "" %>><span class="slider"></span></label>
      </div>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="doNotDisturb">Do Not Disturb</span>
          <p data-i18n-key="doNotDisturbDesc">Silence reminders between these hours.</p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <input type="time" id="dndStart" name="dndStart" value="<%= esc(dndStart) %>"> to <input type="time" id="dndEnd" name="dndEnd" value="<%= esc(dndEnd) %>">
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
          <option value="light" <%= "light".equals(theme) ? "selected" : "" %>>Light</option>
          <option value="dark" <%= "dark".equals(theme) ? "selected" : "" %>>Dark</option>
        </select>
      </div>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="accentLabel">Accent Color</span>
          <p data-i18n-key="accentDesc">Select your favorite color.</p>
        </div>
        <select id="accentColor" name="accentColor">
          <option value="blue" <%= "blue".equals(accentColor) ? "selected" : "" %>>Blue</option>
          <option value="green" <%= "green".equals(accentColor) ? "selected" : "" %>>Green</option>
          <option value="purple" <%= "purple".equals(accentColor) ? "selected" : "" %>>Purple</option>
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
          <option value="en" <%= "en".equals(language) ? "selected" : "" %>>English</option>
          <option value="ta" <%= "ta".equals(language) ? "selected" : "" %>>தமிழ் (Tamil)</option>
        </select>
      </div>
      <div class="setting-item">
        <div class="setting-label">
          <span data-i18n-key="timeFormatLabel">Time Format</span>
          <p data-i18n-key="timeFormatDesc">Choose 12-hour or 24-hour format.</p>
        </div>
        <select id="timeFormat" name="timeFormat">
          <option value="12h" <%= "12h".equals(timeFormat) ? "selected" : "" %>>12-hour (AM/PM)</option>
          <option value="24h" <%= "24h".equals(timeFormat) ? "selected" : "" %>>24-hour</option>
        </select>
      </div>
    </div>

    <input type="hidden" name="save" value="1">
    <button type="submit" class="save-btn" data-i18n-key="saveSettings">Save Settings</button>
    </form>
  </div>

  <script>
    window.TRACKER_SETTINGS = { theme: '<%= escJs(theme) %>', accentColor: '<%= escJs(accentColor) %>', language: '<%= escJs(language) %>' };
  </script>
  <script src="js/tracker.js"></script>
</body>
</html>
