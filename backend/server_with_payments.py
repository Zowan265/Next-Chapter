import os
import uuid
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

# Payment integration
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
JWT_SECRET = os.environ.get('JWT_SECRET', 'nextchapter-secret-key-2025')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PREMIUM_PRICE_ID = os.environ.get('STRIPE_PREMIUM_PRICE_ID', '')
STRIPE_VIP_PRICE_ID = os.environ.get('STRIPE_VIP_PRICE_ID', '')

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# FastAPI app
app = FastAPI(title="NextChapter Dating API with Payments", version="1.0.0")

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

class MessageCreate(BaseModel):
    match_id: str
    content: str

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
    subscription_tier: Optional[str] = "free"
    subscription_status: Optional[str] = "inactive"
    subscription_start_date: Optional[datetime] = None
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
    created_at: datetime
    updated_at: datetime

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

# API Routes

@app.get("/")
async def root():
    return {"message": "NextChapter Dating API with Payments is running! 💕💳"}

@app.post("/api/register")
async def register(user: UserCreate):
    # Check if user already exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate age requirement
    if user.age < 35:
        raise HTTPException(status_code=400, detail="You must be 35 or older to join NextChapter")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user.password)
    
    user_doc = {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "age": user.age,
        "location": None,
        "bio": None,
        "looking_for": None,
        "interests": [],
        "main_photo": None,
        "additional_photos": [],
        "subscription_tier": "free",
        "subscription_status": "inactive",
        "subscription_start_date": None,
        "created_at": datetime.utcnow(),
        "profile_complete": False
    }
    
    users_collection.insert_one(user_doc)
    
    # Generate JWT token
    token = create_jwt_token(user_id)
    
    # Return user data (without password)
    user_doc.pop('password')
    user_doc.pop('_id')
    
    return {
        "message": "Registration successful",
        "token": token,
        "user": UserResponse(**user_doc)
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

# PAYMENT ENDPOINTS

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

@app.post("/api/checkout/session")
async def create_checkout_session(
    request: CreateCheckoutRequest,
    origin: str = Header(...),
    current_user = Depends(get_current_user)
):
    """Create Stripe checkout session for subscription"""
    
    if not stripe_checkout:
        raise HTTPException(status_code=500, detail="Payment system not configured")
    
    if request.subscription_tier not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail="Invalid subscription tier")
    
    tier_info = SUBSCRIPTION_TIERS[request.subscription_tier]
    
    if not tier_info["price_id"]:
        raise HTTPException(status_code=500, detail=f"Price ID not configured for {request.subscription_tier}")
    
    # Create transaction record first
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
            "subscription_tier": request.subscription_tier,
            "transaction_id": transaction_id
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
            "subscription_tier": request.subscription_tier,
            "payment_status": "pending",
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
            "currency": status_response.currency
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check payment status: {str(e)}")

@app.get("/api/stats")
async def get_stats():
    total_users = users_collection.count_documents({})
    active_users = users_collection.count_documents({"profile_complete": True})
    premium_users = users_collection.count_documents({"subscription_tier": "premium", "subscription_status": "active"})
    vip_users = users_collection.count_documents({"subscription_tier": "vip", "subscription_status": "active"})
    total_matches = matches_collection.count_documents({})
    total_messages = messages_collection.count_documents({})
    total_revenue = payment_transactions_collection.aggregate([
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    revenue = list(total_revenue)
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "premium_users": premium_users,
        "vip_users": vip_users,
        "total_matches": total_matches,
        "total_messages": total_messages,
        "total_revenue": revenue[0]["total"] if revenue else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)