# 🚀 Render.com Free Tier Deployment Guide
## Lubricant Stock Management System

---

## ⚡ What You're Getting:

✅ **Free hosting** forever
✅ **Permanent data storage**
✅ **Auto-wakes when accessed** (20-30 second delay if sleeping)
✅ **Your own URL** (lubricant-backend.onrender.com)
✅ **Independent from Emergent**

---

## 📋 **STEP 1: Set Up Free MongoDB Database**

### **1.1: Sign Up for MongoDB Atlas (Free)**

1. Go to: **https://www.mongodb.com/cloud/atlas/register**
2. Click **"Try Free"**
3. Sign up with:
   - Google account (easiest)
   - Or email/password
4. Click **"Create an account"**

### **1.2: Create Free Cluster**

1. After login, click **"Build a Database"**
2. Choose **"M0 FREE"** tier (the free one)
3. Provider: **AWS**
4. Region: Choose closest to you (e.g., Mumbai, Singapore)
5. Cluster Name: `lubricant-cluster`
6. Click **"Create Cluster"**

⏳ Wait 2-3 minutes for cluster creation

### **1.3: Create Database User**

1. You'll see: "Create a database user"
2. Username: `lubricant_admin`
3. Password: Click **"Autogenerate Secure Password"** → **Copy the password!**
4. Click **"Create User"**

**⚠️ IMPORTANT: Save this password!** You'll need it later.

### **1.4: Allow Network Access**

1. Click **"Add IP Address"**
2. Click **"Allow Access from Anywhere"** (for now)
3. IP: `0.0.0.0/0` (should auto-fill)
4. Click **"Add Entry"**
5. Click **"Finish and Close"**

### **1.5: Get Connection String**

1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Driver: **Python** / Version: **3.11 or later**
4. Copy the connection string (looks like):
   ```
   mongodb+srv://lubricant_admin:<password>@lubricant-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Replace `<password>`** with the password you copied earlier
6. **Save this complete connection string!**

Example:
```
mongodb+srv://lubricant_admin:Abc123XyZ@lubricant-cluster.abc123.mongodb.net/?retryWrites=true&w=majority
```

---

## 📋 **STEP 2: Sign Up for Render.com**

### **2.1: Create Render Account**

1. Go to: **https://render.com/register**
2. Sign up with:
   - **GitHub account** (recommended - easier deployment)
   - Or email/password
3. Verify your email if asked

### **2.2: Connect GitHub (If Using GitHub)**

1. After login, click **"New +"** → **"Web Service"**
2. Click **"Connect GitHub"**
3. Authorize Render to access GitHub
4. Select: **"Only select repositories"**
5. Choose: `lubricant-stock-manager`
6. Click **"Install"**

---

## 📋 **STEP 3: Deploy Backend API**

### **3.1: Create Backend Service**

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Select your repository: `lubricant-stock-manager`
3. Fill in:

**Basic Settings:**
- **Name:** `lubricant-backend`
- **Region:** Oregon (US West) - free tier
- **Branch:** `main`
- **Root Directory:** `backend`
- **Runtime:** `Python 3`
- **Build Command:**
  ```
  pip install -r requirements.txt
  ```
- **Start Command:**
  ```
  uvicorn server:app --host 0.0.0.0 --port $PORT
  ```

**Instance Type:**
- Select: **Free** (with limitations note)

### **3.2: Add Environment Variables**

Scroll down to **"Environment Variables"** and add:

**Variable 1:**
- **Key:** `MONGO_URL`
- **Value:** `[Your MongoDB connection string from Step 1.5]`

**Variable 2:**
- **Key:** `DB_NAME`
- **Value:** `lubricant_stock`

**Variable 3:**
- **Key:** `SECRET_KEY`
- **Value:** `your-super-secret-key-change-this-12345`

**Variable 4:**
- **Key:** `PYTHON_VERSION`
- **Value:** `3.11.0`

### **3.3: Deploy Backend**

1. Click **"Create Web Service"** at bottom
2. ⏳ **Wait 5-10 minutes** for deployment
3. Watch the logs for progress
4. When you see: **"Your service is live"** ✅
5. **Copy your backend URL** (looks like: `https://lubricant-backend.onrender.com`)

---

## 📋 **STEP 4: Deploy Frontend**

### **4.1: Create Frontend Service**

1. Click **"New +"** → **"Web Service"**
2. Select your repository: `lubricant-stock-manager`
3. Fill in:

