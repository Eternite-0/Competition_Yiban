-- Create database if not exists
CREATE DATABASE IF NOT EXISTS `etsaion` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `etsaion`;

-- 强制客户端使用 utf8mb4，防止中文乱码
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '学号/工号',
  `password` varchar(255) NOT NULL,
  `real_name` varchar(50) DEFAULT NULL,
  `role` varchar(20) DEFAULT 'student' COMMENT 'admin/student/teacher',
  `college` varchar(100) DEFAULT NULL,
  `major` varchar(100) DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `grade` varchar(10) DEFAULT NULL COMMENT '年级(入学年份)',
  `status` varchar(20) DEFAULT 'active' COMMENT 'active/pending_approval/rejected',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ----------------------------
-- Table structure for major
-- ----------------------------
DROP TABLE IF EXISTS `major`;
CREATE TABLE `major` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '专业名称',
  `college` varchar(100) NOT NULL COMMENT '所属学院',
  `status` varchar(20) DEFAULT 'active' COMMENT 'active/inactive',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name_college` (`name`, `college`),
  KEY `idx_college` (`college`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专业表';

-- ----------------------------
-- Table structure for class_info
-- ----------------------------
DROP TABLE IF EXISTS `class_info`;
CREATE TABLE `class_info` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT '班级名称',
  `college` varchar(100) NOT NULL COMMENT '所属学院',
  `major_id` bigint DEFAULT NULL COMMENT '关联专业ID',
  `grade` varchar(10) DEFAULT NULL COMMENT '年级(入学年份)',
  `status` varchar(20) DEFAULT 'active' COMMENT 'active/inactive',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name_major_grade` (`name`, `major_id`, `grade`),
  KEY `idx_major` (`major_id`),
  KEY `idx_college` (`college`),
  KEY `idx_grade` (`grade`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_class_major` FOREIGN KEY (`major_id`) REFERENCES `major` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级表';

-- ----------------------------
-- Table structure for student_roster
-- ----------------------------
DROP TABLE IF EXISTS `student_roster`;
CREATE TABLE `student_roster` (
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
-- Table structure for competition
-- ----------------------------
DROP TABLE IF EXISTS `competition`;
CREATE TABLE `competition` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `level` varchar(20) DEFAULT NULL COMMENT '国家级/省级/校级/院级',
  `category` varchar(50) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL COMMENT '报名开始',
  `end_time` datetime DEFAULT NULL COMMENT '报名截止',
  `competition_start` datetime DEFAULT NULL,
  `competition_end` datetime DEFAULT NULL,
  `max_team_size` int DEFAULT '1',
  `cover_url` varchar(500) DEFAULT NULL,
  `source_url` varchar(500) DEFAULT NULL COMMENT '赛事官网/公告链接',
  `content` text COMMENT '富文本赛事简介/要求',
  `organizer` varchar(200) DEFAULT NULL COMMENT '主办单位',
  `tags` varchar(500) DEFAULT NULL COMMENT 'JSON数组 - 赛事标签',
  `tracks` varchar(1000) DEFAULT NULL COMMENT 'JSON数组 - 赛道列表，如["软件开发","AI大模型"]',
  `status` varchar(20) DEFAULT 'draft' COMMENT 'draft/published/closed',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='赛事/竞赛表';

-- ----------------------------
-- Table structure for registration
-- ----------------------------
DROP TABLE IF EXISTS `registration`;
CREATE TABLE `registration` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `competition_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  `team_name` varchar(100) DEFAULT NULL COMMENT '战队名称 (个人赛为空)',
  `track` varchar(100) DEFAULT NULL COMMENT '参赛赛道',
  `member_student_ids` varchar(1000) DEFAULT NULL COMMENT 'JSON数组 - 团队成员学生ID',
  `status` varchar(20) DEFAULT '待完善' COMMENT '待完善/已提交/审核中/审核通过/退回补充/审核驳回',
  `submit_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_competition_id` (`competition_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报名表';

-- ----------------------------
-- Table structure for submission
-- ----------------------------
DROP TABLE IF EXISTS `submission`;
CREATE TABLE `submission` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `registration_id` bigint DEFAULT NULL,
  `competition_id` bigint DEFAULT NULL COMMENT '关联赛事ID（独立提交时使用）',
  `submitter_id` bigint DEFAULT NULL COMMENT '实际上传者的学生ID',
  `file_name` varchar(255) NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `file_size` bigint DEFAULT '0' COMMENT '文件大小 (Bytes)',
  `upload_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) DEFAULT '待审核' COMMENT '待审核/已审核',
  `review_note` varchar(500) DEFAULT NULL COMMENT '教师评语',
  `approved` tinyint DEFAULT NULL COMMENT '已审核时 1=通过, 0=驳回; 待审核为 NULL',
  `displayed` tinyint DEFAULT '0' COMMENT '是否展示在优秀作品墙',
  PRIMARY KEY (`id`),
  KEY `idx_registration_id` (`registration_id`),
  KEY `idx_competition_id` (`competition_id`),
  KEY `idx_submitter_id` (`submitter_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成果附件上传表';

-- ----------------------------
-- Table structure for submission_student
-- ----------------------------
DROP TABLE IF EXISTS `submission_student`;
CREATE TABLE `submission_student` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `submission_id` bigint NOT NULL COMMENT '成果附件ID',
  `student_id` bigint NOT NULL COMMENT '关联学生ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sub_student` (`submission_id`, `student_id`),
  KEY `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成果-学生关联表（支持团队提交）';

-- ----------------------------
-- Table structure for activity
-- ----------------------------
DROP TABLE IF EXISTS `activity`;
CREATE TABLE `activity` (
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

-- ----------------------------
-- Table structure for participation
-- ----------------------------
DROP TABLE IF EXISTS `participation`;
CREATE TABLE `participation` (
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

-- ----------------------------
-- Table structure for review_task
-- ----------------------------
DROP TABLE IF EXISTS `review_task`;
CREATE TABLE `review_task` (
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

-- ----------------------------
-- Table structure for team_post
-- ----------------------------
DROP TABLE IF EXISTS `team_post`;
CREATE TABLE `team_post` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `author_id` bigint NOT NULL COMMENT '发布者/学生ID',
  `competition_id` bigint NOT NULL,
  `content` text COMMENT '招募帖内容',
  `roles_needed` varchar(255) DEFAULT NULL COMMENT 'JSON数组 - 所需角色',
  `date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  `status` varchar(20) DEFAULT '招募中' COMMENT '招募中/已满员',
  PRIMARY KEY (`id`),
  KEY `idx_author_id` (`author_id`),
  KEY `idx_competition_id` (`competition_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组队招募贴表';

-- ----------------------------
-- Table structure for team_application
-- ----------------------------
DROP TABLE IF EXISTS `team_application`;
CREATE TABLE `team_application` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `team_id` bigint NOT NULL COMMENT '关联的招募帖ID',
  `applicant_id` bigint NOT NULL,
  `role` varchar(50) DEFAULT NULL COMMENT '申请角色',
  `reason` varchar(255) DEFAULT NULL COMMENT '申请理由',
  `status` varchar(20) DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组队申请表';

-- ----------------------------
-- Table structure for growth_record
-- ----------------------------
DROP TABLE IF EXISTS `growth_record`;
CREATE TABLE `growth_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `competition_id` bigint NOT NULL,
  `record_type` varchar(20) COMMENT 'competition/award/certificate',
  `title` varchar(200) DEFAULT NULL,
  `happen_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_competition_id` (`competition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成长记录表';

-- ----------------------------
-- Table structure for message
-- ----------------------------
DROP TABLE IF EXISTS `message`;
CREATE TABLE `message` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `from_user` bigint DEFAULT '0' COMMENT '0表示系统',
  `to_user` bigint NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text,
  `is_read` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_to_user` (`to_user`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息表';

-- ----------------------------
-- Table structure for competition_stage
-- ----------------------------
DROP TABLE IF EXISTS `student_stage_progress`;
DROP TABLE IF EXISTS `competition_stage`;
CREATE TABLE `competition_stage` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `competition_id` bigint NOT NULL COMMENT '关联赛事ID',
  `name` varchar(100) NOT NULL COMMENT '阶段名称',
  `stage_order` int NOT NULL DEFAULT 1 COMMENT '阶段排序',
  `start_time` datetime DEFAULT NULL COMMENT '阶段开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '阶段结束时间',
  `description` text COMMENT '阶段说明/材料要求',
  `status` varchar(20) NOT NULL DEFAULT 'upcoming' COMMENT 'upcoming/active/closed',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_competition` (`competition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='赛事阶段表';

-- ----------------------------
-- Table structure for student_stage_progress
-- ----------------------------
CREATE TABLE `student_stage_progress` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL COMMENT '学生ID',
  `competition_id` bigint NOT NULL COMMENT '赛事ID',
  `stage_id` bigint NOT NULL COMMENT '阶段ID',
  `registration_id` bigint DEFAULT NULL COMMENT '关联报名ID',
  `status` varchar(20) NOT NULL DEFAULT 'not_started' COMMENT 'not_started/in_progress/submitted/passed/failed',
  `submit_time` datetime DEFAULT NULL COMMENT '提交时间',
  `review_time` datetime DEFAULT NULL COMMENT '审核时间',
  `review_note` varchar(500) DEFAULT NULL COMMENT '审核意见',
  `reviewer_id` bigint DEFAULT NULL COMMENT '审核人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_stage` (`student_id`, `stage_id`),
  KEY `idx_student_comp` (`student_id`, `competition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生阶段进度表';

-- ----------------------------
-- Table structure for announcement
-- ----------------------------
DROP TABLE IF EXISTS `announcement`;
CREATE TABLE `announcement` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `competition_id` bigint DEFAULT NULL COMMENT '关联赛事ID，NULL表示系统公告',
  `stage_id` bigint DEFAULT NULL COMMENT '关联阶段ID，NULL表示赛事级公告',
  `title` varchar(200) NOT NULL COMMENT '公告标题',
  `content` text NOT NULL COMMENT '公告内容',
  `author_id` bigint NOT NULL COMMENT '发布者ID',
  `type` varchar(20) NOT NULL DEFAULT 'system' COMMENT 'system/competition/stage',
  `is_pinned` tinyint NOT NULL DEFAULT 0 COMMENT '是否置顶',
  `status` varchar(20) NOT NULL DEFAULT 'published' COMMENT 'draft/published',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_competition` (`competition_id`),
  KEY `idx_type_status` (`type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告表';
