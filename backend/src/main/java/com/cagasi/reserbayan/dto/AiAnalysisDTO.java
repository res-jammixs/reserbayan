package com.cagasi.reserbayan.dto;

import java.util.ArrayList;
import java.util.List;

public class AiAnalysisDTO {
    private Long requestId;
    private String overallStatus;
    private String summary;
    private String analyzedAt;
    private List<RequirementResult> requirements = new ArrayList<>();
    private List<AttachmentResult> attachments = new ArrayList<>();
    private List<IdentityCheckResult> identityChecks = new ArrayList<>();

    public static class RequirementResult {
        private Integer requirementIndex;
        private String requirementText;
        private String status;
        private double confidence;
        private List<String> matchedFileNames = new ArrayList<>();
        private String explanation;
        private String detectedDocumentType;
        private String reviewSource;

        public Integer getRequirementIndex() {
            return requirementIndex;
        }

        public void setRequirementIndex(Integer requirementIndex) {
            this.requirementIndex = requirementIndex;
        }

        public String getRequirementText() {
            return requirementText;
        }

        public void setRequirementText(String requirementText) {
            this.requirementText = requirementText;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public double getConfidence() {
            return confidence;
        }

        public void setConfidence(double confidence) {
            this.confidence = confidence;
        }

        public List<String> getMatchedFileNames() {
            return matchedFileNames;
        }

        public void setMatchedFileNames(List<String> matchedFileNames) {
            this.matchedFileNames = matchedFileNames;
        }

        public String getExplanation() {
            return explanation;
        }

        public void setExplanation(String explanation) {
            this.explanation = explanation;
        }

        public String getDetectedDocumentType() {
            return detectedDocumentType;
        }

        public void setDetectedDocumentType(String detectedDocumentType) {
            this.detectedDocumentType = detectedDocumentType;
        }

        public String getReviewSource() {
            return reviewSource;
        }

        public void setReviewSource(String reviewSource) {
            this.reviewSource = reviewSource;
        }
    }

    public static class AttachmentResult {
        private String fileName;
        private String status;
        private double readabilityScore;
        private String warning;
        private String requirementLabel;
        private String extractedTextExcerpt;
        private String detectedDocumentType;
        private String reviewSource;
        private List<String> matchedKeywords = new ArrayList<>();
        private List<String> missingKeywords = new ArrayList<>();

        public String getFileName() {
            return fileName;
        }

        public void setFileName(String fileName) {
            this.fileName = fileName;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public double getReadabilityScore() {
            return readabilityScore;
        }

        public void setReadabilityScore(double readabilityScore) {
            this.readabilityScore = readabilityScore;
        }

        public String getWarning() {
            return warning;
        }

        public void setWarning(String warning) {
            this.warning = warning;
        }

        public String getRequirementLabel() {
            return requirementLabel;
        }

        public void setRequirementLabel(String requirementLabel) {
            this.requirementLabel = requirementLabel;
        }

        public String getExtractedTextExcerpt() {
            return extractedTextExcerpt;
        }

        public void setExtractedTextExcerpt(String extractedTextExcerpt) {
            this.extractedTextExcerpt = extractedTextExcerpt;
        }

        public String getDetectedDocumentType() {
            return detectedDocumentType;
        }

        public void setDetectedDocumentType(String detectedDocumentType) {
            this.detectedDocumentType = detectedDocumentType;
        }

        public String getReviewSource() {
            return reviewSource;
        }

        public void setReviewSource(String reviewSource) {
            this.reviewSource = reviewSource;
        }

        public List<String> getMatchedKeywords() {
            return matchedKeywords;
        }

        public void setMatchedKeywords(List<String> matchedKeywords) {
            this.matchedKeywords = matchedKeywords;
        }

        public List<String> getMissingKeywords() {
            return missingKeywords;
        }

        public void setMissingKeywords(List<String> missingKeywords) {
            this.missingKeywords = missingKeywords;
        }
    }

    public static class IdentityCheckResult {
        private String fileName;
        private String field;
        private String accountValue;
        private String extractedValue;
        private String status;
        private double confidence;
        private String explanation;

        public String getFileName() {
            return fileName;
        }

        public void setFileName(String fileName) {
            this.fileName = fileName;
        }

        public String getField() {
            return field;
        }

        public void setField(String field) {
            this.field = field;
        }

        public String getAccountValue() {
            return accountValue;
        }

        public void setAccountValue(String accountValue) {
            this.accountValue = accountValue;
        }

        public String getExtractedValue() {
            return extractedValue;
        }

        public void setExtractedValue(String extractedValue) {
            this.extractedValue = extractedValue;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public double getConfidence() {
            return confidence;
        }

        public void setConfidence(double confidence) {
            this.confidence = confidence;
        }

        public String getExplanation() {
            return explanation;
        }

        public void setExplanation(String explanation) {
            this.explanation = explanation;
        }
    }

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }

    public String getOverallStatus() {
        return overallStatus;
    }

    public void setOverallStatus(String overallStatus) {
        this.overallStatus = overallStatus;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getAnalyzedAt() {
        return analyzedAt;
    }

    public void setAnalyzedAt(String analyzedAt) {
        this.analyzedAt = analyzedAt;
    }

    public List<RequirementResult> getRequirements() {
        return requirements;
    }

    public void setRequirements(List<RequirementResult> requirements) {
        this.requirements = requirements;
    }

    public List<AttachmentResult> getAttachments() {
        return attachments;
    }

    public void setAttachments(List<AttachmentResult> attachments) {
        this.attachments = attachments;
    }

    public List<IdentityCheckResult> getIdentityChecks() {
        return identityChecks;
    }

    public void setIdentityChecks(List<IdentityCheckResult> identityChecks) {
        this.identityChecks = identityChecks;
    }
}
