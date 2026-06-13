package com.cagasi.reserbayan.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import com.cagasi.reserbayan.entity.Announcement;

class AnnouncementServiceTests {

    private final AnnouncementService service = new AnnouncementService();

    @Test
    void residentVisibilityOnlyAllowsActiveVisibleCurrentAnnouncements() {
        Announcement current = announcement(true, true, LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(1));
        Announcement expired = announcement(true, true, LocalDateTime.now().minusDays(3), LocalDateTime.now().minusDays(1));
        Announcement upcoming = announcement(true, true, LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(3));
        Announcement hidden = announcement(true, false, LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(1));
        Announcement inactive = announcement(false, true, LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(1));
        Announcement openEnded = announcement(true, true, null, null);

        assertThat(service.isVisibleToResidents(current)).isTrue();
        assertThat(service.isVisibleToResidents(openEnded)).isTrue();
        assertThat(service.isVisibleToResidents(expired)).isFalse();
        assertThat(service.isVisibleToResidents(upcoming)).isFalse();
        assertThat(service.isVisibleToResidents(hidden)).isFalse();
        assertThat(service.isVisibleToResidents(inactive)).isFalse();
        assertThat(service.isVisibleToResidents(null)).isFalse();
    }

    private Announcement announcement(Boolean isActive, Boolean isVisible, LocalDateTime startDate, LocalDateTime endDate) {
        Announcement announcement = new Announcement();
        announcement.setIsActive(isActive);
        announcement.setIsVisible(isVisible);
        announcement.setStartDate(startDate);
        announcement.setEndDate(endDate);
        return announcement;
    }
}
