package com.cagasi.reserbayan.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
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
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/superadmin")
public class SuperAdminController {

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
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AnnouncementService announcementService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private AdminNotificationService adminNotificationService;

    // Summary & Analytics
    @GetMapping("/summary")
    public ResponseEntity<?> getSummary() {
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
        List<Resident> residents = residentRepository.findAll().stream()
                .filter(r -> r.getStatus() == ResidentStatus.APPROVED)
                .toList();
        return ResponseEntity.ok(residents);
    }

    @GetMapping("/residents/{id}")
    public ResponseEntity<?> getResidentById(@PathVariable Long id) {
        Resident resident = residentRepository.findById(id).orElse(null);
        if (resident == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(resident);
    }

    @DeleteMapping("/residents/{id}")
    public ResponseEntity<?> deleteResident(@PathVariable Long id) {
        if (!residentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        residentRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/residents/{id}/password")
    public ResponseEntity<?> resetResidentPassword(@PathVariable Long id, @RequestBody Map<String, String> request) {
        Resident resident = residentRepository.findById(id).orElse(null);
        if (resident == null) {
            return ResponseEntity.notFound().build();
        }
        resident.setPassword(request.get("password"));
        residentRepository.save(resident);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/residents/{id}/verify")
    public ResponseEntity<?> verifyResident(@PathVariable Long id) {
        Resident resident = residentRepository.findById(id).orElse(null);
        if (resident == null) {
            return ResponseEntity.notFound().build();
        }
        // Assuming there's a verification status or field, for now just update status
        // to APPROVED
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

    @GetMapping("/residents/{id}/password")
    public ResponseEntity<?> getResidentPassword(@PathVariable Long id) {
        Resident resident = residentRepository.findById(id).orElse(null);
        if (resident == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity
                .ok(Map.of("password", resident.getPassword() != null ? resident.getPassword() : "Not set"));
    }

    // Resident Requests Management
    @GetMapping("/resident-requests")
    public ResponseEntity<?> getResidentRequests() {
        List<Resident> requests = residentRepository.findAll().stream()
                .filter(r -> r.getStatus() == ResidentStatus.PENDING)
                .toList();
        return ResponseEntity.ok(requests);
    }

    @PutMapping("/resident-requests/{id}/approve")
    public ResponseEntity<?> approveResidentRequest(@PathVariable Long id) {
        Resident resident = residentRepository.findById(id).orElse(null);
        if (resident == null || resident.getStatus() != ResidentStatus.PENDING) {
            return ResponseEntity.notFound().build();
        }
        resident.setStatus(ResidentStatus.APPROVED);
        residentRepository.save(resident);
        return ResponseEntity.ok(resident);
    }

    @PutMapping("/resident-requests/{id}/reject")
    public ResponseEntity<?> rejectResidentRequest(@PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
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

    // Announcement Management
    @GetMapping("/announcements")
    public ResponseEntity<?> getAllAnnouncements(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean isVisible) {
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

    // Admin Management
    @GetMapping("/admins")
    public ResponseEntity<?> getAllAdmins() {
        List<Admin> admins = adminRepository.findAll();
        for (Admin admin : admins) {
            if (admin.getPlainPassword() == null) {
                if (admin.getRole() == Role.SUPER_ADMIN) {
                    admin.setPlainPassword("SuperAdmin123!");
                } else {
                    admin.setPlainPassword("Admin123");
                }
            }
            // Encode password if not already encoded
            if (admin.getPassword() != null && !admin.getPassword().startsWith("$2a")) {
                admin.setPassword(passwordEncoder.encode(admin.getPassword()));
                adminRepository.save(admin);
            }
        }
        return ResponseEntity.ok(admins);
    }

    @GetMapping("/admins/{id}")
    public ResponseEntity<?> getAdminById(@PathVariable Long id) {
        Admin admin = adminRepository.findById(id).orElse(null);
        if (admin == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(admin);
    }

    @PostMapping("/admins")
    public ResponseEntity<?> addAdmin(@RequestBody Admin admin) {
        try {
            String plainPassword = admin.getPlainPassword();
            if (plainPassword == null || plainPassword.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Password is required");
                return ResponseEntity.badRequest().body(error);
            }
            admin.setPlainPassword(plainPassword);
            admin.setPassword(passwordEncoder.encode(plainPassword));
            Admin saved = adminRepository.save(admin);
            return ResponseEntity.ok(saved);
        } catch (DataIntegrityViolationException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Username or email already exists");
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to add admin: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PutMapping("/admins/{id}")
    public ResponseEntity<?> updateAdmin(@PathVariable Long id, @RequestBody Admin admin) {
        Admin existing = adminRepository.findById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        existing.setFirstName(admin.getFirstName());
        existing.setLastName(admin.getLastName());
        existing.setMiddleName(admin.getMiddleName());
        existing.setResidentEmail(admin.getResidentEmail());
        existing.setUsername(admin.getUsername());
        existing.setPhoneNumber(admin.getPhoneNumber());
        existing.setAddress(admin.getAddress());
        existing.setPosition(admin.getPosition());
        existing.setProofOfEmploymentPath(admin.getProofOfEmploymentPath());
        // Update password if changed
        if (admin.getPassword() != null && !admin.getPassword().equals(existing.getPlainPassword())) {
            existing.setPlainPassword(admin.getPassword());
            existing.setPassword(passwordEncoder.encode(admin.getPassword()));
        }
        Admin saved = adminRepository.save(existing);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/admins/{id}/status")
    public ResponseEntity<?> toggleAdminStatus(@PathVariable Long id) {
        Admin admin = adminRepository.findById(id).orElse(null);
        if (admin == null) {
            return ResponseEntity.notFound().build();
        }
        admin.setStatus(admin.getStatus() == Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE);
        Admin saved = adminRepository.save(admin);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/admins/{id}/role")
    public ResponseEntity<?> makeSuperAdmin(@PathVariable Long id) {
        Admin admin = adminRepository.findById(id).orElse(null);
        if (admin == null) {
            return ResponseEntity.notFound().build();
        }
        admin.setRole(Role.SUPER_ADMIN);
        Admin saved = adminRepository.save(admin);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/admins/{id}")
    public ResponseEntity<?> deleteAdmin(@PathVariable Long id) {
        if (!adminRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        adminRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/admins/{id}/password")
    public ResponseEntity<?> resetAdminPassword(@PathVariable Long id, @RequestBody Map<String, String> request) {
        Admin admin = adminRepository.findById(id).orElse(null);
        if (admin == null) {
            return ResponseEntity.notFound().build();
        }
        admin.setPassword(request.get("password"));
        adminRepository.save(admin);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify-password")
    public ResponseEntity<?> verifySuperAdminPassword(@RequestBody Map<String, String> request) {
        String password = request.get("password");
        if (password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "Password is required"));
        }

        // Get the current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("valid", false, "message", "Not authenticated"));
        }

        String username = authentication.getName();

        // Find the admin by username or email
        Admin currentAdmin = adminRepository.findByUsername(username).orElse(null);
        if (currentAdmin == null) {
            currentAdmin = adminRepository.findByResidentEmail(username).orElse(null);
        }

        if (currentAdmin == null || currentAdmin.getRole() != Role.SUPER_ADMIN) {
            return ResponseEntity.status(403).body(Map.of("valid", false, "message", "Super admin access required"));
        }

        // Verify the password using the password encoder
        boolean isValid = passwordEncoder.matches(password, currentAdmin.getPassword());

        return ResponseEntity.ok(Map.of("valid", isValid));
    }

    // Document Types Management
    @GetMapping("/document-types")
    public ResponseEntity<?> getAllDocumentTypes() {
        List<DocumentType> types = documentTypeRepository.findAll();
        return ResponseEntity.ok(types);
    }

    @PostMapping("/document-types")
    public ResponseEntity<?> addDocumentType(@RequestBody DocumentType type) {
        String validationError = validateHardCopySettings(type);
        if (validationError != null) {
            return ResponseEntity.badRequest().body(Map.of("error", validationError));
        }
        DocumentType saved = documentTypeRepository.save(type);
        return ResponseEntity.ok(saved);
    }

    // System Logs
    @GetMapping("/logs")
    public ResponseEntity<?> getSystemLogs() {
        List<StatusLog> logs = statusLogRepository.findAll();
        return ResponseEntity.ok(logs);
    }

    // Barangay Settings - placeholder
    @GetMapping("/settings")
    public ResponseEntity<?> getBarangaySettings() {
        Map<String, String> settings = new HashMap<>();
        settings.put("barangayName", "Sample Barangay");
        settings.put("address", "Sample Address");
        return ResponseEntity.ok(settings);
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
        try {
            type.setHardCopyRequirements(objectMapper.writeValueAsString(hardCopyRequirements));
        } catch (Exception e) {
            return "Unable to save hard-copy requirements.";
        }
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
}
