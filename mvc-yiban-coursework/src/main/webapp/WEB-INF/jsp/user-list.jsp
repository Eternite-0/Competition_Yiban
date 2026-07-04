<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="ln" uri="http://lingnan.edu.cn/tags" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>用户信息 - 高校赛事管理系统</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/style.css">
</head>
<body>
<div class="app">
    <jsp:include page="common/header.jsp"/>
    <main class="main">
        <div class="page-title">
            <div>
                <span class="eyebrow">User Table</span>
                <h1>用户信息管理</h1>
                <p>查询数据库 user 表中的全部账号信息。</p>
            </div>
            <a class="btn primary" href="${pageContext.request.contextPath}/users?action=form">新增用户</a>
        </div>

        <c:if test="${not empty error}">
            <div class="alert">${error}</div>
        </c:if>

        <%-- 查询表单：keyword 参数传入 UserServlet，再由 service 和 dao 完成模糊查询。 --%>
        <form class="toolbar" action="${pageContext.request.contextPath}/users" method="get">
            <input type="search" name="keyword" value="${keyword}" placeholder="按账号、姓名、学院或专业查询">
            <button class="btn" type="submit">查询</button>
            <a class="btn ghost" href="${pageContext.request.contextPath}/users">显示全部</a>
        </form>

        <%-- 用户信息全表显示：JSTL 遍历 servlet 放入 request 域中的 users 集合。 --%>
        <section class="panel table-panel">
            <table>
                <thead>
                <tr>
                    <th>编号</th>
                    <th>账号</th>
                    <th>姓名</th>
                    <th>角色</th>
                    <th>学院</th>
                    <th>专业</th>
                    <th>班级</th>
                    <th>电话</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>操作</th>
                </tr>
                </thead>
                <tbody>
                <c:forEach items="${users}" var="user">
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.realName}</td>
                        <td>${user.role}</td>
                        <td>${user.college}</td>
                        <td>${user.major}</td>
                        <td>${user.className}</td>
                        <td>${user.phone}</td>
                        <td><ln:status value="${user.status}"/></td>
                        <td><fmt:formatDate value="${user.createTime}" pattern="yyyy-MM-dd HH:mm"/></td>
                        <td class="actions">
                            <a href="${pageContext.request.contextPath}/users?action=form&id=${user.id}">修改</a>
                            <a class="danger-link" href="${pageContext.request.contextPath}/users?action=delete&id=${user.id}"
                               onclick="return confirm('确定删除该用户吗？')">删除</a>
                        </td>
                    </tr>
                </c:forEach>
                <c:if test="${empty users}">
                    <tr>
                        <td colspan="11" class="empty">暂无用户数据</td>
                    </tr>
                </c:if>
                </tbody>
            </table>
        </section>
    </main>
</div>
</body>
</html>
