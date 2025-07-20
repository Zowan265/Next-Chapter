#!/usr/bin/env python3

import requests
import random
import string
from datetime import datetime

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

base_url = 'https://46106240-d86e-4578-973d-bf618bc75cd9.preview.emergentagent.com'

print('🎯 HIGH PRIORITY BACKEND TESTING RESULTS')
print('='*60)

# Test 1: Subscription Pricing Update
print('\n1. SUBSCRIPTION PRICING UPDATE:')
try:
    response = requests.get(f'{base_url}/api/subscription/tiers?location=local')
    data = response.json()
    premium = data['premium']['pricing']
    vip = data['vip']['pricing']
    
    # Check exact pricing
    assert premium['daily']['original_price'] == 2500
    assert premium['weekly']['original_price'] == 15000
    assert premium['monthly']['original_price'] == 30000
    assert vip['daily']['original_price'] == 5000
    assert vip['weekly']['original_price'] == 30000
    assert vip['monthly']['original_price'] == 60000
    
    print('✅ PASSED - Correct MWK pricing implemented')
    print(f'   Premium: {premium["daily"]["original_price"]}/{premium["weekly"]["original_price"]}/{premium["monthly"]["original_price"]} MWK')
    print(f'   VIP: {vip["daily"]["original_price"]}/{vip["weekly"]["original_price"]}/{vip["monthly"]["original_price"]} MWK')
except Exception as e:
    print(f'❌ FAILED - {e}')

# Test 2: Diaspora Pricing Implementation
print('\n2. DIASPORA PRICING IMPLEMENTATION:')
try:
    response = requests.get(f'{base_url}/api/subscription/tiers?location=diaspora')
    data = response.json()
    premium = data['premium']['pricing']
    
    # Check USD pricing and MWK equivalents
    assert premium['daily']['original_price'] == 1.35
    assert premium['daily']['currency'] == 'USD'
    assert premium['daily']['mwk_equivalent'] == 2500
    assert premium['weekly']['original_price'] == 8.00
    assert premium['monthly']['original_price'] == 16.00
    
    conversion_rate = premium['daily']['mwk_equivalent'] / premium['daily']['original_price']
    
    print('✅ PASSED - USD pricing with MWK equivalents working')
    print(f'   Premium Daily: ${premium["daily"]["original_price"]} USD (≈{premium["daily"]["mwk_equivalent"]} MWK)')
    print(f'   Conversion rate: ~{conversion_rate:.2f} MWK/USD')
except Exception as e:
    print(f'❌ FAILED - {e}')

# Test 3: Email OTP Verification
print('\n3. EMAIL OTP VERIFICATION:')
try:
    test_email = f'otp_test_{random_string(8)}@example.com'
    
    # Register
    payload = {
        'name': f'OTP Test {random_string(4)}',
        'email': test_email,
        'password': 'TestPassword123!',
        'age': 28
    }
    reg_response = requests.post(f'{base_url}/api/register', json=payload)
    assert reg_response.status_code == 200
    
    # Verify OTP
    otp_payload = {'email': test_email, 'otp': '123456'}
    verify_response = requests.post(f'{base_url}/api/verify-registration', json=otp_payload)
    assert verify_response.status_code == 200
    verify_data = verify_response.json()
    assert 'token' in verify_data
    assert 'user' in verify_data
    
    print('✅ PASSED - Email OTP system working')
    print(f'   Registration and verification successful for {test_email}')
except Exception as e:
    print(f'❌ FAILED - {e}')

# Test 4: Time-based Discounts
print('\n4. TIME-BASED DISCOUNTS:')
try:
    response = requests.get(f'{base_url}/api/subscription/tiers')
    data = response.json()
    premium = data['premium']
    
    # Check discount structure
    pricing = premium['pricing']
    assert 'is_wednesday_discount' in premium
    assert 'is_saturday_happy_hour' in premium
    
    for duration in ['daily', 'weekly', 'monthly']:
        price_info = pricing[duration]
        assert 'original_price' in price_info
        assert 'discounted_price' in price_info
        assert 'discount_percentage' in price_info
        assert 'has_discount' in price_info
    
    print('✅ PASSED - Time-based discount structure implemented')
    print(f'   Wednesday discount active: {premium["is_wednesday_discount"]}')
    print(f'   Saturday happy hour active: {premium["is_saturday_happy_hour"]}')
except Exception as e:
    print(f'❌ FAILED - {e}')

# Test 5: Geographic Matching Logic
print('\n5. GEOGRAPHIC MATCHING LOGIC:')
try:
    response = requests.get(f'{base_url}/api/subscription/tiers')
    data = response.json()
    
    # Check tier geographic limits
    free_tier = data['free']
    premium_tier = data['premium']
    vip_tier = data['vip']
    
    assert premium_tier['geographical_limit'] == 'extended_local'
    assert premium_tier['matching_scope'] == 'local_unlimited'
    assert vip_tier['geographical_limit'] == 'malawian_global'
    assert vip_tier['matching_scope'] == 'malawian_worldwide'
    
    print('✅ PASSED - Geographic matching logic implemented')
    print(f'   Premium: {premium_tier["geographical_limit"]} ({premium_tier["matching_scope"]})')
    print(f'   VIP: {vip_tier["geographical_limit"]} ({vip_tier["matching_scope"]})')
except Exception as e:
    print(f'❌ FAILED - {e}')

print('\n' + '='*60)
print('🎯 HIGH PRIORITY TESTING COMPLETE')
print('='*60)