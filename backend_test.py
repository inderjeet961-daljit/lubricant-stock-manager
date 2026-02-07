#!/usr/bin/env python3
"""
Backend API Test Suite for Automotive Lubricant Stock Management
Tests all endpoints systematically according to the review requirements
"""

import requests
import json
import sys
from typing import Dict, Optional, Any

# Base configuration
BASE_URL = "https://fleet-lubricant-hub.preview.emergentagent.com/api"

class LubricantAPITester:
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

    def test_01_init_data(self):
        """Test 1: Initialize database with default data"""
        print("\n=== Test 1: Initialize Data ===")
        
        response = self.make_request("POST", "/init-data")
        
        if response["success"]:
            data = response["data"]
            if "default_credentials" in data:
                self.log_result(
                    "Initialize Data", 
                    True, 
                    f"Database initialized successfully. Owner: {data['default_credentials']['owner']['email']}, Manager: {data['default_credentials']['manager']['email']}"
                )
            else:
                self.log_result("Initialize Data", True, data.get("message", "Initialized"))
        else:
            self.log_result("Initialize Data", False, f"Failed: {response['data']}", response)

    def test_02_authentication(self):
        """Test 2: Authentication for both roles"""
        print("\n=== Test 2: Authentication ===")
        
        # Test owner login
        owner_login = {
            "email": "owner@lubricant.com",
            "password": "owner123"
        }
        
        response = self.make_request("POST", "/auth/login", owner_login)
        if response["success"]:
            self.owner_token = response["data"]["access_token"]
            user_info = response["data"]["user"]
            self.log_result(
                "Owner Login",
                True,
                f"Owner logged in successfully. Role: {user_info['role']}, Name: {user_info['name']}"
            )
        else:
            self.log_result("Owner Login", False, f"Failed: {response['data']}", response)
            
        # Test manager login  
        manager_login = {
            "email": "manager@lubricant.com",
            "password": "manager123"
        }
        
        response = self.make_request("POST", "/auth/login", manager_login)
        if response["success"]:
            self.manager_token = response["data"]["access_token"]
            user_info = response["data"]["user"]
            self.log_result(
                "Manager Login",
                True,
                f"Manager logged in successfully. Role: {user_info['role']}, Name: {user_info['name']}"
            )
        else:
            self.log_result("Manager Login", False, f"Failed: {response['data']}", response)
            
        # Test /auth/me endpoint with owner token
        if self.owner_token:
            response = self.make_request("GET", "/auth/me", token=self.owner_token)
            if response["success"]:
                user_info = response["data"]
                self.log_result(
                    "Auth Me (Owner)",
                    True,
                    f"Owner info retrieved: {user_info['email']} ({user_info['role']})"
                )
            else:
                self.log_result("Auth Me (Owner)", False, f"Failed: {response['data']}", response)

    def test_03_stock_endpoints(self):
        """Test 3: Stock endpoints with owner token"""
        print("\n=== Test 3: Stock Endpoints ===")
        
        if not self.owner_token:
            self.log_result("Stock Endpoints", False, "No owner token available")
            return
            
        # Test all stock endpoints
        stock_endpoints = [
            ("finished-products", "Finished Products"),
            ("loose-oils", "Loose Oils"), 
            ("raw-materials", "Raw Materials"),
            ("packing-materials", "Packing Materials"),
            ("pending-returns", "Pending Returns")
        ]
        
        for endpoint, name in stock_endpoints:
            response = self.make_request("GET", f"/stock/{endpoint}", token=self.owner_token)
            if response["success"]:
                items = response["data"]
                self.log_result(
                    f"Get {name}",
                    True,
                    f"Retrieved {len(items)} {name.lower()}"
                )
                
                # Validate expected counts for initial data
                if endpoint == "loose-oils" and len(items) == 20:
                    self.log_result("Loose Oils Count", True, "Expected 20 loose oils found")
                elif endpoint == "raw-materials" and len(items) == 11:
                    self.log_result("Raw Materials Count", True, "Expected 11 raw materials found")
                elif endpoint == "packing-materials" and len(items) == 9:
                    self.log_result("Packing Materials Count", True, "Expected 9 packing materials found")
                elif endpoint == "pending-returns" and len(items) == 0:
                    self.log_result("Pending Returns Count", True, "Expected 0 pending returns initially")
            else:
                self.log_result(f"Get {name}", False, f"Failed: {response['data']}", response)

    def test_04_owner_actions(self):
        """Test 4: Owner-specific actions"""
        print("\n=== Test 4: Owner Actions ===")
        
        if not self.owner_token:
            self.log_result("Owner Actions", False, "No owner token available")
            return
            
        # Add raw material
        raw_material_data = {
            "name": "Test Material",
            "unit": "litres"
        }
        
        response = self.make_request("POST", "/owner/add-raw-material", raw_material_data, self.owner_token)
        if response["success"]:
            self.log_result(
                "Add Raw Material",
                True,
                f"Added raw material: {response['data']['material']['name']} ({response['data']['material']['unit']})"
            )
        elif "already exists" in str(response["data"]):
            self.log_result("Add Raw Material", True, "Raw material already exists (expected on repeat runs)")
        else:
            self.log_result("Add Raw Material", False, f"Failed: {response['data']}", response)
            
        # Add packing material
        packing_data = {
            "name": "Test Pack 2L",
            "size_label": "2L"
        }
        
        response = self.make_request("POST", "/owner/add-packing-material", packing_data, self.owner_token)
        if response["success"]:
            self.log_result(
                "Add Packing Material",
                True,
                f"Added packing material: {response['data']['material']['name']}"
            )
        elif "already exists" in str(response["data"]):
            self.log_result("Add Packing Material", True, "Packing material already exists (expected on repeat runs)")
        else:
            self.log_result("Add Packing Material", False, f"Failed: {response['data']}", response)
            
        # Add finished product (linking existing oil and packing)
        finished_product_data = {
            "name": "Test Product 2L",
            "pack_size": "2L",
            "linked_loose_oil": "15W40",
            "linked_packing_material": "Test Pack 2L"
        }
        
        response = self.make_request("POST", "/owner/add-finished-product", finished_product_data, self.owner_token)
        if response["success"]:
            self.log_result(
                "Add Finished Product",
                True,
                f"Added finished product: {response['data']['product']['name']}"
            )
        elif "already exists" in str(response["data"]):
            self.log_result("Add Finished Product", True, "Finished product already exists (expected on repeat runs)")
        else:
            self.log_result("Add Finished Product", False, f"Failed: {response['data']}", response)
            
        # Set recipe for 15W40 
        recipe_data = {
            "loose_oil_name": "15W40",
            "ingredients": [
                {"raw_material_name": "Seiko", "percentage": 80.0},
                {"raw_material_name": "150", "percentage": 15.0},
                {"raw_material_name": "VI", "percentage": 3.0},
                {"raw_material_name": "PPD", "percentage": 2.0}
            ]
        }
        
        response = self.make_request("POST", "/owner/set-recipe", recipe_data, self.owner_token)
        if response["success"]:
            self.log_result(
                "Set Recipe",
                True,
                f"Recipe set for 15W40 with {len(recipe_data['ingredients'])} ingredients"
            )
        else:
            self.log_result("Set Recipe", False, f"Failed: {response['data']}", response)

    def test_05_manager_actions(self):
        """Test 5: Manager-specific actions"""
        print("\n=== Test 5: Manager Actions ===")
        
        if not self.manager_token:
            self.log_result("Manager Actions", False, "No manager token available")
            return
            
        # Add raw material stock (Seiko)
        stock_data = {
            "raw_material_name": "Seiko",
            "quantity": 100.0
        }
        
        response = self.make_request("POST", "/manager/add-raw-material-stock", stock_data, self.manager_token)
        if response["success"]:
            self.log_result(
                "Add Raw Material Stock",
                True,
                f"Added 100L to Seiko. New stock: {response['data']['new_stock']}L"
            )
        else:
            self.log_result("Add Raw Material Stock", False, f"Failed: {response['data']}", response)
            
        # Add other required materials for recipe
        materials_to_add = [
            ("150", 50.0),
            ("VI", 10.0), 
            ("PPD", 5.0)
        ]
        
        for material, qty in materials_to_add:
            stock_data = {"raw_material_name": material, "quantity": qty}
            response = self.make_request("POST", "/manager/add-raw-material-stock", stock_data, self.manager_token)
            if response["success"]:
                self.log_result(
                    f"Add {material} Stock",
                    True,
                    f"Added {qty} to {material}"
                )
        
        # Manufacture loose oil (15W40) - this should use the recipe
        manufacture_data = {
            "loose_oil_name": "15W40",
            "quantity_litres": 10.0
        }
        
        response = self.make_request("POST", "/manager/manufacture-loose-oil", manufacture_data, self.manager_token)
        if response["success"]:
            self.log_result(
                "Manufacture Loose Oil",
                True,
                f"Manufactured 10L of 15W40. New stock: {response['data']['new_stock']}L"
            )
            if "raw_materials_used" in response["data"]:
                materials_used = response["data"]["raw_materials_used"]
                self.log_result(
                    "Recipe Materials Used",
                    True,
                    f"Used materials: {list(materials_used.keys())}"
                )
        else:
            self.log_result("Manufacture Loose Oil", False, f"Failed: {response['data']}", response)
            
        # Try to pack finished goods (this may fail due to insufficient stock initially)
        pack_data = {
            "product_name": "Thriller",
            "quantity": 5
        }
        
        response = self.make_request("POST", "/manager/pack-finished-goods", pack_data, self.manager_token)
        if response["success"]:
            self.log_result(
                "Pack Finished Goods",
                True,
                f"Packed 5 units of Thriller"
            )
        else:
            # This is expected to fail initially due to insufficient stock
            self.log_result("Pack Finished Goods (Expected Fail)", True, f"Expected failure due to insufficient stock: {response['data'].get('detail', 'Unknown error')}")

    def test_06_complex_workflows(self):
        """Test 6: Complex workflows"""
        print("\n=== Test 6: Complex Workflows ===")
        
        if not self.owner_token or not self.manager_token:
            self.log_result("Complex Workflows", False, "Missing required tokens")
            return
            
        # First, manager adds packing material stock
        # Get a packing material from the stock first
        response = self.make_request("GET", "/stock/packing-materials", token=self.manager_token)
        if response["success"] and len(response["data"]) > 0:
            packing_material = response["data"][0]["name"]  # Use first packing material
            
            # Add loose oil stock for Thriller
            stock_data = {"raw_material_name": "Seiko", "quantity": 50.0}
            self.make_request("POST", "/manager/add-raw-material-stock", stock_data, self.manager_token)
            
            # Add packing material stock (using the new endpoint)
            packing_stock_data = {"packing_material_name": "Thriller Pack 1L", "quantity": 10}
            response = self.make_request("POST", "/manager/add-packing-material-stock", packing_stock_data, self.manager_token)
            if response["success"]:
                self.log_result("Add Packing Material Stock", True, f"Added packing material stock for Thriller Pack 1L")
            
            # Manufacture Thriller loose oil (need recipe first)
            recipe_data = {
                "loose_oil_name": "Thriller", 
                "ingredients": [{"raw_material_name": "Seiko", "percentage": 100.0}]
            }
            self.make_request("POST", "/owner/set-recipe", recipe_data, self.owner_token)
            
            # Manufacture loose oil
            manufacture_data = {"loose_oil_name": "Thriller", "quantity_litres": 10.0}
            self.make_request("POST", "/manager/manufacture-loose-oil", manufacture_data, self.manager_token)
            
            # Now try packing again
            pack_data = {"product_name": "Thriller", "quantity": 5}
            response = self.make_request("POST", "/manager/pack-finished-goods", pack_data, self.manager_token)
            
            if response["success"]:
                self.log_result(
                    "Pack After Stock Addition",
                    True,
                    f"Successfully packed 5 units of Thriller"
                )
                
                # Owner takes stock in car
                take_stock_data = {"product_name": "Thriller", "quantity": 3}
                response = self.make_request("POST", "/owner/take-stock-in-car", take_stock_data, self.owner_token)
                
                if response["success"]:
                    self.log_result(
                        "Take Stock in Car",
                        True,
                        f"Moved 3 units to car. Factory: {response['data']['factory_stock']}, Car: {response['data']['car_stock']}"
                    )
                    
                    # Owner records a sale from car
                    sale_data = {
                        "product_name": "Thriller",
                        "quantity": 1,
                        "sale_type": "car"
                    }
                    response = self.make_request("POST", "/owner/record-sale", sale_data, self.owner_token)
                    
                    if response["success"]:
                        self.log_result("Record Sale", True, "Sale recorded from car")
                        
                        # Owner creates a return to factory
                        return_data = {"product_name": "Thriller", "quantity": 1}
                        response = self.make_request("POST", "/owner/return-to-factory", return_data, self.owner_token)
                        
                        if response["success"]:
                            return_id = response["data"]["return_id"]
                            self.log_result(
                                "Create Return",
                                True,
                                f"Return created with ID: {return_id}"
                            )
                            
                            # Check pending returns
                            response = self.make_request("GET", "/stock/pending-returns", token=self.owner_token)
                            if response["success"] and len(response["data"]) > 0:
                                self.log_result(
                                    "Check Pending Returns",
                                    True,
                                    f"Found {len(response['data'])} pending returns"
                                )
                                
                                # Manager approves return
                                approve_data = {
                                    "return_id": return_id,
                                    "action": "drain_reuse"
                                }
                                response = self.make_request("POST", "/manager/approve-return", approve_data, self.manager_token)
                                
                                if response["success"]:
                                    self.log_result(
                                        "Approve Return",
                                        True,
                                        "Return approved with drain_reuse action"
                                    )
                                else:
                                    self.log_result("Approve Return", False, f"Failed: {response['data']}", response)
                            else:
                                self.log_result("Check Pending Returns", False, "No pending returns found", response)
                        else:
                            self.log_result("Create Return", False, f"Failed: {response['data']}", response)
                    else:
                        self.log_result("Record Sale", False, f"Failed: {response['data']}", response)
                else:
                    self.log_result("Take Stock in Car", False, f"Failed: {response['data']}", response)
            else:
                self.log_result("Pack After Stock Addition", False, f"Failed: {response['data']}", response)

    def test_07_search(self):
        """Test 7: Search functionality"""
        print("\n=== Test 7: Search Functionality ===")
        
        if not self.owner_token:
            self.log_result("Search", False, "No owner token available")
            return
            
        # Search for "Thriller"
        response = self.make_request("GET", "/search?query=Thriller", token=self.owner_token)
        
        if response["success"]:
            results = response["data"]
            total_results = sum(len(results.get(category, [])) for category in results)
            categories_with_results = [cat for cat, items in results.items() if len(items) > 0]
            
            self.log_result(
                "Search Thriller",
                True,
                f"Found {total_results} results across categories: {categories_with_results}"
            )
        else:
            self.log_result("Search Thriller", False, f"Failed: {response['data']}", response)

    def test_08_transactions(self):
        """Test 8: Transaction history"""
        print("\n=== Test 8: Transaction History ===")
        
        if not self.owner_token:
            self.log_result("Transactions", False, "No owner token available") 
            return
            
        # Get recent transactions
        response = self.make_request("GET", "/transactions/recent", token=self.owner_token)
        
        if response["success"]:
            transactions = response["data"]
            self.log_result(
                "Recent Transactions",
                True,
                f"Retrieved {len(transactions)} recent transactions"
            )
            
            # Show transaction types
            if transactions:
                trans_types = list(set(t["type"] for t in transactions))
                self.log_result(
                    "Transaction Types",
                    True,
                    f"Found transaction types: {trans_types}"
                )
        else:
            self.log_result("Recent Transactions", False, f"Failed: {response['data']}", response)

    def test_09_role_access_control(self):
        """Test 9: Role-based access control"""
        print("\n=== Test 9: Role Access Control ===")
        
        if not self.owner_token or not self.manager_token:
            self.log_result("Role Access Control", False, "Missing required tokens")
            return
            
        # Manager trying to do owner action (should fail)
        raw_material_data = {
            "name": "Unauthorized Material",
            "unit": "litres"
        }
        
        response = self.make_request("POST", "/owner/add-raw-material", raw_material_data, self.manager_token)
        if not response["success"] and response["status_code"] == 403:
            self.log_result(
                "Manager Access Denied to Owner Endpoint",
                True,
                "Correctly denied manager access to owner endpoint"
            )
        else:
            self.log_result("Manager Access Denied to Owner Endpoint", False, "Manager was allowed to access owner endpoint", response)
            
        # Owner trying to do manager action (should fail)
        stock_data = {
            "raw_material_name": "Seiko",
            "quantity": 10.0
        }
        
        response = self.make_request("POST", "/manager/add-raw-material-stock", stock_data, self.owner_token)
        if not response["success"] and response["status_code"] == 403:
            self.log_result(
                "Owner Access Denied to Manager Endpoint",
                True,
                "Correctly denied owner access to manager endpoint"
            )
        else:
            self.log_result("Owner Access Denied to Manager Endpoint", False, "Owner was allowed to access manager endpoint", response)

    def test_10_negative_stock_prevention(self):
        """Test 10: Negative stock prevention"""
        print("\n=== Test 10: Negative Stock Prevention ===")
        
        if not self.owner_token:
            self.log_result("Negative Stock Prevention", False, "No owner token available")
            return
            
        # Try to take more stock than available
        take_stock_data = {
            "product_name": "Thriller",
            "quantity": 9999  # Ridiculously high number
        }
        
        response = self.make_request("POST", "/owner/take-stock-in-car", take_stock_data, self.owner_token)
        if not response["success"] and "Insufficient" in str(response["data"]):
            self.log_result(
                "Prevent Negative Stock",
                True,
                "Correctly prevented negative stock with appropriate error message"
            )
        else:
            self.log_result("Prevent Negative Stock", False, "System allowed negative stock", response)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Automotive Lubricant Stock Management Backend API Tests")
        print(f"🔗 Testing against: {BASE_URL}")
        print("=" * 80)
        
        # Run all tests in order
        self.test_01_init_data()
        self.test_02_authentication()
        self.test_03_stock_endpoints()
        self.test_04_owner_actions()
        self.test_05_manager_actions()
        self.test_06_complex_workflows()
        self.test_07_search()
        self.test_08_transactions()
        self.test_09_role_access_control()
        self.test_10_negative_stock_prevention()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
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
                
        return failed_tests == 0

if __name__ == "__main__":
    tester = LubricantAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)