import os
import uuid
import random
import string
from datetime import datetime, timedelta
from typing import Optional, List
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
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

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

# FastAPI app
app = FastAPI(title="NextChapter Dating API with Enhanced Security", version="2.0.0")

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
    payment_transactions_collection = db.payment_transactions
    otps_collection = db.otps
    registration_attempts_collection = db.registration_attempts
    print("✅ Connected to MongoDB successfully")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB: {e}")

# Initialize Stripe
stripe_checkout = None
if STRIPE_SECRET_KEY:
    stripe_checkout = StripeCheckout(api_key=STRIPE_SECRET_KEY)
    print("✅ Stripe payment gateway initialized")
else:
    print("⚠️ Stripe not configured - set STRIPE_SECRET_KEY environment variable")

# Security
security = HTTPBearer()

# Country codes for phone numbers
COUNTRY_CODES = {
    "US": {"name": "United States", "code": "+1", "flag": "🇺🇸"},
    "CA": {"name": "Canada", "code": "+1", "flag": "🇨🇦"},
    "GB": {"name": "United Kingdom", "code": "+44", "flag": "🇬🇧"},
    "AU": {"name": "Australia", "code": "+61", "flag": "🇦🇺"},
    "DE": {"name": "Germany", "code": "+49", "flag": "🇩🇪"},
    "FR": {"name": "France", "code": "+33", "flag": "🇫🇷"},
    "IT": {"name": "Italy", "code": "+39", "flag": "🇮🇹"},
    "ES": {"name": "Spain", "code": "+34", "flag": "🇪🇸"},
    "IN": {"name": "India", "code": "+91", "flag": "🇮🇳"},
    "JP": {"name": "Japan", "code": "+81", "flag": "🇯🇵"},
    "CN": {"name": "China", "code": "+86", "flag": "🇨🇳"},
    "BR": {"name": "Brazil", "code": "+55", "flag": "🇧🇷"},
    "MX": {"name": "Mexico", "code": "+52", "flag": "🇲🇽"},
    "AR": {"name": "Argentina", "code": "+54", "flag": "🇦🇷"},
    "ZA": {"name": "South Africa", "code": "+27", "flag": "🇿🇦"},
    "NG": {"name": "Nigeria", "code": "+234", "flag": "🇳🇬"},
    "RU": {"name": "Russia", "code": "+7", "flag": "🇷🇺"},
    "TR": {"name": "Turkey", "code": "+90", "flag": "🇹🇷"},
    "SA": {"name": "Saudi Arabia", "code": "+966", "flag": "🇸🇦"},
    "AE": {"name": "UAE", "code": "+971", "flag": "🇦🇪"}
}

# Subscription tiers configuration
SUBSCRIPTION_TIERS = {
    "premium": {
        "name": "Premium",
        "price_id": STRIPE_PREMIUM_PRICE_ID,
        "price": 9.99,
        "features": [
            "Unlimited likes per day",
            "See who liked you",
            "Advanced search filters",
            "Priority matching",
            "Read receipts for messages",
            "Profile boost feature"
        ]
    },
    "vip": {
        "name": "VIP",
        "price_id": STRIPE_VIP_PRICE_ID,
        "price": 19.99,
        "features": [
            "All Premium features",
            "Exclusive VIP matching",
            "Personal dating coach support",
            "Advanced privacy controls",
            "Priority customer support",
            "VIP badge on profile"
        ]
    }
}

# Pydantic models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    age: int
    phone_country: str
    phone_number: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str

class VerifyPaymentOTP(BaseModel):
    otp: str
    verification_method: str  # "email" or "phone"

class ProfileSetup(BaseModel):
    location: str
    bio: str
    looking_for: str
    interests: Optional[List[str]] = []

class LikeCreate(BaseModel):
    liked_user_id: str

class MessageCreate(BaseModel):
    match_id: str
    content: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    age: int
    phone_country: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    looking_for: Optional[str] = None
    interests: Optional[List[str]] = []
    main_photo: Optional[str] = None
    additional_photos: Optional[List[str]] = []
    subscription_tier: Optional[str] = "free"
    subscription_status: Optional[str] = "inactive"
    subscription_start_date: Optional[datetime] = None
    email_verified: Optional[bool] = False
    created_at: datetime

