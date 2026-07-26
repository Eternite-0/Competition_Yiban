-- 移除报名的死状态"待完善"
--
-- registration.status 的默认值一直是"待完善"，但后端从未写入或读取过它：
-- 报名一经创建就是"已提交"。这个状态只存在于建表默认值、一条种子数据
-- 和前端为它保留的一整套 UI 分支里，是一条永远走不到的路径。
--
-- 默认值改为"已提交"，与 submitRegistration 的实际行为一致；
-- 存量的"待完善"记录一并归位——它们无法被审核也无法上传成果，
-- 留在库里只会让待办统计对不上。

UPDATE `registration` SET `status` = '已提交' WHERE `status` = '待完善';

ALTER TABLE `registration`
  MODIFY COLUMN `status` varchar(20) NOT NULL DEFAULT '已提交'
  COMMENT '已提交/审核中/审核通过/退回补充/审核驳回';

INSERT IGNORE INTO `schema_version` (`version`, `description`)
VALUES ('migrate-018-drop-draft-registration-status', '移除报名死状态"待完善"');
