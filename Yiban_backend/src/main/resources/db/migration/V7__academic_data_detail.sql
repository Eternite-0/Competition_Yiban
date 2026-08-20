CREATE TABLE `student_academic_sync` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `student_no` varchar(50) NOT NULL,
  `source` varchar(30) NOT NULL DEFAULT 'zf' COMMENT '数据来源标识，例如 zf',
  `status` varchar(20) NOT NULL DEFAULT 'running' COMMENT 'running/success/failed',
  `started_at` datetime NOT NULL,
  `finished_at` datetime DEFAULT NULL,
  `snapshot_id` bigint DEFAULT NULL,
  `grade_count` int NOT NULL DEFAULT '0',
  `plan_course_count` int NOT NULL DEFAULT '0',
  `schedule_count` int NOT NULL DEFAULT '0',
  `exam_count` int NOT NULL DEFAULT '0',
  `notice_count` int NOT NULL DEFAULT '0',
  `error_code` varchar(50) DEFAULT NULL,
  `error_message` varchar(500) DEFAULT NULL COMMENT '仅记录技术错误，不记录账号、密码、Cookie 或验证码',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_academic_sync_student_time` (`student_id`, `started_at`),
  KEY `idx_academic_sync_status` (`status`, `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生本人授权发起的教务数据同步批次，不保存登录凭证';

ALTER TABLE `student_academic_snapshot`
  ADD COLUMN `sync_id` bigint DEFAULT NULL AFTER `student_no`,
  ADD KEY `idx_academic_snapshot_sync` (`sync_id`),
  ADD CONSTRAINT `fk_academic_snapshot_sync` FOREIGN KEY (`sync_id`) REFERENCES `student_academic_sync` (`id`) ON DELETE SET NULL;

CREATE TABLE `student_academic_credit_requirement` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `snapshot_id` bigint NOT NULL,
  `requirement_code` varchar(100) DEFAULT NULL COMMENT '教务系统培养要求分组 ID',
  `requirement_name` varchar(100) NOT NULL COMMENT '例如专业必修、通识选修、实践教学',
  `required_credits` decimal(8,2) DEFAULT NULL,
  `earned_credits` decimal(8,2) DEFAULT NULL,
  `missing_credits` decimal(8,2) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_credit_requirement_snapshot_code` (`snapshot_id`, `requirement_code`),
  KEY `idx_credit_requirement_snapshot` (`snapshot_id`),
  CONSTRAINT `fk_credit_requirement_snapshot` FOREIGN KEY (`snapshot_id`) REFERENCES `student_academic_snapshot` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='培养方案按类别的学分完成情况';

ALTER TABLE `student_academic_course`
  ADD COLUMN `sync_id` bigint DEFAULT NULL AFTER `snapshot_id`,
  ADD COLUMN `requirement_code` varchar(100) DEFAULT NULL AFTER `requirement_group`,
  ADD COLUMN `display_term` varchar(30) DEFAULT NULL AFTER `course_status`,
  ADD COLUMN `course_category` varchar(100) DEFAULT NULL AFTER `display_term`,
  ADD COLUMN `course_nature` varchar(100) DEFAULT NULL AFTER `course_category`,
  ADD KEY `idx_academic_course_sync` (`sync_id`),
  ADD KEY `idx_academic_course_attention` (`snapshot_id`, `needs_attention`),
  ADD CONSTRAINT `fk_academic_course_sync` FOREIGN KEY (`sync_id`) REFERENCES `student_academic_sync` (`id`) ON DELETE SET NULL;

CREATE TABLE `student_academic_grade` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `sync_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  `academic_year` varchar(30) NOT NULL,
  `term` varchar(20) DEFAULT NULL,
  `course_no` varchar(100) DEFAULT NULL,
  `course_name` varchar(200) NOT NULL,
  `teaching_class` varchar(200) DEFAULT NULL,
  `teacher_name` varchar(100) DEFAULT NULL,
  `credit` decimal(8,2) DEFAULT NULL,
  `course_category` varchar(100) DEFAULT NULL,
  `course_nature` varchar(100) DEFAULT NULL,
  `score_text` varchar(50) DEFAULT NULL COMMENT '保留通过、优秀等原始成绩文本',
  `score_numeric` decimal(6,2) DEFAULT NULL,
  `grade_point` decimal(6,3) DEFAULT NULL,
  `exam_type` varchar(100) DEFAULT NULL,
  `offering_college` varchar(100) DEFAULT NULL,
  `course_mark` varchar(100) DEFAULT NULL,
  `is_passed` tinyint DEFAULT NULL COMMENT '由平台按学校规则测算；NULL 表示无法判断',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_academic_grade_student_term` (`student_id`, `academic_year`, `term`),
  KEY `idx_academic_grade_student_course` (`student_id`, `course_no`),
  KEY `idx_academic_grade_sync` (`sync_id`),
  CONSTRAINT `fk_academic_grade_sync` FOREIGN KEY (`sync_id`) REFERENCES `student_academic_sync` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='按同步批次保存的课程成绩明细';

CREATE TABLE `student_academic_schedule` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `sync_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  `academic_year` varchar(30) NOT NULL,
  `term` varchar(20) DEFAULT NULL,
  `course_no` varchar(100) DEFAULT NULL,
  `course_name` varchar(200) NOT NULL,
  `teaching_class` varchar(200) DEFAULT NULL,
  `teacher_name` varchar(100) DEFAULT NULL,
  `location` varchar(200) DEFAULT NULL,
  `weekday` tinyint DEFAULT NULL COMMENT '1 至 7 对应周一至周日',
  `section_text` varchar(100) DEFAULT NULL COMMENT '原始节次文本',
  `week_text` varchar(255) DEFAULT NULL COMMENT '原始周次文本',
  `start_time` varchar(10) DEFAULT NULL,
  `end_time` varchar(10) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_academic_schedule_student_term` (`student_id`, `academic_year`, `term`),
  KEY `idx_academic_schedule_sync` (`sync_id`),
  CONSTRAINT `fk_academic_schedule_sync` FOREIGN KEY (`sync_id`) REFERENCES `student_academic_sync` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='按同步批次保存的课表明细';

CREATE TABLE `student_academic_exam` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `sync_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  `academic_year` varchar(30) DEFAULT NULL,
  `term` varchar(20) DEFAULT NULL,
  `course_no` varchar(100) DEFAULT NULL,
  `course_name` varchar(200) NOT NULL,
  `exam_type` varchar(100) DEFAULT NULL,
  `exam_time` datetime DEFAULT NULL,
  `location` varchar(200) DEFAULT NULL,
  `seat_no` varchar(50) DEFAULT NULL,
  `exam_status` varchar(50) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_academic_exam_student_time` (`student_id`, `exam_time`),
  KEY `idx_academic_exam_sync` (`sync_id`),
  CONSTRAINT `fk_academic_exam_sync` FOREIGN KEY (`sync_id`) REFERENCES `student_academic_sync` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='按同步批次保存的考试安排';

CREATE TABLE `student_academic_notice` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `sync_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  `source_notice_id` varchar(100) DEFAULT NULL,
  `notice_type` varchar(100) DEFAULT NULL,
  `title` varchar(300) NOT NULL,
  `content` text,
  `published_at` datetime DEFAULT NULL,
  `is_read` tinyint NOT NULL DEFAULT '0',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_academic_notice_student_time` (`student_id`, `published_at`),
  KEY `idx_academic_notice_sync` (`sync_id`),
  CONSTRAINT `fk_academic_notice_sync` FOREIGN KEY (`sync_id`) REFERENCES `student_academic_sync` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教务系统同步的个人通知';
