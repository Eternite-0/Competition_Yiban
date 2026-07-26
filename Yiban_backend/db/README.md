# 数据库与 Flyway

项目以仓库中的 **V1–V5 baseline** 为数据库起点。后端启动时，Flyway 自动执行
`src/main/resources/db/migration/` 中尚未执行的迁移；开发者不再手工串行运行 SQL。

```text
V1__schema.sql             27 张表的当前结构
V2__reference_data.sql     活动分类、AI 采集源
V3__seed_students.sql      院系、班级、花名册、测试账号
V4__seed_scores.sql        官方综测成绩
V5__seed_competitions.sql  赛事、活动、公告
```

## 全新环境

准备一个空的 `etsaion` 库并启动后端即可。`scripts/start-local-backend.ps1` 会自动创建
空库，随后 Flyway 完成建表和种子数据导入。项目本机默认连接：

```text
127.0.0.1:3307/etsaion
username: root
password: root
```

不要静默改连 `localhost:3306`；该端口在项目维护者机器上属于另一套 MySQL 服务。
确实需要自定义时，显式设置 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD`，或设置
`DB_HOST`、`DB_PORT`、`DB_NAME`。

## 已有数据库

非空数据库不会被自动 baseline。只有确认它已经符合当前 27 表 baseline 时，才执行：

```powershell
Get-Content -Raw -Encoding UTF8 .\Yiban_backend\db\adopt-flyway.sql |
  mysql --protocol=TCP -h 127.0.0.1 -P 3307 -u root -proot etsaion
```

认领脚本会检查 27 张必需表，然后只写入一条 `BASELINE` 记录（版本 V5）。它不会重放
V1–V5，也不会改业务数据。缺表时脚本会失败；此时不要强行认领，应备份后重建空库。

## 修改数据库

已提交的迁移是不可变记录：**只能新增迁移，不能修改 V1–V5。** 例如：

```text
V6__add_competition_tags_index.sql
```

版本号连续递增，描述使用下划线分词。后端下次启动时会自动应用 V6，并在
`flyway_schema_history` 中记录版本与 checksum。

## 常见问题

- `Found non-empty schema(s) ... but no schema history table`：这是旧库，按上面的“已有数据库”处理。
- `Migration checksum mismatch`：有人改了已经执行过的迁移。恢复原文件，并把变更写成新版本。
- `Unsupported Database`：确认使用项目锁定的 Flyway 7.15.0，以及 MySQL 5.7/8.x。
- 临时跳过迁移：设置 `FLYWAY_ENABLED=false`；仅用于明确知道数据库已就绪的诊断场景。

## 旧脚本

Flyway 之前的脚本已移到 `legacy/`，只用于追溯，不能再作为初始化入口。特别是旧的
`000-schema.sql` 含 `DROP TABLE IF EXISTS`，执行会清空已有数据。
