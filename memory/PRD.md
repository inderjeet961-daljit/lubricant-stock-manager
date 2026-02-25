# Automotive Lubricant Stock Management - PRD

## Original Problem Statement
Build and deploy a complete Android mobile application for Automotive Lubricant Stock Management with:
- **Users & Roles:** Owner/Sales and Factory Manager with distinct permissions
- **Key Features:** Dashboards, stock management (sales, transfers, manufacturing, packing), item and recipe creation, return approval workflow
- **Data Safety:** Timestamped actions, no negative stock, prevent duplicate item names

## Tech Stack
- **Frontend**: React Native, Expo, Expo Router, TypeScript
- **Backend**: Python, FastAPI, Pydantic, Motor (async MongoDB)
- **Database**: MongoDB
- **Auth**: JWT (access_token)

## What's Been Implemented
- Full CRUD for all item types (raw materials, packing materials, loose oils, finished goods)
- Owner and Manager dashboards with role-based access
- Stock operations: manufacturing, packing, sales, transfers, returns
- Accurate oil deduction logic (fractional amounts based on pack size)
- Finished good identification by (name + pack_size) composite key
- Manager can add stock for raw materials and packing materials
- Web-compatible alerts (Platform.OS === 'web' pattern)
- Weekly Reports with day-by-day breakdown, print functionality
- Edit Finished Products (name, pack_size, linked oils/packing)
- Intermediate Goods System (VI, VI Super - manufactured from raw materials, usable in recipes)
- **Cartons tracking (Feb 25)**: Carton stock column on dashboard, manager can add cartons and record cartons during packing
- **Raw Materials display fix (Feb 25)**: Dashboard now shows ALL raw materials instead of hardcoded filtered list

## DB Collections
- users, raw_materials, packing_materials, loose_oils, finished_products (now with carton_stock), recipes
- transactions (action log for reports)
- intermediate_goods, intermediate_recipes

## Pending Issues
- P1: Stock data integrity verification (name + pack_size refactor needs full testing)
- P2: Manager UX - disable actions when prerequisites missing

## Upcoming Tasks
- P1: Backup/Deployment Documentation
- P1: Stable deployment (Render + APK)

## Future/Backlog
- P1: Low Stock Alerts
- P1: End-of-Day Summary
- P2: Fuzzy Name Matching for duplicate prevention

## Credentials
- Owner: owner@lubricant.com / owner123
- Manager: manager@lubricant.com / manager123
