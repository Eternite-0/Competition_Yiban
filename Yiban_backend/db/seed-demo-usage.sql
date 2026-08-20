-- 本地演示数据：让赛事、报名、组队、审核、成果、成长和消息形成一条完整链路。
-- 可重复执行：每条新增记录都按稳定业务键去重；不会创建新用户或修改密码。
-- 执行示例（PowerShell，显式 UTF-8 管道以保持中文内容）：
-- $env:MYSQL_PWD='root'
-- $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
-- Get-Content -Raw -Encoding UTF8 .\Yiban_backend\db\seed-demo-usage.sql |
--   & 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' --no-defaults --protocol=TCP -h 127.0.0.1 -P 3307 -u root --default-character-set=utf8mb4 etsaion

SET NAMES utf8mb4;
START TRANSACTION;

-- 1. 修复明显的基础测试痕迹，并让已经结束的赛事不再显示为“进行中”。
UPDATE competition
SET status = 'closed'
WHERE id IN (1, 2, 5)
  AND status = 'published'
  AND end_time < '2026-08-02 00:00:00';

-- 2. 增加不同级别、不同赛道、不同时间状态的赛事。
INSERT INTO competition
  (name, level, category, start_time, end_time, competition_start, competition_end,
   max_team_size, content, organizer, tags, tracks, status)
SELECT '2026年校级人工智能应用创新挑战赛', '校级', 'A',
       '2026-07-25 09:00:00', '2026-08-22 23:59:59', '2026-08-30 09:00:00', '2026-09-06 18:00:00',
       4, '面向校园真实场景，鼓励学生使用人工智能技术完成可落地的应用原型。', '创新创业学院',
       '["人工智能","应用开发","创新实践"]', '["智能体应用","视觉识别","数据分析"]', 'published'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM competition WHERE name = '2026年校级人工智能应用创新挑战赛');

INSERT INTO competition
  (name, level, category, start_time, end_time, competition_start, competition_end,
   max_team_size, content, organizer, tags, tracks, status)
SELECT '2026年广东省大学生工业设计大赛', '省级', 'C',
       '2026-08-01 09:00:00', '2026-09-08 23:59:59', '2026-09-20 09:00:00', '2026-10-18 18:00:00',
       5, '围绕可持续生活、智能制造和公共服务开展产品与视觉设计创新。', '广东省教育厅',
       '["工业设计","产品创新","可持续设计"]', '["产品设计","视觉传达","服务设计"]', 'published'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM competition WHERE name = '2026年广东省大学生工业设计大赛');

INSERT INTO competition
  (name, level, category, start_time, end_time, competition_start, competition_end,
   max_team_size, content, organizer, tags, tracks, status)
SELECT '2026年大学生市场调查与分析大赛校赛', '校级', 'B',
       '2026-07-20 09:00:00', '2026-09-20 23:59:59', '2026-09-27 09:00:00', '2026-10-10 18:00:00',
       4, '以校园消费、数字生活和青年发展为主题，完成调研、分析与方案展示。', '经济管理学院',
       '["市场调研","商业分析","社会实践"]', '["问卷研究","数据分析","商业策划"]', 'published'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM competition WHERE name = '2026年大学生市场调查与分析大赛校赛');

INSERT INTO competition
  (name, level, category, start_time, end_time, competition_start, competition_end,
   max_team_size, content, organizer, tags, tracks, status)
SELECT '第九届校园程序设计挑战赛', '校级', 'A',
       '2026-08-05 09:00:00', '2026-08-28 23:59:59', '2026-08-30 13:00:00', '2026-08-30 18:00:00',
       3, '面向全校学生的算法与工程能力挑战，设置算法、Web 和数据应用三个方向。', '计算机与人工智能学院',
       '["算法","编程","工程实践"]', '["算法赛道","Web应用","数据工程"]', 'published'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM competition WHERE name = '第九届校园程序设计挑战赛');

-- V1 baseline 固定的三场历史赛事使用稳定 ID，避免客户端编码差异影响关联。
SET @c_innovation := 1;
SET @c_math := 4;
SET @c_ai := (SELECT id FROM competition WHERE name = '2026年校级人工智能应用创新挑战赛' LIMIT 1);
SET @c_design := (SELECT id FROM competition WHERE name = '2026年广东省大学生工业设计大赛' LIMIT 1);
SET @c_market := (SELECT id FROM competition WHERE name = '2026年大学生市场调查与分析大赛校赛' LIMIT 1);
SET @c_code := (SELECT id FROM competition WHERE name = '第九届校园程序设计挑战赛' LIMIT 1);
SET @c_art := 5;

-- 3. 将旧的 smoke-test 活动改为可展示的校园活动，后续参与记录会进入成长画像。
UPDATE activity
SET type = 'volunteer', title = '2026年迎新志愿服务', level = '校级', category = 'volunteer',
    organizer = '校团委志愿服务中心', start_time = '2026-08-10 09:00:00', end_time = '2026-08-20 18:00:00',
    activity_start = '2026-08-23 08:00:00', activity_end = '2026-08-24 18:00:00', max_team_size = 1,
    max_participants = 80, content = '协助新生报到、校园引导和物资发放。',
    tags = '["迎新","志愿服务"]', tracks = '["校园引导","物资发放"]', location = '图书馆南广场',
    service_hours = 6.00, status = 'published', config_json = '{"checkinRequired":true}'
WHERE id = 1;

UPDATE activity
SET type = 'volunteer', title = '校园科技文化节志愿者招募', level = '校级', category = 'service',
    organizer = '学生工作处', start_time = '2026-08-01 09:00:00', end_time = '2026-08-16 18:00:00',
    activity_start = '2026-08-22 09:00:00', activity_end = '2026-08-24 18:00:00', max_team_size = 1,
    max_participants = 50, content = '承担活动签到、展区引导和秩序维护。',
    tags = '["科技文化节","志愿服务"]', tracks = '["展区引导","签到服务"]', location = '大学生活动中心',
    service_hours = 4.00, status = 'published', config_json = '{"checkinRequired":true}'
WHERE id = 2;

UPDATE activity
SET type = 'volunteer', title = '“挑战杯”校赛会务服务', level = '校级', category = 'service',
    organizer = '创新创业学院', start_time = '2026-08-05 09:00:00', end_time = '2026-08-25 18:00:00',
    activity_start = '2026-08-29 08:00:00', activity_end = '2026-08-30 18:00:00', max_team_size = 1,
    max_participants = 35, content = '协助项目答辩签到、现场引导和设备保障。',
    tags = '["挑战杯","会务服务"]', tracks = '["答辩签到","现场引导","设备保障"]', location = '创新创业中心',
    service_hours = 5.00, status = 'published', config_json = '{"checkinRequired":true}'
WHERE id = 3;

UPDATE activity
SET type = 'culture_sports', title = '2026年校园篮球联赛', level = '校级', category = 'sports',
    organizer = '体育教学部', start_time = '2026-08-01 09:00:00', end_time = '2026-08-18 18:00:00',
    activity_start = '2026-08-22 18:30:00', activity_end = '2026-09-12 21:00:00', max_team_size = 12,
    max_participants = 120, content = '学院代表队联赛，包含小组赛和淘汰赛。',
    tags = '["篮球","体育竞赛"]', tracks = '["男子组","女子组"]', location = '风雨篮球场',
    service_hours = NULL, status = 'published', config_json = '{"checkinRequired":false}'
WHERE id = 4;

