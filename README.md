# ReserBayan

ReserBayan is a digital Barangay Document Request System built to make local government document processing faster, clearer, and more accessible for Filipino residents. Formerly developed as a school project, ReserBayan has been expanded and refined into a hackathon-ready platform focused on modernizing how residents request, track, and manage barangay documents online.

Instead of requiring residents to visit the barangay hall for every inquiry or request, ReserBayan provides a secure and user-friendly digital experience where users can browse available documents, view requirements and processing details, submit requests, upload needed files, and monitor the progress of their applications in one place.

For administrators, the system includes dedicated tools for managing resident accounts, verifying pending registrations, reviewing document requests, posting announcements, and maintaining document types. The platform is designed with a clean, responsive interface using a consistent ReserBayan dark-blue visual identity, making it suitable for both residents and government staff.

## Purpose

ReserBayan aims to reduce manual paperwork, long queues, and unclear request updates by giving barangays a simple digital system for document services. It helps residents save time while giving administrators a more organized way to process requests and communicate important updates.

## Key Features

- Resident, admin, and super admin authentication
- Browse barangay document types with detailed requirements and processing information
- Online document request submission with file attachments
- Request status tracking for pending, approved, completed, rejected, and cancelled requests
- Admin and super admin dashboards for one-glance management
- Resident account verification and pending account review
- Announcement management for barangay updates and resident notifications
- Responsive, mobile-friendly interface with subtle animations
- Custom modals, drawers, dropdowns, and calendar controls for a consistent user experience

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS v4, Framer Motion
- **Backend:** Spring Boot, Spring Data JPA
- **Database:** MySQL
- **Architecture:** Full-stack web application with separate frontend and backend folders

## Project Structure

```txt
/frontend   Next.js application
/backend    Spring Boot API
```

## Deployment Notes

The Next.js frontend can be deployed on Vercel. The Spring Boot backend should be deployed separately on a host that can run Java and the native Tesseract OCR binary, such as Render, Railway, Fly.io, or a Docker-capable VPS.

Frontend environment variables on Vercel:

```txt
BACKEND_URL=https://your-backend-domain.example.com
```

The frontend calls same-origin `/api/...` and `/uploads/...` paths. Next.js rewrites those paths to `BACKEND_URL`, so production does not depend on `localhost:8080`.

Backend environment variables:

```txt
TESSERACT_COMMAND=tesseract
DEEPSEEK_API_KEY=your_deepseek_api_key
OCR_SPACE_API_KEY=your_ocr_space_api_key_optional
```

The backend uses online OCR by default, so local Tesseract is not required for development. The backend Dockerfile still installs `tesseract-ocr` as a fallback and sets `TESSERACT_COMMAND=tesseract` by default. If automatic checking is temporarily unavailable, uploads remain submittable and staff can review them manually.
