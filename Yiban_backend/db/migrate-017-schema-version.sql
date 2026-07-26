-- 迁移版本记录表
--
-- 此前 db/ 下的脚本靠文件名序号手工按序执行，没有任何执行记录，
-- 无法回答"这个库跑到哪一版了"。本表补上这个缺口。
--
-- 用法：每个 migrate-*.sql 结尾追加一条 INSERT IGNORE 登记自己。
-- 已有库首次执行本脚本时，下方回填会把历史脚本标记为已执行
-- （它们是幂等的，重复执行也无害，回填只是让记录反映事实）。

CREATE TABLE IF NOT EXISTS `schema_version` (
  `version`     varchar(64)  NOT NULL COMMENT '脚本文件名，不含 .sql',
  `description` varchar(255) DEFAULT NULL COMMENT '这一版做了什么',
  `applied_at`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据库迁移执行记录';

-- 回填历史脚本
INSERT IGNORE INTO `schema_version` (`version`, `description`) VALUES
  ('000-schema',                        '全量建表'),
  ('001-data',                          '种子数据 + review_task 回填'),
  ('migrate-010-registration',          '报名表结构调整'),
  ('migrate-011-source-url',            '赛事来源链接字段'),
  ('migrate-012-activity-categories',   '活动分类表'),
  ('migrate-013-comprehensive-score',   '综合测评分数表'),
  ('migrate-014-sync-2024-comprehensive-users', '同步 2024 级综测用户'),
  ('migrate-015-expand-competitions',   '扩充 31 条赛事种子数据'),
  ('migrate-016-competition-sources-cn', '启用国内采集源，关闭静态抓取无收益的 SPA 站'),
  ('migrate-ai-001',                    'AI 赛事草稿表'),
  ('migrate-ai-002-import-quality',     'AI 导入质量字段');

INSERT IGNORE INTO `schema_version` (`version`, `description`)
VALUES ('migrate-017-schema-version', '迁移版本记录表');
