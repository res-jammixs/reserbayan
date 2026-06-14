package com.cagasi.reserbayan.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "document_requests")
public class DocumentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long requestId;

    // NEW: Proper JPA relationship to DocumentType
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "document_type_id", nullable = false)
    private DocumentType documentType;

    // Who requested it
    @JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "resident_id", nullable = false)
    private Resident resident;

    // Purpose of request
    @Column(nullable = false, columnDefinition = "TEXT")
    private String details;

    // Status (default: Pending)
    @Column(nullable = false)
    private String status = "Pending";

    private boolean hardCopySubmissionRequired;

    @Column(columnDefinition = "TEXT")
    private String hardCopyRequirements;

    private LocalDateTime hardCopySubmittedAt;

    // Rejection reason field
    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    private LocalDateTime submittedAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    // --- NEW: Relationship to Attachments ---
    @OneToMany(mappedBy = "documentRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RequestAttachment> attachments = new ArrayList<>();

    // --- Getters and Setters ---

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }

    public String getDocumentId() {
        return documentType != null ? documentType.getDocumentId() : null;
    }

    public void setDocumentId(String documentId) {
        // For backward compatibility - find and set the document type
        // In practice, this should be handled by the service layer
        if (documentId != null && documentType != null && !documentId.equals(documentType.getDocumentId())) {
            throw new IllegalStateException("DocumentType relationship must be set instead of documentId directly");
        }
    }

    public String getDocumentName() {
        return documentType != null ? documentType.getDocumentName() : null;
    }

    public void setDocumentName(String documentName) {
        // For backward compatibility - document type should be set via relationship
        if (documentName != null && documentType != null && !documentName.equals(documentType.getDocumentName())) {
            throw new IllegalStateException("DocumentType relationship must be set instead of documentName directly");
        }
    }

    public DocumentType getDocumentType() {
        return documentType;
    }

    public void setDocumentType(DocumentType documentType) {
        this.documentType = documentType;
    }

    public Resident getResident() {
        return resident;
    }

    public void setResident(Resident resident) {
        this.resident = resident;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public LocalDateTime getHardCopySubmittedAt() {
        return hardCopySubmittedAt;
    }

    public void setHardCopySubmittedAt(LocalDateTime hardCopySubmittedAt) {
        this.hardCopySubmittedAt = hardCopySubmittedAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<RequestAttachment> getAttachments() {
        return attachments;
    }

    public void setAttachments(List<RequestAttachment> attachments) {
        this.attachments = attachments;
    }
}
