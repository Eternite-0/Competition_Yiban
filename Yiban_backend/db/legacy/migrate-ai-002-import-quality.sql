-- AI赛事导入识别率提升：来源配置字段与推荐种子

ALTER TABLE `competition_source`
  ADD COLUMN `language` varchar(30) DEFAULT 'auto' COMMENT 'auto/zh/en/mixed' AFTER `crawl_frequency`,
  ADD COLUMN `crawl_depth` int DEFAULT 0 COMMENT '采集深度，第一版默认只抓当前页' AFTER `language`,
  ADD COLUMN `max_pages` int DEFAULT 5 COMMENT '单来源最多解析页数' AFTER `crawl_depth`,
  ADD COLUMN `allow_patterns` varchar(1000) DEFAULT NULL COMMENT '允许链接规则，换行或逗号分隔' AFTER `max_pages`,
  ADD COLUMN `deny_patterns` varchar(1000) DEFAULT NULL COMMENT '排除链接规则，换行或逗号分隔' AFTER `allow_patterns`,
  ADD COLUMN `last_success_count` int DEFAULT 0 COMMENT '最近一次成功生成草稿数' AFTER `last_error_message`;

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '高校学生竞赛与教师发展数据平台', 'https://rank.moocollege.com/', 'whitelist', 'manual', 'zh', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://rank.moocollege.com/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '赛氪大学生竞赛社区', 'https://www.saikr.com/', 'whitelist', 'manual', 'zh', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.saikr.com/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '阿里云天池大赛', 'https://tianchi.aliyun.com/competition/', 'enterprise', 'manual', 'zh', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://tianchi.aliyun.com/competition/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '蓝桥杯大赛', 'https://dasai.lanqiao.cn/', 'whitelist', 'manual', 'zh', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://dasai.lanqiao.cn/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '外研社国才杯', 'https://uchallenge.unipus.cn/', 'whitelist', 'manual', 'zh', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://uchallenge.unipus.cn/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT 'Kaggle Competitions', 'https://www.kaggle.com/competitions', 'enterprise', 'manual', 'en', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.kaggle.com/competitions');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT 'Devpost Hackathons', 'https://devpost.com/hackathons', 'enterprise', 'manual', 'en', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://devpost.com/hackathons');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT 'DrivenData Competitions', 'https://www.drivendata.org/competitions/', 'enterprise', 'manual', 'en', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.drivendata.org/competitions/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT 'AIcrowd Challenges', 'https://www.aicrowd.com/challenges', 'enterprise', 'manual', 'en', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.aicrowd.com/challenges');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT 'Zindi Competitions', 'https://zindi.africa/competitions', 'enterprise', 'manual', 'en', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://zindi.africa/competitions');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT 'Challenge.gov', 'https://www.challenge.gov/', 'government', 'manual', 'en', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.challenge.gov/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT 'NASA Tournament Lab', 'https://www.nasa.gov/directorates/stmd/prizes-challenges-crowdsourcing-program/center-of-excellence-for-collaborative-innovation-coeci/nasa-tournament-lab/', 'government', 'manual', 'en', 0, 5, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.nasa.gov/directorates/stmd/prizes-challenges-crowdsourcing-program/center-of-excellence-for-collaborative-innovation-coeci/nasa-tournament-lab/');
