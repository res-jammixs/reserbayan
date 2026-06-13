package com.cagasi.reserbayan.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Service
public class DeepSeekClient {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${DEEPSEEK_API_KEY:}")
    private String apiKey;

    @Value("${app.ai.deepseek.base-url:https://api.deepseek.com}")
    private String baseUrl;

    @Value("${app.ai.deepseek.model:deepseek-v4-flash}")
    private String model;

    @Value("${app.ai.deepseek.timeout-seconds:20}")
    private long timeoutSeconds;

    public DeepSeekClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public Optional<DeepSeekReview> review(DeepSeekReviewRequest reviewRequest) {
        if (!isConfigured()) {
            return Optional.empty();
        }

        try {
            String requestJson = objectMapper.writeValueAsString(buildRequestBody(reviewRequest));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiBaseUrl() + "/chat/completions"))
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("");
            if (content.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(parseReview(content));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private ObjectNode buildRequestBody(DeepSeekReviewRequest reviewRequest) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model == null || model.isBlank() ? "deepseek-v4-flash" : model);
        body.put("stream", false);
        body.put("temperature", 0.1);
        body.put("max_tokens", 1800);
        body.set("response_format", objectMapper.createObjectNode().put("type", "json_object"));

        ArrayNode messages = objectMapper.createArrayNode();
        messages.add(message("system", systemPrompt()));
        messages.add(message("user", buildUserPrompt(reviewRequest)));
        body.set("messages", messages);
        return body;
    }

    private ObjectNode message(String role, String content) {
        ObjectNode message = objectMapper.createObjectNode();
        message.put("role", role);
        message.put("content", content);
        return message;
    }

    private String systemPrompt() {
        return """
                You review barangay document request uploads. Return strict JSON only.
                Do not approve or reject the request. Give advisory evidence for staff.
                Use extracted document content only; if content is unavailable, say NOT_VISIBLE or LOW_CONFIDENCE instead of inventing facts.
                Write explanations in resident-friendly document terms. Do not mention OCR, keyword matching, or missing words.
                For wrong uploads, be direct but gentle, for example: "This document appears to be a Business Plan. The required document is Building plans."
                Requirement statuses must be one of MATCHED, WRONG_DOCUMENT, LOW_CONFIDENCE.
                Identity field statuses must be one of MATCH, MISMATCH, NOT_VISIBLE, LOW_CONFIDENCE.
                Example JSON:
                {
                  "requirements": [
                    {
                      "requirementIndex": 0,
                      "status": "MATCHED",
                      "confidence": 0.86,
                      "detectedDocumentType": "Business Plan",
                      "explanation": "The text describes objectives, market, operations, and financial plan."
                    }
                  ],
                  "identityChecks": [
                    {
                      "fileName": "id.jpg",
                      "field": "name",
                      "extractedValue": "Ana Santos",
                      "status": "MATCH",
                      "confidence": 0.9,
                      "explanation": "The ID name matches the account name."
                    }
                  ]
                }
                """;
    }

    private String buildUserPrompt(DeepSeekReviewRequest reviewRequest) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("task", "Return JSON that classifies each requirement upload and fact-checks valid ID text against the account.");
        root.put("documentName", reviewRequest.documentName());
        ArrayNode requirements = objectMapper.createArrayNode();
        for (DeepSeekRequirement requirement : reviewRequest.requirements()) {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("requirementIndex", requirement.index());
            node.put("requirementText", requirement.text());
            requirements.add(node);
        }
        root.set("requirements", requirements);

        ArrayNode uploads = objectMapper.createArrayNode();
        for (DeepSeekUpload upload : reviewRequest.uploads()) {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("fileName", upload.fileName());
            node.put("requirementIndex", upload.requirementIndex());
            node.put("requirementLabel", upload.requirementLabel());
            node.put("contentStatus", upload.ocrStatus());
            node.put("extractedDocumentContent", truncate(upload.ocrText(), 3500));
            uploads.add(node);
        }
        root.set("uploads", uploads);

        DeepSeekResident resident = reviewRequest.resident();
        ObjectNode residentNode = objectMapper.createObjectNode();
        residentNode.put("fullName", resident.fullName());
        residentNode.put("birthdate", resident.birthdate());
        residentNode.put("gender", resident.gender());
        residentNode.put("address", resident.address());
        root.set("loggedInResident", residentNode);
        root.put("jsonInstruction", "Return only the JSON object in the example shape.");

        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (Exception e) {
            return root.toString();
        }
    }

    DeepSeekReview parseReview(String content) {
        try {
            JsonNode root = objectMapper.readTree(extractJsonObject(content));
            List<DeepSeekRequirementDecision> requirements = new ArrayList<>();
            for (JsonNode node : root.path("requirements")) {
                requirements.add(new DeepSeekRequirementDecision(
                        node.path("requirementIndex").isInt() ? node.path("requirementIndex").asInt() : null,
                        normalizeStatus(node.path("status").asText("LOW_CONFIDENCE"),
                                List.of("MATCHED", "WRONG_DOCUMENT", "LOW_CONFIDENCE"), "LOW_CONFIDENCE"),
                        clampConfidence(node.path("confidence").asDouble(0.45)),
                        textOrNull(node.path("detectedDocumentType")),
                        textOrNull(node.path("explanation"))));
            }

            List<DeepSeekIdentityDecision> identityChecks = new ArrayList<>();
            for (JsonNode node : root.path("identityChecks")) {
                identityChecks.add(new DeepSeekIdentityDecision(
                        textOrNull(node.path("fileName")),
                        textOrNull(node.path("field")),
                        textOrNull(node.path("extractedValue")),
                        normalizeStatus(node.path("status").asText("LOW_CONFIDENCE"),
                                List.of("MATCH", "MISMATCH", "NOT_VISIBLE", "LOW_CONFIDENCE"), "LOW_CONFIDENCE"),
                        clampConfidence(node.path("confidence").asDouble(0.4)),
                        textOrNull(node.path("explanation"))));
            }
            return new DeepSeekReview(requirements, identityChecks);
        } catch (Exception e) {
            return new DeepSeekReview(List.of(), List.of());
        }
    }

    private String normalizeStatus(String status, List<String> allowed, String fallback) {
        String normalized = status == null ? "" : status.trim().toUpperCase();
        return allowed.contains(normalized) ? normalized : fallback;
    }

    private double clampConfidence(double confidence) {
        return Math.max(0, Math.min(1, confidence));
    }

    private String textOrNull(JsonNode node) {
        String value = node == null || node.isMissingNode() || node.isNull() ? null : node.asText(null);
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String truncate(String text, int maxLength) {
        if (text == null) {
            return "";
        }
        return text.length() <= maxLength ? text : text.substring(0, maxLength);
    }

    private String apiBaseUrl() {
        String configuredBaseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.deepseek.com" : baseUrl;
        return configuredBaseUrl.replaceAll("/+$", "");
    }

    private String extractJsonObject(String content) {
        if (content == null) {
            return "{}";
        }
        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "").trim();
        }
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }

    public record DeepSeekReviewRequest(
            String documentName,
            List<DeepSeekRequirement> requirements,
            List<DeepSeekUpload> uploads,
            DeepSeekResident resident) {
    }

    public record DeepSeekRequirement(int index, String text) {
    }

    public record DeepSeekUpload(
            String fileName,
            Integer requirementIndex,
            String requirementLabel,
            String ocrStatus,
            String ocrText) {
    }

    public record DeepSeekResident(String fullName, String birthdate, String gender, String address) {
    }

    public record DeepSeekReview(
            List<DeepSeekRequirementDecision> requirements,
            List<DeepSeekIdentityDecision> identityChecks) {
    }

    public record DeepSeekRequirementDecision(
            Integer requirementIndex,
            String status,
            double confidence,
            String detectedDocumentType,
            String explanation) {
    }

    public record DeepSeekIdentityDecision(
            String fileName,
            String field,
            String extractedValue,
            String status,
            double confidence,
            String explanation) {
    }
}
