-- 补齐演示数据登记表，并统一演示成果文件名。
-- 仅规范名称，不删除任何报名、成果或获奖记录。

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `demo_data_registry` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `batch_key` VARCHAR(80) NOT NULL,
  `table_name` VARCHAR(80) NOT NULL,
  `record_id` BIGINT NOT NULL,
  `business_key` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_demo_record` (`batch_key`, `table_name`, `record_id`),
  KEY `idx_demo_batch` (`batch_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 历史演示数据曾在成果链路中重复拼接“演示·”前缀；只移除文件名开头的前缀。
UPDATE `submission`
SET `file_name` = REGEXP_REPLACE(`file_name`, '^(演示·)+', '')
WHERE `file_url` LIKE '/api/file/serve/demo-%'
  AND `file_name` REGEXP '^(演示·)+';

UPDATE `award_proof`
SET `file_name` = REGEXP_REPLACE(`file_name`, '^(演示·)+', '')
WHERE `file_url` LIKE '/api/file/serve/demo-award-%'
  AND `file_name` REGEXP '^(演示·)+';
