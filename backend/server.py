from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from bson import ObjectId
import uuid


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== PYDANTIC MODELS ====================

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


# User Models
class UserBase(BaseModel):
    email: str
    name: str
    role: Literal["owner", "manager"]  # owner = Owner/Sales, manager = Factory Manager


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: User


class LoginRequest(BaseModel):
    email: str
    password: str


# Stock Models
class FinishedProduct(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    pack_size: str
    linked_loose_oil: str  # loose oil name
    linked_packing_material: str  # packing material name
    factory_stock: int = 0
    car_stock: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str


class LooseOil(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    stock_litres: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RawMaterial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    unit: Literal["litres", "kg"]
    stock: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str


class PackingMaterial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    size_label: Optional[str] = None
    stock: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str


# Recipe Model
class RecipeIngredient(BaseModel):
    raw_material_name: str
    percentage: float  # percentage or litres per 100L


class ManufacturingRecipe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    loose_oil_name: str
    ingredients: List[RecipeIngredient]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str


# Return Model
class PendingReturn(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_name: str
    quantity: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    status: Literal["pending", "approved", "rejected"] = "pending"


# Transaction Model (for undo)
class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "take_stock_car", "sale_car", "sale_transport", etc.
    user_id: str
    user_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any]  # Store all relevant data
    can_undo: bool = True


# Request Models
class AddRawMaterialRequest(BaseModel):
    name: str
    unit: Literal["litres", "kg"]


class AddRawMaterialStockRequest(BaseModel):
    raw_material_name: str
    quantity: float


class AddPackingMaterialStockRequest(BaseModel):
    packing_material_name: str
    quantity: int


class AddPackingMaterialRequest(BaseModel):
    name: str
    size_label: Optional[str] = None


class AddFinishedProductRequest(BaseModel):
    name: str
    pack_size: str
    linked_loose_oil: str
    linked_packing_material: str


class SetRecipeRequest(BaseModel):
    loose_oil_name: str
    ingredients: List[RecipeIngredient]


class ManufactureRequest(BaseModel):
    loose_oil_name: str
    quantity_litres: float


class PackFinishedGoodsRequest(BaseModel):
    product_name: str
    pack_size: str
    quantity: int


class TakeStockInCarRequest(BaseModel):
    product_name: str
    pack_size: str
    quantity: int


class RecordSaleRequest(BaseModel):
    product_name: str
    pack_size: str
    quantity: int
    sale_type: Literal["car", "transport", "direct_dispatch"]


class ReturnToFactoryRequest(BaseModel):
    product_name: str
    pack_size: str
    quantity: int


class ApproveReturnRequest(BaseModel):
    return_id: str
    action: Literal["drain_reuse", "scrap"]


class MarkDamagedPackingRequest(BaseModel):
    packing_name: str
    quantity: int
    reason: str


class UndoTransactionRequest(BaseModel):
    transaction_id: str
    reason: str


class EditFinishedProductRequest(BaseModel):
    name: str
    pack_size: str
    new_name: Optional[str] = None
    new_pack_size: Optional[str] = None
    new_linked_loose_oil: Optional[str] = None
    new_linked_packing_material: Optional[str] = None


# Intermediate Goods Models
class IntermediateGood(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    unit: Literal["litres", "kg"] = "litres"
    stock: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str


class IntermediateRecipeIngredient(BaseModel):
    raw_material_name: str
    quantity_per_unit: float  # how much raw material per 1 unit of intermediate good


class IntermediateRecipe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    intermediate_good_name: str
    ingredients: List[IntermediateRecipeIngredient]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str


class AddIntermediateGoodRequest(BaseModel):
    name: str
    unit: Literal["litres", "kg"] = "litres"


class SetIntermediateRecipeRequest(BaseModel):
    intermediate_good_name: str
    ingredients: List[IntermediateRecipeIngredient]


class ManufactureIntermediateRequest(BaseModel):
    intermediate_good_name: str
    quantity: float


# ==================== AUTHENTICATION ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user_doc = await db.users.find_one({"id": user_id})
    if user_doc is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)


# ==================== API ENDPOINTS ====================

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    
    user_doc = user.dict()
    user_doc["hashed_password"] = hashed_password
    
    await db.users.insert_one(user_doc)
    return user


@api_router.post("/auth/login", response_model=Token)
async def login(login_data: LoginRequest):
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc or not verify_password(login_data.password, user_doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user_doc["id"]})
    user = User(**user_doc)
    
    return Token(access_token=access_token, token_type="bearer", user=user)


@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ==================== STOCK ENDPOINTS ====================

@api_router.get("/stock/finished-products", response_model=List[FinishedProduct])
async def get_finished_products(current_user: User = Depends(get_current_user)):
    products = await db.finished_products.find().to_list(1000)
    return [FinishedProduct(**p) for p in products]


@api_router.get("/stock/loose-oils", response_model=List[LooseOil])
async def get_loose_oils(current_user: User = Depends(get_current_user)):
    oils = await db.loose_oils.find().to_list(1000)
    return [LooseOil(**o) for o in oils]


@api_router.get("/stock/raw-materials", response_model=List[RawMaterial])
async def get_raw_materials(current_user: User = Depends(get_current_user)):
    materials = await db.raw_materials.find().to_list(1000)
    return [RawMaterial(**m) for m in materials]


@api_router.get("/stock/packing-materials", response_model=List[PackingMaterial])
async def get_packing_materials(current_user: User = Depends(get_current_user)):
    materials = await db.packing_materials.find().to_list(1000)
    return [PackingMaterial(**m) for m in materials]


@api_router.get("/stock/pending-returns", response_model=List[PendingReturn])
async def get_pending_returns(current_user: User = Depends(get_current_user)):
    returns = await db.pending_returns.find({"status": "pending"}).to_list(1000)
    return [PendingReturn(**r) for r in returns]


# ==================== OWNER/SALES ACTIONS ====================

@api_router.post("/owner/add-raw-material")
async def add_raw_material(data: AddRawMaterialRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can add new raw materials")
    
    # Check for duplicates
    existing = await db.raw_materials.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Raw material already exists")
    
    material = RawMaterial(
        name=data.name,
        unit=data.unit,
        created_by=current_user.name
    )
    
    await db.raw_materials.insert_one(material.dict())
    return {"message": "Raw material added successfully", "material": material}


# Edit Raw Material Request
class EditRawMaterialRequest(BaseModel):
    name: str
    new_name: Optional[str] = None
    new_unit: Optional[Literal["litres", "kg"]] = None


@api_router.put("/owner/edit-raw-material")
async def edit_raw_material(data: EditRawMaterialRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can edit raw materials")
    
    try:
        # Find the raw material
        material = await db.raw_materials.find_one({"name": data.name})
        if not material:
            raise HTTPException(status_code=404, detail=f"Raw material '{data.name}' not found")
        
        update_data = {}
        if data.new_name and data.new_name != data.name:
            # Check for duplicate name
            existing = await db.raw_materials.find_one({"name": data.new_name})
            if existing:
                raise HTTPException(status_code=400, detail=f"Raw material '{data.new_name}' already exists")
            update_data["name"] = data.new_name
            
            # Update recipes that reference this raw material
            await db.recipes.update_many(
                {"ingredients.raw_material_name": data.name},
                {"$set": {"ingredients.$[elem].raw_material_name": data.new_name}},
                array_filters=[{"elem.raw_material_name": data.name}]
            )
        
        if data.new_unit:
            update_data["unit"] = data.new_unit
        
        if update_data:
            await db.raw_materials.update_one(
                {"name": data.name},
                {"$set": update_data}
            )
            
            # Log transaction
            transaction = Transaction(
                type="edit_raw_material",
                user_id=current_user.id,
                user_name=current_user.name,
                data={
                    "original_name": data.name,
                    "updates": update_data
                }
            )
            await db.transactions.insert_one(transaction.dict())
            
            logger.info(f"Raw material '{data.name}' updated by {current_user.name}")
            return {"message": f"Raw material updated successfully"}
        
        return {"message": "No changes to update"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error editing raw material: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to edit raw material: {str(e)}")


@api_router.delete("/owner/delete-raw-material/{name}")
async def delete_raw_material(name: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can delete raw materials")
    
    try:
        # Find the raw material
        material = await db.raw_materials.find_one({"name": name})
        if not material:
            raise HTTPException(status_code=404, detail=f"Raw material '{name}' not found")
        
        # Check if used in any recipes
        recipe_using = await db.recipes.find_one({"ingredients.raw_material_name": name})
        if recipe_using:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete '{name}' - it's used in recipe for '{recipe_using['loose_oil_name']}'. Please remove it from recipes first."
            )
        
        # Delete the raw material
        await db.raw_materials.delete_one({"name": name})
        
        # Log transaction
        transaction = Transaction(
            type="delete_raw_material",
            user_id=current_user.id,
            user_name=current_user.name,
            data={
                "deleted_name": name,
                "deleted_unit": material.get("unit"),
                "deleted_stock": material.get("stock")
            },
            can_undo=False
        )
        await db.transactions.insert_one(transaction.dict())
        
        logger.info(f"Raw material '{name}' deleted by {current_user.name}")
        return {"message": f"Raw material '{name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting raw material: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete raw material: {str(e)}")


# ==================== PACKING MATERIAL EDIT/DELETE ====================

class EditPackingMaterialRequest(BaseModel):
    name: str
    new_name: Optional[str] = None
    new_size_label: Optional[str] = None


@api_router.put("/owner/edit-packing-material")
async def edit_packing_material(data: EditPackingMaterialRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can edit packing materials")
    
    try:
        material = await db.packing_materials.find_one({"name": data.name})
        if not material:
            raise HTTPException(status_code=404, detail=f"Packing material '{data.name}' not found")
        
        update_data = {}
        if data.new_name and data.new_name != data.name:
            existing = await db.packing_materials.find_one({"name": data.new_name})
            if existing:
                raise HTTPException(status_code=400, detail=f"Packing material '{data.new_name}' already exists")
            update_data["name"] = data.new_name
            
            # Update finished products that reference this packing material
            await db.finished_products.update_many(
                {"linked_packing_material": data.name},
                {"$set": {"linked_packing_material": data.new_name}}
            )
        
        if data.new_size_label is not None:
            update_data["size_label"] = data.new_size_label
        
        if update_data:
            await db.packing_materials.update_one({"name": data.name}, {"$set": update_data})
            
            transaction = Transaction(
                type="edit_packing_material",
                user_id=current_user.id,
                user_name=current_user.name,
                data={"original_name": data.name, "updates": update_data}
            )
            await db.transactions.insert_one(transaction.dict())
            
            logger.info(f"Packing material '{data.name}' updated by {current_user.name}")
            return {"message": "Packing material updated successfully"}
        
        return {"message": "No changes to update"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error editing packing material: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to edit packing material: {str(e)}")


@api_router.delete("/owner/delete-packing-material/{name}")
async def delete_packing_material(name: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can delete packing materials")
    
    try:
        material = await db.packing_materials.find_one({"name": name})
        if not material:
            raise HTTPException(status_code=404, detail=f"Packing material '{name}' not found")
        
        # Check if used in any finished products
        product_using = await db.finished_products.find_one({"linked_packing_material": name})
        if product_using:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete '{name}' - it's used by finished product '{product_using['name']}'. Remove the product first."
            )
        
        await db.packing_materials.delete_one({"name": name})
        
        transaction = Transaction(
            type="delete_packing_material",
            user_id=current_user.id,
            user_name=current_user.name,
            data={"deleted_name": name, "deleted_size_label": material.get("size_label"), "deleted_stock": material.get("stock")},
            can_undo=False
        )
        await db.transactions.insert_one(transaction.dict())
        
        logger.info(f"Packing material '{name}' deleted by {current_user.name}")
        return {"message": f"Packing material '{name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting packing material: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete packing material: {str(e)}")


# ==================== LOOSE OIL EDIT/DELETE ====================

class EditLooseOilRequest(BaseModel):
    name: str
    new_name: Optional[str] = None


@api_router.put("/owner/edit-loose-oil")
async def edit_loose_oil(data: EditLooseOilRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can edit loose oils")
    
    try:
        oil = await db.loose_oils.find_one({"name": data.name})
        if not oil:
            raise HTTPException(status_code=404, detail=f"Loose oil '{data.name}' not found")
        
        if data.new_name and data.new_name != data.name:
            existing = await db.loose_oils.find_one({"name": data.new_name})
            if existing:
                raise HTTPException(status_code=400, detail=f"Loose oil '{data.new_name}' already exists")
            
            # Update references
            await db.loose_oils.update_one({"name": data.name}, {"$set": {"name": data.new_name}})
            await db.recipes.update_many({"loose_oil_name": data.name}, {"$set": {"loose_oil_name": data.new_name}})
            await db.finished_products.update_many({"linked_loose_oil": data.name}, {"$set": {"linked_loose_oil": data.new_name}})
            
            transaction = Transaction(
                type="edit_loose_oil",
                user_id=current_user.id,
                user_name=current_user.name,
                data={"original_name": data.name, "new_name": data.new_name}
            )
            await db.transactions.insert_one(transaction.dict())
            
            logger.info(f"Loose oil '{data.name}' renamed to '{data.new_name}' by {current_user.name}")
            return {"message": f"Loose oil renamed to '{data.new_name}' successfully"}
        
        return {"message": "No changes to update"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error editing loose oil: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to edit loose oil: {str(e)}")


@api_router.delete("/owner/delete-loose-oil/{name}")
async def delete_loose_oil(name: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can delete loose oils")
    
    try:
        oil = await db.loose_oils.find_one({"name": name})
        if not oil:
            raise HTTPException(status_code=404, detail=f"Loose oil '{name}' not found")
        
        # Check if used in recipes
        recipe_using = await db.recipes.find_one({"loose_oil_name": name})
        if recipe_using:
            raise HTTPException(status_code=400, detail=f"Cannot delete '{name}' - it has a recipe. Delete the recipe first.")
        
        # Check if used in finished products
        product_using = await db.finished_products.find_one({"linked_loose_oil": name})
        if product_using:
            raise HTTPException(status_code=400, detail=f"Cannot delete '{name}' - it's used by product '{product_using['name']}'. Remove the product first.")
        
        await db.loose_oils.delete_one({"name": name})
        
        transaction = Transaction(
            type="delete_loose_oil",
            user_id=current_user.id,
            user_name=current_user.name,
            data={"deleted_name": name, "deleted_stock": oil.get("stock_litres")},
            can_undo=False
        )
        await db.transactions.insert_one(transaction.dict())
        
        logger.info(f"Loose oil '{name}' deleted by {current_user.name}")
        return {"message": f"Loose oil '{name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting loose oil: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete loose oil: {str(e)}")


# ==================== ADD LOOSE OIL ====================

class AddLooseOilRequest(BaseModel):
    name: str


@api_router.post("/owner/add-loose-oil")
async def add_loose_oil(data: AddLooseOilRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can add loose oils")
    
    try:
        existing = await db.loose_oils.find_one({"name": data.name})
        if existing:
            raise HTTPException(status_code=400, detail=f"Loose oil '{data.name}' already exists")
        
        oil = LooseOil(name=data.name)
        await db.loose_oils.insert_one(oil.dict())
        
        transaction = Transaction(
            type="add_loose_oil",
            user_id=current_user.id,
            user_name=current_user.name,
            data={"name": data.name}
        )
        await db.transactions.insert_one(transaction.dict())
        
        logger.info(f"Loose oil '{data.name}' added by {current_user.name}")
        return {"message": f"Loose oil '{data.name}' added successfully", "oil": oil}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding loose oil: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add loose oil: {str(e)}")


@api_router.post("/owner/add-packing-material")
async def add_packing_material(data: AddPackingMaterialRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can add new packing materials")
    
    # Check for duplicates
    existing = await db.packing_materials.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Packing material already exists")
    
    material = PackingMaterial(
        name=data.name,
        size_label=data.size_label,
        created_by=current_user.name
    )
    
    await db.packing_materials.insert_one(material.dict())
    return {"message": "Packing material added successfully", "material": material}


@api_router.post("/owner/add-finished-product")
async def add_finished_product(data: AddFinishedProductRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can add new finished products")
    
    try:
        # Validate input
        if not data.name or not data.name.strip():
            raise HTTPException(status_code=400, detail="Product name is required")
        if not data.pack_size or not data.pack_size.strip():
            raise HTTPException(status_code=400, detail="Pack size is required (e.g., 1L, 3.5L)")
        if not data.linked_loose_oil:
            raise HTTPException(status_code=400, detail="Please select a loose oil")
        if not data.linked_packing_material:
            raise HTTPException(status_code=400, detail="Please select a packing material")
        
        # Check if loose oil and packing exist
        loose_oil = await db.loose_oils.find_one({"name": data.linked_loose_oil})
        packing = await db.packing_materials.find_one({"name": data.linked_packing_material})
        
        if not loose_oil:
            raise HTTPException(status_code=400, detail=f"Loose oil '{data.linked_loose_oil}' not found. Please add it first.")
        if not packing:
            raise HTTPException(status_code=400, detail=f"Packing material '{data.linked_packing_material}' not found. Please add it first.")
        
        # Check for duplicates
        existing = await db.finished_products.find_one({"name": data.name, "pack_size": data.pack_size})
        if existing:
            raise HTTPException(status_code=400, detail=f"Product '{data.name}' with pack size '{data.pack_size}' already exists")
        
        product = FinishedProduct(
            name=data.name.strip(),
            pack_size=data.pack_size.strip(),
            linked_loose_oil=data.linked_loose_oil,
            linked_packing_material=data.linked_packing_material,
            created_by=current_user.name
        )
        
        await db.finished_products.insert_one(product.dict())
        logger.info(f"Finished product '{data.name}' ({data.pack_size}) added by {current_user.name}")
        return {"message": f"Finished product '{data.name}' ({data.pack_size}) added successfully", "product": product}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding finished product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add finished product: {str(e)}")


@api_router.delete("/owner/delete-finished-product")
async def delete_finished_product(name: str, pack_size: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can delete finished products")
    
    try:
        product = await db.finished_products.find_one({"name": name, "pack_size": pack_size})
        if not product:
            raise HTTPException(status_code=404, detail=f"Finished product '{name}' ({pack_size}) not found")
        
        # Check if there are pending returns for this product
        pending_return = await db.pending_returns.find_one({"product_name": name, "status": "pending"})
        if pending_return:
            raise HTTPException(status_code=400, detail=f"Cannot delete '{name}' - there are pending returns. Approve them first.")
        
        await db.finished_products.delete_one({"name": name, "pack_size": pack_size})
        
        transaction = Transaction(
            type="delete_finished_product",
            user_id=current_user.id,
            user_name=current_user.name,
            data={
                "deleted_name": name,
                "deleted_pack_size": pack_size,
                "deleted_factory_stock": product.get("factory_stock"),
                "deleted_car_stock": product.get("car_stock")
            },
            can_undo=False
        )
        await db.transactions.insert_one(transaction.dict())
        
        logger.info(f"Finished product '{name}' ({pack_size}) deleted by {current_user.name}")
        return {"message": f"Finished product '{name}' ({pack_size}) deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting finished product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete finished product: {str(e)}")


@api_router.put("/owner/edit-finished-product")
async def edit_finished_product(data: EditFinishedProductRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can edit finished products")
    
    try:
        product = await db.finished_products.find_one({"name": data.name, "pack_size": data.pack_size})
        if not product:
            raise HTTPException(status_code=404, detail=f"Finished product '{data.name}' ({data.pack_size}) not found")
        
        update_fields = {}
        new_name = data.new_name or data.name
        new_pack_size = data.new_pack_size or data.pack_size
        
        # Check for duplicate if name or pack_size changing
        if new_name != data.name or new_pack_size != data.pack_size:
            existing = await db.finished_products.find_one({"name": new_name, "pack_size": new_pack_size})
            if existing:
                raise HTTPException(status_code=400, detail=f"Finished product '{new_name}' ({new_pack_size}) already exists")
        
        if data.new_name:
            update_fields["name"] = data.new_name
        if data.new_pack_size:
            update_fields["pack_size"] = data.new_pack_size
        if data.new_linked_loose_oil:
            oil = await db.loose_oils.find_one({"name": data.new_linked_loose_oil})
            if not oil:
                raise HTTPException(status_code=400, detail=f"Loose oil '{data.new_linked_loose_oil}' not found")
            update_fields["linked_loose_oil"] = data.new_linked_loose_oil
        if data.new_linked_packing_material:
            pack = await db.packing_materials.find_one({"name": data.new_linked_packing_material})
            if not pack:
                raise HTTPException(status_code=400, detail=f"Packing material '{data.new_linked_packing_material}' not found")
            update_fields["linked_packing_material"] = data.new_linked_packing_material
        
        if not update_fields:
            return {"message": "No changes to apply"}
        
        await db.finished_products.update_one(
            {"name": data.name, "pack_size": data.pack_size},
            {"$set": update_fields}
        )
        
        transaction = Transaction(
            type="edit_finished_product",
            user_id=current_user.id,
            user_name=current_user.name,
            data={"original_name": data.name, "original_pack_size": data.pack_size, "changes": update_fields}
        )
        await db.transactions.insert_one(transaction.dict())
        
        logger.info(f"Finished product '{data.name}' ({data.pack_size}) edited by {current_user.name}")
        return {"message": f"Finished product updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error editing finished product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to edit finished product: {str(e)}")


# ==================== INTERMEDIATE GOODS ====================

@api_router.get("/stock/intermediate-goods", response_model=List[IntermediateGood])
async def get_intermediate_goods(current_user: User = Depends(get_current_user)):
    goods = await db.intermediate_goods.find({}, {"_id": 0}).to_list(1000)
    return [IntermediateGood(**g) for g in goods]


@api_router.post("/owner/add-intermediate-good")
async def add_intermediate_good(data: AddIntermediateGoodRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can add intermediate goods")
    
    existing = await db.intermediate_goods.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail=f"Intermediate good '{data.name}' already exists")
    
    good = IntermediateGood(name=data.name, unit=data.unit, created_by=current_user.id)
    await db.intermediate_goods.insert_one(good.dict())
    
    transaction = Transaction(
        type="add_intermediate_good",
        user_id=current_user.id,
        user_name=current_user.name,
        data={"name": data.name, "unit": data.unit}
    )
    await db.transactions.insert_one(transaction.dict())
    
    logger.info(f"Intermediate good '{data.name}' added by {current_user.name}")
    return {"message": f"Intermediate good '{data.name}' added successfully"}


@api_router.delete("/owner/delete-intermediate-good/{name}")
async def delete_intermediate_good(name: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can delete intermediate goods")
    
    good = await db.intermediate_goods.find_one({"name": name})
    if not good:
        raise HTTPException(status_code=404, detail=f"Intermediate good '{name}' not found")
    
    # Check if used in any loose oil recipe
    recipe_using = await db.recipes.find_one({"ingredients.raw_material_name": name})
    if recipe_using:
        raise HTTPException(status_code=400, detail=f"Cannot delete '{name}' - it's used in recipe for '{recipe_using['loose_oil_name']}'. Remove it from recipes first.")
    
    await db.intermediate_goods.delete_one({"name": name})
    await db.intermediate_recipes.delete_many({"intermediate_good_name": name})
    
    transaction = Transaction(
        type="delete_intermediate_good",
        user_id=current_user.id,
        user_name=current_user.name,
        data={"name": name}
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": f"Intermediate good '{name}' deleted successfully"}


@api_router.post("/owner/set-intermediate-recipe")
async def set_intermediate_recipe(data: SetIntermediateRecipeRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can set recipes")
    
    good = await db.intermediate_goods.find_one({"name": data.intermediate_good_name})
    if not good:
        raise HTTPException(status_code=404, detail=f"Intermediate good '{data.intermediate_good_name}' not found")
    
    # Validate raw materials exist
    for ingredient in data.ingredients:
        mat = await db.raw_materials.find_one({"name": ingredient.raw_material_name})
        if not mat:
            raise HTTPException(status_code=400, detail=f"Raw material '{ingredient.raw_material_name}' not found")
    
    # Upsert recipe
    existing = await db.intermediate_recipes.find_one({"intermediate_good_name": data.intermediate_good_name})
    if existing:
        await db.intermediate_recipes.update_one(
            {"intermediate_good_name": data.intermediate_good_name},
            {"$set": {
                "ingredients": [i.dict() for i in data.ingredients],
                "updated_at": datetime.utcnow()
            }}
        )
    else:
        recipe = IntermediateRecipe(
            intermediate_good_name=data.intermediate_good_name,
            ingredients=data.ingredients,
            created_by=current_user.id
        )
        await db.intermediate_recipes.insert_one(recipe.dict())
    
    transaction = Transaction(
        type="set_intermediate_recipe",
        user_id=current_user.id,
        user_name=current_user.name,
        data={"intermediate_good_name": data.intermediate_good_name, "ingredients": [i.dict() for i in data.ingredients]}
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": f"Recipe for '{data.intermediate_good_name}' saved successfully"}


@api_router.get("/intermediate-recipes")
async def get_intermediate_recipes(current_user: User = Depends(get_current_user)):
    recipes = await db.intermediate_recipes.find({}, {"_id": 0}).to_list(100)
    return recipes


@api_router.post("/manager/manufacture-intermediate-good")
async def manufacture_intermediate_good(data: ManufactureIntermediateRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Only manager can manufacture intermediate goods")
    
    good = await db.intermediate_goods.find_one({"name": data.intermediate_good_name})
    if not good:
        raise HTTPException(status_code=404, detail=f"Intermediate good '{data.intermediate_good_name}' not found")
    
    recipe = await db.intermediate_recipes.find_one({"intermediate_good_name": data.intermediate_good_name})
    if not recipe:
        raise HTTPException(status_code=400, detail=f"No recipe found for '{data.intermediate_good_name}'. Ask owner to set recipe first.")
    
    # Calculate required raw materials
    required_materials = {}
    for ingredient in recipe["ingredients"]:
        required_qty = ingredient["quantity_per_unit"] * data.quantity
        required_materials[ingredient["raw_material_name"]] = required_qty
    
    # Check stock
    insufficient = []
    for mat_name, req_qty in required_materials.items():
        mat = await db.raw_materials.find_one({"name": mat_name})
        if not mat:
            raise HTTPException(status_code=400, detail=f"Raw material '{mat_name}' not found")
        if mat["stock"] < req_qty:
            insufficient.append(f"{mat_name}: need {req_qty:.2f}, have {mat['stock']:.2f}")
    
    if insufficient:
        raise HTTPException(status_code=400, detail=f"Insufficient raw materials: {', '.join(insufficient)}")
    
    # Deduct raw materials
    deductions = {}
    for mat_name, req_qty in required_materials.items():
        mat = await db.raw_materials.find_one({"name": mat_name})
        new_stock = mat["stock"] - req_qty
        await db.raw_materials.update_one({"name": mat_name}, {"$set": {"stock": new_stock}})
        deductions[mat_name] = {"used": req_qty, "prev_stock": mat["stock"], "new_stock": new_stock}
    
    # Add stock to intermediate good
    prev_stock = good["stock"]
    new_stock = prev_stock + data.quantity
    await db.intermediate_goods.update_one(
        {"name": data.intermediate_good_name},
        {"$set": {"stock": new_stock}}
    )
    
    transaction = Transaction(
        type="manufacture_intermediate_good",
        user_id=current_user.id,
        user_name=current_user.name,
        data={
            "intermediate_good_name": data.intermediate_good_name,
            "quantity": data.quantity,
            "prev_stock": prev_stock,
            "new_stock": new_stock,
            "deductions": deductions
        }
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {
        "message": f"Manufactured {data.quantity} {good['unit']} of {data.intermediate_good_name}",
        "new_stock": new_stock,
        "raw_materials_used": deductions
    }


@api_router.post("/manager/add-intermediate-stock")
async def add_intermediate_stock(data: ManufactureIntermediateRequest, current_user: User = Depends(get_current_user)):
    """Allow manager to add intermediate good stock directly (for corrections)"""
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Only manager can add stock")
    
    good = await db.intermediate_goods.find_one({"name": data.intermediate_good_name})
    if not good:
        raise HTTPException(status_code=404, detail=f"Intermediate good '{data.intermediate_good_name}' not found")
    
    prev_stock = good["stock"]
    new_stock = prev_stock + data.quantity
    await db.intermediate_goods.update_one(
        {"name": data.intermediate_good_name},
        {"$set": {"stock": new_stock}}
    )
    
    transaction = Transaction(
        type="add_intermediate_stock",
        user_id=current_user.id,
        user_name=current_user.name,
        data={"intermediate_good_name": data.intermediate_good_name, "quantity": data.quantity, "prev_stock": prev_stock}
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": f"Added {data.quantity} to {data.intermediate_good_name}", "new_stock": new_stock}



async def set_recipe(data: SetRecipeRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can set recipes")
    
    try:
        # Validate total percentage - allow small rounding errors
        total = sum(ing.percentage for ing in data.ingredients)
        if abs(total - 100.0) > 0.5:
            raise HTTPException(status_code=400, detail=f"Recipe percentages must total 100%, got {total:.2f}%")
        
        # Validate all ingredients have valid percentages
        for ing in data.ingredients:
            if ing.percentage <= 0:
                raise HTTPException(status_code=400, detail=f"Percentage for {ing.raw_material_name} must be positive")
        
        # Check if loose oil exists
        loose_oil = await db.loose_oils.find_one({"name": data.loose_oil_name})
        if not loose_oil:
            raise HTTPException(status_code=400, detail=f"Loose oil '{data.loose_oil_name}' not found. Please ensure this oil exists in the system.")
        
        # Validate all raw materials exist (check both raw_materials and intermediate_goods)
        for ing in data.ingredients:
            material = await db.raw_materials.find_one({"name": ing.raw_material_name})
            if not material:
                # Also check intermediate goods
                ig = await db.intermediate_goods.find_one({"name": ing.raw_material_name})
                if not ig:
                    raise HTTPException(status_code=400, detail=f"Material '{ing.raw_material_name}' not found in raw materials or intermediate goods")
        
        # Check if recipe exists, update or create
        existing = await db.recipes.find_one({"loose_oil_name": data.loose_oil_name})
        
        if existing:
            await db.recipes.update_one(
                {"loose_oil_name": data.loose_oil_name},
                {"$set": {
                    "ingredients": [ing.dict() for ing in data.ingredients],
                    "updated_at": datetime.utcnow()
                }}
            )
            logger.info(f"Recipe updated for {data.loose_oil_name} by {current_user.name}")
            return {"message": f"Recipe for {data.loose_oil_name} updated successfully"}
        else:
            recipe = ManufacturingRecipe(
                loose_oil_name=data.loose_oil_name,
                ingredients=data.ingredients,
                created_by=current_user.name
            )
            await db.recipes.insert_one(recipe.dict())
            logger.info(f"Recipe created for {data.loose_oil_name} by {current_user.name}")
            return {"message": f"Recipe for {data.loose_oil_name} created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving recipe: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save recipe: {str(e)}")


@api_router.post("/owner/take-stock-in-car")
async def take_stock_in_car(data: TakeStockInCarRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can take stock in car")
    
    # Get product
    product = await db.finished_products.find_one({"name": data.product_name, "pack_size": data.pack_size})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check factory stock
    if product["factory_stock"] < data.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient factory stock. Available: {product['factory_stock']}, Requested: {data.quantity}"
        )
    
    # Update stocks
    new_factory_stock = product["factory_stock"] - data.quantity
    new_car_stock = product["car_stock"] + data.quantity
    
    await db.finished_products.update_one(
            {"name": data.product_name, "pack_size": data.pack_size},
        {"$set": {
            "factory_stock": new_factory_stock,
            "car_stock": new_car_stock
        }}
    )
    
    # Log transaction
    transaction = Transaction(
        type="take_stock_car",
        user_id=current_user.id,
        user_name=current_user.name,
        data={
            "product_name": data.product_name,
            "quantity": data.quantity,
            "prev_factory_stock": product["factory_stock"],
            "prev_car_stock": product["car_stock"]
        }
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": f"Moved {data.quantity} units to car", "factory_stock": new_factory_stock, "car_stock": new_car_stock}


@api_router.post("/owner/record-sale")
async def record_sale(data: RecordSaleRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can record sales")
    
    # Get product
    product = await db.finished_products.find_one({"name": data.product_name, "pack_size": data.pack_size})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check stock based on sale type
    if data.sale_type == "car":
        if product["car_stock"] < data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient car stock. Available: {product['car_stock']}, Requested: {data.quantity}"
            )
        new_car_stock = product["car_stock"] - data.quantity
        await db.finished_products.update_one(
            {"name": data.product_name, "pack_size": data.pack_size},
            {"$set": {"car_stock": new_car_stock}}
        )
    else:  # transport or direct_dispatch
        if product["factory_stock"] < data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient factory stock. Available: {product['factory_stock']}, Requested: {data.quantity}"
            )
        new_factory_stock = product["factory_stock"] - data.quantity
        await db.finished_products.update_one(
            {"name": data.product_name, "pack_size": data.pack_size},
            {"$set": {"factory_stock": new_factory_stock}}
        )
    
    # Log transaction
    transaction = Transaction(
        type=f"sale_{data.sale_type}",
        user_id=current_user.id,
        user_name=current_user.name,
        data={
            "product_name": data.product_name,
            "quantity": data.quantity,
            "sale_type": data.sale_type,
            "prev_factory_stock": product["factory_stock"],
            "prev_car_stock": product["car_stock"]
        }
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": f"Sale recorded: {data.quantity} units via {data.sale_type}"}


@api_router.post("/owner/return-to-factory")
async def return_to_factory(data: ReturnToFactoryRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can create returns")
    
    # Get product
    product = await db.finished_products.find_one({"name": data.product_name, "pack_size": data.pack_size})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check car stock
    if product["car_stock"] < data.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient car stock. Available: {product['car_stock']}, Requested: {data.quantity}"
        )
    
    # Create pending return
    pending_return = PendingReturn(
        product_name=data.product_name,
        quantity=data.quantity,
        created_by=current_user.name
    )
    
    await db.pending_returns.insert_one(pending_return.dict())
    
    # Decrease car stock immediately
    new_car_stock = product["car_stock"] - data.quantity
    await db.finished_products.update_one(
            {"name": data.product_name, "pack_size": data.pack_size},
        {"$set": {"car_stock": new_car_stock}}
    )
    
    # Log transaction
    transaction = Transaction(
        type="return_to_factory",
        user_id=current_user.id,
        user_name=current_user.name,
        data={
            "product_name": data.product_name,
            "quantity": data.quantity,
            "return_id": pending_return.id,
            "prev_car_stock": product["car_stock"]
        }
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": f"Return created: {data.quantity} units pending approval", "return_id": pending_return.id}


# ==================== FACTORY MANAGER ACTIONS ====================

@api_router.post("/manager/add-raw-material-stock")
async def add_raw_material_stock(data: AddRawMaterialStockRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Only manager can add raw material stock")
    
    material = await db.raw_materials.find_one({"name": data.raw_material_name})
    if not material:
        raise HTTPException(status_code=404, detail="Raw material not found")
    
    new_stock = material["stock"] + data.quantity
    await db.raw_materials.update_one(
        {"name": data.raw_material_name},
        {"$set": {"stock": new_stock}}
    )
    
    # Log transaction
    transaction = Transaction(
        type="add_raw_material",
        user_id=current_user.id,
        user_name=current_user.name,
        data={
            "raw_material_name": data.raw_material_name,
            "quantity": data.quantity,
            "prev_stock": material["stock"]
        }
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": f"Added {data.quantity} {material['unit']} to {data.raw_material_name}", "new_stock": new_stock}


@api_router.post("/manager/add-packing-material-stock")
async def add_packing_material_stock(data: AddPackingMaterialStockRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Only manager can add packing material stock")
    
    material = await db.packing_materials.find_one({"name": data.packing_material_name})
    if not material:
        raise HTTPException(status_code=404, detail="Packing material not found")
    
    new_stock = material["stock"] + data.quantity
    await db.packing_materials.update_one(
        {"name": data.packing_material_name},
        {"$set": {"stock": new_stock}}
    )
    
    # Log transaction
    transaction = Transaction(
        type="add_packing_material",
        user_id=current_user.id,
        user_name=current_user.name,
        data={
            "packing_material_name": data.packing_material_name,
            "quantity": data.quantity,
            "prev_stock": material["stock"]
        }
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": f"Added {data.quantity} units to {data.packing_material_name}", "new_stock": new_stock}


@api_router.post("/manager/manufacture-loose-oil")
async def manufacture_loose_oil(data: ManufactureRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Only manager can manufacture loose oil")
    
    # Get recipe
    recipe = await db.recipes.find_one({"loose_oil_name": data.loose_oil_name})
    if not recipe:
        raise HTTPException(status_code=400, detail=f"No recipe found for '{data.loose_oil_name}'. Please set recipe first.")
    
    # Calculate required raw materials
    required_materials = {}
    for ingredient in recipe["ingredients"]:
        required_quantity = (ingredient["percentage"] / 100.0) * data.quantity_litres
        required_materials[ingredient["raw_material_name"]] = required_quantity
    
    # Check if sufficient raw materials available (check both raw_materials and intermediate_goods)
    insufficient = []
    material_sources = {}  # track where each material comes from
    for material_name, required_qty in required_materials.items():
        material = await db.raw_materials.find_one({"name": material_name})
        if material:
            material_sources[material_name] = "raw_material"
            if material["stock"] < required_qty:
                insufficient.append(f"{material_name}: need {required_qty:.2f}, have {material['stock']:.2f}")
        else:
            ig = await db.intermediate_goods.find_one({"name": material_name})
            if ig:
                material_sources[material_name] = "intermediate_good"
                if ig["stock"] < required_qty:
                    insufficient.append(f"{material_name}: need {required_qty:.2f}, have {ig['stock']:.2f}")
            else:
                raise HTTPException(status_code=400, detail=f"Material '{material_name}' not found in raw materials or intermediate goods")
    
    if insufficient:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient materials: {', '.join(insufficient)}"
        )
    
    # Deduct materials from appropriate collection
    deductions = {}
    for material_name, required_qty in required_materials.items():
        source = material_sources[material_name]
        if source == "raw_material":
            material = await db.raw_materials.find_one({"name": material_name})
            new_stock = material["stock"] - required_qty
            await db.raw_materials.update_one({"name": material_name}, {"$set": {"stock": new_stock}})
            deductions[material_name] = {"used": required_qty, "prev_stock": material["stock"], "new_stock": new_stock, "source": "raw_material"}
        else:
            ig = await db.intermediate_goods.find_one({"name": material_name})
            new_stock = ig["stock"] - required_qty
            await db.intermediate_goods.update_one({"name": material_name}, {"$set": {"stock": new_stock}})
            deductions[material_name] = {"used": required_qty, "prev_stock": ig["stock"], "new_stock": new_stock, "source": "intermediate_good"}
    
    # Add to loose oil stock
    loose_oil = await db.loose_oils.find_one({"name": data.loose_oil_name})
    if not loose_oil:
        raise HTTPException(status_code=404, detail="Loose oil not found")
    
    new_oil_stock = loose_oil["stock_litres"] + data.quantity_litres
    await db.loose_oils.update_one(
        {"name": data.loose_oil_name},
        {"$set": {"stock_litres": new_oil_stock}}
    )
    
    # Log transaction
    transaction = Transaction(
        type="manufacture_loose_oil",
        user_id=current_user.id,
        user_name=current_user.name,
        data={
            "loose_oil_name": data.loose_oil_name,
            "quantity_litres": data.quantity_litres,
            "deductions": deductions,
            "prev_oil_stock": loose_oil["stock_litres"]
        }
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {
        "message": f"Manufactured {data.quantity_litres}L of {data.loose_oil_name}",
        "new_stock": new_oil_stock,
        "raw_materials_used": deductions
    }


@api_router.post("/manager/pack-finished-goods")
async def pack_finished_goods(data: PackFinishedGoodsRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Only manager can pack finished goods")
    
    try:
        # Get product
        product = await db.finished_products.find_one({"name": data.product_name, "pack_size": data.pack_size})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product '{data.product_name}' not found")
        
        # Get loose oil
        loose_oil = await db.loose_oils.find_one({"name": product["linked_loose_oil"]})
        if not loose_oil:
            raise HTTPException(status_code=400, detail=f"Loose oil '{product['linked_loose_oil']}' not found")
        
        # Get packing material
        packing = await db.packing_materials.find_one({"name": product["linked_packing_material"]})
        if not packing:
            raise HTTPException(status_code=400, detail=f"Packing material '{product['linked_packing_material']}' not found")
        
        # Parse pack size to litres - handles "1L", "1.5L", "900ml", "800ml", etc.
        pack_size_str = product["pack_size"].strip().lower().replace(" ", "")
        pack_size_litres = 0.0
        
        # Try ml format first (e.g., "900ml", "800ml")
        import re
        ml_match = re.match(r'^(\d+(?:\.\d+)?)\s*ml$', pack_size_str)
        if ml_match:
            pack_size_litres = float(ml_match.group(1)) / 1000.0
        else:
            # Try L format (e.g., "1L", "1.5L")
            l_match = re.match(r'^(\d+(?:\.\d+)?)\s*l$', pack_size_str)
            if l_match:
                pack_size_litres = float(l_match.group(1))
            else:
                # Try just a number (assume litres)
                num_match = re.match(r'^(\d+(?:\.\d+)?)$', pack_size_str)
                if num_match:
                    pack_size_litres = float(num_match.group(1))
                else:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid pack size format: '{product['pack_size']}'. Use formats like '1L', '900ml', '1.5L', etc."
                    )
        
        required_oil = pack_size_litres * data.quantity
        
        # Check stocks
        current_oil_stock = loose_oil.get("stock_litres", 0)
        current_packing_stock = packing.get("stock", 0)
        
        if current_oil_stock < required_oil:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient loose oil '{product['linked_loose_oil']}'. Need {required_oil:.2f}L ({data.quantity} units x {pack_size_litres}L each), have {current_oil_stock:.2f}L"
            )
        
        if current_packing_stock < data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient packing '{product['linked_packing_material']}'. Need {data.quantity} bottles, have {current_packing_stock}"
            )
        
        # Deduct loose oil and packing
        new_oil_stock = current_oil_stock - required_oil
        new_packing_stock = current_packing_stock - data.quantity
        
        await db.loose_oils.update_one(
            {"name": product["linked_loose_oil"]},
            {"$set": {"stock_litres": round(new_oil_stock, 2)}}
        )
        
        await db.packing_materials.update_one(
            {"name": product["linked_packing_material"]},
            {"$set": {"stock": new_packing_stock}}
        )
        
        # Add to finished goods factory stock
        current_factory_stock = product.get("factory_stock", 0)
        new_factory_stock = current_factory_stock + data.quantity
        await db.finished_products.update_one(
            {"name": data.product_name, "pack_size": data.pack_size},
            {"$set": {"factory_stock": new_factory_stock}}
        )
        
        # Log transaction
        transaction = Transaction(
            type="pack_finished_goods",
            user_id=current_user.id,
            user_name=current_user.name,
            data={
                "product_name": data.product_name,
                "pack_size": product["pack_size"],
                "pack_size_litres": pack_size_litres,
                "quantity_packed": data.quantity,
                "oil_used_litres": required_oil,
                "packing_used": data.quantity,
                "linked_loose_oil": product["linked_loose_oil"],
                "linked_packing": product["linked_packing_material"],
                "prev_factory_stock": current_factory_stock,
                "prev_oil_stock": current_oil_stock,
                "prev_packing_stock": current_packing_stock
            }
        )
        await db.transactions.insert_one(transaction.dict())
        
        logger.info(f"Packed {data.quantity} units of {data.product_name} ({pack_size_litres}L each = {required_oil}L total)")
        return {
            "message": f"Successfully packed {data.quantity} units of {data.product_name}",
            "details": {
                "oil_used": f"{required_oil:.2f}L ({pack_size_litres}L x {data.quantity})",
                "packing_used": data.quantity,
                "new_factory_stock": new_factory_stock
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error packing finished goods: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to pack finished goods: {str(e)}")

@api_router.post("/manager/approve-return")
async def approve_return(data: ApproveReturnRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Only manager can approve returns")
    
    # Get return
    return_doc = await db.pending_returns.find_one({"id": data.return_id, "status": "pending"})
    if not return_doc:
        raise HTTPException(status_code=404, detail="Pending return not found")
    
    # Get product
    product = await db.finished_products.find_one({"name": return_doc["product_name"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Calculate pack size
    try:
        pack_size_litres = float(product["pack_size"].replace("L", ""))
    except:
        raise HTTPException(status_code=400, detail=f"Invalid pack size format: {product['pack_size']}")
    
    oil_to_add = pack_size_litres * return_doc["quantity"]
    
    if data.action == "drain_reuse":
        # Add oil back to loose stock
        loose_oil = await db.loose_oils.find_one({"name": product["linked_loose_oil"]})
        if loose_oil:
            new_oil_stock = loose_oil["stock_litres"] + oil_to_add
            await db.loose_oils.update_one(
                {"name": product["linked_loose_oil"]},
                {"$set": {"stock_litres": new_oil_stock}}
            )
        
        # Deduct packing bottles
        packing = await db.packing_materials.find_one({"name": product["linked_packing_material"]})
        if packing and packing["stock"] >= return_doc["quantity"]:
            new_packing_stock = packing["stock"] - return_doc["quantity"]
            await db.packing_materials.update_one(
                {"name": product["linked_packing_material"]},
                {"$set": {"stock": new_packing_stock}}
            )
    
    elif data.action == "scrap":
        # Just deduct packing bottles (oil is lost)
        packing = await db.packing_materials.find_one({"name": product["linked_packing_material"]})
        if packing and packing["stock"] >= return_doc["quantity"]:
            new_packing_stock = packing["stock"] - return_doc["quantity"]
            await db.packing_materials.update_one(
                {"name": product["linked_packing_material"]},
                {"$set": {"stock": new_packing_stock}}
            )
    
    # Mark return as approved
    await db.pending_returns.update_one(
        {"id": data.return_id},
        {"$set": {"status": "approved"}}
    )
    
    # Log transaction
    transaction = Transaction(
        type="approve_return",
        user_id=current_user.id,
        user_name=current_user.name,
        data={
            "return_id": data.return_id,
            "product_name": return_doc["product_name"],
            "quantity": return_doc["quantity"],
            "action": data.action,
            "oil_added": oil_to_add if data.action == "drain_reuse" else 0
        }
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": f"Return approved with action: {data.action}"}


@api_router.post("/manager/mark-damaged-packing")
async def mark_damaged_packing(data: MarkDamagedPackingRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Only manager can mark damaged packing")
    
    # Get packing material
    packing = await db.packing_materials.find_one({"name": data.packing_name})
    if not packing:
        raise HTTPException(status_code=404, detail="Packing material not found")
    
    if packing["stock"] < data.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {packing['stock']}, Requested: {data.quantity}"
        )
    
    # Reduce stock
    new_stock = packing["stock"] - data.quantity
    await db.packing_materials.update_one(
        {"name": data.packing_name},
        {"$set": {"stock": new_stock}}
    )
    
    # Log transaction
    transaction = Transaction(
        type="damaged_packing",
        user_id=current_user.id,
        user_name=current_user.name,
        data={
            "packing_name": data.packing_name,
            "quantity": data.quantity,
            "reason": data.reason,
            "prev_stock": packing["stock"]
        }
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": f"Marked {data.quantity} units as damaged", "new_stock": new_stock}


# ==================== UNDO FUNCTIONALITY ====================

@api_router.get("/transactions/recent", response_model=List[Transaction])
async def get_recent_transactions(current_user: User = Depends(get_current_user)):
    # Get transactions from last 24 hours
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    transactions = await db.transactions.find({
        "timestamp": {"$gte": twenty_four_hours_ago},
        "can_undo": True
    }).sort("timestamp", -1).to_list(100)
    
    return [Transaction(**t) for t in transactions]


@api_router.post("/transactions/undo")
async def undo_transaction(data: UndoTransactionRequest, current_user: User = Depends(get_current_user)):
    # Get transaction
    transaction = await db.transactions.find_one({"id": data.transaction_id, "can_undo": True})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found or cannot be undone")
    
    # Check if within 24 hours
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    if transaction["timestamp"] < twenty_four_hours_ago:
        raise HTTPException(status_code=400, detail="Transaction is older than 24 hours and cannot be undone")
    
    trans_type = transaction["type"]
    trans_data = transaction["data"]
    
    # Undo based on transaction type
    if trans_type == "take_stock_car":
        await db.finished_products.update_one(
            {"name": trans_data["product_name"]},
            {"$set": {
                "factory_stock": trans_data["prev_factory_stock"],
                "car_stock": trans_data["prev_car_stock"]
            }}
        )
    
    elif trans_type in ["sale_car", "sale_transport", "sale_direct_dispatch"]:
        await db.finished_products.update_one(
            {"name": trans_data["product_name"]},
            {"$set": {
                "factory_stock": trans_data["prev_factory_stock"],
                "car_stock": trans_data["prev_car_stock"]
            }}
        )
    
    elif trans_type == "add_raw_material":
        await db.raw_materials.update_one(
            {"name": trans_data["raw_material_name"]},
            {"$set": {"stock": trans_data["prev_stock"]}}
        )
    
    elif trans_type == "pack_finished_goods":
        product = await db.finished_products.find_one({"name": trans_data["product_name"]})
        if product:
            await db.finished_products.update_one(
                {"name": trans_data["product_name"]},
                {"$set": {"factory_stock": trans_data["prev_factory_stock"]}}
            )
            await db.loose_oils.update_one(
                {"name": product["linked_loose_oil"]},
                {"$set": {"stock_litres": trans_data["prev_oil_stock"]}}
            )
            await db.packing_materials.update_one(
                {"name": product["linked_packing_material"]},
                {"$set": {"stock": trans_data["prev_packing_stock"]}}
            )
    
    # Mark transaction as undone
    await db.transactions.update_one(
        {"id": data.transaction_id},
        {"$set": {"can_undo": False}}
    )
    
    # Log undo action
    undo_transaction = Transaction(
        type="undo",
        user_id=current_user.id,
        user_name=current_user.name,
        data={
            "undone_transaction_id": data.transaction_id,
            "undone_type": trans_type,
            "reason": data.reason
        },
        can_undo=False
    )
    await db.transactions.insert_one(undo_transaction.dict())
    
    return {"message": f"Transaction undone successfully. Reason: {data.reason}"}


# ==================== SEARCH ====================

@api_router.get("/search")
async def search_stock(query: str, current_user: User = Depends(get_current_user)):
    query_lower = query.lower()
    
    results = {
        "finished_goods": [],
        "loose_oils": [],
        "raw_materials": [],
        "packing_materials": []
    }
    
    # Search finished products
    products = await db.finished_products.find({
        "name": {"$regex": query, "$options": "i"}
    }).to_list(50)
    results["finished_goods"] = [FinishedProduct(**p) for p in products]
    
    # Search loose oils
    oils = await db.loose_oils.find({
        "name": {"$regex": query, "$options": "i"}
    }).to_list(50)
    results["loose_oils"] = [LooseOil(**o) for o in oils]
    
    # Search raw materials
    raw_mats = await db.raw_materials.find({
        "name": {"$regex": query, "$options": "i"}
    }).to_list(50)
    results["raw_materials"] = [RawMaterial(**m) for m in raw_mats]
    
    # Search packing materials
    packing_mats = await db.packing_materials.find({
        "name": {"$regex": query, "$options": "i"}
    }).to_list(50)
    results["packing_materials"] = [PackingMaterial(**m) for m in packing_mats]
    
    return results


@api_router.get("/recipes", response_model=List[ManufacturingRecipe])
async def get_recipes(current_user: User = Depends(get_current_user)):
    recipes = await db.recipes.find().to_list(1000)
    return [ManufacturingRecipe(**r) for r in recipes]


# ==================== OWNER ADMIN ACTIONS ====================

class EditStockRequest(BaseModel):
    item_type: Literal["finished_product", "loose_oil", "raw_material", "packing_material"]
    item_name: str
    field: str  # "factory_stock", "car_stock", "stock_litres", "stock"
    new_value: float


@api_router.post("/owner/edit-stock")
async def edit_stock(data: EditStockRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can edit stock manually")
    
    try:
        if data.item_type == "finished_product":
            product = await db.finished_products.find_one({"name": data.item_name})
            if not product:
                raise HTTPException(status_code=404, detail="Product not found")
            
            prev_value = product.get(data.field, 0)
            await db.finished_products.update_one(
                {"name": data.item_name},
                {"$set": {data.field: int(data.new_value)}}
            )
            
        elif data.item_type == "loose_oil":
            oil = await db.loose_oils.find_one({"name": data.item_name})
            if not oil:
                raise HTTPException(status_code=404, detail="Loose oil not found")
            
            prev_value = oil.get("stock_litres", 0)
            await db.loose_oils.update_one(
                {"name": data.item_name},
                {"$set": {"stock_litres": float(data.new_value)}}
            )
            
        elif data.item_type == "raw_material":
            material = await db.raw_materials.find_one({"name": data.item_name})
            if not material:
                raise HTTPException(status_code=404, detail="Raw material not found")
            
            prev_value = material.get("stock", 0)
            await db.raw_materials.update_one(
                {"name": data.item_name},
                {"$set": {"stock": float(data.new_value)}}
            )
            
        elif data.item_type == "packing_material":
            packing = await db.packing_materials.find_one({"name": data.item_name})
            if not packing:
                raise HTTPException(status_code=404, detail="Packing material not found")
            
            prev_value = packing.get("stock", 0)
            await db.packing_materials.update_one(
                {"name": data.item_name},
                {"$set": {"stock": int(data.new_value)}}
            )
        
        # Log transaction
        transaction = Transaction(
            type="manual_stock_edit",
            user_id=current_user.id,
            user_name=current_user.name,
            data={
                "item_type": data.item_type,
                "item_name": data.item_name,
                "field": data.field,
                "prev_value": prev_value,
                "new_value": data.new_value
            }
        )
        await db.transactions.insert_one(transaction.dict())
        
        return {"message": f"Stock updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/owner/reset-all-stock")
async def reset_all_stock(current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can reset all stock")
    
    # Reset finished products
    await db.finished_products.update_many(
        {},
        {"$set": {"factory_stock": 0, "car_stock": 0}}
    )
    
    # Reset loose oils
    await db.loose_oils.update_many(
        {},
        {"$set": {"stock_litres": 0.0}}
    )
    
    # Reset raw materials
    await db.raw_materials.update_many(
        {},
        {"$set": {"stock": 0.0}}
    )
    
    # Reset packing materials
    await db.packing_materials.update_many(
        {},
        {"$set": {"stock": 0}}
    )
    
    # Log transaction
    transaction = Transaction(
        type="reset_all_stock",
        user_id=current_user.id,
        user_name=current_user.name,
        data={"action": "reset_all_stock_to_zero"},
        can_undo=False
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": "All stock reset to zero successfully"}


# ==================== INITIALIZE DATA ====================

@api_router.post("/init-data")
async def initialize_data():
    """Initialize database with pre-populated data (call once)"""
    
    # Check if already initialized
    existing_oils = await db.loose_oils.count_documents({})
    if existing_oils > 0:
        return {"message": "Data already initialized"}
    
    # Create default users
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
    
    # Loose Oils
    loose_oils = [
        "15W40", "20W50", "Thriller", "Thrive", "Super Pro", "Power 4T",
        "5W30 Ultra", "5W30 Cruise", "2T", "Hydraulic Samrat", "Hydraulic Delvex",
        "Gear Oil Supreme", "Gear Oil GL3", "Gear Oil GL4", "8W90", "Gear Oil 140",
        "UTTO", "TQ", "10W30", "PSO"
    ]
    
    loose_oil_docs = [LooseOil(name=name).dict() for name in loose_oils]
    await db.loose_oils.insert_many(loose_oil_docs)
    
    # Raw Materials
    raw_materials = [
        RawMaterial(name="Seiko", unit="litres", created_by="System").dict(),
        RawMaterial(name="150", unit="litres", created_by="System").dict(),
        RawMaterial(name="Other", unit="litres", created_by="System").dict(),
        RawMaterial(name="4T", unit="litres", created_by="System").dict(),
        RawMaterial(name="Gear Oil", unit="litres", created_by="System").dict(),
        RawMaterial(name="Hydraulic", unit="litres", created_by="System").dict(),
        RawMaterial(name="Synth", unit="litres", created_by="System").dict(),
        RawMaterial(name="CH4", unit="litres", created_by="System").dict(),
        RawMaterial(name="VI", unit="kg", created_by="System").dict(),
        RawMaterial(name="PPD", unit="kg", created_by="System").dict(),
        RawMaterial(name="Dye", unit="kg", created_by="System").dict(),
    ]
    await db.raw_materials.insert_many(raw_materials)
    
    # Packing Materials
    packing_materials = [
        PackingMaterial(name="Thriller Pack 1L", size_label="1L", created_by="System").dict(),
        PackingMaterial(name="Thrive Pack 1L", size_label="1L", created_by="System").dict(),
        PackingMaterial(name="Power Grey 1L", size_label="1L", created_by="System").dict(),
        PackingMaterial(name="Power Grey 5L", size_label="5L", created_by="System").dict(),
        PackingMaterial(name="Autocraft 3.5L", size_label="3.5L", created_by="System").dict(),
        PackingMaterial(name="Champion 3.5L Yellow", size_label="3.5L", created_by="System").dict(),
        PackingMaterial(name="Champion 3.5L Red", size_label="3.5L", created_by="System").dict(),
        PackingMaterial(name="Power 3.5L Red", size_label="3.5L", created_by="System").dict(),
        PackingMaterial(name="Power 5L Grey", size_label="5L", created_by="System").dict(),
    ]
    await db.packing_materials.insert_many(packing_materials)
    
    # Sample Finished Products
    finished_products = [
        FinishedProduct(
            name="Thriller",
            pack_size="1L",
            linked_loose_oil="Thriller",
            linked_packing_material="Thriller Pack 1L",
            created_by="System"
        ).dict(),
        FinishedProduct(
            name="Thrive",
            pack_size="1L",
            linked_loose_oil="Thrive",
            linked_packing_material="Thrive Pack 1L",
            created_by="System"
        ).dict(),
        FinishedProduct(
            name="Power 4T Grey",
            pack_size="1L",
            linked_loose_oil="Power 4T",
            linked_packing_material="Power Grey 1L",
            created_by="System"
        ).dict(),
    ]
    await db.finished_products.insert_many(finished_products)
    
    return {
        "message": "Database initialized successfully",
        "default_credentials": {
            "owner": {"email": "owner@lubricant.com", "password": "owner123"},
            "manager": {"email": "manager@lubricant.com", "password": "manager123"}
        }
    }


# ==================== WEEKLY REPORTS ====================

@api_router.get("/owner/weekly-report")
async def get_weekly_report(current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can view reports")
    
    try:
        from datetime import timedelta
        
        # Get transactions from the last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        transactions = await db.transactions.find({
            "timestamp": {"$gte": seven_days_ago}
        }).sort("timestamp", -1).to_list(1000)
        
        # Group transactions by date and type
        report = {
            "period": {
                "start": seven_days_ago.isoformat(),
                "end": datetime.utcnow().isoformat()
            },
            "summary": {
                "total_transactions": len(transactions),
                "by_type": {},
                "by_user": {},
                "by_date": {}
            },
            "transactions": []
        }
        
        for txn in transactions:
            txn_type = txn.get("type", "unknown")
            user_name = txn.get("user_name", "Unknown")
            date_str = txn.get("timestamp").strftime("%Y-%m-%d") if txn.get("timestamp") else "Unknown"
            
            # Count by type
            if txn_type not in report["summary"]["by_type"]:
                report["summary"]["by_type"][txn_type] = 0
            report["summary"]["by_type"][txn_type] += 1
            
            # Count by user
            if user_name not in report["summary"]["by_user"]:
                report["summary"]["by_user"][user_name] = 0
            report["summary"]["by_user"][user_name] += 1
            
            # Count by date
            if date_str not in report["summary"]["by_date"]:
                report["summary"]["by_date"][date_str] = 0
            report["summary"]["by_date"][date_str] += 1
            
            # Format transaction for display
            report["transactions"].append({
                "id": txn.get("id"),
                "type": txn_type,
                "type_label": get_transaction_label(txn_type),
                "user": user_name,
                "timestamp": txn.get("timestamp").isoformat() if txn.get("timestamp") else None,
                "date": date_str,
                "time": txn.get("timestamp").strftime("%H:%M") if txn.get("timestamp") else "Unknown",
                "data": txn.get("data", {})
            })
        
        return report
    except Exception as e:
        logger.error(f"Error generating weekly report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


def get_transaction_label(txn_type: str) -> str:
    """Convert transaction type to human-readable label"""
    labels = {
        "add_raw_material_stock": "Added Raw Material Stock",
        "add_packing_material_stock": "Added Packing Stock",
        "manufacture_loose_oil": "Manufactured Loose Oil",
        "pack_finished_goods": "Packed Finished Goods",
        "take_stock_in_car": "Took Stock in Car",
        "sale_car": "Sale from Car",
        "sale_transport": "Sale via Transport",
        "sale_direct": "Direct Dispatch Sale",
        "return_to_factory": "Return to Factory",
        "approve_return_drain": "Approved Return (Drain)",
        "approve_return_scrap": "Approved Return (Scrap)",
        "mark_damaged_packing": "Marked Damaged Packing",
        "edit_stock": "Manual Stock Edit",
        "edit_finished_product": "Edited Finished Product",
        "add_intermediate_good": "Added Intermediate Good",
        "delete_intermediate_good": "Deleted Intermediate Good",
        "set_intermediate_recipe": "Set Intermediate Recipe",
        "manufacture_intermediate_good": "Manufactured Intermediate Good",
        "add_intermediate_stock": "Added Intermediate Stock",
        "reset_all_stock": "Reset All Stock",
        "add_raw_material": "Added New Raw Material",
        "edit_raw_material": "Edited Raw Material",
        "delete_raw_material": "Deleted Raw Material",
        "add_packing_material": "Added New Packing Material",
        "edit_packing_material": "Edited Packing Material",
        "delete_packing_material": "Deleted Packing Material",
        "add_loose_oil": "Added New Loose Oil",
        "edit_loose_oil": "Edited Loose Oil",
        "delete_loose_oil": "Deleted Loose Oil",
        "add_finished_product": "Added New Finished Product",
        "delete_finished_product": "Deleted Finished Product",
        "set_recipe": "Set/Updated Recipe",
    }
    return labels.get(txn_type, txn_type.replace("_", " ").title())


@api_router.get("/owner/daily-report/{date}")
async def get_daily_report(date: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can view reports")
    
    try:
        # Parse the date
        report_date = datetime.strptime(date, "%Y-%m-%d")
        next_day = report_date + timedelta(days=1)
        
        transactions = await db.transactions.find({
            "timestamp": {
                "$gte": report_date,
                "$lt": next_day
            }
        }).sort("timestamp", -1).to_list(500)
        
        # Group by user for accountability
        by_user = {}
        for txn in transactions:
            user = txn.get("user_name", "Unknown")
            if user not in by_user:
                by_user[user] = []
            by_user[user].append({
                "id": txn.get("id"),
                "type": txn.get("type"),
                "type_label": get_transaction_label(txn.get("type", "")),
                "time": txn.get("timestamp").strftime("%H:%M") if txn.get("timestamp") else "Unknown",
                "data": txn.get("data", {})
            })
        
        return {
            "date": date,
            "total_transactions": len(transactions),
            "by_user": by_user
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        logger.error(f"Error generating daily report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")



# ==================== APP SETUP (MUST BE AFTER ALL ROUTES) ====================

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
