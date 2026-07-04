<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>系统首页 - 高校赛事管理系统</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/style.css">
</head>
<body>
<div class="app">
    <jsp:include page="common/header.jsp"/>
    <main class="main">
        <div class="page-title">
            <div>
                <span class="eyebrow">Dashboard</span>
                <h1>系统首页</h1>
                <p>欢迎使用高校赛事管理系统，当前登录用户：${sessionScope.loginUser.realName}</p>
            </div>
        </div>

        <section class="stats-grid">
            <a class="stat-card" href="${pageContext.request.contextPath}/users">
                <span>用户总数</span>
                <strong>${userCount}</strong>
                <em>查看用户信息表</em>
            </a>
            <a class="stat-card" href="${pageContext.request.contextPath}/competitions">
                <span>赛事总数</span>
                <strong>${competitionCount}</strong>
                <em>查看赛事信息表</em>
            </a>
            <a class="stat-card" href="${pageContext.request.contextPath}/registrations">
                <span>报名总数</span>
                <strong>${registrationCount}</strong>
                <em>查看报名信息表</em>
            </a>
        </section>

        <section class="panel">
            <h2>系统简介</h2>
            <p>
                本系统采用 MVC 设计思想：JSP 负责页面展示，Servlet 负责请求转发和参数接收，
                Service 负责业务逻辑处理，DAO 负责访问 MySQL 数据库，POJO 用于封装表数据，
                Util 提供通用工具，Tag 提供页面状态标签复用。
            </p>
        </section>
    </main>
</div>
</body>
</html>
