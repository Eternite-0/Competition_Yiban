USE `etsaion`;

-- Add grade (enrollment year) column to user table
ALTER TABLE `user` ADD COLUMN `grade` varchar(10) DEFAULT NULL COMMENT '年级(入学年份)' AFTER `class_name`;

-- Backfill grade from student ID prefix (e.g., 20230101 -> 2023)
UPDATE `user` SET `grade` = LEFT(`username`, 4) WHERE `role` = 'student' AND `username` REGEXP '^[0-9]{4}';
