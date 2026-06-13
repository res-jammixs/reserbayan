package com.cagasi.reserbayan.controller;

import com.cagasi.reserbayan.dto.AnnouncementDTO;
import com.cagasi.reserbayan.entity.Announcement;
import com.cagasi.reserbayan.service.AnnouncementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/residents")
public class ResidentController {

    @Autowired
    private AnnouncementService announcementService;

    // Get all visible announcements for residents with pagination and filtering
    @GetMapping("/announcements")
    public ResponseEntity<?> getVisibleAnnouncements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Boolean isVisible) {
        try {
            List<Announcement> announcements;

            // If any filters are provided, use filtered method
            if (search != null || priority != null || isVisible != null) {
                announcements = announcementService.getFilteredAnnouncements(search, priority, true, true);
            } else {
                announcements = announcementService.getAllActiveAnnouncements();
            }

            // Only currently visible announcements should be shown to residents.
            announcements = announcements.stream()
                    .filter(announcementService::isVisibleToResidents)
                    .collect(Collectors.toList());

            // Sort by created date (newest first) and priority
            announcements.sort((a, b) -> {
                // First sort by priority (URGENT > HIGH > MEDIUM > LOW)
                int priorityOrder = getPriorityOrder(b.getPriority()) - getPriorityOrder(a.getPriority());
                if (priorityOrder != 0)
                    return priorityOrder;

                // Then sort by creation date (newest first)
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            });

            // Apply pagination
            int startIndex = page * size;
            int endIndex = Math.min(startIndex + size, announcements.size());
            List<Announcement> paginatedAnnouncements = announcements.subList(
                    Math.min(startIndex, announcements.size()),
                    endIndex);

            // Convert to DTOs
            List<AnnouncementDTO> announcementDTOs = paginatedAnnouncements.stream()
                    .map(AnnouncementDTO::new)
                    .collect(Collectors.toList());

            // Create response with pagination info
            Map<String, Object> response = new HashMap<>();
            response.put("announcements", announcementDTOs);
            response.put("currentPage", page);
            response.put("totalItems", announcements.size());
            response.put("totalPages", (int) Math.ceil((double) announcements.size() / size));
            response.put("hasNext", endIndex < announcements.size());
            response.put("hasPrevious", page > 0);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch announcements: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // Get a specific announcement by ID (for detailed view)
    @GetMapping("/announcements/{id}")
    public ResponseEntity<?> getAnnouncementById(@PathVariable Long id) {
        try {
            return announcementService.getAnnouncementById(id)
                    .map(announcement -> {
                        if (announcementService.isVisibleToResidents(announcement)) {
                            return ResponseEntity.ok(new AnnouncementDTO(announcement));
                        } else {
                            return ResponseEntity.notFound().build();
                        }
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch announcement: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // Get announcement count for badge
    @GetMapping("/announcements/count")
    public ResponseEntity<?> getAnnouncementCount() {
        try {
            List<Announcement> announcements = announcementService.getAllActiveAnnouncements();
            long visibleCount = announcements.stream()
                    .filter(announcementService::isVisibleToResidents)
                    .count();
            return ResponseEntity.ok(Map.of("count", visibleCount));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch announcement count: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // Helper method to get priority order for sorting
    private int getPriorityOrder(Announcement.Priority priority) {
        switch (priority) {
            case URGENT:
                return 4;
            case HIGH:
                return 3;
            case MEDIUM:
                return 2;
            case LOW:
                return 1;
            default:
                return 0;
        }
    }
}
