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
  const [showWarning, setShowWarning] = useState(false);

  // Email domain validation
  const validateEmail = (email) => {
    const emailLower = email.toLowerCase().trim();
    return emailLower.endsWith('@northhighland.com');
  };

  const isEmailValid = validateEmail(email);
  const canReserveMore = userReservationCount < 3;

  const handleConfirmClick = () => {
    setShowWarning(true);
  };

  const handleProceedReservation = () => {
    setShowWarning(false);
    handleReserve();
  };

  return (
    <div className="bg-white p-6 shadow-md rounded-md w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Reserve a Spot</h2>
      <p className="text-sm text-gray-800 mb-4 font-medium">Selected Date: <span className="font-bold text-gray-900">{selectedDate || 'Please select a day above'}</span></p>
      
      <div className="mb-4">
        <input 
          type="email" 
          className={`border p-2 w-full rounded ${!isEmailValid && email ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Enter your @northhighland.com email"
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
        />
        {!isEmailValid && email && (
          <p className="text-red-600 text-xs mt-1 font-medium">Only North Highland Email accepted.</p>
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
        <p className="text-amber-700 text-sm mb-3 p-2 bg-amber-50 rounded font-medium">
          You have reached the maximum of 3 reservations for this week.
        </p>
      )}

      <div className="mb-3">
        <p className="text-sm text-gray-800 font-medium">
          Weekly reservations: {userReservationCount}/3
        </p>
      </div>

      <button 
        onClick={handleConfirmClick}
        className="bg-blue-600 text-white p-3 w-full rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-bold text-base shadow-lg"
        disabled={loading || !email || !selectedDate || !selectedSpot || !isEmailValid || !canReserveMore}>
        {loading ? "Reserving..." : "Confirm Reservation"}
      </button>

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Important Reminder</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Remember, the use of parking lots is a benefit and should be used responsibly. 
                  If you plan to not come one day, it will be tolerated only to be changed until <strong>8:00 AM</strong> so someone else can reserve your spot. 
                  The spot should be removed as we will be taking monthly reports to compare with UrbaPark.
                </p>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 px-4 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-bold border-2 border-gray-400 shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedReservation}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors shadow-lg border-2 border-blue-600"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScheduleView = ({ visibleWeekDates, reservations, parkingSpots, selectedDate, setSelectedDate, userEmail, onCancelReservation }) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex border-b border-gray-200 space-x-4 mb-4 overflow-x-auto pb-2">
        {visibleWeekDates.map(({ date, day }) => (
          <button key={date} onClick={() => setSelectedDate(date)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg whitespace-nowrap transition-colors ${selectedDate === date ? 'border-b-2 border-nh-teal text-nh-navy bg-blue-50' : 'text-gray-700 hover:text-nh-navy hover:bg-gray-50'}`}>
            {day} ({date.substring(5)})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {parkingSpots.map((spot) => {
          const reservation = reservations.find(r => r.date === selectedDate && r.spot === spot);
          const isAvailable = !reservation;
          const isUserReservation = reservation && userEmail && reservation.email.toLowerCase() === userEmail.toLowerCase();
          
          return (
            <div key={spot} className={`p-4 rounded-lg shadow relative ${isAvailable ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className="font-bold text-gray-900 text-lg">{spot}</p>
              {isAvailable ? <p className="text-sm text-green-900 font-semibold">Available</p> : (
                <div>
                  <p className="text-sm text-red-900 font-semibold">Reserved</p>
                  <p className="text-xs text-gray-900 font-semibold truncate">{reservation.email}</p>
                  {isUserReservation && (
                    <button
                      onClick={() => onCancelReservation(reservation)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                      title="Cancel reservation"
                    >
                      ✕
                    </button>
                  )}
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
  const [cancellationModal, setCancellationModal] = useState(null); // { reservation, step: 'confirm' | 'code' }
  const [cancellationCode, setCancellationCode] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

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

  const handleCancelReservation = (reservation) => {
    setCancellationModal({ reservation, step: 'confirm' });
  };

  const handleRequestCancellationCode = async () => {
    setCancelLoading(true);
    try {
      await axios.post(`${API_URL}/cancellation/request-code`, {
        reservationId: cancellationModal.reservation.id,
        email
      });
      toast.success('Cancellation code sent to your email! Check your inbox.');
      setCancellationModal({ ...cancellationModal, step: 'code' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send cancellation code');
    }
    setCancelLoading(false);
  };

  const handleVerifyAndCancel = async () => {
    if (!cancellationCode.trim()) {
      toast.error('Please enter the cancellation code');
      return;
    }

    setCancelLoading(true);
    try {
      await axios.post(`${API_URL}/cancellation/verify-and-cancel`, {
        reservationId: cancellationModal.reservation.id,
        code: cancellationCode
      });
      toast.success('Reservation cancelled successfully!');
      setCancellationModal(null);
      setCancellationCode('');
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel reservation');
    }
    setCancelLoading(false);
  };

  const closeCancellationModal = () => {
    setCancellationModal(null);
    setCancellationCode('');
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
      <header className="w-full p-4 bg-nh-navy shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <a href="/" className="text-nh-teal hover:text-white font-semibold flex items-center transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </a>
          <div>
            {user ? (
              <div>
                <span className="text-sm mr-4 text-blue-100 font-medium">Welcome, {user.email}</span>
                <button onClick={handleLogout} className="text-sm text-nh-teal hover:text-white font-medium transition-colors">Logout</button>
              </div>
            ) : (
              <a href="/login" className="text-sm text-nh-teal hover:text-white font-medium transition-colors">Admin Login</a>
            )}
          </div>
        </div>
      </header>

      <main className="w-full p-4">
        <h1 className="text-4xl font-bold text-center my-6 text-nh-navy">Parking Reservations</h1>
        <div className="w-full max-w-4xl mx-auto mb-8">
          <ScheduleView
            visibleWeekDates={config.visibleWeekDates}
            reservations={reservations}
            parkingSpots={config.parkingSpots}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            userEmail={email}
            onCancelReservation={handleCancelReservation}
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

      {/* Cancellation Modal */}
      {cancellationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {cancellationModal.step === 'confirm' ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Reservation</h3>
                <div className="mb-4 p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-700"><strong>Spot:</strong> {cancellationModal.reservation.spot}</p>
                  <p className="text-sm text-gray-700"><strong>Date:</strong> {cancellationModal.reservation.date}</p>
                  <p className="text-sm text-gray-700"><strong>Email:</strong> {cancellationModal.reservation.email}</p>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  A 6-digit cancellation code will be sent to your email. You'll need to enter this code to confirm the cancellation.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={closeCancellationModal}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
                    disabled={cancelLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestCancellationCode}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium disabled:bg-gray-400"
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? 'Sending...' : 'Send Code'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Enter Cancellation Code</h3>
                <p className="text-sm text-gray-600 mb-4">
                  A 6-digit code has been sent to <strong>{cancellationModal.reservation.email}</strong>. 
                  Please check your email and enter the code below. It will expire in 10 minutes.
                </p>
                <input
                  type="text"
                  value={cancellationCode}
                  onChange={(e) => setCancellationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-3 border border-gray-300 rounded text-center text-2xl tracking-widest mb-4"
                  maxLength={6}
                  autoFocus
                />
                <div className="flex space-x-3">
                  <button
                    onClick={closeCancellationModal}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
                    disabled={cancelLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyAndCancel}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium disabled:bg-gray-400"
                    disabled={cancelLoading || cancellationCode.length !== 6}
                  >
                    {cancelLoading ? 'Verifying...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}