package com.cagasi.reserbayan.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "request_attachments")
public class RequestAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;
    private String fileType;
    private String filePath; // We store the path/URL, not the file itself
    private Long fileSize; // File size in bytes
    private String uploadGroup;
    private Integer requirementIndex;

    @Column(columnDefinition = "TEXT")
    private String requirementLabel;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id")
    private DocumentRequest documentRequest;

    // Constructors
    public RequestAttachment() {
    }

    public RequestAttachment(String fileName, String fileType, String filePath, DocumentRequest documentRequest) {
        this.fileName = fileName;
        this.fileType = fileType;
        this.filePath = filePath;
        this.documentRequest = documentRequest;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public DocumentRequest getDocumentRequest() {
        return documentRequest;
    }

    public void setDocumentRequest(DocumentRequest documentRequest) {
        this.documentRequest = documentRequest;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

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
}
