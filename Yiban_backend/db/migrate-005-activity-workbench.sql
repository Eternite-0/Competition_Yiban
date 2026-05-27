USE `etsaion`;

SET @db_name := DATABASE();

-- registration 扩展字段：赛道与团队成员
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'registration' AND COLUMN_NAME = 'track'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE `registration` ADD COLUMN `track` varchar(100) DEFAULT NULL COMMENT ''参赛赛道'' AFTER `team_name`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'registration' AND COLUMN_NAME = 'member_student_ids'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE `registration` ADD COLUMN `member_student_ids` varchar(1000) DEFAULT NULL COMMENT ''JSON数组 - 团队成员学生ID'' AFTER `track`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 统一活动表
CREATE TABLE IF NOT EXISTS `activity` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `type` varchar(30) NOT NULL DEFAULT 'competition' COMMENT 'competition/volunteer',
  `title` varchar(200) NOT NULL,
  `level` varchar(20) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `organizer` varchar(200) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL COMMENT '报名开始',
  `end_time` datetime DEFAULT NULL COMMENT '报名截止',
  `activity_start` datetime DEFAULT NULL,
  `activity_end` datetime DEFAULT NULL,
  `max_team_size` int DEFAULT '1',
  `max_participants` int DEFAULT NULL,
  `cover_url` varchar(500) DEFAULT NULL,
  `content` text,
  `tags` varchar(500) DEFAULT NULL COMMENT 'JSON数组 - 标签',
  `tracks` varchar(1000) DEFAULT NULL COMMENT 'JSON数组 - 赛道/岗位',
  `location` varchar(200) DEFAULT NULL,
  `service_hours` decimal(6,2) DEFAULT NULL COMMENT '志愿服务时长',
  `status` varchar(20) DEFAULT 'draft' COMMENT 'draft/published/closed/archived',
  `config_json` text COMMENT '活动差异化配置',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type_status` (`type`, `status`),
  KEY `idx_end_time` (`end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统一活动表';

-- 统一活动参与记录表
CREATE TABLE IF NOT EXISTS `participation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activity_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  `team_name` varchar(100) DEFAULT NULL,
  `track` varchar(100) DEFAULT NULL,
  `member_student_ids` varchar(1000) DEFAULT NULL COMMENT 'JSON数组 - 团队成员学生ID',
  `metadata_json` text COMMENT '志愿岗位、地点、签到等扩展信息',
  `status` varchar(20) DEFAULT 'submitted' COMMENT 'submitted/in_review/approved/rejected/returned/cancelled',
  `submit_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `review_note` varchar(500) DEFAULT NULL,
  `reviewer_id` bigint DEFAULT NULL,
  `review_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_activity_student` (`activity_id`, `student_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统一活动参与记录表';

-- 统一审核待办表
CREATE TABLE IF NOT EXISTS `review_task` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activity_type` varchar(30) DEFAULT 'competition',
  `activity_id` bigint DEFAULT NULL,
  `target_type` varchar(30) NOT NULL COMMENT 'registration/submission/participation',
  `target_id` bigint NOT NULL,
  `submitter_id` bigint DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `status` varchar(20) DEFAULT 'pending' COMMENT 'pending/processing/resolved',
  `review_note` varchar(500) DEFAULT NULL,
  `reviewer_id` bigint DEFAULT NULL,
  `deadline` datetime DEFAULT NULL,
  `payload_json` text,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_target_open` (`target_type`, `target_id`, `status`),
  KEY `idx_status_deadline` (`status`, `deadline`),
  KEY `idx_activity_type` (`activity_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统一审核待办表';
