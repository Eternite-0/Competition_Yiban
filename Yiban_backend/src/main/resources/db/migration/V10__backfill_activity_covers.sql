-- 为已有志愿/文体活动补齐封面，并统一活动分类编码。
UPDATE `activity`
SET `cover_url` = CASE `id`
    WHEN 1 THEN '/event-covers/volunteer/volunteer-01.jpg'
    WHEN 2 THEN '/event-covers/volunteer/volunteer-07.jpg'
    WHEN 3 THEN '/event-covers/volunteer/volunteer-09.jpg'
    WHEN 4 THEN '/event-covers/culture-sports/culture-10.jpg'
    WHEN 5 THEN '/event-covers/007-design.jpg'
    ELSE `cover_url`
  END,
  `category` = CASE
    WHEN `id` = 1 THEN 'campus_service'
    WHEN `id` IN (2, 3) THEN 'event_support'
    WHEN `id` = 5 THEN 'performance'
    ELSE `category`
  END
WHERE `id` IN (1, 2, 3, 4, 5);
