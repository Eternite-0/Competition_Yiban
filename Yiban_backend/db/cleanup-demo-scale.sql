-- 清理 seed-demo-scale.sql 生成的本地演示数据，不影响真实业务记录。
SET NAMES utf8mb4;
SET autocommit = 1;

SET @demo_batch := 'demo-scale-20260819';

-- 先按批次登记表删除，避免客户端编码异常时仅靠中文前缀匹配失败。
DELETE aps
FROM award_proof_student aps
JOIN demo_data_registry d
  ON d.table_name = 'award_proof'
 AND d.record_id = aps.award_proof_id
WHERE d.batch_key = @demo_batch;

DELETE a
FROM award_proof a
JOIN demo_data_registry d
  ON d.table_name = 'award_proof'
 AND d.record_id = a.id
WHERE d.batch_key = @demo_batch;

DELETE s
FROM submission s
JOIN demo_data_registry d
  ON d.table_name = 'submission'
 AND d.record_id = s.id
WHERE d.batch_key = @demo_batch;

DELETE t
FROM review_task t
JOIN demo_data_registry d
  ON d.table_name = 'review_task'
 AND d.record_id = t.id
WHERE d.batch_key = @demo_batch;

DELETE p
FROM team_post p
JOIN demo_data_registry d
  ON d.table_name = 'team_post'
 AND d.record_id = p.id
WHERE d.batch_key = @demo_batch;

DELETE r
FROM registration r
JOIN demo_data_registry d
  ON d.table_name = 'registration'
 AND d.record_id = r.id
WHERE d.batch_key = @demo_batch;

DELETE FROM demo_data_registry WHERE batch_key = @demo_batch;

-- 清理因脚本中途终止而尚未登记的同批次记录。
DELETE aps
FROM award_proof_student aps
JOIN award_proof a ON a.id = aps.award_proof_id
WHERE a.certificate_no REGEXP '^DEMO-[0-9]+$';
DELETE FROM award_proof
WHERE certificate_no REGEXP '^DEMO-[0-9]+$';
DELETE s
FROM submission s
JOIN registration r ON r.id = s.registration_id
WHERE r.team_name LIKE '演示·%'
  AND s.file_url LIKE '/api/file/serve/demo-%';
DELETE FROM review_task WHERE title LIKE '演示报名审核 ·%';
DELETE FROM team_post WHERE content LIKE '演示招募：%';
DELETE FROM registration WHERE team_name LIKE '演示·%';

SELECT 'demo-scale-cleaned' AS status,
       (SELECT COUNT(*) FROM registration WHERE team_name LIKE '演示·%') AS demo_registrations,
       (SELECT COUNT(*) FROM submission WHERE file_url LIKE '/api/file/serve/demo-%') AS demo_submissions,
       (SELECT COUNT(*) FROM award_proof WHERE file_url LIKE '/api/file/serve/demo-award-%') AS demo_awards,
       (SELECT COUNT(*) FROM review_task WHERE title LIKE '演示报名审核 ·%') AS demo_review_tasks,
       (SELECT COUNT(*) FROM team_post WHERE content LIKE '演示招募：%') AS demo_team_posts;
