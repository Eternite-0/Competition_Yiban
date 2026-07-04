<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>编辑用户 - 高校赛事管理系统</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/assets/css/style.css">
</head>
<body>
<div class="app">
    <jsp:include page="common/header.jsp"/>
    <main class="main">
        <div class="page-title">
            <div>
                <span class="eyebrow">User Form</span>
                <h1><c:choose><c:when test="${empty user.id}">新增用户</c:when><c:otherwise>修改用户</c:otherwise></c:choose></h1>
            </div>
        </div>

        <c:if test="${not empty error}">
            <div class="alert">${error}</div>
        </c:if>

        <section class="panel">
            <form class="grid-form" action="${pageContext.request.contextPath}/users" method="post">
                <input type="hidden" name="id" value="${user.id}">
                <label>登录账号<input name="username" value="${user.username}" required></label>
                <label>登录密码<input name="password" value="${user.password}" placeholder="默认 123456"></label>
                <label>真实姓名<input name="realName" value="${user.realName}" required></label>
                <label>角色
                    <select name="role" required>
                        <option value="admin" ${user.role == 'admin' ? 'selected' : ''}>管理员</option>
                        <option value="teacher" ${user.role == 'teacher' ? 'selected' : ''}>教师</option>
                        <option value="student" ${empty user.role || user.role == 'student' ? 'selected' : ''}>学生</option>
                    </select>
                </label>
                <label>学院<input name="college" value="${user.college}"></label>
                <label>专业<input name="major" value="${user.major}"></label>
                <label>班级<input name="className" value="${user.className}"></label>
                <label>联系电话<input name="phone" value="${user.phone}"></label>
                <label>状态
                    <select name="status">
                        <option value="正常" ${empty user.status || user.status == '正常' ? 'selected' : ''}>正常</option>
                        <option value="禁用" ${user.status == '禁用' ? 'selected' : ''}>禁用</option>
                    </select>
                </label>
                <div class="form-actions">
                    <button class="btn primary" type="submit">保存</button>
                    <a class="btn ghost" href="${pageContext.request.contextPath}/users">返回</a>
                </div>
            </form>
        </section>
    </main>
</div>
</body>
</html>
