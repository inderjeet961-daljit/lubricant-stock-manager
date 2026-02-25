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
- **Weekly Reports (Fixed Feb 24, 2026)**: Shows weekly summary, day-by-day breakdown, daily detail grouped by user with expandable transactions, print functionality
- **Edit Stock Manually fix (Feb 25)**: Fixed web alert compatibility
- **Edit Finished Products (Feb 25)**: Owner can now edit name, pack_size, linked_loose_oil, linked_packing_material for finished products
- **Intermediate Goods System (Feb 25)**: Full system for manufacturing intermediate goods (VI, VI Super) from raw materials. Includes CRUD, recipe management, manufacturing by manager. Manufactured intermediate goods automatically become available as raw materials for loose oil recipes.

## DB Collections
- users, raw_materials, packing_materials, loose_oils, finished_products, recipes
- transactions (action log for reports)
- **intermediate_goods** (NEW: name, unit, stock, created_by)
- **intermediate_recipes** (NEW: intermediate_good_name, ingredients[{raw_material_name, quantity_per_unit}])

## Key Architecture Decisions
- Intermediate goods manufacturing adds stock to BOTH intermediate_goods AND raw_materials collections (for recipe compatibility)
- Loose oil manufacturing checks both raw_materials AND intermediate_goods for ingredient availability

## Pending Issues
- P1: Stock data integrity verification (name + pack_size refactor needs full testing)
- P2: Manager UX - disable actions when prerequisites missing
- P-INFRA: Expo tunnel instability

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
