-- 本地演示数据：扩充三端的报名、审核、成果与获奖统计。
-- 仅用于本地演示，不代表真实业务数据；报名和组队记录保留“演示·”标记，成果文件名不再添加该前缀。
-- 可重复执行。清理请执行 cleanup-demo-scale.sql。

SET NAMES utf8mb4;
SET autocommit = 1;

CREATE TABLE IF NOT EXISTS demo_data_registry (
  id BIGINT NOT NULL AUTO_INCREMENT,
  batch_key VARCHAR(80) NOT NULL,
  table_name VARCHAR(80) NOT NULL,
  record_id BIGINT NOT NULL,
  business_key VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_demo_record (batch_key, table_name, record_id),
  KEY idx_demo_batch (batch_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @demo_batch := 'demo-scale-20260819';

DROP TEMPORARY TABLE IF EXISTS demo_competitions;
CREATE TEMPORARY TABLE demo_competitions (
  slot_no INT NOT NULL PRIMARY KEY,
  competition_id BIGINT NOT NULL
);

INSERT INTO demo_competitions (slot_no, competition_id)
SELECT ROW_NUMBER() OVER (ORDER BY id), id
FROM competition
WHERE status IN ('published', 'closed')
ORDER BY id
LIMIT 6;

-- 1. 为约 80% 的学生生成 6 个赛事方向的报名记录，覆盖多种审核状态。
-- 按赛事逐批提交，避免一次性大事务让本地 MySQL 连接超时。
INSERT INTO registration
  (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT
  c.competition_id,
  u.id,
  CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id),
  CONCAT('演示赛道', c.slot_no),
  JSON_ARRAY(u.id),
  CASE MOD(u.id + c.slot_no, 10)
    WHEN 0 THEN '审核中'
    WHEN 1 THEN '审核中'
    WHEN 2 THEN '审核通过'
    WHEN 3 THEN '审核通过'
    WHEN 4 THEN '审核通过'
    WHEN 5 THEN '已提交'
    WHEN 6 THEN '退回补充'
    ELSE '已提交'
  END,
  DATE_SUB('2026-08-19 12:00:00', INTERVAL MOD(u.id * 13 + c.slot_no * 7, 120) DAY)
FROM `user` u
JOIN demo_competitions c ON c.slot_no = 1
WHERE u.role = 'student'
  AND u.status = 'active'
  AND MOD(u.id, 10) < 8
  AND NOT EXISTS (
    SELECT 1 FROM registration r
    WHERE r.competition_id = c.competition_id
      AND r.student_id = u.id
      AND r.team_name = CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id)
  );
INSERT INTO registration
  (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT
  c.competition_id, u.id,
  CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id),
  CONCAT('演示赛道', c.slot_no), JSON_ARRAY(u.id),
  CASE MOD(u.id + c.slot_no, 10)
    WHEN 0 THEN '审核中' WHEN 1 THEN '审核中'
    WHEN 2 THEN '审核通过' WHEN 3 THEN '审核通过' WHEN 4 THEN '审核通过'
    WHEN 5 THEN '已提交' WHEN 6 THEN '退回补充' ELSE '已提交'
  END,
  DATE_SUB('2026-08-19 12:00:00', INTERVAL MOD(u.id * 13 + c.slot_no * 7, 120) DAY)
FROM `user` u
JOIN demo_competitions c ON c.slot_no = 2
WHERE u.role = 'student' AND u.status = 'active' AND MOD(u.id, 10) < 8
  AND NOT EXISTS (SELECT 1 FROM registration r WHERE r.competition_id = c.competition_id AND r.student_id = u.id AND r.team_name = CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id));
INSERT INTO registration
  (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT
  c.competition_id, u.id,
  CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id),
  CONCAT('演示赛道', c.slot_no), JSON_ARRAY(u.id),
  CASE MOD(u.id + c.slot_no, 10)
    WHEN 0 THEN '审核中' WHEN 1 THEN '审核中'
    WHEN 2 THEN '审核通过' WHEN 3 THEN '审核通过' WHEN 4 THEN '审核通过'
    WHEN 5 THEN '已提交' WHEN 6 THEN '退回补充' ELSE '已提交'
  END,
  DATE_SUB('2026-08-19 12:00:00', INTERVAL MOD(u.id * 13 + c.slot_no * 7, 120) DAY)