# Payment models
class CreateCheckoutRequest(BaseModel):
    subscription_tier: str  # "premium" or "vip"

class PaymentTransaction(BaseModel):
    id: str
    user_id: str
    session_id: str
    amount: float
    currency: str
    subscription_tier: str
    payment_status: str  # "pending", "paid", "failed", "expired"
    otp_verified: bool
    created_at: datetime
    updated_at: datetime

# Helper functions
def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def send_email_otp(email: str, otp: str, purpose: str = "registration") -> bool:
    """Send OTP via email"""
    try:
        if not EMAIL_USER or not EMAIL_PASSWORD:
            print("⚠️ Email not configured - OTP sent to console")
            print(f"📧 OTP for {email}: {otp}")
            return True

        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = email
        
        if purpose == "registration":
            msg['Subject'] = "NextChapter - Verify Your Email"
            body = f"""
            Welcome to NextChapter!
            
            Your verification code is: {otp}
            
            Please enter this code to complete your registration.
            This code expires in 10 minutes.
            
            Best regards,
            The NextChapter Team
            """
        else:  # payment
            msg['Subject'] = "NextChapter - Payment Authorization"
            body = f"""
            Payment Authorization Required
            
            Your verification code is: {otp}
            
            Please enter this code to authorize your subscription payment.
            This code expires in 5 minutes.
            
            Best regards,
            The NextChapter Team
            """

        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(EMAIL_USER, email, text)
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        print(f"📧 OTP for {email}: {otp}")  # Fallback for development
        return True

def send_phone_otp(phone_country: str, phone_number: str, otp: str) -> bool:
    """Send OTP via SMS (placeholder - integrate with SMS service)"""
    # This is a placeholder - integrate with Twilio, AWS SNS, or other SMS service
    print(f"📱 SMS OTP to {COUNTRY_CODES[phone_country]['code']}{phone_number}: {otp}")
    return True

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

def check_subscription_feature(user, feature_type: str) -> bool:
    """Check if user has access to premium features"""
    subscription_tier = user.get('subscription_tier', 'free')
    subscription_status = user.get('subscription_status', 'inactive')
    
    if subscription_status != 'active':
        return False
    
    if feature_type == 'unlimited_likes':
        return subscription_tier in ['premium', 'vip']
    elif feature_type == 'see_who_liked':
        return subscription_tier in ['premium', 'vip']
    elif feature_type == 'advanced_filters':
        return subscription_tier in ['premium', 'vip']
    elif feature_type == 'vip_matching':
        return subscription_tier == 'vip'
    
    return False

def get_daily_likes_count(user_id: str) -> int:
    """Get number of likes used today for free users"""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    return likes_collection.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": today, "$lt": tomorrow}
    })

def check_age_fraud(email: str, phone_number: str, age: int) -> dict:
    """Check if user has attempted registration with different ages"""
    # Check by email
    email_attempts = list(registration_attempts_collection.find({"email": email}))
    phone_attempts = list(registration_attempts_collection.find({"phone_number": phone_number}))
    
    # Check for age inconsistencies
    for attempt in email_attempts + phone_attempts:
        if attempt.get('age') != age:
            return {
                "fraud_detected": True,
                "message": f"Registration denied. Previous registration attempt detected with different age information. Please contact support if this is an error.",
                "previous_age": attempt.get('age'),
                "attempted_age": age
            }
    
    return {"fraud_detected": False}

def record_registration_attempt(email: str, phone_country: str, phone_number: str, age: int, status: str):
    """Record registration attempt for fraud prevention"""
    attempt_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "phone_country": phone_country,
        "phone_number": phone_number,
        "age": age,
        "status": status,  # "pending", "verified", "blocked"
        "created_at": datetime.utcnow()
    }
    registration_attempts_collection.insert_one(attempt_doc)

