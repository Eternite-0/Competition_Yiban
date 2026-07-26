USE `etsaion`;
SET NAMES utf8mb4;

START TRANSACTION;

-- Ensure the official 2024 roster exists in the registration roster.
-- This file is intentionally idempotent: re-running it repairs missing rows
-- without deleting students, registrations, messages, or activity data.
-- Imported 2024 student accounts are reset to the documented default password
-- 123456 so bulk-created or repaired accounts can log in consistently.
INSERT IGNORE INTO `major` (`name`, `college`, `status`)
SELECT DISTINCT
    CASE
        WHEN cs.major = '软件工程(创新班)' THEN '软件工程(创新班)'
        ELSE cs.major
    END,
    '计算机与人工智能学院',
    'active'
FROM `comprehensive_score` cs
WHERE cs.grade = '2024级'
  AND cs.major IS NOT NULL
  AND cs.major <> '';

INSERT IGNORE INTO `class_info` (`name`, `college`, `major_id`, `grade`, `status`)
SELECT DISTINCT
    cs.class_name,
    '计算机与人工智能学院',
    m.id,
    REPLACE(cs.grade, '级', ''),
    'active'
FROM `comprehensive_score` cs
LEFT JOIN `major` m
    ON m.name = cs.major
   AND m.college = '计算机与人工智能学院'
WHERE cs.grade = '2024级'
  AND cs.class_name IS NOT NULL
  AND cs.class_name <> '';

INSERT INTO `student_roster` (
    `student_no`,
    `real_name`,
    `college`,
    `major_id`,
    `class_id`,
    `grade`,
    `status`,
    `create_time`,
    `update_time`
)
SELECT
    cs.student_no,
    cs.real_name,
    '计算机与人工智能学院',
    m.id,
    c.id,
    REPLACE(cs.grade, '级', ''),
    IF(u.id IS NULL, 'pending', 'registered'),
    NOW(),
    NOW()
FROM `comprehensive_score` cs
JOIN (
    SELECT student_no, MAX(academic_year) AS academic_year
    FROM `comprehensive_score`
    WHERE grade = '2024级'
    GROUP BY student_no
) latest ON latest.student_no = cs.student_no AND latest.academic_year = cs.academic_year
LEFT JOIN `major` m
    ON m.name = cs.major
   AND m.college = '计算机与人工智能学院'
LEFT JOIN `class_info` c
    ON c.name = cs.class_name
   AND c.grade = REPLACE(cs.grade, '级', '')
   AND c.college = '计算机与人工智能学院'
LEFT JOIN `user` u ON u.username = cs.student_no AND u.role = 'student'
ON DUPLICATE KEY UPDATE
    `real_name` = VALUES(`real_name`),
    `college` = VALUES(`college`),
    `major_id` = VALUES(`major_id`),
    `class_id` = VALUES(`class_id`),
    `grade` = VALUES(`grade`),
    `status` = VALUES(`status`),
    `update_time` = NOW();

-- Keep existing 2024 student accounts aligned with the official comprehensive score roster.
UPDATE `user` u
JOIN `comprehensive_score` cs ON cs.student_no = u.username
JOIN (
    SELECT student_no, MAX(academic_year) AS academic_year
    FROM `comprehensive_score`
    WHERE grade = '2024级'
    GROUP BY student_no
) latest ON latest.student_no = cs.student_no AND latest.academic_year = cs.academic_year
SET
    u.real_name = cs.real_name,
    u.role = 'student',
    u.college = CASE
        WHEN cs.college = '计算机与智能教育学院' THEN '计算机与人工智能学院'
        ELSE cs.college
    END,
    u.major = cs.major,
    u.class_name = cs.class_name,
    u.grade = REPLACE(cs.grade, '级', ''),
    u.status = 'active'
WHERE u.role = 'student';

-- Repair accounts created from earlier imports so the imported students can log in
-- with the documented default password 123456.
UPDATE `user` u
JOIN `comprehensive_score` cs ON cs.student_no = u.username
SET u.password = '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO'
WHERE cs.grade = '2024级'
  AND u.role = 'student';