**Basic Settings:**
- **Name:** `lubricant-frontend`
- **Region:** Oregon (US West)
- **Branch:** `main`
- **Root Directory:** `frontend`
- **Runtime:** `Node`
- **Build Command:**
  ```
  npm install && npx expo export:web
  ```
- **Start Command:**
  ```
  npx serve web-build -p $PORT
  ```

**Instance Type:**
- Select: **Free**

### **4.2: Add Environment Variables**

**Variable 1:**
- **Key:** `EXPO_PUBLIC_BACKEND_URL`
- **Value:** `[Your backend URL from Step 3.3]` (e.g., `https://lubricant-backend.onrender.com`)

**Variable 2:**
- **Key:** `NODE_VERSION`
- **Value:** `18`

### **4.3: Deploy Frontend**

1. Click **"Create Web Service"**
2. ⏳ **Wait 8-12 minutes** for build
3. Watch logs
4. When you see: **"Your service is live"** ✅
5. **Copy your frontend URL** (e.g., `https://lubricant-frontend.onrender.com`)

---

## 📋 **STEP 5: Initialize Database**

### **5.1: Open Your App**

1. Open the frontend URL in browser
2. You'll see the login screen
3. Click **"Initialize Database"** button
4. Wait for success message

### **5.2: Test Login**

**Owner Login:**
- Email: `owner@lubricant.com`
- Password: `owner123`

**Manager Login:**
- Email: `manager@lubricant.com`
- Password: `manager123`

---

## 🎉 **STEP 6: Share with Your 3 Devices**

### **Installation on Each Device:**

1. Open Chrome browser
2. Go to: **Your frontend URL** (e.g., `https://lubricant-frontend.onrender.com`)
3. Tap menu (⋮) → **"Add to Home screen"**
4. Name: **"Stock Manager"**
5. Login with appropriate credentials

---

## ⚡ **Understanding Free Tier Behavior**

### **How Auto-Sleep Works:**

**Scenario 1: First Access of the Day**
- Open app → **Waits 20-30 seconds** → Then works

**Scenario 2: Active Use**
- Someone uses app → Works instantly
- As long as used within 15 minutes → Stays awake
- No activity for 15 minutes → Goes to sleep

**Scenario 3: Multiple Users**
- If 3 devices use throughout the day
- App stays awake most of the time
- Only sleeps during breaks/overnight

### **Not an Issue Because:**
✅ Wakes **automatically** (no manual "wake up" button)
✅ After wake up, works perfectly
✅ During business hours with 3 users, rarely sleeps

---

## 🔧 **Important URLs to Save:**

**Backend API:**
```
https://lubricant-backend.onrender.com
```

**Frontend App:**
```
https://lubricant-frontend.onrender.com
```

**MongoDB Connection:**
```
[Your MongoDB connection string]
```

---

## 📝 **What to Tell Your Team:**

**For All 3 Devices:**

"Our stock management app is now live at:
**[Your frontend URL]**

Installation:
1. Open Chrome
2. Go to the URL
3. Tap menu → Add to Home screen
4. Login with the credentials I gave you

Note: First time you open it (or after long breaks), it might take 30 seconds to load. After that, it works instantly."

---

## 🆘 **Troubleshooting:**

**"Service Unavailable" Error:**
- Wait 30 seconds and refresh
- Server is waking up (this is normal)

**"Can't connect to backend":**
- Check if backend URL is correct in frontend environment variables
- Make sure backend service is running in Render dashboard

**"Database connection failed":**
- Check MongoDB connection string
- Make sure IP whitelist is set to 0.0.0.0/0

**Build Failed:**
- Check logs in Render dashboard
- Usually it's a missing dependency

---

## 💰 **Costs:**

✅ **Render Free Tier:** $0/month
✅ **MongoDB Atlas Free:** $0/month
✅ **Total:** **FREE** forever

**Limitations:**
- Backend sleeps after 15 min inactivity
- 750 hours/month (enough for your use)
- Slower startup (but works fine)

---

## ⬆️ **Want to Upgrade Later?**

If you want to remove sleep delays:

**Render Paid:** $7/month
- Always on, no sleep
- Faster performance
- Easy upgrade (one click)

---

## ✅ **Checklist:**

- [ ] MongoDB Atlas account created
- [ ] Database cluster created
- [ ] Database user created
- [ ] Connection string saved
- [ ] Render.com account created
- [ ] GitHub connected to Render
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] Database initialized
- [ ] Both logins tested (owner & manager)
- [ ] URLs shared with team
- [ ] App added to home screen on 3 devices

---

**Once completed, you have a fully independent, always-available stock management system!** 🎉

**Need help with any step? Let me know which step you're stuck on!**
