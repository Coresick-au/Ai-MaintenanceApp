import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export default function UserManagement({ onBack }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPass, setNewUserPass] = useState('');
    const [newUserRole, setNewUserRole] = useState('tech');
    const [newUserName, setNewUserName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Fetch Users
    const fetchUsers = async () => {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(userList);
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // The Magic Function: Create user without logging out the admin
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            // 1. Initialize a temporary secondary Firebase App
            // This isolates the new login session so it doesn't affect YOUR current session
            const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
            const secondaryAuth = getAuth(secondaryApp);

            // 2. Create the user in Auth
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPass);
            const uid = userCredential.user.uid;

            // 3. Create the user document in Firestore (using the MAIN app's db connection)
            await setDoc(doc(db, 'users', uid), {
                email: newUserEmail,
                name: newUserName,
                role: newUserRole,
                createdAt: new Date().toISOString()
            });

            // 4. Cleanup: Sign out of secondary app and delete it
            await signOut(secondaryAuth);

            // 5. Reset Form
            alert(`User ${newUserName} created successfully!`);
            setNewUserEmail('');
            setNewUserPass('');
            setNewUserName('');
            fetchUsers(); // Refresh list

        } catch (error) {
            console.error("Error creating user:", error);
            alert("Error: " + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    // Edit User Logic
    const [editingId, setEditingId] = useState(null);

    const handleEdit = (user) => {
        setEditingId(user.id);
        setNewUserName(user.name);
        setNewUserEmail(user.email);
        setNewUserRole(user.role);
        setNewUserPass(''); // Password reset not supported in this view
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserRole('tech');
        setNewUserPass('');
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        if (!editingId) return;

        setLoading(true);
        try {
            const userRef = doc(db, 'users', editingId);
            await setDoc(userRef, {
                name: newUserName,
                role: newUserRole,
                // Email/Pass not updated here
            }, { merge: true });

            alert(`User ${newUserName} updated successfully!`);
            handleCancelEdit();
            fetchUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Error updating user: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        if (editingId) {
            handleUpdateUser(e);
        } else {
            handleCreateUser(e);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm("This removes their permission settings (Firestore), but they will still exist in Firebase Auth. Continue?")) return;
        await deleteDoc(doc(db, 'users', userId));
        fetchUsers();
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={onBack} className="mb-6 text-slate-400 hover:text-white flex items-center gap-2">
                    ← Back to Portal
                </button>

                <h1 className="text-3xl font-bold mb-8">User Management</h1>

                {/* Create/Edit User Form */}
                <div className={`bg-slate-900 border ${editingId ? 'border-amber-500/50' : 'border-slate-800'} rounded-xl p-6 mb-8 shadow-lg transition-colors duration-300`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className={`text-xl font-bold ${editingId ? 'text-amber-400' : 'text-cyan-400'}`}>
                            {editingId ? 'Edit User' : 'Create New User'}
                        </h2>
                        {editingId && (
                            <button
                                onClick={handleCancelEdit}
                                type="button"
                                className="text-xs text-slate-400 hover:text-white underline"
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            className="bg-slate-800 border border-slate-700 p-2 rounded text-white focus:border-cyan-500 outline-none"
                            placeholder="Name (e.g. John Tech)"
                            value={newUserName} onChange={e => setNewUserName(e.target.value)} required
                        />
                        <input
                            className={`bg-slate-800 border border-slate-700 p-2 rounded text-white ${editingId ? 'cursor-not-allowed opacity-50' : ''}`}
                            placeholder="Email" type="email"
                            value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                            required
                            disabled={!!editingId} // Disable email edit
                            title={editingId ? "Email cannot be changed here" : ""}
                        />
                        {!editingId && (
                            <input
                                className="bg-slate-800 border border-slate-700 p-2 rounded text-white"
                                placeholder="Password (min 6 chars)" type="password"
                                value={newUserPass} onChange={e => setNewUserPass(e.target.value)}
                                required={!editingId}
                            />
                        )}
                        <select
                            className="bg-slate-800 border border-slate-700 p-2 rounded text-white"
                            value={newUserRole} onChange={e => setNewUserRole(e.target.value)}
                        >
                            <option value="tech">Tech (AIMM Only)</option>
                            <option value="manager">Manager (AIMM + Inventory + Quotes)</option>
                            <option value="admin">Admin (Full Access)</option>
                        </select>

                        <div className="md:col-span-2 flex gap-3">
                            <button
                                type="submit"
                                disabled={isCreating || loading}
                                className={`flex-1 font-bold py-2 rounded transition-colors ${editingId
                                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                    : 'bg-green-600 hover:bg-green-500 text-white'
                                    }`}
                            >
                                {loading || isCreating ? "Processing..." : editingId ? "Update User" : "Create User"}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* User List */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {users.map(user => (
                                <tr key={user.id} className={`hover:bg-slate-800/50 ${editingId === user.id ? 'bg-amber-900/10' : ''}`}>
                                    <td className="p-4 font-bold">{user.name}</td>
                                    <td className="p-4 text-slate-400">{user.email}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-purple-900/50 text-purple-400' :
                                            user.role === 'manager' ? 'bg-blue-900/50 text-blue-400' :
                                                'bg-slate-700 text-slate-300'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="text-amber-400 hover:text-amber-300 text-sm mr-4"
                                        >
                                            Edit
                                        </button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-300 text-sm">
                                            Delete Role
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
