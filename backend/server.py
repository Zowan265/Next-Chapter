import os
import uuid
import random
import string
from datetime import datetime, timedelta
from typing import Optional, List
import pytz
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

# Subscription pricing with Malawi-specific rates and discounts
SUBSCRIPTION_TIERS = {
    "free": {
        "name": "Free",
        "daily_likes": 5,
        "features": ["Basic browsing", "5 likes per day", "Basic matching"],
        "prices": {}
    },
    "premium": {
        "name": "Premium",
        "daily_likes": -1,  # Unlimited
        "features": ["Unlimited likes", "Advanced filters", "Priority support", "See who liked you"],
        "prices": {
            "MW": {
                "daily": {"amount": 2500, "currency": "MWK"},
                "weekly": {"amount": 15000, "currency": "MWK"},
                "monthly": {"amount": 35000, "currency": "MWK"}
            },
            "default": {
                "daily": {"amount": 5, "currency": "USD"},
                "weekly": {"amount": 25, "currency": "USD"},
                "monthly": {"amount": 50, "currency": "USD"}
            }
        }
    },
    "vip": {
        "name": "VIP",
        "daily_likes": -1,  # Unlimited
        "features": ["All Premium features", "Profile boost", "Read receipts", "Advanced analytics"],
        "prices": {
            "MW": {
                "daily": {"amount": 5000, "currency": "MWK"},
                "weekly": {"amount": 30000, "currency": "MWK"},
                "monthly": {"amount": 70000, "currency": "MWK"}
            },
            "default": {
                "daily": {"amount": 10, "currency": "USD"},
                "weekly": {"amount": 50, "currency": "USD"},
                "monthly": {"amount": 100, "currency": "USD"}
            }
        }
    }
}

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

def can_user_interact_freely(user):
    """Check if user can interact freely (premium/vip subscription or free interaction time)"""
    subscription_tier = user.get("subscription_tier", "free")
    
    # Premium/VIP users can always interact freely
    if subscription_tier in ["premium", "vip"]:
        return True, "Premium/VIP member"
    
    # Free interaction during Saturday happy hour
    if is_free_interaction_time():
        return True, "Saturday Happy Hour - Free interactions for all!"
    
    return False, "Free tier limitations apply"

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

class MessageCreate(BaseModel):
    match_id: str
    content: str

@app.post("/api/verify-registration")
async def verify_registration(verification: EmailVerification):
    # Find user by email
    user = users_collection.find_one({"email": verification.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # In a real app, verify OTP against stored value
    # For demo, accept any 6-digit code
    if len(verification.otp) != 6 or not verification.otp.isdigit():
        raise HTTPException(status_code=400, detail="Invalid verification code format")
    
    # Mark email as verified
    users_collection.update_one(
        {"email": verification.email},
        {"$set": {"email_verified": True}}
    )
    
    # Generate JWT token
    token = create_jwt_token(user['id'])
    
    # Return user data (without password)
    user.pop('password', None)
    user.pop('_id', None)
    
    return {
        "message": "Email verified successfully",
        "token": token,
        "user": UserResponse(**user)
    }

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
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user.password)
    
    user_doc = {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
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
    
    users_collection.insert_one(user_doc)
    
    # In a real app, send email verification here
    # For demo, we'll simulate email verification
    
    return {
        "message": "Registration successful. Please check your email for verification code.",
        "email": user.email,
        "simulation_note": "In demo mode - any 6-digit code will work for verification"
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
    
    # Handle additional photos (up to 10)
    additional_photos = []
    # This would be extended to handle multiple additional photos
    
    # Update user profile
    update_data = {
        "location": location,
        "bio": bio,
        "looking_for": looking_for,
        "interests": interests_list,
        "profile_complete": True
    }
    
    if main_photo_path:
        update_data["main_photo"] = main_photo_path
    
    if additional_photos:
        update_data["additional_photos"] = additional_photos
    
    users_collection.update_one(
        {"id": current_user['id']},
        {"$set": update_data}
    )
    
    # Get updated user
    updated_user = users_collection.find_one({"id": current_user['id']})
    updated_user.pop('password')
    updated_user.pop('_id')
    
    return {
        "message": "Profile updated successfully",
        "user": UserResponse(**updated_user)
    }

@app.get("/api/profiles")
async def get_profiles(current_user = Depends(get_current_user)):
    # Get users that current user hasn't liked/disliked and aren't matches
    liked_users = likes_collection.find({"user_id": current_user['id']}).distinct("liked_user_id")
    
    # Find profiles excluding current user and already liked users
    exclude_ids = [current_user['id']] + liked_users
    
    profiles = list(users_collection.find({
        "id": {"$nin": exclude_ids},
        "profile_complete": True
    }).limit(10))
    
    # Clean up profiles (remove sensitive data)
    cleaned_profiles = []
    for profile in profiles:
        profile.pop('password', None)
        profile.pop('_id', None)
        profile.pop('email', None)
        cleaned_profiles.append(profile)
    
    return cleaned_profiles

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
    
    # Create like record
    like_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "liked_user_id": liked_user_id,
        "created_at": datetime.utcnow()
    }
    
    likes_collection.insert_one(like_doc)
    
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
    
    return {
        "message": "Like recorded",
        "match": is_match
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
async def get_subscription_tiers():
    """Get subscription tiers with pricing and discounts"""
    # Detect user's country for localized pricing (for now, default to global pricing)
    # In a real app, you'd use IP geolocation or user preferences
    
    tiers_with_pricing = {}
    
    for tier_id, tier_data in SUBSCRIPTION_TIERS.items():
        if tier_id == "free":
            tiers_with_pricing[tier_id] = tier_data
            continue
            
        # Apply pricing with discounts
        tier_with_pricing = tier_data.copy()
        pricing = {}
        
        # Use Malawi pricing if available, otherwise default
        country_prices = tier_data["prices"].get("MW", tier_data["prices"]["default"])
        
        for duration, price_info in country_prices.items():
            price_data = calculate_discounted_price(price_info["amount"])
            pricing[duration] = {
                **price_info,
                **price_data
            }
        
        tier_with_pricing["pricing"] = pricing
        tier_with_pricing["current_time_cat"] = get_current_cat_time().strftime("%Y-%m-%d %H:%M:%S CAT")
        tier_with_pricing["is_wednesday_discount"] = is_wednesday_discount()
        tier_with_pricing["is_saturday_happy_hour"] = is_saturday_happy_hour()
        
        tiers_with_pricing[tier_id] = tier_with_pricing
    
    return tiers_with_pricing

@app.get("/api/user/subscription")
async def get_user_subscription(current_user = Depends(get_current_user)):
    """Get current user's subscription details"""
    # For now, return basic subscription info
    # In a real app, you'd have a subscriptions collection
    
    # Simulate subscription data - you can extend this with real subscription logic
    user_subscription = {
        "user_id": current_user["id"],
        "subscription_tier": current_user.get("subscription_tier", "free"),
        "expires_at": None,
        "daily_likes_used": current_user.get("daily_likes_used", 0),
        "created_at": current_user.get("created_at"),
        "features_unlocked": SUBSCRIPTION_TIERS.get(current_user.get("subscription_tier", "free"), {}).get("features", [])
    }
    
    return user_subscription

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