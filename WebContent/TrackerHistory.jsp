<%@ page language="java" contentType="text/html; charset=ISO-8859-1"
    pageEncoding="ISO-8859-1"%>
<%@ page import="java.sql.*" %>
<%@ page import="javax.sql.*" %>
<%@ include file="WEB-INF/security.jsp" %>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="ISO-8859-1">
<title>Medication History - MediTracker</title>
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

	String theme = "light";
	String accentColor = "blue";
	String language = "en";

	Connection conn = null;
	PreparedStatement ps = null;
	ResultSet rs = null;
	try {
		Class.forName("com.mysql.jdbc.Driver");
		conn = DriverManager.getConnection("jdbc:mysql://mysql:3306/drugdatabase?useSSL=false&allowPublicKeyRetrieval=true", "root", "1234");

		// Clear history is a destructive action: POST + CSRF only.
		if ("POST".equalsIgnoreCase(request.getMethod())) {
			String clear = request.getParameter("clear");
			String submittedCsrf = request.getParameter("csrf");
			if ("1".equals(clear) && validCsrf(httpSession, submittedCsrf)) {
				ps = conn.prepareStatement("DELETE FROM medicineHistory WHERE uid=?");
				ps.setString(1, guid);
				ps.executeUpdate();
				ps.close();
			}
		}

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

		ps = conn.prepareStatement("SELECT * FROM medicineHistory WHERE uid=? ORDER BY historyDate DESC, historyTime DESC");
		ps.setString(1, guid);
		rs = ps.executeQuery();

		StringBuilder listHtml = new StringBuilder();
		int index = 0;
		int total = 0;
		while (rs.next()) {
			total++;
		}
		rs.close();
		ps.close();

		ps = conn.prepareStatement("SELECT * FROM medicineHistory WHERE uid=? ORDER BY historyDate DESC, historyTime DESC");
		ps.setString(1, guid);
		rs = ps.executeQuery();
		while (rs.next()) {
			index++;
			String medName = rs.getString("medicineName");
			String dayCycle = rs.getString("dayCycle");
			String foodReference = rs.getString("foodReference");
			String endDate = rs.getString("endDate");
			String reminderTime = rs.getString("reminderTime");
			String hDate = rs.getString("historyDate");
			String hTime = rs.getString("historyTime");
			String hStatus = rs.getString("status");
			String cycleDisplay = dayCycle != null ? dayCycle.replace(",", ", ") : "";
			String statusClass = "Taken".equals(hStatus) ? "status-taken" : "status-not-taken";
			String statusText = "Taken".equals(hStatus) ? ("Taken on " + hDate + " at " + hTime) : ("Not Taken on " + hDate + " at " + hTime);

			listHtml.append("<li><div class='medicine-card'>")
				.append("<div class='med-serial'>#").append(total - index + 1).append("</div>")
				.append("<div class='med-header'><h3 class='med-name'>").append(esc(medName)).append("</h3>")
				.append("<span class='med-cycle'>").append(esc(cycleDisplay)).append("</span></div>")
				.append("<div class='med-details-grid'>")
				.append("<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'></path><circle cx='12' cy='7' r='4'></circle></svg><span>").append(esc(foodReference)).append("</span></div>")
				.append("<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='18' rx='2' ry='2'></rect><line x1='16' y1='2' x2='16' y2='6'></line><line x1='8' y1='2' x2='8' y2='6'></line><line x1='3' y1='10' x2='21' y2='10'></line></svg><span>Ends: ").append(esc(endDate)).append("</span></div>")
				.append("<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><polyline points='12 6 12 12 16 14'></polyline></svg><span>Reminder: ").append(esc(reminderTime)).append("</span></div>")
				.append("</div><div class='med-actions'><div class='status-badge ").append(statusClass).append("'>").append(esc(statusText)).append("</div></div></div></li>");
		}
		request.setAttribute("hasHistory", index > 0);
		request.setAttribute("listHtml", listHtml.toString());
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
      <h1 data-i18n-key="historyTitle">Medication History</h1>
      <div class="header-buttons">
        <form method="post" action="TrackerHistory.jsp" class="inline-form" onsubmit="return confirm('Clear all history permanently? This cannot be undone.')">
          <input type="hidden" name="csrf" value="<%= esc(csrf) %>">
          <input type="hidden" name="clear" value="1">
          <button type="submit" class="clear-btn" data-i18n-key="clearHistoryButton">Clear History</button>
        </form>
        <a href="TrackerDashboard.jsp" class="back-btn" data-i18n-key="dashboardButton">Dashboard</a>
      </div>
    </header>
    <ul class="medicine-list" id="history-list">
      <%= request.getAttribute("listHtml") %>
    </ul>
    <% if (!Boolean.TRUE.equals(request.getAttribute("hasHistory"))) { %>
      <div class="no-meds-card" data-i18n-key="noHistory">You have no medication history yet.</div>
    <% } %>
  </div>

  <script>
    window.TRACKER_SETTINGS = { theme: '<%= escJs(theme) %>', accentColor: '<%= escJs(accentColor) %>', language: '<%= escJs(language) %>' };
  </script>
  <script src="js/tracker.js"></script>
</body>
</html>