FROM `user` u
JOIN demo_competitions c ON c.slot_no = 3
WHERE u.role = 'student' AND u.status = 'active' AND MOD(u.id, 10) < 8
  AND NOT EXISTS (SELECT 1 FROM registration r WHERE r.competition_id = c.competition_id AND r.student_id = u.id AND r.team_name = CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id));
INSERT INTO registration
  (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT
  c.competition_id, u.id,
  CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id),
  CONCAT('演示赛道', c.slot_no), JSON_ARRAY(u.id),
  CASE MOD(u.id + c.slot_no, 10)
    WHEN 0 THEN '审核中' WHEN 1 THEN '审核中'
    WHEN 2 THEN '审核通过' WHEN 3 THEN '审核通过' WHEN 4 THEN '审核通过'
    WHEN 5 THEN '已提交' WHEN 6 THEN '退回补充' ELSE '已提交'
  END,
  DATE_SUB('2026-08-19 12:00:00', INTERVAL MOD(u.id * 13 + c.slot_no * 7, 120) DAY)
FROM `user` u
JOIN demo_competitions c ON c.slot_no = 4
WHERE u.role = 'student' AND u.status = 'active' AND MOD(u.id, 10) < 8
  AND NOT EXISTS (SELECT 1 FROM registration r WHERE r.competition_id = c.competition_id AND r.student_id = u.id AND r.team_name = CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id));
INSERT INTO registration
  (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT
  c.competition_id, u.id,
  CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id),
  CONCAT('演示赛道', c.slot_no), JSON_ARRAY(u.id),
  CASE MOD(u.id + c.slot_no, 10)
    WHEN 0 THEN '审核中' WHEN 1 THEN '审核中'
    WHEN 2 THEN '审核通过' WHEN 3 THEN '审核通过' WHEN 4 THEN '审核通过'
    WHEN 5 THEN '已提交' WHEN 6 THEN '退回补充' ELSE '已提交'
  END,
  DATE_SUB('2026-08-19 12:00:00', INTERVAL MOD(u.id * 13 + c.slot_no * 7, 120) DAY)
FROM `user` u
JOIN demo_competitions c ON c.slot_no = 5
WHERE u.role = 'student' AND u.status = 'active' AND MOD(u.id, 10) < 8
  AND NOT EXISTS (SELECT 1 FROM registration r WHERE r.competition_id = c.competition_id AND r.student_id = u.id AND r.team_name = CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id));
INSERT INTO registration
  (competition_id, student_id, team_name, track, member_student_ids, status, submit_date)
SELECT
  c.competition_id, u.id,
  CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id),
  CONCAT('演示赛道', c.slot_no), JSON_ARRAY(u.id),
  CASE MOD(u.id + c.slot_no, 10)
    WHEN 0 THEN '审核中' WHEN 1 THEN '审核中'
    WHEN 2 THEN '审核通过' WHEN 3 THEN '审核通过' WHEN 4 THEN '审核通过'
    WHEN 5 THEN '已提交' WHEN 6 THEN '退回补充' ELSE '已提交'
  END,
  DATE_SUB('2026-08-19 12:00:00', INTERVAL MOD(u.id * 13 + c.slot_no * 7, 120) DAY)
FROM `user` u
JOIN demo_competitions c ON c.slot_no = 6
WHERE u.role = 'student' AND u.status = 'active' AND MOD(u.id, 10) < 8
  AND NOT EXISTS (SELECT 1 FROM registration r WHERE r.competition_id = c.competition_id AND r.student_id = u.id AND r.team_name = CONCAT('演示·', LPAD(c.slot_no, 2, '0'), '·', u.id));

INSERT INTO demo_data_registry (batch_key, table_name, record_id, business_key)
SELECT @demo_batch, 'registration', r.id, r.team_name
FROM registration r
WHERE r.team_name LIKE '演示·%'
  AND NOT EXISTS (
    SELECT 1 FROM demo_data_registry d
    WHERE d.batch_key = @demo_batch AND d.table_name = 'registration' AND d.record_id = r.id
  );

-- 2. 为部分已提交/审核中的报名补充成果，形成审核与获奖看板数据。
INSERT INTO submission
  (registration_id, competition_id, submitter_id, file_name, file_url, file_size, upload_date, status, review_note, approved, displayed)
