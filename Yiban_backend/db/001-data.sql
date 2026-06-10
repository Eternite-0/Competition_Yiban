USE `etsaion`;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 清理旧数据，保证重新导入时的干净状态
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `student_stage_progress`;
TRUNCATE TABLE `announcement`;
TRUNCATE TABLE `competition_stage`;
TRUNCATE TABLE `review_task`;
TRUNCATE TABLE `participation`;
TRUNCATE TABLE `activity`;
TRUNCATE TABLE `message`;
TRUNCATE TABLE `growth_record`;
TRUNCATE TABLE `submission_student`;
TRUNCATE TABLE `submission`;
TRUNCATE TABLE `team_application`;
TRUNCATE TABLE `team_post`;
TRUNCATE TABLE `registration`;
TRUNCATE TABLE `competition`;
TRUNCATE TABLE `activity_category`;
TRUNCATE TABLE `user`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------
-- 1. 用户表数据 (User)
-- ----------------------------
-- 密码均为: 123456
INSERT INTO `user` (`id`, `username`, `password`, `real_name`, `role`, `college`, `major`, `class_name`, `grade`) VALUES
-- 管理员
(1, 'admin', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '系统管理员', 'admin', '系统管理中心', NULL, NULL, NULL),
-- 教师
(2, 'teacher1', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '王老师', 'teacher', '计算机学院', NULL, NULL, NULL),
(3, 'teacher2', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '徐教授', 'teacher', '电子学院', NULL, NULL, NULL),
-- 学生组 - 计算机学院 - 2023级
(4, '20230101', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '张三', 'student', '计算机学院', '软件工程', '软工2301', '2023'),
(5, '20230102', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '李四', 'student', '计算机学院', '计算机科学与技术', '计科2302', '2023'),
(6, '20230103', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '王五', 'student', '计算机学院', '软件工程', '软工2301', '2023'),
(7, '20230104', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '赵六', 'student', '计算机学院', '人工智能', '智科2301', '2023'),
-- 学生组 - 计算机学院 - 2022级
(14, '20220101', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '郑十三', 'student', '计算机学院', '软件工程', '软工2201', '2022'),
(15, '20220102', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '冯十四', 'student', '计算机学院', '计算机科学与技术', '计科2201', '2022'),
-- 学生组 - 计算机学院 - 2024级
(16, '20240101', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '韩十五', 'student', '计算机学院', '软件工程', '软工2401', '2024'),
-- 学生组 - 电子学院 - 2023级
(8, '20230201', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '陈七', 'student', '电子学院', '电子信息工程', '电信2301', '2023'),
(9, '20230202', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '刘八', 'student', '电子学院', '通信工程', '通信2302', '2023'),
-- 学生组 - 电子学院 - 2022级
(17, '20220201', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '曹十六', 'student', '电子学院', '电子信息工程', '电信2201', '2022'),
-- 学生组 - 商学院 - 2023级
(10, '20230301', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '钱九', 'student', '商学院', '工商管理', '工商2301', '2023'),
(11, '20230302', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '孙十', 'student', '商学院', '市场营销', '营销2301', '2023'),
-- 学生组 - 设计学院 - 2023级
(12, '20230401', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '周十一', 'student', '设计学院', '工业设计', '工设2301', '2023'),
(13, '20230402', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '吴十二', 'student', '设计学院', '视觉传达设计', '视传2302', '2023'),
-- 学生组 - 设计学院 - 2024级
(18, '20240401', '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO', '孟十七', 'student', '设计学院', '视觉传达设计', '视传2401', '2024');

-- ----------------------------
-- 2. 活动分类字典表数据 (ActivityCategory)
-- ----------------------------
INSERT INTO `activity_category` (`type`, `code`, `name`, `icon`, `sort_order`, `status`) VALUES
('competition', 'A', '科技创新', 'psychology', 10, 'active'),
('competition', 'B', '商业创业', 'business_center', 20, 'active'),
('competition', 'C', '文化艺术', 'palette', 30, 'active'),
('competition', 'algorithm', '算法编程', 'code', 40, 'active'),
('competition', 'design', '设计创作', 'draw', 50, 'active'),
('volunteer', 'campus_service', '校园服务', 'volunteer_activism', 10, 'active'),
('volunteer', 'community', '社区公益', 'diversity_1', 20, 'active'),
('volunteer', 'event_support', '赛会保障', 'support_agent', 30, 'active'),
('other', 'lecture', '讲座培训', 'co_present', 10, 'active'),
('other', 'practice', '实践项目', 'fact_check', 20, 'active');

