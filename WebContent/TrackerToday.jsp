<%@ page language="java" contentType="text/html; charset=ISO-8859-1"
    pageEncoding="ISO-8859-1"%>
<%@ page import="java.sql.*" %>
<%@ page import="javax.sql.*" %>
<%@ page import="java.text.*" %>
<%@ include file="WEB-INF/security.jsp" %>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="ISO-8859-1">
<title>Today's Medicine - MediTracker</title>
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
	String today = new SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date());
	String csrf = csrfToken(httpSession);

	String theme = "light";
	String accentColor = "blue";
	String language = "en";
	String remindBefore = "10";
	String repeatReminder = "false";
	String vibration = "true";
	String dndStart = "22:00";
	String dndEnd = "08:00";

	Connection conn = null;
	PreparedStatement ps = null;
	ResultSet rs = null;
	try {
		Class.forName("com.mysql.jdbc.Driver");
		conn = DriverManager.getConnection("jdbc:mysql://mysql:3306/drugdatabase?useSSL=false&allowPublicKeyRetrieval=true", "root", "1234");

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
		}
		rs.close();
		ps.close();

		// Load today's status into a map keyed by medid
		java.util.Map<Integer, String> statusMap = new java.util.HashMap<Integer, String>();
		java.util.Map<Integer, String> statusTimeMap = new java.util.HashMap<Integer, String>();
		ps = conn.prepareStatement("SELECT medid, status, statusTime FROM medicineStatus WHERE medid IN (SELECT medid FROM medicines WHERE uid=?) AND statusDate=?");
		ps.setString(1, guid);
		ps.setString(2, today);
		rs = ps.executeQuery();
		while (rs.next()) {
			statusMap.put(rs.getInt("medid"), rs.getString("status"));
			statusTimeMap.put(rs.getInt("medid"), rs.getString("statusTime"));
		}
		rs.close();
		ps.close();

		// Load today's active medicines
		ps = conn.prepareStatement("SELECT * FROM medicines WHERE uid=? AND startDate<=? AND endDate>=? AND expiryDate>=? ORDER BY reminderTime");
		ps.setString(1, guid);
		ps.setString(2, today);
		ps.setString(3, today);
		ps.setString(4, today);
		rs = ps.executeQuery();

		StringBuilder medsJson = new StringBuilder();
		StringBuilder listHtml = new StringBuilder();
		int index = 0;
		boolean hasMed = false;
		while (rs.next()) {
			hasMed = true;
			int medid = rs.getInt("medid");
			String medName = rs.getString("medicineName");
			String dayCycle = rs.getString("dayCycle");
			String foodReference = rs.getString("foodReference");
			String startDate = rs.getString("startDate");
			String endDate = rs.getString("endDate");
			String expiryDate = rs.getString("expiryDate");
			String reminderTime = rs.getString("reminderTime");
			String status = statusMap.get(medid);
			String statusTime = statusTimeMap.get(medid);
			index++;

			if (medsJson.length() > 0) medsJson.append(",");
			medsJson.append("{\"medid\":").append(medid)
				.append(",\"medicineName\":\"").append(escJs(medName))
				.append("\",\"reminderTime\":\"").append(escJs(reminderTime))
				.append("\",\"taken\":").append((status != null && status.equals("yes")) ? "true" : "false").append("}");

			String cycleDisplay = dayCycle != null ? dayCycle.replace(",", ", ") : "";
			String actionHtml = "";
			if (status != null && status.equals("yes")) {
				actionHtml = "<div class='status-badge status-taken'>Taken at " + esc(statusTime != null ? statusTime : "") + "</div>";
			} else if (status != null && status.equals("no")) {
				actionHtml = "<div class='status-badge status-not-taken'>Marked as Not Taken at " + esc(statusTime != null ? statusTime : "") + "</div>";
			} else {
				actionHtml = "<span class='action-prompt'>Did you take this medicine?</span>"
					+ "<form method='post' action='TrackerAction.jsp' class='inline-form'>"
					+ "<input type='hidden' name='csrf' value='" + esc(csrf) + "'>"
					+ "<input type='hidden' name='action' value='mark'>"
					+ "<input type='hidden' name='medid' value='" + medid + "'>"
					+ "<button type='submit' name='status' value='no' class='action-btn no-btn'>No</button>"
					+ "<button type='submit' name='status' value='yes' class='action-btn yes-btn'>Yes</button>"
					+ "</form>"
					+ "<form method='post' action='TrackerAction.jsp' class='inline-form' onsubmit='return confirm(\"Remove this medicine permanently?\")'>"
					+ "<input type='hidden' name='csrf' value='" + esc(csrf) + "'>"
					+ "<input type='hidden' name='action' value='remove'>"
					+ "<input type='hidden' name='medid' value='" + medid + "'>"
					+ "<button type='submit' class='action-btn remove-btn'>Remove</button>"
					+ "</form>";
			}

			listHtml.append("<li><div class='medicine-card'>")
				.append("<div class='med-serial'>#").append(index).append("</div>")
				.append("<div class='med-header'><h3 class='med-name'>").append(esc(medName)).append("</h3>")
				.append("<span class='med-cycle'>").append(esc(cycleDisplay)).append("</span></div>")
				.append("<div class='med-details-grid'>")
				.append("<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'></path><circle cx='12' cy='7' r='4'></circle></svg><span>").append(esc(foodReference)).append("</span></div>")
				.append("<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='18' rx='2' ry='2'></rect><line x1='16' y1='2' x2='16' y2='6'></line><line x1='8' y1='2' x2='8' y2='6'></line><line x1='3' y1='10' x2='21' y2='10'></line></svg><span>Ends: ").append(esc(endDate)).append("</span></div>")
				.append("<div class='detail-item'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><polyline points='12 6 12 12 16 14'></polyline></svg><span>Reminder: ").append(esc(reminderTime)).append("</span></div>")
				.append("</div><div class='med-actions'>").append(actionHtml).append("</div></div></li>");
		}
		request.setAttribute("hasMed", hasMed);
		request.setAttribute("medsJson", medsJson.toString());
		request.setAttribute("listHtml", listHtml.toString());
	} catch (Exception e) {
		if (request.getAttribute("listHtml") == null) request.setAttribute("listHtml", "");
		if (request.getAttribute("medsJson") == null) request.setAttribute("medsJson", "");
		out.println("error: " + esc(String.valueOf(e)));
	} finally {
		try { if (rs != null) rs.close(); } catch (Exception e) {}
		try { if (ps != null) ps.close(); } catch (Exception e) {}
		try { if (conn != null) conn.close(); } catch (Exception e) {}
	}
