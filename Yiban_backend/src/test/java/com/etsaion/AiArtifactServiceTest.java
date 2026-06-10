package com.etsaion;

import com.etsaion.service.ai.AiArtifactService;
import com.etsaion.vo.ai.AiArtifactVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiArtifactServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void createExcelArtifactWritesDownloadableXlsx() throws Exception {
        AiArtifactService service = serviceWithUploadPath();

        AiArtifactVO artifact = service.createExcelArtifact(
                "报名记录导出",
                "当前学生报名记录",
                List.of("赛事", "状态"),
                List.of(List.of("程序设计竞赛", "已报名")),
                "报名记录"
        );

        assertEquals("xlsx", artifact.getType());
        assertTrue(artifact.getUrl().endsWith(".xlsx"));
        assertTrue(Files.exists(tempDir.resolve(artifact.getId() + ".xlsx")));
    }

    @Test
    void createDocxArtifactWritesDownloadableDocx() throws Exception {
        AiArtifactService service = serviceWithUploadPath();

        AiArtifactVO artifact = service.createDocxArtifact(
                "待审核任务汇总",
                "管理员待审核任务",
                List.of("以下为当前待审核任务汇总。"),
                List.of("任务", "提交人"),
                List.of(List.of("赛事草稿审核", "张三"))
        );

        assertEquals("docx", artifact.getType());
        assertTrue(artifact.getUrl().endsWith(".docx"));
        assertTrue(Files.exists(tempDir.resolve(artifact.getId() + ".docx")));
    }

    private AiArtifactService serviceWithUploadPath() throws Exception {
        AiArtifactService service = new AiArtifactService();
        Field field = AiArtifactService.class.getDeclaredField("uploadPath");
        field.setAccessible(true);
        field.set(service, tempDir.toString());
        return service;
    }
}
