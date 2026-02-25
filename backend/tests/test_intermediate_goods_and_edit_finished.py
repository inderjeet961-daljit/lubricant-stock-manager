"""
Test suite for:
1. Edit Finished Products feature (Owner only)
2. Intermediate Goods CRUD, recipes, and manufacturing

Test credentials:
- Owner: owner@lubricant.com / owner123
- Manager: manager@lubricant.com / manager123
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://oil-inventory-app-1.preview.emergentagent.com')

# ==================== FIXTURES ====================

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def owner_token(api_client):
    """Get owner authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "owner@lubricant.com",
        "password": "owner123"
    })
    assert response.status_code == 200, f"Owner login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="session")
def manager_token(api_client):
    """Get manager authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "manager@lubricant.com",
        "password": "manager123"
    })
    assert response.status_code == 200, f"Manager login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture
def owner_client(api_client, owner_token):
    """Session with owner auth header"""
    api_client.headers.update({"Authorization": f"Bearer {owner_token}"})
    return api_client


@pytest.fixture
def manager_client(api_client, manager_token):
    """Session with manager auth header"""
    api_client.headers.update({"Authorization": f"Bearer {manager_token}"})
    return api_client


# ==================== EDIT FINISHED PRODUCT TESTS ====================

class TestEditFinishedProduct:
    """Tests for PUT /api/owner/edit-finished-product endpoint"""
    
    def test_get_finished_products_list(self, owner_client):
        """Get list of finished products to test edit functionality"""
        response = owner_client.get(f"{BASE_URL}/api/stock/finished-products")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"Found {len(products)} finished products")
        if products:
            print(f"First product: {products[0]}")
        return products
    
    def test_edit_finished_product_success(self, owner_client):
        """Owner can edit finished product - change linked loose oil"""
        # First get existing products and loose oils
        products = owner_client.get(f"{BASE_URL}/api/stock/finished-products").json()
        loose_oils = owner_client.get(f"{BASE_URL}/api/stock/loose-oils").json()
        
        if not products or not loose_oils:
            pytest.skip("No finished products or loose oils available for testing")
        
        product = products[0]
        # Find a different loose oil to link
        available_oils = [oil['name'] for oil in loose_oils]
        current_oil = product.get('linked_loose_oil')
        
        # Get current linked oil and try a different one (if available)
        response = owner_client.put(f"{BASE_URL}/api/owner/edit-finished-product", json={
            "name": product['name'],
            "pack_size": product['pack_size'],
            "new_linked_loose_oil": available_oils[0] if available_oils else None
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Edit result: {data['message']}")
    
    def test_edit_finished_product_manager_forbidden(self, manager_client):
        """Manager should get 403 when trying to edit finished products"""
        response = manager_client.put(f"{BASE_URL}/api/owner/edit-finished-product", json={
            "name": "TestProduct",
            "pack_size": "1L",
            "new_name": "TestProductUpdated"
        })
        assert response.status_code == 403
        assert "owner" in response.json().get("detail", "").lower()
        print("Manager correctly blocked from editing finished products")
    
    def test_edit_nonexistent_product_returns_404(self, owner_client):
        """Editing non-existent product should return 404"""
        response = owner_client.put(f"{BASE_URL}/api/owner/edit-finished-product", json={
            "name": "NONEXISTENT_PRODUCT_12345",
            "pack_size": "999L",
            "new_name": "ShouldNotWork"
        })
        assert response.status_code == 404
        print("Non-existent product correctly returns 404")


# ==================== INTERMEDIATE GOODS CRUD TESTS ====================

class TestIntermediateGoodsCRUD:
    """Tests for Intermediate Goods CRUD operations"""
    
    def test_get_intermediate_goods(self, owner_client):
        """GET /api/stock/intermediate-goods - list all intermediate goods"""
        response = owner_client.get(f"{BASE_URL}/api/stock/intermediate-goods")
        assert response.status_code == 200
        goods = response.json()
        assert isinstance(goods, list)
        print(f"Found {len(goods)} intermediate goods")
        for ig in goods:
            print(f"  - {ig.get('name')}: stock={ig.get('stock', 0)} {ig.get('unit')}")
        return goods
    
    def test_get_intermediate_recipes(self, owner_client):
        """GET /api/intermediate-recipes - list all intermediate recipes"""
        response = owner_client.get(f"{BASE_URL}/api/intermediate-recipes")
        assert response.status_code == 200
        recipes = response.json()
        assert isinstance(recipes, list)
        print(f"Found {len(recipes)} intermediate recipes")
        for recipe in recipes:
            print(f"  - {recipe.get('intermediate_good_name')}: {recipe.get('ingredients')}")
        return recipes
    
    def test_add_intermediate_good_success(self, owner_client):
        """Owner can add new intermediate good"""
        test_name = f"TEST_IG_{int(time.time())}"
        response = owner_client.post(f"{BASE_URL}/api/owner/add-intermediate-good", json={
            "name": test_name,
            "unit": "litres"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert test_name in data["message"]
        print(f"Successfully added intermediate good: {test_name}")
        
        # Cleanup - delete the test item
        cleanup = owner_client.delete(f"{BASE_URL}/api/owner/delete-intermediate-good/{test_name}")
        print(f"Cleanup result: {cleanup.status_code}")
    
    def test_add_duplicate_intermediate_good_fails(self, owner_client):
        """Adding duplicate intermediate good should fail"""
        # Check if VI exists
        goods = owner_client.get(f"{BASE_URL}/api/stock/intermediate-goods").json()
        vi_exists = any(g['name'] == 'VI' for g in goods)
        
        if not vi_exists:
            pytest.skip("VI intermediate good not present, skip duplicate test")
        
        response = owner_client.post(f"{BASE_URL}/api/owner/add-intermediate-good", json={
            "name": "VI",
            "unit": "litres"
        })
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
        print("Duplicate intermediate good correctly rejected")
    
    def test_add_intermediate_good_manager_forbidden(self, manager_client):
        """Manager should get 403 when adding intermediate goods"""
        response = manager_client.post(f"{BASE_URL}/api/owner/add-intermediate-good", json={
            "name": "TEST_MANAGER_IG",
            "unit": "litres"
        })
        assert response.status_code == 403
        print("Manager correctly blocked from adding intermediate goods")
    
    def test_delete_intermediate_good_manager_forbidden(self, manager_client):
        """Manager should get 403 when deleting intermediate goods"""
        response = manager_client.delete(f"{BASE_URL}/api/owner/delete-intermediate-good/VI")
        assert response.status_code == 403
        print("Manager correctly blocked from deleting intermediate goods")


# ==================== INTERMEDIATE RECIPE TESTS ====================

class TestIntermediateRecipes:
    """Tests for intermediate good recipe management"""
    
    def test_set_intermediate_recipe_success(self, owner_client):
        """Owner can set recipe for intermediate good"""
        # First, get raw materials
        raw_materials = owner_client.get(f"{BASE_URL}/api/stock/raw-materials").json()
        if len(raw_materials) < 2:
            pytest.skip("Need at least 2 raw materials to test recipe")
        
        # Check if VI Super exists without recipe
        goods = owner_client.get(f"{BASE_URL}/api/stock/intermediate-goods").json()
        vi_super = next((g for g in goods if g['name'] == 'VI Super'), None)
        
        if not vi_super:
            pytest.skip("VI Super not available for recipe testing")
        
        # Set a recipe for VI Super using available raw materials
        # Find Lubricating Oil Super and Polymer
        lub_super = next((rm for rm in raw_materials if 'super' in rm['name'].lower()), None)
        polymer = next((rm for rm in raw_materials if 'polymer' in rm['name'].lower()), None)
        
        if not lub_super or not polymer:
            # Use any two available raw materials
            ingredients = [
                {"raw_material_name": raw_materials[0]['name'], "quantity_per_unit": 0.8},
                {"raw_material_name": raw_materials[1]['name'], "quantity_per_unit": 0.2}
            ]
        else:
            ingredients = [
                {"raw_material_name": lub_super['name'], "quantity_per_unit": 0.8},
                {"raw_material_name": polymer['name'], "quantity_per_unit": 0.2}
            ]
        
        response = owner_client.post(f"{BASE_URL}/api/owner/set-intermediate-recipe", json={
            "intermediate_good_name": "VI Super",
            "ingredients": ingredients
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Recipe set: {data['message']}")
    
    def test_set_recipe_nonexistent_intermediate_good(self, owner_client):
        """Setting recipe for non-existent intermediate good should fail"""
        response = owner_client.post(f"{BASE_URL}/api/owner/set-intermediate-recipe", json={
            "intermediate_good_name": "NONEXISTENT_IG_123",
            "ingredients": [{"raw_material_name": "Test", "quantity_per_unit": 1.0}]
        })
        assert response.status_code == 404
        print("Non-existent intermediate good correctly returns 404")
    
    def test_set_recipe_invalid_raw_material(self, owner_client):
        """Setting recipe with invalid raw material should fail"""
        # Check if VI exists
        goods = owner_client.get(f"{BASE_URL}/api/stock/intermediate-goods").json()
        if not any(g['name'] == 'VI' for g in goods):
            pytest.skip("VI not available")
        
        response = owner_client.post(f"{BASE_URL}/api/owner/set-intermediate-recipe", json={
            "intermediate_good_name": "VI",
            "ingredients": [{"raw_material_name": "NONEXISTENT_RAW_MATERIAL_999", "quantity_per_unit": 1.0}]
        })
        assert response.status_code == 400
        assert "not found" in response.json().get("detail", "").lower()
        print("Invalid raw material correctly rejected")
    
    def test_set_recipe_manager_forbidden(self, manager_client):
        """Manager should get 403 when setting recipes"""
        response = manager_client.post(f"{BASE_URL}/api/owner/set-intermediate-recipe", json={
            "intermediate_good_name": "VI",
            "ingredients": [{"raw_material_name": "Test", "quantity_per_unit": 1.0}]
        })
        assert response.status_code == 403
        print("Manager correctly blocked from setting recipes")


# ==================== MANUFACTURE INTERMEDIATE GOOD TESTS ====================

class TestManufactureIntermediateGood:
    """Tests for POST /api/manager/manufacture-intermediate-good"""
    
    def test_manufacture_intermediate_good_success(self, manager_client, owner_client):
        """Manager can manufacture intermediate good with sufficient raw materials"""
        # Check stock of raw materials first
        raw_materials = owner_client.get(f"{BASE_URL}/api/stock/raw-materials").json()
        print(f"Current raw materials:")
        for rm in raw_materials:
            print(f"  - {rm['name']}: {rm.get('stock', 0)} {rm.get('unit')}")
        
        # Check intermediate goods and recipes
        goods = owner_client.get(f"{BASE_URL}/api/stock/intermediate-goods").json()
        recipes = owner_client.get(f"{BASE_URL}/api/intermediate-recipes").json()
        
        print(f"Intermediate goods: {[g['name'] for g in goods]}")
        print(f"Recipes available for: {[r['intermediate_good_name'] for r in recipes]}")
        
        # Try to manufacture VI (has recipe with Lubricating Oil: 0.8, Polymer: 0.2)
        vi_recipe = next((r for r in recipes if r['intermediate_good_name'] == 'VI'), None)
        if not vi_recipe:
            pytest.skip("VI recipe not available")
        
        print(f"VI Recipe: {vi_recipe['ingredients']}")
        
        # Check if we have enough stock to manufacture 1 unit
        # VI needs: Lubricating Oil: 0.8, Polymer: 0.2
        lub_oil = next((rm for rm in raw_materials if rm['name'] == 'Lubricanting Oil'), None)
        polymer = next((rm for rm in raw_materials if rm['name'] == 'Polymer'), None)
        
        if not lub_oil or not polymer:
            print(f"Lubricating Oil: {lub_oil}")
            print(f"Polymer: {polymer}")
            pytest.skip("Required raw materials not found")
        
        # Check if stock is sufficient
        if lub_oil.get('stock', 0) < 0.8 or polymer.get('stock', 0) < 0.2:
            print(f"Insufficient stock - Lub Oil: {lub_oil.get('stock', 0)}, Polymer: {polymer.get('stock', 0)}")
            
            # Test the error case - should return 400 for insufficient stock
            response = manager_client.post(f"{BASE_URL}/api/manager/manufacture-intermediate-good", json={
                "intermediate_good_name": "VI",
                "quantity": 1.0
            })
            assert response.status_code == 400
            assert "insufficient" in response.json().get("detail", "").lower()
            print("Correctly returned insufficient stock error")
            return
        
        # Manufacture a small quantity
        response = manager_client.post(f"{BASE_URL}/api/manager/manufacture-intermediate-good", json={
            "intermediate_good_name": "VI",
            "quantity": 1.0
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "new_stock" in data
        print(f"Manufactured VI: {data}")
    
    def test_manufacture_without_recipe_fails(self, manager_client, owner_client):
        """Manufacturing without recipe should fail"""
        # Create a test IG without recipe
        test_ig_name = f"TEST_IG_NO_RECIPE_{int(time.time())}"
        add_response = owner_client.post(f"{BASE_URL}/api/owner/add-intermediate-good", json={
            "name": test_ig_name,
            "unit": "litres"
        })
        assert add_response.status_code == 200
        
        try:
            # Try to manufacture without recipe
            response = manager_client.post(f"{BASE_URL}/api/manager/manufacture-intermediate-good", json={
                "intermediate_good_name": test_ig_name,
                "quantity": 1.0
            })
            assert response.status_code == 400
            assert "no recipe" in response.json().get("detail", "").lower()
            print("Manufacturing without recipe correctly rejected")
        finally:
            # Cleanup
            owner_client.delete(f"{BASE_URL}/api/owner/delete-intermediate-good/{test_ig_name}")
    
    def test_manufacture_owner_forbidden(self, owner_client):
        """Owner should get 403 when trying to manufacture intermediate goods"""
        response = owner_client.post(f"{BASE_URL}/api/manager/manufacture-intermediate-good", json={
            "intermediate_good_name": "VI",
            "quantity": 1.0
        })
        assert response.status_code == 403
        assert "manager" in response.json().get("detail", "").lower()
        print("Owner correctly blocked from manufacturing intermediate goods")
    
    def test_manufacture_nonexistent_good_fails(self, manager_client):
        """Manufacturing non-existent intermediate good should fail"""
        response = manager_client.post(f"{BASE_URL}/api/manager/manufacture-intermediate-good", json={
            "intermediate_good_name": "NONEXISTENT_IG_999",
            "quantity": 1.0
        })
        assert response.status_code == 404
        print("Non-existent intermediate good correctly returns 404")


# ==================== INTEGRATION TESTS ====================

class TestIntermediateGoodsIntegration:
    """Integration tests for intermediate goods in loose oil recipes"""
    
    def test_intermediate_goods_available_as_raw_materials(self, owner_client):
        """After manufacturing, intermediate goods should appear in raw materials"""
        # Get intermediate goods
        igs = owner_client.get(f"{BASE_URL}/api/stock/intermediate-goods").json()
        raw_materials = owner_client.get(f"{BASE_URL}/api/stock/raw-materials").json()
        
        print(f"Intermediate goods: {[g['name'] for g in igs]}")
        raw_names = [rm['name'] for rm in raw_materials]
        print(f"Raw materials include: {raw_names[:10]}...")
        
        # Check if any intermediate good is in raw materials
        ig_names = {g['name'] for g in igs}
        ig_in_raw = ig_names.intersection(set(raw_names))
        
        if ig_in_raw:
            print(f"Intermediate goods found in raw materials: {ig_in_raw}")
        else:
            print("No intermediate goods yet in raw materials (need to manufacture first)")
    
    def test_verify_vi_recipe_structure(self, owner_client):
        """Verify VI has correct recipe structure"""
        recipes = owner_client.get(f"{BASE_URL}/api/intermediate-recipes").json()
        vi_recipe = next((r for r in recipes if r['intermediate_good_name'] == 'VI'), None)
        
        if vi_recipe:
            print(f"VI Recipe: {vi_recipe}")
            assert 'ingredients' in vi_recipe
            assert isinstance(vi_recipe['ingredients'], list)
            for ing in vi_recipe['ingredients']:
                assert 'raw_material_name' in ing
                assert 'quantity_per_unit' in ing
            print("VI recipe structure is valid")
        else:
            print("VI recipe not found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
