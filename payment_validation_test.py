#!/usr/bin/env python3
"""
Test payment validation logic for updated pricing structure.
Tests that old amounts are rejected and new amounts are accepted.
"""

import requests
import json

def test_payment_validation():
    """Test payment validation without requiring user authentication"""
    base_url = 'https://46106240-d86e-4578-973d-bf618bc75cd9.preview.emergentagent.com'
    
    print("=" * 80)
    print("PAYMENT VALIDATION TESTING")
    print("=" * 80)
    print()
    
    # Test cases for payment validation
    test_cases = [
        # NEW amounts (should be accepted if user was authenticated)
        {
            'amount': 2500,
            'subscription_type': 'daily',
            'description': 'Daily amount (unchanged)',
            'expected_validation': 'ACCEPT',
            'change_note': 'unchanged'
        },
        {
            'amount': 10000,
            'subscription_type': 'weekly',
            'description': 'NEW weekly amount',
            'expected_validation': 'ACCEPT',
            'change_note': 'changed from 15,000 MWK'
        },
        {
            'amount': 15000,
            'subscription_type': 'monthly',
            'description': 'NEW monthly amount',
            'expected_validation': 'ACCEPT',
            'change_note': 'changed from 30,000 MWK'
        },
        # OLD amounts (should be rejected)
        {
            'amount': 15000,
            'subscription_type': 'weekly',
            'description': 'OLD weekly amount',
            'expected_validation': 'REJECT',
            'change_note': 'old pricing (15,000 MWK)'
        },
        {
            'amount': 30000,
            'subscription_type': 'monthly',
            'description': 'OLD monthly amount',
            'expected_validation': 'REJECT',
            'change_note': 'old pricing (30,000 MWK)'
        },
        # Invalid amounts
        {
            'amount': 5000,
            'subscription_type': 'daily',
            'description': 'Invalid daily amount',
            'expected_validation': 'REJECT',
            'change_note': 'invalid amount'
        }
    ]
    
    print("🔍 PAYMENT AMOUNT VALIDATION TESTS")
    print("-" * 50)
    print()
    
    # Since we can't authenticate easily, we'll test the validation by checking
    # the error responses. Unauthenticated requests should fail with 401,
    # but invalid amounts should fail with 400 (validation error).
    
    success_count = 0
    total_tests = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}: {test_case['description']}")
        print(f"  Amount: {test_case['amount']:,} MWK ({test_case['change_note']})")
        print(f"  Type: {test_case['subscription_type']}")
        
        # Create payment request payload
        payload = {
            'amount': test_case['amount'],
            'currency': 'MWK',
            'subscription_type': test_case['subscription_type'],
            'payment_method': 'mobile_money',
            'phone_number': '991234567',
            'operator': 'TNM',
            'description': f"Test payment for {test_case['subscription_type']} subscription"
        }
        
        # Make request without authentication (should fail, but we can check the error type)
        response = requests.post(
            f'{base_url}/api/paychangu/initiate-payment',
            json=payload
        )
        
        print(f"  Response: {response.status_code}")
        
        if response.status_code == 401:
            # Unauthenticated - this means the amount validation passed
            # (it got to the authentication check)
            if test_case['expected_validation'] == 'ACCEPT':
                print(f"  Result: ✅ VALIDATION PASSED (amount accepted, auth required)")
                success_count += 1
            else:
                print(f"  Result: ❌ VALIDATION FAILED (should have rejected amount)")
        elif response.status_code == 400:
            # Bad request - could be amount validation error
            try:
                error_data = response.json()
                error_detail = error_data.get('detail', '')
                
                if 'Invalid amount' in error_detail:
                    if test_case['expected_validation'] == 'REJECT':
                        print(f"  Result: ✅ VALIDATION PASSED (amount correctly rejected)")
                        print(f"  Error: {error_detail}")
                        success_count += 1
                    else:
                        print(f"  Result: ❌ VALIDATION FAILED (amount incorrectly rejected)")
                        print(f"  Error: {error_detail}")
                else:
                    print(f"  Result: ⚠️  OTHER ERROR: {error_detail}")
            except:
                print(f"  Result: ⚠️  UNKNOWN ERROR: {response.text[:100]}")
        else:
            print(f"  Result: ⚠️  UNEXPECTED STATUS: {response.status_code}")
            if response.text:
                print(f"  Response: {response.text[:100]}")
        
        print()
    
    print("=" * 50)
    print(f"VALIDATION TEST RESULTS: {success_count}/{total_tests} tests passed")
    
    if success_count == total_tests:
        print("✅ ALL PAYMENT VALIDATION TESTS PASSED")
        print()
        print("VERIFIED:")
        print("  • NEW weekly amount (10,000 MWK) accepted")
        print("  • NEW monthly amount (15,000 MWK) accepted")
        print("  • Daily amount (2,500 MWK) still accepted")
        print("  • OLD weekly amount (15,000 MWK) rejected")
        print("  • OLD monthly amount (30,000 MWK) rejected")
        print("  • Invalid amounts rejected")
        return True
    else:
        print("❌ SOME VALIDATION TESTS FAILED")
        return False

if __name__ == '__main__':
    test_payment_validation()