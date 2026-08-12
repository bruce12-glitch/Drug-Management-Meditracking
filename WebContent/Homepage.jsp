<%@ page language="java" contentType="text/html; charset=ISO-8859-1"
    pageEncoding="ISO-8859-1"%>
<%@ include file="WEB-INF/security.jsp" %>
<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Home Page</title>
<link rel="stylesheet" href="css/Homepage.css">
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
				<a href="Homepage.jsp">HOME</a>
				<a href="Buy.jsp">BUY</a>
				<a href="Orders.jsp">ORDERS</a>
				<a href="TrackerDashboard.jsp">MEDITRACKER</a>
			</div>
		</div>
	</div>
</div>
<div class="active">
	<%@ page import="java.sql.*" %>
	<%@ page import="javax.sql.*" %>

	<%
	HttpSession httpSession = request.getSession();
    String guid=(String)httpSession.getAttribute("currentuser");
    String userType=(String)httpSession.getAttribute("currentusertype");
    if(guid == null || !"1".equals(userType)) {
    	response.sendRedirect("Login.html");
    	return;
    }
    %>

    <div class="filler"></div>
    <h2>Welcome <%= esc(guid) %></h2>

    <%
	ResultSet rs=null;
	PreparedStatement ps=null;
	java.sql.Connection conn=null;
	String query="select fname,uid,address,phno,email from customer where uid=?";
	try{
		Class.forName("com.mysql.jdbc.Driver");
		conn=DriverManager.getConnection("jdbc:mysql://mysql:3306/drugdatabase","root","1234");
		ps=conn.prepareStatement(query);
		ps.setString(1,guid);
		rs=ps.executeQuery();
		if(rs.next())
		{

		%>
		<div class="filler2"></div>
			<div class="card">
  				<img src="images/User.png" class="Avatar" width=234 height=234>
  				<div class="container">
    			 <div class="space1"><b><%= esc(rs.getString("fname")) %></b></div>
    			 <div class="filler3"></div>
   					<div class="space"><b>ID: </b><%= esc(rs.getString("uid")) %></div>
   					<div class="space"><b>Address: </b><%= esc(rs.getString("address")) %></div>
   					<div class="space"><b>Phone: </b><%= esc(rs.getString("phno")) %></div>
   					<div class="space"><b>Email: </b><%= esc(rs.getString("email")) %></div>
  				</div>
			</div>
		<%

		}
	}
	catch(Exception e)
	{
		out.println("error: "+esc(String.valueOf(e)));
	}
	finally {
	    try { if (rs != null) rs.close(); } catch (Exception e) {};
	    try { if (ps != null) ps.close(); } catch (Exception e) {};
	    try { if (conn != null) conn.close(); } catch (Exception e) {};
	}
	%>

</div>
</body>
</html>