-- Create missing 2024 student accounts from the official comprehensive score roster.
INSERT INTO `user` (
    `username`,
    `password`,
    `real_name`,
    `role`,
    `college`,
    `major`,
    `class_name`,
    `grade`,
    `status`,
    `created_at`,
    `updated_at`
)
SELECT
    cs.student_no,
    '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO',
    cs.real_name,
    'student',
    CASE
        WHEN cs.college = '计算机与智能教育学院' THEN '计算机与人工智能学院'
        ELSE cs.college
    END,
    cs.major,
    cs.class_name,
    REPLACE(cs.grade, '级', ''),
    'active',
    NOW(),
    NOW()
FROM `comprehensive_score` cs
JOIN (
    SELECT student_no, MAX(academic_year) AS academic_year
    FROM `comprehensive_score`
    WHERE grade = '2024级'
    GROUP BY student_no
) latest ON latest.student_no = cs.student_no AND latest.academic_year = cs.academic_year
LEFT JOIN `user` u ON u.username = cs.student_no
WHERE u.id IS NULL;

-- Create or repair student accounts from the full imported 2024 roster as well.
-- This covers students who are in the official roster but do not have a comprehensive
-- score row yet, so data loss in `user` does not block login.
UPDATE `user` u
JOIN `student_roster` sr ON sr.student_no = u.username
LEFT JOIN `major` m ON m.id = sr.major_id
LEFT JOIN `class_info` c ON c.id = sr.class_id
SET
    u.real_name = sr.real_name,
    u.role = 'student',
    u.college = sr.college,
    u.major = m.name,
    u.class_name = c.name,
    u.grade = sr.grade,
    u.status = 'active'
WHERE u.role = 'student'
  AND sr.grade = '2024';

UPDATE `user` u
JOIN `student_roster` sr ON sr.student_no = u.username
SET u.password = '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO'
WHERE sr.grade = '2024'
  AND u.role = 'student';

INSERT INTO `user` (
    `username`,
    `password`,
    `real_name`,
    `role`,
    `college`,
    `major`,
    `class_name`,
    `grade`,
    `status`,
    `created_at`,
    `updated_at`
)
SELECT
    sr.student_no,
    '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO',
    sr.real_name,
    'student',
    sr.college,
    m.name,
    c.name,
    sr.grade,
    'active',
    NOW(),
    NOW()
FROM `student_roster` sr
LEFT JOIN `major` m ON m.id = sr.major_id
LEFT JOIN `class_info` c ON c.id = sr.class_id
LEFT JOIN `user` u ON u.username = sr.student_no
WHERE sr.grade = '2024'
  AND u.id IS NULL;

UPDATE `student_roster` sr
JOIN `user` u ON u.username = sr.student_no AND u.role = 'student'
SET sr.status = 'registered',
    sr.update_time = NOW()
WHERE sr.status <> 'registered';

-- Keep local teacher test accounts scoped to the imported 2024 college, otherwise
-- the teacher UI only sees the legacy demo students such as 张三/李四.
UPDATE `user`
SET `college` = '计算机与人工智能学院',
    `status` = 'active',
    `updated_at` = NOW()
WHERE `username` = 'teacher1'
  AND `role` = 'teacher';

INSERT INTO `user` (
    `username`,
    `password`,
    `real_name`,
    `role`,
    `college`,
    `status`,
    `created_at`,
    `updated_at`
) VALUES (
    'teacher24',
    '$2a$10$swM2GAYIHrw/Jm6Edmkq8Ol20dzW5J7.UR3rWeHbR2f1H/OjLsRhO',
    '24级测试教师',
    'teacher',
    '计算机与人工智能学院',
    'active',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    `password` = VALUES(`password`),
    `real_name` = VALUES(`real_name`),
    `role` = VALUES(`role`),
    `college` = VALUES(`college`),
    `status` = VALUES(`status`),
    `updated_at` = NOW();

COMMIT;
