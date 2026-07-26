package com.etsaion;

import com.etsaion.entity.AiCompetitionDraft;
import com.etsaion.entity.AiTask;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.AiCompetitionDraftMapper;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.ai.AiJsonSchemaService;
import com.etsaion.service.ai.DraftDedupService;
import com.etsaion.service.ai.AiTaskService;
import com.etsaion.service.ai.DocumentContentService;
import com.etsaion.service.ai.MimoModelClient;
import com.etsaion.service.impl.AiCompetitionDraftServiceImpl;
import com.etsaion.vo.ai.AiCompetitionParseResultVO;
import com.etsaion.vo.ai.AiModelResponseVO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiCompetitionImportQualityTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void documentServiceExtractsPdfText() throws Exception {
        DocumentContentService service = new DocumentContentService();

        DocumentContentService.ExtractedDocument result = service.readTextDetailed("notice.pdf",
                pdfWithText("AI Challenge registration deadline 2026-07-20 18:00:00. "
                        + "The organizer invites student teams to submit projects, reports, demos, and innovation materials for review."));

        assertTrue(result.getText().contains("AI Challenge"));
        assertTrue(result.getImageDataUrls().isEmpty());
        assertFalse(result.getWarnings().contains("pdf_scan_image_fallback"));
    }

    @Test
    void documentServiceRendersBlankPdfForVisionFallback() throws Exception {
        DocumentContentService service = new DocumentContentService();

        DocumentContentService.ExtractedDocument result = service.readTextDetailed("scan.pdf", blankPdf());

        assertTrue(result.getWarnings().contains("pdf_scan_image_fallback"));
        assertFalse(result.getImageDataUrls().isEmpty());
        assertTrue(result.getImageDataUrls().get(0).startsWith("data:image/png;base64,"));
    }

    @Test
    void documentServiceBlocksPrivateUrls() {
        DocumentContentService service = new DocumentContentService();

        assertThrows(BusinessException.class, () -> service.readUrlDetailed("http://127.0.0.1/notice"));
    }

    @Test
    void createDraftAcceptsEnglishDatesAndAddsInternationalTags() throws Exception {
        AiCompetitionDraftServiceImpl service = new AiCompetitionDraftServiceImpl();
        ReflectionTestUtils.setField(service, "competitionService", mock(CompetitionService.class));
        ReflectionTestUtils.setField(service, "draftDedupService", mock(DraftDedupService.class));

        JsonNode node = objectMapper.readTree("{"
                + "\"name\":\"Kaggle AI Forecasting Challenge\","
                + "\"organizer\":\"Kaggle\","
                + "\"deadline\":\"June 10, 2026\","
                + "\"content\":\"Build a machine learning model for a global data science challenge.\","
                + "\"sourceUrl\":\"https://www.kaggle.com/competitions/example\""
                + "}");

        AiCompetitionDraft draft = ReflectionTestUtils.invokeMethod(service, "createDraftFromJson",
                9L, "url", "https://www.kaggle.com/competitions", "Kaggle Competitions", node);

        assertNotNull(draft);
        assertEquals(LocalDateTime.of(2026, 6, 10, 0, 0), draft.getEndTime());
        assertTrue(draft.getTags().contains("国际"));
        assertTrue(draft.getTags().contains("AI"));
        assertTrue(draft.getTags().contains("科技"));
    }

    @Test
    void parseFileBatchSavesAllCompetitionsReturnedByModel() {
        AiCompetitionDraftMapper mapper = mock(AiCompetitionDraftMapper.class);
        DocumentContentService documentContentService = mock(DocumentContentService.class);
        AiTaskService aiTaskService = mock(AiTaskService.class);
        MimoModelClient modelClient = mock(MimoModelClient.class);
        CompetitionService competitionService = mock(CompetitionService.class);
        AiCompetitionDraftServiceImpl service = new AiCompetitionDraftServiceImpl();
        ReflectionTestUtils.setField(service, "baseMapper", mapper);
        ReflectionTestUtils.setField(service, "documentContentService", documentContentService);
        ReflectionTestUtils.setField(service, "aiTaskService", aiTaskService);
        ReflectionTestUtils.setField(service, "mimoModelClient", modelClient);
        ReflectionTestUtils.setField(service, "aiJsonSchemaService", new AiJsonSchemaService());
        ReflectionTestUtils.setField(service, "competitionService", competitionService);
        ReflectionTestUtils.setField(service, "draftDedupService", mock(DraftDedupService.class));

        AtomicLong ids = new AtomicLong(100);
        when(mapper.insert(any(AiCompetitionDraft.class))).thenAnswer(invocation -> {
            AiCompetitionDraft draft = invocation.getArgument(0);
            draft.setId(ids.incrementAndGet());
            return 1;
        });
        when(documentContentService.readMultipartFileDetailed(any())).thenReturn(
                DocumentContentService.ExtractedDocument.text("two competitions")
                        .withSource("batch.txt", "batch.txt"));
        AiTask task = new AiTask();
        task.setId(77L);
        when(aiTaskService.createTask(any(), any(), any(), any(), any(), any(), any())).thenReturn(task);
        when(competitionService.getOne(any())).thenReturn(null);
        when(competitionService.list(ArgumentMatchers.<com.baomidou.mybatisplus.core.conditions.Wrapper<com.etsaion.entity.Competition>>any()))
                .thenReturn(List.of());
        when(modelClient.chatJson(any(), any(), ArgumentMatchers.<java.util.Map<String, Object>>any()))
                .thenReturn(AiModelResponseVO.success("{\"competitions\":["
                        + "{\"name\":\"AI Challenge A\",\"endTime\":\"2026-07-20 18:00:00\",\"tags\":[\"AI\"],\"fieldConfidence\":{\"name\":0.9,\"endTime\":0.9}},"
                        + "{\"name\":\"English Speech Contest\",\"endTime\":\"2026-08-10 18:00:00\",\"tags\":[\"英语\"],\"fieldConfidence\":{\"name\":0.88,\"endTime\":0.86}}"
                        + "]}", "{}"));

        AiCompetitionParseResultVO result = service.parseFileBatch(1L,
                new MockMultipartFile("file", "batch.txt", "text/plain", "ignored".getBytes()));

        assertEquals(77L, result.getTaskId());
        assertEquals(2, result.getDrafts().size());
        assertEquals("AI Challenge A", result.getDrafts().get(0).getName());
        assertEquals("English Speech Contest", result.getDrafts().get(1).getName());
    }

    private byte[] pdfWithText(String text) throws Exception {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(doc, page)) {
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(72, 720);
                content.showText(text);
                content.endText();
            }
            doc.save(out);
            return out.toByteArray();
        }
    }

    private byte[] blankPdf() throws Exception {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.addPage(new PDPage());
            doc.save(out);
            return out.toByteArray();
        }
    }
}
