import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';

const TYPE_LABELS = { meeting: 'Meeting Room', calling: 'Calling Booth' };

export default function AdminRoomsPage() {
  const [token, setToken] = useState('');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'meeting', capacity: 6 });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
      fetchRooms(idToken);
    });
    return () => unsubscribe();
  }, []);

  async function fetchRooms(t = token) {
    setLoading(true);
    try {
      const res = await fetch('/api/v3/admin/rooms', { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      setRooms(data.rooms || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v3/admin/rooms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) showToast(data.error || 'Failed to create room');
      else { showToast('Room created'); setAddModal(false); setForm({ name: '', type: 'meeting', capacity: 6 }); fetchRooms(); }
    } catch { showToast('Failed to create room'); }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!editRoom) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v3/admin/rooms/${editRoom.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editRoom.name, type: editRoom.type, capacity: editRoom.capacity, active: editRoom.active }),
      });
      const data = await res.json();
      if (!res.ok) showToast(data.error || 'Failed to update room');
      else { showToast('Room updated'); setEditRoom(null); fetchRooms(); }
    } catch { showToast('Failed to update room'); }
    setSaving(false);
  }

  async function handleDeactivate(id) {
    try {
      await fetch(`/api/v3/admin/rooms/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Room deactivated');
      fetchRooms();
    } catch { showToast('Failed to deactivate room'); }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const meetingRooms = rooms.filter((r) => r.type === 'meeting');
  const callingBooths = rooms.filter((r) => r.type === 'calling');

  function RoomTable({ list }) {
    if (list.length === 0) return <div className="text-center py-8 text-gray-400 text-sm">No rooms configured.</div>;
    return (
      <div className="divide-y divide-gray-100">
        {list.map((room) => (
          <div key={room.id} className={`flex items-center justify-between px-5 py-3 ${!room.active ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-400">
                {room.type === 'calling' ? 'phone_in_talk' : 'meeting_room'}
              </span>
              <div>
                <div className="text-sm font-medium text-gray-900">{room.name}</div>
                <div className="text-xs text-gray-500">Capacity: {room.capacity}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!room.active && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Inactive</span>
              )}
              <button
                onClick={() => setEditRoom({ ...room })}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              {room.active && (
                <button
                  onClick={() => handleDeactivate(room.id)}
                  className="px-3 py-1.5 text-xs border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                  Deactivate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <AdminLayout title="Room Management">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Room Management</h2>
            <p className="text-sm text-gray-500 mt-1">Add, edit, or deactivate meeting rooms and calling booths.</p>
          </div>
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm"
            style={{ backgroundColor: '#1183d4' }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Room
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">progress_activity</span>
          </div>
        ) : (
          <>
            {/* Meeting Rooms */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" style={{ color: '#1183d4' }}>meeting_room</span>
                <h3 className="font-semibold text-gray-900">Meeting Rooms</h3>
                <span className="ml-auto text-xs text-gray-400">{meetingRooms.length} room{meetingRooms.length !== 1 ? 's' : ''}</span>
              </div>
              <RoomTable list={meetingRooms} />
            </div>

            {/* Calling Booths */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" style={{ color: '#00A3E0' }}>phone_in_talk</span>
                <h3 className="font-semibold text-gray-900">Calling Booths</h3>
                <span className="ml-auto text-xs text-gray-400">{callingBooths.length} booth{callingBooths.length !== 1 ? 's' : ''}</span>
              </div>
              <RoomTable list={callingBooths} />
            </div>
          </>
        )}
      </div>

      {/* Add Room modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Room</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Conference Room A"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
                >
                  <option value="meeting">Meeting Room</option>
                  <option value="calling">Calling Booth</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                  min={1}
                  max={50}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setAddModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#1183d4' }}
              >
                {saving ? 'Creating…' : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room modal */}
      {editRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Room</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                <input
                  type="text"
                  value={editRoom.name}
                  onChange={(e) => setEditRoom({ ...editRoom, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={editRoom.type}
                  onChange={(e) => setEditRoom({ ...editRoom, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
                >
                  <option value="meeting">Meeting Room</option>
                  <option value="calling">Calling Booth</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  value={editRoom.capacity}
                  onChange={(e) => setEditRoom({ ...editRoom, capacity: Number(e.target.value) })}
                  min={1}
                  max={50}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={editRoom.active}
                    onChange={(e) => setEditRoom({ ...editRoom, active: e.target.checked })}
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500" />
                </label>
                <span className="text-sm text-gray-700">Active</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setEditRoom(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#1183d4' }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg text-sm z-50">
          {toast}
        </div>
      )}

      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
    </AdminLayout>
  );
}
