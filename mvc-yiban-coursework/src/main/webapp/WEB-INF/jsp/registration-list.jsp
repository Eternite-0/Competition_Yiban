<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="ln" uri="http://lingnan.edu.cn/tags" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>报名信息 - 高校赛事管理系统</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/style.css">
</head>
<body>
<div class="app">
    <jsp:include page="common/header.jsp"/>
    <main class="main">
        <div class="page-title">
            <div>
                <span class="eyebrow">Registration Table</span>
                <h1>报名信息管理</h1>
                <p>查询数据库 registration 表中的全部报名信息，并关联显示赛事和学生。</p>
            </div>
            <a class="btn primary" href="${pageContext.request.contextPath}/registrations?action=form">新增报名</a>
        </div>

        <c:if test="${not empty error}">
            <div class="alert">${error}</div>
        </c:if>

        <%-- 报名查询表单：可以按赛事、学生、团队或状态进行模糊查询。 --%>
        <form class="toolbar" action="${pageContext.request.contextPath}/registrations" method="get">
            <input type="search" name="keyword" value="${keyword}" placeholder="按赛事、学生、团队或状态查询">
            <button class="btn" type="submit">查询</button>
            <a class="btn ghost" href="${pageContext.request.contextPath}/registrations">显示全部</a>
        </form>

        <%-- 报名信息全表显示：DAO 使用 join 查询赛事名称和学生姓名。 --%>
        <section class="panel table-panel">
            <table>
                <thead>
                <tr>
                    <th>编号</th>
                    <th>赛事名称</th>
                    <th>学生</th>
                    <th>学号</th>
                    <th>团队名称</th>
                    <th>赛道</th>
                    <th>成员</th>
                    <th>状态</th>
                    <th>报名时间</th>
                    <th>审核意见</th>
                    <th>操作</th>
                </tr>
                </thead>
                <tbody>
                <c:forEach items="${registrations}" var="registration">
                    <tr>
                        <td>${registration.id}</td>
                        <td class="strong-cell">${registration.competitionName}</td>
                        <td>${registration.studentName}</td>
                        <td>${registration.username}</td>
                        <td>${registration.teamName}</td>
                        <td>${registration.track}</td>
                        <td>${registration.members}</td>
                        <td><ln:status value="${registration.status}"/></td>
                        <td><fmt:formatDate value="${registration.submitTime}" pattern="yyyy-MM-dd HH:mm"/></td>
                        <td>${registration.reviewNote}</td>
                        <td class="actions">
                            <a href="${pageContext.request.contextPath}/registrations?action=form&id=${registration.id}">修改</a>
                            <a class="danger-link" href="${pageContext.request.contextPath}/registrations?action=delete&id=${registration.id}"
                               onclick="return confirm('确定删除该报名记录吗？')">删除</a>
                        </td>
                    </tr>
                </c:forEach>
                <c:if test="${empty registrations}">
                    <tr>
                        <td colspan="11" class="empty">暂无报名数据</td>
                    </tr>
                </c:if>
                </tbody>
            </table>
        </section>
    </main>
</div>
</body>
</html>