-- ----------------------------
-- 3. 赛事/竞赛表数据 (Competition)
-- ----------------------------
INSERT INTO `competition` (`id`, `name`, `level`, `category`, `start_time`, `end_time`, `competition_start`, `competition_end`, `max_team_size`, `cover_url`, `content`, `organizer`, `tags`, `status`) VALUES
(1, '第十届”互联网+”大学生创新创业大赛', '国家级', 'A', '2026-05-01 00:00:00', '2026-06-30 23:59:59', '2026-07-10 09:00:00', '2026-07-15 18:00:00', 5, NULL, '<p>旨在激发大学生创造力，培育具有双创精神的青年领袖，项目涵盖高教主赛道、”青年红色筑梦之旅”赛道等。</p>', '教育部高等教育司', '[“创新创业”,”双创”,”商业计划”]', 'published'),
(2, '2026年全国大学生电子设计竞赛', '国家级', 'B', '2026-06-01 00:00:00', '2026-07-20 23:59:59', '2026-08-01 08:00:00', '2026-08-04 20:00:00', 3, NULL, '<p>全国大学生电子设计竞赛是教育部倡导的大学生重要学科竞赛，重在考查硬件设计、模拟电路、数字系统与单片机编程等综合水平。</p>', '教育部高等教育司、工业和信息化部人事教育司', '[“电子设计”,”硬件”,”单片机”,”PCB”]', 'published'),
(3, '第十七届蓝桥杯全国软件和信息技术专业人才大赛', '国家级', 'A', '2026-09-01 00:00:00', '2026-11-30 23:59:59', '2026-12-15 09:00:00', '2026-12-15 13:00:00', 1, NULL, '<p>蓝桥杯全国软件和信息技术专业人才大赛是国内极具影响力的软件类个人程序设计大赛，涵盖Java、C++、Python及Web开发等多赛道。</p>', '工业和信息化部人才交流中心', '[“程序设计”,”算法”,”Java”,”C++”,”Python”]', 'published'),
(4, '2026年高教社杯全国大学生数学建模竞赛', '国家级', 'B', '2026-08-01 00:00:00', '2026-09-05 20:00:00', '2026-09-10 18:00:00', '2026-09-13 20:00:00', 3, NULL, '<p>全国大学生数学建模竞赛是考察学生数学建模、计算机编程以及学术论文写作综合能力的经典三人组队赛事。</p>', '中国工业与应用数学学会', '[“数学建模”,”MATLAB”,”Python”,”学术写作”]', 'published'),
(5, '第四届全国大学生艺术设计大奖赛', '国家级', 'C', '2026-04-15 00:00:00', '2026-06-15 23:59:59', '2026-06-25 09:00:00', '2026-06-28 18:00:00', 3, NULL, '<p>为优秀设计学子提供展现视觉传达、工业造型、数字化多媒体艺术水平的高水平创新设计竞赛。</p>', '中国艺术设计联合会', '[“艺术设计”,”UI”,”视觉”,”3D建模”]', 'published'),
(6, '易赛通”校内先拔杯”智能创意赛（草稿）', '校级', 'A', '2026-05-10 00:00:00', '2026-05-20 23:59:59', '2026-05-25 09:00:00', '2026-05-25 12:00:00', 3, NULL, '<p>仅作为校内智能软硬件创意的预选模拟草稿赛事，不计入国家级系统综测分。</p>', '校教务处与团委', '[“校内”,”选拔”,”创意”]', 'draft');

