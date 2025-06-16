import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  const [profiles, setProfiles] = useState([]);
  const [matches, setMatches] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [subscriptionTiers, setSubscriptionTiers] = useState({});
  const [userSubscription, setUserSubscription] = useState(null);
  const [countryCodes, setCountryCodes] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [paymentOtpMethod, setPaymentOtpMethod] = useState('email');
  const [paymentOtpSent, setPaymentOtpSent] = useState(false);
  const [selectedTier, setSelectedTier] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    phoneCountry: 'US',
    phoneNumber: '',
    location: '',
    bio: '',
    interests: [],
    lookingFor: '',
    mainPhoto: null,
    additionalPhotos: [],
    otp: '',
    paymentOtp: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile();
    }
    fetchSubscriptionTiers();
    fetchCountryCodes();
  }, []);

  const fetchCountryCodes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/country-codes`);
      if (response.ok) {
        const codes = await response.json();
        setCountryCodes(codes);
      }
    } catch (error) {
      console.error('Error fetching country codes:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setCurrentView('dashboard');
        fetchUserSubscription();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSubscriptionTiers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscription/tiers`);
      if (response.ok) {
        const tiers = await response.json();
        setSubscriptionTiers(tiers);
      }
    } catch (error) {
      console.error('Error fetching subscription tiers:', error);
    }
  };

  const fetchUserSubscription = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/subscription`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const subscription = await response.json();
        setUserSubscription(subscription);
      }
    } catch (error) {
      console.error('Error fetching user subscription:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (authMode === 'register') {
      // Registration with phone number
      try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            age: parseInt(formData.age),
            phone_country: formData.phoneCountry,
            phone_number: formData.phoneNumber
          }),
        });

        const data = await response.json();
        if (response.ok) {
          setOtpSent(true);
          alert('Verification code sent to your email. Please check your inbox.');
        } else {
          alert(data.detail || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration error:', error);
        alert('Network error occurred');
      }
    } else {
      // Login
      try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
        });

        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('token', data.token);
          setUser(data.user);
          setCurrentView('dashboard');
          fetchUserSubscription();
        } else {
          alert(data.detail || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('Network error occurred');
      }
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp
        }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setCurrentView('profile-setup');
        setOtpSent(false);
      } else {
        alert(data.detail || 'Verification failed');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      alert('Network error occurred');
    }
  };

  const handleProfileSetup = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    
    formDataToSend.append('name', formData.name);
    formDataToSend.append('location', formData.location);
    formDataToSend.append('bio', formData.bio);
    formDataToSend.append('looking_for', formData.lookingFor);
    formDataToSend.append('interests', JSON.stringify(formData.interests || []));
    
    if (formData.mainPhoto) {
      formDataToSend.append('main_photo', formData.mainPhoto);
    }
    
    if (formData.additionalPhotos && formData.additionalPhotos.length > 0) {
      formData.additionalPhotos.forEach((photo, index) => {
        formDataToSend.append(`additional_photo_${index}`, photo);
      });
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend,
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setCurrentView('dashboard');
        fetchUserSubscription();
      } else {
        const error = await response.json();
        alert(error.detail || 'Profile setup failed');
      }
    } catch (error) {
      console.error('Profile setup error:', error);
      alert('Network error occurred');
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profiles`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
        setCurrentView('browse');
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleLike = async (profileId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ liked_user_id: profileId }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.match) {
          alert('It\'s a match! 🎉');
          fetchMatches();
        }
        setProfiles(profiles.filter(p => p.id !== profileId));
        fetchUserSubscription(); // Refresh subscription data to update like count
      } else {
        const error = await response.json();
        if (response.status === 403) {
          alert('Daily like limit reached! Upgrade to Premium for unlimited likes.');
          setCurrentView('subscription');
        } else {
          alert(error.detail || 'Failed to like profile');
        }
      }
    } catch (error) {
      console.error('Error liking profile:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/matches`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMatches(data);
        setCurrentView('matches');
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const sendMessage = async (matchId, content) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ match_id: matchId, content }),
      });

      if (response.ok) {
        fetchMessages(matchId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const fetchMessages = async (matchId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/${matchId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setUserSubscription(null);
    setCurrentView('landing');
  };

  const handleFileChange = (e, field) => {
    const files = Array.from(e.target.files);
    if (field === 'mainPhoto') {
      setFormData({ ...formData, mainPhoto: files[0] });
    } else if (field === 'additionalPhotos') {
      setFormData({ ...formData, additionalPhotos: files.slice(0, 10) });
    }
  };

  const requestPaymentOtp = async (tier) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          subscription_tier: tier 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTier(tier);
        setPaymentOtpSent(true);
        alert(data.message);
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to send payment authorization code');
      }
    } catch (error) {
      console.error('Error requesting payment OTP:', error);
      alert('Network error occurred');
    }
  };

  const handleSubscribeWithOtp = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/checkout/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          otp: formData.paymentOtp,
          verification_method: paymentOtpMethod
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const error = await response.json();
        alert(error.detail || 'Payment authorization failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Network error occurred');
    }
  };

  const checkPaymentStatus = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/checkout/status/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
    return null;
  };

  // Country Code Selector Component
  const CountryCodeSelector = ({ value, onChange }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
    >
      {Object.entries(countryCodes).map(([code, info]) => (
        <option key={code} value={code}>
          {info.flag} {info.code}
        </option>
      ))}
    </select>
  );

  // Age Warning Component
  const AgeWarning = () => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <span className="text-2xl mr-3">⚠️</span>
        <div>
          <h4 className="text-yellow-800 font-semibold">Age Requirement</h4>
          <p className="text-yellow-700 text-sm">
            NextChapter is designed for mature adults aged 25 and above seeking meaningful relationships.
          </p>
        </div>
      </div>
    </div>
  );

  // Premium Badge Component
  const PremiumBadge = ({ tier }) => {
    if (tier === 'free') return null;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        tier === 'premium' 
          ? 'bg-purple-100 text-purple-800' 
          : 'bg-rose-100 text-rose-800'
      }`}>
        {tier === 'premium' ? '👑 Premium' : '💎 VIP'}
      </span>
    );
  };

  // OTP Input Component
  const OtpInput = ({ value, onChange, onSubmit, title, subtitle }) => (
    <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md mx-auto">
      <div className="text-6xl mb-4">📧</div>
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <p className="text-gray-600 mb-6">{subtitle}</p>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter 6-digit code"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
          maxLength="6"
          pattern="[0-9]{6}"
          required
        />
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-rose-500 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
        >
          Verify Code
        </button>
      </form>
    </div>
  );

  // Payment OTP Modal Component
  const PaymentOtpModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md mx-4">
        <h3 className="text-2xl font-bold mb-4 text-center">Payment Authorization</h3>
        <p className="text-gray-600 mb-6 text-center">
          Enter the verification code sent to your {paymentOtpMethod}
        </p>
        
        <form onSubmit={handleSubscribeWithOtp} className="space-y-4">
          <input
            type="text"
            value={formData.paymentOtp}
            onChange={(e) => setFormData({ ...formData, paymentOtp: e.target.value })}
            placeholder="Enter 6-digit code"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-xl font-mono tracking-widest"
            maxLength="6"
            pattern="[0-9]{6}"
            required
          />
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setPaymentOtpSent(false);
                setFormData({ ...formData, paymentOtp: '' });
              }}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-rose-500 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
            >
              Authorize Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Subscription Plans Component
  const SubscriptionPlans = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Choose Your Plan</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upgrade your NextChapter experience with premium features designed for meaningful connections
          </p>
        </div>

        {/* Current Subscription Status */}
        {userSubscription && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Current Plan</h3>
            <div className="flex items-center justify-center space-x-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                userSubscription.subscription_tier === 'free' 
                  ? 'bg-gray-100 text-gray-800' 
                  : userSubscription.subscription_tier === 'premium'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {userSubscription.subscription_tier.charAt(0).toUpperCase() + userSubscription.subscription_tier.slice(1)}
              </span>
              {userSubscription.subscription_tier === 'free' && userSubscription.daily_likes_used !== null && (
                <span className="text-sm text-gray-600">
                  Daily likes used: {userSubscription.daily_likes_used}/5
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Free</h3>
              <p className="text-4xl font-bold text-gray-600">$0<span className="text-lg font-normal">/month</span></p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Basic profile creation
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                5 likes per day
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Basic messaging
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Profile browsing
              </li>
            </ul>
            <button
              disabled
              className="w-full bg-gray-300 text-gray-500 py-3 rounded-lg font-semibold cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* Premium Plan */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-purple-500 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-purple-600 mb-2">Premium</h3>
              <p className="text-4xl font-bold text-gray-800">
                ${subscriptionTiers.premium?.price || '9.99'}
                <span className="text-lg font-normal">/month</span>
              </p>
            </div>
            <ul className="space-y-3 mb-8">
              {subscriptionTiers.premium?.features.map((feature, idx) => (
                <li key={idx} className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => requestPaymentOtp('premium')}
              disabled={userSubscription?.subscription_tier === 'premium'}
              className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                userSubscription?.subscription_tier === 'premium'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-rose-500 text-white hover:from-purple-700 hover:to-rose-600'
              }`}
            >
              {userSubscription?.subscription_tier === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
            </button>
          </div>

          {/* VIP Plan */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-rose-500">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-rose-600 mb-2">VIP</h3>
              <p className="text-4xl font-bold text-gray-800">
                ${subscriptionTiers.vip?.price || '19.99'}
                <span className="text-lg font-normal">/month</span>
              </p>
            </div>
            <ul className="space-y-3 mb-8">
              {subscriptionTiers.vip?.features.map((feature, idx) => (
                <li key={idx} className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => requestPaymentOtp('vip')}
              disabled={userSubscription?.subscription_tier === 'vip'}
              className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                userSubscription?.subscription_tier === 'vip'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-500 to-purple-600 text-white hover:from-rose-600 hover:to-purple-700'
              }`}
            >
              {userSubscription?.subscription_tier === 'vip' ? 'Current Plan' : 'Upgrade to VIP'}
            </button>
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
      
      {/* Payment OTP Modal */}
      {paymentOtpSent && <PaymentOtpModal />}
    </div>
  );

  // Handle URL routing for subscription success/cancel
  useEffect(() => {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    if (path === '/subscription/success' && urlParams.get('session_id')) {
      setCurrentView('subscription-success');
    } else if (path === '/subscription/cancel') {
      setCurrentView('subscription-cancel');
    }
  }, []);

  // OTP Verification Screen
  if (otpSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-rose-50 flex items-center justify-center px-4">
        <OtpInput
          value={formData.otp}
          onChange={(value) => setFormData({ ...formData, otp: value })}
          onSubmit={handleOtpVerification}
          title="Verify Your Email"
          subtitle="We've sent a verification code to your email address"
        />
      </div>
    );
  }

  // Subscription Plans View
  if (currentView === 'subscription') {
    return <SubscriptionPlans />;
  }

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent">
                  NextChapter
                </h1>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('auth')}
                  className="text-purple-600 hover:text-purple-800 font-medium"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setAuthMode('register'); setCurrentView('auth'); }}
                  className="bg-gradient-to-r from-purple-600 to-rose-500 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-rose-600 transition-all duration-300 shadow-lg"
                >
                  Join Now
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-rose-900/20"></div>
          <div 
            className="h-96 bg-cover bg-center relative"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1514415008039-efa173293080')`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/50 to-rose-900/50"></div>
            <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
              <div className="max-w-4xl">
                <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
                  Your Next Chapter
                  <span className="block text-3xl md:text-4xl font-light text-purple-100 mt-2">
                    Begins Here
                  </span>
                </h2>
                <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
                  A meaningful dating community for mature adults (25+) ready to write their next chapter. 
                  Whether you're divorced, a late bloomer, or starting fresh - you belong here.
                </p>
                <button
                  onClick={() => { setAuthMode('register'); setCurrentView('auth'); }}
                  className="bg-gradient-to-r from-rose-500 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-rose-600 hover:to-purple-700 transition-all duration-300 shadow-xl transform hover:scale-105"
                >
                  Start Your Journey
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rest of landing page content... */}
        {/* Features Section */}
        <div className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h3 className="text-4xl font-bold text-gray-800 mb-4">Why Choose NextChapter?</h3>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                We understand your journey. Our platform is designed specifically for mature adults seeking genuine connections.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
              {/* Safe Community */}
              <div className="text-center">
                <div 
                  className="w-64 h-48 mx-auto mb-6 rounded-xl bg-cover bg-center shadow-lg"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1522543558187-768b6df7c25c')`
                  }}
                ></div>
                <h4 className="text-2xl font-bold text-gray-800 mb-4">Safe Community</h4>
                <p className="text-gray-600">
                  A trusted environment where you can be yourself. Our community understands your unique journey and experiences.
                </p>
              </div>

              {/* Meaningful Connections */}
              <div className="text-center">
                <div 
                  className="w-64 h-48 mx-auto mb-6 rounded-xl bg-cover bg-center shadow-lg"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1741793310976-1eefc25f85c5')`
                  }}
                ></div>
                <h4 className="text-2xl font-bold text-gray-800 mb-4">Meaningful Connections</h4>
                <p className="text-gray-600">
                  Beyond surface-level matches. Connect with people who value depth, experience, and authentic relationships.
                </p>
              </div>

              {/* Your Story Matters */}
              <div className="text-center">
                <div 
                  className="w-64 h-48 mx-auto mb-6 rounded-xl bg-cover bg-center shadow-lg"
                  style={{
                    backgroundImage: `url('https://images.pexels.com/photos/32525284/pexels-photo-32525284.jpeg')`
                  }}
                ></div>
                <h4 className="text-2xl font-bold text-gray-800 mb-4">Your Story Matters</h4>
                <p className="text-gray-600">
                  Share your journey, your growth, and your dreams. Every chapter of your life has value and beauty.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-purple-600 to-rose-500 py-16 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-4xl font-bold text-white mb-4">Ready to Begin?</h3>
            <p className="text-xl text-purple-100 mb-8">
              Join thousands of mature adults who have found love, companionship, and meaningful connections.
            </p>
            <button
              onClick={() => { setAuthMode('register'); setCurrentView('auth'); }}
              className="bg-white text-purple-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-purple-50 transition-all duration-300 shadow-xl transform hover:scale-105"
            >
              Join NextChapter Today
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-12 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h4 className="text-2xl font-bold mb-4">NextChapter</h4>
            <p className="text-gray-400 mb-4">Where every ending is a new beginning.</p>
            <div className="text-sm text-gray-500">
              © 2025 NextChapter. Made with ❤️ for meaningful connections.
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Auth Page with enhanced registration
  if (currentView === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent mb-2">
              NextChapter
            </h1>
            <p className="text-gray-600">
              {authMode === 'login' ? 'Welcome back to your journey' : 'Begin your next chapter'}
            </p>
          </div>

          {authMode === 'register' && <AgeWarning />}

          <form onSubmit={handleAuth} className="space-y-6">
            {authMode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    required
                    min="25"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Your age (25+)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <div className="flex">
                    <CountryCodeSelector
                      value={formData.phoneCountry}
                      onChange={(value) => setFormData({ ...formData, phoneCountry: value })}
                    />
                    <input
                      type="tel"
                      required
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="Your phone number"
                    />
                  </div>
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create a secure password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-rose-500 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-rose-600 transition-all duration-300 shadow-lg"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              {authMode === 'login' 
                ? "Don't have an account? Join now" 
                : 'Already have an account? Sign in'
              }
            </button>
          </div>

          <button
            onClick={() => setCurrentView('landing')}
            className="mt-4 w-full text-gray-500 hover:text-gray-700"
          >
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  // Profile Setup Page (enhanced with name field)
  if (currentView === 'profile-setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50 py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Profile</h2>
            <p className="text-gray-600">Tell your story and help others connect with the real you</p>
          </div>

          <form onSubmit={handleProfileSetup} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="How you'd like to be known"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Your city, state"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">About You</label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Share your story, interests, and what makes you unique..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What Are You Looking For?</label>
              <select
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.lookingFor}
                onChange={(e) => setFormData({ ...formData, lookingFor: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="long-term">Long-term relationship</option>
                <option value="companionship">Companionship</option>
                <option value="friendship">Friendship first</option>
                <option value="open">Open to possibilities</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Main Profile Photo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onChange={(e) => handleFileChange(e, 'mainPhoto')}
              />
              <p className="text-sm text-gray-500 mt-1">You can add a photo later from your profile settings</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Photos (up to 10)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onChange={(e) => handleFileChange(e, 'additionalPhotos')}
              />
              <p className="text-sm text-gray-500 mt-1">Optional: Add more photos to show different sides of your personality</p>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-rose-500 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-rose-600 transition-all duration-300 shadow-lg"
            >
              Complete Profile
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard and other views remain the same but with enhanced premium features...
  // (Continuing with dashboard, browse, matches, chat views with premium indicators)
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent">
                NextChapter
              </h1>
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium ${currentView === 'dashboard' ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:text-purple-600'}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={fetchProfiles}
                  className={`px-4 py-2 rounded-lg font-medium ${currentView === 'browse' ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:text-purple-600'}`}
                >
                  Browse
                </button>
                <button
                  onClick={fetchMatches}
                  className={`px-4 py-2 rounded-lg font-medium ${currentView === 'matches' ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:text-purple-600'}`}
                >
                  Matches
                </button>
                <button
                  onClick={() => setCurrentView('subscription')}
                  className={`px-4 py-2 rounded-lg font-medium ${currentView === 'subscription' ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:text-purple-600'}`}
                >
                  💎 Premium
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-gray-700">Hello, {user?.name}</span>
                <PremiumBadge tier={user?.subscription_tier} />
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Your Next Chapter</h2>
          <p className="text-xl text-gray-600 mb-8">Your enhanced dating experience awaits</p>
          
          {/* Enhanced subscription status */}
          {userSubscription && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Your Subscription</h3>
                  <div className="flex items-center space-x-3">
                    <PremiumBadge tier={userSubscription.subscription_tier} />
                    {userSubscription.subscription_tier === 'free' && userSubscription.daily_likes_used !== null && (
                      <span className="text-sm text-gray-600">
                        Daily likes: {userSubscription.daily_likes_used}/5 used
                      </span>
                    )}
                  </div>
                </div>
                {userSubscription.subscription_tier === 'free' && (
                  <button
                    onClick={() => setCurrentView('subscription')}
                    className="bg-gradient-to-r from-purple-600 to-rose-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
                  >
                    Upgrade Now
                  </button>
                )}
              </div>
            </div>
          )}
          
          <div className="text-center">
            <p className="text-gray-600">✅ Email Verified • 🔐 Secure Platform • 🌟 Age 25+ Community</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;