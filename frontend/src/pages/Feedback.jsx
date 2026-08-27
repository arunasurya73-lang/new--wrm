import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Star, CheckCircle, AlertCircle, RefreshCw, Send, Users, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

function Feedback() {
  console.log("Feedback page loaded");

  const [pageError, setPageError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    user_type: '',
    location: '',
    rating: 0,
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // List of all responses for stats and recent reviews
  const [allFeedback, setAllFeedback] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);

  const userTypes = [
    { value: 'Worker', label: 'Worker / Daily Commuter' },
    { value: 'Parent', label: 'Parent / Guardian' },
    { value: 'Hospital', label: 'Hospital / Healthcare' },
    { value: 'Farmer', label: 'Farmer' },
    { value: 'Researcher', label: 'Researcher / Student' },
    { value: 'Other', label: 'Other' }
  ];

  const locations = [
    'Rohini',
    'Connaught Place',
    'Noida',
    'Gurgaon',
    'Faridabad',
    'Dwarka',
    'Anand Vihar',
    'Other'
  ];

  const ratingLabels = {
    1: "Not useful",
    2: "Slightly useful",
    3: "Somewhat useful",
    4: "Very useful",
    5: "Extremely useful"
  };

  const fetchAllFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const res = await api.get('/api/feedback/all');
      setAllFeedback(res.data);
    } catch (err) {
      console.error("Error fetching feedback entries:", err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  useEffect(() => {
    fetchAllFeedback();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name cannot be empty";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.user_type) {
      newErrors.user_type = "Please select your profile type";
    }
    if (!formData.location) {
      newErrors.location = "Please select your location";
    }
    if (formData.rating === 0) {
      newErrors.rating = "Please select a rating (at least 1 star)";
    }
    if (formData.message.trim().length < 20) {
      newErrors.message = "Message must be at least 20 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.post('/api/feedback', {
        name: formData.name,
        email: formData.email,
        user_type: formData.user_type,
        rating: formData.rating,
        message: formData.message,
        location: formData.location
      });
      setSubmitSuccess(true);
      fetchAllFeedback(); // Refresh stats and list
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      user_type: '',
      location: '',
      rating: 0,
      message: ''
    });
    setErrors({});
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  // Helper: Get first name only for privacy
  const getFirstName = (name) => {
    if (!name) return "Anonymous";
    return name.split(' ')[0];
  };

  // Helper: Calculate time ago
  const timeAgo = (dateString) => {
    try {
      // Backend returns UTC timezone
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} mins ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      return `${diffDays} days ago`;
    } catch {
      return "recently";
    }
  };

  // Calculate live stats
  const totalResponses = allFeedback.length;
  const avgRating = totalResponses > 0 
    ? (allFeedback.reduce((acc, curr) => acc + curr.rating, 0) / totalResponses).toFixed(1)
    : "0.0";

  // Find most common user type
  const getMostCommonUserType = () => {
    if (totalResponses === 0) return "N/A";
    const counts = {};
    allFeedback.forEach(f => {
      counts[f.user_type] = (counts[f.user_type] || 0) + 1;
    });
    let maxType = "N/A";
    let maxCount = 0;
    Object.keys(counts).forEach(type => {
      if (counts[type] > maxCount) {
        maxCount = counts[type];
        maxType = type;
      }
    });
    return maxType;
  };
  const mostCommonUserType = getMostCommonUserType();

  // Rating distribution data for Recharts
  const ratingDistribution = [1, 2, 3, 4, 5].map(stars => {
    const count = allFeedback.filter(f => f.rating === stars).length;
    return {
      stars: `${stars} ★`,
      count: count
    };
  });

  // Get color for user type badge
  const getUserBadgeColor = (type) => {
    switch (type) {
      case 'Worker': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Parent': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Hospital': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'Farmer': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'Researcher': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  if (pageError) return (
    <div style={{ color: 'white', padding: '40px', fontFamily: 'monospace' }}>
      <strong>Error:</strong> {pageError}
    </div>
  );

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-4xl mx-auto">
      {/* Section 1 - Page Header */}
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Share Your Experience</h1>
        <p className="text-xs text-textSecondary mt-1">
          Help us improve AirSense Delhi. Your feedback directly shapes how we serve people affected by Delhi's air pollution crisis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Section 2 - Feedback Form Card */}
        <div className="md:col-span-2 bg-cardBg border border-gray-850 rounded-card shadow-cardShadow p-6">
          {submitSuccess ? (
            /* Success State */
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 animate-scaleUp">
              <CheckCircle className="h-16 w-16 text-green-500 animate-bounce" />
              <h2 className="text-xl font-bold text-white">Thank you for your feedback!</h2>
              <p className="text-sm text-textSecondary max-w-sm leading-relaxed">
                You are helping make Delhi's air crisis more manageable for everyone.
              </p>
              <button
                onClick={handleReset}
                className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Submit Another Response
              </button>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field 1: Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-450 uppercase mb-1.5">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    className={`w-full bg-[#0a0f1e] border ${errors.name ? 'border-red-500' : 'border-gray-800'} rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500`}
                  />
                  {errors.name && <span className="text-[10px] text-red-500 block mt-1">{errors.name}</span>}
                </div>

                {/* Field 2: Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-450 uppercase mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className={`w-full bg-[#0a0f1e] border ${errors.email ? 'border-red-500' : 'border-gray-800'} rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500`}
                  />
                  {errors.email && <span className="text-[10px] text-red-500 block mt-1">{errors.email}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field 3: I am a... */}
                <div>
                  <label className="block text-xs font-bold text-gray-450 uppercase mb-1.5">I am a...</label>
                  <select
                    value={formData.user_type}
                    onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                    className={`w-full bg-[#0a0f1e] border ${errors.user_type ? 'border-red-500' : 'border-gray-800'} rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer`}
                  >
                    <option value="" disabled>Select your profile</option>
                    {userTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  {errors.user_type && <span className="text-[10px] text-red-500 block mt-1">{errors.user_type}</span>}
                </div>

                {/* Field 4: Location */}
                <div>
                  <label className="block text-xs font-bold text-gray-450 uppercase mb-1.5">My Location in Delhi NCR</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className={`w-full bg-[#0a0f1e] border ${errors.location ? 'border-red-500' : 'border-gray-800'} rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer`}
                  >
                    <option value="" disabled>Select area</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  {errors.location && <span className="text-[10px] text-red-500 block mt-1">{errors.location}</span>}
                </div>
              </div>

              {/* Field 5: Rating */}
              <div>
                <label className="block text-xs font-bold text-gray-450 uppercase mb-1.5">How useful was AirSense Delhi?</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="focus:outline-none transform hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          star <= formData.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-700'
                        }`}
                      />
                    </button>
                  ))}
                  {formData.rating > 0 && (
                    <span className="text-xs font-semibold text-yellow-500 ml-2">
                      {ratingLabels[formData.rating]}
                    </span>
                  )}
                </div>
                {errors.rating && <span className="text-[10px] text-red-500 block mt-1">{errors.rating}</span>}
              </div>

              {/* Field 6: Message */}
              <div>
                <label className="block text-xs font-bold text-gray-450 uppercase mb-1.5">Your Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us what helped you, what was missing, or how the forecast affected your decisions today..."
                  rows={4}
                  className={`w-full bg-[#0a0f1e] border ${errors.message ? 'border-red-500' : 'border-gray-800'} rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 min-h-[120px]`}
                />
                {errors.message && <span className="text-[10px] text-red-500 block mt-1">{errors.message}</span>}
              </div>

              {/* Error State */}
              {submitError && (
                <div className="flex items-center space-x-2 bg-red-950/20 border border-red-900/40 p-3 rounded-lg text-red-400 text-xs">
                  <AlertCircle className="h-4 w-4" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-850 disabled:text-textSecondary text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Submitting feedback...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Column 2: Stats Cards */}
        <div className="flex flex-col space-y-6">
          {/* Section 3 — Live Feedback Stats Card */}
          <div className="bg-cardBg border border-gray-850 rounded-card shadow-cardShadow p-5 flex flex-col justify-between">
            <div className="border-b border-gray-800 pb-3 mb-4 flex items-center space-x-2 text-white">
              <Users className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold">Live Feedback Stats</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0c1222] border border-gray-850 p-3 rounded-lg text-center">
                  <span className="text-xl font-bold font-mono text-white block">
                    {loadingFeedback ? "..." : totalResponses}
                  </span>
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Total Feedback</span>
                </div>
                <div className="bg-[#0c1222] border border-gray-850 p-3 rounded-lg text-center">
                  <span className="text-xl font-bold font-mono text-yellow-500 block flex items-center justify-center">
                    {loadingFeedback ? "..." : avgRating} <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 ml-1" />
                  </span>
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Average Rating</span>
                </div>
              </div>

              <div className="bg-[#0c1222] border border-gray-850 p-3 rounded-lg flex items-center justify-between">
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Top User Group</span>
                <span className="text-xs font-semibold text-white bg-blue-600/10 border border-blue-600/20 px-2 py-0.5 rounded">
                  {loadingFeedback ? "..." : mostCommonUserType}
                </span>
              </div>

              {/* Recharts Rating Distribution */}
              <div className="pt-2">
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider block mb-2">Rating Distribution</span>
                <div className="h-[120px] font-mono text-[9px]">
                  {loadingFeedback ? (
                    <div className="flex items-center justify-center h-full text-gray-600">Loading distribution...</div>
                  ) : totalResponses === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-600">No data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ratingDistribution} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="stars" type="category" stroke="#6b7280" tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', color: '#fff', fontSize: 10 }}
                          cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                        />
                        <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                          {ratingDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={formData.rating === index + 1 ? '#eab308' : '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4 — Recent Feedback Card */}
      <div className="bg-cardBg border border-gray-850 rounded-card shadow-cardShadow p-6">
        <div className="border-b border-gray-850 pb-3 mb-5 flex items-center space-x-2 text-white">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold">Community Logs</h3>
        </div>

        {loadingFeedback ? (
          <div className="flex justify-center py-6 text-textSecondary text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading recent reviews...
          </div>
        ) : allFeedback.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500 font-medium">
            No feedback entries logged yet. Be the first to share your experience!
          </div>
        ) : (
          <div className="space-y-4">
            {allFeedback.slice(0, 5).map((feedback) => (
              <div key={feedback.id} className="bg-[#0c1222] border border-gray-850 p-4 rounded-lg flex flex-col space-y-2.5 hover:border-gray-700 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold text-white">{getFirstName(feedback.name)}</span>
                    <span className={`text-[9px] font-semibold border px-1.5 py-0.5 rounded-full ${getUserBadgeColor(feedback.user_type)}`}>
                      {feedback.user_type}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">({feedback.location})</span>
                  </div>
                  <div className="flex items-center text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < feedback.rating ? 'fill-yellow-500' : 'text-gray-850'}`} />
                    ))}
                    <span className="text-[9px] text-gray-500 ml-2 font-mono">{timeAgo(feedback.submitted_at)}</span>
                  </div>
                </div>
                <p className="text-xs text-textSecondary italic leading-relaxed">
                  "{feedback.message.length > 100 ? `${feedback.message.substring(0, 100)}...` : feedback.message}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Feedback;