-- ----------------------------
-- 3. 赛事报名表数据 (Registration)
-- ----------------------------
INSERT INTO `registration` (`id`, `competition_id`, `student_id`, `team_name`, `status`, `submit_date`) VALUES
-- 互联网+ 报名（组队赛）
(1, 1, 4, '极客先锋队', '审核通过', '2026-05-10 14:32:01'),
(2, 1, 5, '极客先锋队', '审核通过', '2026-05-10 15:10:22'),
(3, 1, 6, '极客先锋队', '审核通过', '2026-05-10 15:30:11'),
(4, 1, 10, '领航商创队', '审核中', '2026-05-12 09:15:00'),
(5, 1, 11, '领航商创队', '审核中', '2026-05-12 10:22:30'),
-- 电子设计竞赛 报名（组队赛）
(6, 2, 8, '神威电控队', '审核通过', '2026-06-02 11:00:00'),
(7, 2, 9, '神威电控队', '审核通过', '2026-06-02 12:45:00'),
(8, 2, 4, '神威电控队', '审核通过', '2026-06-03 09:12:00'),
(9, 2, 5, '魔方算法组', '待完善', '2026-06-05 14:22:00'),
-- 蓝桥杯 报名（个人赛，无 team_name）
(10, 3, 4, NULL, '审核通过', '2026-05-20 10:15:00'),
(11, 3, 5, NULL, '审核通过', '2026-05-20 11:22:00'),
(12, 3, 6, NULL, '已提交', '2026-05-21 14:30:00'),
(13, 3, 7, NULL, '审核驳回', '2026-05-21 15:45:00'),
-- 数学建模 报名（组队赛）
(14, 4, 7, '天元建模组', '已提交', '2026-05-25 10:00:00'),
(15, 4, 5, '天元建模组', '已提交', '2026-05-25 11:30:00'),
-- 艺术设计大赛 报名
(16, 5, 12, '匠心视界队', '审核通过', '2026-05-15 08:30:00'),
(17, 5, 13, '匠心视界队', '审核通过', '2026-05-15 09:15:00'),
(18, 5, 6, '匠心视界队', '审核通过', '2026-05-15 10:02:00'),
-- 2022级学生报名
(19, 3, 14, NULL, '审核通过', '2026-05-18 09:00:00'),
(20, 3, 15, NULL, '审核通过', '2026-05-18 10:30:00'),
(21, 4, 14, '先锋建模组', '审核通过', '2026-05-26 08:00:00'),
(22, 4, 17, '电磁先锋组', '审核通过', '2026-05-26 09:00:00'),
-- 2024级学生报名
(23, 3, 16, NULL, '已提交', '2026-05-22 16:00:00'),
(24, 5, 18, '视界新星队', '审核中', '2026-05-20 14:00:00');

-- ----------------------------
-- 4. 组队大厅招募贴数据 (TeamPost)
-- ----------------------------
INSERT INTO `team_post` (`id`, `author_id`, `competition_id`, `content`, `roles_needed`, `date`, `status`) VALUES
(1, 4, 1, '组建“极客先锋队”，诚招UI设计同学和商科负责商业计划书的学生，打算冲刺互联网+国奖！', '["UI设计", "商务运营", "文案策划"]', '2026-05-09 10:00:00', '已满员'),
(2, 10, 1, '“领航商创队”招募开发同学，有完整的商业计划，急需一名熟悉 Spring Boot + Vue 的全栈工程师。', '["全栈开发", "前端工程师"]', '2026-05-11 11:00:00', '招募中'),
(3, 8, 2, '电赛组队“神威电控队”，寻找懂单片机算法编程的计算机学院同学，我们主打硬件小车方向。', '["嵌入式软件开发"]', '2026-06-01 09:30:00', '已满员'),
(4, 5, 2, '魔方算法组招募硬件工程师，希望你有熟练的PCB画板经验和模拟电路调试基础。', '["硬件研发工程师", "PCB测试员"]', '2026-06-04 15:00:00', '招募中'),
(7, 7, 4, '三人组队征战全国数学建模国赛，急需找一个擅长MATLAB/Python建模，或者一个擅长论文排版写作的队员！', '["建模工程师", "学术写作"]', '2026-05-24 16:30:00', '招募中'),
(8, 12, 5, '招募懂交互逻辑的学生合作参加艺术设计大赛，共同开发一套高校元宇宙虚拟展厅作品。', '["3D建模师", "交互体验师"]', '2026-05-14 08:00:00', '已满员'),
(9, 6, 6, '校内选拔草稿赛招募任意对硬软件感兴趣的同学，纯属练手积累经验，无门槛！', '["开发小白", "活跃气氛员"]', '2026-05-11 15:40:00', '招募中');

