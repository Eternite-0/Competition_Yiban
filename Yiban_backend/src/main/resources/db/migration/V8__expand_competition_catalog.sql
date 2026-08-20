-- 补充高校常用赛事目录，并为现有赛事替换失效封面链接。
-- 封面图片存放在前端 public/event-covers/，由 Vite 以 /event-covers/** 提供。

UPDATE `competition`
SET `cover_url` = CASE `id`
    WHEN 2 THEN '/event-covers/004-robot.jpg'
    WHEN 3 THEN '/event-covers/002-code.jpg'
    WHEN 4 THEN '/event-covers/003-math.jpg'
    WHEN 5 THEN '/event-covers/007-design.jpg'
    ELSE `cover_url`
  END,
  `source_url` = CASE `id`
    WHEN 1 THEN 'https://cy.ncss.cn/'
    WHEN 2 THEN 'https://www.nuedc.cn/'
    WHEN 3 THEN 'https://dasai.lanqiao.cn/'
    WHEN 4 THEN 'https://www.mcm.edu.cn/'
    ELSE `source_url`
  END
WHERE `id` IN (1, 2, 3, 4, 5);

UPDATE `competition`
SET `cover_url` = CASE `id`
    WHEN 24 THEN '/event-covers/004-robot.jpg'
    WHEN 25 THEN '/event-covers/005-innovation.jpg'
    WHEN 26 THEN '/event-covers/008-business.jpg'
    WHEN 27 THEN '/event-covers/002-code.jpg'
    ELSE `cover_url`
  END
WHERE `id` IN (24, 25, 26, 27);

INSERT INTO `competition`
(`id`, `name`, `level`, `category`, `start_time`, `end_time`, `competition_start`, `competition_end`, `max_team_size`, `cover_url`, `source_url`, `content`, `organizer`, `tags`, `tracks`, `status`, `create_time`, `update_time`)
VALUES
(28, '2026—2027学年全国大学生英语竞赛', '国家级', 'C', '2026-09-01 00:00:00', '2026-12-31 23:59:59', '2027-04-19 09:00:00', '2027-05-17 18:00:00', 1, '/event-covers/006-english.jpg', 'https://chinaneccs.cn/', '<p>面向全国高校学生的英语综合能力竞赛，覆盖听力、阅读、写作和综合应用等内容，适合英语学习与综合素质提升。</p>', '国际英语外语教师协会中国英语外语教师协会', '["英语","语言能力","综合素质"]', '["A类本科生","B类高职高专","C类研究生"]', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(29, '2026年中国大学生计算机设计大赛', '国家级', 'A', '2026-09-01 00:00:00', '2027-03-31 23:59:59', '2027-04-15 09:00:00', '2027-08-20 18:00:00', 5, '/event-covers/002-code.jpg', 'https://www.jsjds.com/', '<p>覆盖软件应用、微课与教学辅助、数字媒体、人工智能和物联网等方向，强调作品设计、技术实现与应用价值。</p>', '中国大学生计算机设计大赛组织委员会', '["计算机设计","软件开发","数字媒体"]', '["软件应用","人工智能","数字媒体","物联网"]', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(30, '2026年全国大学生广告艺术大赛', '国家级', 'C', '2026-08-20 00:00:00', '2027-05-31 23:59:59', '2027-06-01 09:00:00', '2027-08-31 18:00:00', 5, '/event-covers/007-design.jpg', 'https://www.sun-ada.net/', '<p>面向高校学生的综合广告创意赛事，鼓励围绕真实命题完成平面、视频、交互和策划类作品。</p>', '全国大学生广告艺术大赛组委会', '["广告创意","视觉传达","新媒体"]', '["平面广告","视频广告","策划案","互动创意"]', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(31, '2026年全国大学生机器人大赛RoboMaster', '国家级', 'A', '2026-09-01 00:00:00', '2027-03-15 23:59:59', '2027-04-01 09:00:00', '2027-08-15 18:00:00', 20, '/event-covers/004-robot.jpg', 'https://www.robomaster.com/', '<p>以机器人竞赛为核心的工程实践赛事，涵盖机械结构、嵌入式控制、人工智能、视觉感知和团队协作。</p>', '全国大学生机器人大赛组委会', '["机器人","人工智能","工程实践"]', '["机甲大师","工程设计","人工智能"]', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(32, '2026年全国大学生电子商务“创新、创意及创业”挑战赛', '国家级', 'B', '2026-09-01 00:00:00', '2027-05-15 23:59:59', '2027-05-20 09:00:00', '2027-08-10 18:00:00', 5, '/event-covers/005-innovation.jpg', 'https://www.3chuang.net/', '<p>简称“三创赛”，聚焦电子商务创新创业实践，鼓励学生以真实项目解决社会和商业场景问题。</p>', '全国大学生电子商务“三创赛”竞赛组织委员会', '["电子商务","创新创业","商业实践"]', '["创新、创意、创业","跨境电商","乡村振兴"]', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(33, '2026年全国大学生节能减排社会实践与科技竞赛', '国家级', 'B', '2026-09-01 00:00:00', '2027-04-30 23:59:59', '2027-05-01 09:00:00', '2027-08-01 18:00:00', 5, '/event-covers/001-team.jpg', NULL, '<p>围绕节能减排、绿色低碳和可持续发展开展社会实践与科技创新，支持多学科交叉组队。</p>', '全国大学生节能减排社会实践与科技竞赛委员会', '["节能减排","绿色低碳","科技创新"]', '["科技发明制作","社会实践调查","创意设计"]', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(34, '2026年全国大学生市场调查与分析大赛', '国家级', 'B', '2026-09-01 00:00:00', '2027-04-30 23:59:59', '2027-05-10 09:00:00', '2027-07-20 18:00:00', 5, '/event-covers/008-business.jpg', NULL, '<p>以市场调查、数据分析和研究报告撰写为核心，培养学生发现问题、分析问题和提出决策建议的能力。</p>', '全国大学生市场调查与分析大赛组委会', '["市场调查","数据分析","研究报告"]', '["本科组","专科组","研究生组"]', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(35, '2026年全国大学生生命科学竞赛', '国家级', 'B', '2026-09-01 00:00:00', '2027-04-30 23:59:59', '2027-05-01 09:00:00', '2027-08-15 18:00:00', 5, '/event-covers/003-math.jpg', NULL, '<p>面向生命科学相关专业学生，鼓励开展实验研究、科学探究和创新项目展示，突出研究过程与成果表达。</p>', '全国大学生生命科学竞赛委员会', '["生命科学","实验研究","科学探究"]', '["创新实验","科学探究","项目报告"]', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
