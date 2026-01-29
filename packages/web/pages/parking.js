import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

// Use Next.js API routes
const API_URL = '/api';

const AdminPanel = ({ reservations, fetchReservations, token }) => {
  const [isAdminVisible, setIsAdminVisible] = useState(false);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reservation?")) return;
    try {
      await axios.delete(`${API_URL}/reservations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Reservation deleted!");
      fetchReservations(); // weekly refresh
    } catch (error) {
      toast.error("Failed to delete. You may not be authorized.");
    }
  };

  const handleDeleteOldReservations = async () => {
    if (!window.confirm("Are you sure you want to delete all reservations older than the current visible week? This action cannot be undone.")) return;
    try {
      const response = await axios.post(`${API_URL}/admin/cleanup`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchReservations(); // refresh the current week's data
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete old reservations. You may not be authorized.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <button onClick={() => setIsAdminVisible(!isAdminVisible)} className="text-sm text-blue-500 hover:underline mb-4">
        {isAdminVisible ? 'Hide Admin Panel' : 'Show Admin Panel'}
      </button>
      {isAdminVisible && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Admin - Week Reservations</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => window.location.href = '/admin/reports'}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
              >
                📊 Reports
              </button>
              <button
                onClick={handleDeleteOldReservations}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium"
              >
                Delete Old Reservations
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Spot</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.map((res) => (
                  <tr key={res.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{res.date}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{res.spot}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{res.email}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button onClick={() => handleDelete(res.id)} className="text-red-600 hover:text-red-900 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const ReservationForm = ({ email, setEmail, selectedDate, selectedSpot, setSelectedSpot, availableSpots, handleReserve, loading, userReservationCount }) => {
  // Email domain validation
  const validateEmail = (email) => {
    const emailLower = email.toLowerCase().trim();
    return emailLower.endsWith('@northhighland.com');
  };

  const isEmailValid = validateEmail(email);
  const canReserveMore = userReservationCount < 3;

  return (
    <div className="bg-white p-6 shadow-md rounded-md w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Reserve a Spot</h2>
      <p className="text-sm text-gray-700 mb-4">Selected Date: <span className="font-semibold text-gray-900">{selectedDate || 'Please select a day above'}</span></p>
      
      <div className="mb-4">
        <input 
          type="email" 
          className={`border p-2 w-full rounded ${!isEmailValid && email ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Enter your @northhighland.com email"
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
        />
        {!isEmailValid && email && (
          <p className="text-red-500 text-xs mt-1">Only North Highland Email accepted.</p>
        )}
      </div>

      <select 
        className="border p-2 w-full mb-4 rounded" 
        onChange={(e) => setSelectedSpot(e.target.value)}
        value={selectedSpot} 
        disabled={!selectedDate || !isEmailValid}>
        <option value="">Select an available spot</option>
        {availableSpots.map((spot) => <option key={spot} value={spot}>{spot}</option>)}
      </select>

      {!canReserveMore && (
        <p className="text-amber-600 text-sm mb-3 p-2 bg-amber-50 rounded">
          You have reached the maximum of 3 reservations for this week.
        </p>
      )}

      <div className="mb-3">
        <p className="text-xs text-gray-500">
          Weekly reservations: {userReservationCount}/3
        </p>
      </div>

      <button 
        onClick={handleReserve}
        className="bg-blue-600 text-white p-3 w-full rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        disabled={loading || !email || !selectedDate || !selectedSpot || !isEmailValid || !canReserveMore}>
        {loading ? "Reserving..." : "Confirm Reservation"}
      </button>
    </div>
  );
};

const ScheduleView = ({ visibleWeekDates, reservations, parkingSpots, selectedDate, setSelectedDate }) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex border-b border-gray-200 space-x-4 mb-4 overflow-x-auto pb-2">
        {visibleWeekDates.map(({ date, day }) => (
          <button key={date} onClick={() => setSelectedDate(date)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap ${selectedDate === date ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {day} ({date.substring(5)})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {parkingSpots.map((spot) => {
          const reservation = reservations.find(r => r.date === selectedDate && r.spot === spot);
          const isAvailable = !reservation;
          return (
            <div key={spot} className={`p-4 rounded-lg shadow ${isAvailable ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className="font-bold text-gray-800">{spot}</p>
              {isAvailable ? <p className="text-sm text-green-800">Available</p> : (
                <div>
                  <p className="text-sm text-red-800">Reserved</p>
                  <p className="text-xs text-gray-800 font-medium truncate">{reservation.email}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Home() {
  const [reservations, setReservations] = useState([]);
  const [config, setConfig] = useState({ parkingSpots: [], visibleWeekDates: [] });
  const [email, setEmail] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSpot, setSelectedSpot] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState('');

  const fetchInitialData = async () => {
    try {
      const [configRes, reservationsRes] = await Promise.all([
        axios.get(`${API_URL}/config`),
        // ⬇️ weekly, not full collection
        axios.get(`${API_URL}/reservations/week`)
      ]);
      setConfig(configRes.data);
      setReservations(reservationsRes.data);
      if (configRes.data.visibleWeekDates.length > 0) {
        setSelectedDate(configRes.data.visibleWeekDates[0].date);
      }
    } catch (error) {
      toast.error("Error fetching initial data. Please refresh.");
    }
  };

  // Re-fetch week list (not whole DB)
  const fetchReservations = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/reservations/week`);
      setReservations(data);
    } catch {
      toast.error("Could not refresh reservations list.");
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIdToken(currentUser ? await currentUser.getIdToken() : '');
    });
    fetchInitialData();
    return () => unsub();
  }, []);

  const handleReserve = async () => {
    if (!email || !selectedDate || !selectedSpot) {
      toast.error("Please fill in all fields.");
      return;
    }

    // Client-side validation
    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith('@northhighland.com')) {
      toast.error("Only North Highland Email accepted.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/reserve`, { email: emailLower, date: selectedDate, spot: selectedSpot });
      toast.success(`Reservation successful for ${selectedSpot}!`);
      fetchReservations();
      setEmail(''); 
      setSelectedSpot('');
    } catch (error) {
      toast.error(error.response?.data?.error || "Reservation failed.");
    }
    setLoading(false);
  };

  const handleLogout = () => signOut(auth);

  const availableSpots = config.parkingSpots.filter(spot =>
    !reservations.some(res => res.date === selectedDate && res.spot === spot)
  );

  // Count user's reservations for the current week
  const userReservationCount = email ? 
    reservations.filter(res => res.email.toLowerCase() === email.toLowerCase().trim()).length : 0;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />
      <header className="w-full p-4 text-right bg-white shadow-sm sticky top-0 z-10">
        {user ? (
          <div>
            <span className="text-sm mr-4">Welcome, {user.email}</span>
            <button onClick={handleLogout} className="text-sm text-blue-500 hover:underline">Logout</button>
          </div>
        ) : (
          <a href="/login" className="text-sm text-blue-500 hover:underline">Admin Login</a>
        )}
      </header>

      <main className="w-full p-4">
        <h1 className="text-4xl font-bold text-center my-6 text-gray-800">Parking Reservations</h1>
        <div className="w-full max-w-4xl mx-auto mb-8">
          <ScheduleView
            visibleWeekDates={config.visibleWeekDates}
            reservations={reservations}
            parkingSpots={config.parkingSpots}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        </div>
        <div className="flex justify-center">
          <ReservationForm
            email={email} setEmail={setEmail}
            selectedDate={selectedDate}
            selectedSpot={selectedSpot} setSelectedSpot={setSelectedSpot}
            availableSpots={availableSpots}
            handleReserve={handleReserve} 
            loading={loading}
            userReservationCount={userReservationCount}
          />
        </div>

        {user && (
          <AdminPanel
            reservations={reservations}
            fetchReservations={fetchReservations}
            token={idToken}
          />
        )}
      </main>
    </div>
  );
}