# 🛢️ Automotive Lubricant Stock Management System

A comprehensive mobile application for managing automotive lubricant inventory with separate interfaces for Owner/Sales and Factory Manager roles.

## 📱 Overview

This is a full-stack mobile application built with Expo (React Native) and FastAPI, designed to manage stock for an automotive lubricant business. The system handles finished goods, loose oils, raw materials, and packing materials with role-based access control.

## ✨ Key Features

### For Owner/Sales
- ✅ **Unified Dashboard** - View all stock (Factory + Car) in organized blocks
- ✅ **Global Search** - Search across all inventory types
- ✅ **Stock Management**
  - Take stock from factory to car
  - Record sales (Car / Transport / Direct Dispatch)
  - Return items to factory (pending approval)
- ✅ **Item Creation** - Add new raw materials, packing materials, and finished products
- ✅ **Manufacturing Recipes** - Set and manage recipes for loose oils (must total 100%)
- ✅ **Admin Tools**
  - Edit stock manually
  - Reset all stock to zero
  - View transaction history

### For Factory Manager
- ✅ **Production Operations**
  - Add raw material stock
  - Manufacture loose oil (recipe-based with auto-deduction)
  - Pack finished goods (auto-deducts loose oil + packing)
  - Mark damaged packing materials
- ✅ **Returns Management**
  - Approve pending returns from sales
  - Choose action: Drain & Reuse OR Scrap
  - Stock updates only after approval

## 🏗️ Tech Stack

### Frontend
- **Expo** (React Native) - Mobile app framework
- **Expo Router** - File-based routing
- **TypeScript** - Type safety
- **Axios** - API communication
- **AsyncStorage** - Local data storage
- **React Context** - State management

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database
- **Motor** - Async MongoDB driver
- **Pydantic** - Data validation
- **JWT** - Authentication
- **Passlib** - Password hashing

## 📁 Project Structure

```
lubricant-stock-manager/
├── frontend/                 # Expo React Native app
│   ├── app/                 # Expo Router pages
│   │   ├── (auth)/         # Authentication screens
│   │   ├── (owner)/        # Owner/Sales screens
│   │   └── (manager)/      # Factory Manager screens
│   ├── components/         # Reusable components
│   ├── contexts/           # React Context (Auth)
│   ├── services/           # API service layer
│   ├── assets/             # Images, fonts, icons
│   ├── app.json            # Expo configuration
│   ├── eas.json            # EAS Build configuration
│   └── package.json        # Dependencies
│
├── backend/                 # FastAPI backend
│   ├── server.py           # Main API server
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Environment variables
│
├── APK_BUILD_GUIDE.md      # Complete APK build instructions
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.11 or higher)
- **MongoDB** (running instance)
- **Expo CLI** (for mobile development)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/inderjeet961-daljit/lubricant-stock-manager.git
cd lubricant-stock-manager
```

#### 2. Setup Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure .env file
# Update MONGO_URL with your MongoDB connection string

# Run backend server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend will be available at: `http://localhost:8001`

#### 3. Setup Frontend
```bash
cd frontend

# Install dependencies
npm install
# or
yarn install

# Update .env file
# Set EXPO_PUBLIC_BACKEND_URL=http://localhost:8001

# Start Expo development server
npx expo start
```

#### 4. Initialize Database
- Open the app on your device/emulator
- On login screen, click "Initialize Database"
- This creates default users and pre-populated data

## 🔐 Default Login Credentials

### Owner/Sales Account
- **Email:** `owner@lubricant.com`
- **Password:** `owner123`

### Factory Manager Account
- **Email:** `manager@lubricant.com`
- **Password:** `manager123`

⚠️ **Important:** Change these credentials in production!

## 📲 Building Android APK

### Using Expo EAS (Recommended)

```bash
cd frontend

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build --platform android --profile preview
```

You'll receive a download link for the APK (valid for 30 days).

For complete build instructions, see [APK_BUILD_GUIDE.md](./APK_BUILD_GUIDE.md)

## 🗄️ Pre-Populated Data

The app comes with:
- **20 Loose Oils** - 15W40, 20W50, Thriller, Thrive, Super Pro, Power 4T, etc.
- **11 Raw Materials** - Seiko, 150, Additives (4T, Gear Oil, Hydraulic, etc.)
- **9 Packing Materials** - Various bottle sizes (1L, 3.5L, 5L)
- **3 Sample Finished Products** - With proper oil-packing linkages

All stock quantities start at zero.

