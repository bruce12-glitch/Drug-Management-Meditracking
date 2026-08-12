<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="ISO-8859-1" %>
<%!
	// ================================================================
	// MediTracker security helpers
	// - HTML escaping for JSP output
	// - JS string escaping for injected JS literals
	// - CSRF token generation and validation
	// - Input validation (time format, whitelist membership)
	// ================================================================

	public static String esc(String s) {
		if (s == null) return "";
		StringBuilder sb = new StringBuilder(s.length() + 16);
		for (int i = 0; i < s.length(); i++) {
			char c = s.charAt(i);
			switch (c) {
				case '&': sb.append('&').append("amp;"); break;
				case '<': sb.append('&').append("lt;"); break;
				case '>': sb.append('&').append("gt;"); break;
				case '"': sb.append('&').append("quot;"); break;
				case '\'': sb.append('&').append("#39;"); break;
				default: sb.append(c);
			}
		}
		return sb.toString();
	}

	public static String escJs(String s) {
		if (s == null) return "";
		StringBuilder sb = new StringBuilder(s.length() + 16);
		for (int i = 0; i < s.length(); i++) {
			char c = s.charAt(i);
			if (c == '\\') sb.append("\\\\");
			else if (c == '\'') sb.append("\\'");
			else if (c == '"') sb.append("\\\"");
			else if (c == '<') sb.append("\\u003c");
			else if (c == '>') sb.append("\\u003e");
			else if (c == '&') sb.append("\\u0026");
			else if (c == '\n') sb.append("\\n");
			else if (c == '\r') sb.append("\\r");
			else if (c == '\t') sb.append("\\t");
			else if (c < 32) sb.append(String.format("\\u%04x", (int) c));
			else sb.append(c);
		}
		return sb.toString();
	}

	public static String csrfToken(HttpSession session) {
		String token = (String) session.getAttribute("csrfToken");
		if (token == null) {
			token = java.util.UUID.randomUUID().toString();
			session.setAttribute("csrfToken", token);
		}
		return token;
	}

	public static boolean validCsrf(HttpSession session, String submitted) {
		if (submitted == null) return false;
		String token = (String) session.getAttribute("csrfToken");
		if (token == null) return false;
		return token.equals(submitted);
	}

	public static boolean isValidTime(String s) {
		if (s == null) return false;
		return s.matches("^([01][0-9]|2[0-3]):[0-5][0-9]$");
	}

	public static boolean isValidRemindBefore(String s) {
		if (s == null) return false;
		return s.equals("0") || s.equals("5") || s.equals("10") || s.equals("15");
	}

	public static boolean inList(String value, String... allowed) {
		if (value == null) return false;
		for (String a : allowed) {
			if (a.equals(value)) return true;
		}
		return false;
	}
%>