UPDATE activity
SET type = 'culture_sports', title = '校园原创设计作品展', level = '校级', category = 'culture',
    organizer = '艺术设计学院', start_time = '2026-08-12 09:00:00', end_time = '2026-08-31 18:00:00',
    activity_start = '2026-09-08 09:00:00', activity_end = '2026-09-10 18:00:00', max_team_size = 3,
    max_participants = 60, content = '面向全校征集海报、产品和交互设计作品。',
    tags = '["设计","作品展"]', tracks = '["视觉传达","产品设计","交互设计"]', location = '艺术楼展厅',
    service_hours = NULL, status = 'published', config_json = '{"checkinRequired":false}'
WHERE id = 5;

-- 使用稳定的本地测试账号；其中 C&A 学院学生用于 teacher1 的学院范围审核演示。
SET @s_zhang := (SELECT id FROM `user` WHERE username = '20230101' LIMIT 1);
SET @s_li := (SELECT id FROM `user` WHERE username = '20230102' LIMIT 1);
SET @s_wang := (SELECT id FROM `user` WHERE username = '20230103' LIMIT 1);
SET @s_zhao := (SELECT id FROM `user` WHERE username = '20230104' LIMIT 1);
SET @s_chen := (SELECT id FROM `user` WHERE username = '20230201' LIMIT 1);
SET @s_liu := (SELECT id FROM `user` WHERE username = '20230202' LIMIT 1);
SET @s_qian := (SELECT id FROM `user` WHERE username = '20230301' LIMIT 1);
SET @s_sun := (SELECT id FROM `user` WHERE username = '20230302' LIMIT 1);
SET @s_zhou := (SELECT id FROM `user` WHERE username = '20230401' LIMIT 1);
SET @s_wu := (SELECT id FROM `user` WHERE username = '20230402' LIMIT 1);
SET @s_lu := (SELECT id FROM `user` WHERE username = '202408784230' LIMIT 1);
SET @s_wangwei := (SELECT id FROM `user` WHERE username = '202408784235' LIMIT 1);
SET @s_liao := (SELECT id FROM `user` WHERE username = '202208764219' LIMIT 1);
SET @s_peng := (SELECT id FROM `user` WHERE username = '202406284327' LIMIT 1);
SET @s_xue := (SELECT id FROM `user` WHERE username = '202407234134' LIMIT 1);
SET @t_cs := (SELECT id FROM `user` WHERE username = 'teacher1' LIMIT 1);
SET @t_electronic := (SELECT id FROM `user` WHERE username = 'teacher2' LIMIT 1);
SET @t_ca := (SELECT id FROM `user` WHERE username = 'teacher24' LIMIT 1);

-- 将早期种子账号的占位姓名替换为自然的虚构姓名；不改动导入花名册中的真实姓名。
UPDATE `user`
SET real_name = CASE username
    WHEN '20230101' THEN '陈昱辰'
    WHEN '20230102' THEN '刘泽宇'
    WHEN '20230103' THEN '周景然'
    WHEN '20230104' THEN '王子睿'
    WHEN '20230201' THEN '许嘉航'
    WHEN '20230202' THEN '孙亦凡'
    WHEN '20230301' THEN '林予安'
    WHEN '20230302' THEN '江书宁'
    WHEN '20230401' THEN '苏晚晴'
    WHEN '20230402' THEN '沈嘉禾'
    ELSE real_name
END
WHERE username IN ('20230101', '20230102', '20230103', '20230104', '20230201',
                   '20230202', '20230301', '20230302', '20230401', '20230402');

-- 4. 补齐公告：修正测试内容和不存在的赛事关联，再新增近期运营通知。
UPDATE announcement
SET title = '校园竞赛平台服务通知', content = '平台已完成暑期功能升级，报名、组队、材料审核和成长档案功能均可正常使用。',
    competition_id = NULL, type = 'system', is_pinned = 1, status = 'published'
WHERE title = 'test';

UPDATE announcement
SET title = '竞赛中心使用提醒', content = '请同学们在报名截止前确认团队成员、赛道选择和联系方式，提交后可在“我的赛事”中查看状态。',
    competition_id = NULL, type = 'system', is_pinned = 0, status = 'published'
WHERE title = 'API Test Announcement';

UPDATE announcement
SET competition_id = @c_math,
    content = '参加数学建模竞赛的同学请于 8 月 5 日前完成报名确认，并在团队信息中补全成员分工。'
WHERE title = '数模校赛报名通知';

INSERT INTO announcement (competition_id, title, content, author_id, type, is_pinned, status, create_time)
SELECT @c_math, '数学建模报名确认进入倒计时', '数学建模报名将于 8 月 5 日截止，请队长核对团队成员和参赛赛道。', 1, 'competition', 1, 'published', '2026-08-01 09:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM announcement WHERE title = '数学建模报名确认进入倒计时');

INSERT INTO announcement (competition_id, title, content, author_id, type, is_pinned, status, create_time)
SELECT @c_ai, '人工智能应用创新挑战赛项目说明会', '项目说明会将于 8 月 9 日在线举行，介绍赛题方向、原型提交格式和评审标准。', 1, 'competition', 0, 'published', '2026-08-01 10:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM announcement WHERE title = '人工智能应用创新挑战赛项目说明会');

INSERT INTO announcement (competition_id, title, content, author_id, type, is_pinned, status, create_time)
SELECT @c_design, '工业设计大赛作品方向征集', '欢迎围绕可持续生活、智慧校园和公共服务提交产品或视觉设计方案。', 1, 'competition', 0, 'published', '2026-08-01 11:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM announcement WHERE title = '工业设计大赛作品方向征集');

INSERT INTO announcement (competition_id, title, content, author_id, type, is_pinned, status, create_time)
SELECT @c_market, '市场调查与分析大赛开放报名', '本届校赛开放问卷研究、数据分析和商业策划三个方向，团队人数不超过 4 人。', 1, 'competition', 0, 'published', '2026-08-01 13:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM announcement WHERE title = '市场调查与分析大赛开放报名');

INSERT INTO announcement (competition_id, title, content, author_id, type, is_pinned, status, create_time)
SELECT NULL, '材料审核进度提醒', '已提交材料的同学可在“我的赛事”查看审核意见；被退回后可补充材料再次提交。', 1, 'system', 0, 'published', '2026-08-02 08:30:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM announcement WHERE title = '材料审核进度提醒');

INSERT INTO announcement (competition_id, title, content, author_id, type, is_pinned, status, create_time)
SELECT NULL, '本周竞赛服务安排', '本周将举办数学建模报名咨询、AI 挑战赛说明会和组队经验分享活动，欢迎关注日程。', 1, 'system', 0, 'published', '2026-08-02 09:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM announcement WHERE title = '本周竞赛服务安排');

