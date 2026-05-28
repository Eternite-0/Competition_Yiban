USE `etsaion`;

UPDATE `user`
SET `role` = 'teacher',
    `real_name` = CASE WHEN `username` = 'teacher1' THEN '王老师' ELSE `real_name` END
WHERE `role` = 'counselor';
