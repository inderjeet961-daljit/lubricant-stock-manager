import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
sys.path.append('/app/backend')

# Direct MongoDB connection
mongo_url = "mongodb://localhost:27017"
db_name = "lubricant_stock"

async def reset_database():
    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        print("Dropping existing database...")
        await client.drop_database(db_name)
        
        print("Database dropped successfully!")
        print("\nNow visit the login page and click 'Initialize Database' button")
        
        client.close()
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(reset_database())
    sys.exit(0 if result else 1)
