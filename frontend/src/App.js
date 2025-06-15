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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    location: '',
    bio: '',
    interests: [],
    lookingFor: '',
    mainPhoto: null,
    additionalPhotos: []
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile();
    }
  }, []);

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
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: authMode === 'register' ? formData.name : undefined,
          age: authMode === 'register' ? parseInt(formData.age) : undefined
        }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        if (authMode === 'register') {
          setCurrentView('profile-setup');
        } else {
          setCurrentView('dashboard');
        }
      } else {
        alert(data.detail || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Network error occurred');
    }
  };

  const handleProfileSetup = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    
    Object.keys(formData).forEach(key => {
      if (key === 'interests') {
        formDataToSend.append(key, JSON.stringify(formData[key]));
      } else if (key === 'mainPhoto' && formData[key]) {
        formDataToSend.append('mainPhoto', formData[key]);
      } else if (key === 'additionalPhotos' && formData[key].length > 0) {
        formData[key].forEach((photo, index) => {
          formDataToSend.append(`additionalPhoto_${index}`, photo);
        });
      } else if (formData[key]) {
        formDataToSend.append(key, formData[key]);
      }
    });

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
        setUser(userData);
        setCurrentView('dashboard');
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
                  A meaningful dating community for those ready to write their next chapter. 
                  Whether you're a widow, divorced, or starting your dating journey later in life - you belong here.
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

  // Auth Page
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
                    min="35"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Your age (35+)"
                  />
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

  // Profile Setup Page
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Main Profile Photo</label>
              <input
                type="file"
                accept="image/*"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onChange={(e) => handleFileChange(e, 'mainPhoto')}
              />
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

  // Dashboard/Main App
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
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Hello, {user?.name}</span>
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
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Your Next Chapter</h2>
              <p className="text-xl text-gray-600 mb-8">Ready to meet someone special?</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Browse Profiles</h3>
                <p className="text-gray-600 mb-4">Discover amazing people in your area</p>
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
                <p className="text-gray-600 mb-4">See who's interested in getting to know you</p>
                <button
                  onClick={fetchMatches}
                  className="bg-gradient-to-r from-rose-500 to-purple-600 text-white px-6 py-2 rounded-full hover:from-rose-600 hover:to-purple-700 transition-all duration-300"
                >
                  View Matches
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✨</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Complete Profile</h3>
                <p className="text-gray-600 mb-4">Make your profile shine</p>
                <button
                  onClick={() => setCurrentView('profile-setup')}
                  className="bg-gradient-to-r from-purple-600 to-rose-500 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Browse Profiles View */}
        {currentView === 'browse' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Discover Amazing People</h2>
              <p className="text-xl text-gray-600">Each profile represents a unique story and journey</p>
            </div>

            {profiles.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No more profiles to show</h3>
                <p className="text-gray-600 mb-6">Check back later for new members</p>
                <button
                  onClick={fetchProfiles}
                  className="bg-gradient-to-r from-purple-600 to-rose-500 text-white px-6 py-3 rounded-full hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {profiles.map((profile) => (
                  <div key={profile.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="h-64 bg-gradient-to-br from-purple-100 to-rose-100 flex items-center justify-center">
                      {profile.main_photo ? (
                        <img 
                          src={profile.main_photo} 
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-6xl">👤</div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">{profile.name}, {profile.age}</h3>
                      <p className="text-gray-600 mb-2">📍 {profile.location}</p>
                      <p className="text-gray-700 mb-4 line-clamp-3">{profile.bio}</p>
                      <p className="text-sm text-purple-600 mb-4">Looking for: {profile.looking_for}</p>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleLike(profile.id)}
                          className="flex-1 bg-gradient-to-r from-rose-500 to-purple-600 text-white py-3 rounded-full hover:from-rose-600 hover:to-purple-700 transition-all duration-300 font-semibold"
                        >
                          💕 Like
                        </button>
                        <button
                          onClick={() => setProfiles(profiles.filter(p => p.id !== profile.id))}
                          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-full hover:bg-gray-300 transition-all duration-300 font-semibold"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Matches View */}
        {currentView === 'matches' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Your Matches</h2>
              <p className="text-xl text-gray-600">Congratulations! These people are interested in getting to know you</p>
            </div>

            {matches.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💕</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No matches yet</h3>
                <p className="text-gray-600 mb-6">Keep browsing to find your perfect match</p>
                <button
                  onClick={fetchProfiles}
                  className="bg-gradient-to-r from-purple-600 to-rose-500 text-white px-6 py-3 rounded-full hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
                >
                  Browse Profiles
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {matches.map((match) => (
                  <div key={match.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="h-64 bg-gradient-to-br from-purple-100 to-rose-100 flex items-center justify-center">
                      {match.main_photo ? (
                        <img 
                          src={match.main_photo} 
                          alt={match.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-6xl">👤</div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">{match.name}, {match.age}</h3>
                      <p className="text-gray-600 mb-2">📍 {match.location}</p>
                      <p className="text-gray-700 mb-4 line-clamp-3">{match.bio}</p>
                      
                      <button
                        onClick={() => {
                          setSelectedMatch(match);
                          fetchMessages(match.id);
                          setCurrentView('chat');
                        }}
                        className="w-full bg-gradient-to-r from-purple-600 to-rose-500 text-white py-3 rounded-full hover:from-purple-700 hover:to-rose-600 transition-all duration-300 font-semibold"
                      >
                        💬 Start Conversation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat View */}
        {currentView === 'chat' && selectedMatch && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-96">
              <div className="bg-gradient-to-r from-purple-600 to-rose-500 text-white p-4 flex items-center">
                <button
                  onClick={() => setCurrentView('matches')}
                  className="mr-4 hover:bg-white/20 p-2 rounded-full"
                >
                  ←
                </button>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <span className="text-lg">👤</span>
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedMatch.name}</h3>
                    <p className="text-purple-100 text-sm">Online</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 h-64 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>Start your conversation with {selectedMatch.name}!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-2xl ${
                            message.sender_id === user.id
                              ? 'bg-gradient-to-r from-purple-600 to-rose-500 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.target.elements.message;
                    if (input.value.trim()) {
                      sendMessage(selectedMatch.id, input.value.trim());
                      input.value = '';
                    }
                  }}
                  className="flex space-x-3"
                >
                  <input
                    name="message"
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-rose-500 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-rose-600 transition-all duration-300"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;