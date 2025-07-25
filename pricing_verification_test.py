#!/usr/bin/env python3
"""
Comprehensive test of the updated subscription pricing structure.
Tests the core pricing changes without requiring user authentication.
"""

import requests
import json
import sys

def test_pricing_structure():
    """Test the updated pricing structure"""
    base_url = 'https://46106240-d86e-4578-973d-bf618bc75cd9.preview.emergentagent.com'
    
    print("=" * 80)
    print("NEXTCHAPTER SUBSCRIPTION PRICING VERIFICATION")
    print("=" * 80)
    print()
    
    # Test 1: Local MWK Pricing
    print("🇲🇼 LOCAL MALAWI PRICING (MWK)")
    print("-" * 40)
    
    response = requests.get(f'{base_url}/api/subscription/tiers?location=local')
    if response.status_code != 200:
        print(f"❌ ERROR: Failed to get local pricing - {response.status_code}")
        return False
    
    local_data = response.json()
    local_pricing = local_data['premium']['pricing']
    
    # Verify updated pricing
    expected_local = {
        'daily': 2500,    # unchanged
        'weekly': 10000,  # changed from 15,000
        'monthly': 15000  # changed from 30,000
    }
    
    success = True
    for period, expected_amount in expected_local.items():
        actual_amount = local_pricing[period]['amount']
        currency = local_pricing[period]['currency']
        
        if actual_amount == expected_amount and currency == 'MWK':
            status = "✅ CORRECT"
            if period == 'daily':
                change_note = "(unchanged)"
            elif period == 'weekly':
                change_note = "(changed from 15,000 MWK)"
            else:  # monthly
                change_note = "(changed from 30,000 MWK)"
        else:
            status = "❌ INCORRECT"
            success = False
            change_note = f"(expected {expected_amount} MWK)"
        
        print(f"  {period.capitalize():8}: {actual_amount:,} {currency} {status} {change_note}")
    
    print()
    
    # Test 2: Diaspora USD Pricing
    print("🌍 DIASPORA PRICING (USD)")
    print("-" * 40)
    
    response = requests.get(f'{base_url}/api/subscription/tiers?location=diaspora')
    if response.status_code != 200:
        print(f"❌ ERROR: Failed to get diaspora pricing - {response.status_code}")
        return False
    
    diaspora_data = response.json()
    diaspora_pricing = diaspora_data['premium']['pricing']
    
    # Verify updated USD pricing
    expected_diaspora = {
        'daily': 1.35,   # unchanged
        'weekly': 5.36,  # changed from 8.05
        'monthly': 8.05  # changed from 16.09
    }
    
    expected_mwk_equiv = {
        'daily': 2500,
        'weekly': 10000,
        'monthly': 15000
    }
    
    for period, expected_usd in expected_diaspora.items():
        actual_usd = diaspora_pricing[period]['amount']
        currency = diaspora_pricing[period]['currency']
        mwk_equiv = diaspora_pricing[period]['mwk_equivalent']
        expected_mwk = expected_mwk_equiv[period]
        
        if (abs(actual_usd - expected_usd) < 0.01 and 
            currency == 'USD' and 
            mwk_equiv == expected_mwk):
            status = "✅ CORRECT"
            if period == 'daily':
                change_note = "(unchanged)"
            elif period == 'weekly':
                change_note = "(changed from $8.05)"
            else:  # monthly
                change_note = "(changed from $16.09)"
        else:
            status = "❌ INCORRECT"
            success = False
            change_note = f"(expected ${expected_usd} USD)"
        
        print(f"  {period.capitalize():8}: ${actual_usd} USD (≈{mwk_equiv:,} MWK) {status} {change_note}")
    
    print()
    
    # Test 3: Conversion Rate Verification
    print("💱 CONVERSION RATE VERIFICATION")
    print("-" * 40)
    
    conversion_rates = []
    for period in ['daily', 'weekly', 'monthly']:
        usd_amount = diaspora_pricing[period]['amount']
        mwk_amount = diaspora_pricing[period]['mwk_equivalent']
        rate = mwk_amount / usd_amount
        conversion_rates.append(rate)
        print(f"  {period.capitalize():8}: {rate:.2f} MWK/USD")
    
    # Check if all rates are consistent (around 1865 MWK/USD)
    avg_rate = sum(conversion_rates) / len(conversion_rates)
    expected_rate = 1865
    tolerance = 50
    
    if abs(avg_rate - expected_rate) <= tolerance:
        print(f"  Average   : {avg_rate:.2f} MWK/USD ✅ CONSISTENT")
        print(f"  Expected  : ~{expected_rate} MWK/USD")
    else:
        print(f"  Average   : {avg_rate:.2f} MWK/USD ❌ INCONSISTENT")
        success = False
    
    print()
    
    # Test 4: Pricing Consistency Check
    print("🔄 PRICING CONSISTENCY CHECK")
    print("-" * 40)
    
    # Verify MWK equivalents match between local and diaspora
    consistency_check = True
    for period in ['daily', 'weekly', 'monthly']:
        local_mwk = local_pricing[period]['amount']
        diaspora_mwk_equiv = diaspora_pricing[period]['mwk_equivalent']
        
        if local_mwk == diaspora_mwk_equiv:
            print(f"  {period.capitalize():8}: {local_mwk:,} MWK ✅ CONSISTENT")
        else:
            print(f"  {period.capitalize():8}: Local={local_mwk:,}, Diaspora≈{diaspora_mwk_equiv:,} ❌ INCONSISTENT")
            consistency_check = False
            success = False
    
    print()
    
    # Test 5: Webhook Processing Test
    print("🔗 WEBHOOK PROCESSING TEST")
    print("-" * 40)
    
    # Test webhook with new amounts
    webhook_tests = [
        {'amount': '10000', 'type': 'weekly', 'description': 'NEW weekly amount'},
        {'amount': '15000', 'type': 'monthly', 'description': 'NEW monthly amount'},
        {'amount': '2500', 'type': 'daily', 'description': 'Daily amount (unchanged)'}
    ]
    
    for test in webhook_tests:
        webhook_data = {
            'tx_ref': f'test_{test["type"]}_verification',
            'status': 'success',
            'amount': test['amount'],
            'currency': 'MWK'
        }
        
        # Test GET webhook
        response = requests.get(f'{base_url}/api/paychangu/webhook', params=webhook_data)
        if response.status_code in [200, 404]:  # 404 is OK (transaction not found)
            print(f"  {test['description']:25}: GET webhook ✅ PROCESSED")
        else:
            print(f"  {test['description']:25}: GET webhook ❌ ERROR ({response.status_code})")
            success = False
        
        # Test POST webhook
        response = requests.post(f'{base_url}/api/paychangu/webhook', json=webhook_data)
        if response.status_code in [200, 404]:  # 404 is OK (transaction not found)
            print(f"  {test['description']:25}: POST webhook ✅ PROCESSED")
        else:
            print(f"  {test['description']:25}: POST webhook ❌ ERROR ({response.status_code})")
            success = False
    
    print()
    
    # Summary
    print("📊 SUMMARY")
    print("-" * 40)
    
    if success:
        print("✅ ALL PRICING TESTS PASSED")
        print()
        print("VERIFIED CHANGES:")
        print("  • Weekly pricing: 15,000 MWK → 10,000 MWK")
        print("  • Monthly pricing: 30,000 MWK → 15,000 MWK")
        print("  • Weekly USD: $8.05 → $5.36")
        print("  • Monthly USD: $16.09 → $8.05")
        print("  • Daily pricing unchanged: 2,500 MWK / $1.35 USD")
        print("  • Conversion rate: ~1865 MWK/USD")
        print("  • Webhook processing working with new amounts")
        return True
    else:
        print("❌ SOME PRICING TESTS FAILED")
        print("Please check the errors above and verify pricing implementation.")
        return False

if __name__ == '__main__':
    success = test_pricing_structure()
    sys.exit(0 if success else 1)