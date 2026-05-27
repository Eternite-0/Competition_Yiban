-- Create database if not exists
CREATE DATABASE IF NOT EXISTS `etsaion` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `etsaion`;

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
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

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
  `content` text COMMENT '富文本赛事简介/要求',
  `organizer` varchar(200) DEFAULT NULL COMMENT '主办单位',
  `tags` varchar(500) DEFAULT NULL COMMENT 'JSON数组 - 赛事标签',
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
  `status` varchar(20) DEFAULT '待完善' COMMENT '待完善/已提交/审核中/审核通过/审核驳回',
  `submit_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报名表';

-- ----------------------------
-- Table structure for submission
-- ----------------------------
DROP TABLE IF EXISTS `submission`;
CREATE TABLE `submission` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `registration_id` bigint DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `file_size` bigint DEFAULT '0' COMMENT '文件大小 (Bytes)',
  `upload_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) DEFAULT '待审核' COMMENT '待审核/已审核',
  `review_note` varchar(500) DEFAULT NULL COMMENT '教师评语',
  `approved` tinyint DEFAULT NULL COMMENT '已审核时 1=通过, 0=驳回; 待审核为 NULL',
  `displayed` tinyint DEFAULT '0' COMMENT '是否展示在优秀作品墙',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成果附件上传表';

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
  PRIMARY KEY (`id`)
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
  PRIMARY KEY (`id`)
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息表';
