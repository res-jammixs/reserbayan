package com.cagasi.reserbayan.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cagasi.reserbayan.dto.AnnouncementDTO;
import com.cagasi.reserbayan.dto.AnnouncementRequest;
import com.cagasi.reserbayan.entity.Admin;
import com.cagasi.reserbayan.entity.Announcement;
import com.cagasi.reserbayan.entity.DocumentRequest;
import com.cagasi.reserbayan.entity.DocumentType;
import com.cagasi.reserbayan.entity.Resident;
import com.cagasi.reserbayan.entity.ResidentStatus;
import com.cagasi.reserbayan.entity.Role;
import com.cagasi.reserbayan.entity.Status;
import com.cagasi.reserbayan.entity.StatusLog;
import com.cagasi.reserbayan.repository.AdminRepository;
import com.cagasi.reserbayan.repository.DocumentRequestRepository;
import com.cagasi.reserbayan.repository.DocumentTypeRepository;
import com.cagasi.reserbayan.repository.ResidentRepository;
import com.cagasi.reserbayan.repository.StatusLogRepository;
import com.cagasi.reserbayan.service.AnnouncementService;
import com.cagasi.reserbayan.service.AdminNotificationService;
import com.cagasi.reserbayan.service.NotificationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final Pattern NUMBER_PATTERN = Pattern.compile("\\d+");
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private ResidentRepository residentRepository;

    @Autowired
    private DocumentRequestRepository documentRequestRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private DocumentTypeRepository documentTypeRepository;

    @Autowired
    private StatusLogRepository statusLogRepository;

    @Autowired
    private AnnouncementService announcementService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private AdminNotificationService adminNotificationService;

    // Verify admin role access
    private boolean hasAdminAccess() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        boolean hasAdminAuthority = authentication.getAuthorities().stream()
                .anyMatch(authority -> {
                    String role = authority.getAuthority();
                    return "ROLE_ADMIN".equals(role)
                            || "ROLE_SUPER_ADMIN".equals(role)
                            || "ADMIN".equals(role)
                            || "SUPER_ADMIN".equals(role);
                });
        if (hasAdminAuthority) {
            return true;
        }

        String username = authentication.getName();
        Admin admin = adminRepository.findByUsername(username).orElse(null);
        if (admin == null) {
            admin = adminRepository.findByResidentEmail(username).orElse(null);
        }

        return admin != null && (admin.getRole() == Role.ADMIN || admin.getRole() == Role.SUPER_ADMIN);
    }

    // Summary & Analytics - Limited for admin role
    @GetMapping("/summary")
    public ResponseEntity<?> getSummary() {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        Map<String, Object> summary = new HashMap<>();

        // Total residents count (only approved residents)
        long totalResidents = residentRepository.findAll().stream()
                .filter(r -> r.getStatus() == ResidentStatus.APPROVED)
                .count();
        summary.put("totalResidents", totalResidents);

        // Total document requests count
        long totalRequests = documentRequestRepository.count();
        summary.put("totalRequests", totalRequests);

        // Pending residents count (residents with PENDING status)
        long pendingResidents = residentRepository.findAll().stream()
                .filter(r -> r.getStatus() == ResidentStatus.PENDING)
                .count();
        summary.put("pendingResidents", pendingResidents);

        // Pending document requests count
        long pendingRequests = documentRequestRepository.findAll().stream()
                .filter(req -> req.getStatus().equals("Pending"))
                .count();
        summary.put("pendingRequests", pendingRequests);

        // Today's requests count
        java.time.LocalDate today = java.time.LocalDate.now();
        long todayRequests = documentRequestRepository.findAll().stream()
                .filter(req -> req.getSubmittedAt().toLocalDate().equals(today))
                .count();
        summary.put("todayRequests", todayRequests);

        // Add announcement summary
        Map<String, Object> announcementSummary = announcementService.getAnnouncementSummary();
        summary.putAll(announcementSummary);

        return ResponseEntity.ok(summary);
    }

    // Request Management
    @GetMapping("/requests")
    public ResponseEntity<?> getAllRequests() {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        List<DocumentRequest> allRequests = documentRequestRepository.findAll();

        // Create a properly formatted response with enhanced information
        List<Map<String, Object>> formattedRequests = allRequests.stream().map(req -> {
            Map<String, Object> requestMap = new HashMap<>();
            requestMap.put("requestId", req.getRequestId());
            requestMap.put("documentId", req.getDocumentId());
            requestMap.put("documentName", req.getDocumentName());
            requestMap.put("details", req.getDetails());
            requestMap.put("status", req.getStatus());
            requestMap.put("rejectionReason", req.getRejectionReason());
            requestMap.put("hardCopySubmissionRequired", req.isHardCopySubmissionRequired());
            requestMap.put("hardCopyRequirements", req.getHardCopyRequirements());
            requestMap.put("hardCopySubmittedAt", req.getHardCopySubmittedAt());
            requestMap.put("submittedAt", req.getSubmittedAt());
            requestMap.put("updatedAt", req.getUpdatedAt());

            // Add resident information in a format that matches both frontend expectations
            if (req.getResident() != null) {
                String fullName = req.getResident().getFirstName() + " " + req.getResident().getLastName();

                // Add flat properties for backward compatibility
                requestMap.put("residentFirstName", req.getResident().getFirstName());
                requestMap.put("residentLastName", req.getResident().getLastName());
                requestMap.put("residentFullName", fullName);
                requestMap.put("residentEmail", req.getResident().getResidentEmail());

                // Add nested object for newer frontend code
                Map<String, Object> residentInfo = new HashMap<>();
                residentInfo.put("residentId", req.getResident().getResidentId());
                residentInfo.put("firstName", req.getResident().getFirstName());
                residentInfo.put("lastName", req.getResident().getLastName());
                residentInfo.put("fullName", fullName);
                residentInfo.put("email", req.getResident().getResidentEmail());
                requestMap.put("resident", residentInfo);
            }

            // Add attachment count if any
            requestMap.put("attachmentCount", req.getAttachments() != null ? req.getAttachments().size() : 0);

            return requestMap;
        }).toList();

        return ResponseEntity.ok(formattedRequests);
    }

    @GetMapping("/recent-requests")
    public ResponseEntity<?> getRecentRequests() {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        List<DocumentRequest> allRequests = documentRequestRepository.findAll();

        // Sort by submittedAt date (newest first) and limit to 10 most recent
        List<DocumentRequest> recentRequests = allRequests.stream()
                .sorted((a, b) -> b.getSubmittedAt().compareTo(a.getSubmittedAt()))
                .limit(10)
                .toList();

        // Create a properly formatted response with enhanced information
        List<Map<String, Object>> formattedRequests = recentRequests.stream().map(req -> {
            Map<String, Object> requestMap = new HashMap<>();
            requestMap.put("requestId", req.getRequestId());
            requestMap.put("documentId", req.getDocumentId());
            requestMap.put("documentName", req.getDocumentName());
            requestMap.put("details", req.getDetails());
            requestMap.put("status", req.getStatus());
            requestMap.put("rejectionReason", req.getRejectionReason());
            requestMap.put("hardCopySubmissionRequired", req.isHardCopySubmissionRequired());
            requestMap.put("hardCopyRequirements", req.getHardCopyRequirements());
            requestMap.put("hardCopySubmittedAt", req.getHardCopySubmittedAt());
            requestMap.put("submittedAt", req.getSubmittedAt());
            requestMap.put("updatedAt", req.getUpdatedAt());

            // Add resident information
            if (req.getResident() != null) {
                Map<String, Object> residentInfo = new HashMap<>();
                residentInfo.put("residentId", req.getResident().getResidentId());
                residentInfo.put("firstName", req.getResident().getFirstName());
                residentInfo.put("lastName", req.getResident().getLastName());
                residentInfo.put("fullName", req.getResident().getFirstName() + " " + req.getResident().getLastName());
                residentInfo.put("email", req.getResident().getResidentEmail());
                requestMap.put("resident", residentInfo);
            }

            // Add attachment count if any
            requestMap.put("attachmentCount", req.getAttachments() != null ? req.getAttachments().size() : 0);

            return requestMap;
        }).toList();

        return ResponseEntity.ok(formattedRequests);
    }

    // Document Request Management
    @GetMapping("/requests/{id}")
    public ResponseEntity<?> getRequestById(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        DocumentRequest request = documentRequestRepository.findById(id).orElse(null);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }

        // Create formatted response similar to recent-requests
        Map<String, Object> requestMap = new HashMap<>();
        requestMap.put("id", request.getRequestId());
        requestMap.put("requestId", request.getRequestId());
        requestMap.put("documentId", request.getDocumentId());
        requestMap.put("documentName", request.getDocumentName());
        requestMap.put("details", request.getDetails());
        requestMap.put("status", request.getStatus());
        requestMap.put("rejectionReason", request.getRejectionReason());
        requestMap.put("hardCopySubmissionRequired", request.isHardCopySubmissionRequired());
        requestMap.put("hardCopyRequirements", request.getHardCopyRequirements());
        requestMap.put("hardCopySubmittedAt", request.getHardCopySubmittedAt());
        requestMap.put("submittedAt", request.getSubmittedAt());
        requestMap.put("updatedAt", request.getUpdatedAt());

        // Add resident information
        if (request.getResident() != null) {
            Map<String, Object> residentInfo = new HashMap<>();
            residentInfo.put("residentId", request.getResident().getResidentId());
            residentInfo.put("firstName", request.getResident().getFirstName());
            residentInfo.put("lastName", request.getResident().getLastName());
            residentInfo.put("fullName",
                    request.getResident().getFirstName() + " " + request.getResident().getLastName());
            residentInfo.put("email", request.getResident().getResidentEmail());
            requestMap.put("resident", residentInfo);
        }

        // Add attachment count
        requestMap.put("attachmentCount", request.getAttachments() != null ? request.getAttachments().size() : 0);

        return ResponseEntity.ok(requestMap);
    }

    @PutMapping("/requests/{id}/approve")
    public ResponseEntity<?> approveDocumentRequest(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        DocumentRequest request = documentRequestRepository.findById(id).orElse(null);
        if (request == null || !request.getStatus().equals("Pending")) {
            return ResponseEntity.notFound().build();
        }
        boolean needsHardCopy = request.isHardCopySubmissionRequired();
        String nextStatus = needsHardCopy ? "Awaiting Hard Copy Submission" : "Approved";
        request.setStatus(nextStatus);
        request.setUpdatedAt(java.time.LocalDateTime.now());
        DocumentRequest savedRequest = documentRequestRepository.save(request);

        // Log the status change
        StatusLog statusLog = new StatusLog();
        statusLog.setDocumentRequest(savedRequest);
        statusLog.setStatus(nextStatus);
        statusLog.setTimestamp(java.time.LocalDateTime.now());
        statusLogRepository.save(statusLog);

        // Create notification for the resident
        notificationService.createNotification(
                request.getResident(),
                needsHardCopy ? "Hard Copy Requirements Needed" : "Document Request Approved",
                needsHardCopy
                        ? "Your request for '" + request.getDocumentName() + "' has been verified. Please submit the required hard-copy documents at the barangay office."
                        : "Your request for '" + request.getDocumentName() + "' has been verified and is being prepared.",
                needsHardCopy ? "REQUEST_HARD_COPY_REQUIRED" : "REQUEST_APPROVED",
                null,
                AdminNotificationService.TARGET_DOCUMENT_REQUEST,
                savedRequest.getRequestId());

        return ResponseEntity.ok(savedRequest);
    }

    @PutMapping("/requests/{id}/ready-for-pickup")
    public ResponseEntity<?> markDocumentRequestReadyForPickup(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        DocumentRequest request = documentRequestRepository.findById(id).orElse(null);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }
        String requiredStatus = request.isHardCopySubmissionRequired() ? "Hard Copy Submitted" : "Approved";
        if (!request.getStatus().equals(requiredStatus)) {
            return ResponseEntity.status(409).body(Map.of("error",
                    request.isHardCopySubmissionRequired()
                            ? "Hard-copy requirements must be received before marking this request ready for pickup"
                            : "Only approved requests can be marked ready for pickup"));
        }
        request.setStatus("Ready for Pickup");
        request.setUpdatedAt(java.time.LocalDateTime.now());
        DocumentRequest savedRequest = documentRequestRepository.save(request);

        StatusLog statusLog = new StatusLog();
        statusLog.setDocumentRequest(savedRequest);
        statusLog.setStatus("Ready for Pickup");
        statusLog.setTimestamp(java.time.LocalDateTime.now());
        statusLogRepository.save(statusLog);

        notificationService.createNotification(
                request.getResident(),
                "Document Ready for Pickup",
                "Your request for '" + request.getDocumentName() + "' is ready to claim at the barangay office.",
                "REQUEST_READY_FOR_PICKUP",
                null,
                AdminNotificationService.TARGET_DOCUMENT_REQUEST,
                savedRequest.getRequestId());

        return ResponseEntity.ok(savedRequest);
    }

    @PutMapping("/requests/{id}/hard-copy-submitted")
    public ResponseEntity<?> markHardCopySubmitted(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        DocumentRequest request = documentRequestRepository.findById(id).orElse(null);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }
        if (!request.isHardCopySubmissionRequired()) {
            return ResponseEntity.status(409).body(Map.of("error", "This request does not require hard-copy submission"));
        }
        if (!request.getStatus().equals("Awaiting Hard Copy Submission")) {
            return ResponseEntity.status(409).body(Map.of("error", "Only requests awaiting hard-copy submission can be updated"));
        }

        request.setStatus("Hard Copy Submitted");
        request.setHardCopySubmittedAt(java.time.LocalDateTime.now());
        request.setUpdatedAt(java.time.LocalDateTime.now());
        DocumentRequest savedRequest = documentRequestRepository.save(request);

        StatusLog statusLog = new StatusLog();
        statusLog.setDocumentRequest(savedRequest);
        statusLog.setStatus("Hard Copy Submitted");
        statusLog.setTimestamp(java.time.LocalDateTime.now());
        statusLogRepository.save(statusLog);

        notificationService.createNotification(
                request.getResident(),
                "Hard Copy Requirements Received",
                "The barangay office received the hard-copy requirements for '" + request.getDocumentName() + "'.",
                "REQUEST_HARD_COPY_SUBMITTED",
                null,
                AdminNotificationService.TARGET_DOCUMENT_REQUEST,
                savedRequest.getRequestId());

        return ResponseEntity.ok(savedRequest);
    }

    @PutMapping("/requests/{id}/reject")
    public ResponseEntity<?> rejectDocumentRequest(@PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        DocumentRequest request = documentRequestRepository.findById(id).orElse(null);
        if (request == null || !request.getStatus().equals("Pending")) {
            return ResponseEntity.notFound().build();
        }

        String rejectionReason = requestBody.get("rejectionReason");
        if (rejectionReason == null || rejectionReason.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rejection reason is required"));
        }

        request.setStatus("Rejected");
        request.setRejectionReason(rejectionReason);
        request.setUpdatedAt(java.time.LocalDateTime.now());
        DocumentRequest savedRequest = documentRequestRepository.save(request);

        // Log the status change
        StatusLog statusLog = new StatusLog();
        statusLog.setDocumentRequest(savedRequest);
        statusLog.setStatus("Rejected");
        statusLog.setTimestamp(java.time.LocalDateTime.now());
        statusLogRepository.save(statusLog);

        // Create notification for the resident with rejection reason
        String notificationMessage = "Your request for '" + request.getDocumentName() + "' has been rejected.";
        notificationService.createNotification(
                request.getResident(),
                "Document Request Rejected",
                notificationMessage,
                "REQUEST_REJECTED",
                rejectionReason,
                AdminNotificationService.TARGET_DOCUMENT_REQUEST,
                savedRequest.getRequestId());

        return ResponseEntity.ok(savedRequest);
    }

    @PutMapping("/requests/{id}/complete")
    public ResponseEntity<?> completeDocumentRequest(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        DocumentRequest request = documentRequestRepository.findById(id).orElse(null);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }
        if (!request.getStatus().equals("Ready for Pickup")) {
            return ResponseEntity.status(409).body(Map.of("error", "Only requests ready for pickup can be completed"));
        }
        request.setStatus("Completed");
        request.setUpdatedAt(java.time.LocalDateTime.now());
        DocumentRequest savedRequest = documentRequestRepository.save(request);

        // Log the status change
        StatusLog statusLog = new StatusLog();
        statusLog.setDocumentRequest(savedRequest);
        statusLog.setStatus("Completed");
        statusLog.setTimestamp(java.time.LocalDateTime.now());
        statusLogRepository.save(statusLog);

        // Create notification for the resident
        notificationService.createNotification(
                request.getResident(),
                "Document Request Completed",
                "Your request for '" + request.getDocumentName() + "' has been completed.",
                "REQUEST_COMPLETED",
                null,
                AdminNotificationService.TARGET_DOCUMENT_REQUEST,
                savedRequest.getRequestId());

        return ResponseEntity.ok(savedRequest);
    }

    // Resident Management
    @GetMapping("/residents")
    public ResponseEntity<?> getAllResidents() {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        List<Resident> residents = residentRepository.findAll().stream()
                .filter(r -> r.getStatus() == ResidentStatus.APPROVED)
                .toList();
        return ResponseEntity.ok(residents);
    }

    @GetMapping("/residents/{id}")
    public ResponseEntity<?> getResidentById(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        Resident resident = residentRepository.findById(id).orElse(null);
        if (resident == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(resident);
    }

    @DeleteMapping("/residents/{id}")
    public ResponseEntity<?> deleteResident(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        if (!residentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        residentRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/residents/{id}/password")
    public ResponseEntity<?> resetResidentPassword(@PathVariable Long id, @RequestBody Map<String, String> request) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        Resident resident = residentRepository.findById(id).orElse(null);
        if (resident == null) {
            return ResponseEntity.notFound().build();
        }
        resident.setPassword(request.get("password"));
        residentRepository.save(resident);
        return ResponseEntity.ok().build();
    }

    // Resident Requests Management - Limited access for regular admins
    @GetMapping("/resident-requests")
    public ResponseEntity<?> getResidentRequests() {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        List<Resident> requests = residentRepository.findAll().stream()
                .filter(r -> r.getStatus() == ResidentStatus.PENDING)
                .toList();
        return ResponseEntity.ok(requests);
    }

    @PutMapping("/resident-requests/{id}/approve")
    public ResponseEntity<?> approveResidentRequest(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        Resident resident = residentRepository.findById(id).orElse(null);
        if (resident == null || resident.getStatus() != ResidentStatus.PENDING) {
            return ResponseEntity.notFound().build();
        }
        resident.setStatus(ResidentStatus.APPROVED);
        Resident savedResident = residentRepository.save(resident);

        notificationService.createNotification(
                savedResident,
                "Account Verified",
                "Your account has been approved and verified.",
                "ACCOUNT_APPROVED",
                null,
                AdminNotificationService.TARGET_RESIDENT_REQUEST,
                savedResident.getResidentId());

        return ResponseEntity.ok(savedResident);
    }

    @PutMapping("/resident-requests/{id}/reject")
    public ResponseEntity<?> rejectResidentRequest(@PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        Resident resident = residentRepository.findById(id).orElse(null);
        if (resident == null || resident.getStatus() != ResidentStatus.PENDING) {
            return ResponseEntity.notFound().build();
        }

        String rejectionReason = requestBody.get("rejectionReason");
        if (rejectionReason == null || rejectionReason.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rejection reason is required"));
        }

        resident.setStatus(ResidentStatus.REJECTED);
        resident.setRejectionReason(rejectionReason);
        residentRepository.save(resident);

        // Create notification for the resident with rejection reason
        String notificationMessage = "Your account registration has been rejected.";
        notificationService.createNotification(
                resident,
                "Account Registration Rejected",
                notificationMessage,
                "ACCOUNT_REJECTED",
                rejectionReason,
                AdminNotificationService.TARGET_RESIDENT_REQUEST,
                resident.getResidentId());

        return ResponseEntity.ok(resident);
    }

    // Announcement Management - Admin can create but not manage other admins
    @GetMapping("/announcements")
    public ResponseEntity<?> getAllAnnouncements(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean isVisible) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            List<Announcement> announcements;

            // If any filters are provided, use filtered method
            if (search != null || priority != null || isActive != null || isVisible != null) {
                announcements = announcementService.getFilteredAnnouncements(search, priority, isActive, isVisible);
            } else {
                announcements = announcementService.getAllAnnouncements();
            }

            // Convert to DTOs for response
            List<AnnouncementDTO> announcementDTOs = announcements.stream()
                    .map(AnnouncementDTO::new)
                    .toList();

            return ResponseEntity.ok(announcementDTOs);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch announcements: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/announcements/active")
    public ResponseEntity<?> getActiveAnnouncements() {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            List<Announcement> announcements = announcementService.getAllActiveAnnouncements();
            List<AnnouncementDTO> announcementDTOs = announcements.stream()
                    .map(AnnouncementDTO::new)
                    .toList();
            return ResponseEntity.ok(announcementDTOs);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch active announcements: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/announcements/{id}")
    public ResponseEntity<?> getAnnouncementById(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            return announcementService.getAnnouncementById(id)
                    .map(announcement -> ResponseEntity.ok(new AnnouncementDTO(announcement)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch announcement: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/announcements")
    public ResponseEntity<?> createAnnouncement(@RequestBody AnnouncementRequest request) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            Announcement announcement = announcementService.createAnnouncement(request);
            return ResponseEntity.ok(new AnnouncementDTO(announcement));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to create announcement: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PutMapping("/announcements/{id}")
    public ResponseEntity<?> updateAnnouncement(@PathVariable Long id, @RequestBody AnnouncementRequest request) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            return announcementService.updateAnnouncement(id, request)
                    .map(announcement -> ResponseEntity.ok(new AnnouncementDTO(announcement)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to update announcement: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @DeleteMapping("/announcements/{id}")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            boolean deleted = announcementService.deleteAnnouncement(id);
            if (deleted) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to delete announcement: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PutMapping("/announcements/{id}/deactivate")
    public ResponseEntity<?> deactivateAnnouncement(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            boolean deactivated = announcementService.deactivateAnnouncement(id);
            if (deactivated) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to deactivate announcement: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PutMapping("/announcements/{id}/toggle-visibility")
    public ResponseEntity<?> toggleAnnouncementVisibility(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            boolean toggled = announcementService.toggleAnnouncementVisibility(id);
            if (toggled) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to toggle announcement visibility: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // Document Types Management - Admin can view but limited editing
    @GetMapping("/document-types")
    public ResponseEntity<?> getAllDocumentTypes() {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        List<DocumentType> types = documentTypeRepository.findAll();
        
        // Transform DocumentType entities to match frontend expectations
        List<Map<String, Object>> formattedTypes = types.stream().map(type -> {
            Map<String, Object> formatted = new HashMap<>();
            formatted.put("documentTypeId", type.getTypeId());
            formatted.put("name", type.getDocumentName());
            formatted.put("description", type.getDescription() != null ? type.getDescription() : type.getShortDescription());
            formatted.put("category", type.getCategory());
            formatted.put("requirements", type.getRequirements());
            formatted.put("hardCopySubmissionRequired", type.isHardCopySubmissionRequired());
            formatted.put("hardCopyRequirements", type.getHardCopyRequirements());
            formatted.put("processingTime", type.getProcessingTime());
            formatted.put("fee", 0); // Frontend expects fee but entity doesn't have it
            formatted.put("isActive", type.isActive());
            formatted.put("typeId", type.getTypeId());
            return formatted;
        }).toList();
        
        return ResponseEntity.ok(formattedTypes);
    }

    @GetMapping("/document-types/{id}")
    public ResponseEntity<?> getDocumentTypeById(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        DocumentType type = documentTypeRepository.findById(id).orElse(null);
        if (type == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Transform DocumentType entity to match frontend expectations
        Map<String, Object> formatted = new HashMap<>();
        formatted.put("documentTypeId", type.getTypeId());
        formatted.put("name", type.getDocumentName());
        formatted.put("description", type.getDescription() != null ? type.getDescription() : type.getShortDescription());
        formatted.put("category", type.getCategory());
        formatted.put("requirements", type.getRequirements());
        formatted.put("hardCopySubmissionRequired", type.isHardCopySubmissionRequired());
        formatted.put("hardCopyRequirements", type.getHardCopyRequirements());
        formatted.put("processingTime", type.getProcessingTime());
        formatted.put("fee", 0); // Frontend expects fee but entity doesn't have it
        formatted.put("isActive", type.isActive());
        formatted.put("typeId", type.getTypeId());
        
        return ResponseEntity.ok(formatted);
    }

    @PostMapping("/document-types")
    public ResponseEntity<?> addDocumentType(@RequestBody DocumentType type) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        if (type.getShortDescription() == null && type.getDescription() != null) {
            type.setShortDescription(type.getDescription());
        }
        if (type.getDescription() == null && type.getShortDescription() != null) {
            type.setDescription(type.getShortDescription());
        }
        type.setProcessingDays(parseProcessingDays(type.getProcessingTime()));
        String validationError = validateHardCopySettings(type);
        if (validationError != null) {
            return ResponseEntity.badRequest().body(Map.of("error", validationError));
        }

        DocumentType saved = documentTypeRepository.save(type);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/document-types/{id}")
    public ResponseEntity<?> updateDocumentType(@PathVariable Long id, @RequestBody Map<String, Object> typeData) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        DocumentType existing = documentTypeRepository.findById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> details = asMap(typeData.get("details"));

        if (typeData.containsKey("id")) {
            existing.setDocumentId(toStringValue(typeData.get("id")));
        }
        if (typeData.containsKey("name")) {
            existing.setDocumentName(toStringValue(typeData.get("name")));
        }

        String shortDescription = firstString(typeData, "shortDescription", null);
        if (shortDescription == null) {
            shortDescription = firstString(typeData, "description", null);
        }
        if (shortDescription != null) {
            existing.setShortDescription(shortDescription);
            existing.setDescription(shortDescription);
        }

        if (typeData.containsKey("imagePath")) {
            existing.setImagePath(toStringValue(typeData.get("imagePath")));
        }

        String category = firstString(typeData, "category", details);
        if (category != null) {
            existing.setCategory(category);
        }

        String longDescription = firstString(typeData, "longDescription", details);
        if (longDescription != null) {
            existing.setLongDescription(longDescription);
        }

        String processingTime = firstString(typeData, "processingTime", details);
        if (processingTime != null) {
            existing.setProcessingTime(processingTime);
            existing.setProcessingDays(parseProcessingDays(processingTime));
        }

        String pdfPath = firstString(typeData, "pdfPath", details);
        if (pdfPath != null) {
            existing.setPdfPath(pdfPath);
        }

        Object requirements = firstValue(typeData, "requirements", details);
        if (requirements != null) {
            existing.setRequirements(asStoredJson(requirements));
        }

        Object hardCopySubmissionRequired = firstValue(typeData, "hardCopySubmissionRequired", details);
        if (hardCopySubmissionRequired != null) {
            existing.setHardCopySubmissionRequired(asBoolean(hardCopySubmissionRequired));
        }

        Object hardCopyRequirements = firstValue(typeData, "hardCopyRequirements", details);
        if (hardCopyRequirements != null) {
            existing.setHardCopyRequirements(asStoredJson(hardCopyRequirements));
        }

        Object uses = firstValue(typeData, "uses", details);
        if (uses != null) {
            existing.setUses(asStoredJson(uses));
        }

        if (typeData.containsKey("isActive")) {
            existing.setActive((Boolean) typeData.get("isActive"));
        }

        String validationError = validateHardCopySettings(existing);
        if (validationError != null) {
            return ResponseEntity.badRequest().body(Map.of("error", validationError));
        }

        DocumentType saved = documentTypeRepository.save(existing);
        
        // Return the updated data in the format expected by frontend
        Map<String, Object> formatted = new HashMap<>();
        formatted.put("documentTypeId", saved.getTypeId());
        formatted.put("name", saved.getDocumentName());
        formatted.put("description", saved.getDescription() != null ? saved.getDescription() : saved.getShortDescription());
        formatted.put("category", saved.getCategory());
        formatted.put("requirements", saved.getRequirements());
        formatted.put("hardCopySubmissionRequired", saved.isHardCopySubmissionRequired());
        formatted.put("hardCopyRequirements", saved.getHardCopyRequirements());
        formatted.put("uses", saved.getUses());
        formatted.put("longDescription", saved.getLongDescription());
        formatted.put("processingTime", saved.getProcessingTime());
        formatted.put("pdfPath", saved.getPdfPath());
        formatted.put("imagePath", saved.getImagePath());
        formatted.put("fee", 0);
        formatted.put("isActive", saved.isActive());
        formatted.put("typeId", saved.getTypeId());
        
        return ResponseEntity.ok(formatted);
    }

    @DeleteMapping("/document-types/{id}")
    public ResponseEntity<?> deleteDocumentType(@PathVariable Long id) {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        if (!documentTypeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        documentTypeRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // System Logs - Admin can view but limited access
    @GetMapping("/logs")
    public ResponseEntity<?> getSystemLogs() {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        List<StatusLog> logs = statusLogRepository.findAll();
        return ResponseEntity.ok(logs);
    }

    // Barangay Settings - Admin can view but not modify
    @GetMapping("/settings")
    public ResponseEntity<?> getBarangaySettings() {
        if (!hasAdminAccess()) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        Map<String, String> settings = new HashMap<>();
        settings.put("barangayName", "Sample Barangay");
        settings.put("address", "Sample Address");
        return ResponseEntity.ok(settings);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?>) {
            return (Map<String, Object>) value;
        }
        return Map.of();
    }

    private Object firstValue(Map<String, Object> root, String key, Map<String, Object> details) {
        if (root.containsKey(key)) {
            return root.get(key);
        }
        if (details != null && details.containsKey(key)) {
            return details.get(key);
        }
        return null;
    }

    private String firstString(Map<String, Object> root, String key, Map<String, Object> details) {
        Object value = firstValue(root, key, details);
        return value == null ? null : toStringValue(value);
    }

    private String toStringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String asStoredJson(Object value) {
        if (value instanceof String) {
            return (String) value;
        }

        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private boolean asBoolean(Object value) {
        if (value instanceof Boolean boolValue) {
            return boolValue;
        }
        return value != null && Boolean.parseBoolean(String.valueOf(value));
    }

    private String validateHardCopySettings(DocumentType type) {
        List<String> requirements = parseStoredList(type.getRequirements());
        List<String> hardCopyRequirements = parseStoredList(type.getHardCopyRequirements());
        if (!type.isHardCopySubmissionRequired()) {
            type.setHardCopyRequirements("[]");
            return null;
        }
        if (hardCopyRequirements.isEmpty()) {
            return "At least one hard-copy requirement is required when hard-copy submission is enabled.";
        }
        if (!requirements.containsAll(hardCopyRequirements)) {
            return "Hard-copy requirements must be selected from the existing document requirements.";
        }
        type.setHardCopyRequirements(asStoredJson(hardCopyRequirements));
        return null;
    }

    private List<String> parseStoredList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> values = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            return values.stream()
                    .filter(value -> value != null && !value.isBlank())
                    .map(String::trim)
                    .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private int parseProcessingDays(String processingTime) {
        if (processingTime == null || processingTime.isBlank()) {
            return 0;
        }

        String normalized = processingTime.toLowerCase();
        if (normalized.contains("var") || normalized.contains("hour") || normalized.contains("minute")
                || !normalized.contains("day")) {
            return 0;
        }

        Matcher matcher = NUMBER_PATTERN.matcher(normalized);
        int days = 0;
        while (matcher.find()) {
            days = Math.max(days, Integer.parseInt(matcher.group()));
        }

        return days > 0 ? days : 1;
    }
}
