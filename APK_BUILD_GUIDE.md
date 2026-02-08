# 📱 APK Build & Distribution Guide
## Automotive Lubricant Stock Management App

---

## 🚀 STEP 1: Build the APK (One-Time Setup)

### Option A: Using Expo's Cloud Build (Recommended - Easiest)

**Requirements:**
- An Expo account (free to create)
- Internet connection

**Steps:**

1. **Install EAS CLI** (if not already installed)
```bash
npm install -g eas-cli
```

2. **Login to Expo**
```bash
cd /app/frontend
eas login
```
Enter your Expo credentials (or create account at expo.dev)

3. **Build the APK**
```bash
eas build --platform android --profile preview
```

**What happens:**
- ✅ Code is uploaded to Expo's servers
- ✅ APK is built in the cloud (takes 10-15 minutes)
- ✅ You get a download link when done
- ✅ **FREE** - Expo provides free builds for development

4. **Get Your Download Link**
After build completes, you'll see:
```
✔ Build finished

🎉 APK: https://expo.dev/artifacts/eas/xxxxx.apk

Download link expires in 30 days
```

**Save this link!** This is what you'll share with your 3 devices.

---

### Option B: Local Build (For Advanced Users)

If you prefer building locally without cloud service:

```bash
cd /app/frontend
npx expo run:android --variant release
```

The APK will be created at:
`/app/frontend/android/app/build/outputs/apk/release/app-release.apk`

---

## 📲 STEP 2: Share Installation Instructions

### Create a shareable document with:

---

# 📱 Lubricant Stock Manager - Installation

## Download & Install

1. **Download APK**
   - Click this link on your Android phone:
   ```
   [PASTE YOUR APK LINK HERE]
   ```
   
2. **Enable Installation**
   - When prompted "Install blocked", tap **Settings**
   - Enable **"Install unknown apps"** for your browser
   - Go back and tap **Install**

3. **Open the App**
   - Tap **Open** after installation
   - Grant any requested permissions

---

## 🔐 Login Credentials

### Owner/Sales Account
- **Email:** `owner@lubricant.com`
- **Password:** `owner123`

**Can do:**
- View all stock (Factory + Car)
- Take stock in car
- Record sales (Car/Transport/Direct)
- Return items to factory
- Add new products & materials
- Set manufacturing recipes
- Edit stock manually
- Reset all stock

---

### Factory Manager Account
- **Email:** `manager@lubricant.com`
- **Password:** `manager123`

**Can do:**
- Add raw materials
- Manufacture loose oil (recipe-based)
- Pack finished goods
- Approve returns (Drain & Reuse / Scrap)
- Mark damaged packing

---

## 📋 Pre-Loaded Data

The app comes with:
- ✅ 20 Loose Oils (15W40, 20W50, Thriller, etc.)
- ✅ 11 Raw Materials (Seiko, 150, Additives, etc.)
- ✅ 9 Packing Materials (1L, 3.5L, 5L bottles)
- ✅ 3 Sample Finished Products

**Note:** All stock quantities start at ZERO. Use "Add Raw Material Stock" and "Pack Finished Goods" to build inventory.

---

## 🔧 Troubleshooting

### "Can't download APK"
- Use Chrome or Firefox browser
- Check internet connection
- Try downloading on WiFi

### "Install blocked" / "Unknown source"
1. Go to **Settings** → **Security**
2. Enable **"Install unknown apps"**
3. Allow installation from your browser
4. Try installing again

### "App keeps crashing"
1. Uninstall the app
2. Restart your phone
3. Download and install fresh APK
4. Clear app cache: Settings → Apps → Lubricant Stock Manager → Clear Cache

### "Can't login"
- Check internet connection (required for login)
- Verify you're using correct email and password
- Check if backend server is running

### "Stock not updating"
- Pull down to refresh the screen
- Logout and login again
- Check internet connection

---

## 📱 App Features Quick Guide

### For Owners:

**Dashboard Tab:**
- View all stock in 4 blocks
- Search across all inventory
- Pull to refresh

**Actions Tab:**
- Take Stock in Car (Factory → Car)
- Record Sales (3 types)
- Return to Factory (creates pending approval)

**Add Items Tab:**
- Add new raw materials
- Add new packing materials
- Add new finished products (link oil + packing)

**Recipes Tab:**
- Set manufacturing recipes (must total 100%)
- View existing recipes

**Profile Tab:**
- Edit stock manually
- Reset all stock to zero
- Logout

---

### For Managers:

**Dashboard Tab:**
- View factory stock overview
- See pending returns alerts

**Actions Tab:**
- Add Raw Material Stock
- Manufacture Loose Oil (uses recipes)
- Pack Finished Goods (creates bottles)
- Mark Damaged Packing

**Returns Tab:**
- Approve pending returns
- Choose: Drain & Reuse OR Scrap

**Profile Tab:**
- Logout

---

## ⚠️ Important Notes

1. **Internet Required:**
   - For login and data sync
   - App checks server in real-time
   - No offline mode

2. **Data Sync:**
   - Changes reflect after pull-to-refresh
   - Not instant, may take a few seconds

3. **Transactions:**
   - All actions are logged
   - Can be undone within 24 hours (from transactions)

4. **Stock Rules:**
   - Cannot go negative
   - Manufacturing requires recipes
   - Packing requires loose oil + bottles
   - Returns need manager approval

---

## 📞 Support Contact

**For technical issues or questions:**
- Email: [YOUR EMAIL]
- Phone: [YOUR PHONE]

**Backend Server:**
- URL: `https://fleet-lubricant-hub.preview.emergentagent.com`
- Status: Check if you can access the URL in browser

---

## 🔄 Updating the App

When a new version is released:

1. Download new APK link
2. Install over existing app (keeps your data)
3. OR: Uninstall old app → Install new version

**Data Note:** 
- Login credentials remain same
- Stock data is on server (not lost on reinstall)
- Just login again after installing update

---

## 📊 System Requirements

- **Android Version:** 5.0 (Lollipop) or higher
- **Storage:** 50MB free space
- **RAM:** 1GB minimum
- **Internet:** Required for operation

---

## ✅ Installation Checklist

- [ ] Downloaded APK file
- [ ] Enabled "Install unknown apps"
- [ ] Installed app successfully
- [ ] App opens without crashes
- [ ] Can login with provided credentials
- [ ] Dashboard loads correctly
- [ ] Can perform basic actions (add stock, etc.)

---

**Version:** 1.0.0  
**Last Updated:** February 2026  
**Package Name:** com.lubricant.stockmanager

---
