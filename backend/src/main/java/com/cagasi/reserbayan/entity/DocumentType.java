package com.cagasi.reserbayan.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "document_types")
public class DocumentType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long typeId;

    @Column(unique = true)
    private String documentId;

    private String documentName;
    private String shortDescription;
    private String description;
    private String imagePath;
    private String category;
    @Lob
    private String longDescription;
    private String processingTime;
    private int processingDays;
    private String pdfPath;
    @Lob
    private String requirements; // JSON string
    private boolean hardCopySubmissionRequired;
    @Lob
    private String hardCopyRequirements; // JSON string
    @Lob
    private String uses; // JSON string
    private boolean isActive;
    private String department;

    @OneToMany(mappedBy = "documentType", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DocumentRequest> documentRequests = new ArrayList<>();

    // Getters and Setters
    public Long getTypeId() {
        return typeId;
    }

    public void setTypeId(Long typeId) {
        this.typeId = typeId;
    }

    public String getDocumentName() {
        return documentName;
    }

    public void setDocumentName(String documentName) {
        this.documentName = documentName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getProcessingDays() {
        return processingDays;
    }

    public void setProcessingDays(int processingDays) {
        this.processingDays = processingDays;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
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

    public String getRequirements() {
        return requirements;
    }

    public void setRequirements(String requirements) {
        this.requirements = requirements;
    }

    public boolean isHardCopySubmissionRequired() {
        return hardCopySubmissionRequired;
    }

    public void setHardCopySubmissionRequired(boolean hardCopySubmissionRequired) {
        this.hardCopySubmissionRequired = hardCopySubmissionRequired;
    }

    public String getHardCopyRequirements() {
        return hardCopyRequirements;
    }

    public void setHardCopyRequirements(String hardCopyRequirements) {
        this.hardCopyRequirements = hardCopyRequirements;
    }

    public String getUses() {
        return uses;
    }

    public void setUses(String uses) {
        this.uses = uses;
    }

    public List<DocumentRequest> getDocumentRequests() {
        return documentRequests;
    }

    public void setDocumentRequests(List<DocumentRequest> documentRequests) {
        this.documentRequests = documentRequests;
    }
}
