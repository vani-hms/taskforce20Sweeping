# 🚀 Deployment Instructions: Adding Toilet Module

Since you are moving the code from your **local machine** to the **client's server/database**, follow these exact steps to ensure everything works perfectly.

---

## 🟢 Step 1: Update the Backend (Server)

Do this on the server where `hms-backend` is running.

### 1. Get the latest code
```bash
# Go to the backend folder
cd hms-backend

# Pull your latest changes
git pull origin main  # (Or whatever branch you pushed to)
```

### 2. Update Database Schema (CRITICAL)
Your local database has the new `Toilet` tables, but the server's database doesn't. You need to "migrate" it.
```bash
# This command adds the new tables (Toilet, ToiletInspection, etc.) to their postgres DB
npx prisma migrate deploy
```

### 3. Seed Initial Data (VERY IMPORTANT)
You need to add the "Cleanliness of Toilets" module and the "Inspection Questions" to their database.

**Command A: Register the Module**
This adds "TOILET" to the list of modules so permissions work.
```bash
npm run seed
```

**Command B: Enable for Existing Users (CRITICAL)**
Run this to give your existing City Admins and QCs access to the new module instantly.
```bash
npx ts-node scripts/enable-toilet-module.ts
```

**Command C: Add Inspection Questions**
This adds the 30+ questions (CT/PT) that appear in the Mobile App. **Without this, the app checklist will be empty.**
```bash
npx ts-node scripts/seed-toilet-inspection-questions.ts
```

### 📦 New Database Schema (Prisma)
**3 New Models Added:**
| Model | Description |
|-------|-------------|
| `Toilet` | Stores toilet locations (CT/PT), operator info, coordinates |
| `ToiletInspection` | Daily inspection records with QC review |
| `ToiletAssignment` | Employee-to-toilet assignment mapping |
| `ToiletInspectionQuestion` | Configurable inspection questionnaire |
**New Enums:**
- `ToiletType`: CT, PT
- `ToiletGender`: MALE, FEMALE, UNISEX, DISABLED
- `ToiletStatus`: PENDING, APPROVED, REJECTED
- `InspectionStatus`: SUBMITTED, APPROVED, REJECTED, ACTION_REQUIRED
---
### 🚀 How to Setup
```bash
cd hms-backend
npx prisma db push    # Apply schema changes
npx ts-node scripts/seed.ts  # Seed initial data (optional)





### 📦 New Database Schema (Prisma)
**3 New Models Added:**
| Model | Description |
|-------|-------------|
| `Toilet` | Stores toilet locations (CT/PT), operator info, coordinates |
| `ToiletInspection` | Daily inspection records with QC review |
| `ToiletAssignment` | Employee-to-toilet assignment mapping |
| `ToiletInspectionQuestion` | Configurable inspection questionnaire |
**New Enums:**
- `ToiletType`: CT, PT
- `ToiletGender`: MALE, FEMALE, UNISEX, DISABLED
- `ToiletStatus`: PENDING, APPROVED, REJECTED
- `InspectionStatus`: SUBMITTED, APPROVED, REJECTED, ACTION_REQUIRED
---
### 🚀 How to Setup
```bash
cd hms-backend
npx prisma db push    # Apply schema changes
npx ts-node scripts/seed.ts  # Seed initial data (optional)
Enable Module:

Login as City Admin
Go to Modules → Enable "Cleanliness of Toilets"
Assign employees to toilets
📁 Files Added/Modified
Backend:

hms-backend/prisma/schema.prisma
 - New models
hms-backend/src/modules/toilet/router.ts
 - API endpoints
Frontend:

hms-frontend/app/modules/toilet/* - Web portal pages
Mobile:

hms-mobile/src/modules/toilet/* - Mobile app screens