SELECT
  r.id,
  r.competition_id,
  r.student_id,
   CONCAT(REGEXP_REPLACE(r.team_name, '^演示·', ''), '·成果材料.pdf'),
  CASE MOD(r.id, 4)
    WHEN 0 THEN '/api/file/serve/demo-ai-lu.pdf'
    WHEN 1 THEN '/api/file/serve/demo-design-zhou.pdf'
    WHEN 2 THEN '/api/file/serve/demo-market-qian.pdf'
    ELSE '/api/file/serve/demo-math-zhang.pdf'
  END,
  1800000 + MOD(r.id * 97, 2600000),
  DATE_ADD(r.submit_date, INTERVAL MOD(r.id, 4) DAY),
  CASE WHEN MOD(r.id, 7) = 0 THEN '待审核' ELSE '已审核' END,
  CASE WHEN MOD(r.id, 7) = 0 THEN NULL ELSE '演示数据：材料信息完整，已完成阶段性审核。' END,
  CASE WHEN MOD(r.id, 7) = 0 THEN NULL WHEN MOD(r.id, 5) IN (0, 1) THEN 0 ELSE 1 END,
  CASE WHEN MOD(r.id, 5) IN (2, 3, 4) THEN 1 ELSE 0 END
FROM registration r
WHERE r.team_name LIKE '演示·%'
  AND r.status IN ('审核中', '审核通过', '已提交')
  AND MOD(r.id, 3) = 0
  AND NOT EXISTS (
    SELECT 1 FROM submission s
    WHERE s.registration_id = r.id AND s.file_url LIKE '/api/file/serve/demo-%'
  );

INSERT INTO demo_data_registry (batch_key, table_name, record_id, business_key)
SELECT @demo_batch, 'submission', s.id, s.file_name
FROM submission s
 JOIN demo_data_registry dr
   ON dr.batch_key = @demo_batch
  AND dr.table_name = 'registration'
  AND dr.record_id = s.registration_id
 WHERE s.file_url LIKE '/api/file/serve/demo-%'
  AND NOT EXISTS (
    SELECT 1 FROM demo_data_registry d
    WHERE d.batch_key = @demo_batch AND d.table_name = 'submission' AND d.record_id = s.id
  );

-- 3. 将一部分已审核成果包装为演示获奖证明，供管理员成果库和教师统计展示。
INSERT INTO award_proof
  (submitter_id, competition_id, competition_name, award_level, award_time, organizer, winner_name,
   certificate_no, seal_text, file_name, file_url, file_hash, confidence, status, review_note,
   reviewer_id, review_time)
SELECT
  s.submitter_id,
  s.competition_id,
  c.name,
  CASE MOD(s.id, 4) WHEN 0 THEN '校级一等奖' WHEN 1 THEN '校级二等奖' WHEN 2 THEN '优秀奖' ELSE '入围奖' END,
  DATE_ADD(s.upload_date, INTERVAL 8 DAY),
  COALESCE(c.organizer, '演示赛事组委会'),
  u.real_name,
  CONCAT('DEMO-', s.id),
  '本地演示数据',
   CONCAT(s.file_name, '·获奖证明.pdf'),
  CASE MOD(s.id, 4)
    WHEN 0 THEN '/api/file/serve/demo-award-ai.pdf'
    WHEN 1 THEN '/api/file/serve/demo-award-art.pdf'
    WHEN 2 THEN '/api/file/serve/demo-award-iot.pdf'
    ELSE '/api/file/serve/demo-award-zhang.pdf'
  END,
  SHA2(CONCAT('demo-award-', s.id), 256),
  0.93,
  'approved',
  '演示数据：证书信息已完成模拟审核。',
  (SELECT id FROM `user` WHERE username = 'teacher1' LIMIT 1),
  DATE_ADD(s.upload_date, INTERVAL 10 DAY)
FROM submission s
JOIN competition c ON c.id = s.competition_id
JOIN `user` u ON u.id = s.submitter_id
 JOIN demo_data_registry ds
   ON ds.batch_key = @demo_batch
  AND ds.table_name = 'submission'
  AND ds.record_id = s.id
 WHERE s.file_url LIKE '/api/file/serve/demo-%'
   AND s.approved = 1
  AND MOD(s.id, 4) = 0
  AND NOT EXISTS (SELECT 1 FROM award_proof a WHERE a.file_hash = SHA2(CONCAT('demo-award-', s.id), 256));