-- 5. 报名记录：覆盖已通过、已提交、审核中、退回补充和审核驳回。
INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_math, @s_zhang, '数据远航队', '数学建模', JSON_ARRAY(@s_zhang, @s_li, @s_wang), '审核通过', '2026-08-01 10:20:00'
FROM DUAL WHERE @s_zhang IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_math AND student_id = @s_zhang AND team_name = '数据远航队');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_math, @s_zhao, '智算先锋队', '数学建模', JSON_ARRAY(@s_zhao, @s_chen, @s_liu), '审核中', '2026-08-01 14:10:00'
FROM DUAL WHERE @s_zhao IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_math AND student_id = @s_zhao AND team_name = '智算先锋队');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_math, @s_lu, '模型探路者队', '数学建模', JSON_ARRAY(@s_lu, @s_wangwei), '已提交', '2026-08-02 08:35:00'
FROM DUAL WHERE @s_lu IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_math AND student_id = @s_lu AND team_name = '模型探路者队');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_math, @s_liao, '云帆建模组', '数学建模', JSON_ARRAY(@s_liao, @s_peng, @s_xue), '审核通过', '2026-08-01 16:30:00'
FROM DUAL WHERE @s_liao IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_math AND student_id = @s_liao AND team_name = '云帆建模组');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_ai, @s_zhang, '星火创想队', '智能体应用', JSON_ARRAY(@s_zhang, @s_zhao), '已提交', '2026-08-01 15:20:00'
FROM DUAL WHERE @s_zhang IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_ai AND student_id = @s_zhang AND team_name = '星火创想队');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_ai, @s_li, NULL, '数据分析', JSON_ARRAY(@s_li), '退回补充', '2026-08-01 15:45:00'
FROM DUAL WHERE @s_li IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_ai AND student_id = @s_li AND track = '数据分析');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_ai, @s_wang, NULL, '视觉识别', JSON_ARRAY(@s_wang), '审核驳回', '2026-08-01 16:05:00'
FROM DUAL WHERE @s_wang IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_ai AND student_id = @s_wang AND track = '视觉识别');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_ai, @s_lu, '智能体实验室', '智能体应用', JSON_ARRAY(@s_lu, @s_wangwei), '审核通过', '2026-08-01 13:25:00'
FROM DUAL WHERE @s_lu IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_ai AND student_id = @s_lu AND team_name = '智能体实验室');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_ai, @s_wangwei, NULL, '数据分析', JSON_ARRAY(@s_wangwei), '审核中', '2026-08-02 09:10:00'
FROM DUAL WHERE @s_wangwei IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_ai AND student_id = @s_wangwei AND track = '数据分析');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_design, @s_zhou, '拾光设计组', '产品设计', JSON_ARRAY(@s_zhou, @s_wu), '审核中', '2026-08-02 10:20:00'
FROM DUAL WHERE @s_zhou IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_design AND student_id = @s_zhou AND team_name = '拾光设计组');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_design, @s_wu, NULL, '视觉传达', JSON_ARRAY(@s_wu), '审核通过', '2026-08-01 18:10:00'
FROM DUAL WHERE @s_wu IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_design AND student_id = @s_wu AND track = '视觉传达');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_design, @s_xue, NULL, '服务设计', JSON_ARRAY(@s_xue), '已提交', '2026-08-02 10:40:00'
FROM DUAL WHERE @s_xue IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_design AND student_id = @s_xue AND track = '服务设计');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_market, @s_qian, '洞察实验室', '问卷研究', JSON_ARRAY(@s_qian, @s_sun), '审核通过', '2026-08-01 11:15:00'
FROM DUAL WHERE @s_qian IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_market AND student_id = @s_qian AND team_name = '洞察实验室');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_market, @s_sun, NULL, '商业策划', JSON_ARRAY(@s_sun), '已提交', '2026-08-02 09:25:00'
FROM DUAL WHERE @s_sun IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_market AND student_id = @s_sun AND track = '商业策划');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_code, @s_zhang, '字节跃迁队', '算法赛道', JSON_ARRAY(@s_zhang, @s_li, @s_lu), '审核中', '2026-08-02 10:55:00'
FROM DUAL WHERE @s_zhang IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_code AND student_id = @s_zhang AND team_name = '字节跃迁队');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_code, @s_zhao, NULL, 'Web应用', JSON_ARRAY(@s_zhao), '退回补充', '2026-08-02 11:05:00'
FROM DUAL WHERE @s_zhao IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_code AND student_id = @s_zhao AND track = 'Web应用');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_code, @s_liao, NULL, '数据工程', JSON_ARRAY(@s_liao), '已提交', '2026-08-02 11:25:00'
FROM DUAL WHERE @s_liao IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_code AND student_id = @s_liao AND track = '数据工程');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_innovation, @s_qian, '青年创客邦', '创意组', JSON_ARRAY(@s_qian, @s_sun), '审核通过', '2026-06-20 10:00:00'
FROM DUAL WHERE @s_qian IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_innovation AND student_id = @s_qian AND team_name = '青年创客邦');

INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_art, @s_zhou, NULL, '视觉传达设计', JSON_ARRAY(@s_zhou), '审核通过', '2026-06-10 14:00:00'
FROM DUAL WHERE @s_zhou IS NOT NULL AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_art AND student_id = @s_zhou AND track = '视觉传达设计');

SET @r_math_zhang := (SELECT id FROM registration WHERE competition_id = @c_math AND student_id = @s_zhang AND team_name = '数据远航队' ORDER BY id DESC LIMIT 1);
SET @r_math_lu := (SELECT id FROM registration WHERE competition_id = @c_math AND student_id = @s_lu AND team_name = '模型探路者队' ORDER BY id DESC LIMIT 1);
SET @r_ai_zhang := (SELECT id FROM registration WHERE competition_id = @c_ai AND student_id = @s_zhang AND team_name = '星火创想队' ORDER BY id DESC LIMIT 1);
SET @r_ai_lu := (SELECT id FROM registration WHERE competition_id = @c_ai AND student_id = @s_lu AND team_name = '智能体实验室' ORDER BY id DESC LIMIT 1);
SET @r_design_zhou := (SELECT id FROM registration WHERE competition_id = @c_design AND student_id = @s_zhou AND team_name = '拾光设计组' ORDER BY id DESC LIMIT 1);
SET @r_market_qian := (SELECT id FROM registration WHERE competition_id = @c_market AND student_id = @s_qian AND team_name = '洞察实验室' ORDER BY id DESC LIMIT 1);
SET @r_innovation_qian := (SELECT id FROM registration WHERE competition_id = @c_innovation AND student_id = @s_qian AND team_name = '青年创客邦' ORDER BY id DESC LIMIT 1);
SET @r_art_zhou := (SELECT id FROM registration WHERE competition_id = @c_art AND student_id = @s_zhou AND track = '视觉传达设计' ORDER BY id DESC LIMIT 1);

-- 6. 组队招募和入队申请。
INSERT INTO team_post (author_id, competition_id, content, roles_needed, date, status)
SELECT @s_zhao, @c_math, '数学建模队已有两名成员，计划研究城市交通优化问题，招募一名擅长数据处理的同学。', '["数据处理","论文写作"]', '2026-08-02 09:30:00', '招募中'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_post WHERE author_id = @s_zhao AND competition_id = @c_math AND content LIKE '数学建模队已有两名成员%');

INSERT INTO team_post (author_id, competition_id, content, roles_needed, date, status)
SELECT @s_lu, @c_ai, '我们正在做校园学习助手原型，已有产品和后端同学，想找一位前端或 UI 伙伴共同完善体验。', '["前端开发","UI设计"]', '2026-08-02 10:00:00', '招募中'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_post WHERE author_id = @s_lu AND competition_id = @c_ai AND content LIKE '我们正在做校园学习助手原型%');

INSERT INTO team_post (author_id, competition_id, content, roles_needed, date, status)
SELECT @s_zhou, @c_design, '聚焦宿舍收纳与共享空间的可持续产品设计，现招募擅长建模和版式表达的同学。', '["三维建模","视觉排版"]', '2026-08-02 10:20:00', '招募中'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_post WHERE author_id = @s_zhou AND competition_id = @c_design AND content LIKE '聚焦宿舍收纳与共享空间%');

