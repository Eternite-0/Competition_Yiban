USE `etsaion`;

-- ============================================================
-- migrate-006: Backfill review_task for historical data
-- Idempotent: uses INSERT IGNORE on UNIQUE KEY (target_type, target_id, status)
-- ============================================================

-- 1. Pending registrations (已提交 / 审核中) → pending review_task
INSERT IGNORE INTO `review_task`
  (`activity_type`, `activity_id`, `target_type`, `target_id`, `submitter_id`,
   `title`, `status`, `deadline`, `payload_json`, `create_time`, `update_time`)
SELECT
  'competition',
  r.competition_id,
  'registration',
  r.id,
  r.student_id,
  CONCAT('赛事报名审核：', IFNULL(c.name, '未知赛事')),
  'pending',
  c.end_time,
  JSON_OBJECT(
    'competitionName', IFNULL(c.name, ''),
    'teamName', IFNULL(r.team_name, ''),
    'track', IFNULL(r.track, '')
  ),
  r.submit_date,
  r.submit_date
FROM `registration` r
LEFT JOIN `competition` c ON c.id = r.competition_id
WHERE r.status IN ('已提交', '审核中');

-- 2. Resolved registrations (审核通过 / 审核驳回 / 退回补充) → resolved review_task
INSERT IGNORE INTO `review_task`
  (`activity_type`, `activity_id`, `target_type`, `target_id`, `submitter_id`,
   `title`, `status`, `deadline`, `payload_json`, `create_time`, `update_time`)
SELECT
  'competition',
  r.competition_id,
  'registration',
  r.id,
  r.student_id,
  CONCAT('赛事报名审核：', IFNULL(c.name, '未知赛事')),
  'resolved',
  c.end_time,
  JSON_OBJECT(
    'competitionName', IFNULL(c.name, ''),
    'teamName', IFNULL(r.team_name, ''),
    'track', IFNULL(r.track, '')
  ),
  r.submit_date,
  r.submit_date
FROM `registration` r
LEFT JOIN `competition` c ON c.id = r.competition_id
WHERE r.status IN ('审核通过', '审核驳回', '退回补充');

-- 3. Pending submissions (待审核) → pending review_task
INSERT IGNORE INTO `review_task`
  (`activity_type`, `activity_id`, `target_type`, `target_id`, `submitter_id`,
   `title`, `status`, `deadline`, `payload_json`, `create_time`, `update_time`)
SELECT
  'competition',
  COALESCE(s.competition_id, r.competition_id),
  'submission',
  s.id,
  s.submitter_id,
  CONCAT('成果审核：', IFNULL(c.name, '未知赛事')),
  'pending',
  c.competition_end,
  JSON_OBJECT(
    'competitionName', IFNULL(c.name, ''),
    'fileName', IFNULL(s.file_name, ''),
    'registrationId', s.registration_id
  ),
  s.upload_date,
  s.upload_date
FROM `submission` s
LEFT JOIN `registration` r ON r.id = s.registration_id
LEFT JOIN `competition` c ON c.id = COALESCE(s.competition_id, r.competition_id)
WHERE s.status = '待审核';

-- 4. Resolved submissions (已审核) → resolved review_task
INSERT IGNORE INTO `review_task`
  (`activity_type`, `activity_id`, `target_type`, `target_id`, `submitter_id`,
   `title`, `status`, `deadline`, `payload_json`, `create_time`, `update_time`)
SELECT
  'competition',
  COALESCE(s.competition_id, r.competition_id),
  'submission',
  s.id,
  s.submitter_id,
  CONCAT('成果审核：', IFNULL(c.name, '未知赛事')),
  'resolved',
  c.competition_end,
  JSON_OBJECT(
    'competitionName', IFNULL(c.name, ''),
    'fileName', IFNULL(s.file_name, ''),
    'registrationId', s.registration_id
  ),
  s.upload_date,
  s.upload_date
FROM `submission` s
LEFT JOIN `registration` r ON r.id = s.registration_id
LEFT JOIN `competition` c ON c.id = COALESCE(s.competition_id, r.competition_id)
WHERE s.status = '已审核';
