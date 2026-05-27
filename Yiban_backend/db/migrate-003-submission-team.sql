USE `etsaion`;

-- 1. submission 表新增字段（幂等）
SET @db_name := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'submission' AND COLUMN_NAME = 'competition_id'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE `submission` ADD COLUMN `competition_id` bigint DEFAULT NULL COMMENT ''关联赛事ID（独立提交时使用）'' AFTER `registration_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'submission' AND COLUMN_NAME = 'submitter_id'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE `submission` ADD COLUMN `submitter_id` bigint DEFAULT NULL COMMENT ''实际上传者的学生ID'' AFTER `competition_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 成果-学生关联表（支持队长代传）
CREATE TABLE IF NOT EXISTS `submission_student` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `submission_id` bigint NOT NULL COMMENT '成果附件ID',
  `student_id` bigint NOT NULL COMMENT '关联学生ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sub_student` (`submission_id`, `student_id`),
  KEY `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成果-学生关联表（支持团队提交）';

-- 3. 给已有数据回填 competition_id 和 submitter_id
UPDATE `submission` s
  LEFT JOIN `registration` r ON s.registration_id = r.id
SET s.competition_id = r.competition_id,
    s.submitter_id = r.student_id
WHERE s.registration_id IS NOT NULL AND s.competition_id IS NULL;
