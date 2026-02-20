#!/usr/bin/env python3
"""
Test Suite for New Raw Material Edit/Delete Endpoints and Improved Recipe Endpoint
Testing according to review requirements:
1. POST /api/owner/set-recipe - Improved recipe endpoint with better error handling
2. PUT /api/owner/edit-raw-material - Edit raw material
3. DELETE /api/owner/delete-raw-material/{name} - Delete raw material
"""

import requests
import json
import sys
from typing import Dict, Optional, Any

# Use the correct backend URL from frontend/.env
BASE_URL = "https://oil-inventory-debug.preview.emergentagent.com/api"

class NewEndpointsTester:
    def __init__(self):
        self.owner_token = None
        self.manager_token = None
        self.test_results = []
        self.failed_tests = []
        
    def log_result(self, test_name: str, success: bool, message: str, response: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "response": response
        }
        self.test_results.append(result)
        
        if success:
            print(f"✅ {test_name}: {message}")
        else:
            print(f"❌ {test_name}: {message}")
            self.failed_tests.append(result)
            if response:
                print(f"   Response: {response}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None) -> Dict:
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
            else:
                raise ValueError(f"Unsupported method: {method}")
                
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
                
        except requests.RequestException as e:
            return {
                "status_code": 0,
                "data": str(e),
                "success": False
            }

    def test_01_setup(self):
        """Test 1: Setup - Initialize data and authenticate"""
        print("\n=== Test 1: Setup - Initialize Data and Authenticate ===")
        
        # Initialize data
        response = self.make_request("POST", "/init-data")
        if response["success"] or "already initialized" in str(response["data"]).lower():
            self.log_result("Initialize Data", True, "Database initialized or already exists")
        else:
            self.log_result("Initialize Data", False, f"Failed: {response['data']}", response)
        
        # Login as owner
        owner_login = {
            "email": "owner@lubricant.com",
            "password": "owner123"
        }
        
        response = self.make_request("POST", "/auth/login", owner_login)
        if response["success"]:
            self.owner_token = response["data"]["access_token"]
            self.log_result("Owner Login", True, "Owner authenticated successfully")
        else:
            self.log_result("Owner Login", False, f"Failed: {response['data']}", response)
            
        # Login as manager
        manager_login = {
            "email": "manager@lubricant.com",
            "password": "manager123"
        }
        
        response = self.make_request("POST", "/auth/login", manager_login)
        if response["success"]:
            self.manager_token = response["data"]["access_token"]
            self.log_result("Manager Login", True, "Manager authenticated successfully")
        else:
            self.log_result("Manager Login", False, f"Failed: {response['data']}", response)

    def test_02_add_test_material(self):
        """Test 2: Add a test raw material for edit/delete testing"""
        print("\n=== Test 2: Add Test Raw Material ===")
        
        if not self.owner_token:
            self.log_result("Add Test Material", False, "No owner token available")
            return
            
        # Add a test raw material
        test_material = {
            "name": "Test Edit Material",
            "unit": "litres"
        }
        
        response = self.make_request("POST", "/owner/add-raw-material", test_material, self.owner_token)
        if response["success"]:
            self.log_result("Add Test Material", True, f"Added test material: {test_material['name']}")
        elif "already exists" in str(response["data"]).lower():
            self.log_result("Add Test Material", True, "Test material already exists (expected on repeat runs)")
        else:
            self.log_result("Add Test Material", False, f"Failed: {response['data']}", response)

    def test_03_improved_recipe_endpoint(self):
        """Test 3: POST /api/owner/set-recipe - Improved recipe endpoint"""
        print("\n=== Test 3: Improved Recipe Endpoint ===")
        
        if not self.owner_token:
            self.log_result("Improved Recipe", False, "No owner token available")
            return
            
        # Test 1: Create a recipe for PSO with valid 100% ingredients
        print("\n--- Test 3a: Valid PSO Recipe (100% total) ---")
        valid_recipe = {
            "loose_oil_name": "PSO",
            "ingredients": [
                {"raw_material_name": "Seiko", "percentage": 70.0},
                {"raw_material_name": "150", "percentage": 20.0},
                {"raw_material_name": "VI", "percentage": 5.0},
                {"raw_material_name": "PPD", "percentage": 5.0}
            ]
        }
        
        response = self.make_request("POST", "/owner/set-recipe", valid_recipe, self.owner_token)
        if response["success"]:
            self.log_result("Valid PSO Recipe", True, "Recipe created successfully with 100% ingredients")
        else:
            self.log_result("Valid PSO Recipe", False, f"Failed: {response['data']}", response)
            
        # Test 2: Test invalid percentage (not summing to 100%)
        print("\n--- Test 3b: Invalid Recipe (95% total) ---")
        invalid_recipe = {
            "loose_oil_name": "PSO",
            "ingredients": [
                {"raw_material_name": "Seiko", "percentage": 70.0},
                {"raw_material_name": "150", "percentage": 20.0},
                {"raw_material_name": "VI", "percentage": 5.0}
                # Total: 95% (missing 5%)
            ]
        }
        
        response = self.make_request("POST", "/owner/set-recipe", invalid_recipe, self.owner_token)
        if not response["success"] and "must total 100%" in str(response["data"]).lower():
            self.log_result("Invalid Recipe Percentage", True, "Correctly rejected recipe with invalid percentage total")
        else:
            self.log_result("Invalid Recipe Percentage", False, f"Did not properly validate percentage: {response['data']}", response)
            
        # Test 3: Test recipe for non-existent loose oil
        print("\n--- Test 3c: Recipe for Non-existent Loose Oil ---")
        invalid_oil_recipe = {
            "loose_oil_name": "NonExistentOil123",
            "ingredients": [
                {"raw_material_name": "Seiko", "percentage": 100.0}
            ]
        }
        
        response = self.make_request("POST", "/owner/set-recipe", invalid_oil_recipe, self.owner_token)
        if not response["success"] and "not found" in str(response["data"]).lower():
            self.log_result("Recipe Non-existent Oil", True, "Correctly rejected recipe for non-existent loose oil")
        else:
            self.log_result("Recipe Non-existent Oil", False, f"Did not validate loose oil existence: {response['data']}", response)
            
        # Test 4: Test recipe with non-existent raw material
        print("\n--- Test 3d: Recipe with Non-existent Raw Material ---")
        invalid_material_recipe = {
            "loose_oil_name": "PSO",
            "ingredients": [
                {"raw_material_name": "NonExistentMaterial123", "percentage": 100.0}
            ]
        }
        
        response = self.make_request("POST", "/owner/set-recipe", invalid_material_recipe, self.owner_token)
        if not response["success"] and "not found" in str(response["data"]).lower():
            self.log_result("Recipe Non-existent Material", True, "Correctly rejected recipe with non-existent raw material")
        else:
            self.log_result("Recipe Non-existent Material", False, f"Did not validate raw material existence: {response['data']}", response)

    def test_04_edit_raw_material(self):
        """Test 4: PUT /api/owner/edit-raw-material - Edit raw material"""
        print("\n=== Test 4: Edit Raw Material Endpoint ===")
        
        if not self.owner_token:
            self.log_result("Edit Raw Material", False, "No owner token available")
            return
            
        # Test 1: Edit name only
        print("\n--- Test 4a: Edit Name Only ---")
        edit_name_data = {
            "name": "Test Edit Material",
            "new_name": "Test Edited Material Name"
        }
        
        response = self.make_request("PUT", "/owner/edit-raw-material", edit_name_data, self.owner_token)
        if response["success"]:
            self.log_result("Edit Name Only", True, "Successfully edited raw material name")
        else:
            self.log_result("Edit Name Only", False, f"Failed: {response['data']}", response)
            
        # Test 2: Edit unit only (using the updated name)
        print("\n--- Test 4b: Edit Unit Only ---")
        edit_unit_data = {
            "name": "Test Edited Material Name",
            "new_unit": "kg"
        }
        
        response = self.make_request("PUT", "/owner/edit-raw-material", edit_unit_data, self.owner_token)
        if response["success"]:
            self.log_result("Edit Unit Only", True, "Successfully edited raw material unit")
        else:
            self.log_result("Edit Unit Only", False, f"Failed: {response['data']}", response)
            
        # Test 3: Edit both name and unit
        print("\n--- Test 4c: Edit Both Name and Unit ---")
        edit_both_data = {
            "name": "Test Edited Material Name",
            "new_name": "Final Test Material",
            "new_unit": "litres"
        }
        
        response = self.make_request("PUT", "/owner/edit-raw-material", edit_both_data, self.owner_token)
        if response["success"]:
            self.log_result("Edit Both Name and Unit", True, "Successfully edited both name and unit")
        else:
            self.log_result("Edit Both Name and Unit", False, f"Failed: {response['data']}", response)
            
        # Test 4: Try to edit non-existent material
        print("\n--- Test 4d: Edit Non-existent Material ---")
        edit_nonexistent_data = {
            "name": "NonExistentMaterial123",
            "new_name": "ShouldNotWork"
        }
        
        response = self.make_request("PUT", "/owner/edit-raw-material", edit_nonexistent_data, self.owner_token)
        if not response["success"] and response["status_code"] == 404:
            self.log_result("Edit Non-existent Material", True, "Correctly returned 404 for non-existent material")
        else:
            self.log_result("Edit Non-existent Material", False, f"Did not handle non-existent material properly: {response['data']}", response)
            
        # Test 5: Manager trying to edit (should fail with 403)
        print("\n--- Test 4e: Manager Access Denied ---")
        if self.manager_token:
            response = self.make_request("PUT", "/owner/edit-raw-material", edit_both_data, self.manager_token)
            if not response["success"] and response["status_code"] == 403:
                self.log_result("Manager Edit Access Denied", True, "Correctly denied manager access to edit endpoint")
            else:
                self.log_result("Manager Edit Access Denied", False, f"Manager was allowed to edit: {response['data']}", response)

    def test_05_delete_raw_material(self):
        """Test 5: DELETE /api/owner/delete-raw-material/{name} - Delete raw material"""
        print("\n=== Test 5: Delete Raw Material Endpoint ===")
        
        if not self.owner_token:
            self.log_result("Delete Raw Material", False, "No owner token available")
            return
            
        # First, add a material that we can safely delete
        safe_to_delete = {
            "name": "SafeToDeleteMaterial",
            "unit": "kg"
        }
        self.make_request("POST", "/owner/add-raw-material", safe_to_delete, self.owner_token)
        
        # Test 1: Delete a raw material that exists and is not used in recipes
        print("\n--- Test 5a: Delete Unused Material ---")
        response = self.make_request("DELETE", "/owner/delete-raw-material/SafeToDeleteMaterial", token=self.owner_token)
        if response["success"]:
            self.log_result("Delete Unused Material", True, "Successfully deleted unused raw material")
        else:
            self.log_result("Delete Unused Material", False, f"Failed: {response['data']}", response)
            
        # Test 2: Try to delete a material used in a recipe
        print("\n--- Test 5b: Delete Material Used in Recipe ---")
        # Seiko should be used in our PSO recipe from test 3
        response = self.make_request("DELETE", "/owner/delete-raw-material/Seiko", token=self.owner_token)
        if not response["success"] and "used in recipe" in str(response["data"]).lower():
            self.log_result("Delete Used Material", True, "Correctly prevented deletion of material used in recipe")
        else:
            self.log_result("Delete Used Material", False, f"Did not prevent deletion of used material: {response['data']}", response)
            
        # Test 3: Try to delete non-existent material
        print("\n--- Test 5c: Delete Non-existent Material ---")
        response = self.make_request("DELETE", "/owner/delete-raw-material/NonExistentMaterial123", token=self.owner_token)
        if not response["success"] and response["status_code"] == 404:
            self.log_result("Delete Non-existent Material", True, "Correctly returned 404 for non-existent material")
        else:
            self.log_result("Delete Non-existent Material", False, f"Did not handle non-existent material properly: {response['data']}", response)
            
        # Test 4: Manager trying to delete (should fail with 403)
        print("\n--- Test 5d: Manager Access Denied ---")
        if self.manager_token:
            response = self.make_request("DELETE", "/owner/delete-raw-material/VI", token=self.manager_token)
            if not response["success"] and response["status_code"] == 403:
                self.log_result("Manager Delete Access Denied", True, "Correctly denied manager access to delete endpoint")
            else:
                self.log_result("Manager Delete Access Denied", False, f"Manager was allowed to delete: {response['data']}", response)

    def test_06_verify_recipe_updates_with_edits(self):
        """Test 6: Verify that recipe ingredients are updated when raw material names change"""
        print("\n=== Test 6: Recipe Updates with Raw Material Name Changes ===")
        
        if not self.owner_token:
            self.log_result("Recipe Updates", False, "No owner token available")
            return
            
        # Add a test material and create a recipe with it
        test_material = {
            "name": "RecipeTestMaterial",
            "unit": "litres"
        }
        self.make_request("POST", "/owner/add-raw-material", test_material, self.owner_token)
        
        # Create a recipe using this material
        recipe_data = {
            "loose_oil_name": "15W40",
            "ingredients": [
                {"raw_material_name": "RecipeTestMaterial", "percentage": 50.0},
                {"raw_material_name": "Seiko", "percentage": 50.0}
            ]
        }
        
        response = self.make_request("POST", "/owner/set-recipe", recipe_data, self.owner_token)
        if response["success"]:
            self.log_result("Create Recipe with Test Material", True, "Created recipe with test material")
            
            # Now edit the raw material name
            edit_data = {
                "name": "RecipeTestMaterial",
                "new_name": "RenamedRecipeTestMaterial"
            }
            
            response = self.make_request("PUT", "/owner/edit-raw-material", edit_data, self.owner_token)
            if response["success"]:
                self.log_result("Edit Material Name in Recipe", True, "Successfully edited raw material name")
                
                # Verify the recipe was updated by getting all recipes
                recipes_response = self.make_request("GET", "/recipes", token=self.owner_token)
                if recipes_response["success"]:
                    recipes = recipes_response["data"]
                    recipe_15w40 = next((r for r in recipes if r["loose_oil_name"] == "15W40"), None)
                    
                    if recipe_15w40:
                        ingredient_names = [ing["raw_material_name"] for ing in recipe_15w40["ingredients"]]
                        if "RenamedRecipeTestMaterial" in ingredient_names and "RecipeTestMaterial" not in ingredient_names:
                            self.log_result("Recipe Ingredient Updated", True, "Recipe ingredient name was correctly updated")
                        else:
                            self.log_result("Recipe Ingredient Updated", False, f"Recipe not updated properly. Ingredients: {ingredient_names}")
                    else:
                        self.log_result("Recipe Ingredient Updated", False, "Could not find 15W40 recipe")
                else:
                    self.log_result("Recipe Ingredient Updated", False, f"Could not fetch recipes: {recipes_response['data']}")
            else:
                self.log_result("Edit Material Name in Recipe", False, f"Failed to edit material: {response['data']}", response)
        else:
            self.log_result("Create Recipe with Test Material", False, f"Failed to create recipe: {response['data']}", response)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Testing New Raw Material Edit/Delete Endpoints and Improved Recipe Endpoint")
        print(f"🔗 Testing against: {BASE_URL}")
        print("=" * 80)
        
        # Run all tests in order
        self.test_01_setup()
        self.test_02_add_test_material()
        self.test_03_improved_recipe_endpoint()
        self.test_04_edit_raw_material()
        self.test_05_delete_raw_material()
        self.test_06_verify_recipe_updates_with_edits()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 NEW ENDPOINTS TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"   - {test['test']}: {test['message']}")
        else:
            print("\n🎉 ALL NEW ENDPOINT TESTS PASSED!")
                
        return failed_tests == 0

if __name__ == "__main__":
    tester = NewEndpointsTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)