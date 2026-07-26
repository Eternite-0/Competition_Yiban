# 已归档的建库脚本

这些脚本在项目改用 Flyway 之前使用，**不要再执行**。
当前的迁移在 `src/main/resources/db/migration/`，后端启动时由 Flyway 自动执行。

保留它们只是为了追溯历史改动。

## 为什么换掉

- `000-schema.sql` 每张表前面都有 `DROP TABLE IF EXISTS`。它被描述为"幂等、可重复运行"——
  形状上确实幂等，但会把数据全部清空，所以没人敢在有数据的库上跑，
  于是各人的库停在不同版本上，谁也不知道自己缺了哪些改动。
- `docker-compose.yml` 把整个 `db/` 挂到 `docker-entrypoint-initdb.d`，
  而 MySQL 镜像只在数据目录为空时执行一次。老容器早已初始化，
  之后新增的 `migrate-*.sql` 永远不会自动跑。
- 执行顺序靠文件名序号人工维护，schema 变更和种子数据混在同一串编号里。

这不是假想的问题：2026-07-26 的冒烟测试有 23 项失败，根因是本地库缺 `activity_category` 表——
`000-schema.sql` 里明明定义了它，但那个库是从更早的版本建的，之后再没同步过。

## 内容对照

| 脚本 | 现在在哪 |
|---|---|
| `000-schema.sql` | `V1__schema.sql` |
| `migrate-012-activity-categories.sql`、`migrate-016-competition-sources-cn.sql` | `V2__reference_data.sql` |
| `import-roster-2024.sql`、`migrate-014-*` | `V3__seed_students.sql` |
| `migrate-013-comprehensive-score.sql` | `V4__seed_scores.sql` |
| `001-data.sql`、`migrate-015-expand-competitions.sql` | `V5__seed_competitions.sql` |
| `migrate-010/011`、`migrate-ai-001/002`、`migrate-017/018` | 已并入 `V1__schema.sql` 的表结构 |

`migrate-017-schema-version.sql` 建的 `schema_version` 表也已废弃——
它只记录不执行，责任仍在人。Flyway 的 `flyway_schema_history` 取代了它。

当前两个 Compose 配置都已移除 `db/` 初始化挂载，避免归档脚本或认领脚本被容器误执行。

`roster-tools/` 保存了早期生成/导入花名册的 Python 和 Excel 临时工具。它们包含旧机器的
绝对路径与旧连接参数，也已被 V3/V4 baseline 取代，不能直接用于当前数据库。
