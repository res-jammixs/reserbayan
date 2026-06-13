package com.cagasi.reserbayan.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.cagasi.reserbayan.dto.AiAnalysisDTO;
import com.cagasi.reserbayan.dto.AiAttachmentMetadataDTO;
import com.cagasi.reserbayan.entity.DocumentRequest;
import com.cagasi.reserbayan.entity.DocumentRequestAnalysis;
import com.cagasi.reserbayan.entity.DocumentType;
import com.cagasi.reserbayan.entity.RequestAttachment;
import com.cagasi.reserbayan.entity.Resident;
import com.cagasi.reserbayan.service.DeepSeekClient.DeepSeekIdentityDecision;
import com.cagasi.reserbayan.service.DeepSeekClient.DeepSeekRequirement;
import com.cagasi.reserbayan.service.DeepSeekClient.DeepSeekRequirementDecision;
import com.cagasi.reserbayan.service.DeepSeekClient.DeepSeekResident;
import com.cagasi.reserbayan.service.DeepSeekClient.DeepSeekReview;
import com.cagasi.reserbayan.service.DeepSeekClient.DeepSeekReviewRequest;
import com.cagasi.reserbayan.service.DeepSeekClient.DeepSeekUpload;
import com.cagasi.reserbayan.repository.DocumentRequestAnalysisRepository;
import com.cagasi.reserbayan.repository.DocumentRequestRepository;
import com.cagasi.reserbayan.repository.RequestAttachmentRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AiRequirementAnalysisService {

    private final DocumentRequestAnalysisRepository analysisRepository;
    private final DocumentRequestRepository documentRequestRepository;
    private final RequestAttachmentRepository attachmentRepository;
    private final ObjectMapper objectMapper;
    private final OcrService ocrService;
    private final DeepSeekClient deepSeekClient;

    public AiRequirementAnalysisService(
            DocumentRequestAnalysisRepository analysisRepository,
            DocumentRequestRepository documentRequestRepository,
            RequestAttachmentRepository attachmentRepository,
            ObjectMapper objectMapper,
            OcrService ocrService,
            DeepSeekClient deepSeekClient) {
        this.analysisRepository = analysisRepository;
        this.documentRequestRepository = documentRequestRepository;
        this.attachmentRepository = attachmentRepository;
        this.objectMapper = objectMapper;
        this.ocrService = ocrService;
        this.deepSeekClient = deepSeekClient;
    }

    public AiAnalysisDTO analyzePreview(DocumentType documentType, List<MultipartFile> files,
            List<AiAttachmentMetadataDTO> metadata) {
        return analyzePreview(documentType, null, files, metadata);
    }

    public AiAnalysisDTO analyzePreview(DocumentType documentType, Resident resident, List<MultipartFile> files,
            List<AiAttachmentMetadataDTO> metadata) {
        List<UploadItem> uploadItems = new ArrayList<>();
        List<MultipartFile> safeFiles = files == null ? Collections.emptyList() : files;
        for (int index = 0; index < safeFiles.size(); index++) {
            MultipartFile file = safeFiles.get(index);
            AiAttachmentMetadataDTO itemMetadata = metadata != null && metadata.size() > index ? metadata.get(index) : null;
            uploadItems.add(UploadItem.fromMultipart(file, itemMetadata, ocrService.extractText(file)));
        }
        return analyze(documentType, null, resident, uploadItems);
    }

    public AiAnalysisDTO analyzeAndSave(Long requestId) {
        DocumentRequest documentRequest = documentRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Document request not found"));
        List<RequestAttachment> attachments = attachmentRepository.findByDocumentRequest_RequestId(requestId);
        List<UploadItem> uploadItems = attachments.stream()
                .map(attachment -> UploadItem.fromAttachment(attachment, ocrService.extractText(attachment)))
                .collect(Collectors.toList());
        AiAnalysisDTO analysis = analyze(documentRequest.getDocumentType(), requestId, documentRequest.getResident(), uploadItems);
        saveAnalysis(documentRequest, analysis);
        return analysis;
    }

    public Optional<AiAnalysisDTO> getSavedAnalysis(Long requestId) {
        return analysisRepository.findByDocumentRequest_RequestId(requestId)
                .map(this::convertFromEntity);
    }

    private AiAnalysisDTO analyze(DocumentType documentType, Long requestId, Resident resident, List<UploadItem> uploadItems) {
        List<String> requirements = parseRequirements(documentType);
        Optional<DeepSeekReview> deepSeekReview = requestDeepSeekReview(documentType, requirements, resident, uploadItems);

        AiAnalysisDTO dto = new AiAnalysisDTO();
        dto.setRequestId(requestId);
        dto.setAnalyzedAt(LocalDateTime.now().toString());

        for (int requirementIndex = 0; requirementIndex < requirements.size(); requirementIndex++) {
            final int currentRequirementIndex = requirementIndex;
            String requirement = requirements.get(requirementIndex);
            List<UploadItem> slotItems = uploadItems.stream()
                    .filter(item -> Objects.equals(item.requirementIndex(), currentRequirementIndex))
                    .toList();
            List<UploadItem> candidateItems = slotItems.isEmpty()
                    ? uploadItems.stream().filter(item -> item.requirementIndex() == null).toList()
                    : slotItems;
            List<MatchResult> matchResults = candidateItems.stream()
                    .map(item -> matchRequirement(requirement, item))
                    .toList();
            List<MatchResult> matchedResults = matchResults.stream()
                    .filter(MatchResult::matched)
                    .toList();
            Optional<MatchResult> wrongDocument = matchResults.stream()
                    .filter(MatchResult::wrongDocument)
                    .findFirst();
            Optional<MatchResult> unreadable = matchResults.stream()
                    .filter(result -> "UNREADABLE".equals(result.item().ocrStatus())
                            || "OCR_UNAVAILABLE".equals(result.item().ocrStatus())
                            || "UNSUPPORTED".equals(result.item().ocrStatus()))
                    .findFirst();

            AiAnalysisDTO.RequirementResult result = new AiAnalysisDTO.RequirementResult();
            result.setRequirementIndex(currentRequirementIndex);
            result.setRequirementText(requirement);
            result.setMatchedFileNames(matchedResults.stream().map(match -> match.item().fileName()).toList());
            result.setReviewSource("OCR_HEURISTIC");

            if (candidateItems.isEmpty()) {
                result.setStatus("MISSING");
                result.setConfidence(0.18);
                result.setExplanation("No uploaded file clearly matches this requirement yet.");
            } else if (!matchedResults.isEmpty()) {
                result.setStatus("MATCHED");
                result.setConfidence(0.91);
                result.setExplanation("This document appears to match the required " + displayRequirement(requirement) + ".");
            } else if (wrongDocument.isPresent()) {
                result.setStatus("WRONG_DOCUMENT");
                result.setConfidence(0.22);
                result.setExplanation(wrongDocument.get().explanation());
            } else if (unreadable.isPresent()) {
                result.setStatus(unreadable.get().item().ocrStatus());
                result.setConfidence(0.12);
                result.setExplanation(unreadable.get().item().ocrMessage() != null
                        ? unreadable.get().item().ocrMessage()
                        : "We could not clearly review this document. Please upload a clearer file if possible.");
            } else {
                result.setStatus("LOW_CONFIDENCE");
                result.setConfidence(0.38);
                result.setExplanation("This document does not seem to match the required " + displayRequirement(requirement) + ".");
            }
            applyDeepSeekRequirementDecision(result, candidateItems, deepSeekReview);
            dto.getRequirements().add(result);
        }

        for (UploadItem item : uploadItems) {
            MatchResult slotMatch = item.requirementLabel() != null
                    ? matchRequirement(item.requirementLabel(), item)
                    : MatchResult.unmatched(item, List.of(), List.of());
            AiAnalysisDTO.AttachmentResult result = new AiAnalysisDTO.AttachmentResult();
            result.setFileName(item.fileName());
            result.setRequirementLabel(item.requirementLabel());
            result.setStatus(item.ocrStatus());
            result.setReadabilityScore(getReadabilityScore(item));
            result.setWarning(slotMatch.explanation() != null ? slotMatch.explanation() : getAttachmentWarning(item));
            result.setExtractedTextExcerpt(excerpt(item.ocrText()));
            result.setDetectedDocumentType(detectDocumentType(item.ocrText()));
            result.setReviewSource("OCR_HEURISTIC");
            result.setMatchedKeywords(slotMatch.matchedKeywords());
            result.setMissingKeywords(slotMatch.missingKeywords());
            dto.getAttachments().add(result);
        }

        dto.setIdentityChecks(buildIdentityChecks(resident, uploadItems, deepSeekReview));

        boolean hasMissing = dto.getRequirements().stream().anyMatch(item -> "MISSING".equals(item.getStatus()));
        boolean hasWrongDocument = dto.getRequirements().stream().anyMatch(item -> "WRONG_DOCUMENT".equals(item.getStatus()));
        boolean hasUnavailable = dto.getRequirements().stream().anyMatch(item -> "OCR_UNAVAILABLE".equals(item.getStatus()))
                || dto.getAttachments().stream().anyMatch(item -> "OCR_UNAVAILABLE".equals(item.getStatus()));
        boolean hasUnreadable = dto.getRequirements().stream().anyMatch(item -> "UNREADABLE".equals(item.getStatus()))
                || dto.getAttachments().stream().anyMatch(item -> "UNREADABLE".equals(item.getStatus()) || "OCR_UNAVAILABLE".equals(item.getStatus()));
        boolean hasLowConfidence = dto.getRequirements().stream().anyMatch(item -> "LOW_CONFIDENCE".equals(item.getStatus()))
                || dto.getAttachments().stream().anyMatch(item -> "LOW_CONFIDENCE".equals(item.getStatus()));
        boolean hasIdentityMismatch = dto.getIdentityChecks().stream().anyMatch(item -> "MISMATCH".equals(item.getStatus()));

        if (hasIdentityMismatch) {
            dto.setOverallStatus("IDENTITY_MISMATCH");
            dto.setSummary("An uploaded ID may not match the logged-in resident account. Staff should review it manually.");
        } else if (hasWrongDocument) {
            dto.setOverallStatus("WRONG_DOCUMENT");
            dto.setSummary("One or more uploads appear to be a different document than required.");
        } else if (hasUnavailable) {
            dto.setOverallStatus("OCR_UNAVAILABLE");
            dto.setSummary("Automatic document checking is temporarily unavailable. Staff can still review the uploaded files manually.");
        } else if (hasUnreadable) {
            dto.setOverallStatus("UNREADABLE");
            dto.setSummary("Some uploaded files could not be read. Please upload a clearer file if possible.");
        } else if (hasMissing) {
            dto.setOverallStatus("MISSING_ITEMS");
            dto.setSummary("Some listed requirements do not have a clear matching upload yet.");
        } else if (hasLowConfidence) {
            dto.setOverallStatus("LOW_CONFIDENCE");
            dto.setSummary("The required files are present, but one or more may need closer review.");
        } else if (requirements.isEmpty()) {
            dto.setOverallStatus(uploadItems.isEmpty() ? "COMPLETE" : "LOW_CONFIDENCE");
            dto.setSummary(uploadItems.isEmpty()
                    ? "This document has no listed upload requirements."
                    : "Supporting files were added for a document with no listed requirement slots.");
        } else {
            dto.setOverallStatus("COMPLETE");
            dto.setSummary("All listed requirements appear to have matching uploads.");
        }

        return dto;
    }

    private Optional<DeepSeekReview> requestDeepSeekReview(DocumentType documentType, List<String> requirements,
            Resident resident, List<UploadItem> uploadItems) {
        if (uploadItems.stream().noneMatch(item -> "READABLE".equals(item.ocrStatus()))) {
            return Optional.empty();
        }
        List<DeepSeekRequirement> requirementPayload = new ArrayList<>();
        for (int index = 0; index < requirements.size(); index++) {
            requirementPayload.add(new DeepSeekRequirement(index, requirements.get(index)));
        }
        List<DeepSeekUpload> uploadPayload = uploadItems.stream()
                .map(item -> new DeepSeekUpload(item.fileName(), item.requirementIndex(), item.requirementLabel(),
                        item.ocrStatus(), item.ocrText()))
                .toList();
        DeepSeekReviewRequest request = new DeepSeekReviewRequest(
                documentType != null ? documentType.getDocumentName() : null,
                requirementPayload,
                uploadPayload,
                residentProfile(resident));
        return deepSeekClient.review(request);
    }

    private void applyDeepSeekRequirementDecision(AiAnalysisDTO.RequirementResult result, List<UploadItem> candidateItems,
            Optional<DeepSeekReview> deepSeekReview) {
        if (deepSeekReview.isEmpty() || candidateItems.stream().noneMatch(item -> "READABLE".equals(item.ocrStatus()))) {
            return;
        }
        Optional<DeepSeekRequirementDecision> decision = deepSeekReview.get().requirements().stream()
                .filter(item -> Objects.equals(item.requirementIndex(), result.getRequirementIndex()))
                .findFirst();
        if (decision.isEmpty()) {
            return;
        }

        DeepSeekRequirementDecision value = decision.get();
        result.setStatus(value.status());
        result.setConfidence(value.confidence());
        result.setReviewSource("DEEPSEEK");
        result.setDetectedDocumentType(value.detectedDocumentType());
        result.setExplanation(value.explanation() != null
                ? sanitizeResidentExplanation(value.explanation())
                : "AI review marked this upload as " + value.status().toLowerCase(Locale.ROOT).replace("_", " ") + ".");
        if ("MATCHED".equals(value.status()) && result.getMatchedFileNames().isEmpty()) {
            result.setMatchedFileNames(candidateItems.stream()
                    .filter(item -> "READABLE".equals(item.ocrStatus()))
                    .map(UploadItem::fileName)
                    .toList());
        }
    }

    private List<AiAnalysisDTO.IdentityCheckResult> buildIdentityChecks(Resident resident, List<UploadItem> uploadItems,
            Optional<DeepSeekReview> deepSeekReview) {
        List<AiAnalysisDTO.IdentityCheckResult> checks = new ArrayList<>();
        if (resident == null) {
            return checks;
        }

        if (deepSeekReview.isPresent()) {
            for (DeepSeekIdentityDecision decision : deepSeekReview.get().identityChecks()) {
                AiAnalysisDTO.IdentityCheckResult result = new AiAnalysisDTO.IdentityCheckResult();
                result.setFileName(decision.fileName());
                result.setField(decision.field());
                result.setAccountValue(accountValueForField(resident, decision.field()));
                result.setExtractedValue(decision.extractedValue());
                result.setStatus(decision.status());
                result.setConfidence(decision.confidence());
                result.setExplanation(sanitizeResidentExplanation(decision.explanation()));
                checks.add(result);
            }
        }

        Set<String> aiCoveredKeys = checks.stream()
                .map(item -> safe(item.getFileName()) + "|" + normalize(item.getField()))
                .collect(Collectors.toSet());
        for (UploadItem item : uploadItems) {
            if (!isIdRequirement(item.requirementLabel()) || !"READABLE".equals(item.ocrStatus())) {
                continue;
            }
            for (String field : List.of("name", "birthdate", "gender", "address")) {
                String key = item.fileName() + "|" + normalize(field);
                if (!aiCoveredKeys.contains(key)) {
                    checks.add(heuristicIdentityCheck(resident, item, field));
                }
            }
        }
        return checks;
    }

    private AiAnalysisDTO.IdentityCheckResult heuristicIdentityCheck(Resident resident, UploadItem item, String field) {
        String accountValue = accountValueForField(resident, field);
        String normalizedText = normalize(item.ocrText());
        AiAnalysisDTO.IdentityCheckResult result = new AiAnalysisDTO.IdentityCheckResult();
        result.setFileName(item.fileName());
        result.setField(field);
        result.setAccountValue(accountValue);
        result.setStatus("NOT_VISIBLE");
        result.setConfidence(0.35);
        result.setExplanation("This detail was not clearly visible on the uploaded ID.");

        if (accountValue == null || accountValue.isBlank()) {
            result.setStatus("NOT_VISIBLE");
            result.setConfidence(0.2);
            result.setExplanation("This account detail is not available for comparison.");
            return result;
        }

        boolean matches = switch (field) {
            case "name" -> containsNameParts(normalizedText, resident);
            case "birthdate" -> resident.getBirthdate() != null
                    && containsAny(normalizedText, resident.getBirthdate().toString(),
                            resident.getBirthdate().getMonth().name(), String.valueOf(resident.getBirthdate().getYear()));
            case "gender" -> resident.getGender() != null && containsKeyword(normalizedText, resident.getGender());
            case "address" -> addressTokenMatch(normalizedText, resident) >= 2;
            default -> false;
        };

        if (matches) {
            result.setStatus("MATCH");
            result.setConfidence(0.74);
            result.setExtractedValue(accountValue);
            result.setExplanation("The ID contains account information for " + field + ".");
        }
        return result;
    }

    private boolean containsNameParts(String normalizedText, Resident resident) {
        int matches = 0;
        for (String value : new String[] { resident.getFirstName(), resident.getMiddleName(), resident.getLastName() }) {
            if (value != null && !value.isBlank() && containsKeyword(normalizedText, value)) {
                matches++;
            }
        }
        return matches >= 2 || (resident.getFirstName() != null && resident.getLastName() != null
                && containsKeyword(normalizedText, resident.getFirstName())
                && containsKeyword(normalizedText, resident.getLastName()));
    }

    private int addressTokenMatch(String normalizedText, Resident resident) {
        return (int) java.util.stream.Stream.of(resident.getAddressLine1(), resident.getSitio(), resident.getBarangay(),
                resident.getCity(), resident.getProvince(), resident.getRegion())
                .filter(value -> value != null && !value.isBlank())
                .filter(value -> containsKeyword(normalizedText, value))
                .count();
    }

    private String accountValueForField(Resident resident, String field) {
        if (resident == null || field == null) {
            return null;
        }
        return switch (normalize(field)) {
            case "name", "fullname", "full name" -> fullName(resident);
            case "birthdate", "birth date", "date of birth" -> resident.getBirthdate() == null ? null : resident.getBirthdate().toString();
            case "gender", "sex" -> resident.getGender();
            case "address" -> address(resident);
            default -> null;
        };
    }

    private DeepSeekResident residentProfile(Resident resident) {
        return new DeepSeekResident(
                fullName(resident),
                resident != null && resident.getBirthdate() != null ? resident.getBirthdate().toString() : null,
                resident != null ? resident.getGender() : null,
                address(resident));
    }

    private String fullName(Resident resident) {
        if (resident == null) {
            return null;
        }
        return java.util.stream.Stream.of(resident.getFirstName(), resident.getMiddleName(), resident.getLastName())
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.joining(" "));
    }

    private String address(Resident resident) {
        if (resident == null) {
            return null;
        }
        return java.util.stream.Stream.of(resident.getAddressLine1(), resident.getSitio(), resident.getBarangay(), resident.getCity(),
                resident.getProvince(), resident.getRegion())
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.joining(", "));
    }

    private boolean isIdRequirement(String requirement) {
        String normalizedRequirement = normalize(requirement);
        return normalizedRequirement.contains("valid id")
                || normalizedRequirement.contains("identification")
                || normalizedRequirement.contains("passport")
                || normalizedRequirement.contains("driver")
                || normalizedRequirement.contains("national id");
    }

    private void saveAnalysis(DocumentRequest documentRequest, AiAnalysisDTO dto) {
        try {
            DocumentRequestAnalysis entity = analysisRepository
                    .findByDocumentRequest_RequestId(documentRequest.getRequestId())
                    .orElseGet(DocumentRequestAnalysis::new);
            entity.setDocumentRequest(documentRequest);
            entity.setOverallStatus(dto.getOverallStatus());
            entity.setSummary(dto.getSummary());
            entity.setAnalyzedAt(LocalDateTime.now());
            entity.setResultJson(objectMapper.writeValueAsString(dto));
            analysisRepository.save(entity);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save AI analysis: " + e.getMessage());
        }
    }

    private AiAnalysisDTO convertFromEntity(DocumentRequestAnalysis entity) {
        try {
            AiAnalysisDTO dto = objectMapper.readValue(entity.getResultJson(), AiAnalysisDTO.class);
            dto.setRequestId(entity.getDocumentRequest().getRequestId());
            dto.setOverallStatus(entity.getOverallStatus());
            dto.setSummary(entity.getSummary());
            dto.setAnalyzedAt(entity.getAnalyzedAt() != null ? entity.getAnalyzedAt().toString() : dto.getAnalyzedAt());
            return dto;
        } catch (Exception e) {
            AiAnalysisDTO fallback = new AiAnalysisDTO();
            fallback.setRequestId(entity.getDocumentRequest().getRequestId());
            fallback.setOverallStatus(entity.getOverallStatus());
            fallback.setSummary(entity.getSummary());
            fallback.setAnalyzedAt(entity.getAnalyzedAt() != null ? entity.getAnalyzedAt().toString() : null);
            return fallback;
        }
    }

    private List<String> parseRequirements(DocumentType documentType) {
        if (documentType == null || documentType.getRequirements() == null || documentType.getRequirements().isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(documentType.getRequirements(), new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private MatchResult matchRequirement(String requirement, UploadItem item) {
        if (!"READABLE".equals(item.ocrStatus())) {
            return MatchResult.unmatched(item, List.of(), requirementKeywords(requirement));
        }

        String normalizedText = normalize(item.ocrText());
        String detectedDocumentType = detectDocumentType(item.ocrText());
        String requiredDocumentType = detectDocumentType(requirement);
        List<String> keywords = requirementKeywords(requirement);
        List<String> matchedKeywords = keywords.stream()
                .filter(keyword -> containsKeyword(normalizedText, keyword))
                .toList();
        List<String> missingKeywords = keywords.stream()
                .filter(keyword -> !containsKeyword(normalizedText, keyword))
                .toList();

        if (requiredDocumentType != null && detectedDocumentType != null
                && !requiredDocumentType.equals(detectedDocumentType)) {
            String explanation = "Document uploaded appears to be " + detectedDocumentType
                    + ". Required document is " + displayRequirement(requirement) + ".";
            return MatchResult.wrongDocument(item, matchedKeywords, missingKeywords, explanation);
        }

        boolean matched = matchesRequirement(requirement, normalizedText, matchedKeywords, keywords);
        if (matched) {
            return MatchResult.matched(item, matchedKeywords, missingKeywords);
        }

        return MatchResult.unmatched(item, matchedKeywords, missingKeywords);
    }

    private boolean matchesRequirement(String requirement, String normalizedText, List<String> matchedKeywords,
            List<String> requiredKeywords) {
        String normalizedRequirement = normalize(requirement);

        if (normalizedRequirement.contains("birth certificate")) {
            return containsAny(normalizedText, "birth certificate", "certificate of live birth", "date of birth", "born")
                    && containsAny(normalizedText, "birth", "born");
        }
        if (normalizedRequirement.contains("marriage certificate")) {
            return containsAny(normalizedText, "marriage certificate", "certificate of marriage")
                    && containsAny(normalizedText, "marriage", "married");
        }
        if (normalizedRequirement.contains("building plan") || normalizedRequirement.contains("building plans")) {
            return containsAny(normalizedText, "building plan", "architectural", "floor plan", "site plan", "structural")
                    && containsAny(normalizedText, "building", "construction", "plan");
        }
        if (normalizedRequirement.contains("valid id") || normalizedRequirement.contains("owner s valid id")
                || normalizedRequirement.contains("owner valid id")) {
            return containsAny(normalizedText, "identification", "driver license", "passport", "national id",
                    "philippine identification", "republic of the philippines", "id no");
        }
        if (normalizedRequirement.contains("proof of residency") || normalizedRequirement.contains("proof of residence")) {
            return containsAny(normalizedText, "residency", "residence", "address", "barangay", "utility bill", "billing");
        }
        if (normalizedRequirement.contains("cedula") || normalizedRequirement.contains("community tax certificate")) {
            return containsAny(normalizedText, "community tax certificate", "cedula", "tax certificate");
        }
        if (normalizedRequirement.contains("dti") || normalizedRequirement.contains("sec registration")) {
            return containsAny(normalizedText, "dti", "department of trade", "sec registration", "securities and exchange");
        }
        if (normalizedRequirement.contains("contract of lease")) {
            return containsAny(normalizedText, "contract of lease", "lease agreement", "lessor", "lessee");
        }

        if (requiredKeywords.isEmpty()) {
            return false;
        }
        return matchedKeywords.size() >= Math.max(1, Math.ceil(requiredKeywords.size() * 0.55));
    }

    private List<String> requirementKeywords(String text) {
        if (text == null) {
            return Collections.emptyList();
        }
        String normalizedText = normalize(text);
        List<String> specific = documentSpecificKeywords(normalizedText);
        if (!specific.isEmpty()) {
            return specific;
        }
        return List.of(normalizedText.split("[^a-z0-9]+")).stream()
                .filter(token -> token.length() >= 4)
                .filter(token -> !Set.of("with", "from", "completed", "photocopy", "original", "valid", "proof",
                        "owner", "form", "copy", "clearance").contains(token))
                .distinct()
                .toList();
    }

    private List<String> documentSpecificKeywords(String normalizedText) {
        if (normalizedText.contains("birth certificate")) {
            return List.of("birth", "certificate", "born");
        }
        if (normalizedText.contains("marriage certificate")) {
            return List.of("marriage", "certificate");
        }
        if (normalizedText.contains("building plan") || normalizedText.contains("building plans")) {
            return List.of("building", "plan", "construction");
        }
        if (normalizedText.contains("valid id") || normalizedText.contains("owner s valid id") || normalizedText.contains("owner valid id")) {
            return List.of("identification", "republic", "license", "passport", "national");
        }
        if (normalizedText.contains("proof of residency") || normalizedText.contains("proof of residence")) {
            return List.of("residence", "address", "barangay");
        }
        if (normalizedText.contains("community tax certificate") || normalizedText.contains("cedula")) {
            return List.of("community", "tax", "certificate", "cedula");
        }
        if (normalizedText.contains("contract of lease")) {
            return List.of("contract", "lease", "lessor", "lessee");
        }
        if (normalizedText.contains("dti") || normalizedText.contains("sec registration")) {
            return List.of("registration", "business", "trade", "securities");
        }
        return List.of();
    }

    private String detectDocumentType(String text) {
        String normalizedText = normalize(text);
        if (containsAny(normalizedText, "certificate of live birth", "birth certificate", "date of birth")) {
            return "Birth Certificate";
        }
        if (containsAny(normalizedText, "certificate of marriage", "marriage certificate")) {
            return "Marriage Certificate";
        }
        if (containsAny(normalizedText, "building plan", "architectural plan", "floor plan", "site plan", "structural plan")) {
            return "Building Plans";
        }
        if (containsAny(normalizedText, "community tax certificate", "cedula")) {
            return "Community Tax Certificate";
        }
        if (containsAny(normalizedText, "contract of lease", "lease agreement")) {
            return "Contract of Lease";
        }
        if (containsAny(normalizedText, "department of trade", "dti", "sec registration", "securities and exchange")) {
            return "Business Registration";
        }
        if (containsAny(normalizedText, "business plan", "executive summary", "market analysis", "financial plan",
                "business objectives", "our taste of success")) {
            return "Business Plan";
        }
        if (containsAny(normalizedText, "passport", "driver license", "national id", "philippine identification")) {
            return "Valid ID";
        }
        return null;
    }

    private String displayRequirement(String requirement) {
        if (requirement == null || requirement.isBlank()) {
            return "selected requirement";
        }
        return requirement.trim();
    }

    private String sanitizeResidentExplanation(String explanation) {
        if (explanation == null) {
            return null;
        }
        return explanation
                .replaceAll("(?i)OCR text", "document")
                .replaceAll("(?i)uploaded text", "document")
                .replaceAll("(?i)uploaded ID text", "uploaded ID")
                .replaceAll("(?i)text does not contain", "document does not show")
                .trim();
    }

    private String normalize(String text) {
        return text == null
                ? ""
                : text.toLowerCase(Locale.ROOT)
                        .replace("'", " ")
                        .replaceAll("[^a-z0-9]+", " ")
                        .replaceAll("\\s+", " ")
                        .trim();
    }

    private String safe(String text) {
        return text == null ? "" : text;
    }

    private boolean containsKeyword(String normalizedText, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return false;
        }
        return normalizedText.contains(normalize(keyword));
    }

    private boolean containsAny(String normalizedText, String... values) {
        for (String value : values) {
            if (normalizedText.contains(normalize(value))) {
                return true;
            }
        }
        return false;
    }

    private double getReadabilityScore(UploadItem item) {
        String status = item.ocrStatus();
        if ("UNREADABLE".equals(status)) {
            return 0.05;
        }
        if ("OCR_UNAVAILABLE".equals(status) || "UNSUPPORTED".equals(status)) {
            return 0.2;
        }
        if ("LOW_CONFIDENCE".equals(status)) {
            return 0.52;
        }
        return 0.86;
    }

    private String getAttachmentWarning(UploadItem item) {
        if (item.ocrMessage() != null && !item.ocrMessage().isBlank()) {
            return item.ocrMessage();
        }
        return null;
    }

    private String excerpt(String text) {
        String normalized = text == null ? "" : text.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= 180) {
            return normalized;
        }
        return normalized.substring(0, 180) + "...";
    }

    private record UploadItem(
            String fileName,
            String contentType,
            long fileSize,
            String uploadGroup,
            Integer requirementIndex,
            String requirementLabel,
            String ocrStatus,
            String ocrText,
            String ocrMessage) {

        static UploadItem fromMultipart(MultipartFile file, AiAttachmentMetadataDTO metadata, OcrService.OcrResult ocrResult) {
            return new UploadItem(
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize(),
                    metadata != null ? metadata.getUploadGroup() : null,
                    metadata != null ? metadata.getRequirementIndex() : null,
                    metadata != null ? metadata.getRequirementLabel() : null,
                    ocrResult.status(),
                    ocrResult.text(),
                    ocrResult.message());
        }

        static UploadItem fromAttachment(RequestAttachment attachment, OcrService.OcrResult ocrResult) {
            return new UploadItem(
                    attachment.getFileName(),
                    attachment.getFileType(),
                    attachment.getFileSize() == null ? 0L : attachment.getFileSize(),
                    attachment.getUploadGroup(),
                    attachment.getRequirementIndex(),
                    attachment.getRequirementLabel(),
                    ocrResult.status(),
                    ocrResult.text(),
                    ocrResult.message());
        }
    }

    private record MatchResult(
            UploadItem item,
            boolean matched,
            boolean wrongDocument,
            List<String> matchedKeywords,
            List<String> missingKeywords,
            String explanation) {

        static MatchResult matched(UploadItem item, List<String> matchedKeywords, List<String> missingKeywords) {
            return new MatchResult(item, true, false, matchedKeywords, missingKeywords, null);
        }

        static MatchResult wrongDocument(UploadItem item, List<String> matchedKeywords, List<String> missingKeywords,
                String explanation) {
            return new MatchResult(item, false, true, matchedKeywords, missingKeywords, explanation);
        }

        static MatchResult unmatched(UploadItem item, List<String> matchedKeywords, List<String> missingKeywords) {
            return new MatchResult(item, false, false, matchedKeywords, missingKeywords, null);
        }
    }
}
