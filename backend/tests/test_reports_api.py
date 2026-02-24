"""
Backend API Tests for Weekly Reports Feature
Tests:
- GET /api/owner/weekly-report - Weekly summary endpoint
- GET /api/owner/daily-report/{date} - Daily detail endpoint
- Access control: only owner role can access reports (403 for manager)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://oil-inventory-app-1.preview.emergentagent.com').rstrip('/')

# Credentials
OWNER_EMAIL = "owner@lubricant.com"
OWNER_PASSWORD = "owner123"
MANAGER_EMAIL = "manager@lubricant.com"
MANAGER_PASSWORD = "manager123"


@pytest.fixture(scope="module")
def owner_token():
    """Get owner authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": OWNER_EMAIL,
        "password": OWNER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Owner login failed: {response.status_code} - {response.text}")
    data = response.json()
    assert "access_token" in data, "Login response missing access_token"
    return data["access_token"]


@pytest.fixture(scope="module")
def manager_token():
    """Get manager authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MANAGER_EMAIL,
        "password": MANAGER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Manager login failed: {response.status_code} - {response.text}")
    data = response.json()
    assert "access_token" in data, "Login response missing access_token"
    return data["access_token"]


@pytest.fixture
def owner_client(owner_token):
    """Session with owner auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {owner_token}"
    })
    return session


@pytest.fixture
def manager_client(manager_token):
    """Session with manager auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {manager_token}"
    })
    return session


class TestAuthentication:
    """Auth endpoint tests"""
    
    def test_owner_login_success(self):
        """Test owner can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        assert response.status_code == 200, f"Owner login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == OWNER_EMAIL
        assert data["user"]["role"] == "owner"
        print("Owner login successful")
    
    def test_manager_login_success(self):
        """Test manager can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == MANAGER_EMAIL
        assert data["user"]["role"] == "manager"
        print("Manager login successful")


class TestWeeklyReportEndpoint:
    """Tests for GET /api/owner/weekly-report"""
    
    def test_weekly_report_returns_200_for_owner(self, owner_client):
        """Weekly report endpoint should return 200 for owner"""
        response = owner_client.get(f"{BASE_URL}/api/owner/weekly-report")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("Weekly report returned 200 for owner")
    
    def test_weekly_report_structure(self, owner_client):
        """Weekly report should have correct data structure"""
        response = owner_client.get(f"{BASE_URL}/api/owner/weekly-report")
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level keys
        assert "period" in data, "Missing 'period' in response"
        assert "summary" in data, "Missing 'summary' in response"
        assert "transactions" in data, "Missing 'transactions' in response"
        
        # Check summary structure
        summary = data["summary"]
        assert "total_transactions" in summary, "Missing 'total_transactions' in summary"
        assert "by_type" in summary, "Missing 'by_type' in summary"
        assert "by_user" in summary, "Missing 'by_user' in summary"
        assert "by_date" in summary, "Missing 'by_date' in summary"
        
        # Validate types
        assert isinstance(summary["total_transactions"], int), "total_transactions should be int"
        assert isinstance(summary["by_type"], dict), "by_type should be dict"
        assert isinstance(summary["by_user"], dict), "by_user should be dict"
        assert isinstance(summary["by_date"], dict), "by_date should be dict"
        assert isinstance(data["transactions"], list), "transactions should be list"
        
        print(f"Weekly report structure valid. Total transactions: {summary['total_transactions']}")
        print(f"Active users: {list(summary['by_user'].keys())}")
        print(f"Active days: {list(summary['by_date'].keys())}")
    
    def test_weekly_report_transaction_structure(self, owner_client):
        """Each transaction in weekly report should have required fields"""
        response = owner_client.get(f"{BASE_URL}/api/owner/weekly-report")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["transactions"]) > 0:
            txn = data["transactions"][0]
            # Check required fields
            required_fields = ["id", "type", "type_label", "user", "timestamp", "date", "time", "data"]
            for field in required_fields:
                assert field in txn, f"Transaction missing field: {field}"
            
            # Validate type_label is human readable
            assert txn["type_label"] is not None and len(txn["type_label"]) > 0
            print(f"First transaction: type={txn['type']}, label={txn['type_label']}, user={txn['user']}")
        else:
            print("No transactions in last 7 days to validate structure")
    
    def test_weekly_report_forbidden_for_manager(self, manager_client):
        """Manager should get 403 when accessing weekly report"""
        response = manager_client.get(f"{BASE_URL}/api/owner/weekly-report")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"Manager correctly denied access: {data['detail']}")
    
    def test_weekly_report_requires_auth(self):
        """Unauthenticated request should get 401/403"""
        response = requests.get(f"{BASE_URL}/api/owner/weekly-report")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"Unauthenticated request correctly denied: {response.status_code}")


class TestDailyReportEndpoint:
    """Tests for GET /api/owner/daily-report/{date}"""
    
    def test_daily_report_returns_200_for_owner(self, owner_client):
        """Daily report endpoint should return 200 for owner"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = owner_client.get(f"{BASE_URL}/api/owner/daily-report/{today}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Daily report for {today} returned 200")
    
    def test_daily_report_structure(self, owner_client):
        """Daily report should have correct data structure"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = owner_client.get(f"{BASE_URL}/api/owner/daily-report/{today}")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "date" in data, "Missing 'date' in response"
        assert "total_transactions" in data, "Missing 'total_transactions' in response"
        assert "by_user" in data, "Missing 'by_user' in response"
        
        # Validate types
        assert data["date"] == today, f"Date mismatch: expected {today}, got {data['date']}"
        assert isinstance(data["total_transactions"], int), "total_transactions should be int"
        assert isinstance(data["by_user"], dict), "by_user should be dict"
        
        print(f"Daily report for {today}: {data['total_transactions']} transactions, users: {list(data['by_user'].keys())}")
    
    def test_daily_report_transaction_details(self, owner_client):
        """Transactions in daily report should have type, time, data"""
        # Try multiple dates to find one with transactions
        for i in range(7):
            date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            response = owner_client.get(f"{BASE_URL}/api/owner/daily-report/{date}")
            assert response.status_code == 200
            data = response.json()
            
            if data["total_transactions"] > 0:
                # Find first user with transactions
                for user, txns in data["by_user"].items():
                    if len(txns) > 0:
                        txn = txns[0]
                        required_fields = ["id", "type", "type_label", "time", "data"]
                        for field in required_fields:
                            assert field in txn, f"Transaction missing field: {field}"
                        print(f"Transaction on {date}: type={txn['type']}, label={txn['type_label']}, time={txn['time']}")
                        return
        
        print("No transactions found in last 7 days to validate details")
    
    def test_daily_report_forbidden_for_manager(self, manager_client):
        """Manager should get 403 when accessing daily report"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = manager_client.get(f"{BASE_URL}/api/owner/daily-report/{today}")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Manager correctly denied access to daily report")
    
    def test_daily_report_invalid_date_format(self, owner_client):
        """Invalid date format should return 400"""
        response = owner_client.get(f"{BASE_URL}/api/owner/daily-report/invalid-date")
        assert response.status_code == 400, f"Expected 400 for invalid date, got {response.status_code}"
        print("Invalid date format correctly rejected")
    
    def test_daily_report_past_date(self, owner_client):
        """Should return report for past dates"""
        # 3 days ago
        past_date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
        response = owner_client.get(f"{BASE_URL}/api/owner/daily-report/{past_date}")
        assert response.status_code == 200, f"Expected 200 for past date, got {response.status_code}"
        data = response.json()
        assert data["date"] == past_date
        print(f"Past date ({past_date}) report: {data['total_transactions']} transactions")


