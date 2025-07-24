import os
import uuid
import random
import string
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
                    This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
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
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, status, Header
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
        "weekly": {"amount": 15000, "currency": "MWK"},
        "monthly": {"amount": 30000, "currency": "MWK"}
    },
    "MW_DIASPORA": {  # For Malawians abroad (USD pricing)
        "daily": {"amount": 1.35, "currency": "USD", "mwk_equivalent": 2500},
        "weekly": {"amount": 8.05, "currency": "USD", "mwk_equivalent": 15000},
        "monthly": {"amount": 16.09, "currency": "USD", "mwk_equivalent": 30000}
    },
    "default": {  # For non-Malawians
        "daily": {"amount": 1.35, "currency": "USD"},
        "weekly": {"amount": 8.05, "currency": "USD"},
        "monthly": {"amount": 16.09, "currency": "USD"}
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
                        <strong>⚠️ Important:</strong> This code will expire in 60 seconds for security reasons. 
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)