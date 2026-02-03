# Toilet Module API & Integration Details

## 📊 Summary
*   **Total Dedicated APIs**: 16 Endpoints in `toilet` module.
*   **Shared APIs Used**: 2 (`/zones`, `/wards` from shared logic).
*   **Connection Protocol**: REST via HTTP/1.1.
*   **Authentication**: JWT (Bearer Token) in Header.

---

## 1. API Endpoints Inventory (`hms-backend`)

Here is the complete list of APIs defined in `src/modules/toilet/router.ts`:

### **Asset Management**
| Method | Endpoint | Description | Used By |
| :--- | :--- | :--- | :--- |
| `POST` | `/modules/toilet/register` | Register a new toilet (CT/PT). | 📱 Mobile (Emp) |
| `GET` | `/modules/toilet/my-requests` | List toilets requested by logged-in user. | 📱 Mobile (Emp) |
| `GET` | `/modules/toilet/pending` | List toilets waiting for approval. | 💻 Web (QC) |
| `POST` | `/modules/toilet/:id/approve` | Approve a pending toilet & assign staff. | 💻 Web (QC) |
| `POST` | `/modules/toilet/bulk-import` | Upload CSV to create multiple toilets. | 💻 Web (Admin) |
| `GET` | `/modules/toilet/all` | List all registered toilets (CT/PT). | 💻 Web (All) |
| `GET` | `/modules/toilet/:id` | Get full details of a specific toilet. | 💻 Web (All) |

### **Staff & Assignments**
| Method | Endpoint | Description | Used By |
| :--- | :--- | :--- | :--- |
| `GET` | `/modules/toilet/assigned` | Get toilets assigned to *me* (the logged-in employee). | 📱 Mobile (Emp) |
| `POST` | `/modules/toilet/assignments/bulk` | Assign employees to toilets in bulk. | 💻 Web (Admin) |

### **Inspections & Reporting**
| Method | Endpoint | Description | Used By |
| :--- | :--- | :--- | :--- |
| `GET` | `/modules/toilet/inspection-questions`| Get list of checklist questions. | 📱 Mobile (Emp) |
| `POST` | `/modules/toilet/inspections/submit` | Submit a new cleanliness report (with photos/loc). | 📱 Mobile (Emp) |
| `GET` | `/modules/toilet/inspections` | List inspections (filtered by status/date). | 💻 Web (QC/Admin) |
| `GET` | `/modules/toilet/inspections/:id` | Get single inspection report. | 💻 Web (QC/Admin) |
| `POST` | `/modules/toilet/inspections/:id/review`| QC/Admin action (Approve/Reject/Comment). | 💻 Web (QC/Admin) |
| `GET` | `/modules/toilet/stats` | Dashboard statistics (Counts, Charts). | 💻 Web (Dashboard) |
| `GET` | `/modules/toilet/reports/summary` | Simple status breakdown. | 💻 Web (Reports) |

---

## 2. Web Portal Integration (`hms-frontend`)

The Web Portal connects to the backend using `lib/apiClient.ts`.

### **Where APIs are Connected:**

1.  **Dashboard Tab (`ReportsTab.tsx`)**:
    *   Calls `GET /stats`: To show "Today's Inspections", "Total Toilets", "Active Staff".
    *   Calls `GET /inspections`: To populate the "Latest Cleanliness Inspections" table.

2.  **Inbox / Approvals (`ApprovalsTab.tsx`)**:
    *   Calls `GET /pending`: To see new toilet registrations.
    *   Calls `GET /inspections`: Fetches `SUBMITTED` reports.
    *   Calls `POST /inspections/:id/review`: When you click **Approve** or **Reject**.

3.  **Toilet Registry (`AllToiletsTab.tsx`)**:
    *   Calls `GET /all`: Loads the list of all assets.
    *   Calls `GET /zones` & `GET /wards`: For the filter dropdowns.
    *   Calls `POST /bulk-import`: When uploading the CSV file.

4.  **Inspection Report Page (`/inspection/[id]/page.tsx`)**:
    *   Calls `GET /inspections/:id`: Renders the full report.
    *   Calls `POST /inspections/:id/review`: Action bar buttons.

---

## 3. Mobile App Integration (`hms-mobile`)

The Mobile App is focused on **Field Data Collection**.

### **Where APIs are Connected:**

1.  **Home Screen**:
    *   Calls `GET /assigned`: Shows "My Daily Tasks".
    *   Logic: Displays tasks as 🔴 PENDING or 🟢 COMPLETED based on response.

2.  **Inspection Screen**:
    *   Calls `GET /inspection-questions`: Loads checks like "Is floor clean?".
    *   Calls `POST /inspections/submit`: Sends GPS + Photos + Answers.
    *   **Validation**: Uses GPS to ensure user is near the toilet coordinates provided by `/assigned` response.

3.  **Register Asset Screen**:
    *   Calls `POST /register`: Allows field staff to map a new PT/CT found on ground.

---

## 4. Connection Logic (How it works)

**1. The Bridge (`ApiClient`)**
*   Both Web and Mobile use a centralized request handler (Axios).
*   **Base URL**: `http://<server-ip>:4000/api/v1`
*   **Interceptors**: Automatically attaches the User's Token to every request.

**2. Authentication Flow**
*   **Login**: User sends Credentials -> Backend returns `Token`.
*   **Storage**:
    *   Web: Stored in `localStorage`.
    *   Mobile: Stored in `SecureStore`.
*   **Request**:
    ```http
    GET /modules/toilet/assigned HTTP/1.1
    Authorization: Bearer <TOKEN>
    ```

**3. Error Handling**
*   If Token expires (401), the App/Web redirects to Login.
*   If Permission denied (403), shows "Access Denied".
