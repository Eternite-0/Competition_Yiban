-- 为林静（202408764220）补充“我的赛事 / 进度跟踪”演示数据。
-- 可重复执行，不会创建重复报名、阶段记录或站内消息。
-- 执行前请先运行 seed-demo-usage.sql。

SET NAMES utf8mb4;
START TRANSACTION;

SET @student_id := (SELECT id FROM `user` WHERE username = '202408764220' AND real_name = '林静' LIMIT 1);
SET @teacher_id := (SELECT id FROM `user` WHERE username = 'teacher1' LIMIT 1);
SET @partner_a := (SELECT id FROM `user` WHERE username = '202408784230' LIMIT 1);
SET @partner_b := (SELECT id FROM `user` WHERE username = '202408784235' LIMIT 1);
SET @c_history := 1;
SET @c_math := 4;
SET @c_ai := (SELECT id FROM competition WHERE name = '2026年校级人工智能应用创新挑战赛' LIMIT 1);
SET @c_design := (SELECT id FROM competition WHERE name = '2026年广东省大学生工业设计大赛' LIMIT 1);
SET @c_code := (SELECT id FROM competition WHERE name = '第九届校园程序设计挑战赛' LIMIT 1);

-- 完整结束的历史赛事。
INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_history, @student_id, '云栖创想队', '创意组', JSON_ARRAY(@student_id, @partner_a), '审核通过', '2026-06-16 10:00:00'
FROM DUAL WHERE @student_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_history AND student_id = @student_id AND team_name = '云栖创想队');

INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_history, '校赛报名', 1, '2026-05-01 09:00:00', '2026-05-20 23:59:59', '完成项目基本信息、团队和赛道确认。', 'closed'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_history AND stage_order = 1);
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_history, '校级答辩', 2, '2026-06-01 09:00:00', '2026-06-10 18:00:00', '完成项目展示、答辩和评审。', 'closed'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_history AND stage_order = 2);
INSERT INTO competition_stage (competition_id, name, stage_order, start_time, end_time, description, status)
SELECT @c_history, '成果归档', 3, '2026-06-11 09:00:00', '2026-06-30 18:00:00', '提交项目书、获奖证明并完成成果归档。', 'closed'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM competition_stage WHERE competition_id = @c_history AND stage_order = 3);

-- 进行中、审核中、待补充的当前赛事。
INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_math, @student_id, '青岚建模队', '数学建模', JSON_ARRAY(@student_id, @partner_a, @partner_b), '审核通过', '2026-08-01 11:10:00'
FROM DUAL WHERE @student_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_math AND student_id = @student_id AND team_name = '青岚建模队');
INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_ai, @student_id, '微光智联队', '智能体应用', JSON_ARRAY(@student_id, @partner_b), '已提交', '2026-08-02 09:30:00'
FROM DUAL WHERE @student_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_ai AND student_id = @student_id AND team_name = '微光智联队');
INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_code, @student_id, '代码引力队', 'Web应用', JSON_ARRAY(@student_id, @partner_a), '审核中', '2026-08-02 10:05:00'
FROM DUAL WHERE @student_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_code AND student_id = @student_id AND team_name = '代码引力队');
INSERT INTO registration (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT @c_design, @student_id, '栖光设计组', '服务设计', JSON_ARRAY(@student_id, @partner_b), '退回补充', '2026-08-02 13:15:00'
FROM DUAL WHERE @student_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM registration WHERE competition_id = @c_design AND student_id = @student_id AND team_name = '栖光设计组');

SET @r_history := (SELECT id FROM registration WHERE competition_id = @c_history AND student_id = @student_id AND team_name = '云栖创想队' ORDER BY id DESC LIMIT 1);
SET @r_math := (SELECT id FROM registration WHERE competition_id = @c_math AND student_id = @student_id AND team_name = '青岚建模队' ORDER BY id DESC LIMIT 1);
SET @r_ai := (SELECT id FROM registration WHERE competition_id = @c_ai AND student_id = @student_id AND team_name = '微光智联队' ORDER BY id DESC LIMIT 1);
SET @r_code := (SELECT id FROM registration WHERE competition_id = @c_code AND student_id = @student_id AND team_name = '代码引力队' ORDER BY id DESC LIMIT 1);
SET @r_design := (SELECT id FROM registration WHERE competition_id = @c_design AND student_id = @student_id AND team_name = '栖光设计组' ORDER BY id DESC LIMIT 1);

SET @history_stage_1 := (SELECT id FROM competition_stage WHERE competition_id = @c_history AND stage_order = 1 LIMIT 1);
SET @history_stage_2 := (SELECT id FROM competition_stage WHERE competition_id = @c_history AND stage_order = 2 LIMIT 1);
SET @history_stage_3 := (SELECT id FROM competition_stage WHERE competition_id = @c_history AND stage_order = 3 LIMIT 1);
SET @math_stage_1 := (SELECT id FROM competition_stage WHERE competition_id = @c_math AND stage_order = 1 LIMIT 1);
SET @math_stage_2 := (SELECT id FROM competition_stage WHERE competition_id = @c_math AND stage_order = 2 LIMIT 1);
SET @math_stage_3 := (SELECT id FROM competition_stage WHERE competition_id = @c_math AND stage_order = 3 LIMIT 1);
SET @ai_stage_1 := (SELECT id FROM competition_stage WHERE competition_id = @c_ai AND stage_order = 1 LIMIT 1);
SET @ai_stage_2 := (SELECT id FROM competition_stage WHERE competition_id = @c_ai AND stage_order = 2 LIMIT 1);
SET @ai_stage_3 := (SELECT id FROM competition_stage WHERE competition_id = @c_ai AND stage_order = 3 LIMIT 1);
SET @code_stage_1 := (SELECT id FROM competition_stage WHERE competition_id = @c_code AND stage_order = 1 LIMIT 1);
SET @code_stage_2 := (SELECT id FROM competition_stage WHERE competition_id = @c_code AND stage_order = 2 LIMIT 1);
SET @design_stage_1 := (SELECT id FROM competition_stage WHERE competition_id = @c_design AND stage_order = 1 LIMIT 1);
SET @design_stage_2 := (SELECT id FROM competition_stage WHERE competition_id = @c_design AND stage_order = 2 LIMIT 1);

