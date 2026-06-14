package com.cagasi.reserbayan.dto;

import java.util.List;

public class DocumentTypeDTO {
    private Long typeId;
    private String id;
    private String name;
    private String shortDescription;
    private String imagePath;
    private Details details;
    private String recommendationReason;
    private Integer recommendationScore;

    public static class Details {
        private String category;
        private String longDescription;
        private String processingTime;
        private String pdfPath;
        private List<String> requirements;
        private Boolean hardCopySubmissionRequired;
        private List<String> hardCopyRequirements;
        private List<String> uses;

        // Getters and Setters
        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public String getLongDescription() {
            return longDescription;
        }

        public void setLongDescription(String longDescription) {
            this.longDescription = longDescription;
        }

        public String getProcessingTime() {
            return processingTime;
        }

        public void setProcessingTime(String processingTime) {
            this.processingTime = processingTime;
        }

        public String getPdfPath() {
            return pdfPath;
        }

        public void setPdfPath(String pdfPath) {
            this.pdfPath = pdfPath;
        }

        public List<String> getRequirements() {
            return requirements;
        }

        public void setRequirements(List<String> requirements) {
            this.requirements = requirements;
        }

        public Boolean getHardCopySubmissionRequired() {
            return hardCopySubmissionRequired;
        }

        public void setHardCopySubmissionRequired(Boolean hardCopySubmissionRequired) {
            this.hardCopySubmissionRequired = hardCopySubmissionRequired;
        }

        public List<String> getHardCopyRequirements() {
            return hardCopyRequirements;
        }

        public void setHardCopyRequirements(List<String> hardCopyRequirements) {
            this.hardCopyRequirements = hardCopyRequirements;
        }

        public List<String> getUses() {
            return uses;
        }

        public void setUses(List<String> uses) {
            this.uses = uses;
        }
    }

    // Getters and Setters
    public Long getTypeId() {
        return typeId;
    }

    public void setTypeId(Long typeId) {
        this.typeId = typeId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public Details getDetails() {
        return details;
    }

    public void setDetails(Details details) {
        this.details = details;
    }

    public String getRecommendationReason() {
        return recommendationReason;
    }

    public void setRecommendationReason(String recommendationReason) {
        this.recommendationReason = recommendationReason;
    }

    public Integer getRecommendationScore() {
        return recommendationScore;
    }

    public void setRecommendationScore(Integer recommendationScore) {
        this.recommendationScore = recommendationScore;
    }
}
