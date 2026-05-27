-- Add tracks column to competition table
ALTER TABLE `competition` ADD COLUMN `tracks` varchar(1000) DEFAULT NULL COMMENT 'JSON数组 - 赛道列表' AFTER `tags`;
