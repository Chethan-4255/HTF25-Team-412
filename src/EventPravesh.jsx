import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'react-qr-code';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  User,
  LogOut,
  Plus,
  Ticket,
  CheckCircle,
  XCircle,
  Upload,
  Users,
  Shield,
  Loader,
  Menu,
  X,
  ChevronDown,
  AlertCircle,
  Wallet,
} from 'lucide-react';
// Removed Web3 imports - using internal key generation instead

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Blockchain functionality is handled by Supabase Edge Functions

const Logo = () => (
  <img src="/logo.png" alt="EventPravesh Logo" width="32" height="32" className="rounded-md" />
);

const api = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signup(name, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getEvents(query = '', location = '') {
    let queryBuilder = supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (query) {
      queryBuilder = queryBuilder.ilike('title', `%${query}%`);
    }
    if (location) {
      queryBuilder = queryBuilder.ilike('location', `%${location}%`);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },

  async getEventById(id) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getHostEvents(hostId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('host_id', hostId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getUserTickets(userId) {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        events (
          id,
          title,
          date,
          location,
          card_image_url
        )
      `)
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createEvent(eventData, bannerFile, cardFile, additionalFiles, userId) {
    const timestamp = Date.now();
    const bannerPath = `banners/${timestamp}_${bannerFile.name}`;
    const cardPath = `cards/${timestamp}_${cardFile.name}`;

    // Upload banner image
    const { error: bannerError } = await supabase.storage
      .from('event-images')
      .upload(bannerPath, bannerFile);
    if (bannerError) throw bannerError;

    // Upload card image
    const { error: cardError } = await supabase.storage
      .from('event-images')
      .upload(cardPath, cardFile);
    if (cardError) throw cardError;

    // Upload additional images if any
    const additionalImageUrls = [];
    if (additionalFiles && additionalFiles.length > 0) {
      for (let i = 0; i < additionalFiles.length; i++) {
        const file = additionalFiles[i];
        const additionalPath = `additional/${timestamp}_${i}_${file.name}`;
        const { error: additionalError } = await supabase.storage
          .from('event-images')
          .upload(additionalPath, file);
        if (additionalError) throw additionalError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(additionalPath);
        additionalImageUrls.push(publicUrl);
      }
    }

    const { data: { publicUrl: bannerUrl } } = supabase.storage
      .from('event-images')
      .getPublicUrl(bannerPath);

    const { data: { publicUrl: cardUrl } } = supabase.storage
      .from('event-images')
      .getPublicUrl(cardPath);

    const slug = eventData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + timestamp;

    const { data, error } = await supabase
      .from('events')
      .insert([{
        ...eventData,
        banner_url: bannerUrl,
        card_image_url: cardUrl,
        additional_images: additionalImageUrls,
        page_slug: slug,
        host_id: userId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEvent(eventId, eventData, bannerFile, cardFile, additionalFiles) {
    const timestamp = Date.now();
    let bannerUrl = eventData.banner_url;
    let cardUrl = eventData.card_image_url;
    let additionalImageUrls = eventData.additional_images || [];

    // Upload new banner image if provided
    if (bannerFile) {
      const bannerPath = `banners/${timestamp}_${bannerFile.name}`;
      const { error: bannerError } = await supabase.storage
        .from('event-images')
        .upload(bannerPath, bannerFile);
      if (bannerError) throw bannerError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(bannerPath);
      bannerUrl = publicUrl;
    }

    // Upload new card image if provided
    if (cardFile) {
      const cardPath = `cards/${timestamp}_${cardFile.name}`;
      const { error: cardError } = await supabase.storage
        .from('event-images')
        .upload(cardPath, cardFile);
      if (cardError) throw cardError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(cardPath);
      cardUrl = publicUrl;
    }

    // Upload additional images if provided
    if (additionalFiles && additionalFiles.length > 0) {
      for (let i = 0; i < additionalFiles.length; i++) {
        const file = additionalFiles[i];
        const additionalPath = `additional/${timestamp}_${i}_${file.name}`;
        const { error: additionalError } = await supabase.storage
          .from('event-images')
          .upload(additionalPath, file);
        if (additionalError) throw additionalError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(additionalPath);
        additionalImageUrls.push(publicUrl);
      }
    }

    // Prepare update data with only the fields that exist
    const updateData = {
      title: eventData.title,
      description: eventData.description,
      date: eventData.date,
      location: eventData.location,
      banner_url: bannerUrl,
      card_image_url: cardUrl
    };

    // Only add new fields if they have values (for backward compatibility)
    if (eventData.event_type) updateData.event_type = eventData.event_type;
    if (eventData.total_seats !== null && eventData.total_seats !== undefined) updateData.total_seats = eventData.total_seats;
    if (eventData.is_free !== null && eventData.is_free !== undefined) updateData.is_free = eventData.is_free;
    if (eventData.ticket_price !== null && eventData.ticket_price !== undefined) updateData.ticket_price = eventData.ticket_price;
    if (eventData.contact_email) updateData.contact_email = eventData.contact_email;
    if (eventData.contact_mobile) updateData.contact_mobile = eventData.contact_mobile;
    if (eventData.venue_link) updateData.venue_link = eventData.venue_link;
    if (additionalImageUrls.length > 0) updateData.additional_images = additionalImageUrls;
    if (eventData.ticket_types) updateData.ticket_types = eventData.ticket_types;

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async buyTicket(eventId, userId) {
    const { data, error } = await supabase.functions.invoke('buy-ticket', {
      body: { eventId, userId, timestamp: Date.now() }
    });
    if (error) throw error;
    return data;
  },

  async getTicketQrData(ticketId) {
    const { data, error } = await supabase.functions.invoke('get-qr-data', {
      body: { ticketId }
    });
    if (error) throw error;
    return JSON.stringify(data);
  },

  async staffLogin(email, password, eventId) {
    const { data, error } = await supabase.functions.invoke('staff-login', {
      body: { email, password, eventId }
    });
    if (error) throw error;
    return data;
  },

  async createEventStaff(eventId, email, password) {
    try {
      // Try Edge Function first
      const { data, error } = await supabase.functions.invoke('create-staff', {
        body: { eventId, email, password }
      });
      if (error) throw error;
      return data;
    } catch (edgeFunctionError) {
      console.log('Edge Function failed, using direct database method:', edgeFunctionError);
      
      // Fallback: Create staff directly in database
      const passwordHash = btoa(password);
      const { data, error } = await supabase
        .from('event_staff')
        .insert([{
          event_id: eventId,
          email: email,
          password_hash: passwordHash
        }])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, staff: { id: data.id, email: data.email } };
    }
  },

  async verifyTicket(qrDataString, staffEventId) {
    const { data, error } = await supabase.functions.invoke('verify-ticket', {
      body: { qrDataString, staffEventId }
    });
    if (error) throw error;
    
    // Check if the response indicates failure
    if (data && data.success === false) {
      throw new Error(data.message || 'Verification failed');
    }
    
    return data;
  },

  async getEventStaff(eventId) {
    const { data, error } = await supabase
      .from('event_staff')
      .select('id, username, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};

function Header({ user, profile, onNavigate, onLogout }) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-2">
              <Logo />
              <span className="text-xl font-semibold text-gray-900">EventPravesh</span>
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Discover Events
            </button>
            {profile?.is_host && (
              <button
                onClick={() => onNavigate('hostDashboard')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Host Dashboard
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900 font-medium">{profile?.name}</span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{profile?.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      {profile?.wallet_address && (
                        <p className="text-xs text-blue-600 mt-1">
                          <Wallet className="w-3 h-3 inline mr-1" />
                          {profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onNavigate('profile');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate('scanLogin')}
                  className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900 flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Staff Login
                </button>
                <button
                  onClick={() => onNavigate('auth', 'login')}
                  className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900"
                >
                  Log In
                </button>
                <button
                  onClick={() => onNavigate('auth', 'signup')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer({ onNavigate }) {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600 mb-2">
            Built by Team 412 for CBIT Hacktoberfest 2025
          </p>
          <button
            onClick={() => onNavigate('about')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Learn more about our team
          </button>
        </div>
      </div>
    </footer>
  );
}

function HomePage({ onNavigate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getEvents(searchQuery, searchLocation);
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadEvents();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Discover Amazing Events
            </h1>
            <p className="text-xl text-gray-600">
              Blockchain-powered NFT ticketing for the future of events
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Location..."
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No events found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => onNavigate('eventDetail', event.id)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow text-left"
              >
                <div className="aspect-[3/2] relative overflow-hidden bg-gray-100">
                  <img
                    src={event.card_image_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-1">
                      {event.is_free ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                          Free
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                          ₹{event.ticket_price || 0}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        event.event_type === 'online' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {event.event_type === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                  {event.total_seats && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{event.total_seats} seats</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventDetailPage({ eventId, user, onNavigate }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const data = await api.getEventById(eventId);
      setEvent(data);
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleBuyTicket = () => {
    if (!user) {
      onNavigate('auth', 'login');
    } else {
      setShowPayment(true);
    }
  };

  const isHost = user && event && user.id === event.host_id;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Event not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full h-96 relative overflow-hidden bg-gray-100">
        <img
          src={event.banner_url}
          alt={event.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">{event.title}</h1>

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <Calendar className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Date and Time</p>
                    <p className="text-gray-600">{formatDate(event.date)}</p>
                    <p className="text-gray-600">{formatTime(event.date)}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Location</p>
                    <p className="text-gray-600">{event.location}</p>
                    {event.venue_link && (
                      <a
                        href={event.venue_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm underline mt-1 inline-block"
                      >
                        View on Map / Venue Website →
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                    <span className="text-xs font-bold text-blue-600">
                      {event.event_type === 'online' ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Event Type</p>
                    <p className="text-gray-600 capitalize">{event.event_type} Event</p>
                  </div>
                </div>

                {event.total_seats && (
                  <div className="flex items-start gap-4">
                    <Users className="w-6 h-6 text-blue-600 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Total Seats</p>
                      <p className="text-gray-600">{event.total_seats} seats available</p>
                    </div>
                  </div>
                )}
              </div>

              {(event.contact_email || event.contact_mobile) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {event.contact_email && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Email:</span>
                        <a href={`mailto:${event.contact_email}`} className="text-blue-600 hover:text-blue-800 text-sm">
                          {event.contact_email}
                        </a>
                      </div>
                    )}
                    {event.contact_mobile && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Mobile:</span>
                        <a href={`tel:${event.contact_mobile}`} className="text-blue-600 hover:text-blue-800 text-sm">
                          {event.contact_mobile}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Event</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
            </div>

            {/* Additional Images */}
            {event.additional_images && event.additional_images.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Gallery</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {event.additional_images.map((imageUrl, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={`Event image ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="mb-6">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Ticket className="w-5 h-5" />
                  <span className="font-semibold">NFT Ticket</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Your ticket will be minted as an NFT on the blockchain
                </p>
                
                {/* Pricing Information */}
                <div className="mb-4">
                  {event.is_free ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-semibold">Free Event</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-blue-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-semibold">Paid Event</span>
                      </div>
                      {event.ticket_types && event.ticket_types.length > 0 ? (
                        <div className="space-y-1">
                          {event.ticket_types.map((type, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">{type.name}</span>
                              <span className="font-semibold text-gray-900">₹{type.price}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          Price: ₹{event.ticket_price || 0}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Ready to mint NFT ticket</span>
                </div>
              </div>

              {isHost ? (
                <div className="text-center py-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm font-medium">
                      You are the host of this event
                    </p>
                    <p className="text-yellow-700 text-xs mt-1">
                      Hosts cannot purchase tickets for their own events
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleBuyTicket}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Buy Ticket
                </button>
              )}

              <p className="text-xs text-gray-500 text-center mt-4">
                Secure blockchain-powered ticketing
              </p>
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          event={event}
          user={user}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            onNavigate('profile');
          }}
        />
      )}
    </div>
  );
}

function PaymentModal({ event, user, onClose, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [success, setSuccess] = useState(false);

  const handleBuyTicket = async () => {
    try {
      setProcessing(true);
      setMinting(true);
      setError('');

      // Call the backend Edge Function which handles wallet generation and NFT minting
      const result = await api.buyTicket(event.id, user.id);
      
      if (result.ticket && result.ticket.transaction_hash) {
        setTransactionHash(result.ticket.transaction_hash);
        setSuccess(true);
        
        // Show success for 3 seconds before closing
        setTimeout(() => {
          onSuccess();
        }, 3000);
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error('Error buying ticket:', error);
      setError(error.message || 'Failed to purchase ticket. Please try again.');
    } finally {
      setProcessing(false);
      setMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Complete Payment</h2>
          <button onClick={onClose} disabled={processing} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900 mb-1">Error</p>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 mb-2">Ticket Purchased Successfully!</p>
            <p className="text-sm text-gray-600 mb-4">Your NFT ticket has been minted on the blockchain</p>
            
            {transactionHash && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-600 mb-2">Transaction Hash:</p>
                <a
                  href={`https://testnet3.explorer.nexus.xyz/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm break-all underline"
                >
                  {transactionHash}
                </a>
                <p className="text-xs text-gray-500 mt-2">Click to view on Nexus Explorer</p>
              </div>
            )}
            
            <p className="text-xs text-gray-500">Redirecting to your profile...</p>
          </div>
        ) : minting ? (
          <div className="text-center py-8">
            <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">Minting your NFT ticket...</p>
            <p className="text-sm text-gray-600 mt-2">Please wait while we create your blockchain ticket</p>
            <p className="text-xs text-gray-500 mt-2">This may take a few moments</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Event</span>
                <span className="font-semibold text-gray-900">{event.title}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Ticket Type</span>
                <span className="font-semibold text-gray-900">NFT Ticket</span>
              </div>
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {event.is_free ? 'Free' : `₹${event.ticket_price || 0}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900 mb-1">Blockchain Powered</p>
                  <p className="text-xs text-green-700">
                    Your ticket will be minted as an NFT on the blockchain, ensuring authenticity and ownership.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleBuyTicket}
              disabled={processing}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Buy NFT Ticket'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AuthPage({ mode, onNavigate, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await api.login(email, password);
      } else {
        await api.signup(name, email, password);
      }
      onAuthSuccess();
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Join EventPravesh today'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ user, profile, onNavigate }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: profile?.name || '',
    age: profile?.age || '',
    mobile: profile?.mobile || '',
    bio: profile?.bio || ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await api.getUserTickets(user.id);
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await api.updateProfile(user.id, editForm);
      setShowEditProfile(false);
      // Reload the page to refresh profile data
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
                <p className="text-gray-600">{user.email}</p>
                {profile?.age && <p className="text-sm text-gray-500">Age: {profile.age}</p>}
                {profile?.mobile && <p className="text-sm text-gray-500">Mobile: {profile.mobile}</p>}
              </div>
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 text-sm font-medium"
            >
              Edit Profile
            </button>
          </div>
          
          {profile?.bio && (
            <div className="mb-4">
              <p className="text-gray-700">{profile.bio}</p>
            </div>
          )}
          
          {profile?.is_host && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              <Shield className="w-4 h-4" />
              Event Host
            </div>
          )}
        </div>

        {showEditProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
                <button 
                  onClick={() => setShowEditProfile(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                    min="1"
                    max="120"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({...editForm, mobile: e.target.value})}
                    placeholder="+919876543210"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    rows={3}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 py-3 text-gray-600 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Tickets</h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">You don't have any tickets yet</p>
              <button
                onClick={() => onNavigate('home')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Discover Events
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[3/2] relative overflow-hidden bg-gray-100">
                    <img
                      src={ticket.events.card_image_url}
                      alt={ticket.events.title}
                      className="w-full h-full object-cover"
                    />
                    {ticket.is_verified && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                    {ticket.is_blockchain_verified && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        NFT
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {ticket.events.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(ticket.events.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">{ticket.events.location}</span>
                    </div>
                    {ticket.is_blockchain_verified && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700 text-sm mb-1">
                          <Wallet className="w-4 h-4" />
                          <span className="font-medium">Blockchain Ticket</span>
                        </div>
                        <p className="text-xs text-blue-600">
                          Token ID: {ticket.token_id}
                        </p>
                        {ticket.transaction_hash && (
                          <a
                            href={`https://testnet3.explorer.nexus.xyz/tx/${ticket.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline truncate block"
                            title="View transaction on Nexus Explorer"
                          >
                            TX: {ticket.transaction_hash.slice(0, 10)}...
                          </a>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                    >
                      View QR Code
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}

function TicketModal({ ticket, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQrData();
  }, []);

  const loadQrData = async () => {
    try {
      setLoading(true);
      const data = await api.getTicketQrData(ticket.id);
      setQrData(data);
    } catch (error) {
      console.error('Error loading QR data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="text-center mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{ticket.events.title}</h3>
          <p className="text-sm text-gray-600">{new Date(ticket.events.date).toLocaleDateString()}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : qrData ? (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex justify-center">
              <QRCode value={qrData} size={256} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Failed to generate QR code
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-700 text-center">
            Show this QR code at the event entrance for verification
          </p>
        </div>
      </div>
    </div>
  );
}

function HostDashboard({ user, profile, onNavigate }) {
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'events') {
      loadEvents();
    }
  }, [activeTab]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getHostEvents(user.id);
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Host Dashboard</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-6 py-4 font-medium border-b-2 ${
                  activeTab === 'events'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                My Events
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-4 font-medium border-b-2 ${
                  activeTab === 'create'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Create Event
              </button>
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'events' ? (
              loading ? (
                <div className="flex justify-center py-12">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">You haven't created any events yet</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    Create Your First Event
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={event.card_image_url}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          <div className="flex items-center gap-1">
                            {event.is_free ? (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                                Free
                              </span>
                            ) : (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                                ₹{event.ticket_price || 0}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              event.event_type === 'online' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {event.event_type === 'online' ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(event.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </span>
                          {event.total_seats && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {event.total_seats} seats
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onNavigate('editEvent', event.id)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onNavigate('manageEvent', event.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <CreateEventForm user={user} onSuccess={() => {
                setActiveTab('events');
                loadEvents();
              }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditEventForm({ eventId, user, onSuccess }) {
  const [event, setEvent] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('offline');
  const [totalSeats, setTotalSeats] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [ticketPrice, setTicketPrice] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [venueLink, setVenueLink] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [cardFile, setCardFile] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([{ name: 'General', price: 0, description: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setInitialLoading(true);
      const eventData = await api.getEventById(eventId);
      setEvent(eventData);
      
      // Populate form with existing data
      setTitle(eventData.title);
      setDescription(eventData.description);
      setDate(eventData.date ? new Date(eventData.date).toISOString().slice(0, 16) : '');
      setLocation(eventData.location);
      setEventType(eventData.event_type || 'offline');
      setTotalSeats(eventData.total_seats || '');
      setIsFree(eventData.is_free !== false);
      setTicketPrice(eventData.ticket_price || '');
      setContactEmail(eventData.contact_email || '');
      setContactMobile(eventData.contact_mobile || '');
      setVenueLink(eventData.venue_link || '');
      setTicketTypes(eventData.ticket_types || [{ name: 'General', price: 0, description: '' }]);
    } catch (error) {
      console.error('Error loading event:', error);
      setError('Failed to load event data');
    } finally {
      setInitialLoading(false);
    }
  };

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { name: '', price: 0, description: '' }]);
  };

  const removeTicketType = (index) => {
    if (ticketTypes.length > 1) {
      setTicketTypes(ticketTypes.filter((_, i) => i !== index));
    }
  };

  const updateTicketType = (index, field, value) => {
    const updated = [...ticketTypes];
    updated[index][field] = value;
    setTicketTypes(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isFree && ticketTypes.some(type => !type.name || type.price <= 0)) {
      setError('Please provide valid ticket types with names and prices');
      return;
    }

    try {
      setLoading(true);
      const eventData = {
        title,
        description,
        date,
        location,
        event_type: eventType,
        total_seats: totalSeats ? parseInt(totalSeats) : null,
        is_free: isFree,
        ticket_price: isFree ? 0 : parseFloat(ticketPrice),
        contact_email: contactEmail,
        contact_mobile: contactMobile,
        venue_link: venueLink,
        ticket_types: ticketTypes,
        banner_url: event.banner_url,
        card_image_url: event.card_image_url,
        additional_images: event.additional_images || []
      };

      await api.updateEvent(
        eventId,
        eventData,
        bannerFile,
        cardFile,
        additionalFiles
      );
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Event not found</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Amazing Tech Conference 2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your event..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date and Time
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="offline">Offline Event</option>
                <option value="online">Online Event</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={eventType === 'online' ? 'Online Platform' : 'City, State'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Seats (Optional)
              </label>
              <input
                type="number"
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value)}
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 100"
              />
            </div>
          </div>

          {eventType === 'offline' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue Link (Optional)
              </label>
              <input
                type="url"
                value={venueLink}
                onChange={(e) => setVenueLink(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://maps.google.com/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Add Google Maps link or venue website for easy navigation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Information */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Tickets</h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={isFree}
                onChange={() => setIsFree(true)}
                className="text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Free Event</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!isFree}
                onChange={() => setIsFree(false)}
                className="text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Paid Event</span>
            </label>
          </div>

          {!isFree && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Ticket Types</h4>
              {ticketTypes.map((type, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type Name</label>
                    <input
                      type="text"
                      value={type.name}
                      onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                      placeholder="e.g., VIP, General"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={type.price}
                      onChange={(e) => updateTicketType(index, 'price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={type.description}
                      onChange={(e) => updateTicketType(index, 'description', e.target.value)}
                      placeholder="e.g., Includes lunch"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    {ticketTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTicketType(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addTicketType}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
              >
                + Add Ticket Type
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contact@yourevent.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Mobile
            </label>
            <input
              type="tel"
              value={contactMobile}
              onChange={(e) => setContactMobile(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+919876543210"
            />
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Images</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Image (Optional - leave empty to keep current)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBannerFile(e.target.files[0])}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended banner size: 1200x400px
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Card Image (Optional - leave empty to keep current)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCardFile(e.target.files[0])}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended card size: 600x400px
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Images (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setAdditionalFiles(Array.from(e.target.files))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload multiple images to showcase your event
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Updating Event...' : 'Update Event'}
      </button>
    </form>
  );
}

function CreateEventForm({ user, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('offline');
  const [totalSeats, setTotalSeats] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [ticketPrice, setTicketPrice] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [venueLink, setVenueLink] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [cardFile, setCardFile] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([{ name: 'General', price: 0, description: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { name: '', price: 0, description: '' }]);
  };

  const removeTicketType = (index) => {
    if (ticketTypes.length > 1) {
      setTicketTypes(ticketTypes.filter((_, i) => i !== index));
    }
  };

  const updateTicketType = (index, field, value) => {
    const updated = [...ticketTypes];
    updated[index][field] = value;
    setTicketTypes(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!bannerFile || !cardFile) {
      setError('Please upload both banner and card images');
      return;
    }

    if (!isFree && ticketTypes.some(type => !type.name || type.price <= 0)) {
      setError('Please provide valid ticket types with names and prices');
      return;
    }

    try {
      setLoading(true);
      const eventData = {
        title,
        description,
        date,
        location,
        event_type: eventType,
        total_seats: totalSeats ? parseInt(totalSeats) : null,
        is_free: isFree,
        ticket_price: isFree ? 0 : parseFloat(ticketPrice),
        contact_email: contactEmail,
        contact_mobile: contactMobile,
        venue_link: venueLink,
        ticket_types: ticketTypes
      };

      await api.createEvent(
        eventData,
        bannerFile,
        cardFile,
        additionalFiles,
        user.id
      );
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Amazing Tech Conference 2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your event..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date and Time
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="offline">Offline Event</option>
                <option value="online">Online Event</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={eventType === 'online' ? 'Online Platform' : 'City, State'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Seats (Optional)
              </label>
              <input
                type="number"
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value)}
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 100"
              />
            </div>
          </div>

          {eventType === 'offline' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue Link (Optional)
              </label>
              <input
                type="url"
                value={venueLink}
                onChange={(e) => setVenueLink(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://maps.google.com/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Add Google Maps link or venue website for easy navigation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Information */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Tickets</h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={isFree}
                onChange={() => setIsFree(true)}
                className="text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Free Event</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!isFree}
                onChange={() => setIsFree(false)}
                className="text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Paid Event</span>
            </label>
          </div>

          {!isFree && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Ticket Types</h4>
              {ticketTypes.map((type, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type Name</label>
                    <input
                      type="text"
                      value={type.name}
                      onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                      placeholder="e.g., VIP, General"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={type.price}
                      onChange={(e) => updateTicketType(index, 'price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={type.description}
                      onChange={(e) => updateTicketType(index, 'description', e.target.value)}
                      placeholder="e.g., Includes lunch"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    {ticketTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTicketType(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addTicketType}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
              >
                + Add Ticket Type
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contact@yourevent.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Mobile
            </label>
            <input
              type="tel"
              value={contactMobile}
              onChange={(e) => setContactMobile(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+919876543210"
            />
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Images</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Image (Required)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBannerFile(e.target.files[0])}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended banner size: 1200x400px
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Card Image (Required)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCardFile(e.target.files[0])}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended card size: 600x400px
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Images (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setAdditionalFiles(Array.from(e.target.files))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload multiple images to showcase your event
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Event...' : 'Create Event'}
      </button>
    </form>
  );
}

function ManageEventPage({ eventId, onNavigate }) {
  const [event, setEvent] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEventAndStaff();
  }, [eventId]);

  const loadEventAndStaff = async () => {
    try {
      setLoading(true);
      const [eventData, staffData] = await Promise.all([
        api.getEventById(eventId),
        api.getEventStaff(eventId)
      ]);
      setEvent(eventData);
      setStaff(staffData);
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setCreating(true);
      await api.createEventStaff(eventId, email, password);
      setEmail('');
      setPassword('');
      await loadEventAndStaff();
    } catch (err) {
      setError(err.message || 'Failed to create staff account');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Event not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate('hostDashboard')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-6 flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">{event.title}</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Manage Staff
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleCreateStaff} className="mb-8 max-w-md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Staff Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="staff@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Staff Account'}
              </button>
            </div>
          </form>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Staff</h3>
            {staff.length === 0 ? (
              <p className="text-gray-500">No staff members yet</p>
            ) : (
              <div className="space-y-2">
                {staff.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{member.username}</p>
                        <p className="text-sm text-gray-500">
                          Created {new Date(member.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffLoginPage({ onNavigate, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const result = await api.staffLogin(email, password, eventId);
      if (result.success) {
        onLoginSuccess(result.staff, eventId);
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Login</h1>
          <p className="text-gray-600">Access event scanner</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event ID
            </label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Event ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="staff@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => onNavigate('home')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

function ScannerPage({ staff, eventId, onNavigate, onLogout }) {
  const [scanning, setScanning] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (scanning) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [scanning]);

  const startScanner = async () => {
    try {
      html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        handleScan,
        (error) => {
          console.log('QR scan error:', error);
        }
      );
    } catch (error) {
      console.error('Error starting scanner:', error);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  };

  const handleScan = async (decodedText) => {
    setScanning(false);
    await stopScanner();

    try {
      const result = await api.verifyTicket(decodedText, eventId);
      setVerificationResult(result);
    } catch (error) {
      // Show the exact error message from the backend
      setVerificationResult({
        success: false,
        message: error.message
      });
    }
  };

  const handleScanNext = () => {
    setVerificationResult(null);
    setScanning(true);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {verificationResult ? (
        <div
          className={`min-h-screen flex flex-col items-center justify-center p-8 ${
            verificationResult.success ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          <div className="text-white text-center">
            {verificationResult.success ? (
              <CheckCircle className="w-32 h-32 mx-auto mb-8" />
            ) : (
              <XCircle className="w-32 h-32 mx-auto mb-8" />
            )}
            <h1 className="text-4xl font-bold mb-4">
              {verificationResult.success ? 'Valid Ticket' : 'Invalid Ticket'}
            </h1>
            <p className="text-2xl mb-8">{verificationResult.message}</p>
            <button
              onClick={handleScanNext}
              className="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold text-lg hover:bg-gray-100"
            >
              Scan Next Ticket
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col">
          <div className="bg-gray-800 p-4 text-white">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold">Ticket Scanner</h1>
                <p className="text-sm text-gray-300">Staff: {staff.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full">
              <div id="qr-reader" ref={scannerRef} className="rounded-xl overflow-hidden" />
              <p className="text-white text-center mt-6 text-lg">
                Position the QR code within the frame
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AboutPage({ onNavigate }) {
  const teamMembers = [
    'Chethan Vasthaw Tippani',
    'Satyam Mishra',
    'Giridhar reddy',
    'Ashish Kumar',
    'Krishnaji Mutyala'
  ];

  return (
    <div className="min-h-screen bg-white py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Built by Team 412</h1>
          <p className="text-xl text-gray-600">
            A project for CBIT Hacktoberfest 2025
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Team</h2>
          <div className="space-y-4">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-lg font-medium text-gray-900">{member}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About EventPravesh</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            EventPravesh is an innovative NFT-powered event ticketing platform that combines
            blockchain technology with modern web development to create a secure, scalable,
            and user-friendly ticketing solution.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Built for CBIT Hacktoberfest 2025, this platform demonstrates the practical
            application of blockchain technology in solving real-world problems in the
            event management industry.
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={() => onNavigate('home')}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

function EventPravesh() {
  const [page, setPage] = useState('home');
  const [pageData, setPageData] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [staffSession, setStaffSession] = useState(null);

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = api.onAuthStateChange(() => {
      checkAuth();
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const session = await api.getSession();
    if (session?.user) {
      setUser(session.user);
      const profileData = await api.getProfile(session.user.id);
      setProfile(profileData);
    } else {
      setUser(null);
      setProfile(null);
    }
  };

  const handleNavigate = (newPage, data = null) => {
    setPage(newPage);
    setPageData(data);
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setProfile(null);
    handleNavigate('home');
  };

  const handleStaffLogin = (staff, eventId) => {
    const session = { staff, eventId, timestamp: Date.now() };
    setStaffSession(session);
    localStorage.setItem('staffSession', JSON.stringify(session));
    handleNavigate('scanner');
  };

  const handleStaffLogout = () => {
    setStaffSession(null);
    localStorage.removeItem('staffSession');
    handleNavigate('home');
  };

  // Check for existing staff session on app load
  useEffect(() => {
    const savedSession = localStorage.getItem('staffSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        // Check if session is less than 24 hours old
        if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
          setStaffSession(session);
        } else {
          localStorage.removeItem('staffSession');
        }
      } catch (error) {
        localStorage.removeItem('staffSession');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {page !== 'scanner' && page !== 'scanLogin' && (
        <Header
          user={user}
          profile={profile}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {page === 'home' && <HomePage onNavigate={handleNavigate} />}

      {page === 'eventDetail' && (
        <EventDetailPage
          eventId={pageData}
          user={user}
          onNavigate={handleNavigate}
        />
      )}

      {page === 'auth' && (
        <AuthPage
          mode={pageData}
          onNavigate={handleNavigate}
          onAuthSuccess={() => handleNavigate('home')}
        />
      )}

      {page === 'profile' && user && (
        <ProfilePage
          user={user}
          profile={profile}
          onNavigate={handleNavigate}
        />
      )}

      {page === 'hostDashboard' && user && profile?.is_host && (
        <HostDashboard
          user={user}
          profile={profile}
          onNavigate={handleNavigate}
        />
      )}

      {page === 'manageEvent' && (
        <ManageEventPage
          eventId={pageData}
          onNavigate={handleNavigate}
        />
      )}

      {page === 'editEvent' && (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <button
                onClick={() => handleNavigate('hostDashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <X className="w-4 h-4" />
                Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
            </div>
            <EditEventForm
              eventId={pageData}
              user={user}
              onSuccess={() => handleNavigate('hostDashboard')}
            />
          </div>
        </div>
      )}

      {page === 'scanLogin' && (
        <StaffLoginPage
          onNavigate={handleNavigate}
          onLoginSuccess={handleStaffLogin}
        />
      )}

      {page === 'scanner' && staffSession && (
        <ScannerPage
          staff={staffSession.staff}
          eventId={staffSession.eventId}
          onNavigate={handleNavigate}
          onLogout={handleStaffLogout}
        />
      )}

      {page === 'about' && <AboutPage onNavigate={handleNavigate} />}

      {page !== 'scanner' && page !== 'scanLogin' && (
        <Footer onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default EventPravesh;