INSERT INTO team_post (author_id, competition_id, content, roles_needed, date, status)
SELECT @s_qian, @c_market, '计划围绕大学生数字消费习惯开展调研，需要一位会 SPSS 或 Python 分析问卷数据的队友。', '["数据分析","问卷设计"]', '2026-08-02 10:35:00', '招募中'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_post WHERE author_id = @s_qian AND competition_id = @c_market AND content LIKE '计划围绕大学生数字消费习惯%');

INSERT INTO team_post (author_id, competition_id, content, roles_needed, date, status)
SELECT @s_zhang, @c_code, '算法基础扎实，准备冲击程序设计挑战赛算法赛道，寻找一位负责代码复盘和测试的队友。', '["算法","测试与调优"]', '2026-08-02 10:50:00', '招募中'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_post WHERE author_id = @s_zhang AND competition_id = @c_code AND content LIKE '算法基础扎实，准备冲击程序设计挑战赛%');

INSERT INTO team_post (author_id, competition_id, content, roles_needed, date, status)
SELECT @s_wu, @c_design, '视觉传达方向已完成初版海报，希望补充一位会交互动效和作品集整理的伙伴。', '["交互动效","作品集整理"]', '2026-08-01 18:30:00', '已满员'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_post WHERE author_id = @s_wu AND competition_id = @c_design AND content LIKE '视觉传达方向已完成初版海报%');

SET @p_math := (SELECT id FROM team_post WHERE author_id = @s_zhao AND competition_id = @c_math AND content LIKE '数学建模队已有两名成员%' ORDER BY id DESC LIMIT 1);
SET @p_ai := (SELECT id FROM team_post WHERE author_id = @s_lu AND competition_id = @c_ai AND content LIKE '我们正在做校园学习助手原型%' ORDER BY id DESC LIMIT 1);
SET @p_design := (SELECT id FROM team_post WHERE author_id = @s_zhou AND competition_id = @c_design AND content LIKE '聚焦宿舍收纳与共享空间%' ORDER BY id DESC LIMIT 1);
SET @p_market := (SELECT id FROM team_post WHERE author_id = @s_qian AND competition_id = @c_market AND content LIKE '计划围绕大学生数字消费习惯%' ORDER BY id DESC LIMIT 1);
SET @p_code := (SELECT id FROM team_post WHERE author_id = @s_zhang AND competition_id = @c_code AND content LIKE '算法基础扎实，准备冲击程序设计挑战赛%' ORDER BY id DESC LIMIT 1);
SET @p_visual := (SELECT id FROM team_post WHERE author_id = @s_wu AND competition_id = @c_design AND content LIKE '视觉传达方向已完成初版海报%' ORDER BY id DESC LIMIT 1);

INSERT INTO team_application (team_id, applicant_id, role, reason, status, create_time)
SELECT @p_math, @s_zhang, '数据处理', '有 Python 数据清洗和建模经验，希望参与完整赛题分析。', 'pending', '2026-08-02 10:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_application WHERE team_id = @p_math AND applicant_id = @s_zhang);
INSERT INTO team_application (team_id, applicant_id, role, reason, status, create_time)
SELECT @p_math, @s_li, '论文写作', '参加过课程论文写作训练，可以负责摘要和模型说明。', 'approved', '2026-08-02 10:10:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_application WHERE team_id = @p_math AND applicant_id = @s_li);
INSERT INTO team_application (team_id, applicant_id, role, reason, status, create_time)
SELECT @p_math, @s_wang, '数据处理', '愿意协助处理问卷和公开数据。', 'rejected', '2026-08-02 10:15:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_application WHERE team_id = @p_math AND applicant_id = @s_wang);
INSERT INTO team_application (team_id, applicant_id, role, reason, status, create_time)
SELECT @p_ai, @s_wangwei, '前端开发', '有 React 项目经验，愿意负责交互页面和接口联调。', 'pending', '2026-08-02 10:25:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_application WHERE team_id = @p_ai AND applicant_id = @s_wangwei);
INSERT INTO team_application (team_id, applicant_id, role, reason, status, create_time)
SELECT @p_ai, @s_liao, 'UI设计', '可完成组件规范和移动端界面设计。', 'approved', '2026-08-02 10:28:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_application WHERE team_id = @p_ai AND applicant_id = @s_liao);
INSERT INTO team_application (team_id, applicant_id, role, reason, status, create_time)
SELECT @p_design, @s_wu, '视觉排版', '熟悉版式和作品集呈现，可以协助终稿整理。', 'pending', '2026-08-02 10:30:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_application WHERE team_id = @p_design AND applicant_id = @s_wu);
INSERT INTO team_application (team_id, applicant_id, role, reason, status, create_time)
SELECT @p_market, @s_sun, '数据分析', '完成过消费者调研课程项目，会使用 SPSS 基础分析。', 'approved', '2026-08-02 10:40:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_application WHERE team_id = @p_market AND applicant_id = @s_sun);
INSERT INTO team_application (team_id, applicant_id, role, reason, status, create_time)
SELECT @p_code, @s_lu, '算法', '参加过校内算法训练，愿意负责题目拆解和复杂度优化。', 'pending', '2026-08-02 10:58:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_application WHERE team_id = @p_code AND applicant_id = @s_lu);
INSERT INTO team_application (team_id, applicant_id, role, reason, status, create_time)
SELECT @p_visual, @s_zhou, '作品集整理', '可以负责图文排版和答辩展示文件。', 'approved', '2026-08-01 19:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_application WHERE team_id = @p_visual AND applicant_id = @s_zhou);

-- 7. 成果材料、成员关联和优秀作品展示。
INSERT INTO submission (registration_id, competition_id, submitter_id, file_name, file_url, file_size, upload_date, status, review_note, approved, displayed)
SELECT @r_math_zhang, @c_math, @s_zhang, '数据远航队_建模思路说明.pdf', '/api/file/serve/demo-math-zhang.pdf', 2480000, '2026-08-01 11:30:00', '已审核', '建模思路清晰，建议在正式赛题公布后补充数据来源说明。', 1, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission WHERE file_name = '数据远航队_建模思路说明.pdf');
INSERT INTO submission (registration_id, competition_id, submitter_id, file_name, file_url, file_size, upload_date, status, review_note, approved, displayed)
SELECT @r_math_lu, @c_math, @s_lu, '模型探路者队_问题分析初稿.pdf', '/api/file/serve/demo-math-lu.pdf', 1980000, '2026-08-02 09:00:00', '待审核', NULL, NULL, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission WHERE file_name = '模型探路者队_问题分析初稿.pdf');
INSERT INTO submission (registration_id, competition_id, submitter_id, file_name, file_url, file_size, upload_date, status, review_note, approved, displayed)
SELECT @r_ai_zhang, @c_ai, @s_zhang, '星火创想队_校园学习助手原型.pdf', '/api/file/serve/demo-ai-zhang.pdf', 3260000, '2026-08-02 10:05:00', '待审核', NULL, NULL, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission WHERE file_name = '星火创想队_校园学习助手原型.pdf');
INSERT INTO submission (registration_id, competition_id, submitter_id, file_name, file_url, file_size, upload_date, status, review_note, approved, displayed)
SELECT @r_ai_lu, @c_ai, @s_lu, '智能体实验室_项目原型说明.pdf', '/api/file/serve/demo-ai-lu.pdf', 4120000, '2026-08-01 17:20:00', '已审核', '原型完整、应用场景明确，推荐在优秀作品库展示。', 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission WHERE file_name = '智能体实验室_项目原型说明.pdf');
INSERT INTO submission (registration_id, competition_id, submitter_id, file_name, file_url, file_size, upload_date, status, review_note, approved, displayed)
SELECT @r_design_zhou, @c_design, @s_zhou, '拾光设计组_宿舍共享收纳方案.pdf', '/api/file/serve/demo-design-zhou.pdf', 3650000, '2026-08-02 10:50:00', '已审核', '请补充用户调研记录和尺寸标注后再次提交。', NULL, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission WHERE file_name = '拾光设计组_宿舍共享收纳方案.pdf');
INSERT INTO submission (registration_id, competition_id, submitter_id, file_name, file_url, file_size, upload_date, status, review_note, approved, displayed)
SELECT @r_market_qian, @c_market, @s_qian, '洞察实验室_大学生数字消费调研报告.pdf', '/api/file/serve/demo-market-qian.pdf', 2870000, '2026-08-01 15:40:00', '已审核', '样本说明充分，分析结论与建议匹配，审核通过。', 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission WHERE file_name = '洞察实验室_大学生数字消费调研报告.pdf');
INSERT INTO submission (registration_id, competition_id, submitter_id, file_name, file_url, file_size, upload_date, status, review_note, approved, displayed)
SELECT @r_innovation_qian, @c_innovation, @s_qian, '青年创客邦_校园二手循环平台项目书.pdf', '/api/file/serve/demo-innovation-qian.pdf', 4310000, '2026-06-22 16:00:00', '已审核', '项目论证扎实，作为往届优秀案例展示。', 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission WHERE file_name = '青年创客邦_校园二手循环平台项目书.pdf');
INSERT INTO submission (registration_id, competition_id, submitter_id, file_name, file_url, file_size, upload_date, status, review_note, approved, displayed)
SELECT @r_art_zhou, @c_art, @s_zhou, '视觉传达设计作品_城市记忆系列.pdf', '/api/file/serve/demo-art-zhou.pdf', 2980000, '2026-06-14 15:30:00', '已审核', '作品主题鲜明、视觉表达完整，审核通过并推荐展示。', 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission WHERE file_name = '视觉传达设计作品_城市记忆系列.pdf');

