import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Briefcase, 
  FileText, 
  BookOpen, 
  Users, 
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  totalResumes: number;
  bookmarkedResources: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
    totalResumes: 0,
    bookmarkedResources: 0
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch applications stats
      const { data: applications } = await supabase
        .from('applications')
        .select('status')
        .eq('user_id', user?.id);

      const applicationStats = applications?.reduce((acc, app) => {
        acc.totalApplications++;
        if (app.status === 'applied' || app.status === 'interview') {
          acc.pendingApplications++;
        } else if (app.status === 'offer') {
          acc.acceptedApplications++;
        } else if (app.status === 'rejected') {
          acc.rejectedApplications++;
        }
        return acc;
      }, {
        totalApplications: 0,
        pendingApplications: 0,
        acceptedApplications: 0,
        rejectedApplications: 0
      }) || { totalApplications: 0, pendingApplications: 0, acceptedApplications: 0, rejectedApplications: 0 };

      // Fetch recent applications
      const { data: recent } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch resumes count
      const { data: resumes } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', user?.id);

      // Fetch bookmarked resources count
      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user?.id);

      setStats({
        ...applicationStats,
        totalResumes: resumes?.length || 0,
        bookmarkedResources: bookmarks?.length || 0
      });

      setRecentApplications(recent || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your career journey.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Offers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.acceptedApplications}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalApplications > 0 
                  ? Math.round((stats.acceptedApplications / stats.totalApplications) * 100)
                  : 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900">Track Applications</h3>
          </div>
          <p className="text-blue-700 text-sm mb-4">
            Keep track of all your job applications in one place
          </p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
            View Applications
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-600 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-purple-900">Build Resume</h3>
          </div>
          <p className="text-purple-700 text-sm mb-4">
            Create professional resumes with our easy-to-use builder
          </p>
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
            Create Resume
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-600 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-green-900">Network</h3>
          </div>
          <p className="text-green-700 text-sm mb-4">
            Connect with peers and schedule mock interviews
          </p>
          <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
            Find Peers
          </button>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Applications</h2>
        </div>
        <div className="p-6">
          {recentApplications.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No applications yet</p>
              <p className="text-sm text-gray-400 mt-1">Start tracking your job applications to see them here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(app.status)}
                      <div>
                        <h4 className="font-medium text-gray-900">{app.position}</h4>
                        <p className="text-sm text-gray-500">{app.company}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;