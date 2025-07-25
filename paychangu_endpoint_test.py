#!/usr/bin/env python3
"""
Simple test to verify the Paychangu endpoint correction without requiring authentication
"""

import requests
import json
import os

def test_paychangu_endpoint():
    """Test the Paychangu endpoint directly"""
    base_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://dbfb7da9-8888-45fb-9cbd-4421c91b4f53.preview.emergentagent.com')
    
    print("🧪 PAYCHANGU ENDPOINT TEST")
    print("=" * 50)
    
    # Test without authentication to see if we get 401 (endpoint exists) vs 404/405 (endpoint issues)
    payload = {
        "amount": 2500.0,
        "currency": "MWK",
        "subscription_type": "daily",
        "payment_method": "mobile_money",
        "phone_number": "0991234567",
        "operator": "TNM"
    }
    
    print(f"🔄 Testing endpoint: {base_url}/api/paychangu/initiate-payment")
    print(f"🔄 Payload: {json.dumps(payload, indent=2)}")
    
    response = requests.post(
        f"{base_url}/api/paychangu/initiate-payment",
        json=payload,
        timeout=30
    )
    
    print(f"📡 Response Status: {response.status_code}")
    print(f"📡 Response Headers: {dict(response.headers)}")
    print(f"📡 Response Body: {response.text[:500]}...")
    
    # Analyze the response
    if response.status_code == 404:
        print("❌ CRITICAL: 404 Not Found - Endpoint doesn't exist")
        return False
    elif response.status_code == 405:
        print("❌ CRITICAL: 405 Method Not Allowed - The original issue is still present!")
        return False
    elif response.status_code == 401:
        print("✅ GOOD: 401 Unauthorized - Endpoint exists and requires authentication")
        return True
    elif response.status_code == 422:
        print("✅ GOOD: 422 Unprocessable Entity - Endpoint exists and validates data")
        return True
    elif response.status_code == 400:
        print("✅ GOOD: 400 Bad Request - Endpoint exists and validates data")
        return True
    elif response.status_code == 500:
        try:
            error_data = response.json()
            if "credentials not configured" in error_data.get('detail', '').lower():
                print("✅ GOOD: Endpoint exists, credentials issue only")
                return True
            else:
                print(f"⚠️ Server error: {error_data.get('detail', 'Unknown')}")
                return True
        except:
            print("⚠️ Server error with non-JSON response")
            return True
    elif response.status_code in [200, 201]:
        print("✅ EXCELLENT: Payment endpoint working!")
        return True
    else:
        print(f"⚠️ Unexpected status: {response.status_code}")
        return True

def test_webhook_endpoint():
    """Test the webhook endpoint"""
    base_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://dbfb7da9-8888-45fb-9cbd-4421c91b4f53.preview.emergentagent.com')
    
    print("\n🧪 WEBHOOK ENDPOINT TEST")
    print("=" * 50)
    
    # Test webhook with sample data
    webhook_payload = {
        "tx_ref": "test-tx-ref-123",
        "status": "successful",
        "amount": 2500,
        "currency": "MWK"
    }
    
    print(f"🔄 Testing webhook: {base_url}/api/paychangu/webhook")
    print(f"🔄 Payload: {json.dumps(webhook_payload, indent=2)}")
    
    response = requests.post(
        f"{base_url}/api/paychangu/webhook",
        json=webhook_payload,
        timeout=10
    )
    
    print(f"📡 Webhook Response Status: {response.status_code}")
    print(f"📡 Webhook Response: {response.text[:300]}...")
    
    if response.status_code == 404:
        print("❌ Webhook endpoint doesn't exist")
        return False
    elif response.status_code == 405:
        print("❌ Webhook endpoint has method issues")
        return False
    else:
        print("✅ Webhook endpoint exists and responds")
        return True

if __name__ == "__main__":
    print("🚀 PAYCHANGU ENDPOINT VERIFICATION")
    print("Testing if the 405 Method Not Allowed error has been fixed")
    print("=" * 60)
    
    payment_test = test_paychangu_endpoint()
    webhook_test = test_webhook_endpoint()
    
    print("\n" + "=" * 60)
    print("🏁 RESULTS SUMMARY")
    print("=" * 60)
    
    print(f"✅ Payment Endpoint: {'PASS' if payment_test else 'FAIL'}")
    print(f"✅ Webhook Endpoint: {'PASS' if webhook_test else 'FAIL'}")
    
    if payment_test and webhook_test:
        print("\n🎉 SUCCESS: No 405 errors found - Paychangu endpoints are accessible!")
        print("The original 405 Method Not Allowed issue appears to be resolved.")
    else:
        print("\n⚠️ Some endpoints may still have issues")
    
    exit(0 if (payment_test and webhook_test) else 1)