SET @sub_math_zhang := (SELECT id FROM submission WHERE file_name = '数据远航队_建模思路说明.pdf' LIMIT 1);
SET @sub_math_lu := (SELECT id FROM submission WHERE file_name = '模型探路者队_问题分析初稿.pdf' LIMIT 1);
SET @sub_ai_zhang := (SELECT id FROM submission WHERE file_name = '星火创想队_校园学习助手原型.pdf' LIMIT 1);
SET @sub_ai_lu := (SELECT id FROM submission WHERE file_name = '智能体实验室_项目原型说明.pdf' LIMIT 1);
SET @sub_design_zhou := (SELECT id FROM submission WHERE file_name = '拾光设计组_宿舍共享收纳方案.pdf' LIMIT 1);
SET @sub_market_qian := (SELECT id FROM submission WHERE file_name = '洞察实验室_大学生数字消费调研报告.pdf' LIMIT 1);
SET @sub_innovation_qian := (SELECT id FROM submission WHERE file_name = '青年创客邦_校园二手循环平台项目书.pdf' LIMIT 1);
SET @sub_art_zhou := (SELECT id FROM submission WHERE file_name = '视觉传达设计作品_城市记忆系列.pdf' LIMIT 1);

INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_math_zhang, @s_zhang FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_math_zhang AND student_id = @s_zhang);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_math_zhang, @s_li FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_math_zhang AND student_id = @s_li);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_math_zhang, @s_wang FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_math_zhang AND student_id = @s_wang);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_math_lu, @s_lu FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_math_lu AND student_id = @s_lu);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_math_lu, @s_wangwei FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_math_lu AND student_id = @s_wangwei);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_ai_zhang, @s_zhang FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_ai_zhang AND student_id = @s_zhang);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_ai_zhang, @s_zhao FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_ai_zhang AND student_id = @s_zhao);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_ai_lu, @s_lu FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_ai_lu AND student_id = @s_lu);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_ai_lu, @s_wangwei FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_ai_lu AND student_id = @s_wangwei);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_design_zhou, @s_zhou FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_design_zhou AND student_id = @s_zhou);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_design_zhou, @s_wu FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_design_zhou AND student_id = @s_wu);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_market_qian, @s_qian FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_market_qian AND student_id = @s_qian);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_market_qian, @s_sun FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_market_qian AND student_id = @s_sun);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_innovation_qian, @s_qian FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_innovation_qian AND student_id = @s_qian);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_innovation_qian, @s_sun FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_innovation_qian AND student_id = @s_sun);
INSERT INTO submission_student (submission_id, student_id)
SELECT @sub_art_zhou, @s_zhou FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM submission_student WHERE submission_id = @sub_art_zhou AND student_id = @s_zhou);

-- 8. 获奖证明：展示已认证、待审核和退回补充的不同状态。
INSERT INTO award_proof
  (submitter_id, competition_id, competition_name, award_level, award_time, organizer, winner_name,
   certificate_no, seal_text, file_name, file_url, file_hash, confidence, status, review_note, reviewer_id, review_time, create_time)
SELECT @s_qian, @c_innovation, '第十届“互联网+”大学生创新创业大赛', '国家级二等奖', '2026-06-25 10:00:00', '教育部高等教育司', '林予安、江书宁',
       'DEMO-2026-IOT-001', '教育部高等教育司', '青年创客邦_获奖证书.pdf', '/api/file/serve/demo-award-iot.pdf', 'demo-award-iot-001', 0.9800, 'approved', '证书信息完整，审核通过。', @t_cs, '2026-06-26 09:30:00', '2026-06-25 11:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof WHERE certificate_no = 'DEMO-2026-IOT-001');

INSERT INTO award_proof
  (submitter_id, competition_id, competition_name, award_level, award_time, organizer, winner_name,
   certificate_no, seal_text, file_name, file_url, file_hash, confidence, status, review_note, reviewer_id, review_time, create_time)
SELECT @s_zhou, @c_art, '第四届全国大学生艺术设计大奖赛', '全国三等奖', '2026-06-29 10:00:00', '全国大学生艺术设计大赛组委会', '苏晚晴',
       'DEMO-2026-ART-003', '全国大学生艺术设计大赛组委会', '城市记忆系列_获奖证书.pdf', '/api/file/serve/demo-award-art.pdf', 'demo-award-art-003', 0.9700, 'approved', '证书与参赛信息一致，审核通过。', @t_cs, '2026-06-30 14:20:00', '2026-06-29 11:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof WHERE certificate_no = 'DEMO-2026-ART-003');

INSERT INTO award_proof
  (submitter_id, competition_id, competition_name, award_level, award_time, organizer, winner_name,
   certificate_no, seal_text, file_name, file_url, file_hash, confidence, status, create_time)
SELECT @s_zhang, @c_innovation, '第十届“互联网+”大学生创新创业大赛', '校赛优秀奖', '2026-06-18 10:00:00', '创新创业学院', '陈昱辰',
       'DEMO-2026-IOT-SCHOOL-008', '创新创业学院', '星火创想_校赛证书.pdf', '/api/file/serve/demo-award-zhang.pdf', 'demo-award-zhang-008', 0.9100, 'pending', '2026-08-02 10:10:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof WHERE certificate_no = 'DEMO-2026-IOT-SCHOOL-008');

INSERT INTO award_proof
  (submitter_id, competition_id, competition_name, award_level, award_time, organizer, winner_name,
   certificate_no, seal_text, file_name, file_url, file_hash, confidence, status, review_note, reviewer_id, review_time, create_time)
