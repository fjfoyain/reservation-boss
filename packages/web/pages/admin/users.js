import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';

const API_URL = '/api';

const EMPTY_FORM = { email: '', isPeopleLead: false, peopleLeadEmail: '' };

export default function UsersPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [peopleLeads, setPeopleLeads] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = create, obj = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // user id to confirm delete

  const fetchUsers = useCallback(async (idToken) => {
    try {
      const { data } = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setUsers(data);
      setPeopleLeads(data.filter((u) => u.isPeopleLead));
    } catch {
      toast.error('Failed to load users');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdToken();

        // People Leads cannot access this page
        try {
          const { data } = await axios.get('/api/auth/role', {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (data.isPeopleLead) {
            router.push('/admin/pl-dashboard');
            return;
          }
        } catch {
          // continue as full admin
        }

        setCurrentUser(user);
        setToken(idToken);
        await fetchUsers(idToken);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, fetchUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      isPeopleLead: user.isPeopleLead || false,
      peopleLeadEmail: user.peopleLeadEmail || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        isPeopleLead: form.isPeopleLead,
        peopleLeadEmail: form.peopleLeadEmail || null,
      };

      if (editingUser) {
        await axios.put(`${API_URL}/admin/users/${editingUser.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('User updated successfully');
      } else {
        await axios.post(`${API_URL}/admin/users`, { ...payload, email: form.email }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('User created successfully');
      }

      closeModal();
      await fetchUsers(token);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('User deleted');
      setDeleteConfirm(null);
      await fetchUsers(token);
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-nh-navy shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/admin/reports')}
                  className="text-nh-teal hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-white">Manage Users</h1>
                  <p className="text-sm text-nh-teal mt-1 font-semibold">Admin Dashboard</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-white font-medium">{currentUser?.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-semibold text-white hover:bg-nh-dark-navy rounded-md transition-colors border border-white/40"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Users</h2>
              <button
                onClick={openCreate}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow transition-colors"
              >
                + Add User
              </button>
            </div>

            {users.length === 0 ? (
              <p className="text-gray-500 italic">No users configured yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">People Lead</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Their People Lead</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.isPeopleLead ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.peopleLeadEmail || <span className="italic text-gray-400">None</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => openEdit(user)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(user.id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-5">
              {editingUser ? 'Edit User' : 'Add User'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Email — only editable on create */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                {editingUser ? (
                  <p className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                    {form.email}
                  </p>
                ) : (
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="user@northhighland.com"
                    className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                )}
              </div>

              {/* People Lead toggle */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPeopleLead"
                  checked={form.isPeopleLead}
                  onChange={(e) => setForm({ ...form, isPeopleLead: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="isPeopleLead" className="text-sm font-medium text-gray-700">
                  This user is a People Lead
                </label>
              </div>

              {/* Their People Lead */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned People Lead
                </label>
                <select
                  value={form.peopleLeadEmail}
                  onChange={(e) => setForm({ ...form, peopleLeadEmail: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— None —</option>
                  {peopleLeads
                    .filter((pl) => !editingUser || pl.email !== editingUser.email)
                    .map((pl) => (
                      <option key={pl.id} value={pl.email}>
                        {pl.email}
                      </option>
                    ))}
                </select>
                {peopleLeads.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    No People Leads exist yet. Create one first by checking the box above.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User</h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure? This will remove the user&apos;s profile but will not affect existing reservations.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
