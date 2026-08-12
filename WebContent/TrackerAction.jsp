<%@ page language="java" contentType="text/html; charset=ISO-8859-1"
    pageEncoding="ISO-8859-1"%>
<%@ page import="java.sql.*" %>
<%@ page import="javax.sql.*" %>
<%@ page import="java.text.*" %>
<%@ include file="WEB-INF/security.jsp" %>
<%
	HttpSession httpSession = request.getSession();
	String guid = (String) httpSession.getAttribute("currentuser");
	String userType = (String) httpSession.getAttribute("currentusertype");
	if (guid == null || !"1".equals(userType)) {
		response.sendRedirect("Login.html");
		return;
	}

	// State-changing actions must be POST with a valid CSRF token.
	if (!"POST".equalsIgnoreCase(request.getMethod())) {
		response.sendRedirect("TrackerToday.jsp");
		return;
	}
	String csrf = request.getParameter("csrf");
	if (!validCsrf(httpSession, csrf)) {
		response.sendRedirect("TrackerToday.jsp");
		return;
	}

	String action = request.getParameter("action");
	String today = new SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date());
	String statusTime = new SimpleDateFormat("hh:mm:ss a").format(new java.util.Date());

	Connection conn = null;
	PreparedStatement ps = null;
	ResultSet rs = null;
	try {
		Class.forName("com.mysql.jdbc.Driver");
		conn = DriverManager.getConnection("jdbc:mysql://mysql:3306/drugdatabase?useSSL=false&allowPublicKeyRetrieval=true", "root", "1234");

		if ("mark".equals(action)) {
			int medid;
			try {
				medid = Integer.parseInt(request.getParameter("medid"));
			} catch (NumberFormatException e) {
				response.sendRedirect("TrackerToday.jsp");
				return;
			}
			String status = request.getParameter("status");
			if (!("yes".equals(status) || "no".equals(status))) {
				response.sendRedirect("TrackerToday.jsp");
				return;
			}

			// A medicine belongs to one customer. Verify that relationship before
			// creating or changing any status/history record.
			ps = conn.prepareStatement("SELECT medid FROM medicines WHERE medid=? AND uid=?");
			ps.setInt(1, medid);
			ps.setString(2, guid);
			rs = ps.executeQuery();
			if (!rs.next()) {
				rs.close();
				ps.close();
				response.sendRedirect("TrackerToday.jsp");
				return;
			}
			rs.close();
			ps.close();

			ps = conn.prepareStatement("SELECT medid FROM medicineStatus WHERE medid=? AND statusDate=?");
			ps.setInt(1, medid);
			ps.setString(2, today);
			rs = ps.executeQuery();
			if (rs.next()) {
				rs.close();
				ps = conn.prepareStatement("UPDATE medicineStatus SET status=?, statusTime=? WHERE medid=? AND statusDate=?");
				ps.setString(1, status);
				ps.setString(2, statusTime);
				ps.setInt(3, medid);
				ps.setString(4, today);
				ps.executeUpdate();
			} else {
				rs.close();
				ps = conn.prepareStatement("INSERT INTO medicineStatus (medid, statusDate, status, statusTime) VALUES (?,?,?,?)");
				ps.setInt(1, medid);
				ps.setString(2, today);
				ps.setString(3, status);
				ps.setString(4, statusTime);
				ps.executeUpdate();
			}
			ps.close();

			String medName = "", dayCycle = "", foodReference = "", endDate = "", reminderTime = "";
			ps = conn.prepareStatement("SELECT medicineName, dayCycle, foodReference, endDate, reminderTime FROM medicines WHERE medid=? AND uid=?");
			ps.setInt(1, medid);
			ps.setString(2, guid);
			rs = ps.executeQuery();
			if (rs.next()) {
				medName = rs.getString("medicineName");
				dayCycle = rs.getString("dayCycle");
				foodReference = rs.getString("foodReference");
				endDate = rs.getString("endDate");
				reminderTime = rs.getString("reminderTime");
			}
			rs.close();
			ps.close();

			String statusLabel = "yes".equals(status) ? "Taken" : "Not Taken";

			ps = conn.prepareStatement("SELECT medid FROM medicineHistory WHERE uid=? AND medid=? AND historyDate=?");
			ps.setString(1, guid);
			ps.setInt(2, medid);
			ps.setString(3, today);
			rs = ps.executeQuery();
			if (rs.next()) {
				rs.close();
				ps = conn.prepareStatement("UPDATE medicineHistory SET status=?, historyTime=?, medicineName=?, dayCycle=?, foodReference=?, endDate=?, reminderTime=? WHERE uid=? AND medid=? AND historyDate=?");
				ps.setString(1, statusLabel);
				ps.setString(2, statusTime);
				ps.setString(3, medName);
				ps.setString(4, dayCycle);
				ps.setString(5, foodReference);
				ps.setString(6, endDate);
				ps.setString(7, reminderTime);
				ps.setString(8, guid);
				ps.setInt(9, medid);
				ps.setString(10, today);
				ps.executeUpdate();
			} else {
				rs.close();
				ps = conn.prepareStatement("INSERT INTO medicineHistory (uid, medid, medicineName, dayCycle, foodReference, endDate, reminderTime, historyDate, historyTime, status) VALUES (?,?,?,?,?,?,?,?,?,?)");
				ps.setString(1, guid);
				ps.setInt(2, medid);
				ps.setString(3, medName);
				ps.setString(4, dayCycle);
				ps.setString(5, foodReference);
				ps.setString(6, endDate);
				ps.setString(7, reminderTime);
				ps.setString(8, today);
				ps.setString(9, statusTime);
				ps.setString(10, statusLabel);
				ps.executeUpdate();
			}
		} else if ("remove".equals(action)) {
			int medid;
			try {
				medid = Integer.parseInt(request.getParameter("medid"));
			} catch (NumberFormatException e) {
				response.sendRedirect("TrackerToday.jsp");
				return;
			}
			// Only delete the medicine if it belongs to this customer.
			ps = conn.prepareStatement("DELETE FROM medicines WHERE medid=? AND uid=?");
			ps.setInt(1, medid);
			ps.setString(2, guid);
			ps.executeUpdate();
		} else if ("reset".equals(action)) {
			// Only reset statuses for this customer's medicines.
			ps = conn.prepareStatement("DELETE FROM medicineStatus WHERE medid IN (SELECT medid FROM medicines WHERE uid=?) AND statusDate=?");
			ps.setString(1, guid);
			ps.setString(2, today);
			ps.executeUpdate();
		}
		response.sendRedirect("TrackerToday.jsp");
	} catch (Exception e) {
		out.println("error: " + esc(String.valueOf(e)));
	} finally {
		try { if (rs != null) rs.close(); } catch (Exception e) {}
		try { if (ps != null) ps.close(); } catch (Exception e) {}
		try { if (conn != null) conn.close(); } catch (Exception e) {}
	}
%>
