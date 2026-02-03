# Toilet Module Integration & Handoff Documentation
**Date**: 2026-02-03
**Author**: Antigravity (Google Deepmind)

## 1. Executive Summary
This document details the complete integration of the "Cleanliness of Toilets" module across the Full Stack (Backend, Frontend Web, and Mobile App). It includes database schema changes, API endpoints, and new UI features.

## 2. Database Architecture (PostgreSQL / Prisma)

### 2.1 Schema Updates (`prisma/schema.prisma`)
The core data models have been updated to support new classifications.

#### **New Enums & Values**
- **`ToiletType`**: Added `URINALS`.
  - Values: `CT` (Community), `PT` (Public), `URINALS`.
- **`ToiletGender`**: Added `DIFFERENTLY_ABLED`.
  - Values: `MALE`, `FEMALE`, `UNISEX`, `DISABLED`, `DIFFERENTLY_ABLED`.

#### **Key Models**
1.  **`Toilet`**: Represents the physical asset.
    - Fields: `cityId`, `type`, `gender`, `latitude`, `longitude`, `status`, `assignedEmployeeIds`.
2.  **`ToiletAssignment`**: Manages staff assignments.
    - **Logic Update**: Explicitly handles `URINAL` category during assignment creation.
3.  **`ToiletInspection`**: Records daily cleaning validation.
4.  **`ToiletInspectionQuestion`**: Stores the checklist.
    - **Important**: Currently seeded for `CT` and `PT`. **Action Required**: Add questions for `URINALS` to the seed script if specific questions are needed.

### 2.2 Migrations
- **New Migration Created**: `add_urinals_and_disabled`
- **Path**: `hms-backend/prisma/migrations/20260203..._add_urinals_and_disabled`
- **Action**: This migration **must** be applied to any production database to support the new dropdown options in the mobile app.

---

## 3. Backend Services (`hms-backend`)

### 3.1 Router: `src/modules/toilet/router.ts`
The router was refactored to handle:
- **Registration**: Accepts `URINALS` and `DIFFERENTLY_ABLED`.
- **Dashboard Stats (`/stats`)**:
    - Now returns `supportStaff` object containing QC and Action Officer details (Name, Phone) for the mobile Profile screen.
    - **Performance**: Optimized queries for dashboard loading.
- **Assignments**:
    - Logic added to correctly tag `URINAL` assignments so they appear under the correct filter in the mobile app.

### 3.2 Scripts
- `scripts/seed-toilet-inspection-questions.ts`: Populates the survey. Needs update for Urinals.

---

## 4. Mobile Application (`hms-mobile`)

### 4.1 New Features
1.  **Profile Tab (New)**:
    - **File**: `src/modules/cleanlinessOfToilets/screens/ToiletProfileScreen.tsx`
    - Displays: Employee Name, Role, City, Assigned Wards.
    - **Support Team**: Dynamically lists Quality Controllers (QC) and Action Officers (AO) with **Tap-to-Call** functionality.
2.  **Registration Fixes**:
    - **File**: `src/modules/cleanlinessOfToilets/screens/ToiletRegisterScreen.tsx`
    - Enabled `Urinals` and `Differently Abled` in the dropdowns.
    - Fixed validation errors impacting these selections.
3.  **Terminology Updates**:
    - **File**: `src/modules/cleanlinessOfToilets/screens/ToiletEmployeeHome.tsx` + others.
    - Changed generic "Assets" text to "Toilets" / "Operational Toilets" for clarity.
4.  **Navigation**:
    - **File**: `src/modules/cleanlinessOfToilets/screens/ToiletEmployeeTabs.tsx`
    - Added the "Profile" tab to the bottom navigation bar.

---

## 5. Frontend Web Portal (`hms-frontend`)

### 5.1 UI Enhancements
- **Reports & Approvals**: Updated table headers to use **Black** text for better readability (requested by user).
- **Pagination**: Added pagination support to the Inspections list to handle large datasets.
- **Files Modified**:
  - `app/modules/toilet/ReportsTab.tsx`
  - `app/modules/toilet/ApprovalsTab.tsx`
  - `app/modules/toilet/AssignmentsTab.tsx`

---

## 6. Deployment Instructions (Handoff)

To deploy these changes to a fresh environment (or production), follow these exact steps to ensure database consistency.

### Step 1: Database Migration
Apply the schema changes to the database.
```bash
cd hms-backend
npx prisma migrate deploy
npx prisma generate
```

### Step 2: Seeding Data (If New Environment)
Populate the inspection questions.
```bash
npx ts-node scripts/seed-toilet-inspection-questions.ts
```
*Note: To add specific questions for Urinals, edit this file, add a `urinalQuestions` array, and write them to `forType: 'URINALS'` before running.*

### Step 3: Start Services
Restart backend to ensure new Type/Gender enums are loaded in memory.
```bash
npm run dev
```

### Step 4: Mobile App Build
Rebuild the mobile app to ensure the new "Profile" screen and navigation changes are included.
```bash
cd hms-mobile
npx expo start -c
```

---
**Status**: All modules are synced, compiling, and tested for the "Urinal Registration" workflow.

### Recent Updates (v2.0 - Urinal & UI Polish)
**1. Urinal Inspection Questionnaire** (Implemented in `seed-toilet-inspection-questions.ts`)
A specific set of 10 questions has been added for Urinal inspections.
- **Key Checks**: Open/Functional, Signage, Google Maps visibility, Caretaker presence, CLeanliness, Flushing Mechanism, Closed drainage system.
- **Evidence**: Photos are mandatory for most checks (e.g. Signage, Caretaker, Urinal condition).

**2. Mobile UI Refinements (`ToiletInspectionScreen.tsx`)**
- **Aesthetic Overhaul**: Switched to a cleaner, more formal card design with thinner borders and subtle shadows (`elevation: 0`).
- **Compact Layout**: Reduced padding and margins for a denser information display.
- **Modern Controls**: 
  - Replaced bulky photo upload box with a sleek "camera" text button.
  - Updated Yes/No toggles to have pro-level active states.
  - Added "Evidence Count" indicators.

### Recent Updates (v2.1 - Feedback Loop)
**1. Additional Remarks Question**
- Added a new open-ended text question "Any additional remarks, observations or feedback by the assessor?" to **CT**, **PT**, and **URINALS** questionnaires.

**2. Visual Cleanup**
- Removed the camera emoji from the "Add Photo" button for a strictly professional look.