# API Routes

@app.get("/")
async def root():
    return {"message": "NextChapter Dating API v2.0 with Enhanced Security! 💕🔐"}

@app.get("/api/country-codes")
async def get_country_codes():
    """Get available country codes for phone numbers"""
    return COUNTRY_CODES

@app.post("/api/register")
async def register(user: UserCreate):
    # Validate age requirement (changed to 25+)
    if user.age < 25:
        # Record failed attempt
        record_registration_attempt(user.email, user.phone_country, user.phone_number, user.age, "blocked")
        raise HTTPException(
            status_code=400, 
            detail="You must be 25 or older to join NextChapter. Our platform is designed for mature adults seeking meaningful relationships."
        )
    
    # Check for age fraud
    fraud_check = check_age_fraud(user.email, user.phone_number, user.age)
    if fraud_check["fraud_detected"]:
        raise HTTPException(status_code=403, detail=fraud_check["message"])
    
    # Check if user already exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if phone number already exists
    full_phone = f"{COUNTRY_CODES[user.phone_country]['code']}{user.phone_number}"
    if users_collection.find_one({"phone_number": user.phone_number, "phone_country": user.phone_country}):
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Validate country code
    if user.phone_country not in COUNTRY_CODES:
        raise HTTPException(status_code=400, detail="Invalid country code")
    
    # Record registration attempt
    record_registration_attempt(user.email, user.phone_country, user.phone_number, user.age, "pending")
    
    # Generate OTP for email verification
    otp = generate_otp()
    otp_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "otp": otp,
        "purpose": "registration",
        "expires_at": datetime.utcnow() + timedelta(minutes=10),
        "verified": False,
        "created_at": datetime.utcnow()
    }
    otps_collection.insert_one(otp_doc)
    
    # Send OTP via email
    if not send_email_otp(user.email, otp, "registration"):
        raise HTTPException(status_code=500, detail="Failed to send verification email")
    
    # Store user data temporarily (without creating account yet)
    temp_user_data = {
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "age": user.age,
        "phone_country": user.phone_country,
        "phone_number": user.phone_number,
        "temp_registration": True,
        "created_at": datetime.utcnow()
    }
    
    return {
        "message": "Verification code sent to your email. Please verify to complete registration.",
        "email": user.email,
        "requires_verification": True
    }

