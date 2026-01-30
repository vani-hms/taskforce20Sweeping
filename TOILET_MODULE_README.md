# 🚻 Cleanliness of Toilets Module - Operational Guide

This document explains the **Toilet Module** in simple terms for the deployment team, server administrators, and future developers.

---

## 1. What is this module?
This module allows the city to:
1.  **Register Community & Public Toilets (CT/PT)** in the system.
2.  **Assign Employees** to clean and inspect these toilets.
3.  **Conduct Daily Inspections** via the Mobile App (with Geofencing & Photos).
4.  **Review Reports** via the Web Portal (QC & Action Officers).

---

## 2. Server Deployment Guide (Step-by-Step)
If you are setting this up on a new server, you **MUST** runs these 4 specific commands in order. If you skip any, the module will gap or crash.

### **Step 1: Create the Database Tables**
*   **Command:** `npx prisma migrate deploy`
*   **Why?** The server's database is currently empty regarding toilets. This command creates the `Toilet`, `ToiletInspection`, and `ToiletAssignment` tables.
*   **If you skip this:** The backend will crash saying "Relation does not exist".

### **Step 2: Register the Module**
*   **Command:** `npm run seed`
*   **Why?** This tells the system that a module named `TOILET` exists. Without this, the permission system will block everything.
*   **If you skip this:** You will get "Module not found" or "Access Denied" errors.

### **Step 3: Enable Access for Existing Admins**
*   **Command:** `npx ts-node scripts/enable-toilet-module.ts`
*   **Why?** Existing City Admins and QCs don't have the "Toilet" permission yet. This script finds them and checks the "Toilet" box for them automatically.
*   **If you skip this:** Admins will log in but won't see the Toilet tab.

### **Step 4: Load Inspection Questions (Crucial!)**
*   **Command:** `npx ts-node scripts/seed-toilet-inspection-questions.ts`
*   **Why?** The Mobile App needs a checklist (e.g., "Is the floor clean?"). These questions are stored in the database.
*   **If you skip this:** The Mobile App inspection screen will be completely **BLANK**.

---

## 3. Important Scripts Explained

| Script Name | Location | Purpose | Run Once or Often? |
| :--- | :--- | :--- | :--- |
| `seed.ts` | `scripts/seed.ts` | Registers the base "TOILET" module in the system. | Run Once |
| `seed-toilet-inspection-questions.ts` | `scripts/` | Uploads the 30+ Yes/No questions to the DB. | Run Once (or if questions change) |
| `enable-toilet-module.ts` | `scripts/` | Gives "Toilet" access to all existing City Admins/QCs. | Run Manually when needed |
| `seed-toilet-data.ts` | `scripts/` | Adds dummy/fake toilets for testing purposes. | **DO NOT RUN** on Production |

---

## 4. Common Issues & Solutions

### **Issue 1: "I opened the app, but there are no questions?"**
*   **Reason:** You forgot to run Step 4 (`seed-toilet-inspection-questions.ts`).
*   **Fix:** Run the script on the server.

### **Issue 2: "I am an Admin, but I can't see the Toilet Tab."**
*   **Reason:** Your user role hasn't been granted the permission yet.
*   **Fix:** Run `npx ts-node scripts/enable-toilet-module.ts`.

### **Issue 3: "The list of toilets is empty."**
*   **Reason:** Accessing a new server means a fresh database.
*   **Fix:** Use the **Bulk Import** feature on the Web Portal -> All Toilets Tab to upload your real city data.

---

## 5. Architecture Summary
*   **Backend**: Node.js + Prisma (Handles logic, DB, and maps).
*   **Web Portal**: Next.js (Used for Reports, Approvals, and adding Toilets).
*   **Mobile App**: React Native (Used for submitting inspections with GPS location).

This guide should be shared with anyone maintaining the HMS system.