INSERT INTO award_proof_student (award_proof_id, student_id)
SELECT a.id, a.submitter_id
FROM award_proof a
WHERE a.file_hash LIKE '%'
   AND a.certificate_no REGEXP '^DEMO-[0-9]+$'
  AND NOT EXISTS (
    SELECT 1 FROM award_proof_student x
    WHERE x.award_proof_id = a.id AND x.student_id = a.submitter_id
  );

INSERT INTO demo_data_registry (batch_key, table_name, record_id, business_key)
SELECT @demo_batch, 'award_proof', a.id, a.file_hash
FROM award_proof a
WHERE a.certificate_no REGEXP '^DEMO-[0-9]+$'
  AND NOT EXISTS (
    SELECT 1 FROM demo_data_registry d
    WHERE d.batch_key = @demo_batch AND d.table_name = 'award_proof' AND d.record_id = a.id
  );

-- 4. 为“审核中”的演示报名生成待办任务，充实教师审核中心。
INSERT INTO review_task
  (activity_type, activity_id, target_type, target_id, submitter_id, title, status, deadline, payload_json, create_time, update_time)
SELECT
  'competition', r.competition_id, 'registration', r.id, r.student_id,
  CONCAT('演示报名审核 · ', c.name), 'pending', '2026-09-30 23:59:59',
  JSON_OBJECT('demo', true, 'competitionName', c.name, 'teamName', r.team_name),
  r.submit_date, r.submit_date
FROM registration r
JOIN competition c ON c.id = r.competition_id
WHERE r.team_name LIKE '演示·%'
  AND r.status = '审核中'
  AND NOT EXISTS (
    SELECT 1 FROM review_task t
    WHERE t.target_type = 'registration' AND t.target_id = r.id AND t.status = 'pending'
  );

INSERT INTO demo_data_registry (batch_key, table_name, record_id, business_key)
SELECT @demo_batch, 'review_task', t.id, CAST(t.target_id AS CHAR)
FROM review_task t
WHERE t.title LIKE '演示报名审核 ·%'
  AND NOT EXISTS (
    SELECT 1 FROM demo_data_registry d
    WHERE d.batch_key = @demo_batch AND d.table_name = 'review_task' AND d.record_id = t.id
  );

-- 5. 为学生端组队页补充少量演示招募帖，保持“报名-组队-审核”链路完整。
INSERT INTO team_post (author_id, competition_id, content, roles_needed, date, status)
SELECT
  u.id,
  c.competition_id,
  CONCAT('演示招募：寻找志同道合的同学一起参加 ', comp.name),
  '["产品策划","技术开发","材料撰写"]',
  DATE_SUB('2026-08-19 12:00:00', INTERVAL MOD(u.id, 20) DAY),
  CASE WHEN MOD(u.id, 5) = 0 THEN '已满员' ELSE '招募中' END
FROM `user` u
JOIN demo_competitions c ON c.slot_no = MOD(u.id, 6) + 1
JOIN competition comp ON comp.id = c.competition_id
WHERE u.role = 'student'
  AND u.status = 'active'
  AND MOD(u.id, 17) = 0
  AND NOT EXISTS (
    SELECT 1 FROM team_post p
    WHERE p.author_id = u.id AND p.competition_id = c.competition_id AND p.content LIKE '演示招募：%'
  );

INSERT INTO demo_data_registry (batch_key, table_name, record_id, business_key)
SELECT @demo_batch, 'team_post', p.id, p.content
FROM team_post p
WHERE p.content LIKE '演示招募：%'
  AND NOT EXISTS (
    SELECT 1 FROM demo_data_registry d
    WHERE d.batch_key = @demo_batch AND d.table_name = 'team_post' AND d.record_id = p.id
  );

SELECT 'demo-scale' AS batch_key,
       (SELECT COUNT(*) FROM registration WHERE team_name LIKE '演示·%') AS demo_registrations,
       (SELECT COUNT(*) FROM demo_data_registry WHERE batch_key = @demo_batch AND table_name = 'submission') AS demo_submissions,
       (SELECT COUNT(*) FROM demo_data_registry WHERE batch_key = @demo_batch AND table_name = 'award_proof') AS demo_awards,
       (SELECT COUNT(*) FROM review_task WHERE title LIKE '演示报名审核 ·%') AS demo_review_tasks,
       (SELECT COUNT(*) FROM team_post WHERE content LIKE '演示招募：%') AS demo_team_posts;