@app.post("/api/verify-registration")
async def verify_registration(verification: VerifyOTP):
    # Find valid OTP
    otp_doc = otps_collection.find_one({
        "email": verification.email,
        "otp": verification.otp,
        "purpose": "registration",
        "verified": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    
    # Find temporary user data from registration attempts
    temp_user = registration_attempts_collection.find_one({
        "email": verification.email,
        "status": "pending"
    })
    
    if not temp_user:
        raise HTTPException(status_code=400, detail="Registration session not found. Please register again.")
    
    # Create actual user account
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": temp_user["email"].split("@")[0],  # Will be updated in profile setup
        "email": temp_user["email"],
        "password": hash_password("temp_password"),  # Will be set properly
        "age": temp_user["age"],
        "phone_country": temp_user["phone_country"],
        "phone_number": temp_user["phone_number"],
        "location": None,
        "bio": None,
        "looking_for": None,
        "interests": [],
        "main_photo": None,
        "additional_photos": [],
        "subscription_tier": "free",
        "subscription_status": "inactive",
        "subscription_start_date": None,
        "email_verified": True,
        "created_at": datetime.utcnow(),
        "profile_complete": False
    }
    
    users_collection.insert_one(user_doc)
    
    # Mark OTP as verified
    otps_collection.update_one(
        {"_id": otp_doc["_id"]},
        {"$set": {"verified": True}}
    )
    
    # Update registration attempt status
    registration_attempts_collection.update_one(
        {"email": verification.email, "status": "pending"},
        {"$set": {"status": "verified"}}
    )
    
    # Generate JWT token
    token = create_jwt_token(user_id)
    
    # Return user data
    user_doc.pop('password')
    user_doc.pop('_id')
    
    return {
        "message": "Email verified successfully! Please complete your profile.",
        "token": token,
        "user": UserResponse(**user_doc)
    }

@app.post("/api/login")
async def login(user: UserLogin):
    # Find user
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not db_user.get('email_verified', False):
        raise HTTPException(status_code=401, detail="Please verify your email before logging in")
    
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
    name: str = Form(...),
    location: str = Form(...),
    bio: str = Form(...),
    looking_for: str = Form(...),
    interests: str = Form("[]"),
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
    
    # Update user profile
    update_data = {
        "name": name,
        "location": location,
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
        profile.pop('phone_number', None)
        profile.pop('phone_country', None)
        cleaned_profiles.append(profile)
    
    return cleaned_profiles

@app.post("/api/like")
async def like_user(like_data: LikeCreate, current_user = Depends(get_current_user)):
    user_id = current_user['id']
    liked_user_id = like_data.liked_user_id
    
    # Check subscription limits for free users
    subscription_tier = current_user.get('subscription_tier', 'free')
    subscription_status = current_user.get('subscription_status', 'inactive')
    
    if subscription_tier == 'free' or subscription_status != 'active':
        daily_likes = get_daily_likes_count(user_id)
        if daily_likes >= 5:  # Free users get 5 likes per day
            raise HTTPException(
                status_code=403, 
                detail="Daily like limit reached. Upgrade to Premium for unlimited likes!"
            )
    
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
            other_user.pop('phone_number', None)
            other_user.pop('phone_country', None)
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

# PAYMENT ENDPOINTS WITH OTP

@app.get("/api/subscription/tiers")
async def get_subscription_tiers():
    """Get available subscription tiers"""
    return SUBSCRIPTION_TIERS

@app.get("/api/user/subscription")
async def get_user_subscription(current_user = Depends(get_current_user)):
    """Get current user's subscription status"""
    return {
        "subscription_tier": current_user.get("subscription_tier", "free"),
        "subscription_status": current_user.get("subscription_status", "inactive"),
        "subscription_start_date": current_user.get("subscription_start_date"),
        "features": {
            "unlimited_likes": check_subscription_feature(current_user, "unlimited_likes"),
            "see_who_liked": check_subscription_feature(current_user, "see_who_liked"),
            "advanced_filters": check_subscription_feature(current_user, "advanced_filters"),
            "vip_matching": check_subscription_feature(current_user, "vip_matching"),
        },
        "daily_likes_used": get_daily_likes_count(current_user['id']) if current_user.get('subscription_tier') == 'free' else None
    }

@app.post("/api/payment/request-otp")
async def request_payment_otp(
    request: CreateCheckoutRequest,
    verification_method: str = "email",  # "email" or "phone"
    current_user = Depends(get_current_user)
):
    """Request OTP for payment authorization"""
    
    if request.subscription_tier not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail="Invalid subscription tier")
    
    # Generate OTP for payment authorization
    otp = generate_otp()
    otp_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "email": current_user["email"],
        "otp": otp,
        "purpose": "payment",
        "subscription_tier": request.subscription_tier,
        "verification_method": verification_method,
        "expires_at": datetime.utcnow() + timedelta(minutes=5),  # 5 minutes for payment
        "verified": False,
        "created_at": datetime.utcnow()
    }
    otps_collection.insert_one(otp_doc)
    
    # Send OTP based on chosen method
    if verification_method == "email":
        send_email_otp(current_user["email"], otp, "payment")
        message = "Payment authorization code sent to your email"
    else:  # phone
        send_phone_otp(current_user["phone_country"], current_user["phone_number"], otp)
        message = f"Payment authorization code sent to your phone {COUNTRY_CODES[current_user['phone_country']]['code']}****{current_user['phone_number'][-4:]}"
    
    return {
        "message": message,
        "verification_method": verification_method,
        "expires_in_minutes": 5
    }

