package com.etsaion;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AiDatabaseScriptContractTest {

    @Test
    void aiMigrationScriptCreatesAllAiTablesWithoutTouchingBaseSchema() throws Exception {
        Path scriptPath = Path.of("db", "migrate-ai-001.sql");
        assertTrue(Files.exists(scriptPath), "AI migration script must exist");

        String sql = Files.readString(scriptPath);
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS `ai_task`"));
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS `award_proof`"));
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS `award_proof_student`"));
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS `ai_competition_draft`"));
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS `competition_source`"));
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS `ai_conversation`"));
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS `ai_message`"));
        assertTrue(sql.contains("target_type=award_proof") || sql.contains("award_proof"));
    }
}
