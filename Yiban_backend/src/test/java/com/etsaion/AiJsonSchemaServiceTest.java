package com.etsaion;

import com.etsaion.config.AiProperties;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.ai.AiJsonSchemaService;
import com.etsaion.service.ai.MimoModelClient;
import com.etsaion.vo.ai.AiModelResponseVO;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiJsonSchemaServiceTest {

    @Test
    void extractsJsonFromMarkdownResponse() {
        AiJsonSchemaService service = new AiJsonSchemaService();

        JsonNode node = service.parseJson("识别结果如下：```json\n{\"competitionName\":\"蓝桥杯\"}\n```");

        assertEquals("蓝桥杯", node.get("competitionName").asText());
    }

    @Test
    void rejectsInvalidCertificateConfidenceWithReadableError() {
        AiJsonSchemaService service = new AiJsonSchemaService();

        BusinessException error = assertThrows(BusinessException.class,
                () -> service.validateCertificateResult("{\"confidence\":1.5,\"riskFlags\":[]}"));

        assertTrue(error.getMessage().contains("confidence"));
    }

    @Test
    void rejectsInvalidDocumentArrayAndDateFields() {
        AiJsonSchemaService service = new AiJsonSchemaService();

        BusinessException error = assertThrows(BusinessException.class,
                () -> service.validateCompetitionParseResult("{\"competitions\":[{\"name\":\"测试\",\"startTime\":\"明天\",\"tags\":\"AI\"}]}"));

        assertTrue(error.getMessage().contains("日期"));
        assertTrue(error.getMessage().contains("数组"));
    }

    @Test
    void rejectsInvalidSnakeCaseDocumentDateFields() {
        AiJsonSchemaService service = new AiJsonSchemaService();

        BusinessException error = assertThrows(BusinessException.class,
                () -> service.validateCompetitionParseResult("{\"competitions\":[{\"name\":\"测试\",\"registration_start\":\"明天\"}]}"));

        assertTrue(error.getMessage().contains("registration_start"));
        assertTrue(error.getMessage().contains("日期"));
    }

    @Test
    void rejectsInvalidChineseDocumentDateFields() {
        AiJsonSchemaService service = new AiJsonSchemaService();

        BusinessException error = assertThrows(BusinessException.class,
                () -> service.validateCompetitionParseResult("{\"competitions\":[{\"赛事名称\":\"测试\",\"报名开始时间\":\"明天\"}]}"));

        assertTrue(error.getMessage().contains("报名开始时间"));
        assertTrue(error.getMessage().contains("日期"));
    }

    @Test
    void rejectsInvalidCompetitionNamedDateFields() {
        AiJsonSchemaService service = new AiJsonSchemaService();

        BusinessException error = assertThrows(BusinessException.class,
                () -> service.validateCompetitionParseResult("{\"competitions\":[{\"competitionName\":\"测试\",\"registrationStartTime\":\"明天\"}]}"));

        assertTrue(error.getMessage().contains("registrationStartTime"));
        assertTrue(error.getMessage().contains("日期"));
    }

    @Test
    void validatesCrawlerResultShape() {
        AiJsonSchemaService service = new AiJsonSchemaService();

        JsonNode node = service.validateCrawlerResult("{\"isCompetitionPage\":true,\"competitions\":[],\"confidence\":0.8}");

        assertTrue(node.get("isCompetitionPage").asBoolean());
    }

    @Test
    void parseFailureTriggersOneRepairRequest() {
        AiJsonSchemaService service = new AiJsonSchemaService();
        AtomicInteger calls = new AtomicInteger();
        MimoModelClient fakeClient = new MimoModelClient(new AiProperties()) {
            @Override
            public AiModelResponseVO chatJson(String systemPrompt, String userPrompt, java.util.Map<String, Object> schemaHint) {
                calls.incrementAndGet();
                return AiModelResponseVO.success("{\"fixed\":true}", "{\"choices\":[]}");
            }
        };
        ReflectionTestUtils.setField(service, "mimoModelClient", fakeClient);

        JsonNode node = service.parseJsonWithRepair("not json", "certificate_recognition");

        assertTrue(node.get("fixed").asBoolean());
        assertEquals(1, calls.get());
    }
}
