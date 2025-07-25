#!/usr/bin/env python3
"""
Analyze the backend code to verify Paychangu integration fixes
"""

import re
import os

def analyze_paychangu_integration():
    """Analyze the backend server.py file for Paychangu integration fixes"""
    
    print("🔍 PAYCHANGU BACKEND CODE ANALYSIS")
    print("=" * 60)
    
    # Read the backend server.py file
    with open('/app/backend/server.py', 'r') as f:
        backend_code = f.read()
    
    print("Analyzing the corrected Paychangu integration fixes...")
    print()
    
    # Test 1: Check for correct API endpoint
    print("1. API ENDPOINT VERIFICATION")
    print("-" * 30)
    
    # Look for the actual request URL
    endpoint_pattern = r'requests\.post\(\s*f?["\']([^"\']*)/payment["\']'
    endpoint_matches = re.findall(endpoint_pattern, backend_code)
    
    if endpoint_matches:
        print("✅ CORRECT ENDPOINT FOUND: Using /payment endpoint")
        for match in endpoint_matches:
            print(f"   - Found: {match}/payment")
    else:
        print("❌ ENDPOINT ISSUE: /payment endpoint not found in requests.post")
    
    # Check for old endpoint usage
    old_endpoint_pattern = r'/api/v1/transactions'
    old_matches = re.findall(old_endpoint_pattern, backend_code)
    
    if old_matches:
        print(f"⚠️ OLD ENDPOINT REFERENCES: Found {len(old_matches)} references to /api/v1/transactions")
        # Check if they're just in comments or print statements
        lines = backend_code.split('\n')
        for i, line in enumerate(lines, 1):
            if '/api/v1/transactions' in line:
                if 'print' in line or '#' in line:
                    print(f"   - Line {i}: {line.strip()} (logging/comment only)")
                else:
                    print(f"   - Line {i}: {line.strip()} (ACTIVE CODE)")
    else:
        print("✅ NO OLD ENDPOINT REFERENCES")
    
    print()
    
    # Test 2: Check for updated request format
    print("2. REQUEST FORMAT VERIFICATION")
    print("-" * 30)
    
    format_checks = {
        "tx_ref": r'"tx_ref":\s*str\(uuid\.uuid4\(\)\)',
        "first_name": r'"first_name":\s*[^,]+\.split\(\)\[0\]',
        "last_name": r'"last_name":\s*',
        "customization": r'"customization":\s*{',
        "meta": r'"meta":\s*{',
        "callback_url": r'"callback_url":',
        "return_url": r'"return_url":'
    }
    
    for field, pattern in format_checks.items():
        if re.search(pattern, backend_code):
            print(f"✅ {field.upper()}: Found in request format")
        else:
            print(f"❌ {field.upper()}: Not found in expected format")
    
    print()
    
    # Test 3: Check response handling
    print("3. RESPONSE HANDLING VERIFICATION")
    print("-" * 30)
    
    # Check for 201 status code handling
    if 'response.status_code in [200, 201]' in backend_code:
        print("✅ STATUS CODES: Handles both 200 and 201 responses")
    elif 'response.status_code == 200' in backend_code:
        print("⚠️ STATUS CODES: Only handles 200, may miss 201 responses")
    else:
        print("❌ STATUS CODES: Response handling not found")
    
    # Check for nested data structure handling
    nested_data_patterns = [
        r'result\.get\("data",\s*{}\)',
        r'data_section\.get\("data",\s*{}\)',
        r'checkout_data\s*=.*data_section\.get\("data"'
    ]
    
    nested_found = any(re.search(pattern, backend_code) for pattern in nested_data_patterns)
    if nested_found:
        print("✅ NESTED DATA: Handles nested data structure")
    else:
        print("❌ NESTED DATA: May not handle nested response structure")
    
    print()
    
    # Test 4: Check webhook handling
    print("4. WEBHOOK HANDLING VERIFICATION")
    print("-" * 30)
    
    # Look for tx_ref handling in webhook
    webhook_patterns = [
        r'webhook_data\.get\("tx_ref"\)',
        r'transaction_id\s*=.*tx_ref',
        r'paychangu_transaction_id.*tx_ref'
    ]
    
    webhook_found = any(re.search(pattern, backend_code) for pattern in webhook_patterns)
    if webhook_found:
        print("✅ WEBHOOK TX_REF: Handles tx_ref field in webhooks")
    else:
        print("❌ WEBHOOK TX_REF: May not handle tx_ref field properly")
    
    # Check for webhook error handling
    if 'json.JSONDecodeError' in backend_code and 'webhook' in backend_code.lower():
        print("✅ WEBHOOK ERROR HANDLING: Has JSON error handling")
    else:
        print("⚠️ WEBHOOK ERROR HANDLING: May need JSON error handling")
    
    print()
    
    # Test 5: Check for environment variables
    print("5. CONFIGURATION VERIFICATION")
    print("-" * 30)
    
    env_vars = [
        'PAYCHANGU_PUBLIC_KEY',
        'PAYCHANGU_SECRET_KEY', 
        'PAYCHANGU_BASE_URL'
    ]
    
    for var in env_vars:
        if var in backend_code:
            print(f"✅ {var}: Referenced in code")
        else:
            print(f"❌ {var}: Not found in code")
    
    # Check actual environment values
    print("\nEnvironment Values:")
    for var in env_vars:
        value = os.environ.get(var, 'NOT SET')
        if value and value != 'NOT SET':
            print(f"✅ {var}: Configured")
        else:
            print(f"❌ {var}: Not configured")
    
    print()
    
    # Summary
    print("=" * 60)
    print("🏁 ANALYSIS SUMMARY")
    print("=" * 60)
    
    # Count the fixes
    fixes_status = {
        "Correct API Endpoint": "/payment" in backend_code and "requests.post" in backend_code,
        "Updated Request Format": "tx_ref" in backend_code and "customization" in backend_code,
        "Enhanced Response Handling": "[200, 201]" in backend_code,
        "Webhook Updates": "tx_ref" in backend_code and "webhook" in backend_code.lower(),
        "Environment Configuration": all(os.environ.get(var) for var in env_vars)
    }
    
    passed = sum(fixes_status.values())
    total = len(fixes_status)
    
    for fix, status in fixes_status.items():
        status_icon = "✅" if status else "❌"
        print(f"{status_icon} {fix}")
    
    print(f"\nOverall Status: {passed}/{total} fixes verified")
    
    if passed == total:
        print("🎉 ALL FIXES VERIFIED: Paychangu integration appears to be correctly implemented!")
    elif passed >= total * 0.8:
        print("✅ MOSTLY FIXED: Most Paychangu integration fixes are in place")
    else:
        print("⚠️ NEEDS ATTENTION: Several Paychangu integration fixes may be missing")
    
    return passed == total

if __name__ == "__main__":
    success = analyze_paychangu_integration()
    exit(0 if success else 1)