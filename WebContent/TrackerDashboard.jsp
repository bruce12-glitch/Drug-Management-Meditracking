<%@ page language="java" contentType="text/html; charset=ISO-8859-1"
    pageEncoding="ISO-8859-1"%>
<%@ page import="java.sql.*" %>
<%@ page import="javax.sql.*" %>
<%@ include file="WEB-INF/security.jsp" %>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="ISO-8859-1">
<title>MediTracker Dashboard</title>
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

	String theme = "light";
	String accentColor = "blue";
	String language = "en";
	String fname = guid;

	Connection conn = null;
	PreparedStatement ps = null;
	ResultSet rs = null;
	try {
		Class.forName("com.mysql.jdbc.Driver");
		conn = DriverManager.getConnection("jdbc:mysql://mysql:3306/drugdatabase?useSSL=false&allowPublicKeyRetrieval=true", "root", "1234");

		ps = conn.prepareStatement("SELECT theme, accentColor, language FROM userSettings WHERE uid=?");
		ps.setString(1, guid);
		rs = ps.executeQuery();
		if (rs.next()) {
			theme = rs.getString("theme") == null ? "light" : rs.getString("theme");
			accentColor = rs.getString("accentColor") == null ? "blue" : rs.getString("accentColor");
			language = rs.getString("language") == null ? "en" : rs.getString("language");
		}
		rs.close();
		ps.close();

		ps = conn.prepareStatement("SELECT fname FROM customer WHERE uid=?");
		ps.setString(1, guid);
		rs = ps.executeQuery();
		if (rs.next() && rs.getString("fname") != null) {
			fname = rs.getString("fname");
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
    <header class="dashboard-header">
      <div>
        <h1 class="title" data-i18n-key="dashboardTitle">MEDITRACKER</h1>
        <p class="subtitle" id="welcome-message"><%= esc(fname) %></p>
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
    window.TRACKER_SETTINGS = { theme: '<%= escJs(theme) %>', accentColor: '<%= escJs(accentColor) %>', language: '<%= escJs(language) %>' };
  </script>
  <script src="js/tracker.js"></script>
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
  </script>
</body>
</html>
