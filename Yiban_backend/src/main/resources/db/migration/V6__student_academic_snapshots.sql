CREATE TABLE `student_academic_snapshot` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `student_no` varchar(50) NOT NULL,
  `source` varchar(30) NOT NULL DEFAULT 'zf',
  `gpa` decimal(6,3) DEFAULT NULL,
  `required_credits` decimal(8,2) DEFAULT NULL,
  `earned_credits` decimal(8,2) DEFAULT NULL,
  `missing_credits` decimal(8,2) DEFAULT NULL,
  `planned_total_courses` int DEFAULT NULL,
  `planned_passed_courses` int DEFAULT NULL,
  `planned_failed_courses` int DEFAULT NULL,
  `planned_missed_courses` int DEFAULT NULL,
  `planned_in_progress_courses` int DEFAULT NULL,
  `risk_level` varchar(20) NOT NULL DEFAULT 'unknown',
  `synced_at` datetime NOT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_academic_snapshot_student_time` (`student_id`, `synced_at`),
  KEY `idx_academic_snapshot_student_no` (`student_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生本人授权同步的教务学业快照';

CREATE TABLE `student_academic_course` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `snapshot_id` bigint NOT NULL,
  `requirement_group` varchar(100) DEFAULT NULL,
  `course_no` varchar(100) DEFAULT NULL,
  `course_name` varchar(200) NOT NULL,
  `credit` decimal(8,2) DEFAULT NULL,
  `course_status` varchar(100) DEFAULT NULL,
  `max_grade` varchar(50) DEFAULT NULL,
  `grade_point` decimal(6,3) DEFAULT NULL,
  `needs_attention` tinyint NOT NULL DEFAULT '0',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_academic_course_snapshot` (`snapshot_id`),
  CONSTRAINT `fk_academic_course_snapshot` FOREIGN KEY (`snapshot_id`) REFERENCES `student_academic_snapshot` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教务培养方案课程明细';
