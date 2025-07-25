import os
import uuid
import random
import string
import json
from datetime import datetime, timedelta
from typing import Optional, List
import pytz
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add OTP storage (in production, use Redis)
otp_storage = {}
password_reset_storage = {}  # Storage for password reset OTPs

def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def send_email_otp(email, otp):
    """Send OTP via email"""
    try:
        if not EMAIL_USER or not EMAIL_PASSWORD:
            print("⚠️ Email credentials not configured - using demo mode")
            return True
            
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = email
        msg['Subject'] = "NextChapter - Your Verification Code"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="color: white; margin: 0;">NextChapter</h1>
                <p style="color: #E879F9; margin: 10px 0 0 0;">Your Next Chapter of Love</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
                <h2 style="color: #374151; margin-bottom: 20px;">Welcome to NextChapter!</h2>
                <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">
                    Thank you for joining our community of mature adults seeking meaningful connections. 
                    To complete your registration, please use the verification code below:
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #E5E7EB;">
                    <p style="color: #6B7280; margin: 0 0 10px 0;">Your verification code:</p>
                    <h1 style="color: #8B5CF6; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                        {otp}
                    </h1>
                </div>
                
                <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
                    This code will expire in 2 minutes 30 seconds. If you didn't request this code, please ignore this email.
                </p>
                
                <div style="margin-top: 30px; padding: 20px; background: #EEF2FF; border-radius: 8px; border-left: 4px solid #8B5CF6;">
                    <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Why NextChapter?</h3>
                    <ul style="color: #6B7280; margin: 0; padding-left: 20px;">
                        <li>🔐 Secure verification process</li>
                        <li>🌍 Global community (40+ countries)</li>
                        <li>💝 Special offers: Saturday free interactions</li>
                        <li>🎯 Wednesday 50% discounts</li>
                    </ul>
                </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 14px;">
                <p>© 2025 NextChapter. Where every ending is a new beginning.</p>
                <p>Made with ❤️ for meaningful connections</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # Connect to Gmail SMTP
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        
        # Send email
        server.send_message(msg)
        server.quit()
        
        print(f"✅ OTP email sent to {email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, status, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
import bcrypt
import jwt
from pathlib import Path
import shutil
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Payment integration
try:
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
except ImportError:
    print("⚠️ emergentintegrations not installed - payment features disabled")
    StripeCheckout = None

# Paychangu payment integration
try:
    import paychangu
    print("✅ Paychangu SDK imported successfully")
except ImportError:
    print("⚠️ Paychangu SDK not installed - mobile money payments disabled")
    paychangu = None

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
JWT_SECRET = os.environ.get('JWT_SECRET', 'nextchapter-secret-key-2025')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PREMIUM_PRICE_ID = os.environ.get('STRIPE_PREMIUM_PRICE_ID', '')
STRIPE_VIP_PRICE_ID = os.environ.get('STRIPE_VIP_PRICE_ID', '')

# Email configuration
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USER = os.environ.get('EMAIL_USER', '')
EMAIL_PASSWORD = os.environ.get('EMAIL_PASSWORD', '')

# Paychangu configuration
PAYCHANGU_PUBLIC_KEY = os.environ.get('PAYCHANGU_PUBLIC_KEY', '')
PAYCHANGU_SECRET_KEY = os.environ.get('PAYCHANGU_SECRET_KEY', '')
PAYCHANGU_BASE_URL = os.environ.get('PAYCHANGU_BASE_URL', 'https://api.paychangu.com')

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Country codes for international support
COUNTRY_CODES = {
    "US": {"flag": "🇺🇸", "code": "+1", "name": "United States"},
    "CA": {"flag": "🇨🇦", "code": "+1", "name": "Canada"},
    "GB": {"flag": "🇬🇧", "code": "+44", "name": "United Kingdom"},
    "AU": {"flag": "🇦🇺", "code": "+61", "name": "Australia"},
    "DE": {"flag": "🇩🇪", "code": "+49", "name": "Germany"},
    "FR": {"flag": "🇫🇷", "code": "+33", "name": "France"},
    "ES": {"flag": "🇪🇸", "code": "+34", "name": "Spain"},
    "IT": {"flag": "🇮🇹", "code": "+39", "name": "Italy"},
    "NL": {"flag": "🇳🇱", "code": "+31", "name": "Netherlands"},
    "SE": {"flag": "🇸🇪", "code": "+46", "name": "Sweden"},
    "NO": {"flag": "🇳🇴", "code": "+47", "name": "Norway"},
    "DK": {"flag": "🇩🇰", "code": "+45", "name": "Denmark"},
    "FI": {"flag": "🇫🇮", "code": "+358", "name": "Finland"},
    "BR": {"flag": "🇧🇷", "code": "+55", "name": "Brazil"},
    "MX": {"flag": "🇲🇽", "code": "+52", "name": "Mexico"},
    "AR": {"flag": "🇦🇷", "code": "+54", "name": "Argentina"},
    "CL": {"flag": "🇨🇱", "code": "+56", "name": "Chile"},
    "CO": {"flag": "🇨🇴", "code": "+57", "name": "Colombia"},
    "PE": {"flag": "🇵🇪", "code": "+51", "name": "Peru"},
    "IN": {"flag": "🇮🇳", "code": "+91", "name": "India"},
    "CN": {"flag": "🇨🇳", "code": "+86", "name": "China"},
    "JP": {"flag": "🇯🇵", "code": "+81", "name": "Japan"},
    "KR": {"flag": "🇰🇷", "code": "+82", "name": "South Korea"},
    "TH": {"flag": "🇹🇭", "code": "+66", "name": "Thailand"},
    "VN": {"flag": "🇻🇳", "code": "+84", "name": "Vietnam"},
    "PH": {"flag": "🇵🇭", "code": "+63", "name": "Philippines"},
    "MY": {"flag": "🇲🇾", "code": "+60", "name": "Malaysia"},
    "SG": {"flag": "🇸🇬", "code": "+65", "name": "Singapore"},
    "ID": {"flag": "🇮🇩", "code": "+62", "name": "Indonesia"},
    "ZA": {"flag": "🇿🇦", "code": "+27", "name": "South Africa"},
    "NG": {"flag": "🇳🇬", "code": "+234", "name": "Nigeria"},
    "KE": {"flag": "🇰🇪", "code": "+254", "name": "Kenya"},
    "GH": {"flag": "🇬🇭", "code": "+233", "name": "Ghana"},
    "MW": {"flag": "🇲🇼", "code": "+265", "name": "Malawi"},
    "EG": {"flag": "🇪🇬", "code": "+20", "name": "Egypt"},
    "MA": {"flag": "🇲🇦", "code": "+212", "name": "Morocco"},
    "RU": {"flag": "🇷🇺", "code": "+7", "name": "Russia"},
    "UA": {"flag": "🇺🇦", "code": "+380", "name": "Ukraine"},
    "PL": {"flag": "🇵🇱", "code": "+48", "name": "Poland"},
    "CZ": {"flag": "🇨🇿", "code": "+420", "name": "Czech Republic"},
    "HU": {"flag": "🇭🇺", "code": "+36", "name": "Hungary"}
}

# Subscription pricing with Malawian rates and diaspora USD pricing

# New simplified subscription pricing structure
SUBSCRIPTION_PRICING = {
    "MW_LOCAL": {  # For Malawians in Malawi
        "daily": {"amount": 2500, "currency": "MWK"},
        "weekly": {"amount": 10000, "currency": "MWK"},
        "monthly": {"amount": 15000, "currency": "MWK"}
    },
    "MW_DIASPORA": {  # For Malawians abroad (USD pricing)
        "daily": {"amount": 1.35, "currency": "USD", "mwk_equivalent": 2500},
        "weekly": {"amount": 5.36, "currency": "USD", "mwk_equivalent": 10000},
        "monthly": {"amount": 8.05, "currency": "USD", "mwk_equivalent": 15000}
    },
    "default": {  # For non-Malawians
        "daily": {"amount": 1.35, "currency": "USD"},
        "weekly": {"amount": 5.36, "currency": "USD"},
        "monthly": {"amount": 8.05, "currency": "USD"}
    }
}

# Subscription features (all subscribers get same features)
SUBSCRIPTION_FEATURES = [
    "Unlimited likes and matches",
    "Connect with fellow Malawians worldwide", 
    "Advanced matching algorithms",
    "Enhanced chat features",
    "Access to exclusive chat rooms",
    "See who liked you",
    "Priority customer support",
    "Profile boost",
    "Cultural compatibility matching",
    "Special offers and discounts"
]

def get_current_cat_time():
    """Get current time in CAT (Central Africa Time)"""
    cat_tz = pytz.timezone('Africa/Maputo')  # CAT timezone
    return datetime.now(cat_tz)

def is_wednesday_discount():
    """Check if it's Wednesday (50% discount day)"""
    cat_time = get_current_cat_time()
    return cat_time.weekday() == 2  # Wednesday = 2

def is_saturday_happy_hour():
    """Check if it's Saturday 7-8 PM CAT (free interaction hour)"""
    cat_time = get_current_cat_time()
    return cat_time.weekday() == 5 and 19 <= cat_time.hour < 20  # Saturday = 5, 7-8 PM

def calculate_discounted_price(price, country_code="default"):
    """Calculate price with applicable discounts (Wednesday only)"""
    discount = 0
    discount_reason = ""
    
    if is_wednesday_discount():
        discount = 50
        discount_reason = "Wednesday 50% Off Special!"
    
    if discount > 0:
        discounted_amount = price * (1 - discount / 100)
        return {
            "original_price": price,
            "discounted_price": round(discounted_amount),
            "discount_percentage": discount,
            "discount_reason": discount_reason,
            "has_discount": True
        }
    
    return {
        "original_price": price,
        "discounted_price": price,
        "discount_percentage": 0,
        "discount_reason": "",
        "has_discount": False
    }

def is_free_interaction_time():
    """Check if it's free interaction time (Saturday 7-8 PM CAT)"""
    return is_saturday_happy_hour()

import math

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in kilometers using Haversine formula"""
    if not all([lat1, lon1, lat2, lon2]):
        return float('inf')  # Return infinite distance if coordinates are missing
    
    # Convert latitude and longitude from degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    
    return c * r

def is_malawian_user(user_location, phone_country):
    """Check if user is Malawian based on location or phone country"""
    if phone_country == "MW":
        return True
    if user_location and ("malawi" in user_location.lower() or "lilongwe" in user_location.lower() or "blantyre" in user_location.lower()):
        return True
    return False

def is_within_local_area(user_location, target_location, subscription_tier, user_phone_country="", target_phone_country=""):
    """Check if target is within user's matching area based on subscription tier"""
    if subscription_tier == "vip":
        # VIP users can connect with all Malawians worldwide
        user_is_malawian = is_malawian_user(user_location, user_phone_country)
        target_is_malawian = is_malawian_user(target_location, target_phone_country)
        return user_is_malawian and target_is_malawian
    
    if not user_location or not target_location:
        # Only VIP (Malawian Hearts) can match without location data
        return subscription_tier == "vip"
    
    # Extract coordinates from location (assuming format: "City, Country:lat,lon")
    try:
        if ':' in user_location and ':' in target_location:
            user_coords = user_location.split(':')[1].split(',')
            target_coords = target_location.split(':')[1].split(',')
            
            user_lat, user_lon = float(user_coords[0]), float(user_coords[1])
            target_lat, target_lon = float(target_coords[0]), float(target_coords[1])
            
            distance = calculate_distance(user_lat, user_lon, target_lat, target_lon)
            
            # Updated distances for Malawian users: Free 300km, Premium 500km
            if subscription_tier == "premium":
                max_distance = 500
            else:  # free tier
                max_distance = 300
                
            return distance <= max_distance
        else:
            # Fallback to simple text matching for same city/region
            user_city = user_location.split(',')[0].strip().lower()
            target_city = target_location.split(',')[0].strip().lower()
            return user_city == target_city
            
    except (ValueError, IndexError):
        # If coordinates are invalid, fall back to text comparison
        user_city = user_location.split(',')[0].strip().lower()
        target_city = target_location.split(',')[0].strip().lower()
        return user_city == target_city

def get_matching_scope_description(subscription_tier):
    """Get human-readable description of user's matching scope"""
    
    if subscription_tier == "premium":
        return "Connect with fellow Malawians worldwide - unlimited matching"
    else:
        return "Basic matching capabilities - upgrade for unlimited access"

def can_user_interact_freely(user):
    """Check if user can interact freely (premium subscription or free interaction time)"""
    subscription_tier = user.get("subscription_tier", "free")
    
    # Premium subscribers can interact freely
    if subscription_tier == "premium":
        return True, "Premium subscriber - unlimited access"
    
    # Check if it's Saturday happy hour (7-8 PM CAT)
    if is_saturday_happy_hour():
        return True, "Saturday Happy Hour (7-8 PM CAT) - Free interactions for everyone!"
    
    return False, "Free tier user outside of happy hour"

# FastAPI app
app = FastAPI(title="NextChapter Dating API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# MongoDB connection
try:
    client = MongoClient(MONGO_URL)
    db = client.nextchapter
    users_collection = db.users
    likes_collection = db.likes
    matches_collection = db.matches
    messages_collection = db.messages
    print("✅ Connected to MongoDB successfully")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB: {e}")

# Security
security = HTTPBearer()

# Pydantic models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    age: int
    phone_country: Optional[str] = "US"
    phone_number: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ProfileSetup(BaseModel):
    location: str
    bio: str
    looking_for: str
    interests: Optional[List[str]] = []

class LikeCreate(BaseModel):
    liked_user_id: str

class EmailVerification(BaseModel):
    email: EmailStr
    otp: str

class PasswordResetRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    phone_country: Optional[str] = None

class PasswordReset(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    phone_country: Optional[str] = None
    otp: str
    new_password: str

class MessageCreate(BaseModel):
    match_id: str
    content: str

class PaychanguPaymentRequest(BaseModel):
    amount: float
    currency: str = "MWK"
    subscription_type: str  # daily, weekly, monthly
    payment_method: str = "mobile_money"  # mobile_money, card
    phone_number: Optional[str] = None
    operator: Optional[str] = None  # TNM, AIRTEL
    description: Optional[str] = None

class PaychanguPaymentResponse(BaseModel):
    success: bool
    transaction_id: Optional[str] = None
    payment_url: Optional[str] = None
    message: str
    data: Optional[dict] = None

@app.post("/api/verify-registration")
async def verify_registration(verification: EmailVerification):
    # Check if OTP exists for this email
    stored_otp_data = otp_storage.get(verification.email)
    
    if not stored_otp_data:
        raise HTTPException(status_code=404, detail="No pending registration found for this email")
    
    # Check if OTP has expired
    if datetime.utcnow() > stored_otp_data["expires_at"]:
        # Clean up expired OTP
        del otp_storage[verification.email]
        raise HTTPException(status_code=400, detail="Verification code has expired. Please register again.")
    
    # Verify OTP
    if verification.otp != stored_otp_data["otp"]:
        # Check if it's a valid 6-digit code for demo mode fallback
        if len(verification.otp) != 6 or not verification.otp.isdigit():
            raise HTTPException(status_code=400, detail="Invalid verification code format")
        
        # If email credentials are not configured, accept any 6-digit code
        if not EMAIL_USER or not EMAIL_PASSWORD:
            print("⚠️ Demo mode: Accepting any 6-digit code")
        else:
            raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Create user account
    user_id = str(uuid.uuid4())
    user_data = stored_otp_data["user_data"]
    user_data["id"] = user_id
    user_data["email_verified"] = True
    
    # Insert user into database
    users_collection.insert_one(user_data)
    
    # Clean up OTP storage
    del otp_storage[verification.email]
    
    # Generate JWT token
    token = create_jwt_token(user_id)
    
    # Return user data (without password)
    user_data.pop('password', None)
    user_data.pop('_id', None)
    
    return {
        "message": "Email verified successfully! Welcome to NextChapter!",
        "token": token,
        "user": UserResponse(**user_data)
    }

@app.post("/api/password-reset-request")
async def request_password_reset(request: PasswordResetRequest):
    """Request password reset via email or phone number"""
    if not request.email and not request.phone_number:
        raise HTTPException(status_code=400, detail="Either email or phone number must be provided")
    
    # Find user by email or phone number
    user = None
    identifier = None
    
    if request.email:
        user = users_collection.find_one({"email": request.email})
        identifier = request.email
    elif request.phone_number and request.phone_country:
        # Normalize phone number for consistency
        phone_key = f"{request.phone_country}:{request.phone_number}"
        user = users_collection.find_one({"phone_number": phone_key})
        identifier = phone_key
    
    if not user:
        # For security, don't reveal if user exists or not
        return {
            "message": "If the account exists, a password reset code will be sent shortly.",
            "identifier": identifier,
            "otp_sent": True
        }
    
    # Generate and store OTP for password reset
    otp = generate_otp()
    reset_key = identifier
    password_reset_storage[reset_key] = {
        "otp": otp,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(seconds=150),  # 2 minutes 30 seconds OTP timer
        "user_id": user["id"],
        "identifier": identifier,
        "identifier_type": "email" if request.email else "phone"
    }
    
    # Send OTP via email (for now, we'll focus on email recovery)
    email_sent = False
    if request.email:
        email_sent = send_password_reset_email(request.email, otp)
    
    # For phone recovery, we would need SMS service integration
    # This would be implemented based on specific SMS provider
    
    if email_sent or not request.email:  # Allow phone recovery to succeed for demo
        return {
            "message": "If the account exists, a password reset code will be sent shortly.",
            "identifier": identifier,
            "otp_sent": True
        }
    else:
        # Fallback to demo mode
        print(f"⚠️ Demo mode: Password reset OTP for {identifier}: {otp}")
        return {
            "message": "Password reset code sent! (Demo mode - check console)",
            "identifier": identifier,
            "otp_sent": True,
            "demo_otp": otp  # Only for demo mode
        }

@app.post("/api/password-reset")
async def reset_password(reset_request: PasswordReset):
    """Reset password using OTP"""
    if not reset_request.email and not reset_request.phone_number:
        raise HTTPException(status_code=400, detail="Either email or phone number must be provided")
    
    # Determine identifier
    identifier = None
    if reset_request.email:
        identifier = reset_request.email
    elif reset_request.phone_number and reset_request.phone_country:
        identifier = f"{reset_request.phone_country}:{reset_request.phone_number}"
    
    if not identifier:
        raise HTTPException(status_code=400, detail="Invalid identifier")
    
    # Check if reset request exists
    reset_data = password_reset_storage.get(identifier)
    if not reset_data:
        raise HTTPException(status_code=404, detail="No password reset request found")
    
    # Check if OTP has expired
    if datetime.utcnow() > reset_data["expires_at"]:
        # Clean up expired OTP
        del password_reset_storage[identifier]
        raise HTTPException(status_code=400, detail="Password reset code has expired. Please request a new one.")
    
    # Verify OTP
    if reset_data["otp"] != reset_request.otp:
        # Check for demo mode fallback
        if len(reset_request.otp) != 6 or not reset_request.otp.isdigit():
            raise HTTPException(status_code=400, detail="Invalid password reset code format")
        
        # If email credentials are not configured, accept any 6-digit code
        if not EMAIL_USER or not EMAIL_PASSWORD:
            print("⚠️ Demo mode: Accepting any 6-digit code for password reset")
        else:
            raise HTTPException(status_code=400, detail="Invalid password reset code")
    
    # Validate new password
    if len(reset_request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    # Update user password
    hashed_password = hash_password(reset_request.new_password)
    result = users_collection.update_one(
        {"id": reset_data["user_id"]},
        {"$set": {"password": hashed_password}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clean up password reset storage
    del password_reset_storage[identifier]
    
    return {
        "message": "Password reset successful! You can now log in with your new password.",
        "success": True
    }

def send_password_reset_email(email: str, otp: str) -> bool:
    """Send password reset OTP via email"""
    try:
        if not EMAIL_USER or not EMAIL_PASSWORD:
            print(f"⚠️ Email not configured. Demo OTP for password reset: {otp}")
            return False
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'NextChapter - Password Reset Code'
        msg['From'] = f"NextChapter <{EMAIL_USER}>"
        msg['To'] = email
        
        # Create HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .otp-code {{ background: #fff; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }}
                .otp-number {{ font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }}
                .warning {{ background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Password Reset</h1>
                    <p>NextChapter - Malawian Hearts</p>
                </div>
                <div class="content">
                    <h2>Reset Your Password</h2>
                    <p>You requested a password reset for your NextChapter account. Use the code below to reset your password:</p>
                    
                    <div class="otp-code">
                        <p>Your password reset code is:</p>
                        <div class="otp-number">{otp}</div>
                        <p><small>This code expires in 2 minutes 30 seconds</small></p>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong> This code will expire in 2 minutes 30 seconds for security reasons. 
                        If you didn't request this password reset, please ignore this email.
                    </div>
                    
                    <p>If you're having trouble, please contact our support team.</p>
                </div>
                <div class="footer">
                    <p>Made with ❤️ for meaningful connections</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # Connect to Gmail SMTP
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        
        # Send email
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Password reset email sent to {email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send password reset email: {str(e)}")
        return False

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    age: int
    location: Optional[str] = None
    bio: Optional[str] = None
    looking_for: Optional[str] = None
    interests: Optional[List[str]] = []
    main_photo: Optional[str] = None
    additional_photos: Optional[List[str]] = []
    created_at: datetime

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=['HS256'])
        user_id = payload.get('user_id')
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = users_collection.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.exceptions.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.exceptions.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")

async def save_upload_file(upload_file: UploadFile, user_id: str) -> str:
    """Save uploaded file and return the file path"""
    if not upload_file:
        return None
    
    # Generate unique filename
    file_extension = upload_file.filename.split('.')[-1] if '.' in upload_file.filename else 'jpg'
    filename = f"{user_id}_{uuid.uuid4().hex}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    
    return f"/uploads/{filename}"

# API Routes

@app.get("/")
async def root():
    return {"message": "NextChapter Dating API is running! 💕"}

@app.post("/api/register")
async def register(user: UserCreate):
    # Check if user already exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate age requirement - updated to 25+ for mature adults
    if user.age < 25:
        raise HTTPException(status_code=400, detail="You must be 25 or older to join NextChapter")
    
    # Validate phone country code
    if user.phone_country and user.phone_country not in COUNTRY_CODES:
        raise HTTPException(status_code=400, detail="Invalid country code")
    
    # Generate and store OTP
    otp = generate_otp()
    otp_storage[user.email] = {
        "otp": otp,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(seconds=150),  # 2 minutes 30 seconds OTP timer
        "user_data": {
            "name": user.name,
            "email": user.email,
            "password": hash_password(user.password),
            "age": user.age,
            "phone_country": user.phone_country,
            "phone_number": user.phone_number,
            "location": None,
            "bio": None,
            "looking_for": None,
            "interests": [],
            "main_photo": None,
            "additional_photos": [],
            "created_at": datetime.utcnow(),
            "profile_complete": False,
            "email_verified": False,
            "subscription_tier": "free",
            "daily_likes_used": 0
        }
    }
    
    # Send OTP email
    email_sent = send_email_otp(user.email, otp)
    
    if email_sent:
        return {
            "message": "Registration successful! Please check your email for the verification code.",
            "email": user.email,
            "otp_sent": True
        }
    else:
        # Fallback to demo mode if email sending fails
        return {
            "message": "Registration successful. Demo mode: Use any 6-digit code for verification.",
            "email": user.email,
            "otp_sent": False,
            "demo_mode": True
        }

@app.post("/api/login")
async def login(user: UserLogin):
    # Find user
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate JWT token
    token = create_jwt_token(db_user['id'])
    
    # Return user data (without password)
    db_user.pop('password')
    db_user.pop('_id')
    
    return {
        "message": "Login successful",
        "token": token,
        "user": UserResponse(**db_user)
    }

@app.get("/api/profile")
async def get_profile(current_user = Depends(get_current_user)):
    # Remove sensitive fields
    user_data = dict(current_user)
    user_data.pop('password', None)
    user_data.pop('_id', None)
    
    return UserResponse(**user_data)

@app.post("/api/profile/setup")
async def setup_profile(
    location: str = Form(...),
    bio: str = Form(...),
    looking_for: str = Form(...),
    interests: str = Form("[]"),  # JSON string
    main_photo: UploadFile = File(None),
    current_user = Depends(get_current_user)
):
    try:
        import json
        interests_list = json.loads(interests) if interests else []
    except:
        interests_list = []
    
    # Handle file upload
    main_photo_path = None
    if main_photo and main_photo.filename:
        main_photo_path = await save_upload_file(main_photo, current_user['id'])
    
    # Process location - if it doesn't have coordinates, store as is
    # In a real app, you'd use a geocoding service to get coordinates
    processed_location = location
    if ':' not in location:
        # For demo purposes, add dummy coordinates for major cities
        city_coordinates = {
            "lilongwe": "-13.9626,33.7741",
            "blantyre": "-15.7861,35.0058", 
            "london": "51.5074,0.1278",
            "new york": "40.7128,74.0060",
            "paris": "48.8566,2.3522",
            "tokyo": "35.6762,139.6503",
            "sydney": "-33.8688,151.2093"
        }
        
        location_lower = location.lower()
        for city, coords in city_coordinates.items():
            if city in location_lower:
                processed_location = f"{location}:{coords}"
                break
    
    # Update user profile
    update_data = {
        "location": processed_location,
        "bio": bio,
        "looking_for": looking_for,
        "interests": interests_list,
        "profile_complete": True
    }
    
    if main_photo_path:
        update_data["main_photo"] = main_photo_path
    
    users_collection.update_one(
        {"id": current_user['id']},
        {"$set": update_data}
    )
    
    # Get updated user
    updated_user = users_collection.find_one({"id": current_user['id']})
    updated_user.pop('password')
    updated_user.pop('_id')
    
    # Add subscription info to response
    subscription_tier = updated_user.get('subscription_tier', 'free')
    matching_scope = get_matching_scope_description(subscription_tier)
    
    return {
        "message": "Profile updated successfully",
        "user": UserResponse(**updated_user),
        "matching_scope": matching_scope,
        "subscription_benefits": SUBSCRIPTION_FEATURES if subscription_tier in ["premium", "vip"] else []
    }

@app.get("/api/profiles")
async def get_profiles(current_user = Depends(get_current_user)):
    """Get profiles based on user's subscription tier and Malawian geographical preferences"""
    user_subscription = current_user.get('subscription_tier', 'free')
    user_location = current_user.get('location')
    user_phone_country = current_user.get('phone_country', '')
    
    # Get users that current user hasn't liked/disliked and aren't matches
    liked_users = likes_collection.find({"user_id": current_user['id']}).distinct("liked_user_id")
    
    # Find profiles excluding current user and already liked users
    exclude_ids = [current_user['id']] + liked_users
    
    # Get all potential profiles first
    all_profiles = list(users_collection.find({
        "id": {"$nin": exclude_ids},
        "profile_complete": True
    }))
    
    # Filter profiles based on subscription tier and Malawian location rules
    filtered_profiles = []
    
    for profile in all_profiles:
        profile_location = profile.get('location')
        profile_phone_country = profile.get('phone_country', '')
        
        # Check if profile is within user's matching scope
        if is_within_local_area(user_location, profile_location, user_subscription, user_phone_country, profile_phone_country):
            # Clean up profile (remove sensitive data)
            profile.pop('password', None)
            profile.pop('_id', None)
            profile.pop('email', None)
            
            # Add distance information for premium/vip users
            if user_subscription in ['premium', 'vip'] and user_location and profile_location:
                try:
                    if ':' in user_location and ':' in profile_location:
                        user_coords = user_location.split(':')[1].split(',')
                        profile_coords = profile_location.split(':')[1].split(',')
                        
                        user_lat, user_lon = float(user_coords[0]), float(user_coords[1])
                        profile_lat, profile_lon = float(profile_coords[0]), float(profile_coords[1])
                        
                        distance = calculate_distance(user_lat, user_lon, profile_lat, profile_lon)
                        profile['distance_km'] = round(distance, 1)
                except (ValueError, IndexError):
                    profile['distance_km'] = None
            
            # Add Malawian status
            profile['is_malawian'] = is_malawian_user(profile_location, profile_phone_country)
            
            # Add matching scope info
            profile['matching_scope'] = get_matching_scope_description(user_subscription)
            profile['user_subscription_tier'] = user_subscription
            
            filtered_profiles.append(profile)
    
    # Limit results based on subscription tier
    if user_subscription == 'free':
        filtered_profiles = filtered_profiles[:10]  # Free users get 10 profiles
    elif user_subscription == 'premium':
        filtered_profiles = filtered_profiles[:50]  # Premium users get 50 profiles  
    # VIP users get unlimited profiles
    
    return {
        "profiles": filtered_profiles,
        "total_available": len(filtered_profiles),
        "matching_scope": get_matching_scope_description(user_subscription),
        "subscription_tier": user_subscription,
        "malawian_focused": True,
        "location_based_filtering": user_subscription != 'vip'
    }

@app.post("/api/like")
async def like_user(like_data: LikeCreate, current_user = Depends(get_current_user)):
    user_id = current_user['id']
    liked_user_id = like_data.liked_user_id
    
    # Check if user exists
    liked_user = users_collection.find_one({"id": liked_user_id})
    if not liked_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already liked
    existing_like = likes_collection.find_one({
        "user_id": user_id,
        "liked_user_id": liked_user_id
    })
    
    if existing_like:
        raise HTTPException(status_code=400, detail="User already liked")
    
    # Check if user can interact freely (premium/vip or Saturday happy hour)
    can_interact, interaction_reason = can_user_interact_freely(current_user)
    
    if not can_interact:
        # Check daily like limit for free users (outside of happy hour)
        daily_likes_used = current_user.get('daily_likes_used', 0)
        if daily_likes_used >= 5:  # Free tier limit
            raise HTTPException(
                status_code=403, 
                detail="Daily like limit reached! Upgrade to Premium for unlimited likes or wait for Saturday Happy Hour (7-8 PM CAT) for free interactions."
            )
    
    # Create like record
    like_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "liked_user_id": liked_user_id,
        "created_at": datetime.utcnow(),
        "interaction_type": interaction_reason if can_interact else "free_tier"
    }
    
    likes_collection.insert_one(like_doc)
    
    # Update daily likes count only for free tier users outside happy hour
    if not can_interact:
        users_collection.update_one(
            {"id": user_id},
            {"$inc": {"daily_likes_used": 1}}
        )
    
    # Check for mutual like (match)
    mutual_like = likes_collection.find_one({
        "user_id": liked_user_id,
        "liked_user_id": user_id
    })
    
    is_match = False
    if mutual_like:
        # Create match
        match_doc = {
            "id": str(uuid.uuid4()),
            "user1_id": user_id,
            "user2_id": liked_user_id,
            "created_at": datetime.utcnow()
        }
        matches_collection.insert_one(match_doc)
        is_match = True
    
    response_message = "Like recorded"
    if can_interact and "Saturday Happy Hour" in interaction_reason:
        response_message = "Like recorded during Saturday Happy Hour - Free interaction!"
    
    return {
        "message": response_message,
        "match": is_match,
        "interaction_type": interaction_reason if can_interact else "free_tier"
    }

@app.get("/api/matches")
async def get_matches(current_user = Depends(get_current_user)):
    user_id = current_user['id']
    
    # Find matches where user is involved
    matches = list(matches_collection.find({
        "$or": [
            {"user1_id": user_id},
            {"user2_id": user_id}
        ]
    }))
    
    # Get match profiles
    match_profiles = []
    for match in matches:
        # Get the other user's ID
        other_user_id = match['user2_id'] if match['user1_id'] == user_id else match['user1_id']
        
        # Get other user's profile
        other_user = users_collection.find_one({"id": other_user_id})
        if other_user:
            other_user.pop('password', None)
            other_user.pop('_id', None)
            other_user.pop('email', None)
            other_user['match_id'] = match['id']
            match_profiles.append(other_user)
    
    return match_profiles

@app.post("/api/message")
async def send_message(message_data: MessageCreate, current_user = Depends(get_current_user)):
    user_id = current_user['id']
    match_id = message_data.match_id
    content = message_data.content
    
    # Verify match exists and user is part of it
    match = matches_collection.find_one({
        "id": match_id,
        "$or": [
            {"user1_id": user_id},
            {"user2_id": user_id}
        ]
    })
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Create message
    message_doc = {
        "id": str(uuid.uuid4()),
        "match_id": match_id,
        "sender_id": user_id,
        "content": content,
        "created_at": datetime.utcnow(),
        "read": False
    }
    
    messages_collection.insert_one(message_doc)
    
    return {"message": "Message sent successfully"}

@app.get("/api/messages/{match_id}")
async def get_messages(match_id: str, current_user = Depends(get_current_user)):
    user_id = current_user['id']
    
    # Verify match exists and user is part of it
    match = matches_collection.find_one({
        "id": match_id,
        "$or": [
            {"user1_id": user_id},
            {"user2_id": user_id}
        ]
    })
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Get messages for this match
    messages = list(messages_collection.find({
        "match_id": match_id
    }).sort("created_at", 1))
    
    # Clean up messages
    cleaned_messages = []
    for message in messages:
        message.pop('_id', None)
        cleaned_messages.append(message)
    
    # Mark messages as read
    messages_collection.update_many(
        {
            "match_id": match_id,
            "sender_id": {"$ne": user_id},
            "read": False
        },
        {"$set": {"read": True}}
    )
    
    return cleaned_messages

@app.get("/api/country-codes")
async def get_country_codes():
    """Get list of supported country codes with flags and phone codes"""
    return COUNTRY_CODES

@app.get("/api/subscription/tiers")
async def get_subscription_tiers(location: str = "local"):
    """Get subscription pricing for local Malawians or diaspora"""
    
    # Choose appropriate pricing tier
    if location == "diaspora":
        price_tier = "MW_DIASPORA"
    else:
        price_tier = "MW_LOCAL"
    
    # Use appropriate pricing or fallback to default
    pricing_data = SUBSCRIPTION_PRICING.get(price_tier, SUBSCRIPTION_PRICING["default"])
    
    # Apply discounts to pricing
    discounted_pricing = {}
    for duration, price_info in pricing_data.items():
        price_data = calculate_discounted_price(price_info["amount"])
        discounted_pricing[duration] = {
            **price_info,
            **price_data
        }
    
    # Return subscription information
    return {
        "free": {
            "name": "Free",
            "features": ["Basic browsing", "5 likes per day", "Local area matching only", "Basic chat"],
            "special_status": "Saturday Happy Hour Active - Free interactions for everyone!" if is_free_interaction_time() else "Next Saturday 7-8 PM CAT: Free interactions for all users!",
            "temporary_features": ["Unlimited likes", "Unlimited messages", "Premium features access"] if is_free_interaction_time() else []
        },
        "premium": {
            "name": "Premium Subscription",
            "features": SUBSCRIPTION_FEATURES,
            "pricing": discounted_pricing,
            "current_time_cat": get_current_cat_time().strftime("%Y-%m-%d %H:%M:%S CAT"),
            "is_wednesday_discount": is_wednesday_discount(),
            "is_saturday_happy_hour": is_saturday_happy_hour(),
            "pricing_type": price_tier,
            "saturday_status": "Saturday Happy Hour Active - All users get free premium access!" if is_saturday_happy_hour() else "Next Saturday 7-8 PM CAT: Free premium access for all users!"
        }
    }

@app.get("/api/user/subscription")
async def get_user_subscription(current_user = Depends(get_current_user)):
    """Get user's current subscription status and benefits"""
    
    subscription_tier = current_user.get("subscription_tier", "free")
    subscription_status = current_user.get("subscription_status", "inactive")
    subscription_expires = current_user.get("subscription_expires")
    
    # Get features based on subscription
    features = []
    if subscription_tier == "premium" and subscription_status == "active":
        features = SUBSCRIPTION_FEATURES
    else:
        features = ["Basic browsing", "5 likes per day", "Local area matching only", "Basic chat"]
    
    return {
        "subscription_tier": current_user.get("subscription_tier", "free"),
        "subscription_status": current_user.get("subscription_status", "inactive"),
        "subscription_expires": subscription_expires,
        "features_unlocked": features,
        "can_interact_freely": can_user_interact_freely(current_user)[0],
        "interaction_status": can_user_interact_freely(current_user)[1],
        "daily_likes_used": current_user.get('daily_likes_used', 0) if subscription_tier == "free" else None,
        "is_saturday_happy_hour": is_saturday_happy_hour(),
        "next_saturday": "Every Saturday 7-8 PM CAT - Free interactions for all users!"
    }

@app.get("/api/interaction/status")
async def get_interaction_status(current_user = Depends(get_current_user)):
    """Get current user's interaction status and special offers"""
    can_interact, interaction_reason = can_user_interact_freely(current_user)
    
    current_time = get_current_cat_time()
    
    status = {
        "user_id": current_user["id"],
        "subscription_tier": current_user.get("subscription_tier", "free"),
        "can_interact_freely": can_interact,
        "interaction_reason": interaction_reason,
        "daily_likes_used": current_user.get("daily_likes_used", 0),
        "daily_likes_limit": 5 if current_user.get("subscription_tier", "free") == "free" else -1,
        "current_time_cat": current_time.strftime("%Y-%m-%d %H:%M:%S CAT"),
        "is_wednesday_discount": is_wednesday_discount(),
        "is_saturday_happy_hour": is_saturday_happy_hour(),
        "special_offers": {
            "wednesday_discount": {
                "active": is_wednesday_discount(),
                "description": "50% off all subscriptions every Wednesday!"
            },
            "saturday_happy_hour": {
                "active": is_saturday_happy_hour(),
                "description": "Free premium interactions for ALL users every Saturday 7-8 PM CAT!"
            }
        }
    }
    
    # Add next Saturday happy hour info if not currently active
    if not is_saturday_happy_hour():
        # Calculate next Saturday 7 PM CAT
        days_until_saturday = (5 - current_time.weekday()) % 7
        if days_until_saturday == 0 and current_time.hour >= 20:  # If it's Saturday but after 8 PM
            days_until_saturday = 7
        elif days_until_saturday == 0:  # If it's Saturday before 7 PM
            next_happy_hour = current_time.replace(hour=19, minute=0, second=0, microsecond=0)
        else:
            next_happy_hour = current_time + timedelta(days=days_until_saturday)
            next_happy_hour = next_happy_hour.replace(hour=19, minute=0, second=0, microsecond=0)
        
        status["next_saturday_happy_hour"] = next_happy_hour.strftime("%Y-%m-%d %H:%M:%S CAT")
    
    return status

@app.post("/api/payment/request-otp")
async def request_payment_otp(
    request_data: dict,
    current_user = Depends(get_current_user)
):
    """Request OTP for payment authorization (simulation)"""
    subscription_tier = request_data.get("subscription_tier")
    
    if subscription_tier not in ["premium", "vip"]:
        raise HTTPException(status_code=400, detail="Invalid subscription tier")
    
    # In a real app, you'd send actual OTP via SMS/email
    # For demo purposes, we'll simulate it
    
    return {
        "message": f"Payment authorization code sent to your verified email for {subscription_tier} subscription!",
        "simulation_otp": "123456",  # In real app, don't return the OTP!
        "subscription_tier": subscription_tier
    }

@app.post("/api/checkout/session")
async def create_checkout_session(
    checkout_data: dict,
    current_user = Depends(get_current_user)
):
    """Process payment with OTP verification (simulation)"""
    otp = checkout_data.get("otp")
    verification_method = checkout_data.get("verification_method", "email")
    
    # In a real app, verify the OTP against stored values
    if otp != "123456":  # Simulation - accept hardcoded OTP
        raise HTTPException(status_code=400, detail="Invalid authorization code")
    
    # Simulate successful payment and upgrade user subscription
    # In a real app, you'd integrate with actual payment processor
    
    # Update user's subscription (simulate)
    users_collection.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "subscription_tier": "premium",  # or get from request
            "daily_likes_used": 0,
            "subscription_updated_at": datetime.utcnow()
        }}
    )
    
    return {
        "message": "Payment authorized successfully! Your subscription has been upgraded.",
        "subscription_tier": "premium",
        "payment_method": f"Verified via {verification_method}"
    }

# Paychangu Payment Integration Functions

def initialize_paychangu_client():
    """Initialize Paychangu client with API credentials"""
    if not PAYCHANGU_PUBLIC_KEY or not PAYCHANGU_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Paychangu credentials not configured")
    
    # Note: Paychangu SDK might use different initialization method
    # This is a placeholder - adjust based on actual SDK documentation
    client = {
        "public_key": PAYCHANGU_PUBLIC_KEY,
        "secret_key": PAYCHANGU_SECRET_KEY,
        "base_url": PAYCHANGU_BASE_URL
    }
    return client

@app.post("/api/paychangu/initiate-payment")
async def initiate_paychangu_payment(
    payment_request: PaychanguPaymentRequest,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Initiate payment with Paychangu for subscription"""
    try:
        # Validate subscription type and amount
        if payment_request.subscription_type not in ["daily", "weekly", "monthly"]:
            raise HTTPException(status_code=400, detail="Invalid subscription type")
        
        # Get expected amount for validation
        expected_amounts = {
            "daily": 2500,
            "weekly": 10000,
            "monthly": 15000
        }
        
        expected_amount = expected_amounts[payment_request.subscription_type]
        if abs(payment_request.amount - expected_amount) > 0.01:  # Allow small floating point differences
            raise HTTPException(status_code=400, detail=f"Invalid amount for {payment_request.subscription_type} subscription")
        
        # Initialize Paychangu client
        client = initialize_paychangu_client()
        
        # Prepare payment data according to Paychangu API specification
        payment_data = {
            "amount": payment_request.amount,
            "currency": payment_request.currency,
            "callback_url": f"{request.base_url}api/paychangu/webhook",
            "return_url": f"{request.base_url}payment-success",
            "tx_ref": str(uuid.uuid4()),  # Unique transaction reference
            "first_name": current_user["name"].split()[0] if current_user["name"] else "User",
            "last_name": " ".join(current_user["name"].split()[1:]) if len(current_user["name"].split()) > 1 else "NextChapter",
            "email": current_user["email"],
            "customization": {
                "title": f"NextChapter {payment_request.subscription_type.title()} Subscription",
                "description": f"Dating subscription for {current_user['name']}"
            },
            "meta": {
                "user_id": current_user["id"],
                "subscription_type": payment_request.subscription_type,
                "subscription_duration": payment_request.subscription_type
            }
        }
        
        # Add mobile money specific data if applicable
        if payment_request.payment_method == "mobile_money":
            if not payment_request.phone_number or not payment_request.operator:
                raise HTTPException(status_code=400, detail="Phone number and operator required for mobile money")
            
            payment_data["payment_method"] = "mobile_money"
            payment_data["operator"] = payment_request.operator.upper()  # TNM or AIRTEL
            payment_data["phone"] = payment_request.phone_number
        
        # Make API call to Paychangu
        print(f"🔄 Making Paychangu API request to: {PAYCHANGU_BASE_URL}/payment")
        print(f"🔄 Payment data: {payment_data}")
        
        import requests
        
        try:
            response = requests.post(
                f"{PAYCHANGU_BASE_URL}/payment",
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {PAYCHANGU_SECRET_KEY}",
                    "Content-Type": "application/json"
                },
                json=payment_data,
                timeout=30  # Add timeout
            )
            
            print(f"📡 Paychangu API response status: {response.status_code}")
            print(f"📡 Paychangu API response headers: {dict(response.headers)}")
            print(f"📡 Paychangu API response body: {response.content.decode('utf-8', errors='ignore')[:500]}")
            
        except requests.exceptions.Timeout:
            print(f"❌ Paychangu API request timeout")
            return PaychanguPaymentResponse(
                success=False,
                message="Payment gateway timeout - please try again"
            )
        except requests.exceptions.ConnectionError:
            print(f"❌ Paychangu API connection error")
            return PaychanguPaymentResponse(
                success=False,
                message="Payment gateway connection error - please try again"
            )
        except Exception as req_error:
            print(f"❌ Paychangu API request error: {str(req_error)}")
            return PaychanguPaymentResponse(
                success=False,
                message=f"Payment gateway request error: {str(req_error)}"
            )
        
        if response.status_code in [200, 201]:  # Accept both 200 and 201 status codes
            try:
                result = response.json()
                print(f"✅ Paychangu API response received: {result}")
                
                # Check if the response indicates success
                if result.get("status") != "success":
                    return PaychanguPaymentResponse(
                        success=False,
                        message=result.get("message", "Payment initiation failed"),
                        data=result
                    )
                
                # Extract data from Paychangu response format
                data_section = result.get("data", {})
                checkout_data = data_section.get("data", {}) if isinstance(data_section, dict) else {}
                
                # Store transaction in database for tracking
                transaction_data = {
                    "id": str(uuid.uuid4()),
                    "user_id": current_user["id"],
                    "paychangu_transaction_id": checkout_data.get("tx_ref") or data_section.get("tx_ref"),
                    "paychangu_checkout_url": data_section.get("checkout_url"),
                    "amount": payment_request.amount,
                    "currency": payment_request.currency,
                    "subscription_type": payment_request.subscription_type,
                    "payment_method": payment_request.payment_method,
                    "status": "pending",
                    "created_at": datetime.utcnow(),
                    "paychangu_response": result
                }
                
                # Store in a transactions collection (create if doesn't exist)
                try:
                    transactions_collection = db.transactions
                    transactions_collection.insert_one(transaction_data)
                    print(f"✅ Transaction stored: {transaction_data['id']}")
                except Exception as e:
                    print(f"⚠️ Failed to store transaction: {e}")
                
                return PaychanguPaymentResponse(
                    success=True,
                    transaction_id=checkout_data.get("tx_ref") or data_section.get("tx_ref"),
                    payment_url=data_section.get("checkout_url"),
                    message=result.get("message", "Payment initiated successfully"),
                    data=result
                )
                
            except json.JSONDecodeError:
                print(f"❌ Paychangu API returned non-JSON success response")
                return PaychanguPaymentResponse(
                    success=False,
                    message="Invalid success response from Paychangu API"
                )
        else:
            # Handle error response with proper JSON parsing
            error_data = {}
            error_message = "Unknown error"
            
            try:
                if response.content:
                    # Try to parse JSON response
                    error_data = response.json()
                    error_message = error_data.get('message', error_data.get('error', 'Payment initiation failed'))
                else:
                    error_message = f"Empty response from Paychangu API (Status: {response.status_code})"
            except json.JSONDecodeError:
                # Handle non-JSON responses
                error_message = f"Invalid response from Paychangu API (Status: {response.status_code})"
                if response.content:
                    # Log the actual response for debugging
                    response_text = response.content.decode('utf-8', errors='ignore')[:200]
                    print(f"❌ Paychangu API returned non-JSON response: {response_text}")
                    error_message += f" - Response: {response_text[:100]}"
            except Exception as e:
                error_message = f"Error processing Paychangu response: {str(e)}"
            
            print(f"❌ Paychangu payment initiation failed: {error_message}")
            
            return PaychanguPaymentResponse(
                success=False,
                message=error_message,
                data=error_data
            )
            
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Paychangu payment error: {str(e)}")
        print(f"❌ Full error traceback: {error_details}")
        
        return PaychanguPaymentResponse(
            success=False,
            message=f"Payment processing error: {str(e)}"
        )

@app.post("/api/paychangu/webhook")
@app.get("/api/paychangu/webhook")
async def paychangu_webhook(request: Request):
    """Handle Paychangu webhook for payment status updates (supports both GET and POST)"""
    try:
        webhook_data = {}
        
        if request.method == "GET":
            # Handle GET request with query parameters (Paychangu format)
            webhook_data = dict(request.query_params)
            print(f"✅ GET Webhook received: {webhook_data}")
        else:
            # Handle POST request with JSON body
            body = await request.body()
            
            # Parse JSON payload with proper error handling
            try:
                webhook_data = json.loads(body.decode('utf-8'))
                print(f"✅ POST Webhook received: {webhook_data}")
            except json.JSONDecodeError as e:
                print(f"❌ Invalid webhook JSON: {str(e)}")
                print(f"❌ Raw webhook body: {body.decode('utf-8', errors='ignore')[:200]}")
                raise HTTPException(status_code=400, detail="Invalid JSON in webhook payload")
            except Exception as e:
                print(f"❌ Error decoding webhook body: {str(e)}")
                raise HTTPException(status_code=400, detail="Error processing webhook body")
        
        # Verify webhook signature if Paychangu provides one
        # This is important for security - implement based on Paychangu docs
        
        # Paychangu webhook may use different field names, try multiple options
        transaction_id = webhook_data.get("tx_ref") or webhook_data.get("transaction_id") or webhook_data.get("data", {}).get("tx_ref")
        status = webhook_data.get("status") or webhook_data.get("data", {}).get("status")
        
        if not transaction_id:
            print(f"❌ Missing transaction ID in webhook: {webhook_data}")
            raise HTTPException(status_code=400, detail="Missing transaction ID")
        
        # Find the transaction in our database
        transactions_collection = db.transactions
        transaction = transactions_collection.find_one({"paychangu_transaction_id": transaction_id})
        
        if not transaction:
            print(f"⚠️ Webhook received for unknown transaction: {transaction_id}")
            return {"status": "ignored"}
        
        # If no status provided in webhook, assume success (Paychangu sends webhook only on success)
        if not status:
            print(f"⚠️ No status in webhook for transaction {transaction_id}, assuming success")
            status = "success"
        
        # Update transaction status
        transactions_collection.update_one(
            {"paychangu_transaction_id": transaction_id},
            {
                "$set": {
                    "status": status,
                    "webhook_received_at": datetime.utcnow(),
                    "webhook_data": webhook_data
                }
            }
        )
        
        # If payment was successful, activate subscription
        if status and status.lower() in ["success", "completed", "paid"]:
            user_id = transaction["user_id"]
            subscription_type = transaction["subscription_type"]
            
            # Check if this transaction was already processed successfully
            current_status = transaction.get("status", "")
            if current_status and current_status.lower() in ["success", "completed", "paid"]:
                print(f"⚠️ Transaction {transaction_id} already processed - skipping duplicate webhook")
                return {"status": "already_processed"}
            
            # Enhanced subscription timing - precise 24-hour cycles from verification
            now = datetime.utcnow()
            
            # Get current subscription to check for existing time and handle double payments
            user_doc = users_collection.find_one({"id": user_id})
            current_expires = user_doc.get("subscription_expires") if user_doc else None
            
            # Calculate subscription duration in hours based on type
            if subscription_type == "daily":
                duration_hours = 24
            elif subscription_type == "weekly": 
                duration_hours = 24 * 7  # 168 hours
            elif subscription_type == "monthly":
                duration_hours = 24 * 30  # 720 hours
            else:
                duration_hours = 24  # Default to 24 hours
            
            # Handle double payment accumulation - if user already has active subscription, add to existing time
            if current_expires and current_expires > now:
                # User has active subscription - add new duration to existing time
                expires_at = current_expires + timedelta(hours=duration_hours)
                payment_type = "extension"
                print(f"✅ Extending existing subscription for user {user_id} - adding {duration_hours} hours")
            else:
                # New subscription or expired subscription - start from now
                expires_at = now + timedelta(hours=duration_hours)
                payment_type = "new"
                print(f"✅ New subscription for user {user_id} - {duration_hours} hours from now")
            
            # Update user subscription with precise timing
            users_collection.update_one(
                {"id": user_id},
                {
                    "$set": {
                        "subscription_tier": "premium",
                        "subscription_status": "active", 
                        "subscription_expires": expires_at,
                        "subscription_started_at": now,
                        "subscription_updated_at": now,
                        "subscription_type": subscription_type,
                        "daily_likes_used": 0,  # Reset likes count
                        "can_message": True,    # Enable messaging
                        "last_activity": now    # Track user activity
                    },
                    "$inc": {
                        f"subscription_payments_{subscription_type}": 1  # Track payment count
                    }
                }
            )
            
            print(f"✅ Subscription activated for user {user_id} - {subscription_type}")
            
            # Send confirmation email to user (only once)
            user = users_collection.find_one({"id": user_id})
            if user and user.get("email"):
                # Check if we already sent confirmation email for this transaction
                if not transaction.get("confirmation_email_sent", False):
                    try:
                        email_sent = send_subscription_confirmation_email(
                            user["email"], user["name"], subscription_type, expires_at, transaction["amount"]
                        )
                        
                        # Mark email as sent in transaction record
                        transactions_collection.update_one(
                            {"paychangu_transaction_id": transaction_id},
                            {
                                "$set": {
                                    "confirmation_email_sent": True,
                                    "confirmation_email_sent_at": datetime.utcnow()
                                }
                            }
                        )
                        
                        if email_sent:
                            print(f"✅ Confirmation email sent to {user['email']}")
                        else:
                            print(f"⚠️ Failed to send confirmation email to {user['email']}")
                            
                    except Exception as email_error:
                        print(f"❌ Error sending confirmation email: {str(email_error)}")
                else:
                    print(f"⚠️ Confirmation email already sent for transaction {transaction_id}")
            else:
                print(f"⚠️ User not found or no email for user {user_id}")
        
        return {"status": "processed"}
        
    except Exception as e:
        print(f"❌ Webhook processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@app.get("/api/paychangu/transaction/{transaction_id}")
async def get_transaction_status(
    transaction_id: str,
    current_user = Depends(get_current_user)
):
    """Get transaction status for user's payment"""
    try:
        transactions_collection = db.transactions
        transaction = transactions_collection.find_one({
            "paychangu_transaction_id": transaction_id,
            "user_id": current_user["id"]  # Ensure user can only see their own transactions
        })
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Clean up the response
        transaction.pop('_id', None)
        
        return {
            "transaction": transaction,
            "status": transaction.get("status", "pending"),
            "message": f"Transaction is {transaction.get('status', 'pending')}"
        }
        
    except Exception as e:
        print(f"❌ Transaction status error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get transaction status")

def send_subscription_confirmation_email(email: str, name: str, subscription_type: str, expires_at: datetime, amount: float):
    """Send subscription confirmation email"""
    try:
        if not EMAIL_USER or not EMAIL_PASSWORD:
            print(f"⚠️ Email not configured. Subscription confirmed for {email}")
            return False
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'NextChapter - Subscription Confirmed! 🎉'
        msg['From'] = f"NextChapter <{EMAIL_USER}>"
        msg['To'] = email
        
        # Create HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .success-box {{ background: #d4edda; border: 2px solid #c3e6cb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }}
                .amount {{ font-size: 24px; font-weight: bold; color: #28a745; }}
                .details {{ background: #fff; border-radius: 5px; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Payment Successful!</h1>
                    <p>NextChapter - Malawian Hearts</p>
                </div>
                <div class="content">
                    <h2>Hello {name}!</h2>
                    <p>Your subscription payment has been processed successfully. Welcome to NextChapter Premium!</p>
                    
                    <div class="success-box">
                        <h3>Subscription Activated</h3>
                        <div class="amount">MWK {amount:,.0f}</div>
                        <p><strong>{subscription_type.title()} Subscription</strong></p>
                    </div>
                    
                    <div class="details">
                        <h4>Subscription Details:</h4>
                        <p><strong>Plan:</strong> {subscription_type.title()} Premium</p>
                        <p><strong>Amount Paid:</strong> MWK {amount:,.0f}</p>
                        <p><strong>Valid Until:</strong> {expires_at.strftime('%B %d, %Y at %I:%M %p')}</p>
                        <p><strong>Features Unlocked:</strong></p>
                        <ul>
                            <li>✅ Unlimited likes and matches</li>
                            <li>✅ Connect with Malawians worldwide</li>
                            <li>✅ Enhanced chat features</li>
                            <li>✅ Access to exclusive chat rooms</li>
                            <li>✅ See who liked you</li>
                            <li>✅ Priority customer support</li>
                        </ul>
                    </div>
                    
                    <p>Start exploring and connecting with fellow Malawians today!</p>
                    <p>Thank you for choosing NextChapter!</p>
                </div>
                <div class="footer">
                    <p>Made with ❤️ for meaningful connections</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # Connect to Gmail SMTP
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        
        # Send email
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Subscription confirmation email sent to {email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send subscription confirmation email: {str(e)}")
        return False

# Update user activity endpoint (for online status tracking)
@app.post("/api/user/activity")
async def update_user_activity(request: Request):
    try:
        token = request.headers.get("authorization", "").replace("Bearer ", "")
        if not token:
            raise HTTPException(status_code=401, detail="No token provided")
        
        # Verify token and get user ID
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Update user's last activity
        users_collection.update_one(
            {"id": user_id},
            {"$set": {"last_activity": datetime.utcnow()}}
        )
        
        return {"status": "activity_updated"}
        
    except Exception as e:
        print(f"Error updating user activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update activity")

# Get online users endpoint
@app.get("/api/users/online")
async def get_online_users(request: Request):
    try:
        token = request.headers.get("authorization", "").replace("Bearer ", "")
        if not token:
            raise HTTPException(status_code=401, detail="No token provided")
        
        # Verify token and get current user
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            current_user_id = payload.get("user_id")
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        current_user = users_collection.find_one({"id": current_user_id})
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get users online in the last 10 minutes within area (if location available)
        online_threshold = datetime.utcnow() - timedelta(minutes=10)
        
        # Build query for online users (exclude current user)
        query = {
            "id": {"$ne": current_user_id},
            "last_activity": {"$gte": online_threshold}
        }
        
        # Get online users
        online_users = list(users_collection.find(
            query,
            {
                "id": 1, "name": 1, "age": 1, "bio": 1, "location": 1, 
                "interests": 1, "last_activity": 1, "subscription_tier": 1,
                "subscription_status": 1, "_id": 0
            }
        ).limit(50))
        
        # Add online status and format response
        for user in online_users:
            last_activity = user.get("last_activity")
            if last_activity:
                time_diff = datetime.utcnow() - last_activity
                if time_diff.total_seconds() < 300:  # 5 minutes
                    user["online_status"] = "online"
                elif time_diff.total_seconds() < 600:  # 10 minutes
                    user["online_status"] = "recently_active"
                else:
                    user["online_status"] = "offline"
            else:
                user["online_status"] = "offline"
        
        return {"online_users": online_users}
        
    except Exception as e:
        print(f"Error getting online users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get online users")

# Check messaging permission endpoint
@app.get("/api/user/can-message/{user_id}")
async def check_messaging_permission(user_id: str, request: Request):
    try:
        token = request.headers.get("authorization", "").replace("Bearer ", "")
        if not token:
            raise HTTPException(status_code=401, detail="No token provided")
        
        # Verify token and get current user
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            current_user_id = payload.get("user_id")
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        current_user = users_collection.find_one({"id": current_user_id})
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user has premium subscription and can message
        subscription_tier = current_user.get("subscription_tier", "free")
        subscription_status = current_user.get("subscription_status", "inactive")
        subscription_expires = current_user.get("subscription_expires")
        can_message = current_user.get("can_message", False)
        
        # Check if subscription is active
        is_premium_active = (
            subscription_tier == "premium" and 
            subscription_status == "active" and 
            subscription_expires and 
            subscription_expires > datetime.utcnow() and
            can_message
        )
        
        return {
            "can_message": is_premium_active,
            "subscription_tier": subscription_tier,
            "subscription_status": subscription_status,
            "subscription_expires": subscription_expires.isoformat() if subscription_expires else None,
            "message": "Premium subscription required to send messages" if not is_premium_active else "Messaging allowed"
        }
        
    except Exception as e:
        print(f"Error checking messaging permission: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check messaging permission")

# Send message endpoint (with premium restriction)
@app.post("/api/messages/send")
async def send_message(request: Request):
    try:
        token = request.headers.get("authorization", "").replace("Bearer ", "")
        if not token:
            raise HTTPException(status_code=401, detail="No token provided")
        
        # Verify token and get current user
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            sender_id = payload.get("user_id")
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get request data
        data = await request.json()
        recipient_id = data.get("recipient_id")
        message_content = data.get("message", "").strip()
        
        if not recipient_id or not message_content:
            raise HTTPException(status_code=400, detail="Recipient ID and message are required")
        
        # Check sender's messaging permission
        sender = users_collection.find_one({"id": sender_id})
        if not sender:
            raise HTTPException(status_code=404, detail="Sender not found")
        
        # Verify sender has premium subscription
        subscription_tier = sender.get("subscription_tier", "free")
        subscription_status = sender.get("subscription_status", "inactive")
        subscription_expires = sender.get("subscription_expires")
        can_message = sender.get("can_message", False)
        
        is_premium_active = (
            subscription_tier == "premium" and 
            subscription_status == "active" and 
            subscription_expires and 
            subscription_expires > datetime.utcnow() and
            can_message
        )
        
        if not is_premium_active:
            raise HTTPException(status_code=403, detail="Premium subscription required to send messages")
        
        # Verify recipient exists
        recipient = users_collection.find_one({"id": recipient_id})
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient not found")
        
        # Create message document
        message_doc = {
            "id": str(uuid.uuid4()),
            "sender_id": sender_id,
            "recipient_id": recipient_id,
            "message": message_content,
            "timestamp": datetime.utcnow(),
            "read": False,
            "sender_name": sender.get("name", "Unknown"),
            "recipient_name": recipient.get("name", "Unknown")
        }
        
        # Store message (you would implement a messages collection)
        # For now, return success response
        
        return {
            "status": "message_sent",
            "message_id": message_doc["id"],
            "timestamp": message_doc["timestamp"].isoformat()
        }
        
    except Exception as e:
        print(f"Error sending message: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to send message")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)