@app.post("/api/checkout/session")
async def create_checkout_session(
    verification: VerifyPaymentOTP,
    origin: str = Header(...),
    current_user = Depends(get_current_user)
):
    """Create Stripe checkout session after OTP verification"""
    
    if not stripe_checkout:
        raise HTTPException(status_code=500, detail="Payment system not configured")
    
    # Verify OTP
    otp_doc = otps_collection.find_one({
        "user_id": current_user["id"],
        "otp": verification.otp,
        "purpose": "payment",
        "verification_method": verification.verification_method,
        "verified": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired payment authorization code")
    
    subscription_tier = otp_doc["subscription_tier"]
    tier_info = SUBSCRIPTION_TIERS[subscription_tier]
    
    if not tier_info["price_id"]:
        raise HTTPException(status_code=500, detail=f"Price ID not configured for {subscription_tier}")
    
    # Mark OTP as verified
    otps_collection.update_one(
        {"_id": otp_doc["_id"]},
        {"$set": {"verified": True}}
    )
    
    # Create transaction record
    transaction_id = str(uuid.uuid4())
    
    # Build success and cancel URLs from origin header
    success_url = f"{origin}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/subscription/cancel"
    
    # Create checkout session request
    checkout_request = CheckoutSessionRequest(
        stripe_price_id=tier_info["price_id"],
        quantity=1,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": current_user["id"],
            "subscription_tier": subscription_tier,
            "transaction_id": transaction_id,
            "otp_verified": "true"
        }
    )
    
    try:
        # Create Stripe checkout session
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store transaction record
        transaction_doc = {
            "id": transaction_id,
            "user_id": current_user["id"],
            "session_id": session.session_id,
            "amount": tier_info["price"],
            "currency": "usd",
            "subscription_tier": subscription_tier,
            "payment_status": "pending",
            "otp_verified": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        payment_transactions_collection.insert_one(transaction_doc)
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

@app.get("/api/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, current_user = Depends(get_current_user)):
    """Check payment status and update user subscription if paid"""
    
    if not stripe_checkout:
        raise HTTPException(status_code=500, detail="Payment system not configured")
    
    try:
        # Get payment status from Stripe
        status_response = await stripe_checkout.get_checkout_status(session_id)
        
        # Find transaction record
        transaction = payment_transactions_collection.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Verify OTP was used for this transaction
        if not transaction.get("otp_verified", False):
            raise HTTPException(status_code=403, detail="Payment not authorized with OTP")
        
        # Update transaction status
        payment_transactions_collection.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "payment_status": status_response.payment_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # If payment is successful and not already processed
        if (status_response.payment_status == "paid" and 
            transaction["payment_status"] != "paid"):
            
            # Update user subscription tier
            users_collection.update_one(
                {"id": transaction["user_id"]},
                {
                    "$set": {
                        "subscription_tier": transaction["subscription_tier"],
                        "subscription_start_date": datetime.utcnow(),
                        "subscription_status": "active"
                    }
                }
            )
        
        return {
            "status": status_response.status,
            "payment_status": status_response.payment_status,
            "amount_total": status_response.amount_total,
            "currency": status_response.currency,
            "otp_verified": transaction.get("otp_verified", False)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check payment status: {str(e)}")

@app.get("/api/stats")
async def get_stats():
    total_users = users_collection.count_documents({})
    verified_users = users_collection.count_documents({"email_verified": True})
    active_users = users_collection.count_documents({"profile_complete": True})
    premium_users = users_collection.count_documents({"subscription_tier": "premium", "subscription_status": "active"})
    vip_users = users_collection.count_documents({"subscription_tier": "vip", "subscription_status": "active"})
    total_matches = matches_collection.count_documents({})
    total_messages = messages_collection.count_documents({})
    blocked_registrations = registration_attempts_collection.count_documents({"status": "blocked"})
    total_revenue = payment_transactions_collection.aggregate([
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    revenue = list(total_revenue)
    
    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "active_users": active_users,
        "premium_users": premium_users,
        "vip_users": vip_users,
        "total_matches": total_matches,
        "total_messages": total_messages,
        "blocked_registrations": blocked_registrations,
        "total_revenue": revenue[0]["total"] if revenue else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)