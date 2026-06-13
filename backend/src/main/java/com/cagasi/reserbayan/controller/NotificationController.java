package com.cagasi.reserbayan.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cagasi.reserbayan.entity.Notification;
import com.cagasi.reserbayan.service.NotificationService;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping("/resident/{residentId}")
    public ResponseEntity<?> getNotificationsByResident(@PathVariable Long residentId) {
        List<Notification> notifications = notificationService.getNotificationsByResident(residentId);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/resident/{residentId}/unread")
    public ResponseEntity<?> getUnreadNotificationsByResident(@PathVariable Long residentId) {
        List<Notification> notifications = notificationService.getUnreadNotificationsByResident(residentId);
        return ResponseEntity.ok(notifications);
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long notificationId) {
        System.out.println("Received PUT request to mark notification " + notificationId + " as read");
        notificationService.markAsRead(notificationId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/resident/{residentId}/read-all")
    public ResponseEntity<?> markAllAsRead(@PathVariable Long residentId) {
        notificationService.markAllAsRead(residentId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long notificationId) {
        notificationService.deleteNotification(notificationId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/resident/{residentId}")
    public ResponseEntity<?> deleteNotificationsByResident(@PathVariable Long residentId) {
        notificationService.deleteNotificationsByResident(residentId);
        return ResponseEntity.ok().build();
    }
}
