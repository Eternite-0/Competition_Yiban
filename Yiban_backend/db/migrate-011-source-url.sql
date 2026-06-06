-- Migration: Add source_url column to competition table
-- Stores the official website or announcement URL for each competition

ALTER TABLE `competition`
  ADD COLUMN `source_url` varchar(500) DEFAULT NULL COMMENT '赛事官网/公告链接' AFTER `cover_url`;
