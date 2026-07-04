CREATE DATABASE IF NOT EXISTS yiban_mvc
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE yiban_mvc;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS registration;
DROP TABLE IF EXISTS competition;
DROP TABLE IF EXISTS user;

CREATE TABLE user (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户编号',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '登录账号',
  password VARCHAR(64) NOT NULL COMMENT '登录密码，课程演示中使用明文',
  real_name VARCHAR(50) NOT NULL COMMENT '真实姓名',
  role VARCHAR(20) NOT NULL COMMENT '角色：admin/teacher/student',
  college VARCHAR(100) COMMENT '学院',
  major VARCHAR(100) COMMENT '专业',
  class_name VARCHAR(50) COMMENT '班级',
  phone VARCHAR(30) COMMENT '联系电话',
  status VARCHAR(20) NOT NULL DEFAULT '正常' COMMENT '账号状态',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户信息表';

CREATE TABLE competition (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '赛事编号',
  name VARCHAR(120) NOT NULL COMMENT '赛事名称',
  level VARCHAR(30) NOT NULL COMMENT '赛事级别',
  category VARCHAR(50) NOT NULL COMMENT '赛事类别',
  organizer VARCHAR(120) NOT NULL COMMENT '主办单位',
  start_date DATE NOT NULL COMMENT '报名开始日期',
  end_date DATE NOT NULL COMMENT '报名截止日期',
  max_team_size INT NOT NULL DEFAULT 1 COMMENT '最大组队人数',
  status VARCHAR(20) NOT NULL DEFAULT '报名中' COMMENT '赛事状态',
  description VARCHAR(500) COMMENT '赛事简介',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='赛事信息表';

CREATE TABLE registration (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '报名编号',
  competition_id INT NOT NULL COMMENT '赛事编号',
  student_id INT NOT NULL COMMENT '学生编号',
  team_name VARCHAR(80) COMMENT '团队名称',
  track VARCHAR(80) COMMENT '参赛赛道',
  members VARCHAR(255) COMMENT '团队成员',
  status VARCHAR(20) NOT NULL DEFAULT '待审核' COMMENT '报名状态',
  submit_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
  review_note VARCHAR(255) COMMENT '审核意见',
  CONSTRAINT fk_registration_competition
    FOREIGN KEY (competition_id) REFERENCES competition(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_registration_student
    FOREIGN KEY (student_id) REFERENCES user(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='赛事报名表';

INSERT INTO user (username, password, real_name, role, college, major, class_name, phone, status) VALUES
('admin', '123456', '系统管理员', 'admin', '信息工程学院', '软件工程', '管理员组', '13800000001', '正常'),
('teacher01', '123456', '李老师', 'teacher', '信息工程学院', '软件工程', '教师组', '13800000002', '正常'),
('20240101', '123456', '张明', 'student', '信息工程学院', '软件工程', '软件2401', '13800000003', '正常'),
('20240102', '123456', '陈雨', 'student', '信息工程学院', '网络工程', '网络2401', '13800000004', '正常'),
('20240103', '123456', '王浩', 'student', '信息工程学院', '人工智能', '智能2401', '13800000005', '正常');

INSERT INTO competition (name, level, category, organizer, start_date, end_date, max_team_size, status, description) VALUES
('蓝桥杯全国软件和信息技术专业人才大赛', '国家级', '程序设计', '工业和信息化部人才交流中心', '2026-03-01', '2026-04-15', 1, '报名中', '面向高校学生的程序设计与软件能力竞赛。'),
('中国国际大学生创新大赛', '国家级', '创新创业', '教育部', '2026-04-10', '2026-06-30', 8, '报名中', '鼓励大学生围绕科技创新、商业模式和社会价值开展项目实践。'),
('校级 Web 应用开发大赛', '校级', '软件开发', '信息工程学院', '2026-05-01', '2026-06-20', 5, '报名中', '以 Java Web、数据库和前端页面为核心的应用开发竞赛。'),
('人工智能应用创意赛', '省级', '人工智能', '广东省计算机教育委员会', '2026-06-01', '2026-07-10', 4, '筹备中', '围绕 AI 助手、智能识别、数据分析等方向开展作品设计。');

INSERT INTO registration (competition_id, student_id, team_name, track, members, status, review_note) VALUES
(1, 3, '算法冲刺队', 'Java 程序设计', '张明', '审核通过', '报名信息完整。'),
(2, 4, '星火创新队', '主赛道', '陈雨、王浩', '待审核', '等待指导老师审核。'),
(3, 3, '易赛通开发组', 'Web 应用开发', '张明、陈雨', '退回修改', '请补充项目简介。'),
(4, 5, 'AI 探索小组', '智能应用', '王浩', '待审核', '等待材料复核。');

SET FOREIGN_KEY_CHECKS = 1;