-- 历史赛事已完成三个阶段。
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time, review_time, review_note, reviewer_id)
SELECT @student_id, @c_history, @history_stage_1, @r_history, 'passed', '2026-05-15 10:00:00', '2026-05-16 14:00:00', '报名信息完整，已进入校级答辩。', @teacher_id
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @history_stage_1);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time, review_time, review_note, reviewer_id)
SELECT @student_id, @c_history, @history_stage_2, @r_history, 'passed', '2026-06-08 13:30:00', '2026-06-10 16:30:00', '答辩表现良好，项目进入成果归档。', @teacher_id
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @history_stage_2);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time, review_time, review_note, reviewer_id)
SELECT @student_id, @c_history, @history_stage_3, @r_history, 'passed', '2026-06-20 10:30:00', '2026-06-25 15:00:00', '项目已完成归档，形成个人参赛成果记录。', @teacher_id
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @history_stage_3);

-- 当前赛事的阶段状态。
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time, review_time, review_note, reviewer_id)
SELECT @student_id, @c_math, @math_stage_1, @r_math, 'passed', '2026-08-01 11:10:00', '2026-08-01 14:00:00', '团队信息已确认，进入材料准备阶段。', @teacher_id
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @math_stage_1);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, review_note)
SELECT @student_id, @c_math, @math_stage_2, @r_math, 'in_progress', '正在整理数据并完善建模方案。'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @math_stage_2);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, review_note)
SELECT @student_id, @c_math, @math_stage_3, @r_math, 'not_started', '完成初赛材料后将进入国赛答辩阶段。'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @math_stage_3);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time, review_note)
SELECT @student_id, @c_ai, @ai_stage_1, @r_ai, 'submitted', '2026-08-02 09:30:00', '报名申请已提交，等待老师审核。'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @ai_stage_1);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, review_note)
SELECT @student_id, @c_ai, @ai_stage_2, @r_ai, 'not_started', '审核通过后可提交项目原型。'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @ai_stage_2);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, review_note)
SELECT @student_id, @c_ai, @ai_stage_3, @r_ai, 'not_started', '原型审核通过后进入现场评审。'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @ai_stage_3);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time, review_note)
SELECT @student_id, @c_code, @code_stage_1, @r_code, 'submitted', '2026-08-02 10:05:00', '已完成在线环境测试，等待报名审核。'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @code_stage_1);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, review_note)
SELECT @student_id, @c_code, @code_stage_2, @r_code, 'not_started', '审核通过后可参加现场挑战。'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @code_stage_2);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, submit_time, review_note, reviewer_id)
SELECT @student_id, @c_design, @design_stage_1, @r_design, 'in_progress', '2026-08-02 13:15:00', '请补充用户调研摘要和团队成员分工后再次提交。', @teacher_id
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @design_stage_1);
INSERT INTO student_stage_progress (student_id, competition_id, stage_id, registration_id, status, review_note)
SELECT @student_id, @c_design, @design_stage_2, @r_design, 'not_started', '报名材料审核通过后进入方案设计阶段。'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_stage_progress WHERE student_id = @student_id AND stage_id = @design_stage_2);

INSERT INTO growth_record (student_id, competition_id, record_type, title, happen_time)
SELECT @student_id, @c_history, 'award', '完成“互联网+”项目答辩并沉淀个人成果档案', '2026-06-25 15:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM growth_record WHERE student_id = @student_id AND competition_id = @c_history AND record_type = 'award');

INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT @teacher_id, @student_id, '数学建模进入材料准备阶段', '“青岚建模队”报名审核已通过，请按阶段要求完成选题、数据收集和论文初稿。', 0, '2026-08-01 14:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @student_id AND title = '数学建模进入材料准备阶段');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT 0, @student_id, 'AI 挑战赛报名已提交', '“微光智联队”的报名已进入审核队列，审核结果会同步到我的赛事与消息中心。', 0, '2026-08-02 09:30:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @student_id AND title = 'AI 挑战赛报名已提交');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT @teacher_id, @student_id, '工业设计报名需要补充材料', '“栖光设计组”报名已退回，请补充用户调研摘要和团队成员分工后再次提交。', 0, '2026-08-02 14:10:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @student_id AND title = '工业设计报名需要补充材料');
INSERT INTO message (from_user, to_user, title, content, is_read, create_time)
SELECT 0, @student_id, '个人赛事工作区已更新', '你当前有 5 场个人赛事：1 场已完成归档、2 场推进中、1 场审核中、1 场等待补充材料。', 0, '2026-08-02 14:30:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM message WHERE to_user = @student_id AND title = '个人赛事工作区已更新');

COMMIT;

SELECT 'registrations' AS module, COUNT(*) AS records FROM registration WHERE student_id = @student_id
UNION ALL SELECT 'stage_progress', COUNT(*) FROM student_stage_progress WHERE student_id = @student_id
UNION ALL SELECT 'messages', COUNT(*) FROM message WHERE to_user = @student_id;
