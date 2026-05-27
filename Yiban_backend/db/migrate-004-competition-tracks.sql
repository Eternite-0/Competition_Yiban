USE `etsaion`;

-- Add tracks column to competition table（幂等）
SET @db_name := DATABASE();
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'competition' AND COLUMN_NAME = 'tracks'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE `competition` ADD COLUMN `tracks` varchar(1000) DEFAULT NULL COMMENT ''JSON数组 - 赛道列表'' AFTER `tags`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
