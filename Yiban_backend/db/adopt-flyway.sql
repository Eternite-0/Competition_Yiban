-- 将已有的 etsaion 数据库认领为当前 Flyway baseline（V5）。
--
-- 只适用于已经按本项目当前 baseline 建好的数据库。脚本会先检查 27 张必需表；
-- 缺表时直接报错，不会写入 Flyway 历史。
--
-- 从仓库根目录执行（项目默认端口 3307）：
--   Get-Content -Raw -Encoding UTF8 .\Yiban_backend\db\adopt-flyway.sql |
--     mysql --protocol=TCP -h 127.0.0.1 -P 3307 -u root -proot etsaion

DROP PROCEDURE IF EXISTS `adopt_flyway_baseline_v5`;

DELIMITER //
CREATE PROCEDURE `adopt_flyway_baseline_v5`()
BEGIN
  DECLARE required_table_count INT DEFAULT 0;
  DECLARE history_row_count INT DEFAULT 0;

  SELECT COUNT(*) INTO required_table_count
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN (
      'activity', 'activity_category', 'ai_competition_draft', 'ai_conversation',
      'ai_message', 'ai_task', 'announcement', 'award_proof', 'award_proof_student',
      'class_info', 'competition', 'competition_source', 'competition_stage',
      'comprehensive_score', 'growth_record', 'major', 'message', 'participation',
      'registration', 'review_task', 'student_roster', 'student_stage_progress',
      'submission', 'submission_student', 'team_application', 'team_post', 'user'
    );

  IF required_table_count <> 27 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot adopt Flyway: database does not match the current 27-table baseline';
  END IF;

  CREATE TABLE IF NOT EXISTS `flyway_schema_history` (
    `installed_rank` int(11) NOT NULL,
    `version` varchar(50) DEFAULT NULL,
    `description` varchar(200) NOT NULL,
    `type` varchar(20) NOT NULL,
    `script` varchar(1000) NOT NULL,
    `checksum` int(11) DEFAULT NULL,
    `installed_by` varchar(100) NOT NULL,
    `installed_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `execution_time` int(11) NOT NULL,
    `success` tinyint(1) NOT NULL,
    PRIMARY KEY (`installed_rank`),
    KEY `flyway_schema_history_s_idx` (`success`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

  SELECT COUNT(*) INTO history_row_count FROM `flyway_schema_history`;

  IF history_row_count = 0 THEN
    INSERT INTO `flyway_schema_history`
      (`installed_rank`, `version`, `description`, `type`, `script`, `checksum`,
       `installed_by`, `execution_time`, `success`)
    VALUES
      (1, '5', 'existing schema baseline', 'BASELINE', '<< Flyway Baseline >>', NULL,
       'adopt-flyway', 0, 1);
  END IF;
END//
DELIMITER ;

CALL `adopt_flyway_baseline_v5`();
DROP PROCEDURE `adopt_flyway_baseline_v5`;

SELECT `installed_rank`, `version`, `description`, `type`, `success`
FROM `flyway_schema_history`
ORDER BY `installed_rank`;
