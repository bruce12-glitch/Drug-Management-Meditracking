<%@ page language="java" contentType="text/html; charset=ISO-8859-1"
    pageEncoding="ISO-8859-1"%>
<%@ page import="java.sql.*" %>
<%@ page import="javax.sql.*" %>
<%@ include file="WEB-INF/security.jsp" %>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="ISO-8859-1">
<title>Add Medicine - MediTracker</title>
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
	String formError = "";

	String medName = request.getParameter("medicineName");
	String action = request.getParameter("action");

	// Only process form submission on POST with valid CSRF.
	if (medName != null && "POST".equalsIgnoreCase(request.getMethod())) {
		String submittedCsrf = request.getParameter("csrf");
		if (!validCsrf(httpSession, submittedCsrf)) {
			formError = "Your session has expired. Please try again.";
		} else {
			String[] cycles = request.getParameterValues("daycycle");
			String food = request.getParameter("food");
			String reminderTime = request.getParameter("reminderTime");
			String startDate = request.getParameter("startDate");
			String endDate = request.getParameter("endDate");
			String expiryDate = request.getParameter("expiryDate");

			// Whitelist day cycles
			boolean validCycles = true;
			if (cycles != null) {
				for (String c : cycles) {
					if (!inList(c, "Morning", "Afternoon", "Evening", "Night")) {
						validCycles = false;
						break;
					}
				}
			}

			// Whitelist food reference
			boolean validFood = inList(food, "Before Food", "After Food");

			if (cycles != null && cycles.length > 0 && validCycles && validFood && startDate != null && endDate != null && expiryDate != null && reminderTime != null && !medName.trim().isEmpty() && medName.trim().length() <= 100) {
				boolean validInput = true;
				try {
					java.sql.Date startSqlDate = java.sql.Date.valueOf(startDate);
					java.sql.Date endSqlDate = java.sql.Date.valueOf(endDate);
					java.sql.Date expirySqlDate = java.sql.Date.valueOf(expiryDate);
					if (endSqlDate.before(startSqlDate)) {
						validInput = false;
						formError = "End date must be on or after the start date.";
					} else if (expirySqlDate.before(startSqlDate)) {
						validInput = false;
						formError = "Expiry date must be on or after the start date.";
					} else if (!isValidTime(reminderTime)) {
						validInput = false;
						formError = "Reminder time must be a valid 24-hour time.";
					}
				} catch (Exception e) {
					validInput = false;
					formError = "Please enter valid medicine dates and reminder time.";
				}

				if (validInput) {
					String cycleStr = String.join(",", cycles);
					Connection conn = null;
					PreparedStatement ps = null;
					try {
						Class.forName("com.mysql.jdbc.Driver");
						conn = DriverManager.getConnection("jdbc:mysql://mysql:3306/drugdatabase", "root", "1234");
						ps = conn.prepareStatement("INSERT INTO medicines (uid, medicineName, dayCycle, foodReference, startDate, endDate, expiryDate, reminderTime, createdAt) VALUES (?,?,?,?,?,?,?,?,NOW())");
						ps.setString(1, guid);
						ps.setString(2, medName.trim());
						ps.setString(3, cycleStr);
						ps.setString(4, food);
						ps.setString(5, startDate);
						ps.setString(6, endDate);
						ps.setString(7, expiryDate);
						ps.setString(8, reminderTime);
						ps.executeUpdate();
						response.sendRedirect("TrackerToday.jsp?added=1");
						return;
					} catch (Exception e) {
						out.println("<p style='color:red;'>Error: " + esc(String.valueOf(e)) + "</p>");
					} finally {
						try { if (ps != null) ps.close(); } catch (Exception e) {}
						try { if (conn != null) conn.close(); } catch (Exception e) {}
					}
				}
			} else if (medName != null) {
				formError = "Please complete all medicine fields before submitting.";
			}
		}
	}

	Connection conn2 = null;
	PreparedStatement ps2 = null;
	ResultSet rs2 = null;
	try {
		Class.forName("com.mysql.jdbc.Driver");
		conn2 = DriverManager.getConnection("jdbc:mysql://mysql:3306/drugdatabase", "root", "1234");
		ps2 = conn2.prepareStatement("SELECT theme, accentColor, language FROM userSettings WHERE uid=?");
		ps2.setString(1, guid);
		rs2 = ps2.executeQuery();
		if (rs2.next()) {
			theme = rs2.getString("theme") == null ? "light" : rs2.getString("theme");
			accentColor = rs2.getString("accentColor") == null ? "blue" : rs2.getString("accentColor");
			language = rs2.getString("language") == null ? "en" : rs2.getString("language");
		}
	} catch (Exception e) {
		out.println("error: " + esc(String.valueOf(e)));
	} finally {
		try { if (rs2 != null) rs2.close(); } catch (Exception e) {}
		try { if (ps2 != null) ps2.close(); } catch (Exception e) {}
		try { if (conn2 != null) conn2.close(); } catch (Exception e) {}
	}
%>
  <div class="container">
    <header class="header">
      <h1 data-i18n-key="addMedTitle">Add New Medicine</h1>
      <div class="header-buttons">
        <a href="TrackerDashboard.jsp" class="back-btn" data-i18n-key="dashboardButton">Dashboard</a>
      </div>
    </header>

    <div class="form-card">
      <% if (!formError.isEmpty()) { %>
        <div class="no-meds-card" style="font-style: normal; color: #842029; background-color: #f8d7da;"><%= esc(formError) %></div>
      <% } %>
      <form method="post" action="TrackerAddMedicine.jsp">
        <input type="hidden" name="csrf" value="<%= esc(csrf) %>">
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
  </div>

  <script>
    window.TRACKER_SETTINGS = { theme: '<%= escJs(theme) %>', accentColor: '<%= escJs(accentColor) %>', language: '<%= escJs(language) %>' };
  </script>
  <script src="js/tracker.js"></script>
</body>
</html>
