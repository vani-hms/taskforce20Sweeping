# Cleanliness of Toilets Module Documentation

## 1. Overview
The **Cleanliness of Toilets** module is a comprehensive solution for managing and monitoring the sanitation of public toilets across the city. It connects field employees, Quality Control (QC) personnel, and City Administrators through a unified ecosystem comprising a Mobile App for field operations, a Web Portal for management, and a robust Backend for data processing.

---

## 2. Architecture & Tech Stack

### **Backend (`hms-backend`)**
*   **Framework**: Node.js with Express & TypeScript.
*   **Database**: PostgreSQL with Prisma ORM.
*   **Key Models**:
    *   `Toilet`: Represents the physical asset (Type: CT/PT, Gender, Location, Facilities).
    *   `ToiletInspection`: Records individual cleaning audits (Status, Distance from Target, Photos, Answers).
    *   `Assignment`: Links Employees to Toilets for specific durations.
*   **Key Logic**:
    *   **Role-Based Access Control (RBAC)**: Distinct data visibility for `EMPLOYEE`, `QC`, `ACTION_OFFICER`, and `CITY_ADMIN`.
    *   **Geospatial Validation**: Calculates distance between user location and toilet coordinates during inspection.
    *   **Daily Status Reset**: Toilets are marked "Pending" or "Completed" based on *today's* inspections.

### **Frontend Web (`hms-frontend`)**
*   **Framework**: Next.js (React) with Tailwind CSS.
*   **Key Features**:
    *   **Dashboard**: Real-time statistics on inspections, coverage, and staff attendance.
    *   **Verification Inbox**: Central hub for QC to approve/reject inspections or request further action.
    *   **Asset Management**: Registry of all toilets with filtering by Zone, Ward, and Status.
    *   **Staff Tracking**: Visibility into employee assignments and active zones.

### **Mobile App (`hms-mobile`)**
*   **Framework**: React Native (Expo).
*   **Key Features**:
    *   **Geofenced Inspections**: Employees can only submit inspections when physically near the asset (e.g., within 200m).
    *   **Evidence Capture**: Mandatory photo uploads for inspection questions.
    *   **Daily Tasks**: Simple "To-Do" list interface showing pending toilets for the day.

---

## 3. Web Portal Features

### **A. Dashboard (`ReportsTab`)**
*   **Purpose**: High-level overview for Admins and QC.
*   **Metrics**:
    *   Inspections Submitted Today.
    *   New Toilets Added.
    *   Total Active Staff.
    *   Coverage Stats (Zones/Wards).
*   **Employee View**: Employees see their own performance history (Approved vs Rejected reports).

### **B. Verification & Approvals (`ApprovalsTab`)**
*   **Target Users**: QC, Action Officers, City Admins.
*   **Workflow**:
    1.  **Incoming**: Inspections appear as `SUBMITTED`.
    2.  **Review**: QC reviews photos and answers.
    3.  **Decision**:
        *   **✅ APPROVE**: Inspection valid, cleanliness standards met.
        *   **❌ REJECT**: Evidence insufficient or standards not met.
        *   **⚠️ ACTION REQUIRED**: detailed issues found; escalated to Action Officer.
    4.  **Action Officer**: Can resolve "Action Required" items by fixing issues and marking as `APPROVED` or permanently `REJECTED`.
*   **UI**: Side-by-side quick review panel and full detailed report view.

### **C. Asset Registry (`AllToiletsTab`)**
*   **Features**:
    *   List all CT/PT units.
    *   Filter by Gender, Cleanliness Status (`APPROVED`/`PENDING`/`REJECTED`), Zone, and Ward.
    *   **Bulk Import**: Upload CSV to register hundreds of toilets at once.
    *   **Details View**: See facilities (Water, Electricity), location map, and assignment history.

### **D. Staff Management (`StaffTab` & `AssignmentsTab`)**
*   **Staff Tab**: Read-only directory for QC to see who is working in their jurisdiction.
*   **Assignments Tab**: Interface for Admins to link Employees to Toilets. Support for specific days of the week and shift times.

---

## 4. Mobile App Workflow (Employee)

1.  **Login**: Employee logs in using credentials.
2.  **Home Screen**:
    *   Displays list of **Assigned Toilets**.
    *   Status indicators: 🔴 PENDING (needs cleaning), 🟢 COMPLETED (inspected today).
3.  **Inspection Process**:
    *   Select a Pending Toilet.
    *   **Location Check**: App verifies GPS coordinates. If too far > 200m, submission is blocked (or warned).
    *   **Questionnaire**: Answer "Yes/No" to cleanliness questions (e.g., "Is floor clean?").
    *   **Photo Evidence**: Take live photos using the camera (gallery upload disabled for authenticity).
4.  **Submission**: Report sent to server. Status changes to 🔵 SUBMITTED.

---

## 5. Backend Logic & APIs

### **Key Endpoints**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/modules/toilet/assigned` | Returns list of toilets assigned to the logged-in user with status calculated for *today*. |
| `POST` | `/modules/toilet/inspection` | Receives inspection data, validates location, and saves images. |
| `GET` | `/modules/toilet/inspections` | Lists inspections with filtering (for Web Dashboard & Inbox). |
| `POST` | `/modules/toilet/inspections/:id/review` | Updates status (Approve/Reject) and adds QC comments. |
| `GET` | `/modules/toilet/stats` | Aggregated data for admin dashboards. |

### **Data Models**
**`ToiletInspection`**
```prisma
model ToiletInspection {
  id              String           @id @default(uuid())
  status          InspectionStatus @default(SUBMITTED) // SUBMITTED, APPROVED, REJECTED, ACTION_REQUIRED
  distanceMeters  Float            // Geofence data
  answers         Json             // { "q1": { answer: "YES", photos: [...] } }
  employeeId      String
  toiletId        String
  // ... timestamps
}
```

---

## 6. Security & Roles

*   **QC (Quality Control)**:
    *   Can see **ALL** inspections in their City.
    *   Can **Approve/Reject** reports.
    *   Can view Staff list.
*   **Action Officer**:
    *   Can see inspections marked **ACTION REQUIRED**.
    *   Can resolve escalations.
*   **Employee**:
    *   Can only see **their own** assignments.
    *   Can only submit inspections.
    *   Cannot modify reports after submission.
