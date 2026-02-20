#!/usr/bin/env python3
"""
Targeted Test Suite for NEW Packing Material and Loose Oil Endpoints
As requested in the review: Testing specific NEW endpoints added to the API
"""

import requests
import json
import sys

# Base configuration
BASE_URL = "https://oil-inventory-debug.preview.emergentagent.com/api"

class NewEndpointsTest:
    def __init__(self):
        self.owner_token = None
        self.manager_token = None
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: str = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        }
        self.test_results.append(result)
        
        if success:
            print(f"✅ {test_name}: {message}")
        else:
            print(f"❌ {test_name}: {message}")
            if details:
                print(f"   Details: {details}")

    def make_request(self, method: str, endpoint: str, data=None, token: str = None):
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
                
        except requests.RequestException as e:
            return {
                "status_code": 0,
                "data": str(e),
                "success": False
            }

    def authenticate(self):
        """Authenticate both owner and manager"""
        print("🔐 Authenticating users...")
        
        # Owner login
        owner_login = {"email": "owner@lubricant.com", "password": "owner123"}
        response = self.make_request("POST", "/auth/login", owner_login)
        if response["success"]:
            self.owner_token = response["data"]["access_token"]
            self.log_result("Owner Authentication", True, "Owner authenticated successfully")
        else:
            self.log_result("Owner Authentication", False, f"Failed: {response['data']}")
            return False

        # Manager login  
        manager_login = {"email": "manager@lubricant.com", "password": "manager123"}
        response = self.make_request("POST", "/auth/login", manager_login)
        if response["success"]:
            self.manager_token = response["data"]["access_token"]
            self.log_result("Manager Authentication", True, "Manager authenticated successfully")
        else:
            self.log_result("Manager Authentication", False, f"Failed: {response['data']}")
            return False
            
        return True

    def test_packing_material_endpoints(self):
        """Test NEW packing material edit/delete endpoints"""
        print("\n🔧 Testing NEW Packing Material Endpoints")
        print("-" * 50)
        
        if not self.owner_token:
            self.log_result("Packing Material Tests", False, "No authentication")
            return

        # 1. PUT /api/owner/edit-packing-material - Edit name and size_label
        print("\n1. Testing PUT /api/owner/edit-packing-material")
        
        # Setup: Create test packing material
        setup_data = {"name": "ReviewTest Pack 500ml", "size_label": "500ml"}
        self.make_request("POST", "/owner/add-packing-material", setup_data, self.owner_token)
        
        edit_data = {
            "name": "ReviewTest Pack 500ml",
            "new_name": "ReviewTest Updated Pack 1L", 
            "new_size_label": "1L"
        }
        
        response = self.make_request("PUT", "/owner/edit-packing-material", edit_data, self.owner_token)
        if response["success"]:
            self.log_result(
                "Edit Packing Material (Name + Size)", 
                True, 
                "Successfully edited both name and size_label"
            )
        else:
            self.log_result(
                "Edit Packing Material (Name + Size)", 
                False, 
                "Failed to edit packing material",
                str(response["data"])
            )

        # Test editing only size_label
        edit_size = {
            "name": "ReviewTest Updated Pack 1L",
            "new_size_label": "2L"
        }
        
        response = self.make_request("PUT", "/owner/edit-packing-material", edit_size, self.owner_token)
        if response["success"]:
            self.log_result(
                "Edit Packing Material (Size Only)", 
                True, 
                "Successfully edited size_label only"
            )
        else:
            self.log_result(
                "Edit Packing Material (Size Only)", 
                False, 
                "Failed to edit size only",
                str(response["data"])
            )

        # Test RBAC - Manager should get 403
        response = self.make_request("PUT", "/owner/edit-packing-material", edit_data, self.manager_token)
        if response["status_code"] == 403:
            self.log_result(
                "Edit Packing Material RBAC", 
                True, 
                "Manager correctly denied access (403)"
            )
        else:
            self.log_result(
                "Edit Packing Material RBAC", 
                False, 
                f"Expected 403, got {response['status_code']}",
                str(response["data"])
            )

        # 2. DELETE /api/owner/delete-packing-material/{name}
        print("\n2. Testing DELETE /api/owner/delete-packing-material/{name}")
        
        # Create a finished product to test deletion prevention
        product_data = {
            "name": "ReviewTest Product",
            "pack_size": "2L",
            "linked_loose_oil": "15W40",
            "linked_packing_material": "ReviewTest Updated Pack 1L"
        }
        
        self.make_request("POST", "/owner/add-finished-product", product_data, self.owner_token)
        
        # Try to delete packing material used in finished product (should fail)
        response = self.make_request("DELETE", "/owner/delete-packing-material/ReviewTest Updated Pack 1L", None, self.owner_token)
        if not response["success"] and "used by finished product" in str(response["data"]):
            self.log_result(
                "Delete Used Packing Material", 
                True, 
                "Correctly prevented deletion of material used in finished product"
            )
        else:
            self.log_result(
                "Delete Used Packing Material", 
                False, 
                "Should have prevented deletion",
                str(response["data"])
            )

        # Create and delete unused packing material
        deletable_data = {"name": "ReviewTest Deletable Pack", "size_label": "250ml"}
        self.make_request("POST", "/owner/add-packing-material", deletable_data, self.owner_token)
        
        response = self.make_request("DELETE", "/owner/delete-packing-material/ReviewTest Deletable Pack", None, self.owner_token)
        if response["success"]:
            self.log_result(
                "Delete Unused Packing Material", 
                True, 
                "Successfully deleted unused packing material"
            )
        else:
            self.log_result(
                "Delete Unused Packing Material", 
                False, 
                "Failed to delete unused material",
                str(response["data"])
            )

        # Test RBAC for deletion - Manager should get 403
        response = self.make_request("DELETE", "/owner/delete-packing-material/SomePack", None, self.manager_token)
        if response["status_code"] == 403:
            self.log_result(
                "Delete Packing Material RBAC", 
                True, 
                "Manager correctly denied access (403)"
            )
        else:
            self.log_result(
                "Delete Packing Material RBAC", 
                False, 
                f"Expected 403, got {response['status_code']}",
                str(response["data"])
            )

    def test_loose_oil_endpoints(self):
        """Test NEW loose oil add/edit/delete endpoints"""
        print("\n🛢️  Testing NEW Loose Oil Endpoints")
        print("-" * 50)
        
        if not self.owner_token:
            self.log_result("Loose Oil Tests", False, "No authentication")
            return

        # 3. POST /api/owner/add-loose-oil
        print("\n3. Testing POST /api/owner/add-loose-oil")
        
        add_oil_data = {"name": "ReviewTest Oil"}
        
        response = self.make_request("POST", "/owner/add-loose-oil", add_oil_data, self.owner_token)
        if response["success"]:
            self.log_result(
                "Add New Loose Oil", 
                True, 
                f"Successfully added loose oil: {response['data']['oil']['name']}"
            )
        elif "already exists" in str(response["data"]):
            self.log_result("Add New Loose Oil", True, "Loose oil already exists (from previous test run)")
        else:
            self.log_result(
                "Add New Loose Oil", 
                False, 
                "Failed to add loose oil",
                str(response["data"])
            )

        # Test duplicate prevention
        response = self.make_request("POST", "/owner/add-loose-oil", add_oil_data, self.owner_token)
        if not response["success"] and "already exists" in str(response["data"]):
            self.log_result(
                "Add Duplicate Loose Oil", 
                True, 
                "Correctly prevented duplicate creation"
            )
        else:
            self.log_result(
                "Add Duplicate Loose Oil", 
                False, 
                "Should have prevented duplicate",
                str(response["data"])
            )

        # Test RBAC - Manager should get 403
        response = self.make_request("POST", "/owner/add-loose-oil", add_oil_data, self.manager_token)
        if response["status_code"] == 403:
            self.log_result(
                "Add Loose Oil RBAC", 
                True, 
                "Manager correctly denied access (403)"
            )
        else:
            self.log_result(
                "Add Loose Oil RBAC", 
                False, 
                f"Expected 403, got {response['status_code']}",
                str(response["data"])
            )

        # 4. PUT /api/owner/edit-loose-oil
        print("\n4. Testing PUT /api/owner/edit-loose-oil")
        
        edit_oil_data = {
            "name": "ReviewTest Oil",
            "new_name": "ReviewTest Renamed Oil"
        }
        
        response = self.make_request("PUT", "/owner/edit-loose-oil", edit_oil_data, self.owner_token)
        if response["success"]:
            self.log_result(
                "Edit Loose Oil Name", 
                True, 
                "Successfully renamed loose oil"
            )
        else:
            self.log_result(
                "Edit Loose Oil Name", 
                False, 
                "Failed to rename loose oil",
                str(response["data"])
            )

        # Test RBAC for editing - Manager should get 403
        response = self.make_request("PUT", "/owner/edit-loose-oil", edit_oil_data, self.manager_token)
        if response["status_code"] == 403:
            self.log_result(
                "Edit Loose Oil RBAC", 
                True, 
                "Manager correctly denied access (403)"
            )
        else:
            self.log_result(
                "Edit Loose Oil RBAC", 
                False, 
                f"Expected 403, got {response['status_code']}",
                str(response["data"])
            )

        # 5. DELETE /api/owner/delete-loose-oil/{name}
        print("\n5. Testing DELETE /api/owner/delete-loose-oil/{name}")
        
        # Create a recipe to test deletion prevention
        recipe_data = {
            "loose_oil_name": "ReviewTest Renamed Oil",
            "ingredients": [{"raw_material_name": "Seiko", "percentage": 100.0}]
        }
        
        response = self.make_request("POST", "/owner/set-recipe", recipe_data, self.owner_token)
        if response["success"]:
            # Try to delete loose oil with recipe (should fail)
            response = self.make_request("DELETE", "/owner/delete-loose-oil/ReviewTest Renamed Oil", None, self.owner_token)
            if not response["success"] and "has a recipe" in str(response["data"]):
                self.log_result(
                    "Delete Loose Oil (Has Recipe)", 
                    True, 
                    "Correctly prevented deletion of oil with recipe"
                )
            else:
                self.log_result(
                    "Delete Loose Oil (Has Recipe)", 
                    False, 
                    "Should have prevented deletion",
                    str(response["data"])
                )

        # Create and delete unused loose oil
        deletable_oil = {"name": "ReviewTest Deletable Oil"}
        self.make_request("POST", "/owner/add-loose-oil", deletable_oil, self.owner_token)
        
        response = self.make_request("DELETE", "/owner/delete-loose-oil/ReviewTest Deletable Oil", None, self.owner_token)
        if response["success"]:
            self.log_result(
                "Delete Unused Loose Oil", 
                True, 
                "Successfully deleted unused loose oil"
            )
        else:
            self.log_result(
                "Delete Unused Loose Oil", 
                False, 
                "Failed to delete unused oil",
                str(response["data"])
            )

        # Test RBAC for deletion - Manager should get 403
        response = self.make_request("DELETE", "/owner/delete-loose-oil/SomeOil", None, self.manager_token)
        if response["status_code"] == 403:
            self.log_result(
                "Delete Loose Oil RBAC", 
                True, 
                "Manager correctly denied access (403)"
            )
        else:
            self.log_result(
                "Delete Loose Oil RBAC", 
                False, 
                f"Expected 403, got {response['status_code']}",
                str(response["data"])
            )

    def run_tests(self):
        """Run all targeted tests"""
        print("🧪 NEW ENDPOINTS TESTING - Lubricant Stock Management API")
        print("=" * 70)
        print("Testing the specific NEW endpoints as requested in review:")
        print("• PUT /api/owner/edit-packing-material")
        print("• DELETE /api/owner/delete-packing-material/{name}")
        print("• POST /api/owner/add-loose-oil")
        print("• PUT /api/owner/edit-loose-oil")
        print("• DELETE /api/owner/delete-loose-oil/{name}")
        print("=" * 70)
        
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        self.test_packing_material_endpoints()
        self.test_loose_oil_endpoints()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 NEW ENDPOINTS TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        failed_list = [t for t in self.test_results if not t["success"]]
        if failed_list:
            print("\n❌ FAILED TESTS:")
            for test in failed_list:
                print(f"   - {test['test']}: {test['message']}")
        else:
            print("\n🎉 ALL NEW ENDPOINTS WORKING CORRECTLY!")
                
        return failed_tests == 0

if __name__ == "__main__":
    tester = NewEndpointsTest()
    success = tester.run_tests()
    sys.exit(0 if success else 1)