class TestReportDataConsistency:
    """Test data consistency between weekly and daily reports"""
    
    def test_weekly_summary_matches_transactions(self, owner_client):
        """Total in summary should match transactions array length"""
        response = owner_client.get(f"{BASE_URL}/api/owner/weekly-report")
        assert response.status_code == 200
        data = response.json()
        
        assert data["summary"]["total_transactions"] == len(data["transactions"]), \
            f"Summary total ({data['summary']['total_transactions']}) != transactions count ({len(data['transactions'])})"
        print(f"Summary total matches transaction count: {data['summary']['total_transactions']}")
    
    def test_by_type_counts_sum_to_total(self, owner_client):
        """Sum of by_type counts should equal total_transactions"""
        response = owner_client.get(f"{BASE_URL}/api/owner/weekly-report")
        assert response.status_code == 200
        data = response.json()
        
        type_sum = sum(data["summary"]["by_type"].values())
        assert type_sum == data["summary"]["total_transactions"], \
            f"by_type sum ({type_sum}) != total ({data['summary']['total_transactions']})"
        print(f"by_type sum matches total: {type_sum}")
    
    def test_by_user_counts_sum_to_total(self, owner_client):
        """Sum of by_user counts should equal total_transactions"""
        response = owner_client.get(f"{BASE_URL}/api/owner/weekly-report")
        assert response.status_code == 200
        data = response.json()
        
        user_sum = sum(data["summary"]["by_user"].values())
        assert user_sum == data["summary"]["total_transactions"], \
            f"by_user sum ({user_sum}) != total ({data['summary']['total_transactions']})"
        print(f"by_user sum matches total: {user_sum}")
    
    def test_by_date_counts_sum_to_total(self, owner_client):
        """Sum of by_date counts should equal total_transactions"""
        response = owner_client.get(f"{BASE_URL}/api/owner/weekly-report")
        assert response.status_code == 200
        data = response.json()
        
        date_sum = sum(data["summary"]["by_date"].values())
        assert date_sum == data["summary"]["total_transactions"], \
            f"by_date sum ({date_sum}) != total ({data['summary']['total_transactions']})"
        print(f"by_date sum matches total: {date_sum}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
