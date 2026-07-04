<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>高校赛事管理系统 - 登录</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/style.css">
</head>
<body class="login-body">
<main class="login-shell">
    <%-- 登录表单：提交到 LoginServlet，由 service 层完成账号密码校验。 --%>
    <section class="login-card">
        <h2>高校赛事管理系统</h2>
        <p>测试账号：admin / 123456</p>
        <c:if test="${not empty error}">
            <div class="alert">${error}</div>
        </c:if>
        <form action="${pageContext.request.contextPath}/login" method="post">
            <label>
                用户名
                <input type="text" name="username" placeholder="请输入用户名" required>
            </label>
            <label>
                密码
                <input type="password" name="password" placeholder="请输入密码" required>
            </label>
            <button type="submit">登录系统</button>
        </form>
    </section>
</main>
</body>
</html>
