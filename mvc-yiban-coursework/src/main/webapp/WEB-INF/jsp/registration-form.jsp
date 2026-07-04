<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>编辑报名 - 高校赛事管理系统</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/style.css">
</head>
<body>
<div class="app">
    <jsp:include page="common/header.jsp"/>
    <main class="main">
        <div class="page-title">
            <div>
                <span class="eyebrow">Registration Form</span>
                <h1><c:choose><c:when test="${empty registration.id}">新增报名</c:when><c:otherwise>修改报名</c:otherwise></c:choose></h1>
            </div>
        </div>

        <c:if test="${not empty error}">
            <div class="alert">${error}</div>
        </c:if>

        <section class="panel">
            <form class="grid-form" action="${pageContext.request.contextPath}/registrations" method="post">
                <input type="hidden" name="id" value="${registration.id}">
                <label>所属赛事
                    <select name="competitionId" required>
                        <c:forEach items="${competitions}" var="competition">
                            <option value="${competition.id}" ${registration.competitionId == competition.id ? 'selected' : ''}>
                                    ${competition.name}
                            </option>
                        </c:forEach>
                    </select>
                </label>
                <label>报名学生
                    <select name="studentId" required>
                        <c:forEach items="${students}" var="student">
                            <option value="${student.id}" ${registration.studentId == student.id ? 'selected' : ''}>
                                    ${student.realName}（${student.username}）
                            </option>
                        </c:forEach>
                    </select>
                </label>
                <label>团队名称<input name="teamName" value="${registration.teamName}"></label>
                <label>参赛赛道<input name="track" value="${registration.track}"></label>
                <label class="wide">团队成员<input name="members" value="${registration.members}" placeholder="多个成员用顿号分隔"></label>
                <label>审核状态
                    <select name="status">
                        <option value="待审核" ${empty registration.status || registration.status == '待审核' ? 'selected' : ''}>待审核</option>
                        <option value="审核通过" ${registration.status == '审核通过' ? 'selected' : ''}>审核通过</option>
                        <option value="退回修改" ${registration.status == '退回修改' ? 'selected' : ''}>退回修改</option>
                        <option value="审核拒绝" ${registration.status == '审核拒绝' ? 'selected' : ''}>审核拒绝</option>
                    </select>
                </label>
                <label class="wide">审核意见<textarea name="reviewNote" rows="4">${registration.reviewNote}</textarea></label>
                <div class="form-actions">
                    <button class="btn primary" type="submit">保存</button>
                    <a class="btn ghost" href="${pageContext.request.contextPath}/registrations">返回</a>
                </div>
            </form>
        </section>
    </main>
</div>
</body>
</html>
