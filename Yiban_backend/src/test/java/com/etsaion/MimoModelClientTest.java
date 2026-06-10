package com.etsaion;

import com.etsaion.service.ai.MimoModelClient;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class MimoModelClientTest {

    @Test
    void describeHttpErrorRecognizesGatewayFailureWrappedInJson() {
        String rawBody = "{\"error\":{\"code\":\"500\",\"message\":\"<html><h1>502 Bad Gateway</h1><center>openresty</center></html>\"}}";

        String message = MimoModelClient.describeHttpError(500, rawBody);

        assertTrue(message.contains("502 Bad Gateway"));
        assertTrue(message.contains("AI_BASE_URL / AI_MODEL"));
    }

    @Test
    void describeHttpErrorRecognizesImageUnsupportedModel() {
        String rawBody = "{\"error\":{\"code\":\"404\",\"message\":\"No endpoints found that support image input\"}}";

        String message = MimoModelClient.describeHttpError(404, rawBody);

        assertTrue(message.contains("AI_VISION_MODEL"));
    }
}
