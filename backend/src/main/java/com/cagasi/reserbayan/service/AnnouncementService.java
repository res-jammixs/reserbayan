package com.cagasi.reserbayan.service;

import com.cagasi.reserbayan.dto.AnnouncementRequest;
import com.cagasi.reserbayan.entity.Announcement;
import com.cagasi.reserbayan.repository.AnnouncementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AnnouncementService {

    @Autowired
    private AnnouncementRepository announcementRepository;

    // Get all active announcements
    public List<Announcement> getAllActiveAnnouncements() {
        return announcementRepository.findByIsActiveTrueOrderByCreatedAtDesc();
    }

    // Get all announcements (for admin use)
    public List<Announcement> getAllAnnouncements() {
        return announcementRepository.findAllByOrderByCreatedAtDesc();
    }

    // Get announcements with filtering
    public List<Announcement> getFilteredAnnouncements(String search, String priority, Boolean isActive,
            Boolean isVisible) {
        List<Announcement> announcements = announcementRepository.findAllByOrderByCreatedAtDesc();

        return announcements.stream()
                .filter(announcement -> {
                    // Search filter
                    if (StringUtils.hasText(search)) {
                        String searchLower = search.toLowerCase();
                        if (!announcement.getTitle().toLowerCase().contains(searchLower) &&
                                !announcement.getContent().toLowerCase().contains(searchLower) &&
                                !announcement.getPostedBy().toLowerCase().contains(searchLower)) {
                            return false;
                        }
                    }

                    // Priority filter
                    if (StringUtils.hasText(priority) && !priority.equals("ALL")) {
                        if (announcement.getPriority() == null || !announcement.getPriority().name().equals(priority)) {
                            return false;
                        }
                    }

                    // Active filter
                    if (isActive != null && announcement.getIsActive() != isActive) {
                        return false;
                    }

                    // Visibility filter
                    if (isVisible != null && announcement.getIsVisible() != isVisible) {
                        return false;
                    }

                    return true;
                })
                .collect(Collectors.toList());
    }

    public boolean isVisibleToResidents(Announcement announcement) {
        if (announcement == null) {
            return false;
        }
        if (announcement.getIsActive() == null || !announcement.getIsActive()) {
            return false;
        }
        if (announcement.getIsVisible() == null || !announcement.getIsVisible()) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDate = announcement.getStartDate();
        LocalDateTime endDate = announcement.getEndDate();

        if (startDate != null && now.isBefore(startDate)) {
            return false;
        }
        return endDate == null || !now.isAfter(endDate);
    }

    // Get announcement by ID
    public Optional<Announcement> getAnnouncementById(Long id) {
        return announcementRepository.findById(id);
    }

    // Create new announcement
    public Announcement createAnnouncement(AnnouncementRequest request) {
        Announcement announcement = new Announcement();
        announcement.setTitle(request.getTitle());
        announcement.setContent(request.getContent());
        announcement.setPostedBy(request.getPostedBy());
        announcement.setStartDate(request.getStartDate());
        announcement.setEndDate(request.getEndDate());
        announcement.setPriority(request.getPriority());
        announcement.setIsVisible(request.getIsVisible());
        announcement.setCreatedAt(LocalDateTime.now());
        announcement.setIsActive(true);

        return announcementRepository.save(announcement);
    }

    // Update existing announcement
    public Optional<Announcement> updateAnnouncement(Long id, AnnouncementRequest request) {
        Optional<Announcement> existingAnnouncement = announcementRepository.findById(id);

        if (existingAnnouncement.isPresent()) {
            Announcement announcement = existingAnnouncement.get();
            announcement.setTitle(request.getTitle());
            announcement.setContent(request.getContent());
            announcement.setStartDate(request.getStartDate());
            announcement.setEndDate(request.getEndDate());
            announcement.setPriority(request.getPriority());
            announcement.setIsVisible(request.getIsVisible());
            announcement.setUpdatedAt(LocalDateTime.now());

            return Optional.of(announcementRepository.save(announcement));
        }

        return Optional.empty();
    }

    // Deactivate announcement (soft delete)
    public boolean deactivateAnnouncement(Long id) {
        Optional<Announcement> existingAnnouncement = announcementRepository.findById(id);

        if (existingAnnouncement.isPresent()) {
            Announcement announcement = existingAnnouncement.get();
            announcement.setIsActive(false);
            announcement.setUpdatedAt(LocalDateTime.now());
            announcementRepository.save(announcement);
            return true;
        }

        return false;
    }

    // Toggle announcement visibility
    public boolean toggleAnnouncementVisibility(Long id) {
        Optional<Announcement> existingAnnouncement = announcementRepository.findById(id);

        if (existingAnnouncement.isPresent()) {
            Announcement announcement = existingAnnouncement.get();
            announcement.setIsVisible(!announcement.getIsVisible());
            announcement.setUpdatedAt(LocalDateTime.now());
            announcementRepository.save(announcement);
            return true;
        }

        return false;
    }

    // Permanently delete announcement
    public boolean deleteAnnouncement(Long id) {
        if (announcementRepository.existsById(id)) {
            announcementRepository.deleteById(id);
            return true;
        }
        return false;
    }

    // Get announcement summary for dashboard
    public Map<String, Object> getAnnouncementSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("totalAnnouncements", announcementRepository.count());
        summary.put("activeAnnouncements", announcementRepository.countActiveAnnouncements());
        return summary;
    }
}
