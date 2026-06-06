-- =============================================
-- AI 能力增强迁移脚本
-- 创建时间: 2026-06-05
-- 说明: 新增 AI 任务、获奖证明、赛事草稿、采集来源和智能体会话表
-- =============================================

USE `etsaion`;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ----------------------------
-- 1. AI 任务表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `ai_task` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `task_type` varchar(50) NOT NULL COMMENT 'competition_doc_parse/certificate_recognition/crawler_parse/chat',
  `status` varchar(30) NOT NULL DEFAULT 'pending' COMMENT 'pending/running/succeeded/failed/cancelled',
  `source_type` varchar(30) DEFAULT NULL COMMENT 'file/image/url/text/chat',
  `source_url` varchar(1000) DEFAULT NULL,
  `source_hash` varchar(128) DEFAULT NULL,
  `requester_id` bigint DEFAULT NULL,
  `requester_role` varchar(20) DEFAULT NULL,
  `prompt_version` varchar(50) DEFAULT NULL,
  `model_name` varchar(100) DEFAULT 'mimo-v2.5',
  `confidence` decimal(5,4) DEFAULT NULL,
  `raw_result_json` longtext DEFAULT NULL,
  `result_json` longtext DEFAULT NULL,
  `error_message` varchar(1000) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `finish_time` datetime DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_task_status` (`task_type`, `status`),
  KEY `idx_requester` (`requester_id`),
  KEY `idx_source_hash` (`source_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI任务表';

-- ----------------------------
-- 2. 获奖证明表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `award_proof` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ai_task_id` bigint DEFAULT NULL,
  `submitter_id` bigint NOT NULL,
  `competition_id` bigint DEFAULT NULL,
  `competition_name` varchar(200) DEFAULT NULL,
  `award_level` varchar(100) DEFAULT NULL,
  `award_time` datetime DEFAULT NULL,
  `organizer` varchar(200) DEFAULT NULL,
  `winner_name` varchar(100) DEFAULT NULL,
  `certificate_no` varchar(100) DEFAULT NULL,
  `seal_text` varchar(300) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_url` varchar(1000) NOT NULL,
  `file_hash` varchar(128) DEFAULT NULL,
  `confidence` decimal(5,4) DEFAULT NULL,
  `field_confidence_json` longtext DEFAULT NULL,
  `evidence_json` longtext DEFAULT NULL,
  `risk_flags_json` longtext DEFAULT NULL,
  `status` varchar(30) DEFAULT 'pending' COMMENT 'pending/approved/rejected/returned',
  `review_note` varchar(500) DEFAULT NULL,
  `reviewer_id` bigint DEFAULT NULL,
  `review_time` datetime DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_submitter` (`submitter_id`),
  KEY `idx_competition` (`competition_id`),
  KEY `idx_status` (`status`),
  KEY `idx_file_hash` (`file_hash`),
  KEY `idx_ai_task` (`ai_task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='获奖证明表';

-- ----------------------------
-- 3. 获奖证明学生关联表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `award_proof_student` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `award_proof_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_award_student` (`award_proof_id`, `student_id`),
  KEY `idx_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='获奖证明学生关联表';

-- ----------------------------
-- 4. AI 赛事草稿表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `ai_competition_draft` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ai_task_id` bigint DEFAULT NULL,
  `competition_id` bigint DEFAULT NULL COMMENT '确认保存后关联competition',
  `source_type` varchar(30) DEFAULT NULL,
  `source_url` varchar(1000) DEFAULT NULL,
  `source_title` varchar(300) DEFAULT NULL,
  `name` varchar(200) DEFAULT NULL,
  `level` varchar(20) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `organizer` varchar(200) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `competition_start` datetime DEFAULT NULL,
  `competition_end` datetime DEFAULT NULL,
  `max_team_size` int DEFAULT 1,
  `cover_url` varchar(500) DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `tags` varchar(500) DEFAULT NULL,
  `tracks` varchar(1000) DEFAULT NULL,
  `stages_json` longtext DEFAULT NULL,
  `field_confidence_json` longtext DEFAULT NULL,
  `evidence_json` longtext DEFAULT NULL,
  `risk_flags_json` longtext DEFAULT NULL,
  `duplicate_competition_id` bigint DEFAULT NULL,
  `duplicate_score` decimal(5,4) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'pending_review' COMMENT 'pending_review/confirmed/ignored/merged',
  `reviewer_id` bigint DEFAULT NULL,
  `review_note` varchar(500) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_ai_task` (`ai_task_id`),
  KEY `idx_competition` (`competition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI赛事草稿表';

-- ----------------------------
-- 5. 赛事采集来源表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `competition_source` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `url` varchar(1000) NOT NULL,
  `source_type` varchar(30) DEFAULT 'custom' COMMENT 'whitelist/school/government/enterprise/custom',
  `crawl_frequency` varchar(30) DEFAULT 'manual' COMMENT 'manual/daily/weekly',
  `enabled` tinyint DEFAULT 1,
  `last_crawl_time` datetime DEFAULT NULL,
  `last_crawl_status` varchar(30) DEFAULT NULL,
  `last_error_message` varchar(1000) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_enabled` (`enabled`),
  KEY `idx_type` (`source_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='赛事采集来源表';

-- ----------------------------
-- 6. AI 对话会话表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `ai_conversation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `role` varchar(20) NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `last_message_at` datetime DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`, `last_message_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI对话会话表';

-- ----------------------------
-- 7. AI 对话消息表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `ai_message` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `conversation_id` bigint NOT NULL,
  `role` varchar(20) NOT NULL COMMENT 'user/assistant/tool/system',
  `content` longtext NOT NULL,
  `tool_name` varchar(100) DEFAULT NULL,
  `tool_result_json` longtext DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conversation` (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI对话消息表';

-- 验证迁移
SELECT 'ai_task' AS table_name, COUNT(*) AS row_count FROM `ai_task`
UNION ALL
SELECT 'award_proof', COUNT(*) FROM `award_proof`
UNION ALL
SELECT 'award_proof_student', COUNT(*) FROM `award_proof_student`
UNION ALL
SELECT 'ai_competition_draft', COUNT(*) FROM `ai_competition_draft`
UNION ALL
SELECT 'competition_source', COUNT(*) FROM `competition_source`
UNION ALL
SELECT 'ai_conversation', COUNT(*) FROM `ai_conversation`
UNION ALL
SELECT 'ai_message', COUNT(*) FROM `ai_message`;
