import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Building,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2
} from 'lucide-react';

interface Application {
  id: string;
  company: string;
  position: string;
  location: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected';
  application_date: string;
  notes: string;
  created_at: string;
}

const Applications: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    location: '',
    status: 'applied' as const,
    application_date: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    setFilteredApplications(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingApp) {
        const { error } = await supabase
          .from('applications')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingApp.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('applications')
          .insert([{
            ...formData,
            user_id: user?.id,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
      }

      setFormData({
        company: '',
        position: '',
        location: '',
        status: 'applied',
        application_date: '',
        notes: ''
      });
      setShowForm(false);
      setEditingApp(null);
      fetchApplications();
    } catch (error) {
      console.error('Error saving application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (app: Application) => {
    setEditingApp(app);
    setFormData({
      company: app.company,
      position: app.position,
      location: app.location,
      status: app.status,
      application_date: app.application_date,
      notes: app.notes
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this application?')) {
      try {
        const { error } = await supabase
          .from('applications')
          .delete()
          .eq('id', id);

        if (error) throw error;
        fetchApplications();
      } catch (error) {
        console.error('Error deleting application:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'interview':
        return <Calendar className="w-4 h-4 text-yellow-500" />;
      case 'offer':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'interview':
        return 'bg-yellow-100 text-yellow-800';
      case 'offer':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600">Track and manage your job applications</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingApp(null);
            setFormData({
              company: '',
              position: '',
              location: '',
              status: 'applied',
              application_date: '',
              notes: ''
            });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Application</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies or positions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="applied">Applied</option>
          <option value="interview">Interview</option>
          <option value="offer">Offer</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filteredApplications.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No applications found</p>
            <p className="text-sm text-gray-400 mt-1">Start tracking your job applications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredApplications.map((app) => (
              <div key={app.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(app.status)}
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {app.position}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                      <div className="flex items-center space-x-1">
                        <Building className="w-4 h-4" />
                        <span>{app.company}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{app.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(app.application_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {app.notes && (
                      <p className="text-sm text-gray-600 mt-2">{app.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(app)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingApp ? 'Edit Application' : 'Add New Application'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="applied">Applied</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Application Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.application_date}
                  onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  {editingApp ? 'Update' : 'Add'} Application
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingApp(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;