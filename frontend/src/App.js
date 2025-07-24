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
  
  // Password recovery state
  const [passwordResetStep, setPasswordResetStep] = useState('request'); // 'request', 'verify', 'reset'
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [resetData, setResetData] = useState({
    email: '',
    phoneNumber: '',
    phoneCountry: 'US',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Additional state for enhanced dashboard features
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [swipeDirection, setSwipeDirection] = useState(null);
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

  // Helper function to format timer display
  const formatTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Password Recovery Functions
  const startOtpTimer = () => {
    setOtpTimer(150); // 2 minutes 30 seconds to match backend
    const timer = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePasswordResetRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/password-reset-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: resetData.email || null,
          phone_number: resetData.phoneNumber || null,
          phone_country: resetData.phoneCountry
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setResetIdentifier(data.identifier);
        setResetOtpSent(true);
        setAuthMode('reset-verify');
        startOtpTimer();
        alert('✅ Password reset code sent! Check your email.');
      } else {
        setError(data.detail || 'Failed to send reset code');
        alert(data.detail || 'Failed to send reset code');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      setError('Network error occurred. Please try again.');
      alert('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (resetData.newPassword !== resetData.confirmPassword) {
      setError('Passwords do not match');
      alert('Passwords do not match');
      setLoading(false);
      return;
    }

    if (resetData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      alert('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: resetData.email || null,
          phone_number: resetData.phoneNumber || null,
          phone_country: resetData.phoneCountry,
          otp: resetData.otp,
          new_password: resetData.newPassword
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('🎉 Password reset successful! You can now log in with your new password.');
        setAuthMode('login');
        setResetData({
          email: '',
          phoneNumber: '',
          phoneCountry: 'US',
          otp: '',
          newPassword: '',
          confirmPassword: ''
        });
        setResetOtpSent(false);
        setOtpTimer(0);
        setError('');
      } else {
        setError(data.detail || 'Password reset failed');
        alert(data.detail || 'Password reset failed');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Network error occurred. Please try again.');
      alert('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Paychangu Payment Functions
  const [paymentStep, setPaymentStep] = useState('method'); // 'method', 'details', 'processing'
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentData, setPaymentData] = useState({
    operator: '',
    phoneNumber: '',
    amount: 0,
    subscriptionType: ''
  });

  const initiatePaychanguPayment = async (subscriptionType) => {
    setSelectedTier(subscriptionType);
    setPaymentData({ 
      ...paymentData, 
      subscriptionType,
      amount: subscriptionType === 'daily' ? 2500 : subscriptionType === 'weekly' ? 15000 : 30000
    });
    setPaymentStep('method');
    setCurrentView('paychangu-payment');
  };

  const processPaychanguPayment = async () => {
    setLoading(true);
    setError('');

    try {
      const paymentRequest = {
        amount: paymentData.amount,
        currency: 'MWK',
        subscription_type: paymentData.subscriptionType,
        payment_method: paymentMethod,
        phone_number: paymentMethod === 'mobile_money' ? paymentData.phoneNumber : null,
        operator: paymentMethod === 'mobile_money' ? paymentData.operator : null,
        description: `NextChapter ${paymentData.subscriptionType} subscription`
      };

      const response = await fetch(`${API_BASE_URL}/api/paychangu/initiate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(paymentRequest),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.payment_url) {
          // Redirect to Paychangu payment page
          alert('🎉 Redirecting to payment page...');
          window.open(data.payment_url, '_blank');
          setPaymentStep('processing');
        } else {
          alert('✅ Payment initiated! Please complete payment on your mobile device.');
          setPaymentStep('processing');
        }

        // Poll for payment status
        pollPaymentStatus(data.transaction_id);
      } else {
        setError(data.message || 'Payment initiation failed');
        alert(data.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Network error occurred. Please try again.');
      alert('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (transactionId) => {
    let attempts = 0;
    const maxAttempts = 30; // Poll for 5 minutes (30 * 10 seconds)
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/paychangu/transaction/${transactionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const status = data.transaction?.status?.toLowerCase();

          if (status === 'success' || status === 'completed' || status === 'paid') {
            alert('🎉 Payment successful! Your subscription has been activated.');
            fetchUserSubscription(); // Refresh subscription data
            setCurrentView('dashboard');
            return;
          } else if (status === 'failed' || status === 'cancelled') {
            alert('❌ Payment failed or was cancelled. Please try again.');
            setPaymentStep('method');
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Check again in 10 seconds
        } else {
          alert('⏰ Payment status check timeout. Please check your subscription status in your dashboard.');
          setCurrentView('dashboard');
        }
      } catch (error) {
        console.error('Status check error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        }
      }
    };

    setTimeout(checkStatus, 5000); // Start checking after 5 seconds
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

  // Enhanced dashboard functions
  const handleSwipe = async (direction, profileId) => {
    setSwipeDirection(direction);
    
    // Track favorites for liked profiles
    if (direction === 'right') {
      const profile = profiles[currentProfileIndex];
      if (profile) {
        // Add to favorites and track interaction
        setFavorites(prev => {
          const existingFav = prev.find(f => f.id === profileId);
          if (existingFav) {
            // Increment interaction count
            return prev.map(f => 
              f.id === profileId 
                ? { ...f, interactionCount: f.interactionCount + 1, lastInteraction: new Date() }
                : f
            );
          } else {
            // Add new favorite
            return [...prev, {
              ...profile,
              interactionCount: 1,
              lastInteraction: new Date(),
              addedToFavorites: new Date()
            }];
          }
        });
      }
      
      // Send like to backend
      try {
        await fetch(`${API_BASE_URL}/api/like`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ liked_user_id: profileId })
        });
      } catch (error) {
        console.error('Error liking profile:', error);
      }
    }
    
    // Move to next profile
    setTimeout(() => {
      setCurrentProfileIndex(prev => prev + 1);
      setSwipeDirection(null);
      
      // Fetch more profiles if running low
      if (currentProfileIndex >= profiles.length - 2) {
        fetchProfiles();
      }
    }, 300);
  };

  const getMostLikedProfiles = () => {
    return favorites
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, 10);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-rose-900 relative overflow-hidden">
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Floating Orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-rose-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-purple-300/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          
          {/* Moving Particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 bg-white/20 rounded-full animate-float`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
              ></div>
            ))}
          </div>
        </div>
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
                  Join Now
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

        {/* Hero Section */}
        <div className="relative z-10 flex items-center justify-center min-h-screen pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            
            {/* Main Heading with Animation */}
            <div className="mb-12 animate-fade-in-up">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight">
                <span className="block animate-slide-in-left">Your Next</span>
                <span className="block bg-gradient-to-r from-rose-300 to-purple-300 bg-clip-text text-transparent animate-slide-in-right">
                  Chapter Awaits
                </span>
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-rose-500 to-purple-500 mx-auto rounded-full animate-expand"></div>
            </div>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl lg:text-3xl text-purple-100 mb-16 max-w-5xl mx-auto leading-relaxed animate-fade-in-up delay-500">
              Connect with fellow Malawians worldwide. A sophisticated dating community 
              for mature adults seeking meaningful, lasting relationships.
            </p>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto animate-fade-in-up delay-1000">
              <div className="group cursor-pointer">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <div className="text-2xl font-bold text-white">MW</div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Malawian Community</h3>
                  <p className="text-purple-200 leading-relaxed">
                    Connect with Malawians at home and abroad. Cultural compatibility 
                    and shared values at the heart of every match.
                  </p>
                </div>
              </div>

              <div className="group cursor-pointer">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <div className="text-2xl">🔒</div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Secure Platform</h3>
                  <p className="text-purple-200 leading-relaxed">
                    Email verification, phone authentication, and secure payment processing. 
                    Your privacy and safety are our top priorities.
                  </p>
                </div>
              </div>

              <div className="group cursor-pointer">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <div className="text-2xl">💝</div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Special Offers</h3>
                  <p className="text-purple-200 leading-relaxed">
                    Wednesday 50% discounts, Saturday free interactions, 
                    and affordable MWK pricing for our local community.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-6 animate-fade-in-up delay-1500">
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <button
                  onClick={() => { setAuthMode('register'); setCurrentView('auth'); }}
                  className="bg-gradient-to-r from-rose-500 to-purple-600 text-white px-12 py-5 rounded-full text-xl font-bold hover:from-rose-600 hover:to-purple-700 transition-all duration-300 shadow-2xl transform hover:scale-105 hover:shadow-rose-500/25"
                >
                  Start Your Journey
                </button>
                <button
                  onClick={() => setCurrentView('auth')}
                  className="bg-white/20 backdrop-blur-lg text-white px-12 py-5 rounded-full text-xl font-semibold border border-white/30 hover:bg-white/30 transition-all duration-300 transform hover:scale-105"
                >
                  Sign In
                </button>
              </div>
              
              <div className="flex flex-wrap justify-center items-center gap-8 text-purple-200 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-ping"></div>
                  <span>Free to join</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-ping delay-100"></div>
                  <span>Email verified</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-ping delay-200"></div>
                  <span>Instant matching</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-white animate-bounce">
          <div className="flex flex-col items-center">
            <span className="text-sm mb-2 text-purple-200">Discover More</span>
            <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Pricing Preview */}
        <div className="relative z-10 bg-black/20 backdrop-blur-lg border-t border-white/10 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-12">Choose Your Subscription Duration</h2>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-purple-400/50 transition-all duration-300">
                <h3 className="text-2xl font-bold text-white mb-4">Daily</h3>
                <p className="text-purple-200 text-4xl font-bold mb-4">2,500 MWK</p>
                <p className="text-purple-200 mb-6">per day</p>
                <div className="text-sm text-purple-300 space-y-2">
                  <p>Unlimited likes & matches</p>
                  <p>Connect with Malawians worldwide</p>
                  <p>Enhanced chat features</p>
                  <p>Exclusive chat rooms</p>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-rose-400/50 transform scale-105 hover:scale-110 transition-all duration-300">
                <div className="bg-rose-500/80 text-white px-4 py-1 rounded-full text-sm font-semibold mb-4 inline-block">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Weekly</h3>
                <p className="text-rose-200 text-4xl font-bold mb-4">15,000 MWK</p>
                <p className="text-rose-200 mb-6">per week</p>
                <div className="text-sm text-purple-300 space-y-2">
                  <p>All daily features</p>
                  <p>Advanced matching algorithms</p>
                  <p>Priority customer support</p>
                  <p>Profile boost</p>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-green-400/50 transition-all duration-300">
                <div className="bg-green-500/80 text-white px-4 py-1 rounded-full text-sm font-semibold mb-4 inline-block">
                  Best Value
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Monthly</h3>
                <p className="text-green-200 text-4xl font-bold mb-4">30,000 MWK</p>
                <p className="text-green-200 mb-6">per month</p>
                <div className="text-sm text-purple-300 space-y-2">
                  <p>All premium features</p>
                  <p>Cultural compatibility matching</p>
                  <p>Special offers & discounts</p>
                  <p>Best value for serious connections</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => { setAuthMode('register'); setCurrentView('auth'); }}
              className="mt-12 bg-gradient-to-r from-rose-500 to-purple-600 text-white px-10 py-4 rounded-full text-lg font-semibold hover:from-rose-600 hover:to-purple-700 transition-all duration-300 shadow-xl transform hover:scale-105"
            >
              Get Started Now
            </button>
          </div>
        </div>

      </div>
    );
  }

  // Enhanced Auth Page
  if (currentView === 'auth') {
    // Password Recovery Request Form
    if (authMode === 'reset-request') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent mb-2">
                Reset Password
              </h1>
              <p className="text-gray-600">Enter your email to receive a password reset code</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordResetRequest} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={resetData.email}
                  onChange={(e) => setResetData({ ...resetData, email: e.target.value })}
                  placeholder="your@email.com"
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
                    Sending Reset Code...
                  </div>
                ) : (
                  'Send Reset Code'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setAuthMode('login')}
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Password Reset OTP Verification Form
    if (authMode === 'reset-verify') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent mb-2">
                Enter Reset Code
              </h1>
              <p className="text-gray-600">Enter the 6-digit code sent to your email</p>
              {otpTimer > 0 && (
                <p className="text-sm text-purple-600 mt-2">Code expires in: {formatTimer(otpTimer)}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reset Code</label>
                <input
                  type="text"
                  required
                  maxLength="6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                  value={resetData.otp}
                  onChange={(e) => setResetData({ ...resetData, otp: e.target.value.replace(/\D/g, '') })}
                  placeholder="123456"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    minLength="6"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={resetData.newPassword}
                    onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={resetData.confirmPassword}
                    onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>
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
                    Resetting Password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setAuthMode('reset-request');
                  setResetOtpSent(false);
                  setOtpTimer(0);
                  setError('');
                }}
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                ← Back to Email Entry
              </button>
            </div>
          </div>
        </div>
      );
    }

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
              {authMode === 'login' && (
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('reset-request');
                      setPasswordResetStep('request');
                      setError('');
                    }}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
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

  // Enhanced subscription page with pricing options
  if (currentView === 'subscription') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent">
                NextChapter <span className="text-sm bg-red-100 text-red-600 px-2 py-1 rounded-full">Malawian Hearts</span>
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
            <h2 className="text-5xl font-bold text-gray-800 mb-4">Choose Your Subscription Duration</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Subscribe to NextChapter and connect with fellow Malawians worldwide. 
              All subscriptions include unlimited features - just pick your preferred duration.
            </p>
          </div>

          {/* Special Offers Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-rose-500 text-white rounded-2xl p-6 mb-12 text-center">
            <h3 className="text-2xl font-bold mb-2">🎉 Special Offers</h3>
            <p className="text-lg">✨ Wednesday 50% discounts • 🎊 Saturday free interactions (7-8 PM CAT)</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Daily Subscription */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-purple-200 relative">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">📅</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Daily</h3>
                <p className="text-4xl font-bold text-purple-600 mb-2">2,500 MWK</p>
                <p className="text-sm text-gray-500 mb-4">per day</p>
                <p className="text-gray-600 mb-6">Perfect for trying out the platform</p>
                
                <div className="space-y-3 mb-8 text-left">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Unlimited likes and matches</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Connect with Malawians worldwide</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Enhanced chat features</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Access to exclusive chat rooms</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">See who liked you</span>
                  </div>
                </div>

                <button
                  onClick={() => initiatePaychanguPayment('daily')}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-300"
                >
                  Subscribe Daily
                </button>
              </div>
            </div>

            {/* Weekly Subscription */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-rose-200 relative transform scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-rose-500 text-white px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Weekly</h3>
                <p className="text-4xl font-bold text-rose-600 mb-2">15,000 MWK</p>
                <p className="text-sm text-gray-500 mb-4">per week</p>
                <p className="text-gray-600 mb-6">Great balance of value and commitment</p>
                
                <div className="space-y-3 mb-8 text-left">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Unlimited likes and matches</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Connect with Malawians worldwide</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Advanced matching algorithms</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Access to exclusive chat rooms</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Priority customer support</span>
                  </div>
                </div>

                <button
                  onClick={() => initiatePaychanguPayment('weekly')}
                  className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3 rounded-lg font-semibold hover:from-rose-700 hover:to-rose-800 transition-all duration-300"
                >
                  Subscribe Weekly
                </button>
              </div>
            </div>

            {/* Monthly Subscription */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-green-200 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">Best Value</span>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">💎</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Monthly</h3>
                <p className="text-4xl font-bold text-green-600 mb-2">30,000 MWK</p>
                <p className="text-sm text-gray-500 mb-4">per month</p>
                <p className="text-gray-600 mb-6">Best value for serious connections</p>
                
                <div className="space-y-3 mb-8 text-left">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Unlimited likes and matches</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Connect with Malawians worldwide</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Cultural compatibility matching</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Profile boost</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-sm">Special offers and discounts</span>
                  </div>
                </div>

                <button
                  onClick={() => requestPaymentOtp('monthly')}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-300"
                >
                  Subscribe Monthly
                </button>
              </div>
            </div>
          </div>

          {/* Diaspora Pricing Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <h4 className="text-lg font-bold text-blue-800 mb-2">🌍 For Malawians Living Abroad</h4>
            <p className="text-blue-700">
              USD pricing available: Daily $1.35 • Weekly $8.05 • Monthly $16.09
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Automatically applied based on your location
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced Dashboard with swipeable profiles
  if (currentView === 'dashboard' || (user && !['landing', 'auth', 'subscription'].includes(currentView))) {
    const currentProfile = profiles[currentProfileIndex];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50">
        {/* Enhanced Navigation */}
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
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'dashboard' ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:text-purple-600'}`}
                  >
                    🏠 Discover
                  </button>
                  <button
                    onClick={() => setCurrentView('favorites')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'favorites' ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:text-purple-600'}`}
                  >
                    💖 Favorites ({favorites.length})
                  </button>
                  <button
                    onClick={() => setCurrentView('matches')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'matches' ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:text-purple-600'}`}
                  >
                    💕 Matches
                  </button>
                  {userSubscription?.subscription_tier === 'premium' && (
                    <button
                      onClick={() => setCurrentView('chat')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'chat' ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:text-purple-600'}`}
                    >
                      💬 Chat Rooms
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentView('subscription')}
                  className="text-purple-600 hover:text-purple-800 font-medium"
                >
                  Subscription
                </button>
                <button
                  onClick={() => { 
                    localStorage.removeItem('token'); 
                    setUser(null); 
                    setCurrentView('landing'); 
                  }}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Dashboard Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Dashboard View - Swipeable Profiles */}
          {currentView === 'dashboard' && (
            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* Profile Cards Stack */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6">Discover Your Next Chapter</h2>
                  
                  {profiles.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Finding your matches...</h3>
                      <p className="text-gray-600 mb-6">We're looking for compatible Malawians in your area.</p>
                      <button
                        onClick={fetchProfiles}
                        className="bg-gradient-to-r from-purple-600 to-rose-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
                      >
                        Refresh Profiles
                      </button>
                    </div>
                  ) : currentProfile ? (
                    <div className="relative h-96 lg:h-[600px]">
                      {/* Background cards for stack effect */}
                      {profiles.slice(currentProfileIndex + 1, currentProfileIndex + 3).map((profile, index) => (
                        <div
                          key={profile.id}
                          className="absolute inset-0 bg-white rounded-2xl shadow-lg transform rotate-1 scale-95 opacity-40"
                          style={{
                            zIndex: 2 - index,
                            transform: `rotate(${(index + 1) * 2}deg) scale(${0.95 - index * 0.02})`,
                            opacity: 0.4 - index * 0.1
                          }}
                        ></div>
                      ))}
                      
                      {/* Current Profile Card */}
                      <div 
                        className={`swipe-card absolute inset-0 bg-white rounded-2xl shadow-xl z-10 transition-transform duration-300 ${
                          swipeDirection === 'left' ? 'swiping-left' : swipeDirection === 'right' ? 'swiping-right' : ''
                        }`}
                        style={{ zIndex: 10 }}
                      >
                        {/* Profile Content */}
                        <div className="h-full flex flex-col">
                          {/* Profile Image */}
                          <div className="h-2/3 bg-gradient-to-br from-purple-200 to-rose-200 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                            {currentProfile.main_photo ? (
                              <img 
                                src={`${API_BASE_URL}/uploads/${currentProfile.main_photo}`}
                                alt={currentProfile.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-6xl text-purple-400">👤</div>
                            )}
                            
                            {/* Profile Info Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white p-6">
                              <h3 className="text-2xl font-bold mb-1">
                                {currentProfile.name}, {currentProfile.age}
                              </h3>
                              {currentProfile.location && (
                                <p className="text-sm opacity-90 mb-2">
                                  📍 {currentProfile.location.split(':')[0]}
                                  {currentProfile.distance_km && ` • ${currentProfile.distance_km}km away`}
                                </p>
                              )}
                              {currentProfile.is_malawian && (
                                <span className="inline-block bg-rose-500/80 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                  🇲🇼 Malawian
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Profile Details */}
                          <div className="h-1/3 p-6 flex flex-col justify-between">
                            <div>
                              {currentProfile.bio && (
                                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                  {currentProfile.bio}
                                </p>
                              )}
                              {currentProfile.interests && currentProfile.interests.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {currentProfile.interests.slice(0, 3).map((interest, index) => (
                                    <span key={index} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                                      {interest}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Swipe Action Buttons */}
                            <div className="flex justify-center space-x-4 mt-4">
                              <button
                                onClick={() => handleSwipe('left', currentProfile.id)}
                                className="w-16 h-16 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-2xl transition-all duration-300 transform hover:scale-110"
                              >
                                ❌
                              </button>
                              <button
                                onClick={() => handleSwipe('right', currentProfile.id)}
                                className="w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-full flex items-center justify-center text-2xl transition-all duration-300 transform hover:scale-110"
                              >
                                ❤️
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                      <div className="text-6xl mb-4">🎉</div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">All caught up!</h3>
                      <p className="text-gray-600 mb-6">Check back later for new profiles or expand your search.</p>
                      <button
                        onClick={() => setCurrentView('subscription')}
                        className="bg-gradient-to-r from-purple-600 to-rose-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
                      >
                        Upgrade for More Matches
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sidebar */}
              <div className="space-y-6">
                
                {/* User Status Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-rose-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                      {user?.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{user?.name}</h3>
                      <p className="text-sm text-gray-600">{userSubscription?.subscription_tier || 'Free'} Member</p>
                    </div>
                  </div>
                  
                  {userSubscription && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Daily Likes:</span>
                        <span className="font-medium">
                          {userSubscription.subscription_tier === 'free' 
                            ? `${userSubscription.daily_likes_used || 0}/5`
                            : 'Unlimited'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Range:</span>
                        <span className="font-medium">
                          {userSubscription.subscription_tier === 'free' 
                            ? '300km' 
                            : userSubscription.subscription_tier === 'premium' 
                            ? '500km' 
                            : 'Worldwide'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Favorites */}
                {favorites.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                      💖 Your Top Matches
                    </h3>
                    <div className="space-y-3">
                      {getMostLikedProfiles().slice(0, 3).map((fav, index) => (
                        <div key={fav.id} className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-200 to-rose-200 rounded-full flex items-center justify-center">
                            {fav.main_photo ? (
                              <img 
                                src={`${API_BASE_URL}/uploads/${fav.main_photo}`}
                                alt={fav.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <span className="text-sm">👤</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{fav.name}</p>
                            <p className="text-xs text-gray-500">
                              {fav.interactionCount} interactions
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentView('favorites')}
                      className="w-full mt-4 text-purple-600 hover:text-purple-800 font-medium text-sm"
                    >
                      View All Favorites →
                    </button>
                  </div>
                )}

                {/* Special Offers */}
                <div className="bg-gradient-to-br from-purple-500 to-rose-500 text-white rounded-2xl shadow-lg p-6">
                  <h3 className="font-semibold mb-3">✨ Special Offers</h3>
                  <div className="space-y-2 text-sm">
                    <p>🎯 Wednesday: 50% off subscriptions</p>
                    <p>🎉 Saturday 7-8pm: Free interactions</p>
                  </div>
                  <button
                    onClick={() => setCurrentView('subscription')}
                    className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default App;