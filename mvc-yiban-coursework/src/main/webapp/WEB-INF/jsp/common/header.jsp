<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<aside class="sidebar">
    <div class="brand">
        <div class="brand-mark">赛</div>
        <div>
            <strong>高校赛事管理系统</strong>
            <span>JSP MVC 课程作业</span>
        </div>
    </div>
    <nav class="nav">
        <a href="${pageContext.request.contextPath}/dashboard">系统首页</a>
        <a href="${pageContext.request.contextPath}/users">用户信息</a>
        <a href="${pageContext.request.contextPath}/competitions">赛事信息</a>
        <a href="${pageContext.request.contextPath}/registrations">报名信息</a>
    </nav>
    <div class="sidebar-footer">
        <span>${sessionScope.loginUser.realName}</span>
        <a href="${pageContext.request.contextPath}/login?action=logout">退出登录</a>
    </div>
</aside>
