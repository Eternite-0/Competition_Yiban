package com.etsaion;

import com.etsaion.interceptor.RequireRole;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AwardProofContractTest {

    @Test
    void awardProofBackendContractExists() throws Exception {
        assertNotNull(Class.forName("com.etsaion.entity.AwardProof"));
        assertNotNull(Class.forName("com.etsaion.entity.AwardProofStudent"));
        assertNotNull(Class.forName("com.etsaion.mapper.AwardProofMapper"));
        assertNotNull(Class.forName("com.etsaion.mapper.AwardProofStudentMapper"));
        assertNotNull(Class.forName("com.etsaion.dto.ai.CertificateRecognizeDTO"));
        assertNotNull(Class.forName("com.etsaion.dto.ai.AwardProofSubmitDTO"));
        assertNotNull(Class.forName("com.etsaion.dto.ai.AwardProofReviewDTO"));
        assertNotNull(Class.forName("com.etsaion.vo.ai.AwardProofVO"));

        Class<?> service = Class.forName("com.etsaion.service.AwardProofService");
        assertTrue(hasMethod(service, "recognizeCertificate"));
        assertTrue(hasMethod(service, "submitAwardProof"));
        assertTrue(hasMethod(service, "listMyAwardProofs"));
        assertTrue(hasMethod(service, "listAuditAwardProofs"));
        assertTrue(hasMethod(service, "getAwardProofDetail"));
        assertTrue(hasMethod(service, "reviewAwardProof"));
    }

    @Test
    void awardProofControllerExposesCertificateAndAuditEndpoints() throws Exception {
        Class<?> controller = Class.forName("com.etsaion.controller.AwardProofController");
        RequireRole role = controller.getAnnotation(RequireRole.class);
        assertNotNull(role);
        assertTrue(Arrays.asList(role.value()).contains("student"));
        assertTrue(Arrays.asList(role.value()).contains("teacher"));
        assertTrue(Arrays.asList(role.value()).contains("admin"));
        assertTrue(hasMethod(controller, "recognizeCertificate"));
        assertTrue(hasMethod(controller, "submitAwardProof"));
        assertTrue(hasMethod(controller, "listMine"));
        assertTrue(hasMethod(controller, "listAudit"));
        assertTrue(hasMethod(controller, "detail"));
        assertTrue(hasMethod(controller, "review"));
    }

    private boolean hasMethod(Class<?> type, String name) {
        return Arrays.stream(type.getDeclaredMethods())
                .map(Method::getName)
                .anyMatch(name::equals);
    }
}
