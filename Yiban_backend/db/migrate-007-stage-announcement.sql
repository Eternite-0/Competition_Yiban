USE etsaion;

-- 赛事阶段表
CREATE TABLE IF NOT EXISTS competition_stage (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  competition_id BIGINT NOT NULL COMMENT '关联赛事ID',
  name VARCHAR(100) NOT NULL COMMENT '阶段名称',
  stage_order INT NOT NULL DEFAULT 1 COMMENT '阶段排序',
  start_time DATETIME COMMENT '阶段开始时间',
  end_time DATETIME COMMENT '阶段结束时间',
  description TEXT COMMENT '阶段说明/材料要求',
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming' COMMENT 'upcoming/active/closed',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_competition (competition_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 学生阶段进度表
CREATE TABLE IF NOT EXISTS student_stage_progress (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL COMMENT '学生ID',
  competition_id BIGINT NOT NULL COMMENT '赛事ID',
  stage_id BIGINT NOT NULL COMMENT '阶段ID',
  registration_id BIGINT COMMENT '关联报名ID',
  status VARCHAR(20) NOT NULL DEFAULT 'not_started' COMMENT 'not_started/in_progress/submitted/passed/failed',
  submit_time DATETIME COMMENT '提交时间',
  review_time DATETIME COMMENT '审核时间',
  review_note VARCHAR(500) COMMENT '审核意见',
  reviewer_id BIGINT COMMENT '审核人ID',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_student_stage (student_id, stage_id),
  INDEX idx_student_comp (student_id, competition_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 公告表
CREATE TABLE IF NOT EXISTS announcement (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  competition_id BIGINT COMMENT '关联赛事ID，NULL表示系统公告',
  stage_id BIGINT COMMENT '关联阶段ID，NULL表示赛事级公告',
  title VARCHAR(200) NOT NULL COMMENT '公告标题',
  content TEXT NOT NULL COMMENT '公告内容',
  author_id BIGINT NOT NULL COMMENT '发布者ID',
  type VARCHAR(20) NOT NULL DEFAULT 'system' COMMENT 'system/competition/stage',
  is_pinned TINYINT NOT NULL DEFAULT 0 COMMENT '是否置顶',
  status VARCHAR(20) NOT NULL DEFAULT 'published' COMMENT 'draft/published',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_competition (competition_id),
  INDEX idx_type_status (type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 种子数据：系统公告（阶段由管理员按需创建，不预设）
INSERT IGNORE INTO announcement (competition_id, title, content, author_id, type, is_pinned, status) VALUES
(NULL, '2026春季学期赛事安排', '本学期共有6项赛事开放报名，请关注赛事大厅。', 1, 'system', 1, 'published'),
(NULL, '综测加分政策', '每次报名+2分，获奖+15分。详情咨询辅导员。', 1, 'system', 0, 'published');
