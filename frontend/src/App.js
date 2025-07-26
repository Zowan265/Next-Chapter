import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  const [profiles, setProfiles] = useState([]);
  const [matches, setMatches] = useState([
    {
      id: 1,
      name: "Jennifer Adams",
      age: 37,
      location: "Mzuzu, Malawi",
      bio: "Teacher and mother of two, looking for a genuine partner to share life's adventures.",
      interests: ["Education", "Family", "Reading", "Gardening"],
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&crop=face",
      matchDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      lastMessage: "Thank you for the lovely message! I'd love to get to know you better."
    },
    {
      id: 2,
      name: "Patricia Mwale",
      age: 32,
      location: "Zomba, Malawi",
      bio: "Small business owner with a passion for community development and cultural preservation.",
      interests: ["Business", "Culture", "Music", "Travel"],
      image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop&crop=face",
      matchDate: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      lastMessage: "It's wonderful to meet someone who shares similar values!"
    },
    {
      id: 3,
      name: "Monica Kalulu",
      age: 28,
      location: "London, UK",
      bio: "Malawian living in London, working in healthcare and missing the warmth of home.",
      interests: ["Healthcare", "Cooking", "Movies", "Home"],
      image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop&crop=face",
      matchDate: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      lastMessage: "New match! Start a conversation"
    }
  ]);
  const [messages, setMessages] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [subscriptionTiers, setSubscriptionTiers] = useState({});
  const [userSubscription, setUserSubscription] = useState(null);
  const [countryCodes, setCountryCodes] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [paymentOtpMethod, setPaymentOtpMethod] = useState('email');
  const [paymentOtpSent, setPaymentOtpSent] = useState(false);
  const [selectedTier, setSelectedTier] = useState('');
  
  // Notification and subscription status state
  const [subscriptionNotification, setSubscriptionNotification] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  
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
  const [favorites, setFavorites] = useState([
    {
      id: 1,
      name: "Sarah Michelle",
      age: 34,
      location: "Lilongwe, Malawi",
      bio: "Entrepreneur passionate about sustainable living and meaningful connections.",
      interests: ["Travel", "Books", "Cooking", "Nature"],
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b371?w=400&h=500&fit=crop&crop=face",
      compatibility: 92,
      lastActive: "2 hours ago"
    },
    {
      id: 2,
      name: "Grace Temba",
      age: 29,
      location: "Blantyre, Malawi",
      bio: "Medical professional who loves hiking and volunteering in community projects.",
      interests: ["Healthcare", "Hiking", "Community Work", "Photography"],
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&crop=face",
      compatibility: 87,
      lastActive: "1 hour ago"
    },
    {
      id: 3,
      name: "Linda Foster",
      age: 41,
      location: "Toronto, Canada",
      bio: "Malawian diaspora working in finance, seeking genuine connections with shared values.",
      interests: ["Finance", "Culture", "Music", "Family"],
      image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop&crop=face",
      compatibility: 89,
      lastActive: "30 minutes ago"
    }
  ]);

  // Match Notification Component
  const MatchNotification = () => {
    if (!showMatchNotification || matchNotifications.length === 0) return null;
    
    const latestNotification = matchNotifications[0];
    
    return (
      <div className="fixed top-4 right-4 z-50 max-w-sm">
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-sm animate-bounce">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/30">
                <img 
                  src={latestNotification.user.image || "https://images.unsplash.com/photo-1494790108755-2616b612b371?w=100&h=100&fit=crop&crop=face"} 
                  alt={latestNotification.user.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">💕</span>
                <h3 className="font-bold text-lg">It's a Match!</h3>
              </div>
              <p className="text-white/90 text-sm font-medium">
                You and {latestNotification.user.name} liked each other
              </p>
              <div className="flex space-x-2 mt-3">
                <button 
                  onClick={() => {
                    setCurrentView('matches');
                    setShowMatchNotification(false);
                    markNotificationAsRead(latestNotification.id);
                  }}
                  className="px-4 py-2 bg-white text-pink-600 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
                >
                  Send Message
                </button>
                <button 
                  onClick={() => setShowMatchNotification(false)}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg font-medium text-sm hover:bg-white/30 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Simulate receiving a new match (for testing)
  const simulateNewMatch = () => {
    const sampleMatches = [
      {
        name: "Sarah Johnson",
        age: 29,
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b371?w=100&h=100&fit=crop&crop=face",
        location: "Lilongwe, Malawi"
      },
      {
        name: "Grace Chikwanha", 
        age: 33,
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
        location: "Blantyre, Malawi"
      }
    ];
    
    const randomMatch = sampleMatches[Math.floor(Math.random() * sampleMatches.length)];
    addMatchNotification(randomMatch);
  };

  // Helper functions
  const formatMatchDate = (date) => {
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just matched!';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const removeFavorite = (profileId) => {
    setFavorites(favorites.filter(fav => fav.id !== profileId));
  };
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
        
        // Check if subscription status changed from previous state
        if (userSubscription && userSubscription.subscription_tier !== subscription.subscription_tier) {
          if (subscription.subscription_tier === 'premium' && subscription.subscription_status === 'active') {
            // Show subscription activation notification
            showSubscriptionNotification({
              type: 'success',
              title: '🎉 Subscription Activated!',
              message: `Your ${getSubscriptionDisplayName(subscription)} subscription is now active!`,
              duration: 'daily'
            });
          }
        }
        
        setUserSubscription(subscription);
      }
    } catch (error) {
      console.error('Error fetching user subscription:', error);
    }
  };

  // Notification functions
  const showSubscriptionNotification = (notification) => {
    setSubscriptionNotification(notification);
    setShowNotification(true);
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setShowNotification(false);
      setTimeout(() => setSubscriptionNotification(null), 300); // Allow fade out animation
    }, 5000);
  };

  const getSubscriptionDisplayName = (subscription) => {
    // Determine subscription type based on expiration date
    if (!subscription.subscription_expires) return 'Premium';
    
    const now = new Date();
    const expires = new Date(subscription.subscription_expires);
    const daysUntilExpiry = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 1) return 'Daily';
    else if (daysUntilExpiry <= 7) return 'Weekly';
    else return 'Monthly';
  };

  const getSubscriptionStatusColor = (subscription) => {
    if (!subscription || subscription.subscription_tier === 'free') return 'gray';
    if (subscription.subscription_status === 'active') return 'green';
    if (subscription.subscription_status === 'expired') return 'red';
    return 'yellow';
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
  
  // Payment timeout state
  const [paymentTimeoutTimer, setPaymentTimeoutTimer] = useState(0);
  const [paymentTimedOut, setPaymentTimedOut] = useState(false);
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Notification system for matches
  const [matchNotifications, setMatchNotifications] = useState([]);
  const [showMatchNotification, setShowMatchNotification] = useState(false);

  // Function to create match notifications
  const addMatchNotification = (matchUser) => {
    const notification = {
      id: Date.now(),
      user: matchUser,
      timestamp: new Date(),
      read: false
    };
    
    setMatchNotifications(prev => [notification, ...prev]);
    setShowMatchNotification(true);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      setShowMatchNotification(false);
    }, 5000);
  };

  // Mark notification as read
  const markNotificationAsRead = (notificationId) => {
    setMatchNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Payment timeout timer function
  const startPaymentTimeoutTimer = () => {
    setPaymentTimeoutTimer(210); // 3 minutes 30 seconds
    setPaymentTimedOut(false);
    
    const timer = setInterval(() => {
      setPaymentTimeoutTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPaymentTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return timer; // Return timer ID for cleanup if needed
  };

  const initiatePaychanguPayment = async (subscriptionType) => {
    setSelectedTier(subscriptionType);
    setPaymentData({ 
      ...paymentData, 
      subscriptionType,
      amount: subscriptionType === 'daily' ? 2500 : subscriptionType === 'weekly' ? 10000 : 15000
    });
    setPaymentStep('method');
    setCurrentView('paychangu-payment');
    
    // Reset payment timeout state
    setPaymentTimeoutTimer(0);
    setPaymentTimedOut(false);
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

        // Poll for payment status with timeout timer
        startPaymentTimeoutTimer();
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

  // Enhanced payment verification system
  const verifyPaymentAndRedirect = async (transactionData) => {
    try {
      // Double-check subscription status after successful payment
      const subscriptionResponse = await fetch(`${API_BASE_URL}/api/user/subscription`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        
        // Verify that subscription is actually active
        if (subscriptionData.subscription_tier === 'premium' && subscriptionData.subscription_status === 'active') {
          // Payment verification successful - show success notification
          showSubscriptionNotification({
            type: 'success',
            title: '🎉 Payment Verified & Subscription Active!',
            message: `Welcome to NextChapter Premium! Your ${getSubscriptionDisplayName(subscriptionData)} subscription is now active.`,
            duration: 'long'
          });
          
          // Update local subscription state
          setUserSubscription(subscriptionData);
          
          // Clear payment timeout state
          setPaymentTimeoutTimer(0);
          setPaymentTimedOut(false);
          
          // Redirect to dashboard
          setCurrentView('dashboard');
          
          return true;
        } else {
          // Payment may be processing - continue polling
          return false;
        }
      } else {
        console.error('Failed to verify subscription status');
        return false;
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  };

  const pollPaymentStatus = async (transactionId) => {
    let attempts = 0;
    const maxAttempts = 21; // Poll for 3 minutes 30 seconds (21 * 10 seconds)
    
    const checkStatus = async () => {
      try {
        // Check if payment timed out
        if (paymentTimedOut) {
          alert('⏰ Payment timeout: Your payment took longer than expected. Please check your subscription status or try again.');
          setPaymentStep('method');
          setPaymentTimeoutTimer(0);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/paychangu/transaction/${transactionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const status = data.transaction?.status?.toLowerCase();

          if (status === 'success' || status === 'completed' || status === 'paid') {
            // Payment successful - use enhanced verification system
            const verificationSuccess = await verifyPaymentAndRedirect(data);
            
            if (verificationSuccess) {
              return; // Successfully verified and redirected
            }
            // If verification failed, continue polling (payment might still be processing)
            
          } else if (status === 'failed' || status === 'cancelled') {
            alert('❌ Payment failed or was cancelled. Please try again.');
            setPaymentStep('method');
            setPaymentTimeoutTimer(0); // Clear timer
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts && !paymentTimedOut) {
          setTimeout(checkStatus, 10000); // Check again in 10 seconds
        } else if (!paymentTimedOut) {
          // Only show timeout if not already timed out
          alert('⏰ Payment status check timeout. Please check your subscription status in your dashboard.');
          setCurrentView('dashboard');
          setPaymentTimeoutTimer(0); // Clear timer
        }
      } catch (error) {
        console.error('Status check error:', error);
        attempts++;
        if (attempts < maxAttempts && !paymentTimedOut) {
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

  // Chat room state management
  const [selectedChatRoom, setSelectedChatRoom] = useState(null);
  const [chatRooms, setChatRooms] = useState([
    {
      id: 'general',
      name: 'General Discussion',
      description: 'Open chat for all premium members',
      members: 24,
      lastMessage: 'Welcome to NextChapter!',
      lastActivity: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      color: 'purple'
    },
    {
      id: 'mature',
      name: 'Mature Connections',
      description: 'For users 35+ seeking serious relationships',
      members: 18,
      lastMessage: 'Looking forward to meaningful conversations...',
      lastActivity: new Date(Date.now() - 1000 * 60 * 12), // 12 minutes ago
      color: 'rose'
    },
    {
      id: 'malawian',
      name: 'Malawian Hearts',
      description: 'Connect with fellow Malawians worldwide',
      members: 31,
      lastMessage: 'Moni nonse! How is everyone doing?',
      lastActivity: new Date(Date.now() - 1000 * 60 * 3), // 3 minutes ago
      color: 'blue'
    },
    {
      id: 'diaspora',
      name: 'Diaspora Connect',
      description: 'For Malawians living abroad',
      members: 15,
      lastMessage: 'Missing home but loving the connections here!',
      lastActivity: new Date(Date.now() - 1000 * 60 * 8), // 8 minutes ago
      color: 'green'
    }
  ]);
  const [chatMessages, setChatMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');

  // Sample chat messages for different rooms
  useEffect(() => {
    const sampleMessages = {
      general: [
        {
          id: 1,
          sender: 'Sarah M.',
          message: 'Welcome everyone to NextChapter! 🎉',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          isOwn: false
        },
        {
          id: 2,
          sender: 'Michael K.',
          message: 'Thank you! Excited to be here and meet new people.',
          timestamp: new Date(Date.now() - 1000 * 60 * 25),
          isOwn: false
        },
        {
          id: 3,
          sender: 'You',
          message: 'Hello everyone! Looking forward to great conversations.',
          timestamp: new Date(Date.now() - 1000 * 60 * 20),
          isOwn: true
        },
        {
          id: 4,
          sender: 'Grace T.',
          message: 'This platform is wonderful for mature connections!',
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          isOwn: false
        }
      ],
      mature: [
        {
          id: 1,
          sender: 'James R.',
          message: 'At our age, we know what we\'re looking for in relationships.',
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
          isOwn: false
        },
        {
          id: 2,
          sender: 'Linda W.',
          message: 'Absolutely! Quality over quantity always.',
          timestamp: new Date(Date.now() - 1000 * 60 * 40),
          isOwn: false
        }
      ],
      malawian: [
        {
          id: 1,
          sender: 'Chisomo L.',
          message: 'Moni nonse! Great to see fellow Malawians here! 🇲🇼',
          timestamp: new Date(Date.now() - 1000 * 60 * 35),
          isOwn: false
        },
        {
          id: 2,
          sender: 'Kondwani M.',
          message: 'Zikomo kwambiri! This brings us together despite the distance.',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          isOwn: false
        }
      ],
      diaspora: [
        {
          id: 1,
          sender: 'Temwa S.',
          message: 'Living in London but my heart is still in Malawi! ❤️',
          timestamp: new Date(Date.now() - 1000 * 60 * 50),
          isOwn: false
        },
        {
          id: 2,
          sender: 'Mphatso K.',
          message: 'Toronto here! It\'s amazing to connect with home.',
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
          isOwn: false
        }
      ]
    };
    setChatMessages(sampleMessages);
  }, []);

  const sendChatMessage = () => {
    if (!newMessage.trim() || !selectedChatRoom) return;
    
    const message = {
      id: Date.now(),
      sender: 'You',
      message: newMessage,
      timestamp: new Date(),
      isOwn: true
    };

    setChatMessages(prev => ({
      ...prev,
      [selectedChatRoom.id]: [...(prev[selectedChatRoom.id] || []), message]
    }));

    setNewMessage('');
    
    // Update room's last activity
    setChatRooms(prev => prev.map(room => 
      room.id === selectedChatRoom.id 
        ? { ...room, lastMessage: newMessage, lastActivity: new Date() }
        : room
    ));
  };

  const formatChatTime = (timestamp) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - timestamp) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return timestamp.toLocaleDateString();
  };

  const getRoomColorClasses = (color) => {
    const colors = {
      purple: 'bg-purple-500 text-white',
      rose: 'bg-rose-500 text-white',
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white'
    };
    return colors[color] || colors.purple;
  };

  // Favorites View
  if (currentView === 'favorites') {
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
                    className="text-gray-600 hover:text-purple-600 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    🏠 Discover
                  </button>
                  <button className="px-4 py-2 rounded-lg font-medium bg-purple-100 text-purple-800">
                    💖 Favorites
                  </button>
                  <button
                    onClick={() => setCurrentView('matches')}
                    className="text-gray-600 hover:text-purple-600 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    💕 Matches
                  </button>
                  {userSubscription?.subscription_tier === 'premium' && (
                    <button
                      onClick={() => setCurrentView('chat')}
                      className="text-gray-600 hover:text-purple-600 font-medium transition-colors px-4 py-2 rounded-lg"
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
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Your Favorites 💖</h2>
            <p className="text-gray-600">Profiles you've shown special interest in</p>
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">💔</div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">No Favorites Yet</h3>
              <p className="text-gray-600 mb-6">
                Start exploring profiles and add them to your favorites by clicking the heart icon!
              </p>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-rose-500 text-white rounded-lg font-medium hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
              >
                Discover Profiles
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {favorites.map((profile) => (
                <div key={profile.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <div className="relative">
                    <img
                      src={profile.image}
                      alt={profile.name}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={() => removeFavorite(profile.id)}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
                        title="Remove from favorites"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <div className="absolute bottom-4 left-4">
                      <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        {profile.compatibility}% Match
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold text-gray-800">{profile.name}</h3>
                      <span className="text-gray-500 text-sm">{profile.age} years</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 text-sm mb-3">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {profile.location}
                    </div>
                    
                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">{profile.bio}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {profile.interests.slice(0, 3).map((interest, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                      {profile.interests.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{profile.interests.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Active {profile.lastActive}
                      </span>
                      <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-rose-500 text-white text-sm rounded-lg font-medium hover:from-purple-700 hover:to-rose-600 transition-all duration-300">
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Matches View
  if (currentView === 'matches') {
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
                    className="text-gray-600 hover:text-purple-600 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    🏠 Discover
                  </button>
                  <button
                    onClick={() => setCurrentView('favorites')}
                    className="text-gray-600 hover:text-purple-600 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    💖 Favorites
                  </button>
                  <button className="px-4 py-2 rounded-lg font-medium bg-purple-100 text-purple-800">
                    💕 Matches
                  </button>
                  {userSubscription?.subscription_tier === 'premium' && (
                    <button
                      onClick={() => setCurrentView('chat')}
                      className="text-gray-600 hover:text-purple-600 font-medium transition-colors px-4 py-2 rounded-lg"
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
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Your Matches 💕</h2>
            <p className="text-gray-600">People who liked you back - start meaningful conversations!</p>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">💔</div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">No Matches Yet</h3>
              <p className="text-gray-600 mb-6">
                Keep exploring profiles and showing interest. When someone likes you back, they'll appear here!
              </p>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-rose-500 text-white rounded-lg font-medium hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
              >
                Discover Profiles
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {matches.map((match) => (
                <div key={match.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      <img
                        src={match.image}
                        alt={match.name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-purple-100"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">{match.name}, {match.age}</h3>
                          <div className="flex items-center text-gray-600 text-sm">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {match.location}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full mb-1">
                            💕 It's a Match!
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatMatchDate(match.matchDate)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 text-sm mb-3">{match.bio}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {match.interests.slice(0, 4).map((interest, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                        {match.interests.length > 4 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{match.interests.length - 4} more
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Last message:</span> {match.lastMessage}
                        </div>
                        <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-rose-500 text-white text-sm rounded-lg font-medium hover:from-purple-700 hover:to-rose-600 transition-all duration-300">
                          Send Message
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat Rooms View
  if (currentView === 'chat') {
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
                    className="text-gray-600 hover:text-purple-600 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    🏠 Discover
                  </button>
                  <button
                    onClick={() => setCurrentView('favorites')}
                    className="text-gray-600 hover:text-purple-600 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    💖 Favorites
                  </button>
                  <button
                    onClick={() => setCurrentView('matches')}
                    className="text-gray-600 hover:text-purple-600 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    💕 Matches
                  </button>
                  <button className="px-4 py-2 rounded-lg font-medium bg-purple-100 text-purple-800">
                    💬 Chat Rooms
                  </button>
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
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex h-screen pt-16 bg-gradient-to-br from-purple-50/50 to-rose-50/50">
          {/* Enhanced Chat Rooms Sidebar */}
          <div className="w-1/3 bg-white/95 backdrop-blur-sm shadow-xl border-r border-purple-100">
            <div className="p-6 border-b border-gradient-to-r from-purple-200 to-rose-200 bg-gradient-to-r from-purple-50 to-rose-50">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-rose-500 rounded-full flex items-center justify-center text-white font-bold">
                  💬
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent">
                    Premium Chat Rooms
                  </h2>
                  <p className="text-gray-600 text-sm">Connect with fellow NextChapter members</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600 font-medium flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  {chatRooms.reduce((total, room) => total + room.members, 0)} members online
                </span>
                <span className="text-purple-600">👑 Premium Feature</span>
              </div>
            </div>
            
            <div className="overflow-y-auto h-full bg-gradient-to-b from-white to-purple-25">
              {chatRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedChatRoom(room)}
                  className={`p-4 border-b border-purple-50 cursor-pointer transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-rose-50 hover:shadow-md ${
                    selectedChatRoom?.id === room.id ? 'bg-gradient-to-r from-purple-100 to-rose-100 border-l-4 border-purple-500 shadow-lg' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${getRoomColorClasses(room.color)}`}>
                      {room.name.charAt(0)}
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full text-xs flex items-center justify-center">
                        {room.members}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-800 truncate text-lg">{room.name}</h3>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">{formatChatTime(room.lastActivity)}</span>
                          {selectedChatRoom?.id === room.id && (
                            <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full animate-pulse shadow-sm"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 italic">{room.description}</p>
                      <p className="text-sm text-gray-700 truncate font-medium">{room.lastMessage}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z"/>
                              <path fillRule="evenodd" d="M2 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4z" clipRule="evenodd"/>
                            </svg>
                            {room.members} active
                          </span>
                        </div>
                        {room.members > 20 && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                            🔥 Popular
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Sidebar Footer */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-rose-50 border-t border-purple-100">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Enjoying the chat rooms?</p>
                  <button className="text-xs text-purple-600 hover:text-purple-800 font-medium">
                    Share feedback 📝
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Chat Area */}
          <div className="flex-1 flex flex-col bg-white">
            {selectedChatRoom ? (
              <>
                {/* Enhanced Chat Header */}
                <div className="bg-gradient-to-r from-purple-50 to-rose-50 shadow-lg border-b border-purple-100 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${getRoomColorClasses(selectedChatRoom.color)}`}>
                        {selectedChatRoom.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent">
                          {selectedChatRoom.name}
                        </h3>
                        <div className="flex items-center space-x-3">
                          <p className="text-sm text-gray-600 flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            {selectedChatRoom.members} members online
                          </p>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            Premium Chat
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <button className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 italic">{selectedChatRoom.description}</p>
                </div>

                {/* Enhanced Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50/50 to-purple-50/30">
                  {chatMessages[selectedChatRoom.id]?.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-5 py-3 rounded-2xl shadow-md ${
                        message.isOwn
                          ? 'bg-gradient-to-r from-purple-600 to-rose-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}>
                        {!message.isOwn && (
                          <div className="flex items-center mb-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-rose-400 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                              {message.sender.charAt(0)}
                            </div>
                            <p className="text-xs font-bold text-purple-600">{message.sender}</p>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed">{message.message}</p>
                        <p className={`text-xs mt-2 ${
                          message.isOwn ? 'text-purple-200' : 'text-gray-500'
                        }`}>
                          {formatChatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Online Members Indicator */}
                  <div className="text-center py-2">
                    <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                      💬 {selectedChatRoom.members} members are actively chatting
                    </span>
                  </div>
                </div>

                {/* Enhanced Message Input */}
                <div className="bg-gradient-to-r from-purple-50 to-rose-50 border-t border-purple-100 p-6">
                  <div className="flex items-center space-x-4">
                    <button className="p-3 hover:bg-white/50 rounded-full transition-colors">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                        placeholder={`Share your thoughts in ${selectedChatRoom.name}...`}
                        className="w-full px-6 py-4 bg-white border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm text-sm"
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                        Press Enter ↵
                      </div>
                    </div>
                    <button
                      onClick={sendChatMessage}
                      disabled={!newMessage.trim()}
                      className="p-4 bg-gradient-to-r from-purple-600 to-rose-500 text-white rounded-2xl hover:from-purple-700 hover:to-rose-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-300 shadow-lg disabled:shadow-none"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-center mt-2">
                    <span className="text-xs text-gray-500">
                      Be respectful and enjoy meaningful conversations! 💖
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Enhanced No Chat Room Selected */
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-purple-50/50 to-rose-50/50">
                <div className="text-center max-w-lg px-8">
                  <div className="mb-8">
                    <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-rose-500 rounded-3xl flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-2xl">
                      💬
                    </div>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent mb-4">
                      Welcome to Premium Chat Rooms!
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed mb-6">
                      Select a chat room from the sidebar to start connecting with fellow NextChapter premium members. 
                      Share experiences, build friendships, and discover meaningful relationships.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100">
                    <div className="flex items-center justify-center mb-4">
                      <span className="text-2xl mr-2">👑</span>
                      <span className="text-purple-800 font-bold">Premium Feature</span>
                    </div>
                    <p className="text-purple-700 text-sm">
                      Chat rooms are exclusively available to premium subscribers. Connect, share experiences, 
                      and build meaningful relationships in our curated community spaces.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-center space-x-4">
                    <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-rose-500 text-white rounded-xl font-medium hover:from-purple-700 hover:to-rose-600 transition-all duration-300 shadow-lg">
                      Choose a Room →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
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
                <p className="text-rose-200 text-4xl font-bold mb-4">10,000 MWK</p>
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
                <p className="text-green-200 text-4xl font-bold mb-4">15,000 MWK</p>
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
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength="6"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={resetData.newPassword}
                      onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={resetData.confirmPassword}
                      onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Create a secure password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  )}
                </button>
              </div>
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
                <p className="text-4xl font-bold text-rose-600 mb-2">10,000 MWK</p>
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
                <p className="text-4xl font-bold text-green-600 mb-2">15,000 MWK</p>
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
                  onClick={() => initiatePaychanguPayment('monthly')}
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
              USD pricing available: Daily $1.35 • Weekly $5.36 • Monthly $8.05
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Automatically applied based on your location
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Paychangu Payment Page
  if (currentView === 'paychangu-payment') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cream-50 to-rose-50">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-rose-500 bg-clip-text text-transparent">
                NextChapter Payment
              </h1>
              <button
                onClick={() => setCurrentView('subscription')}
                className="text-gray-600 hover:text-purple-600 font-medium"
              >
                ← Back to Plans
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Complete Your Payment
              </h2>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-purple-800 font-semibold">
                  {paymentData.subscriptionType?.charAt(0).toUpperCase() + paymentData.subscriptionType?.slice(1)} Subscription
                </p>
                <p className="text-2xl font-bold text-purple-600">MWK {paymentData.amount?.toLocaleString()}</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Payment Method Selection */}
            {paymentStep === 'method' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Choose Payment Method</h3>
                
                <div className="grid gap-4">
                  <button
                    onClick={() => {
                      setPaymentMethod('mobile_money');
                      setPaymentStep('details');
                    }}
                    className="p-6 border border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                          <span className="text-green-600 text-2xl">📱</span>
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-800">Mobile Money</h4>
                          <p className="text-sm text-gray-600">TNM Mpamba • Airtel Money</p>
                        </div>
                      </div>
                      <span className="text-purple-600">→</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentMethod('card');
                      setPaymentStep('details');
                    }}
                    className="p-6 border border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                          <span className="text-blue-600 text-2xl">💳</span>
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-800">Debit/Credit Card</h4>
                          <p className="text-sm text-gray-600">Visa • Mastercard</p>
                        </div>
                      </div>
                      <span className="text-purple-600">→</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Payment Details Form */}
            {paymentStep === 'details' && (
              <div className="space-y-6">
                <div className="flex items-center mb-4">
                  <button
                    onClick={() => setPaymentStep('method')}
                    className="text-purple-600 hover:text-purple-800 mr-3"
                  >
                    ←
                  </button>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {paymentMethod === 'mobile_money' ? 'Mobile Money Details' : 'Card Details'}
                  </h3>
                </div>

                {paymentMethod === 'mobile_money' && (
                  <form onSubmit={(e) => { e.preventDefault(); processPaychanguPayment(); }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Network
                      </label>
                      <select
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={paymentData.operator}
                        onChange={(e) => setPaymentData({ ...paymentData, operator: e.target.value })}
                      >
                        <option value="">Select Network</option>
                        <option value="TNM">TNM Mpamba</option>
                        <option value="AIRTEL">Airtel Money</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +265888123456"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={paymentData.phoneNumber}
                        onChange={(e) => setPaymentData({ ...paymentData, phoneNumber: e.target.value })}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your mobile money registered number
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg ${
                        loading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                      }`}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processing Payment...
                        </div>
                      ) : (
                        `Pay MWK ${paymentData.amount?.toLocaleString()}`
                      )}
                    </button>
                  </form>
                )}

                {paymentMethod === 'card' && (
                  <form onSubmit={(e) => { e.preventDefault(); processPaychanguPayment(); }} className="space-y-4">
                    <p className="text-center text-gray-600 mb-4">
                      You will be redirected to complete your card payment securely
                    </p>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg ${
                        loading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                      }`}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        `Pay MWK ${paymentData.amount?.toLocaleString()} with Card`
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Processing Status */}
            {paymentStep === 'processing' && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
                
                {/* Payment Timeout Display */}
                {paymentTimedOut ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="text-6xl mb-4">⏰</div>
                    <h3 className="text-xl font-semibold text-red-800 mb-2">Payment Timeout</h3>
                    <p className="text-red-600 mb-4">
                      Your payment took longer than expected (3 minutes 30 seconds). However, our payment verification system continues to monitor your transaction even after timeout.
                    </p>
                    <div className="text-left text-red-600 text-sm mb-4">
                      <p className="font-medium mb-2">This timeout could be due to:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Network connectivity issues</li>
                        <li>Payment method declined or unavailable</li>
                        <li>Mobile money service temporary issues</li>
                        <li>Insufficient funds or payment limits</li>
                      </ul>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-blue-800 text-sm">
                        <strong>💡 Good to know:</strong> If your payment was successful, you'll automatically receive a subscription confirmation email and be redirected to your dashboard.
                      </p>
                    </div>
                    <p className="text-red-600 mb-4">
                      Please check your subscription status in your dashboard or try again with a different payment method.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setCurrentView('dashboard')}
                        className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                      >
                        Go to Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setPaymentStep('method');
                          setPaymentTimedOut(false);
                          setPaymentTimeoutTimer(0);
                        }}
                        className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Processing Payment</h3>
                    <p className="text-gray-600">
                      {paymentMethod === 'mobile_money' 
                        ? 'Please complete the payment on your mobile device'
                        : 'Please complete the payment in the opened window'
                      }
                    </p>
                    <p className="text-sm text-purple-600 mt-2">
                      We'll automatically detect and verify when payment is complete
                    </p>
                    
                    {/* Payment Verification Status */}
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center text-sm text-blue-800">
                        <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                        <span>Payment verification system active</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Double-checking payment status and subscription activation
                      </p>
                    </div>
                    
                    {/* Countdown Timer */}
                    {paymentTimeoutTimer > 0 && (
                      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-700 mb-2">Payment will timeout in:</p>
                        <div className="text-2xl font-mono font-bold text-purple-800">
                          {formatTimer(paymentTimeoutTimer)}
                        </div>
                        <div className="w-full bg-purple-200 rounded-full h-2 mt-3">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${(paymentTimeoutTimer / 210) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-purple-600 mt-2">
                          Payment verification continues even if timeout occurs
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {!paymentTimedOut && (
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Continue to Dashboard
                  </button>
                )}
              </div>
            )}
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
        {/* Match Notification */}
        <MatchNotification />
        
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

        {/* Notification Component */}
        {showNotification && subscriptionNotification && (
          <div className={`fixed top-20 right-4 z-50 max-w-sm w-full transition-all duration-300 transform ${
            showNotification ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}>
            <div className={`p-4 rounded-lg shadow-lg border-l-4 ${
              subscriptionNotification.type === 'success' 
                ? 'bg-green-50 border-green-500 text-green-800' 
                : 'bg-red-50 border-red-500 text-red-800'
            }`}>
              <div className="flex items-start">
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{subscriptionNotification.title}</h4>
                  <p className="text-sm">{subscriptionNotification.message}</p>
                </div>
                <button
                  onClick={() => setShowNotification(false)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Status Banner */}
        {userSubscription && userSubscription.subscription_tier === 'premium' && userSubscription.subscription_status === 'active' && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">💎</span>
                  <div>
                    <span className="font-semibold">
                      {getSubscriptionDisplayName(userSubscription)} Premium Active
                    </span>
                    {userSubscription.subscription_expires && (
                      <span className="ml-2 text-green-100 text-sm">
                        • Expires {new Date(userSubscription.subscription_expires).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm bg-green-400 bg-opacity-30 px-2 py-1 rounded-full">
                    ✓ All Features Unlocked
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Free User Upgrade Banner */}
        {(!userSubscription || userSubscription.subscription_tier === 'free' || userSubscription.subscription_status !== 'active') && (
          <div className="bg-gradient-to-r from-purple-600 to-rose-500 text-white py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">⭐</span>
                  <div>
                    <span className="font-semibold">Free Account</span>
                    <span className="ml-2 text-purple-100 text-sm">
                      • Upgrade to unlock premium features
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('subscription')}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        )}

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

                {/* Subscription Status Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                    💎 Subscription Status
                  </h3>
                  {userSubscription && userSubscription.subscription_tier === 'premium' && userSubscription.subscription_status === 'active' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-green-600 font-medium">✓ Premium Active</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getSubscriptionStatusColor(userSubscription) === 'green' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getSubscriptionDisplayName(userSubscription)}
                        </span>
                      </div>
                      {userSubscription.subscription_expires && (
                        <div className="text-sm text-gray-600">
                          <span>Expires: </span>
                          <span className="font-medium">
                            {new Date(userSubscription.subscription_expires).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 text-sm text-green-700">
                          <span>✓</span>
                          <span>Unlimited likes & matches</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-green-700">
                          <span>✓</span>
                          <span>Exclusive chat rooms</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-green-700">
                          <span>✓</span>
                          <span>See who liked you</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 font-medium">Free Account</span>
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
                          Basic
                        </span>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="text-sm text-purple-700 mb-2">
                          <strong>Upgrade to Premium:</strong>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-purple-600">
                          <span>•</span>
                          <span>Unlimited connections</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-purple-600">
                          <span>•</span>
                          <span>Exclusive chat access</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-purple-600">
                          <span>•</span>
                          <span>Advanced matching</span>
                        </div>
                        <button
                          onClick={() => setCurrentView('subscription')}
                          className="w-full mt-3 bg-gradient-to-r from-purple-600 to-rose-500 text-white py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-rose-600 transition-all"
                        >
                          Upgrade Now
                        </button>
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