-- ----------------------------
-- 5. 组队申请数据 (TeamApplication)
-- ----------------------------
INSERT INTO `team_application` (`id`, `team_id`, `applicant_id`, `role`, `reason`, `status`) VALUES
-- 极客先锋队申请
(1, 1, 5, 'UI设计', '熟练掌握 Figma / AI，有多个完整上线前端界面交互设计经验。', 'approved'),
(2, 1, 6, '文案策划', '曾获校辩论赛最佳辩手，擅长撰写商业运营推介文案与PPT排版。', 'approved'),
-- 领航商创队申请
(3, 2, 4, '全栈开发', '熟悉 Spring Boot 和 Vue，有赛事管理系统实际开发经历。', 'pending'),
(4, 2, 7, '前端工程师', '熟悉 CSS 动画和 React / TS 开发，乐于协作。', 'pending'),
-- 神威电控队申请
(5, 3, 9, '嵌入式硬件', '电子学院骨干，熟练掌握STM32编程，熟悉串口通信。', 'approved'),
(6, 3, 4, '嵌入式软件开发', '计算机学院软工学子，有丰富的单片机逻辑与底层驱动调试能力。', 'approved'),
-- 匠心视界队申请
(7, 8, 13, '3D建模师', '视传设计骨干，精通 C4D 和 Blender 三维建模渲染。', 'approved'),
(8, 8, 6, '交互体验师', '对元宇宙及VR/AR交互有着深厚理论基础，可输出完整的交互流程图。', 'approved'),
(9, 8, 8, '3D建模师', '熟悉工业造型和犀牛建模。', 'rejected');

-- ----------------------------
-- 6. 成果/附件上传表数据 (Submission)
-- ----------------------------
INSERT INTO `submission` (`id`, `registration_id`, `file_name`, `file_url`, `file_size`, `upload_date`, `status`, `review_note`, `approved`, `displayed`) VALUES
-- 极客先锋队互联网+成果
(1, 1, '极客先锋队_互联网+商业策划书_V1.pdf', '/files/geek_pitch_v1.pdf', 2411724, '2026-05-15 10:00:00', '已审核', '项目非常有创意，商业变现逻辑清晰，财务预算稍显薄弱但瑕不掩瑜，准予通过！', 1, 1),
(2, 2, '李四_互联网+成果UI交互大图.zip', '/files/geek_ui_designs.zip', 45124000, '2026-05-15 10:15:00', '已审核', '界面精美，交互逻辑完整，是一套非常优秀的视觉稿。', 1, 1),
(3, 3, '王五_互联网+商业运营计划附件.docx', '/files/geek_operation_docs.docx', 124050, '2026-05-15 10:22:00', '已审核', '运营计划撰写非常充实。', 1, 0),
-- 神威电控队电赛成果
(4, 6, '神威电控队_电赛A题设计报告_初稿.pdf', '/files/shenwei_e-design_report.pdf', 3120540, '2026-06-03 14:00:00', '已审核', '电控分析非常到位，波形调校说明清晰。', 1, 1),
(5, 7, '刘八_电赛电磁部分PCB原理图.pdf', '/files/shenwei_pcb_schematic.pdf', 524050, '2026-06-03 14:30:00', '已审核', '布线合理，抗干扰处理得当。', 1, 0),
-- 蓝桥杯个人成果
(6, 10, '张三_第十七届蓝桥杯软件JavaA组省一等奖证书.jpg', '/files/cert_lanqiao_zhangsan.jpg', 840500, '2026-05-22 09:00:00', '已审核', '证书核验真实，系统已自动录入成长雷达编程能力加分！', 1, 1),
(7, 11, '李四_第十七届蓝桥杯软件JavaA组省二等奖证书.jpg', '/files/cert_lanqiao_lisi.jpg', 831200, '2026-05-22 09:45:00', '已审核', '审核通过，已累加综测分数。', 1, 0),
(8, 12, '王五_蓝桥杯参赛证明与源码附件.zip', '/files/lanqiao_wangwu_source.zip', 1400250, '2026-05-24 16:00:00', '待审核', NULL, NULL, 0),
-- 数学建模成果
(9, 14, '天元建模队_数学建模国赛B题论文.pdf', '/files/tianyuan_mcm_paper.pdf', 1980450, '2026-05-25 12:00:00', '待审核', NULL, NULL, 0),
-- 艺术设计成果
(10, 16, '匠心视界队_艺术设计元宇宙展厅作品包.zip', '/files/art_design_metaverse.zip', 98450120, '2026-05-16 09:00:00', '已审核', '设计非常大气，视觉震撼力很强，结合了元宇宙热点，完成度极高。', 1, 1),
(11, 17, '吴十二_艺术设计大奖赛UI规范手册.pdf', '/files/art_design_ui_manual.pdf', 8450230, '2026-05-16 09:30:00', '已审核', '设计规范，标准色与字体体系科学合理。', 1, 0);

