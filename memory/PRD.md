# Automotive Lubricant Stock Management - PRD

## Original Problem Statement
Build and deploy a complete Android mobile application for Automotive Lubricant Stock Management with:
- **Users & Roles:** Owner/Sales and Factory Manager with distinct permissions
- **Key Features:** Dashboards, stock management (sales, transfers, manufacturing, packing), item and recipe creation, return approval workflow
- **Data Safety:** Timestamped actions, no negative stock, prevent duplicate item names
- **Deployment:** A fully working Android app

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
- **Weekly Reports (Fixed Feb 24, 2026)**: Shows weekly summary with total entries, active users, active days; day-by-day breakdown; daily detail grouped by user with expandable transactions; print functionality

## Pending Issues
- P1: Stock data integrity verification (name + pack_size refactor needs full testing)
- P2: Manager UX - disable actions when prerequisites missing
- P-INFRA: Expo tunnel instability

## Bugs Fixed
- **Weekly Reports empty (Feb 24)**: `app.include_router` was called before report routes were defined
- **Edit Stock Manually not working on web (Feb 25)**: `Alert.alert()` with buttons doesn't work on web; replaced with `window.confirm()`/`window.alert()`

## Upcoming Tasks
- P0: Intermediate Goods Manufacturing (VI, VI Super workflow)
- P1: Backup/Deployment Documentation
- P1: Stable deployment (Render + APK)

## Future/Backlog
- P1: Low Stock Alerts
- P1: End-of-Day Summary
- P2: Fuzzy Name Matching for duplicate prevention

## Credentials
- Owner: owner@lubricant.com / owner123
- Manager: manager@lubricant.com / manager123
