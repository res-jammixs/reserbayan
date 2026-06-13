package com.cagasi.reserbayan.dto;

public class AiAttachmentMetadataDTO {
    private String uploadGroup;
    private Integer requirementIndex;
    private String requirementLabel;
    private String fileName;

    public String getUploadGroup() {
        return uploadGroup;
    }

    public void setUploadGroup(String uploadGroup) {
        this.uploadGroup = uploadGroup;
    }

    public Integer getRequirementIndex() {
        return requirementIndex;
    }

    public void setRequirementIndex(Integer requirementIndex) {
        this.requirementIndex = requirementIndex;
    }

    public String getRequirementLabel() {
        return requirementLabel;
    }

    public void setRequirementLabel(String requirementLabel) {
        this.requirementLabel = requirementLabel;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
}
