USE `etsaion`;

-- Add grade (enrollment year) column to user table
SET @db_name := DATABASE();
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'user' AND COLUMN_NAME = 'grade'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE `user` ADD COLUMN `grade` varchar(10) DEFAULT NULL COMMENT ''年级(入学年份)'' AFTER `class_name`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill grade from student ID prefix (e.g., 20230101 -> 2023)
UPDATE `user` SET `grade` = LEFT(`username`, 4) WHERE `role` = 'student' AND `username` REGEXP '^[0-9]{4}';
