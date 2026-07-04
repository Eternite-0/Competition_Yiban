-- =============================================
-- 注册系统迁移脚本
-- 创建时间: 2026-05-30
-- 说明: 新增专业表、班级表、花名册表，User 表添加 status 字段
-- =============================================

USE `etsaion`;

-- ----------------------------
-- 1. 专业表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `major` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '专业名称',
  `college` varchar(100) NOT NULL COMMENT '所属学院',
  `status` varchar(20) DEFAULT 'active' COMMENT 'active/inactive',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_college` (`college`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专业表';

-- ----------------------------
-- 2. 班级表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `class_info` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT '班级名称',
  `college` varchar(100) NOT NULL COMMENT '所属学院',
  `major_id` bigint DEFAULT NULL COMMENT '关联专业ID',
  `grade` varchar(10) DEFAULT NULL COMMENT '年级(入学年份)',
  `status` varchar(20) DEFAULT 'active' COMMENT 'active/inactive',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_major` (`major_id`),
  KEY `idx_college` (`college`),
  KEY `idx_grade` (`grade`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_class_major` FOREIGN KEY (`major_id`) REFERENCES `major` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级表';

-- ----------------------------
-- 3. 学生花名册表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `student_roster` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_no` varchar(50) NOT NULL COMMENT '学号',
  `real_name` varchar(50) NOT NULL COMMENT '姓名',
  `college` varchar(100) DEFAULT NULL COMMENT '学院',
  `major_id` bigint DEFAULT NULL COMMENT '关联专业ID',
  `class_id` bigint DEFAULT NULL COMMENT '关联班级ID',
  `grade` varchar(10) DEFAULT NULL COMMENT '年级(入学年份)',
  `status` varchar(20) DEFAULT 'pending' COMMENT 'pending(未注册)/registered(已注册)',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_no` (`student_no`),
  KEY `idx_major` (`major_id`),
  KEY `idx_class` (`class_id`),
  KEY `idx_grade` (`grade`),
  KEY `idx_status` (`status`),
  KEY `idx_college` (`college`),
  CONSTRAINT `fk_roster_major` FOREIGN KEY (`major_id`) REFERENCES `major` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_roster_class` FOREIGN KEY (`class_id`) REFERENCES `class_info` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生花名册表';

-- ----------------------------
-- 4. User 表添加 status 字段
-- ----------------------------
SET @user_status_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user'
    AND COLUMN_NAME = 'status'
);
SET @user_status_sql := IF(
  @user_status_exists = 0,
  'ALTER TABLE `user` ADD COLUMN `status` varchar(20) DEFAULT ''active'' COMMENT ''active/pending_approval/rejected'' AFTER `grade`',
  'SELECT 1'
);
PREPARE user_status_stmt FROM @user_status_sql;
EXECUTE user_status_stmt;
DEALLOCATE PREPARE user_status_stmt;

-- 回填现有用户状态
UPDATE `user` SET `status` = 'active' WHERE `status` IS NULL;

-- ----------------------------
-- 5. 种子数据：从现有 user 表提取专业和班级数据
-- ----------------------------

-- 提取专业数据
INSERT IGNORE INTO `major` (`name`, `college`, `status`)
SELECT DISTINCT `major`, `college`, 'active'
FROM `user`
WHERE `role` = 'student' AND `major` IS NOT NULL AND `major` != '';

-- 提取班级数据（关联专业）
INSERT IGNORE INTO `class_info` (`name`, `college`, `major_id`, `grade`, `status`)
SELECT DISTINCT u.`class_name`, u.`college`, m.`id`, u.`grade`, 'active'
FROM `user` u
LEFT JOIN `major` m ON u.`major` = m.`name` AND u.`college` = m.`college`
WHERE u.`role` = 'student' AND u.`class_name` IS NOT NULL AND u.`class_name` != '';

-- 将现有学生数据回填到花名册（标记为已注册）
INSERT IGNORE INTO `student_roster` (`student_no`, `real_name`, `college`, `major_id`, `class_id`, `grade`, `status`)
SELECT u.`username`, u.`real_name`, u.`college`, m.`id`, c.`id`, u.`grade`, 'registered'
FROM `user` u
LEFT JOIN `major` m ON u.`major` = m.`name` AND u.`college` = m.`college`
LEFT JOIN `class_info` c ON u.`class_name` = c.`name` AND u.`college` = c.`college` AND u.`grade` = c.`grade`
WHERE u.`role` = 'student';

-- 验证迁移
SELECT 'major' AS table_name, COUNT(*) AS row_count FROM `major`
UNION ALL
SELECT 'class_info', COUNT(*) FROM `class_info`
UNION ALL
SELECT 'student_roster', COUNT(*) FROM `student_roster`
UNION ALL
SELECT 'user (with status)', COUNT(*) FROM `user` WHERE `status` IS NOT NULL;
