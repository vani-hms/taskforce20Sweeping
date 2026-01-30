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

### 4. Restart the Backend
To make the new APIs live:
```bash
# If using pm2 (recommended)
pm2 restart hms-backend

# OR if running manually
npm install  # Check for new dependencies
npm run build
npm start
```

---

## 🔵 Step 2: Update the Web Portal

Do this on the server where `hms-frontend` is hosted.

### 1. Get the latest code
```bash
cd hms-frontend
git pull origin main
```

### 2. Install & Build
```bash
npm install       # Install any new libraries
npm run build     # Compile the Next.js app
```

### 3. Restart the Frontend
```bash
# If using pm2
pm2 restart hms-frontend

# OR manually
npm start
```

---

## 🟠 Step 3: Update the Mobile App

Since the Mobile App logic hasn't changed much (just using the new APIs), you usually **don't** need to redeploy the `.apk` immediately unless you added new native libraries.

**However**, field employees must have the updated JS bundle.
1.  If you are using **Expo EAS Update**:
    ```bash
    eas update --branch production
    ```
2.  If you manually distribute APKs:
    *   Build a new APK and share it with the team.

---

## ✅ Checklist for Success
1.  [ ] Did `npx prisma migrate deploy` finish without errors?
2.  [ ] Did you run `npx ts-node scripts/seed-toilet-inspection-questions.ts`?
3.  [ ] Check the **Dashboard**: Do you see the "Cleanliness of Toilets" tab?
4.  [ ] Check the **App**: Can you open an inspection and see the questions?

If all "Yes", you are live! 🚀
