USE `etsaion`;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS `activity_category` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `type` varchar(30) NOT NULL DEFAULT 'competition' COMMENT 'competition/volunteer/culture_sports/other',
  `code` varchar(50) NOT NULL COMMENT '分类编码，activity/competition.category 存此值',
  `name` varchar(50) NOT NULL COMMENT '分类名称',
  `icon` varchar(50) DEFAULT 'category' COMMENT 'Material Symbols 图标名',
  `sort_order` int DEFAULT '100',
  `status` varchar(20) DEFAULT 'active' COMMENT 'active/disabled',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_code` (`type`, `code`),
  UNIQUE KEY `uk_type_name` (`type`, `name`),
  KEY `idx_type_status` (`type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动分类字典表';

INSERT INTO `activity_category` (`type`, `code`, `name`, `icon`, `sort_order`, `status`) VALUES
('competition', 'A', '科技创新', 'psychology', 10, 'active'),
('competition', 'B', '商业创业', 'business_center', 20, 'active'),
('competition', 'C', '文化艺术', 'palette', 30, 'active'),
('competition', 'algorithm', '算法编程', 'code', 40, 'active'),
('competition', 'design', '设计创作', 'draw', 50, 'active'),
('volunteer', 'campus_service', '校园服务', 'volunteer_activism', 10, 'active'),
('volunteer', 'community', '社区公益', 'diversity_1', 20, 'active'),
('volunteer', 'event_support', '赛会保障', 'support_agent', 30, 'active'),
('culture_sports', 'sports', '体育赛事', 'sports_soccer', 10, 'active'),
('culture_sports', 'performance', '文艺展演', 'theater_comedy', 20, 'active'),
('culture_sports', 'club', '社团活动', 'diversity_3', 30, 'active'),
('other', 'lecture', '讲座培训', 'co_present', 10, 'active'),
('other', 'practice', '实践项目', 'fact_check', 20, 'active')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `icon` = VALUES(`icon`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`);

SET @idx_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'activity'
    AND INDEX_NAME = 'idx_type_category'
);
SET @sql := IF(@idx_exists = 0, 'ALTER TABLE `activity` ADD KEY `idx_type_category` (`type`, `category`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
