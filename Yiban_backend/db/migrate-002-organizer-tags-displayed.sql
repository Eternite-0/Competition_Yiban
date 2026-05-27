-- Migration 002: Add organizer/tags to competition; approved/displayed to submission.
-- Idempotent: safe to run multiple times against an existing etsaion database.

USE `etsaion`;

-- --- competition.organizer ---
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'competition' AND COLUMN_NAME = 'organizer'
);
SET @stmt = IF(@col_exists = 0,
  'ALTER TABLE `competition` ADD COLUMN `organizer` VARCHAR(200) NULL COMMENT ''主办单位'' AFTER `content`',
  'SELECT ''competition.organizer already exists'' AS msg');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- --- competition.tags ---
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'competition' AND COLUMN_NAME = 'tags'
);
SET @stmt = IF(@col_exists = 0,
  'ALTER TABLE `competition` ADD COLUMN `tags` VARCHAR(500) NULL COMMENT ''JSON数组 - 赛事标签'' AFTER `organizer`',
  'SELECT ''competition.tags already exists'' AS msg');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- --- submission.approved ---
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'submission' AND COLUMN_NAME = 'approved'
);
SET @stmt = IF(@col_exists = 0,
  'ALTER TABLE `submission` ADD COLUMN `approved` TINYINT NULL COMMENT ''已审核时 1=通过, 0=驳回; 待审核为 NULL'' AFTER `review_note`',
  'SELECT ''submission.approved already exists'' AS msg');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- --- submission.displayed ---
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'submission' AND COLUMN_NAME = 'displayed'
);
SET @stmt = IF(@col_exists = 0,
  'ALTER TABLE `submission` ADD COLUMN `displayed` TINYINT DEFAULT 0 COMMENT ''是否展示在优秀作品墙'' AFTER `approved`',
  'SELECT ''submission.displayed already exists'' AS msg');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- --- Backfill existing data ---
-- Set sample organizer/tags for existing competitions (only if currently NULL)
UPDATE `competition` SET `organizer` = '教育部高等教育司', `tags` = '["创新创业","双创","商业计划"]'
  WHERE `id` = 1 AND `organizer` IS NULL;
UPDATE `competition` SET `organizer` = '教育部高等教育司、工业和信息化部人事教育司', `tags` = '["电子设计","硬件","单片机","PCB"]'
  WHERE `id` = 2 AND `organizer` IS NULL;
UPDATE `competition` SET `organizer` = '工业和信息化部人才交流中心', `tags` = '["程序设计","算法","Java","C++","Python"]'
  WHERE `id` = 3 AND `organizer` IS NULL;
UPDATE `competition` SET `organizer` = '中国工业与应用数学学会', `tags` = '["数学建模","MATLAB","Python","学术写作"]'
  WHERE `id` = 4 AND `organizer` IS NULL;
UPDATE `competition` SET `organizer` = '中国艺术设计联合会', `tags` = '["艺术设计","UI","视觉","3D建模"]'
  WHERE `id` = 5 AND `organizer` IS NULL;
UPDATE `competition` SET `organizer` = '校教务处与团委', `tags` = '["校内","选拔","创意"]'
  WHERE `id` = 6 AND `organizer` IS NULL;

-- Mark all previously 已审核 submissions as approved=1 (legacy data had no rejection state)
UPDATE `submission` SET `approved` = 1 WHERE `status` = '已审核' AND `approved` IS NULL;

-- Showcase a few approved submissions as "excellent" (only if displayed not yet flipped)
UPDATE `submission` SET `displayed` = 1
  WHERE `id` IN (1, 2, 4, 6, 10) AND `approved` = 1 AND `displayed` = 0;