-- ----------------------------
-- 7. 成长记录表数据 (GrowthRecord)
-- ----------------------------
INSERT INTO `growth_record` (`id`, `student_id`, `competition_id`, `record_type`, `title`, `happen_time`) VALUES
-- 张三 (studentId = 4)
(1, 4, 1, 'competition', '在 第十届“互联网+”大学生创新创业大赛 中完成了赛事报名', '2026-05-10 14:32:01'),
(2, 4, 1, 'award', '在“第十届“互联网+”大学生创新创业大赛”中提交的成果《极客先锋队_商业计划书》审核通过', '2026-05-15 11:00:00'),
(3, 4, 3, 'competition', '在 第十七届蓝桥杯全国软件和信息技术专业人才大赛 中完成了赛事报名', '2026-05-20 10:15:00'),
(4, 4, 3, 'award', '在 第十七届蓝桥杯全国软件和信息技术专业人才大赛 中荣获 省一等奖 并成功核验证书', '2026-05-22 09:00:00'),
(5, 4, 2, 'competition', '在 2026年全国大学生电子设计竞赛 中完成了赛事报名并审核通过', '2026-06-03 09:12:00'),
-- 李四 (studentId = 5)
(6, 5, 1, 'competition', '在 第十届“互联网+”大学生创新创业大赛 中完成了赛事报名', '2026-05-10 15:10:22'),
(7, 5, 1, 'award', '在“第十届“互联网+”大学生创新创业大赛”中提交的《UI交互作品包》审核通过', '2026-05-15 11:15:00'),
(8, 5, 3, 'competition', '在 第十七届蓝桥杯全国软件和信息技术专业人才大赛 中完成了赛事报名', '2026-05-20 11:22:00'),
(9, 5, 3, 'award', '在 第十七届蓝桥杯全国软件和信息技术专业人才大赛 中荣获 省二等奖 并核验通过', '2026-05-22 09:45:00'),
-- 陈七 (studentId = 8)
(10, 8, 2, 'competition', '在 2026年全国大学生电子设计竞赛 中完成了赛事组队报名与审核', '2026-06-02 11:00:00'),
(11, 8, 2, 'award', '在 2026年全国大学生电子设计竞赛 中提交的硬件控制电路方案通过评审', '2026-06-03 14:00:00'),
-- 周十一 (studentId = 12)
(12, 12, 5, 'competition', '在 第四届全国大学生艺术设计大奖赛 中完成了赛事报名与组队审核', '2026-05-15 08:30:00'),
(13, 12, 5, 'award', '在 第四届全国大学生艺术设计大奖赛 中提交的作品《匠心视界元宇宙展厅》获得极高评审通过', '2026-05-16 09:00:00');

