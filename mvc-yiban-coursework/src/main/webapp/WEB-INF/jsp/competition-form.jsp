<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>编辑赛事 - 高校赛事管理系统</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/style.css">
</head>
<body>
<div class="app">
    <jsp:include page="common/header.jsp"/>
    <main class="main">
        <div class="page-title">
            <div>
                <span class="eyebrow">Competition Form</span>
                <h1><c:choose><c:when test="${empty competition.id}">新增赛事</c:when><c:otherwise>修改赛事</c:otherwise></c:choose></h1>
            </div>
        </div>

        <c:if test="${not empty error}">
            <div class="alert">${error}</div>
        </c:if>

        <section class="panel">
            <form class="grid-form" action="${pageContext.request.contextPath}/competitions" method="post">
                <input type="hidden" name="id" value="${competition.id}">
                <label class="wide">赛事名称<input name="name" value="${competition.name}" required></label>
                <label>赛事级别
                    <select name="level" required>
                        <option value="国家级" ${competition.level == '国家级' ? 'selected' : ''}>国家级</option>
                        <option value="省级" ${competition.level == '省级' ? 'selected' : ''}>省级</option>
                        <option value="校级" ${empty competition.level || competition.level == '校级' ? 'selected' : ''}>校级</option>
                        <option value="院级" ${competition.level == '院级' ? 'selected' : ''}>院级</option>
                    </select>
                </label>
                <label>赛事类别<input name="category" value="${competition.category}" required></label>
                <label>主办单位<input name="organizer" value="${competition.organizer}" required></label>
                <label>开始日期<input type="date" name="startDate" value="${competition.startDate}" required></label>
                <label>截止日期<input type="date" name="endDate" value="${competition.endDate}" required></label>
                <label>最大人数<input type="number" min="1" name="maxTeamSize" value="${empty competition.maxTeamSize ? 1 : competition.maxTeamSize}" required></label>
                <label>状态
                    <select name="status">
                        <option value="报名中" ${empty competition.status || competition.status == '报名中' ? 'selected' : ''}>报名中</option>
                        <option value="筹备中" ${competition.status == '筹备中' ? 'selected' : ''}>筹备中</option>
                        <option value="已结束" ${competition.status == '已结束' ? 'selected' : ''}>已结束</option>
                    </select>
                </label>
                <label class="wide">赛事简介<textarea name="description" rows="4">${competition.description}</textarea></label>
                <div class="form-actions">
                    <button class="btn primary" type="submit">保存</button>
                    <a class="btn ghost" href="${pageContext.request.contextPath}/competitions">返回</a>
                </div>
            </form>
        </section>
    </main>
</div>
</body>
</html>
