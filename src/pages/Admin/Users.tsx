import { useState, useEffect, useCallback } from 'react';
import OnboardModal from '../../components/OnboardModal';
import { allUsers } from '../../api/users';
import type { UserListItem } from '../../interface/users';
import SkeletonTable from '../../components/SkeletonLoader/SkeletonTable';
import UsersDetail from '../../components/UsersDetail';
import { 
  Eye, 
  Edit3, 
  Trash2, 
  User as UserIcon, 
  Mail, 
  Building2, 
  Shield, 
  CheckCircle2, 
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

function Users() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await allUsers();
      setUsers(data.items);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOnboardSuccess = () => {
    fetchUsers();
    toast.success('User list refreshed');
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Users Management</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your platform users and their roles</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-600 transition-all text-white px-6 py-2.5 rounded-xl cursor-pointer font-semibold shadow-md shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <UserIcon className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* Users Table Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4">
                <SkeletonTable />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                           <UserIcon className="w-12 h-12 text-gray-100" />
                           <p className="text-gray-400 font-medium">No users found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-cyan-50 to-cyan-100 flex items-center justify-center border border-cyan-100 shadow-sm group-hover:scale-110 transition-transform">
                              <span className="text-cyan-600 font-bold text-sm">
                                {(user.full_name || user.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800 leading-none mb-1">
                                {user.full_name || 'Anonymous User'}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                 <Mail className="w-3 h-3" />
                                 {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="font-medium tracking-tight">
                              {user.onboarding_data?.company_name || user.onboarding_data?.company || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-gray-100 ${
                            user.role === 'admin' 
                              ? 'bg-purple-50 text-purple-700 border-purple-100' 
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                          }`}>
                            <Shield className="w-3 h-3 mr-1" />
                            {user.role}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                            user.is_active ? 'text-emerald-600' : 'text-rose-500'
                          }`}>
                            {user.is_active ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            {user.is_active ? 'Active' : 'Deactivated'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 transition-opacity">
                            <button 
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-cyan-600 transition-all border border-transparent hover:border-gray-100 cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                            <button 
                              className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-indigo-600 transition-all border border-transparent hover:border-gray-100 cursor-pointer"
                              title="Edit User"
                            >
                              <Edit3 className="w-4.5 h-4.5" />
                            </button>
                            <button 
                              className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-rose-500 transition-all border border-transparent hover:border-gray-100 cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <OnboardModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleOnboardSuccess}
      />

      <UsersDetail 
        isOpen={isDetailModalOpen} 
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedUserId(null);
        }} 
        userId={selectedUserId}
      />
    </>
  );
}

export default Users;