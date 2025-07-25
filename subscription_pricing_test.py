import requests
import unittest
import random
import string
import os
from datetime import datetime

class SubscriptionPricingTest(unittest.TestCase):
    """
    Test suite for updated subscription pricing structure:
    - Daily: 2,500 MWK (unchanged)
    - Weekly: 10,000 MWK (changed from 15,000 MWK)
    - Monthly: 15,000 MWK (changed from 30,000 MWK)
    
    Diaspora USD pricing:
    - Daily: $1.35 USD
    - Weekly: $5.36 USD (changed from $8.05)
    - Monthly: $8.05 USD (changed from $16.09)
    """
    
    def setUp(self):
        self.base_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://46106240-d86e-4578-973d-bf618bc75cd9.preview.emergentagent.com')
        self.token = None
        self.user_id = None
        
    def random_string(self, length=8):
        """Generate a random string for test data"""
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))
    
    def create_test_user(self):
        """Create and authenticate a test user"""
        test_email = f"pricing_test_{self.random_string(8)}@example.com"
        test_password = "TestPassword123!"
        test_name = f"Pricing Test User {self.random_string(4)}"
        
        # Register user
        payload = {
            "name": test_name,
            "email": test_email,
            "password": test_password,
            "age": 30
        }
        response = requests.post(f"{self.base_url}/api/register", json=payload)
        self.assertEqual(response.status_code, 200)
        
        # Verify registration
        otp_payload = {
            "email": test_email,
            "otp": "123456"  # Demo OTP
        }
        verify_response = requests.post(f"{self.base_url}/api/verify-registration", json=otp_payload)
        self.assertEqual(verify_response.status_code, 200)
        verify_data = verify_response.json()
        
        self.token = verify_data["token"]
        self.user_id = verify_data["user"]["id"]
        self.test_email = test_email
        
        return test_email, test_password
    
    def test_01_subscription_tiers_local_pricing(self):
        """Test subscription tiers API returns correct LOCAL MWK pricing"""
        response = requests.get(f"{self.base_url}/api/subscription/tiers?location=local")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check premium tier exists
        self.assertIn("premium", data)
        premium = data["premium"]
        self.assertIn("pricing", premium)
        pricing = premium["pricing"]
        
        # Verify UPDATED pricing structure
        # Daily: 2,500 MWK (unchanged)
        self.assertIn("daily", pricing)
        daily = pricing["daily"]
        self.assertEqual(daily["amount"], 2500)
        self.assertEqual(daily["currency"], "MWK")
        self.assertEqual(daily["original_price"], 2500)
        
        # Weekly: 10,000 MWK (changed from 15,000 MWK)
        self.assertIn("weekly", pricing)
        weekly = pricing["weekly"]
        self.assertEqual(weekly["amount"], 10000)
        self.assertEqual(weekly["currency"], "MWK")
        self.assertEqual(weekly["original_price"], 10000)
        
        # Monthly: 15,000 MWK (changed from 30,000 MWK)
        self.assertIn("monthly", pricing)
        monthly = pricing["monthly"]
        self.assertEqual(monthly["amount"], 15000)
        self.assertEqual(monthly["currency"], "MWK")
        self.assertEqual(monthly["original_price"], 15000)
        
        print(f"✅ LOCAL MWK PRICING VERIFIED:")
        print(f"  - Daily: {daily['original_price']} {daily['currency']} (unchanged)")
        print(f"  - Weekly: {weekly['original_price']} {weekly['currency']} (changed from 15,000)")
        print(f"  - Monthly: {monthly['original_price']} {monthly['currency']} (changed from 30,000)")
        
    def test_02_subscription_tiers_diaspora_pricing(self):
        """Test subscription tiers API returns correct DIASPORA USD pricing"""
        response = requests.get(f"{self.base_url}/api/subscription/tiers?location=diaspora")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check premium tier exists
        self.assertIn("premium", data)
        premium = data["premium"]
        self.assertIn("pricing", premium)
        pricing = premium["pricing"]
        
        # Verify UPDATED diaspora USD pricing
        # Daily: $1.35 USD
        self.assertIn("daily", pricing)
        daily = pricing["daily"]
        self.assertEqual(daily["amount"], 1.35)
        self.assertEqual(daily["currency"], "USD")
        self.assertEqual(daily["original_price"], 1.35)
        self.assertEqual(daily["mwk_equivalent"], 2500)
        
        # Weekly: $5.36 USD (changed from $8.05)
        self.assertIn("weekly", pricing)
        weekly = pricing["weekly"]
        self.assertEqual(weekly["amount"], 5.36)
        self.assertEqual(weekly["currency"], "USD")
        self.assertEqual(weekly["original_price"], 5.36)
        self.assertEqual(weekly["mwk_equivalent"], 10000)
        
        # Monthly: $8.05 USD (changed from $16.09)
        self.assertIn("monthly", pricing)
        monthly = pricing["monthly"]
        self.assertEqual(monthly["amount"], 8.05)
        self.assertEqual(monthly["currency"], "USD")
        self.assertEqual(monthly["original_price"], 8.05)
        self.assertEqual(monthly["mwk_equivalent"], 15000)
        
        print(f"✅ DIASPORA USD PRICING VERIFIED:")
        print(f"  - Daily: ${daily['original_price']} USD (≈{daily['mwk_equivalent']} MWK)")
        print(f"  - Weekly: ${weekly['original_price']} USD (≈{weekly['mwk_equivalent']} MWK) - changed from $8.05")
        print(f"  - Monthly: ${monthly['original_price']} USD (≈{monthly['mwk_equivalent']} MWK) - changed from $16.09")
        
    def test_03_paychangu_payment_validation_new_weekly_amount(self):
        """Test Paychangu payment validation accepts NEW weekly amount (10,000 MWK)"""
        if not self.token:
            self.create_test_user()
            
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Test NEW weekly amount (10,000 MWK)
        payload = {
            "amount": 10000,
            "currency": "MWK",
            "subscription_type": "weekly",
            "payment_method": "mobile_money",
            "phone_number": "991234567",
            "operator": "TNM",
            "description": "Weekly subscription payment"
        }
        
        response = requests.post(
            f"{self.base_url}/api/paychangu/initiate-payment",
            headers=headers,
            json=payload
        )
        
        # Should accept the new weekly amount
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("success", data)
        self.assertIn("message", data)
        
        if data["success"]:
            print(f"✅ NEW WEEKLY AMOUNT (10,000 MWK) ACCEPTED by Paychangu")
            print(f"  - Amount: {payload['amount']} {payload['currency']}")
            print(f"  - Subscription: {payload['subscription_type']}")
            print(f"  - Message: {data['message']}")
        else:
            print(f"⚠️ Payment initiation failed: {data['message']}")
            # Still verify the amount validation passed (not rejected for wrong amount)
            self.assertNotIn("Invalid amount", data["message"])
            
    def test_04_paychangu_payment_validation_new_monthly_amount(self):
        """Test Paychangu payment validation accepts NEW monthly amount (15,000 MWK)"""
        if not self.token:
            self.create_test_user()
            
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Test NEW monthly amount (15,000 MWK)
        payload = {
            "amount": 15000,
            "currency": "MWK",
            "subscription_type": "monthly",
            "payment_method": "mobile_money",
            "phone_number": "991234567",
            "operator": "AIRTEL",
            "description": "Monthly subscription payment"
        }
        
        response = requests.post(
            f"{self.base_url}/api/paychangu/initiate-payment",
            headers=headers,
            json=payload
        )
        
        # Should accept the new monthly amount
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("success", data)
        self.assertIn("message", data)
        
        if data["success"]:
            print(f"✅ NEW MONTHLY AMOUNT (15,000 MWK) ACCEPTED by Paychangu")
            print(f"  - Amount: {payload['amount']} {payload['currency']}")
            print(f"  - Subscription: {payload['subscription_type']}")
            print(f"  - Message: {data['message']}")
        else:
            print(f"⚠️ Payment initiation failed: {data['message']}")
            # Still verify the amount validation passed (not rejected for wrong amount)
            self.assertNotIn("Invalid amount", data["message"])
            
    def test_05_paychangu_payment_validation_daily_unchanged(self):
        """Test Paychangu payment validation still accepts daily amount (2,500 MWK - unchanged)"""
        if not self.token:
            self.create_test_user()
            
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Test daily amount (2,500 MWK - unchanged)
        payload = {
            "amount": 2500,
            "currency": "MWK",
            "subscription_type": "daily",
            "payment_method": "mobile_money",
            "phone_number": "991234567",
            "operator": "TNM",
            "description": "Daily subscription payment"
        }
        
        response = requests.post(
            f"{self.base_url}/api/paychangu/initiate-payment",
            headers=headers,
            json=payload
        )
        
        # Should accept the daily amount (unchanged)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("success", data)
        self.assertIn("message", data)
        
        if data["success"]:
            print(f"✅ DAILY AMOUNT (2,500 MWK) STILL ACCEPTED by Paychangu")
            print(f"  - Amount: {payload['amount']} {payload['currency']}")
            print(f"  - Subscription: {payload['subscription_type']}")
            print(f"  - Message: {data['message']}")
        else:
            print(f"⚠️ Payment initiation failed: {data['message']}")
            # Still verify the amount validation passed (not rejected for wrong amount)
            self.assertNotIn("Invalid amount", data["message"])
            
    def test_06_paychangu_payment_validation_old_weekly_rejected(self):
        """Test Paychangu payment validation REJECTS old weekly amount (15,000 MWK)"""
        if not self.token:
            self.create_test_user()
            
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Test OLD weekly amount (15,000 MWK) - should be rejected
        payload = {
            "amount": 15000,
            "currency": "MWK",
            "subscription_type": "weekly",  # Weekly subscription but old amount
            "payment_method": "mobile_money",
            "phone_number": "991234567",
            "operator": "TNM",
            "description": "Weekly subscription payment with old amount"
        }
        
        response = requests.post(
            f"{self.base_url}/api/paychangu/initiate-payment",
            headers=headers,
            json=payload
        )
        
        # Should reject the old weekly amount
        self.assertEqual(response.status_code, 400)
        data = response.json()
        
        # Check that it's rejected for invalid amount
        self.assertIn("detail", data)
        self.assertIn("Invalid amount", data["detail"])
        self.assertIn("weekly", data["detail"])
        
        print(f"✅ OLD WEEKLY AMOUNT (15,000 MWK) CORRECTLY REJECTED")
        print(f"  - Amount: {payload['amount']} {payload['currency']}")
        print(f"  - Subscription: {payload['subscription_type']}")
        print(f"  - Error: {data['detail']}")
        
    def test_07_paychangu_payment_validation_old_monthly_rejected(self):
        """Test Paychangu payment validation REJECTS old monthly amount (30,000 MWK)"""
        if not self.token:
            self.create_test_user()
            
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Test OLD monthly amount (30,000 MWK) - should be rejected
        payload = {
            "amount": 30000,
            "currency": "MWK",
            "subscription_type": "monthly",  # Monthly subscription but old amount
            "payment_method": "mobile_money",
            "phone_number": "991234567",
            "operator": "AIRTEL",
            "description": "Monthly subscription payment with old amount"
        }
        
        response = requests.post(
            f"{self.base_url}/api/paychangu/initiate-payment",
            headers=headers,
            json=payload
        )
        
        # Should reject the old monthly amount
        self.assertEqual(response.status_code, 400)
        data = response.json()
        
        # Check that it's rejected for invalid amount
        self.assertIn("detail", data)
        self.assertIn("Invalid amount", data["detail"])
        self.assertIn("monthly", data["detail"])
        
        print(f"✅ OLD MONTHLY AMOUNT (30,000 MWK) CORRECTLY REJECTED")
        print(f"  - Amount: {payload['amount']} {payload['currency']}")
        print(f"  - Subscription: {payload['subscription_type']}")
        print(f"  - Error: {data['detail']}")
        
    def test_08_conversion_rate_verification(self):
        """Test USD to MWK conversion rate is approximately 1865 MWK/USD"""
        response = requests.get(f"{self.base_url}/api/subscription/tiers?location=diaspora")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        premium = data["premium"]
        pricing = premium["pricing"]
        
        # Calculate conversion rates for each tier
        daily_rate = pricing["daily"]["mwk_equivalent"] / pricing["daily"]["amount"]
        weekly_rate = pricing["weekly"]["mwk_equivalent"] / pricing["weekly"]["amount"]
        monthly_rate = pricing["monthly"]["mwk_equivalent"] / pricing["monthly"]["amount"]
        
        # Verify conversion rate is approximately 1865 MWK/USD (allow some variance)
        expected_rate = 1865
        tolerance = 50  # Allow ±50 MWK variance
        
        self.assertAlmostEqual(daily_rate, expected_rate, delta=tolerance)
        self.assertAlmostEqual(weekly_rate, expected_rate, delta=tolerance)
        self.assertAlmostEqual(monthly_rate, expected_rate, delta=tolerance)
        
        print(f"✅ USD TO MWK CONVERSION RATE VERIFIED:")
        print(f"  - Daily rate: {daily_rate:.2f} MWK/USD")
        print(f"  - Weekly rate: {weekly_rate:.2f} MWK/USD")
        print(f"  - Monthly rate: {monthly_rate:.2f} MWK/USD")
        print(f"  - Expected rate: ~{expected_rate} MWK/USD")
        print(f"  - All rates within acceptable range")
        
    def test_09_webhook_processing_new_amounts(self):
        """Test webhook processing works with new payment amounts"""
        # Simulate webhook data for new weekly amount
        webhook_data_weekly = {
            "tx_ref": f"test_weekly_{self.random_string(8)}",
            "status": "success",
            "amount": "10000",
            "currency": "MWK"
        }
        
        # Test GET webhook (query parameters)
        response = requests.get(
            f"{self.base_url}/api/paychangu/webhook",
            params=webhook_data_weekly
        )
        
        # Should process successfully (200 or 404 if transaction not found)
        self.assertIn(response.status_code, [200, 404])
        
        print(f"✅ WEBHOOK PROCESSING - NEW WEEKLY AMOUNT:")
        print(f"  - Status: {response.status_code}")
        print(f"  - Amount: {webhook_data_weekly['amount']} {webhook_data_weekly['currency']}")
        
        # Simulate webhook data for new monthly amount
        webhook_data_monthly = {
            "tx_ref": f"test_monthly_{self.random_string(8)}",
            "status": "success",
            "amount": "15000",
            "currency": "MWK"
        }
        
        # Test POST webhook (JSON body)
        response = requests.post(
            f"{self.base_url}/api/paychangu/webhook",
            json=webhook_data_monthly
        )
        
        # Should process successfully (200 or 404 if transaction not found)
        self.assertIn(response.status_code, [200, 404])
        
        print(f"✅ WEBHOOK PROCESSING - NEW MONTHLY AMOUNT:")
        print(f"  - Status: {response.status_code}")
        print(f"  - Amount: {webhook_data_monthly['amount']} {webhook_data_monthly['currency']}")
        
    def test_10_pricing_display_consistency(self):
        """Test pricing display data is consistent across all endpoints"""
        # Get local pricing
        local_response = requests.get(f"{self.base_url}/api/subscription/tiers?location=local")
        self.assertEqual(local_response.status_code, 200)
        local_data = local_response.json()
        
        # Get diaspora pricing
        diaspora_response = requests.get(f"{self.base_url}/api/subscription/tiers?location=diaspora")
        self.assertEqual(diaspora_response.status_code, 200)
        diaspora_data = diaspora_response.json()
        
        # Verify MWK equivalents match between local and diaspora
        local_pricing = local_data["premium"]["pricing"]
        diaspora_pricing = diaspora_data["premium"]["pricing"]
        
        # Daily
        self.assertEqual(local_pricing["daily"]["amount"], diaspora_pricing["daily"]["mwk_equivalent"])
        # Weekly
        self.assertEqual(local_pricing["weekly"]["amount"], diaspora_pricing["weekly"]["mwk_equivalent"])
        # Monthly
        self.assertEqual(local_pricing["monthly"]["amount"], diaspora_pricing["monthly"]["mwk_equivalent"])
        
        print(f"✅ PRICING DISPLAY CONSISTENCY VERIFIED:")
        print(f"  - Local daily MWK = Diaspora daily MWK equivalent: {local_pricing['daily']['amount']}")
        print(f"  - Local weekly MWK = Diaspora weekly MWK equivalent: {local_pricing['weekly']['amount']}")
        print(f"  - Local monthly MWK = Diaspora monthly MWK equivalent: {local_pricing['monthly']['amount']}")
        
    def test_11_currency_formatting_verification(self):
        """Test currency formatting and calculations are correct"""
        # Test local MWK formatting
        local_response = requests.get(f"{self.base_url}/api/subscription/tiers?location=local")
        self.assertEqual(local_response.status_code, 200)
        local_data = local_response.json()
        
        local_pricing = local_data["premium"]["pricing"]
        
        # Verify MWK amounts are integers (no decimals)
        self.assertIsInstance(local_pricing["daily"]["amount"], int)
        self.assertIsInstance(local_pricing["weekly"]["amount"], int)
        self.assertIsInstance(local_pricing["monthly"]["amount"], int)
        
        # Test diaspora USD formatting
        diaspora_response = requests.get(f"{self.base_url}/api/subscription/tiers?location=diaspora")
        self.assertEqual(diaspora_response.status_code, 200)
        diaspora_data = diaspora_response.json()
        
        diaspora_pricing = diaspora_data["premium"]["pricing"]
        
        # Verify USD amounts are floats with proper precision
        self.assertIsInstance(diaspora_pricing["daily"]["amount"], float)
        self.assertIsInstance(diaspora_pricing["weekly"]["amount"], float)
        self.assertIsInstance(diaspora_pricing["monthly"]["amount"], float)
        
        # Verify USD amounts have reasonable precision (max 2 decimal places)
        daily_decimals = len(str(diaspora_pricing["daily"]["amount"]).split('.')[-1])
        weekly_decimals = len(str(diaspora_pricing["weekly"]["amount"]).split('.')[-1])
        monthly_decimals = len(str(diaspora_pricing["monthly"]["amount"]).split('.')[-1])
        
        self.assertLessEqual(daily_decimals, 2)
        self.assertLessEqual(weekly_decimals, 2)
        self.assertLessEqual(monthly_decimals, 2)
        
        print(f"✅ CURRENCY FORMATTING VERIFIED:")
        print(f"  - MWK amounts are integers: {local_pricing['daily']['amount']}, {local_pricing['weekly']['amount']}, {local_pricing['monthly']['amount']}")
        print(f"  - USD amounts are floats: ${diaspora_pricing['daily']['amount']}, ${diaspora_pricing['weekly']['amount']}, ${diaspora_pricing['monthly']['amount']}")
        print(f"  - USD decimal precision: {daily_decimals}, {weekly_decimals}, {monthly_decimals} places")

if __name__ == '__main__':
    unittest.main(verbosity=2)