%>
  <div class="container">
    <header class="header">
      <h1 data-i18n-key="todayMedTitle">Today's Medicine</h1>
      <div class="header-buttons">
        <form method="post" action="TrackerAction.jsp" class="inline-form" onsubmit="return confirm('Reset all statuses for today?')">
          <input type="hidden" name="csrf" value="<%= esc(csrf) %>">
          <input type="hidden" name="action" value="reset">
          <button type="submit" class="reset-btn" data-i18n-key="resetStatusButton">Reset Status</button>
        </form>
        <a href="TrackerDashboard.jsp" class="back-btn" data-i18n-key="dashboardButton">Dashboard</a>
      </div>
    </header>
    <ul class="medicine-list" id="today-medicines">
      <%= request.getAttribute("listHtml") %>
    </ul>
    <% if (!Boolean.TRUE.equals(request.getAttribute("hasMed"))) { %>
      <div class="no-meds-card" data-i18n-key="noMedsToday">You have no medicines scheduled for today.</div>
    <% } %>
  </div>

  <script>
    window.TRACKER_SETTINGS = { theme: '<%= escJs(theme) %>', accentColor: '<%= escJs(accentColor) %>', language: '<%= escJs(language) %>', remindBefore: '<%= escJs(remindBefore) %>', repeatReminder: '<%= escJs(repeatReminder) %>', vibration: '<%= escJs(vibration) %>', dndStart: '<%= escJs(dndStart) %>', dndEnd: '<%= escJs(dndEnd) %>' };
    window.TRACKER_ENABLE_NOTIFICATIONS = true;
    window.TRACKER_MEDICINES = [ <%= request.getAttribute("medsJson") %> ];
  </script>
  <script src="js/tracker.js"></script>
</body>
</html>
