package com.cagasi.reserbayan.dto;

import com.cagasi.reserbayan.entity.RequestAttachment;
import java.util.List;

public class DocumentRequestDTO {

    private Long requestId;
    private String documentId; // from your JSON file
    private String documentName; // from your JSON file
    private Long residentId; // from logged-in user
    private String residentName;
    private String residentFirstName;
    private String residentMiddleName;
    private String residentLastName;
    private String residentEmail;
    private String residentPhoneNumber;
    private String residentAddress;
    private String details; // purpose
    private String status;
    private String submittedAt;
    private String updatedAt;
    private boolean hardCopySubmissionRequired;
    private List<String> hardCopyRequirements;
    private String hardCopySubmittedAt;
    private List<RequestAttachment> attachments;
    private int attachmentCount;

    // Getters & Setters

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    public String getDocumentName() {
        return documentName;
    }

    public void setDocumentName(String documentName) {
        this.documentName = documentName;
    }

    public Long getResidentId() {
        return residentId;
    }

    public void setResidentId(Long residentId) {
        this.residentId = residentId;
    }

    public String getResidentName() {
        return residentName;
    }

    public void setResidentName(String residentName) {
        this.residentName = residentName;
    }

    public String getResidentFirstName() {
        return residentFirstName;
    }

    public void setResidentFirstName(String residentFirstName) {
        this.residentFirstName = residentFirstName;
    }

    public String getResidentMiddleName() {
        return residentMiddleName;
    }

    public void setResidentMiddleName(String residentMiddleName) {
        this.residentMiddleName = residentMiddleName;
    }

    public String getResidentLastName() {
        return residentLastName;
    }

    public void setResidentLastName(String residentLastName) {
        this.residentLastName = residentLastName;
    }

    public String getResidentEmail() {
        return residentEmail;
    }

    public void setResidentEmail(String residentEmail) {
        this.residentEmail = residentEmail;
    }

    public String getResidentPhoneNumber() {
        return residentPhoneNumber;
    }

    public void setResidentPhoneNumber(String residentPhoneNumber) {
        this.residentPhoneNumber = residentPhoneNumber;
    }

    public String getResidentAddress() {
        return residentAddress;
    }

    public void setResidentAddress(String residentAddress) {
        this.residentAddress = residentAddress;
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

    public String getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(String submittedAt) {
        this.submittedAt = submittedAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public boolean isHardCopySubmissionRequired() {
        return hardCopySubmissionRequired;
    }

    public void setHardCopySubmissionRequired(boolean hardCopySubmissionRequired) {
        this.hardCopySubmissionRequired = hardCopySubmissionRequired;
    }

    public List<String> getHardCopyRequirements() {
        return hardCopyRequirements;
    }

    public void setHardCopyRequirements(List<String> hardCopyRequirements) {
        this.hardCopyRequirements = hardCopyRequirements;
    }

    public String getHardCopySubmittedAt() {
        return hardCopySubmittedAt;
    }

    public void setHardCopySubmittedAt(String hardCopySubmittedAt) {
        this.hardCopySubmittedAt = hardCopySubmittedAt;
    }

    public List<RequestAttachment> getAttachments() {
        return attachments;
    }

    public void setAttachments(List<RequestAttachment> attachments) {
        this.attachments = attachments;
    }

    public int getAttachmentCount() {
        return attachmentCount;
    }

    public void setAttachmentCount(int attachmentCount) {
        this.attachmentCount = attachmentCount;
    }
}
