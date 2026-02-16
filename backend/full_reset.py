import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime

# Direct MongoDB connection
mongo_url = "mongodb://localhost:27017"
db_name = "lubricant_stock"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

async def reset_and_initialize():
    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        print("🗑️  Dropping all collections...")
        collections = await db.list_collection_names()
        for coll in collections:
            await db[coll].drop()
            print(f"   Dropped: {coll}")
        
        print("\n✅ Database cleared!")
        print("\n🔧 Creating fresh data...")
        
        # Create users
        owner_user = {
            "id": str(uuid.uuid4()),
            "email": "owner@lubricant.com",
            "name": "Owner",
            "role": "owner",
            "hashed_password": get_password_hash("owner123"),
            "created_at": datetime.utcnow()
        }
        
        manager_user = {
            "id": str(uuid.uuid4()),
            "email": "manager@lubricant.com",
            "name": "Factory Manager",
            "role": "manager",
            "hashed_password": get_password_hash("manager123"),
            "created_at": datetime.utcnow()
        }
        
        await db.users.insert_many([owner_user, manager_user])
        print("✅ Created 2 users")
        
        # Create loose oils
        loose_oils = ["15W40", "20W50", "Thriller", "Thrive", "Super Pro", "Power 4T",
                     "5W30 Ultra", "5W30 Cruise", "2T", "Hydraulic Samrat", "Hydraulic Delvex",
                     "Gear Oil Supreme", "Gear Oil GL3", "Gear Oil GL4", "8W90", "Gear Oil 140",
                     "UTTO", "TQ", "10W30", "PSO"]
        
        loose_oil_docs = [{"id": str(uuid.uuid4()), "name": name, "stock_litres": 0.0, "created_at": datetime.utcnow()} for name in loose_oils]
        await db.loose_oils.insert_many(loose_oil_docs)
        print(f"✅ Created {len(loose_oils)} loose oils")
        
        # Create raw materials
        raw_materials = [
            {"id": str(uuid.uuid4()), "name": "Seiko", "unit": "litres", "stock": 0.0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "150", "unit": "litres", "stock": 0.0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Other", "unit": "litres", "stock": 0.0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "4T", "unit": "litres", "stock": 0.0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Gear Oil", "unit": "litres", "stock": 0.0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Hydraulic", "unit": "litres", "stock": 0.0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Synth", "unit": "litres", "stock": 0.0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "CH4", "unit": "litres", "stock": 0.0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "VI", "unit": "kg", "stock": 0.0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "PPD", "unit": "kg", "stock": 0.0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Dye", "unit": "kg", "stock": 0.0, "created_by": "System", "created_at": datetime.utcnow()},
        ]
        await db.raw_materials.insert_many(raw_materials)
        print(f"✅ Created {len(raw_materials)} raw materials")
        
        # Create packing materials
        packing_materials = [
            {"id": str(uuid.uuid4()), "name": "Thriller Pack 1L", "size_label": "1L", "stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Thrive Pack 1L", "size_label": "1L", "stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Power Grey 1L", "size_label": "1L", "stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Power Grey 5L", "size_label": "5L", "stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Autocraft 3.5L", "size_label": "3.5L", "stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Champion 3.5L Yellow", "size_label": "3.5L", "stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Champion 3.5L Red", "size_label": "3.5L", "stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Power 3.5L Red", "size_label": "3.5L", "stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Power 5L Grey", "size_label": "5L", "stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
        ]
        await db.packing_materials.insert_many(packing_materials)
        print(f"✅ Created {len(packing_materials)} packing materials")
        
        # Create sample finished products
        finished_products = [
            {"id": str(uuid.uuid4()), "name": "Thriller", "pack_size": "1L", "linked_loose_oil": "Thriller", "linked_packing_material": "Thriller Pack 1L", "factory_stock": 0, "car_stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Thrive", "pack_size": "1L", "linked_loose_oil": "Thrive", "linked_packing_material": "Thrive Pack 1L", "factory_stock": 0, "car_stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "name": "Power 4T Grey", "pack_size": "1L", "linked_loose_oil": "Power 4T", "linked_packing_material": "Power Grey 1L", "factory_stock": 0, "car_stock": 0, "created_by": "System", "created_at": datetime.utcnow()},
        ]
        await db.finished_products.insert_many(finished_products)
        print(f"✅ Created {len(finished_products)} finished products")
        
        print("\n✅ ✅ ✅ Database initialized successfully! ✅ ✅ ✅")
        print("\n📱 You can now login with:")
        print("   Owner: owner@lubricant.com / owner123")
        print("   Manager: manager@lubricant.com / manager123")
        
        client.close()
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import sys
    result = asyncio.run(reset_and_initialize())
    sys.exit(0 if result else 1)
