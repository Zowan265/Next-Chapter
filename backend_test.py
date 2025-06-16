import requests
import unittest
import random
import string
import os
import time
from datetime import datetime

class NextChapterAPITest(unittest.TestCase):
    def setUp(self):
        # Get the backend URL from environment variable or use the default
        self.base_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://1abeb3f1-959a-44ac-8791-370b609401db.preview.emergentagent.com')
        self.token = None
        self.user_id = None
        self.test_email = f"test_{self.random_string(8)}@example.com"
        self.test_password = "TestPassword123!"
        self.test_name = f"Test User {self.random_string(4)}"
        self.test_age = 30  # Valid age for NextChapter (25+)
        
    def random_string(self, length=8):
        """Generate a random string for test data"""
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))
    
    def test_01_api_root(self):
        """Test the API root endpoint"""
        response = requests.get(f"{self.base_url}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        print(f"✅ API Root: {data['message']}")
    
    def test_02_register_invalid_age(self):
        """Test registration with invalid age (under 35)"""
        payload = {
            "name": self.test_name,
            "email": self.test_email,
            "password": self.test_password,
            "age": 30  # Invalid age (under 35)
        }
        response = requests.post(f"{self.base_url}/api/register", json=payload)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("detail", data)
        self.assertIn("35", data["detail"])
        print(f"✅ Registration with invalid age rejected: {data['detail']}")
    
    def test_03_register_valid(self):
        """Test registration with valid data"""
        payload = {
            "name": self.test_name,
            "email": self.test_email,
            "password": self.test_password,
            "age": self.test_age
        }
        response = requests.post(f"{self.base_url}/api/register", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertIn("user", data)
        self.token = data["token"]
        self.user_id = data["user"]["id"]
        print(f"✅ Registration successful: {data['message']}")
    
    def test_04_login(self):
        """Test login with valid credentials"""
        # First, try to register again to ensure the user exists
        try:
            payload_register = {
                "name": self.test_name,
                "email": self.test_email,
                "password": self.test_password,
                "age": self.test_age
            }
            requests.post(f"{self.base_url}/api/register", json=payload_register)
        except:
            pass  # Ignore if registration fails (user might already exist)
            
        # Now try to login
        payload = {
            "email": self.test_email,
            "password": self.test_password
        }
        response = requests.post(f"{self.base_url}/api/login", json=payload)
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.text[:200]}...")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertIn("user", data)
        self.token = data["token"]
        print(f"✅ Login successful: {data['message']}")
        print(f"Token (first 20 chars): {self.token[:20]}...")
    
    def test_05_get_profile(self):
        """Test getting user profile"""
        headers = {"Authorization": f"Bearer {self.token}"}
        print(f"Authorization header: Bearer {self.token[:20]}...")
        
        response = requests.get(f"{self.base_url}/api/profile", headers=headers)
        print(f"Get profile response status: {response.status_code}")
        print(f"Get profile response: {response.text[:200]}...")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], self.test_email)
        self.assertEqual(data["name"], self.test_name)
        self.assertEqual(data["age"], self.test_age)
        print(f"✅ Profile retrieved successfully for {data['name']}")
    
    def test_06_setup_profile(self):
        """Test profile setup"""
        headers = {"Authorization": f"Bearer {self.token}"}
        print(f"Authorization header: Bearer {self.token[:20]}...")
        
        # Create form data
        form_data = {
            "location": "New York, NY",
            "bio": "I'm a test user created for API testing. I enjoy long walks on the beach and testing APIs.",
            "looking_for": "companionship",
            "interests": "[]"
        }
        
        # We can't easily test file upload in this simple test
        # In a real test, we would include a test image
        
        response = requests.post(
            f"{self.base_url}/api/profile/setup", 
            headers=headers,
            data=form_data
        )
        
        print(f"Profile setup response status: {response.status_code}")
        print(f"Profile setup response: {response.text[:200]}...")
        
        # Check if the request was successful
        if response.status_code != 200:
            print(f"❌ Profile setup failed: {response.text}")
            self.assertEqual(response.status_code, 200)
        else:
            data = response.json()
            self.assertIn("message", data)
            self.assertIn("user", data)
            self.assertEqual(data["user"]["location"], "New York, NY")
            print(f"✅ Profile setup successful: {data['message']}")
    
    def test_07_get_profiles(self):
        """Test getting profiles to browse"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{self.base_url}/api/profiles", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        print(f"✅ Retrieved {len(data)} profiles to browse")
        
        # Save a profile ID for the like test if available
        if len(data) > 0:
            self.profile_to_like = data[0]["id"]
            print(f"  - Saved profile {self.profile_to_like} for like test")
        else:
            self.profile_to_like = None
            print("  - No profiles available to like")
    
    def test_08_like_profile(self):
        """Test liking a profile"""
        if not hasattr(self, 'profile_to_like') or not self.profile_to_like:
            print("⚠️ Skipping like test - no profile available to like")
            return
            
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        payload = {"liked_user_id": self.profile_to_like}
        
        response = requests.post(
            f"{self.base_url}/api/like", 
            headers=headers,
            json=payload
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        self.assertIn("match", data)
        print(f"✅ Like recorded successfully: {data['message']}")
        print(f"  - Match created: {data['match']}")
    
    def test_09_get_matches(self):
        """Test getting matches"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{self.base_url}/api/matches", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        print(f"✅ Retrieved {len(data)} matches")
        
        # Save a match ID for the messaging test if available
        if len(data) > 0:
            self.match_id = data[0]["match_id"]
            print(f"  - Saved match {self.match_id} for messaging test")
        else:
            self.match_id = None
            print("  - No matches available for messaging test")
    
    def test_10_send_message(self):
        """Test sending a message"""
        if not hasattr(self, 'match_id') or not self.match_id:
            print("⚠️ Skipping message test - no match available")
            return
            
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        payload = {
            "match_id": self.match_id,
            "content": f"Hello! This is a test message sent at {datetime.now().strftime('%H:%M:%S')}"
        }
        
        response = requests.post(
            f"{self.base_url}/api/message", 
            headers=headers,
            json=payload
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        print(f"✅ Message sent successfully: {data['message']}")
    
    def test_11_get_messages(self):
        """Test getting messages for a match"""
        if not hasattr(self, 'match_id') or not self.match_id:
            print("⚠️ Skipping get messages test - no match available")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{self.base_url}/api/messages/{self.match_id}", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        print(f"✅ Retrieved {len(data)} messages for match {self.match_id}")
    
    def test_12_get_stats(self):
        """Test getting site statistics"""
        response = requests.get(f"{self.base_url}/api/stats")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_users", data)
        self.assertIn("active_users", data)
        self.assertIn("total_matches", data)
        self.assertIn("total_messages", data)
        print(f"✅ Site statistics: {data}")

def run_tests():
    # Create a test suite
    suite = unittest.TestSuite()
    
    # Add tests in order
    test_cases = [
        'test_01_api_root',
        'test_02_register_invalid_age',
        'test_03_register_valid',
        'test_04_login',
        'test_05_get_profile',
        'test_06_setup_profile',
        'test_07_get_profiles',
        'test_08_like_profile',
        'test_09_get_matches',
        'test_10_send_message',
        'test_11_get_messages',
        'test_12_get_stats'
    ]
    
    for test_case in test_cases:
        suite.addTest(NextChapterAPITest(test_case))
    
    # Run the tests
    print("\n🔍 Starting NextChapter API Tests...\n")
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(suite)

if __name__ == "__main__":
    run_tests()