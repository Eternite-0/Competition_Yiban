<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="ln" uri="http://lingnan.edu.cn/tags" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>赛事信息 - 高校赛事管理系统</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/style.css">
</head>
<body>
<div class="app">
    <jsp:include page="common/header.jsp"/>
    <main class="main">
        <div class="page-title">
            <div>
                <span class="eyebrow">Competition Table</span>
                <h1>赛事信息管理</h1>
                <p>查询数据库 competition 表中的全部赛事信息。</p>
            </div>
            <a class="btn primary" href="${pageContext.request.contextPath}/competitions?action=form">新增赛事</a>
        </div>

        <c:if test="${not empty error}">
            <div class="alert">${error}</div>
        </c:if>

        <%-- 赛事查询表单：Servlet 接收 keyword 后调用 service 层查询。 --%>
        <form class="toolbar" action="${pageContext.request.contextPath}/competitions" method="get">
            <input type="search" name="keyword" value="${keyword}" placeholder="按赛事名称、级别、类别或主办单位查询">
            <button class="btn" type="submit">查询</button>
            <a class="btn ghost" href="${pageContext.request.contextPath}/competitions">显示全部</a>
        </form>

        <%-- 赛事信息全表显示：每一行对应 competition 表中的一条记录。 --%>
        <section class="panel table-panel">
            <table>
                <thead>
                <tr>
                    <th>编号</th>
                    <th>赛事名称</th>
                    <th>级别</th>
                    <th>类别</th>
                    <th>主办单位</th>
                    <th>报名时间</th>
                    <th>人数</th>
                    <th>状态</th>
                    <th>简介</th>
                    <th>发布时间</th>
                    <th>操作</th>
                </tr>
                </thead>
                <tbody>
                <c:forEach items="${competitions}" var="competition">
                    <tr>
                        <td>${competition.id}</td>
                        <td class="strong-cell">${competition.name}</td>
                        <td>${competition.level}</td>
                        <td>${competition.category}</td>
                        <td>${competition.organizer}</td>
                        <td>${competition.startDate} 至 ${competition.endDate}</td>
                        <td>${competition.maxTeamSize}</td>
                        <td><ln:status value="${competition.status}"/></td>
                        <td class="desc-cell">${competition.description}</td>
                        <td><fmt:formatDate value="${competition.createTime}" pattern="yyyy-MM-dd HH:mm"/></td>
                        <td class="actions">
                            <a href="${pageContext.request.contextPath}/competitions?action=form&id=${competition.id}">修改</a>
                            <a class="danger-link" href="${pageContext.request.contextPath}/competitions?action=delete&id=${competition.id}"
                               onclick="return confirm('确定删除该赛事吗？')">删除</a>
                        </td>
                    </tr>
                </c:forEach>
                <c:if test="${empty competitions}">
                    <tr>
                        <td colspan="11" class="empty">暂无赛事数据</td>
                    </tr>
                </c:if>
                </tbody>
            </table>
        </section>
    </main>
</div>
</body>
</html>
