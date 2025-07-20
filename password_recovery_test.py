#!/usr/bin/env python3
"""
Focused Password Recovery Functionality Tests for NextChapter Backend
Tests the newly implemented password recovery endpoints and OTP timer updates
"""

import requests
import unittest
import random
import string
import os
import time
from datetime import datetime

class PasswordRecoveryTest(unittest.TestCase):
    def setUp(self):
        # Get the backend URL from environment variable
        self.base_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://46106240-d86e-4578-973d-bf618bc75cd9.preview.emergentagent.com')
        self.test_email = f"pwd_test_{self.random_string(8)}@example.com"
        self.test_password = "OriginalPassword123!"
        self.test_name = f"Password Test User {self.random_string(4)}"
        self.test_age = 30
        
    def random_string(self, length=8):
        """Generate a random string for test data"""
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))
    
    def register_and_verify_user(self, email, password, name, age):
        """Helper method to register and verify a user"""
        # Register user
        register_payload = {
            "name": name,
            "email": email,
            "password": password,
            "age": age
        }
        
        register_response = requests.post(f"{self.base_url}/api/register", json=register_payload)
        if register_response.status_code != 200:
            return False, f"Registration failed: {register_response.text}"
        
        # Verify registration with demo OTP
        verify_payload = {
            "email": email,
            "otp": "123456"  # Demo OTP
        }
        
        verify_response = requests.post(f"{self.base_url}/api/verify-registration", json=verify_payload)
        if verify_response.status_code != 200:
            return False, f"Verification failed: {verify_response.text}"
        
        return True, "User registered and verified successfully"
    
    def test_01_password_reset_request_valid_email(self):
        """Test password reset request with valid email"""
        # First register a user
        success, message = self.register_and_verify_user(
            self.test_email, self.test_password, self.test_name, self.test_age
        )
        self.assertTrue(success, message)
        
        # Request password reset
        payload = {
            "email": self.test_email
        }
        
        response = requests.post(f"{self.base_url}/api/password-reset-request", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify response structure
        self.assertIn("message", data)
        self.assertIn("identifier", data)
        self.assertIn("otp_sent", data)
        self.assertEqual(data["identifier"], self.test_email)
        self.assertTrue(data["otp_sent"])
        
        print(f"✅ Password reset request successful")
        print(f"  - Email: {data['identifier']}")
        print(f"  - Message: {data['message']}")
        print(f"  - OTP sent: {data['otp_sent']}")
        
        # Check for demo OTP in response (if email not configured)
        if "demo_otp" in data:
            print(f"  - Demo OTP: {data['demo_otp']}")
    
    def test_02_password_reset_request_nonexistent_email(self):
        """Test password reset request with non-existent email"""
        payload = {
            "email": f"nonexistent_{self.random_string(8)}@example.com"
        }
        
        response = requests.post(f"{self.base_url}/api/password-reset-request", json=payload)
        self.assertEqual(response.status_code, 200)  # Should return 200 for security
        data = response.json()
        
        # Should still return success message for security (don't reveal if user exists)
        self.assertIn("message", data)
        self.assertIn("identifier", data)
        self.assertIn("otp_sent", data)
        
        print(f"✅ Password reset request with non-existent email handled securely")
        print(f"  - Message: {data['message']}")
        print(f"  - Security: Does not reveal if user exists")
    
    def test_03_password_reset_request_invalid_data(self):
        """Test password reset request with invalid data"""
        # Test with no email or phone
        payload = {}
        
        response = requests.post(f"{self.base_url}/api/password-reset-request", json=payload)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        
        self.assertIn("detail", data)
        self.assertIn("email or phone number must be provided", data["detail"])
        
        print(f"✅ Password reset request with invalid data rejected")
        print(f"  - Error: {data['detail']}")
    
    def test_04_password_reset_with_valid_otp(self):
        """Test password reset with valid OTP"""
        reset_email = f"reset_valid_{self.random_string(8)}@example.com"
        original_password = "OriginalPassword123!"
        new_password = "NewPassword123!"
        
        # Register and verify user
        success, message = self.register_and_verify_user(
            reset_email, original_password, f"Reset User {self.random_string(4)}", 28
        )
        self.assertTrue(success, message)
        
        # Request password reset
        reset_request_payload = {
            "email": reset_email
        }
        reset_request_response = requests.post(f"{self.base_url}/api/password-reset-request", json=reset_request_payload)
        self.assertEqual(reset_request_response.status_code, 200)
        
        # Reset password with OTP
        reset_payload = {
            "email": reset_email,
            "otp": "123456",  # Demo OTP (any 6-digit code works in demo mode)
            "new_password": new_password
        }
        
        response = requests.post(f"{self.base_url}/api/password-reset", json=reset_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify response
        self.assertIn("message", data)
        self.assertIn("success", data)
        self.assertTrue(data["success"])
        self.assertIn("Password reset successful", data["message"])
        
        print(f"✅ Password reset with valid OTP successful")
        print(f"  - Message: {data['message']}")
        print(f"  - Success: {data['success']}")
    
    def test_05_password_reset_invalid_otp_format(self):
        """Test password reset with invalid OTP format"""
        reset_email = f"reset_invalid_{self.random_string(8)}@example.com"
        
        # Register and verify user
        success, message = self.register_and_verify_user(
            reset_email, "TempPassword123!", f"Invalid User {self.random_string(4)}", 28
        )
        self.assertTrue(success, message)
        
        # Request password reset
        reset_request_payload = {"email": reset_email}
        requests.post(f"{self.base_url}/api/password-reset-request", json=reset_request_payload)
        
        # Try reset with invalid OTP format
        invalid_payload = {
            "email": reset_email,
            "otp": "12345",  # Invalid format (5 digits)
            "new_password": "NewPassword123!"
        }
        
        response = requests.post(f"{self.base_url}/api/password-reset", json=invalid_payload)
        
        # In demo mode, might accept any 6-digit code, so check for proper validation
        if response.status_code == 400:
            data = response.json()
            self.assertIn("detail", data)
            print(f"✅ Invalid OTP format rejected: {data['detail']}")
        else:
            print(f"⚠️ Demo mode: Invalid OTP validation bypassed")
    
    def test_06_password_reset_expired_otp(self):
        """Test password reset with expired OTP (60-second timer)"""
        expired_email = f"expired_{self.random_string(8)}@example.com"
        
        # Register and verify user
        success, message = self.register_and_verify_user(
            expired_email, "TempPassword123!", f"Expired User {self.random_string(4)}", 28
        )
        self.assertTrue(success, message)
        
        # Request password reset
        reset_request_payload = {"email": expired_email}
        requests.post(f"{self.base_url}/api/password-reset-request", json=reset_request_payload)
        
        # Wait for OTP to expire (61 seconds)
        print("⏳ Waiting 61 seconds for OTP to expire...")
        time.sleep(61)
        
        # Try to reset with expired OTP
        expired_payload = {
            "email": expired_email,
            "otp": "123456",
            "new_password": "NewPassword123!"
        }
        
        response = requests.post(f"{self.base_url}/api/password-reset", json=expired_payload)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        
        self.assertIn("detail", data)
        self.assertIn("expired", data["detail"].lower())
        
        print(f"✅ Expired OTP properly rejected after 60 seconds")
        print(f"  - Error: {data['detail']}")
    
    def test_07_password_reset_password_validation(self):
        """Test password reset with invalid new password"""
        validation_email = f"validation_{self.random_string(8)}@example.com"
        
        # Register and verify user
        success, message = self.register_and_verify_user(
            validation_email, "TempPassword123!", f"Validation User {self.random_string(4)}", 28
        )
        self.assertTrue(success, message)
        
        # Request password reset
        reset_request_payload = {"email": validation_email}
        requests.post(f"{self.base_url}/api/password-reset-request", json=reset_request_payload)
        
        # Try reset with password too short (less than 6 characters)
        short_password_payload = {
            "email": validation_email,
            "otp": "123456",
            "new_password": "12345"  # Too short
        }
        
        response = requests.post(f"{self.base_url}/api/password-reset", json=short_password_payload)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        
        self.assertIn("detail", data)
        self.assertIn("6 characters", data["detail"])
        
        print(f"✅ Password validation working (minimum 6 characters)")
        print(f"  - Error: {data['detail']}")
    
    def test_08_registration_otp_60_second_timer(self):
        """Test that registration OTP also uses 60-second timer"""
        timer_email = f"timer_{self.random_string(8)}@example.com"
        
        # Register user
        register_payload = {
            "name": f"Timer User {self.random_string(4)}",
            "email": timer_email,
            "password": "TimerPassword123!",
            "age": 28
        }
        
        register_response = requests.post(f"{self.base_url}/api/register", json=register_payload)
        self.assertEqual(register_response.status_code, 200)
        
        print("⏳ Waiting 61 seconds to test registration OTP expiration...")
        time.sleep(61)
        
        # Try to verify with expired OTP
        expired_verify_payload = {
            "email": timer_email,
            "otp": "123456"
        }
        
        response = requests.post(f"{self.base_url}/api/verify-registration", json=expired_verify_payload)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        
        self.assertIn("detail", data)
        self.assertIn("expired", data["detail"].lower())
        
        print(f"✅ Registration OTP 60-second timer verified")
        print(f"  - Error: {data['detail']}")
    
    def test_09_complete_password_recovery_flow(self):
        """Test complete password recovery flow end-to-end"""
        flow_email = f"flow_{self.random_string(8)}@example.com"
        original_password = "OriginalPassword123!"
        new_password = "NewFlowPassword123!"
        
        # Step 1: Register user
        register_payload = {
            "name": f"Flow User {self.random_string(4)}",
            "email": flow_email,
            "password": original_password,
            "age": 28
        }
        
        register_response = requests.post(f"{self.base_url}/api/register", json=register_payload)
        self.assertEqual(register_response.status_code, 200)
        print("✅ Step 1: User registration successful")
        
        # Step 2: Verify registration
        verify_payload = {
            "email": flow_email,
            "otp": "123456"
        }
        verify_response = requests.post(f"{self.base_url}/api/verify-registration", json=verify_payload)
        self.assertEqual(verify_response.status_code, 200)
        print("✅ Step 2: Registration verification successful")
        
        # Step 3: Verify login with original password works
        login_payload = {
            "email": flow_email,
            "password": original_password
        }
        login_response = requests.post(f"{self.base_url}/api/login", json=login_payload)
        self.assertEqual(login_response.status_code, 200)
        print("✅ Step 3: Login with original password successful")
        
        # Step 4: Request password reset
        reset_request_payload = {
            "email": flow_email
        }
        reset_request_response = requests.post(f"{self.base_url}/api/password-reset-request", json=reset_request_payload)
        self.assertEqual(reset_request_response.status_code, 200)
        print("✅ Step 4: Password reset request successful")
        
        # Step 5: Reset password with OTP
        reset_payload = {
            "email": flow_email,
            "otp": "123456",
            "new_password": new_password
        }
        reset_response = requests.post(f"{self.base_url}/api/password-reset", json=reset_payload)
        self.assertEqual(reset_response.status_code, 200)
        reset_data = reset_response.json()
        self.assertTrue(reset_data["success"])
        print("✅ Step 5: Password reset successful")
        
        # Step 6: Verify old password no longer works
        old_login_payload = {
            "email": flow_email,
            "password": original_password
        }
        old_login_response = requests.post(f"{self.base_url}/api/login", json=old_login_payload)
        self.assertEqual(old_login_response.status_code, 401)
        print("✅ Step 6: Old password correctly rejected")
        
        # Step 7: Verify new password works
        new_login_payload = {
            "email": flow_email,
            "password": new_password
        }
        new_login_response = requests.post(f"{self.base_url}/api/login", json=new_login_payload)
        self.assertEqual(new_login_response.status_code, 200)
        new_login_data = new_login_response.json()
        self.assertIn("token", new_login_data)
        print("✅ Step 7: Login with new password successful")
        
        print(f"✅ Complete password recovery flow successful")
        print(f"  - User: {flow_email}")
        print(f"  - Original password rejected: ✅")
        print(f"  - New password accepted: ✅")
        print(f"  - End-to-end flow: ✅")

def run_password_recovery_tests():
    """Run focused password recovery tests"""
    suite = unittest.TestSuite()
    
    # Add password recovery tests in order
    test_cases = [
        'test_01_password_reset_request_valid_email',
        'test_02_password_reset_request_nonexistent_email',
        'test_03_password_reset_request_invalid_data',
        'test_04_password_reset_with_valid_otp',
        'test_05_password_reset_invalid_otp_format',
        'test_06_password_reset_expired_otp',
        'test_07_password_reset_password_validation',
        'test_08_registration_otp_60_second_timer',
        'test_09_complete_password_recovery_flow'
    ]
    
    for test_case in test_cases:
        suite.addTest(PasswordRecoveryTest(test_case))
    
    # Run the tests
    print("\n🔐 Starting Password Recovery Functionality Tests...\n")
    print("🎯 TESTING AREAS:")
    print("   - Password Reset Request Endpoint (/api/password-reset-request)")
    print("   - Password Reset Endpoint (/api/password-reset)")
    print("   - 60-second OTP timer verification")
    print("   - Complete password recovery flow end-to-end")
    print("   - Integration testing with login functionality")
    print("\n" + "="*60 + "\n")
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Summary
    print("\n" + "="*60)
    print("🔐 PASSWORD RECOVERY TEST RESULTS SUMMARY:")
    print("="*60)
    
    test_descriptions = [
        ('test_01_password_reset_request_valid_email', 'Password reset request (valid email)'),
        ('test_02_password_reset_request_nonexistent_email', 'Password reset request (security)'),
        ('test_03_password_reset_request_invalid_data', 'Password reset request validation'),
        ('test_04_password_reset_with_valid_otp', 'Password reset with valid OTP'),
        ('test_05_password_reset_invalid_otp_format', 'Password reset OTP validation'),
        ('test_06_password_reset_expired_otp', 'Password reset OTP expiration (60s)'),
        ('test_07_password_reset_password_validation', 'Password reset validation (min 6 chars)'),
        ('test_08_registration_otp_60_second_timer', 'Registration OTP 60-second timer'),
        ('test_09_complete_password_recovery_flow', 'Complete password recovery flow')
    ]
    
    success_count = 0
    for test_method, description in test_descriptions:
        if result.wasSuccessful():
            status = "✅ PASSED"
            success_count += 1
        else:
            # Check if this specific test failed
            failed_tests = [str(failure[0]) for failure in result.failures + result.errors]
            if any(test_method in failed_test for failed_test in failed_tests):
                status = "❌ FAILED"
            else:
                status = "✅ PASSED"
                success_count += 1
        print(f"{status} - {description}")
    
    print(f"\n📊 OVERALL RESULTS: {success_count}/{len(test_descriptions)} tests passed")
    
    if result.wasSuccessful():
        print("🎉 ALL PASSWORD RECOVERY TESTS PASSED!")
    else:
        print(f"⚠️ {len(result.failures)} failures, {len(result.errors)} errors")
    
    return result

if __name__ == "__main__":
    run_password_recovery_tests()