## 🔒 Business Rules

### Stock Management
- ✅ No negative stock allowed (validated on all operations)
- ✅ Owner cannot directly modify factory stock (must use defined actions)
- ✅ Manager cannot create new items (only owner can)

### Manufacturing
- ✅ Recipes must total exactly 100%
- ✅ Manufacturing blocked without recipe
- ✅ Auto-deducts raw materials based on recipe

### Packing
- ✅ Auto-deducts loose oil based on pack size
- ✅ Auto-deducts packing bottles
- ✅ Blocked if insufficient materials

### Returns
- ✅ Returns create pending approval (don't immediately affect stock)
- ✅ Manager must approve before stock changes
- ✅ Two options: Drain & Reuse (oil back to stock) OR Scrap (discard)

### Transactions
- ✅ All actions logged with timestamp and user
- ✅ 24-hour undo window for most actions
- ✅ Some critical actions cannot be undone (e.g., reset all stock)

## 📡 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user info

### Stock Endpoints
- `GET /api/stock/finished-products` - Get all finished products
- `GET /api/stock/loose-oils` - Get all loose oils
- `GET /api/stock/raw-materials` - Get all raw materials
- `GET /api/stock/packing-materials` - Get all packing materials
- `GET /api/stock/pending-returns` - Get pending returns
- `GET /api/search?query=` - Search across all stock

### Owner Actions
- `POST /api/owner/add-raw-material` - Add new raw material type
- `POST /api/owner/add-packing-material` - Add new packing type
- `POST /api/owner/add-finished-product` - Add new finished product
- `POST /api/owner/set-recipe` - Set manufacturing recipe
- `POST /api/owner/take-stock-in-car` - Move stock to car
- `POST /api/owner/record-sale` - Record sale
- `POST /api/owner/return-to-factory` - Create return
- `POST /api/owner/edit-stock` - Manually edit stock
- `POST /api/owner/reset-all-stock` - Reset all stock to zero

### Manager Actions
- `POST /api/manager/add-raw-material-stock` - Add raw material quantity
- `POST /api/manager/manufacture-loose-oil` - Manufacture oil
- `POST /api/manager/pack-finished-goods` - Pack products
- `POST /api/manager/approve-return` - Approve return
- `POST /api/manager/mark-damaged-packing` - Mark damaged bottles

### Transaction Management
- `GET /api/transactions/recent` - Get recent transactions
- `POST /api/transactions/undo` - Undo transaction

### Initialize
- `POST /api/init-data` - Initialize database with sample data

## 🎨 App Screenshots

(Add screenshots of your app here once deployed)

## 🐛 Troubleshooting

### Backend Issues
- **MongoDB connection failed:** Check MONGO_URL in backend/.env
- **Import errors:** Ensure all dependencies installed: `pip install -r requirements.txt`
- **Port already in use:** Change port in uvicorn command or kill process

### Frontend Issues
- **Can't connect to backend:** Update EXPO_PUBLIC_BACKEND_URL in frontend/.env
- **Metro bundler errors:** Clear cache: `npx expo start --clear`
- **Module not found:** Reinstall dependencies: `rm -rf node_modules && npm install`

### APK Build Issues
- **EAS build fails:** Check eas.json configuration
- **App crashes on install:** Check Android permissions in app.json
- **Login not working:** Verify backend URL is accessible from device

## 📄 Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=lubricant_stock
SECRET_KEY=your-secret-key-here
```

### Frontend (.env)
```env
EXPO_PUBLIC_BACKEND_URL=http://your-backend-url:8001
```

## 🔄 Future Enhancements

- [ ] Low stock alerts and notifications
- [ ] End-of-day summary reports
- [ ] Export data to Excel/PDF
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Barcode scanning for products
- [ ] Advanced analytics dashboard
- [ ] Multi-location support

## 🤝 Contributing

This is a private project. For support or questions, contact the project maintainer.

## 📝 License

This project is proprietary software. All rights reserved.

## 📞 Support

For technical support or questions:
- **Email:** [Your Email]
- **GitHub Issues:** [Create an issue](https://github.com/inderjeet961-daljit/lubricant-stock-manager/issues)

---

**Version:** 1.0.0  
**Last Updated:** February 2026  
**Developed by:** Emergent AI Platform

---

## 🙏 Acknowledgments

Built with ❤️ using:
- [Expo](https://expo.dev/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [MongoDB](https://www.mongodb.com/)
- [React Native](https://reactnative.dev/)
