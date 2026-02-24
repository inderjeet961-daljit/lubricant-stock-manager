#!/usr/bin/env python3
"""
Supplementary RBAC and Edge Case Tests for New Endpoints
"""

import requests
import json

BASE_URL = "https://oil-inventory-app-1.preview.emergentagent.com/api"

def make_request(method: str, endpoint: str, data: dict = None, token: str = None) -> dict:
    """Make HTTP request with proper headers"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=30)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
            
        try:
            return {
                "status_code": response.status_code,
                "data": response.json(),
                "success": 200 <= response.status_code < 300
            }
        except:
            return {
                "status_code": response.status_code,
                "data": response.text,
                "success": 200 <= response.status_code < 300
            }
    except Exception as e:
        return {"status_code": 0, "data": str(e), "success": False}

def main():
    print("🔒 Running Supplementary RBAC and Edge Case Tests")
    
    # Login as owner
    owner_login = {"email": "owner@lubricant.com", "password": "owner123"}
    response = make_request("POST", "/auth/login", owner_login)
    owner_token = response["data"]["access_token"] if response["success"] else None
    
    # Login as manager  
    manager_login = {"email": "manager@lubricant.com", "password": "manager123"}
    response = make_request("POST", "/auth/login", manager_login)
    manager_token = response["data"]["access_token"] if response["success"] else None
    
    print("\n=== RBAC Verification ===")
    
    # Test 1: Manager cannot access owner endpoints
    if manager_token:
        print("\n1. Testing Manager Access to Owner Endpoints:")
        
        # Test recipe endpoint
        recipe_data = {
            "loose_oil_name": "PSO",
            "ingredients": [{"raw_material_name": "Seiko", "percentage": 100.0}]
        }
        response = make_request("POST", "/owner/set-recipe", recipe_data, manager_token)
        print(f"   Recipe (Manager): {'✅ 403 DENIED' if response['status_code'] == 403 else '❌ ALLOWED'}")
        
        # Test edit endpoint
        edit_data = {"name": "Seiko", "new_name": "Modified Seiko"}
        response = make_request("PUT", "/owner/edit-raw-material", edit_data, manager_token)
        print(f"   Edit (Manager): {'✅ 403 DENIED' if response['status_code'] == 403 else '❌ ALLOWED'}")
        
        # Test delete endpoint
        response = make_request("DELETE", "/owner/delete-raw-material/VI", token=manager_token)
        print(f"   Delete (Manager): {'✅ 403 DENIED' if response['status_code'] == 403 else '❌ ALLOWED'}")
    
    # Test 2: Unauthenticated access
    print("\n2. Testing Unauthenticated Access:")
    
    response = make_request("POST", "/owner/set-recipe", recipe_data)
    print(f"   Recipe (No Auth): {'✅ 401/403 DENIED' if response['status_code'] in [401, 403] else '❌ ALLOWED'}")
    
    response = make_request("PUT", "/owner/edit-raw-material", edit_data)
    print(f"   Edit (No Auth): {'✅ 401/403 DENIED' if response['status_code'] in [401, 403] else '❌ ALLOWED'}")
    
    response = make_request("DELETE", "/owner/delete-raw-material/VI")
    print(f"   Delete (No Auth): {'✅ 401/403 DENIED' if response['status_code'] in [401, 403] else '❌ ALLOWED'}")
    
    # Test 3: Edge cases with owner token
    if owner_token:
        print("\n3. Testing Edge Cases with Owner:")
        
        # Test duplicate name edit
        duplicate_edit = {"name": "Seiko", "new_name": "150"}  # 150 already exists
        response = make_request("PUT", "/owner/edit-raw-material", duplicate_edit, owner_token)
        print(f"   Duplicate Name Edit: {'✅ REJECTED' if not response['success'] else '❌ ALLOWED'}")
        
        # Test invalid recipe percentages
        invalid_recipes = [
            # Negative percentage
            {
                "loose_oil_name": "PSO",
                "ingredients": [{"raw_material_name": "Seiko", "percentage": -10.0}]
            },
            # Way over 100%
            {
                "loose_oil_name": "PSO", 
                "ingredients": [
                    {"raw_material_name": "Seiko", "percentage": 80.0},
                    {"raw_material_name": "150", "percentage": 50.0}
                ]
            }
        ]
        
        for i, recipe in enumerate(invalid_recipes):
            response = make_request("POST", "/owner/set-recipe", recipe, owner_token)
            print(f"   Invalid Recipe {i+1}: {'✅ REJECTED' if not response['success'] else '❌ ALLOWED'}")
        
        # Test empty data
        empty_edit = {"name": "Seiko"}  # No new_name or new_unit
        response = make_request("PUT", "/owner/edit-raw-material", empty_edit, owner_token)
        print(f"   Empty Edit Data: {'✅ NO CHANGES' if 'No changes' in str(response.get('data', '')) else '⚠️  OTHER'}")
    
    print("\n✅ Supplementary tests completed!")

if __name__ == "__main__":
    main()