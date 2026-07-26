-- 赛事来源：启用中文可靠官网，提高采集页数；外网 SPA 保持禁用
-- 幂等可重复执行

-- 调高已有中文源的采集参数并启用
UPDATE `competition_source`
SET `enabled` = 1,
    `crawl_depth` = 1,
    `max_pages` = 10,
    `crawl_frequency` = IFNULL(NULLIF(`crawl_frequency`, ''), 'manual'),
    `language` = 'zh',
    `update_time` = NOW()
WHERE `url` IN (
  'https://dasai.lanqiao.cn/',
  'https://uchallenge.unipus.cn/',
  'https://www.saikr.com/',
  'https://rank.moocollege.com/'
);

-- 外网动态站默认保持关闭（静态抓取收益低）
UPDATE `competition_source`
SET `enabled` = 0,
    `update_time` = NOW()
WHERE `url` IN (
  'https://www.kaggle.com/competitions',
  'https://devpost.com/hackathons',
  'https://www.drivendata.org/competitions/',
  'https://www.aicrowd.com/challenges',
  'https://zindi.africa/competitions',
  'https://www.challenge.gov/',
  'https://tianchi.aliyun.com/competition/'
);

-- 补充国内高校常用赛事官网（静态/半静态，适合列表→详情采集）
INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '挑战杯全国大学生课外学术科技作品竞赛', 'https://www.tiaozhanbei.net/', 'whitelist', 'weekly', 'zh', 1, 10, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.tiaozhanbei.net/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '中国软件杯大学生软件设计大赛', 'https://www.cnsoftbei.com/', 'whitelist', 'weekly', 'zh', 1, 10, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.cnsoftbei.com/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '全国大学生数学建模竞赛官网', 'http://www.mcm.edu.cn/', 'whitelist', 'weekly', 'zh', 1, 8, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'http://www.mcm.edu.cn/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '全国大学生电子设计竞赛', 'https://www.nuedc.com.cn/', 'whitelist', 'weekly', 'zh', 1, 8, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.nuedc.com.cn/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '中国大学生服务外包创新创业大赛', 'https://www.fwwb.org.cn/', 'whitelist', 'weekly', 'zh', 1, 10, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.fwwb.org.cn/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '全国大学生广告艺术大赛', 'https://www.sun-ada.net/', 'whitelist', 'weekly', 'zh', 1, 8, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.sun-ada.net/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '中国大学生计算机设计大赛', 'https://jsjds.blcu.edu.cn/', 'whitelist', 'weekly', 'zh', 1, 8, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://jsjds.blcu.edu.cn/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '中国国际大学生创新大赛', 'https://cy.ncss.cn/', 'government', 'weekly', 'zh', 1, 10, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://cy.ncss.cn/');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT 'RoboMaster 机甲大师赛', 'https://www.robomaster.com/zh-CN', 'enterprise', 'weekly', 'zh', 1, 8, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://www.robomaster.com/zh-CN');

INSERT INTO `competition_source`
(`name`, `url`, `source_type`, `crawl_frequency`, `language`, `crawl_depth`, `max_pages`, `enabled`, `create_time`, `update_time`)
SELECT '全国大学生智能汽车竞赛', 'https://smartcar.cdstm.cn/', 'whitelist', 'weekly', 'zh', 1, 8, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `competition_source` WHERE `url` = 'https://smartcar.cdstm.cn/');
