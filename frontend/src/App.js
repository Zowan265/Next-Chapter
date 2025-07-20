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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    setLoading(true);
    setError('');
    
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
          setError('');
          alert('✅ Verification code sent to your email! Check your inbox.');
        } else {
          setError(data.detail || 'Registration failed');
          alert(data.detail || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration error:', error);
        setError('Network error occurred. Please check your connection and try again.');
        alert('Network error occurred. Please check your connection and try again.');
      } finally {
        setLoading(false);
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
          setError('');
        } else {
          setError(data.detail || 'Login failed');
          alert(data.detail || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        setError('Network error occurred. Please check your connection and try again.');
        alert('Network error occurred. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
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
        setCurrentView('dashboard');
        fetchUserSubscription();
        setOtpSent(false);
        setError('');
        alert('🎉 Account verified successfully! Welcome to NextChapter!');
      } else {
        setError(data.detail || 'Verification failed');
        alert(data.detail || 'Verification failed');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Network error occurred. Please check your connection and try again.');
      alert('Network error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
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
        alert(`🔐 ${data.message}`);
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
        setPaymentOtpSent(false);
        setFormData({ ...formData, paymentOtp: '' });
        alert('🎉 Payment authorized! Subscription activated successfully!');
        fetchUserSubscription(); // Refresh subscription data
        setCurrentView('dashboard');
      } else {
        const error = await response.json();
        alert(error.detail || 'Payment authorization failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Network error occurred');
    }
  };

  // Rest of the handlers remain similar but enhanced...
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
          alert('🎉 It\'s a match! You can now start a conversation!');
          fetchMatches();
        }
        setProfiles(profiles.filter(p => p.id !== profileId));
        fetchUserSubscription(); // Refresh subscription data to update like count
      } else {
        const error = await response.json();
        if (response.status === 403) {
          alert('⚠️ Daily like limit reached! Upgrade to Premium for unlimited likes.');
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

  // Enhanced UI Components
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

  const AgeWarning = () => (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <span className="text-2xl mr-3">💫</span>
        <div>
          <h4 className="text-blue-800 font-semibold">Welcome to Your Next Chapter</h4>
          <p className="text-blue-700 text-sm">
            NextChapter welcomes mature adults aged 25 and above seeking meaningful, lasting relationships.
          </p>
        </div>
      </div>
    </div>
  );

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

  const OtpInput = ({ value, onChange, onSubmit, title, subtitle }) => (
    <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md mx-auto">
      <div className="text-6xl mb-4">📧</div>
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <p className="text-gray-600 mb-6">{subtitle}</p>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
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
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-600 to-rose-500 text-white hover:from-purple-700 hover:to-rose-600'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Verifying...
            </div>
          ) : (
            'Verify Code'
          )}
        </button>
      </form>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Demo mode: Use <strong>123456</strong> as verification code</p>
        <p>In production, check your email for the actual code</p>
      </div>
    </div>
  );

  const PaymentOtpModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md mx-4">
        <h3 className="text-2xl font-bold mb-4 text-center">🔐 Payment Authorization</h3>
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

  // OTP Verification Screen
  if (otpSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-rose-50 flex items-center justify-center px-4">
        <OtpInput
          value={formData.otp}
          onChange={(value) => setFormData({ ...formData, otp: value })}
          onSubmit={handleOtpVerification}
          title="📧 Verify Your Email"
          subtitle="We've sent a verification code to your email address. Check your inbox!"
        />
      </div>
    );
  }

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50">
        {/* Navigation */}
        <nav className="relative z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center">
                <h1 className="text-3xl font-bold text-white">
                  NextChapter
                </h1>
                <span className="ml-3 text-xs bg-rose-500/80 text-white px-3 py-1 rounded-full font-medium">
                  Malawian Hearts
                </span>
              </div>
              <div className="hidden md:flex space-x-6">
                <button
                  onClick={() => setCurrentView('auth')}
                  className="text-purple-200 hover:text-white font-medium transition-colors duration-300 px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setAuthMode('register'); setCurrentView('auth'); }}
                  className="bg-gradient-to-r from-rose-500 to-purple-600 text-white px-8 py-3 rounded-full hover:from-rose-600 hover:to-purple-700 transition-all duration-300 shadow-xl transform hover:scale-105 font-semibold"
                >
                  Join Free
                </button>
              </div>
              {/* Mobile Menu */}
              <div className="md:hidden">
                <button
                  onClick={() => { setAuthMode('register'); setCurrentView('auth'); }}
                  className="bg-gradient-to-r from-rose-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Beautiful Hero Section - No Images */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-700 to-rose-600"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20"></div>
          
          {/* Floating Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-8 h-8 bg-white/10 rounded-full animate-bounce"></div>
            <div className="absolute top-40 right-20 w-6 h-6 bg-rose-300/20 rounded-full animate-pulse"></div>
            <div className="absolute bottom-32 left-1/4 w-10 h-10 bg-purple-300/15 rounded-full animate-bounce delay-1000"></div>
            <div className="absolute bottom-20 right-1/3 w-12 h-12 bg-white/5 rounded-full animate-pulse delay-500"></div>
            <div className="absolute top-1/3 left-1/2 w-4 h-4 bg-rose-200/20 rounded-full animate-bounce delay-700"></div>
            <div className="absolute top-60 left-20 w-6 h-6 bg-purple-200/15 rounded-full animate-pulse delay-300"></div>
          </div>
          
          {/* Geometric background patterns */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full animate-spin-slow"></div>
            <div className="absolute top-40 right-20 w-24 h-24 border-2 border-white rounded-full animate-spin-slow delay-1000"></div>
            <div className="absolute bottom-20 left-1/4 w-16 h-16 border-2 border-white rounded-full animate-spin-slow delay-500"></div>
            <div className="absolute bottom-40 right-1/3 w-20 h-20 border-2 border-white rounded-full animate-spin-slow delay-700"></div>
          </div>
          
          <div className="relative z-10 py-24 px-4">
            <div className="max-w-6xl mx-auto text-center">
              <div className="mb-8">
                <h2 className="text-7xl md:text-8xl font-bold text-white mb-6 leading-tight">
                  Your Next Chapter
                  <span className="block text-4xl md:text-6xl font-light text-rose-200 mt-4">
                    of Love Starts Here
                  </span>
                </h2>
              </div>
              
              <p className="text-xl md:text-2xl text-purple-100 mb-12 max-w-4xl mx-auto leading-relaxed">
                A sophisticated dating community designed for mature Malawians (25+) seeking meaningful connections. 
                Whether you're divorced, widowed, a late bloomer, or simply starting fresh - discover love that respects your journey.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <div className="text-4xl mb-4">🔐</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Secure & Verified</h3>
                  <p className="text-purple-200 text-sm">Email verification and secure registration protect your privacy</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <div className="text-4xl mb-4">🇲🇼</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Malawian Community</h3>
                  <p className="text-purple-200 text-sm">Connect locally in Malawi or with fellow Malawians worldwide</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <div className="text-4xl mb-4">💝</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Special Offers</h3>
                  <p className="text-purple-200 text-sm">Saturday free interactions & Wednesday 50% discounts</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <button
                  onClick={() => { setAuthMode('register'); setCurrentView('auth'); }}
                  className="bg-gradient-to-r from-rose-500 to-purple-600 text-white px-12 py-5 rounded-full text-xl font-semibold hover:from-rose-600 hover:to-purple-700 transition-all duration-300 shadow-2xl transform hover:scale-105 hover:shadow-rose-500/25"
                >
                  Begin Your Journey - It's Free
                </button>
                
                <div className="flex items-center justify-center space-x-6 text-purple-200 text-sm">
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    <span>Free to join</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    <span>Instant verification</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    <span>Start matching immediately</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Beautiful Features Section - No Images */}
        <div className="py-24 px-4 bg-gradient-to-br from-gray-50 via-purple-50 to-rose-50 relative overflow-hidden">
          
          {/* Floating Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-6 h-6 bg-purple-200/30 rounded-full animate-float"></div>
            <div className="absolute top-60 right-20 w-8 h-8 bg-rose-200/30 rounded-full animate-float delay-1000"></div>
            <div className="absolute bottom-40 left-1/4 w-5 h-5 bg-purple-300/30 rounded-full animate-float delay-500"></div>
            <div className="absolute bottom-20 right-1/3 w-7 h-7 bg-rose-300/30 rounded-full animate-float delay-700"></div>
          </div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h3 className="text-5xl font-bold text-gray-800 mb-6">Why Choose NextChapter?</h3>
              <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                Experience a dating platform designed specifically for mature Malawians. We understand your culture, 
                values, and the importance of meaningful connections in our community.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
              {/* Enhanced Security */}
              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 shadow-2xl">
                    <div className="text-5xl">🔐</div>
                  </div>
                  <div className="absolute inset-0 bg-blue-200 rounded-full mx-auto w-32 h-32 opacity-20 animate-pulse"></div>
                </div>
                <h4 className="text-3xl font-bold text-gray-800 mb-6">Secure & Trustworthy</h4>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  Your safety is our priority. Every member goes through email verification, and our 
                  secure platform protects your personal information with industry-leading encryption.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-center text-green-600">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm">✓</span>
                    </div>
                    <span className="text-sm">Email & Phone Verification</span>
                  </div>
                  <div className="flex items-center justify-center text-green-600">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm">✓</span>
                    </div>
                    <span className="text-sm">Age Verification Protection</span>
                  </div>
                  <div className="flex items-center justify-center text-green-600">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm">✓</span>
                    </div>
                    <span className="text-sm">Secure Payment Processing</span>
                  </div>
                </div>
              </div>

              {/* Malawian Community */}
              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mx-auto flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 shadow-2xl">
                    <div className="text-5xl">🇲🇼</div>
                  </div>
                  <div className="absolute inset-0 bg-green-200 rounded-full mx-auto w-32 h-32 opacity-20 animate-pulse"></div>
                </div>
                <h4 className="text-3xl font-bold text-gray-800 mb-6">Malawian Community</h4>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  Connect with fellow Malawians locally or abroad. Our platform understands Malawian culture 
                  and values, making it easier to find compatible matches.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-center text-blue-600">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm">🏠</span>
                    </div>
                    <span className="text-sm">Local: Within 300km in Malawi</span>
                  </div>
                  <div className="flex items-center justify-center text-purple-600">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm">✈️</span>
                    </div>
                    <span className="text-sm">Abroad: Connect with Malawians worldwide</span>
                  </div>
                  <div className="flex items-center justify-center text-rose-600">
                    <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm">💰</span>
                    </div>
                    <span className="text-sm">Local MWK pricing available</span>
                  </div>
                </div>
              </div>

              {/* Special Offers */}
              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-rose-500 to-purple-600 rounded-full mx-auto flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 shadow-2xl">
                    <div className="text-5xl">💝</div>
                  </div>
                  <div className="absolute inset-0 bg-rose-200 rounded-full mx-auto w-32 h-32 opacity-20 animate-pulse"></div>
                </div>
                <h4 className="text-3xl font-bold text-gray-800 mb-6">Special Offers</h4>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  Love shouldn't be expensive. Enjoy our special weekly offers and premium features 
                  at affordable prices designed for Malawian users.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-center text-purple-600">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm">📅</span>
                    </div>
                    <span className="text-sm">Wednesday: 50% Off Subscriptions</span>
                  </div>
                  <div className="flex items-center justify-center text-green-600">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm">🎉</span>
                    </div>
                    <span className="text-sm font-semibold">Saturday 7-8 PM: FREE for Everyone!</span>
                  </div>
                  <div className="flex items-center justify-center text-blue-600">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm">💳</span>
                    </div>
                    <span className="text-sm">MWK: 2,500/day, 15,000/week</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced CTA Section */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-rose-50 py-20 px-4 text-center relative overflow-hidden">
          
          {/* Floating Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-20 w-4 h-4 bg-purple-300/30 rounded-full animate-bounce"></div>
            <div className="absolute top-40 right-10 w-6 h-6 bg-rose-300/30 rounded-full animate-bounce delay-1000"></div>
            <div className="absolute bottom-20 left-1/3 w-5 h-5 bg-purple-400/30 rounded-full animate-bounce delay-500"></div>
            <div className="absolute bottom-40 right-1/4 w-3 h-3 bg-rose-400/30 rounded-full animate-bounce delay-700"></div>
          </div>
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="bg-white rounded-3xl shadow-2xl p-12 border border-purple-100">
              <h3 className="text-5xl font-bold text-gray-800 mb-6">Ready to Write Your Next Chapter?</h3>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Join our secure, welcoming community of mature Malawians finding meaningful connections. 
                Whether you're in Malawi or abroad, your perfect match is waiting.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 mb-10">
                <div className="text-left">
                  <h4 className="text-lg font-semibold text-purple-700 mb-4">What Makes Us Special:</h4>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      Designed specifically for mature Malawians (25+)
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      Email & phone verification for safety
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      Understanding community for divorced, widowed
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      Support for late bloomers starting fresh
                    </li>
                  </ul>
                </div>
                <div className="text-left">
                  <h4 className="text-lg font-semibold text-rose-700 mb-4">Special Offers:</h4>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-center">
                      <span className="text-purple-500 mr-3">📅</span>
                      Wednesday: 50% off all subscriptions
                    </li>
                    <li className="flex items-center">
                      <span className="text-purple-500 mr-3">⏰</span>
                      Saturday 7-8 PM CAT: Free interactions
                    </li>
                    <li className="flex items-center">
                      <span className="text-purple-500 mr-3">🇲🇼</span>
                      Malawi: Special MWK pricing available
                    </li>
                    <li className="flex items-center">
                      <span className="text-purple-500 mr-3">✈️</span>
                      Connect with Malawians worldwide
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => { setAuthMode('register'); setCurrentView('auth'); }}
                  className="bg-gradient-to-r from-purple-600 to-rose-500 text-white px-12 py-4 rounded-full text-xl font-semibold hover:from-purple-700 hover:to-rose-600 transition-all duration-300 shadow-xl transform hover:scale-105"
                >
                  Join Free & Find Your Match Today
                </button>
                <p className="text-gray-500">
                  Free to join • Instant verification • 100% secure • Start chatting immediately
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <footer className="bg-gray-900 text-white py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div>
                <h4 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent mb-4">
                  NextChapter
                </h4>
                <p className="text-gray-400 mb-4">
                  Where every ending is a beautiful new beginning. Join thousands finding love in their next chapter.
                </p>
                <div className="flex space-x-4">
                  <span className="text-2xl">💕</span>
                  <span className="text-2xl">🌟</span>
                  <span className="text-2xl">✨</span>
                </div>
              </div>
              
              <div>
                <h5 className="font-semibold mb-4 text-purple-300">Special Features</h5>
                <ul className="space-y-2 text-gray-400">
                  <li>🔐 Secure verification</li>
                  <li>🌍 Global community</li>
                  <li>💝 Special pricing</li>
                  <li>📱 Mobile friendly</li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-semibold mb-4 text-rose-300">Special Times</h5>
                <ul className="space-y-2 text-gray-400">
                  <li>🎯 Wednesday: 50% off</li>
                  <li>🎉 Saturday 7-8 PM: FREE for all</li>
                  <li>🇲🇼 Malawi special rates</li>
                  <li>💎 Premium features</li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-semibold mb-4 text-purple-300">Support</h5>
                <ul className="space-y-2 text-gray-400">
                  <li>❓ Help Center</li>
                  <li>🛡️ Safety Tips</li>
                  <li>📞 Contact Support</li>
                  <li>🌍 40+ Countries</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-700 pt-8 text-center">
              <p className="text-gray-400 mb-2">
                © 2025 NextChapter. Made with ❤️ for meaningful connections.
              </p>
              <p className="text-gray-500 text-sm">
                Bringing together mature Malawians worldwide for authentic, lasting relationships.
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Enhanced Auth Page
  if (currentView === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent mb-2">
              NextChapter Enhanced
            </h1>
            <p className="text-gray-600">
              {authMode === 'login' ? 'Welcome back to your journey' : 'Begin your enhanced journey'}
            </p>
          </div>

          {authMode === 'register' && <AgeWarning />}
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-red-500 text-xl mr-3">⚠️</span>
                <div>
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

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
                  <p className="text-xs text-gray-500 mt-1">🔐 Secured with international verification</p>
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
              {authMode === 'register' && (
                <p className="text-xs text-gray-500 mt-1">📧 Verification code will be sent</p>
              )}
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
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-rose-500 text-white hover:from-purple-700 hover:to-rose-600'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {authMode === 'login' ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                authMode === 'login' ? 'Sign In' : 'Create Account & Verify'
              )}
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

  // Enhanced subscription page with geographical distinctions
  if (currentView === 'subscription') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent">
                NextChapter Enhanced
              </h1>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="text-gray-600 hover:text-purple-600 font-medium"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-gray-800 mb-4">Choose Your Love Journey</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Different subscription tiers offer different geographical matching ranges for Malawians. 
              Find love locally in Malawi or connect with fellow Malawians worldwide.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Free Tier */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-200 relative">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🏠</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Free - Local Only</h3>
                <p className="text-4xl font-bold text-blue-600 mb-4">Free</p>
                <p className="text-gray-600 mb-6">Perfect for finding love in your local area</p>
                
                <div className="space-y-3 mb-8 text-left">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">5 likes per day</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Local area matching (300km radius)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Basic chat features</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Saturday happy hour access</span>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-semibold">Geographical Range</p>
                  <p className="text-xs text-blue-700">Within 300km of your location in Malawi</p>
                </div>
              </div>
            </div>

            {/* Premium Tier */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-purple-200 relative transform scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🏙️</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Premium - Local Love</h3>
                <p className="text-4xl font-bold text-purple-600 mb-4">
                  {subscriptionTiers.premium ? 'MWK 15,000/week' : 'MWK 15,000/week'}
                </p>
                <p className="text-gray-600 mb-6">Extended local area with unlimited interactions</p>
                
                <div className="space-y-3 mb-8 text-left">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Unlimited likes in your area</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Extended local area (500km radius)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Advanced local filters</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">See who liked you locally</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Priority customer support</span>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-6">
                  <p className="text-sm text-purple-800 font-semibold">Geographical Range</p>
                  <p className="text-xs text-purple-700">Within 500km of your location - perfect for regional connections</p>
                </div>

                <button
                  onClick={() => requestPaymentOtp('premium')}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-300"
                >
                  Choose Premium
                </button>
              </div>
            </div>

            {/* VIP Tier */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-rose-200 relative">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🇲🇼</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">VIP - Malawian Hearts</h3>
                <p className="text-4xl font-bold text-rose-600 mb-4">
                  {subscriptionTiers.vip ? 'MWK 30,000/week' : 'MWK 30,000/week'}
                </p>
                <p className="text-gray-600 mb-6">Connect with Malawians anywhere in the world</p>
                
                <div className="space-y-3 mb-8 text-left">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Connect with Malawians worldwide</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Special filters for Malawians abroad</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Travel mode for international connections</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Cultural compatibility matching</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">International communication tools</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Connect with homeland community</span>
                  </div>
                </div>

                <div className="bg-rose-50 p-4 rounded-lg border border-rose-200 mb-6">
                  <p className="text-sm text-rose-800 font-semibold">Geographical Range</p>
                  <p className="text-xs text-rose-700">Connect with Malawians worldwide - no boundaries</p>
                </div>

                <button
                  onClick={() => requestPaymentOtp('vip')}
                  className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3 rounded-lg font-semibold hover:from-rose-700 hover:to-rose-800 transition-all duration-300"
                >
                  Choose VIP
                </button>
              </div>
            </div>
          </div>

          {/* Geographical Comparison */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-8">Compare Geographical Reach</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">🏠</span>
                  </div>
                  <div className="absolute inset-0 border-4 border-blue-300 rounded-full"></div>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Free - 300km Range</h4>
                <p className="text-sm text-gray-600">Perfect for local connections in Malawi</p>
              </div>
              
              <div className="text-center">
                <div className="w-32 h-32 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">🏙️</span>
                  </div>
                  <div className="absolute inset-0 border-4 border-purple-300 rounded-full"></div>
                  <div className="absolute inset-2 border-2 border-purple-400 rounded-full"></div>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Premium - 500km Range</h4>
                <p className="text-sm text-gray-600">Extended area for regional love</p>
              </div>
              
              <div className="text-center">
                <div className="w-32 h-32 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  <div className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">🇲🇼</span>
                  </div>
                  <div className="absolute inset-0 border-4 border-rose-300 rounded-full"></div>
                  <div className="absolute inset-2 border-2 border-rose-400 rounded-full"></div>
                  <div className="absolute inset-4 border-2 border-rose-500 rounded-full"></div>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">VIP - Malawian Global</h4>
                <p className="text-sm text-gray-600">Connect with Malawians worldwide</p>
              </div>
            </div>
          </div>

          {/* Special Offers */}
          <div className="bg-gradient-to-r from-purple-600 to-rose-500 rounded-2xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Special Offers</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="font-semibold mb-2">🎯 Wednesday Special</h4>
                <p className="text-sm">50% off all subscriptions every Wednesday!</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="font-semibold mb-2">🎉 Saturday Happy Hour</h4>
                <p className="text-sm">Free premium access for ALL users Saturday 7-8 PM CAT!</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment OTP Modal */}
        {paymentOtpSent && <PaymentOtpModal />}
      </div>
    );
  }

  // For simplicity, showing the enhanced dashboard for all other views
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50">
      {/* Enhanced Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent">
                NextChapter Enhanced
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
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">✅ Verified</span>
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
          <h2 className="text-4xl font-bold text-gray-800 mb-4">🎉 Welcome to Enhanced NextChapter!</h2>
          <p className="text-xl text-gray-600 mb-8">Your secure dating experience with advanced features</p>
          
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-green-800 mb-2">✨ Enhanced Features Active</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>Email Verified</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">🌍</span>
                <span>Global Phone Support</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">🔐</span>
                <span>Payment Protection</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">🛡️</span>
                <span>Age Fraud Prevention</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">📱</span>
                <span>Multi-factor Auth</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">💎</span>
                <span>Premium Ready</span>
              </div>
            </div>
          </div>

          {/* Enhanced subscription status */}
          {userSubscription && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Your Subscription & Matching Range</h3>
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
                    🔐 Upgrade for Global Access
                  </button>
                )}
              </div>
              
              {/* Matching Scope Information */}
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div className={`p-4 rounded-lg border-2 ${userSubscription.subscription_tier === 'free' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center mb-2">
                    <span className="text-blue-500 text-xl mr-2">🏘️</span>
                    <h4 className="font-semibold text-gray-800">Free - Local Only</h4>
                  </div>
                  <p className="text-sm text-gray-600">Match within 50km of your location</p>
                  <p className="text-xs text-gray-500 mt-1">5 likes per day</p>
                </div>
                
                <div className={`p-4 rounded-lg border-2 ${userSubscription.subscription_tier === 'premium' ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center mb-2">
                    <span className="text-purple-500 text-xl mr-2">🏙️</span>
                    <h4 className="font-semibold text-gray-800">Premium - Extended Area</h4>
                  </div>
                  <p className="text-sm text-gray-600">Match within 100km of your location</p>
                  <p className="text-xs text-gray-500 mt-1">Unlimited local likes</p>
                </div>
                
                <div className={`p-4 rounded-lg border-2 ${userSubscription.subscription_tier === 'vip' ? 'border-rose-200 bg-rose-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center mb-2">
                    <span className="text-rose-500 text-xl mr-2">🌍</span>
                    <h4 className="font-semibold text-gray-800">VIP - Global Hearts</h4>
                  </div>
                  <p className="text-sm text-gray-600">Match with anyone worldwide</p>
                  <p className="text-xs text-gray-500 mt-1">No boundaries, unlimited access</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8 mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Browse Profiles</h3>
              <p className="text-gray-600 mb-4">Enhanced matching with verified users</p>
              <button
                onClick={fetchProfiles}
                className="bg-gradient-to-r from-purple-600 to-rose-500 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
              >
                Start Browsing
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💕</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Your Matches</h3>
              <p className="text-gray-600 mb-4">Secure connections await</p>
              <button
                onClick={fetchMatches}
                className="bg-gradient-to-r from-rose-500 to-purple-600 text-white px-6 py-2 rounded-full hover:from-rose-600 hover:to-purple-700 transition-all duration-300"
              >
                View Matches
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔐</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Secure Premium</h3>
              <p className="text-gray-600 mb-4">OTP-protected subscriptions</p>
              <button
                onClick={() => requestPaymentOtp('premium')}
                className="bg-gradient-to-r from-purple-600 to-rose-500 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
              >
                Test Secure Payment
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment OTP Modal */}
      {paymentOtpSent && <PaymentOtpModal />}
    </div>
  );
}

export default App;