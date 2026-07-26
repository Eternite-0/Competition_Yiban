package com.etsaion;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AiDatabaseScriptContractTest {

    @Test
    void flywayBaselineContainsAllAiTablesAndReferenceData() throws Exception {
        Path scriptPath = Path.of("src", "main", "resources", "db", "migration", "V1__schema.sql");
        assertTrue(Files.exists(scriptPath), "Flyway schema baseline must exist");

        String sql = Files.readString(scriptPath);
        assertTrue(sql.contains("CREATE TABLE `ai_task`"));
        assertTrue(sql.contains("CREATE TABLE `award_proof`"));
        assertTrue(sql.contains("CREATE TABLE `award_proof_student`"));
        assertTrue(sql.contains("CREATE TABLE `ai_competition_draft`"));
        assertTrue(sql.contains("CREATE TABLE `competition_source`"));
        assertTrue(sql.contains("CREATE TABLE `ai_conversation`"));
        assertTrue(sql.contains("CREATE TABLE `ai_message`"));
        assertTrue(sql.contains("target_type=award_proof") || sql.contains("award_proof"));

        Path referenceDataPath = Path.of("src", "main", "resources", "db", "migration", "V2__reference_data.sql");
        String referenceData = Files.readString(referenceDataPath);
        assertTrue(referenceData.contains("INSERT INTO `activity_category`"));
        assertTrue(referenceData.contains("INSERT INTO `competition_source`"));
    }
}