SELECT @s_liu, @c_art, '第四届全国大学生艺术设计大奖赛', '省级二等奖', '2026-06-28 10:00:00', '广东省赛区组委会', '孙亦凡',
       'DEMO-2026-ART-GD-011', '广东省赛区组委会', '视觉海报_获奖证明.pdf', '/api/file/serve/demo-award-liu.pdf', 'demo-award-liu-011', 0.7600, 'returned', '请补充证书原件扫描件和获奖名单页。', @t_electronic, '2026-07-01 11:00:00', '2026-06-28 14:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof WHERE certificate_no = 'DEMO-2026-ART-GD-011');

INSERT INTO award_proof
  (submitter_id, competition_id, competition_name, award_level, award_time, organizer, winner_name,
   certificate_no, seal_text, file_name, file_url, file_hash, confidence, status, create_time)
SELECT @s_lu, @c_ai, '2026年校级人工智能应用创新挑战赛', '校赛创新实践奖', '2026-07-30 10:00:00', '创新创业学院', '卢梓浩、王伟涛',
       'DEMO-2026-AI-006', '创新创业学院', '智能体实验室_预评审证明.pdf', '/api/file/serve/demo-award-ai.pdf', 'demo-award-ai-006', 0.8800, 'pending', '2026-08-02 10:30:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof WHERE certificate_no = 'DEMO-2026-AI-006');

UPDATE award_proof
SET winner_name = CASE certificate_no
    WHEN 'DEMO-2026-IOT-001' THEN '林予安、江书宁'
    WHEN 'DEMO-2026-ART-003' THEN '苏晚晴'
    WHEN 'DEMO-2026-IOT-SCHOOL-008' THEN '陈昱辰'
    WHEN 'DEMO-2026-ART-GD-011' THEN '孙亦凡'
    ELSE winner_name
END
WHERE certificate_no IN ('DEMO-2026-IOT-001', 'DEMO-2026-ART-003',
                         'DEMO-2026-IOT-SCHOOL-008', 'DEMO-2026-ART-GD-011');

SET @award_qian := (SELECT id FROM award_proof WHERE certificate_no = 'DEMO-2026-IOT-001' LIMIT 1);
SET @award_zhou := (SELECT id FROM award_proof WHERE certificate_no = 'DEMO-2026-ART-003' LIMIT 1);
SET @award_zhang := (SELECT id FROM award_proof WHERE certificate_no = 'DEMO-2026-IOT-SCHOOL-008' LIMIT 1);
SET @award_liu := (SELECT id FROM award_proof WHERE certificate_no = 'DEMO-2026-ART-GD-011' LIMIT 1);
SET @award_lu := (SELECT id FROM award_proof WHERE certificate_no = 'DEMO-2026-AI-006' LIMIT 1);

INSERT INTO award_proof_student (award_proof_id, student_id)
SELECT @award_qian, @s_qian FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof_student WHERE award_proof_id = @award_qian AND student_id = @s_qian);
INSERT INTO award_proof_student (award_proof_id, student_id)
SELECT @award_qian, @s_sun FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof_student WHERE award_proof_id = @award_qian AND student_id = @s_sun);
INSERT INTO award_proof_student (award_proof_id, student_id)
SELECT @award_zhou, @s_zhou FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof_student WHERE award_proof_id = @award_zhou AND student_id = @s_zhou);
INSERT INTO award_proof_student (award_proof_id, student_id)
SELECT @award_zhang, @s_zhang FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof_student WHERE award_proof_id = @award_zhang AND student_id = @s_zhang);
INSERT INTO award_proof_student (award_proof_id, student_id)
SELECT @award_liu, @s_liu FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof_student WHERE award_proof_id = @award_liu AND student_id = @s_liu);
INSERT INTO award_proof_student (award_proof_id, student_id)
SELECT @award_lu, @s_lu FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof_student WHERE award_proof_id = @award_lu AND student_id = @s_lu);
INSERT INTO award_proof_student (award_proof_id, student_id)
SELECT @award_lu, @s_wangwei FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM award_proof_student WHERE award_proof_id = @award_lu AND student_id = @s_wangwei);

-- 9. 赛事阶段与学生进度。
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_math, '报名确认', 1, '2026-07-20 09:00:00', '2026-08-05 23:59:59', '确认团队成员、赛道和联系方式。', 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_math AND stage_order = 1);
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_math, '初赛材料准备', 2, '2026-08-06 09:00:00', '2026-09-05 20:00:00', '完成选题、数据收集和论文初稿。', 'upcoming'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_math AND stage_order = 2);
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_math, '国赛答辩', 3, '2026-09-10 18:00:00', '2026-09-13 20:00:00', '按赛事安排完成线上或线下答辩。', 'upcoming'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_math AND stage_order = 3);

INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_ai, '报名与组队', 1, '2026-07-25 09:00:00', '2026-08-22 23:59:59', '完成团队创建、成员确认和赛道选择。', 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_ai AND stage_order = 1);
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_ai, '原型提交', 2, '2026-08-23 09:00:00', '2026-08-29 23:59:59', '提交可运行原型、演示视频和项目说明。', 'upcoming'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_ai AND stage_order = 2);
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_ai, '现场评审', 3, '2026-08-30 09:00:00', '2026-09-06 18:00:00', '完成展示答辩并接受专家提问。', 'upcoming'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_ai AND stage_order = 3);

INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_design, '报名与选题', 1, '2026-08-01 09:00:00', '2026-09-08 23:59:59', '登记团队和作品方向，提交选题说明。', 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_design AND stage_order = 1);
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_design, '方案设计', 2, '2026-09-09 09:00:00', '2026-09-19 23:59:59', '完成用户研究、概念设计和主视觉方案。', 'upcoming'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_design AND stage_order = 2);
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_market, '报名确认', 1, '2026-07-20 09:00:00', '2026-09-20 23:59:59', '完成赛题选择、团队和问卷方向确认。', 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_market AND stage_order = 1);
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_market, '调研报告提交', 2, '2026-09-21 09:00:00', '2026-09-26 23:59:59', '提交问卷数据、调研报告和展示材料。', 'upcoming'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_market AND stage_order = 2);
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_code, '报名与热身', 1, '2026-08-05 09:00:00', '2026-08-28 23:59:59', '选择赛道并完成在线环境测试。', 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_code AND stage_order = 1);
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_code, '现场挑战', 2, '2026-08-30 13:00:00', '2026-08-30 18:00:00', '在规定时间内完成赛题并提交代码。', 'upcoming'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_code AND stage_order = 2);

SET @stage_math_1 := (SELECT id FROM competition_stage WHERE competition_id = @c_math AND stage_order = 1 LIMIT 1);
SET @stage_math_2 := (SELECT id FROM competition_stage WHERE competition_id = @c_math AND stage_order = 2 LIMIT 1);
SET @stage_ai_1 := (SELECT id FROM competition_stage WHERE competition_id = @c_ai AND stage_order = 1 LIMIT 1);
SET @stage_ai_2 := (SELECT id FROM competition_stage WHERE competition_id = @c_ai AND stage_order = 2 LIMIT 1);
SET @stage_design_1 := (SELECT id FROM competition_stage WHERE competition_id = @c_design AND stage_order = 1 LIMIT 1);
SET @stage_market_1 := (SELECT id FROM competition_stage WHERE competition_id = @c_market AND stage_order = 1 LIMIT 1);
SET @stage_code_1 := (SELECT id FROM competition_stage WHERE competition_id = @c_code AND stage_order = 1 LIMIT 1);

INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time, review_time, review_note, reviewer_id)
SELECT @s_zhang, @c_math, @stage_math_1, @r_math_zhang, 'passed', '2026-08-01 10:20:00', '2026-08-01 12:00:00', '报名信息完整，已确认参赛资格。', @t_cs
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @s_zhang AND stage_id = @stage_math_1);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, review_note)
SELECT @s_zhang, @c_math, @stage_math_2, @r_math_zhang, 'in_progress', '正在准备初赛选题与数据资料。'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @s_zhang AND stage_id = @stage_math_2);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time)
SELECT @s_lu, @c_math, @stage_math_1, @r_math_lu, 'submitted', '2026-08-02 08:35:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @s_lu AND stage_id = @stage_math_1);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time, review_time, reviewer_id)
SELECT @s_lu, @c_ai, @stage_ai_1, @r_ai_lu, 'passed', '2026-08-01 13:25:00', '2026-08-01 14:10:00', @t_cs
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @s_lu AND stage_id = @stage_ai_1);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, review_note)
SELECT @s_lu, @c_ai, @stage_ai_2, @r_ai_lu, 'in_progress', '正在完善校园学习助手的可用原型。'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @s_lu AND stage_id = @stage_ai_2);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time)
SELECT @s_zhang, @c_ai, @stage_ai_1, @r_ai_zhang, 'submitted', '2026-08-01 15:20:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @s_zhang AND stage_id = @stage_ai_1);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time)
SELECT @s_zhou, @c_design, @stage_design_1, @r_design_zhou, 'submitted', '2026-08-02 10:20:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @s_zhou AND stage_id = @stage_design_1);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time, review_time, reviewer_id)
SELECT @s_qian, @c_market, @stage_market_1, @r_market_qian, 'passed', '2026-08-01 11:15:00', '2026-08-01 13:00:00', @t_cs
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @s_qian AND stage_id = @stage_market_1);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time)
SELECT @s_zhang, @c_code, @stage_code_1, (SELECT id FROM registration WHERE competition_id = @c_code AND student_id = @s_zhang LIMIT 1), 'submitted', '2026-08-02 10:55:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @s_zhang AND stage_id = @stage_code_1);

-- 10. 校园活动参与记录与成长时间线。
INSERT INTO participation (activity_id, student_id, team_name, track, member_student_ids, metadata_json, status, submit_date, review_note, reviewer_id, review_time)
SELECT 1, @s_zhang, NULL, '校园引导', JSON_ARRAY(@s_zhang), '{"position":"校园引导","checkedIn":true}', 'approved', '2026-08-01 09:20:00', '信息完整，已安排至 A 组。', @t_cs, '2026-08-01 11:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM participation WHERE activity_id = 1 AND student_id = @s_zhang);
INSERT INTO participation (activity_id, student_id, team_name, track, member_student_ids, metadata_json, status, submit_date, review_note, reviewer_id, review_time)
SELECT 1, @s_li, NULL, '物资发放', JSON_ARRAY(@s_li), '{"position":"物资发放","checkedIn":true}', 'approved', '2026-08-01 09:35:00', '信息完整，已安排至 B 组。', @t_cs, '2026-08-01 11:05:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM participation WHERE activity_id = 1 AND student_id = @s_li);
INSERT INTO participation (activity_id, student_id, team_name, track, member_student_ids, metadata_json, status, submit_date)
SELECT 2, @s_lu, NULL, '展区引导', JSON_ARRAY(@s_lu), '{"position":"展区引导"}', 'in_review', '2026-08-02 08:50:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM participation WHERE activity_id = 2 AND student_id = @s_lu);
INSERT INTO participation (activity_id, student_id, team_name, track, member_student_ids, metadata_json, status, submit_date)
SELECT 3, @s_wangwei, NULL, '设备保障', JSON_ARRAY(@s_wangwei), '{"position":"设备保障"}', 'submitted', '2026-08-02 09:05:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM participation WHERE activity_id = 3 AND student_id = @s_wangwei);
INSERT INTO participation (activity_id, student_id, team_name, track, member_student_ids, metadata_json, status, submit_date, review_note, reviewer_id, review_time)
SELECT 4, @s_zhao, '计算机学院代表队', '男子组', JSON_ARRAY(@s_zhao, @s_wang), '{"teamRole":"队员"}', 'approved', '2026-08-01 16:00:00', '报名确认，已进入赛程。', @t_cs, '2026-08-01 17:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM participation WHERE activity_id = 4 AND student_id = @s_zhao);
INSERT INTO participation (activity_id, student_id, team_name, track, member_student_ids, metadata_json, status, submit_date)
SELECT 5, @s_zhou, NULL, '视觉传达', JSON_ARRAY(@s_zhou), '{"track":"视觉传达"}', 'in_review', '2026-08-02 10:15:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM participation WHERE activity_id = 5 AND student_id = @s_zhou);

INSERT INTO growth_record (student_id, competition_id, record_type, title, happen_time)
SELECT @s_zhang, @c_math, 'competition', '完成数学建模竞赛团队报名并通过资格确认', '2026-08-01 12:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM growth_record WHERE student_id = @s_zhang AND competition_id = @c_math AND record_type = 'competition');
INSERT INTO growth_record (student_id, competition_id, record_type, title, happen_time)
SELECT @s_zhang, 1, 'volunteer', '报名并通过迎新志愿服务审核', '2026-08-01 11:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM growth_record WHERE student_id = @s_zhang AND competition_id = 1 AND record_type = 'volunteer');
INSERT INTO growth_record (student_id, competition_id, record_type, title, happen_time)
SELECT @s_qian, @c_innovation, 'award', '“青年创客邦”项目材料审核通过并进入优秀作品库', '2026-06-26 09:30:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM growth_record WHERE student_id = @s_qian AND competition_id = @c_innovation AND record_type = 'award');
INSERT INTO growth_record (student_id, competition_id, record_type, title, happen_time)
SELECT @s_zhou, @c_art, 'award', '原创视觉传达作品获奖并完成成果归档', '2026-06-30 14:20:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM growth_record WHERE student_id = @s_zhou AND competition_id = @c_art AND record_type = 'award');
INSERT INTO growth_record (student_id, competition_id, record_type, title, happen_time)
SELECT @s_zhao, 4, 'culture_sports', '加入校园篮球联赛代表队', '2026-08-01 17:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM growth_record WHERE student_id = @s_zhao AND competition_id = 4 AND record_type = 'culture_sports');
INSERT INTO growth_record (student_id, competition_id, record_type, title, happen_time)
SELECT @s_lu, @c_ai, 'competition', '人工智能应用创新挑战赛报名审核通过', '2026-08-01 14:10:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM growth_record WHERE student_id = @s_lu AND competition_id = @c_ai AND record_type = 'competition');

-- 11. 审核工作台待办：为教师和管理员展示进行中及已归档的事项。
INSERT INTO review_task (activity_type, activity_id, target_type, target_id, submitter_id, title, status, deadline, payload_json, create_time, update_time)
SELECT 'competition', @c_math, 'registration', (SELECT id FROM registration WHERE competition_id = @c_math AND student_id = @s_zhao AND team_name = '智算先锋队' LIMIT 1), @s_zhao,
       '赛事报名审核：2026年高教社杯全国大学生数学建模竞赛', 'pending', '2026-08-05 23:59:59',
       JSON_OBJECT('competitionName','2026年高教社杯全国大学生数学建模竞赛','teamName','智算先锋队','track','数学建模'), '2026-08-01 14:10:00', '2026-08-01 14:10:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM review_task WHERE target_type = 'registration' AND target_id = (SELECT id FROM registration WHERE competition_id = @c_math AND student_id = @s_zhao AND team_name = '智算先锋队' LIMIT 1) AND status IN ('pending','processing'));