-- ----------------------------
-- 8. 系统站内消息通知表数据 (Message)
-- ----------------------------
INSERT INTO `message` (`id`, `from_user`, `to_user`, `title`, `content`, `is_read`, `create_time`) VALUES
-- 张三的收件箱
(1, 0, 4, '系统欢迎信', '欢迎加入“易赛通”高校赛事服务平台！您在这里可以管理自己的完整参赛全生命周期。', 1, '2026-05-01 08:00:00'),
(2, 0, 4, '赛事报名通过通知', '恭喜！您在“第十届“互联网+”大学生创新创业大赛”的报名申请已审核通过！', 1, '2026-05-10 14:32:01'),
(3, 0, 4, '收到新的组队入队申请', '学生“李四”申请加入您的队伍“极客先锋队”担当角色【UI设计】，请前往您的队长控制台进行审核审批。', 1, '2026-05-10 15:00:00'),
(4, 0, 4, '成果附件审核通过', '恭喜！您提交的“第十届“互联网+”大学生创新创业大赛”成果文件《极客先锋队_商业策划书_V1.pdf》已被王老师审核通过，评语：项目非常有创意，商业变现逻辑清晰，财务预算稍显薄弱但瑕不掩瑜，准予通过！', 0, '2026-05-15 11:00:00'),
(5, 0, 4, '赛事报名通过通知', '恭喜！您在“第十七届蓝桥杯全国软件和信息技术专业人才大赛”的报名申请已审核通过！', 1, '2026-05-20 10:15:00'),
(6, 0, 4, '蓝桥杯获奖成果核验成功', '恭喜！您上传的“第十七届蓝桥杯”省一等奖证书已通过教师人工核验！综测能力编程项已加分。', 0, '2026-05-22 09:00:00'),
(7, 0, 4, '赛事报名通过通知', '恭喜！您在“2026年全国大学生电子设计竞赛”的组队报名申请已审核通过！', 0, '2026-06-03 09:12:00'),
-- 李四的收件箱
(8, 0, 5, '组队申请通过通知', '恭喜！您加入“张三”创建的“极客先锋队”的申请已通过！您在队伍中扮演的角色是“UI设计”。', 1, '2026-05-10 15:10:22'),
(9, 0, 5, '赛事自动同步通过通知', '由于您的队长张三已审核通过报名，系统已自动同步您在“第十届“互联网+”大学生创新创业大赛”的报名状态为：审核通过！', 1, '2026-05-10 15:20:00'),
(10, 0, 5, '成果附件审核通过', '恭喜！您提交的“第十届“互联网+”大学生创新创业大赛”成果文件《李四_互联网+成果UI交互大图.zip》已通过审核。评语：界面精美，交互逻辑完整。', 0, '2026-05-15 11:15:00'),
(11, 0, 5, '蓝桥杯获奖成果核验成功', '恭喜！您上传的“第十七届蓝桥杯”省二等奖证书已核验通过！', 0, '2026-05-22 09:45:00'),
-- 陈七的收件箱
(12, 0, 8, '收到新的组队入队申请', '学生“刘八”申请加入您的电赛队伍，担当角色【嵌入式硬件】，请前往队长端处理。', 1, '2026-06-02 12:00:00'),
(13, 0, 8, '电赛成果物理原理图通过评审', '王老师及徐教授已审核通过您的原理图设计成果附件，并给予高度评价。', 0, '2026-06-03 14:00:00');

-- ----------------------------
-- 9. 系统公告数据 (Announcement)
-- ----------------------------
INSERT INTO `announcement` (`competition_id`, `title`, `content`, `author_id`, `type`, `is_pinned`, `status`) VALUES
(NULL, '2026春季学期赛事安排', '本学期共有6项赛事开放报名，请关注赛事大厅。', 1, 'system', 1, 'published'),
(NULL, '综测加分政策', '每次报名+2分，获奖+15分。详情咨询辅导员。', 1, 'system', 0, 'published');

-- ----------------------------
-- 10. 审核待办回填 (ReviewTask backfill)
--    从 registration 和 submission 数据生成统一待办，幂等安全
-- ----------------------------
INSERT IGNORE INTO `review_task`
  (`activity_type`, `activity_id`, `target_type`, `target_id`, `submitter_id`,
   `title`, `status`, `deadline`, `payload_json`, `create_time`, `update_time`)
SELECT
  'competition', r.competition_id, 'registration', r.id, r.student_id,
  CONCAT('赛事报名审核：', IFNULL(c.name, '未知赛事')),
  IF(r.status IN ('已提交', '审核中'), 'pending', 'resolved'),
  c.end_time,
  JSON_OBJECT('competitionName', IFNULL(c.name, ''), 'teamName', IFNULL(r.team_name, ''), 'track', IFNULL(r.track, '')),
  IFNULL(r.submit_date, NOW()), IFNULL(r.submit_date, NOW())
FROM `registration` r
LEFT JOIN `competition` c ON c.id = r.competition_id;

INSERT IGNORE INTO `review_task`
  (`activity_type`, `activity_id`, `target_type`, `target_id`, `submitter_id`,
   `title`, `status`, `deadline`, `payload_json`, `create_time`, `update_time`)
SELECT
  'competition', COALESCE(s.competition_id, r.competition_id),
  'submission', s.id, s.submitter_id,
  CONCAT('成果审核：', IFNULL(c.name, '未知赛事')),
  IF(s.status = '待审核', 'pending', 'resolved'),
  c.competition_end,
  JSON_OBJECT('competitionName', IFNULL(c.name, ''), 'fileName', IFNULL(s.file_name, ''), 'registrationId', s.registration_id),
  IFNULL(s.upload_date, NOW()), IFNULL(s.upload_date, NOW())
FROM `submission` s
LEFT JOIN `registration` r ON r.id = s.registration_id
LEFT JOIN `competition` c ON c.id = COALESCE(s.competition_id, r.competition_id);