INSERT INTO review_task (activity_type, activity_id, target_type, target_id, submitter_id, title, status, deadline, payload_json, create_time, update_time)
SELECT 'competition', @c_ai, 'submission', @sub_ai_zhang, @s_zhang,
       '成果审核：2026年校级人工智能应用创新挑战赛', 'pending', '2026-08-29 23:59:59',
       JSON_OBJECT('competitionName','2026年校级人工智能应用创新挑战赛','fileName','星火创想队_校园学习助手原型.pdf','registrationId',@r_ai_zhang), '2026-08-02 10:05:00', '2026-08-02 10:05:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM review_task WHERE target_type = 'submission' AND target_id = @sub_ai_zhang AND status IN ('pending','processing'));

INSERT INTO review_task (activity_type, activity_id, target_type, target_id, submitter_id, title, status, deadline, payload_json, create_time, update_time)
SELECT 'competition', @c_math, 'submission', @sub_math_lu, @s_lu,
       '成果审核：2026年高教社杯全国大学生数学建模竞赛', 'processing', '2026-09-05 20:00:00',
       JSON_OBJECT('competitionName','2026年高教社杯全国大学生数学建模竞赛','fileName','模型探路者队_问题分析初稿.pdf','registrationId',@r_math_lu), '2026-08-02 09:00:00', '2026-08-02 09:15:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM review_task WHERE target_type = 'submission' AND target_id = @sub_math_lu AND status IN ('pending','processing'));

INSERT INTO review_task (activity_type, activity_id, target_type, target_id, submitter_id, title, status, deadline, payload_json, create_time, update_time)
SELECT 'competition', @c_ai, 'award_proof', @award_lu, @s_lu,
       '获奖证明审核：校级人工智能应用创新挑战赛', 'pending', '2026-08-06 18:00:00',
       JSON_OBJECT('competitionName','2026年校级人工智能应用创新挑战赛','certificateNo','DEMO-2026-AI-006'), '2026-08-02 10:30:00', '2026-08-02 10:30:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM review_task WHERE target_type = 'award_proof' AND target_id = @award_lu AND status IN ('pending','processing'));

INSERT INTO review_task (activity_type, activity_id, target_type, target_id, submitter_id, title, status, deadline, payload_json, reviewer_id, review_note, create_time, update_time)
SELECT 'competition', @c_innovation, 'submission', @sub_innovation_qian, @s_qian,
       '成果审核：第十届“互联网+”大学生创新创业大赛', 'resolved', '2026-06-30 23:59:59',
       JSON_OBJECT('competitionName','第十届“互联网+”大学生创新创业大赛','fileName','青年创客邦_校园二手循环平台项目书.pdf','registrationId',@r_innovation_qian), @t_cs, '项目论证扎实，审核通过并推荐展示。', '2026-06-22 16:00:00', '2026-06-26 09:30:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM review_task WHERE target_type = 'submission' AND target_id = @sub_innovation_qian AND status = 'resolved');

INSERT INTO review_task (activity_type, activity_id, target_type, target_id, submitter_id, title, status, deadline, payload_json, create_time, update_time)
SELECT 'volunteer', 2, 'participation', (SELECT id FROM participation WHERE activity_id = 2 AND student_id = @s_lu LIMIT 1), @s_lu,
       '活动报名审核：校园科技文化节志愿者招募', 'pending', '2026-08-16 18:00:00',
       JSON_OBJECT('activityName','校园科技文化节志愿者招募','track','展区引导'), '2026-08-02 08:50:00', '2026-08-02 08:50:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM review_task WHERE target_type = 'participation' AND target_id = (SELECT id FROM participation WHERE activity_id = 2 AND student_id = @s_lu LIMIT 1) AND status IN ('pending','processing'));

-- 12. 站内消息：让消息中心拥有来自报名、审核、组队和系统运营的真实上下文。
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT 0, @s_zhang, '欢迎使用易赛通', '你已完成本学期竞赛档案初始化，可以从竞赛中心发现赛事、报名组队并跟踪审核进度。', 1, '2026-08-01 08:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @s_zhang AND title = '欢迎使用易赛通');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT @t_cs, @s_zhang, '数学建模报名审核通过', '“数据远航队”报名信息完整，已通过资格确认，请关注初赛材料准备阶段。', 0, '2026-08-01 12:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @s_zhang AND title = '数学建模报名审核通过');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT 0, @s_zhang, '成果材料已进入审核队列', '校园学习助手原型已提交，审核老师将在 3 个工作日内给出反馈。', 0, '2026-08-02 10:05:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @s_zhang AND title = '成果材料已进入审核队列');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT 0, @s_lu, '收到新的入队申请', '有同学申请加入“校园学习助手原型”招募帖，申请角色为前端开发，请及时处理。', 0, '2026-08-02 10:25:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @s_lu AND title = '收到新的入队申请');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT @t_cs, @s_lu, '人工智能挑战赛报名审核通过', '“智能体实验室”已通过报名审核，可进入原型提交阶段。', 0, '2026-08-01 14:10:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @s_lu AND title = '人工智能挑战赛报名审核通过');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT @t_cs, @s_li, '报名材料需要补充', '数据分析赛道报名已退回，请补充项目应用场景和个人联系方式后再次提交。', 0, '2026-08-02 09:20:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @s_li AND title = '报名材料需要补充');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT @t_cs, @s_wang, '报名审核未通过', '视觉识别赛道报名未通过，请关注后续开放的赛事并完善项目准备。', 1, '2026-08-02 09:25:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @s_wang AND title = '报名审核未通过');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT @t_cs, @s_qian, '优秀作品已入库', '“校园二手循环平台项目书”已通过审核并展示在优秀成果库。', 0, '2026-06-26 09:30:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @s_qian AND title = '优秀作品已入库');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT @t_cs, @s_zhou, '成果材料需要补充', '宿舍共享收纳方案已退回，请补充用户调研记录和尺寸标注后再次提交。', 0, '2026-08-02 11:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @s_zhou AND title = '成果材料需要补充');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT 0, @s_wangwei, '组队申请待处理', '你申请加入校园学习助手团队的请求已送达队长，请留意后续通知。', 0, '2026-08-02 10:25:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @s_wangwei AND title = '组队申请待处理');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT 0, @s_zhou, '本周赛事服务安排', '工业设计大赛作品方向征集已开启，欢迎完善团队与作品方向。', 1, '2026-08-02 09:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @s_zhou AND title = '本周赛事服务安排');

COMMIT;

-- 导入后的核心数据计数，便于人工核对。
SELECT 'competition' AS module, COUNT(*) AS records FROM competition
UNION ALL SELECT 'announcement', COUNT(*) FROM announcement
UNION ALL SELECT 'registration', COUNT(*) FROM registration
UNION ALL SELECT 'team_post', COUNT(*) FROM team_post
UNION ALL SELECT 'team_application', COUNT(*) FROM team_application
UNION ALL SELECT 'submission', COUNT(*) FROM submission
UNION ALL SELECT 'award_proof', COUNT(*) FROM award_proof
UNION ALL SELECT 'competition_stage', COUNT(*) FROM competition_stage
UNION ALL SELECT 'student_stage_progress', COUNT(*) FROM student_stage_progress
UNION ALL SELECT 'participation', COUNT(*) FROM participation
UNION ALL SELECT 'growth_record', COUNT(*) FROM growth_record
UNION ALL SELECT 'review_task', COUNT(*) FROM review_task
UNION ALL SELECT 'message', COUNT(*) FROM message;
