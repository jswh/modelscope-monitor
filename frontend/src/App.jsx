import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [accounts, setAccounts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', cookies: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState('5:00');

  const getCountdownColor = () => {
    const [minutes, seconds] = countdown.split(':').map(Number);
    const totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds > 120) return 'text-green-600'; // 2分钟以上绿色
    if (totalSeconds > 60) return 'text-yellow-600';  // 1-2分钟黄色
    return 'text-red-600'; // 1分钟以内红色
  };

  useEffect(() => {
    fetchAccounts();
    
    // 设置5分钟整体刷新定时器
    const refreshIntervalId = setInterval(() => {
      window.location.reload();
    }, 5 * 60 * 1000); // 5分钟 = 300000毫秒

    // 设置1秒倒计时更新定时器
    const countdownIntervalId = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return '5:00';
        }
        const [minutes, seconds] = prev.split(':').map(Number);
        const totalSeconds = minutes * 60 + seconds - 1;
        const newMinutes = Math.floor(totalSeconds / 60);
        const newSeconds = totalSeconds % 60;
        return `${newMinutes}:${newSeconds.toString().padStart(2, '0')}`;
      });
    }, 1000);

    // 组件卸载时清理定时器
    return () => {
      clearInterval(refreshIntervalId);
      clearInterval(countdownIntervalId);
    };
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/accounts');
      setAccounts(response.data.accounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/accounts', newAccount);
      setNewAccount({ name: '', cookies: '' });
      setShowAddModal(false);
      fetchAccounts();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await axios.delete(`/api/accounts/${id}`);
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleRefreshAccount = async (id) => {
    try {
      await axios.post(`/api/accounts/${id}/refresh`);
      fetchAccounts();
    } catch (error) {
      console.error('Error refreshing account:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">ModelScope API Monitor</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">页面自动刷新:</span>
              <span className={`font-medium ${getCountdownColor()}`}>
                {countdown}
              </span>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Add Account
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onDelete={handleDeleteAccount}
              onRefresh={handleRefreshAccount}
            />
          ))}
        </div>
        
        {accounts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No accounts found. Add an account to start monitoring.</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddAccount}
          loading={loading}
          account={newAccount}
          setAccount={setNewAccount}
        />
      )}
    </div>
  );
}

function AccountCard({ account, onDelete, onRefresh }) {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    fetchLatestUsage();
  }, [account.id]);
  const fetchLatestUsage = async () => {
    try {
      const response = await axios.get(`/api/accounts/${account.id}/latest-usage`);
      setUsageData(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setUsageData(null);
      } else {
        console.error('Error fetching usage data:', error);
      }
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await onRefresh(account.id);
    await fetchLatestUsage();
    setLoading(false);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getUsageStatus = (data) => {
    if (!data || !data.success) return 'error';
    return 'success';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{account.name}</h3>
          <p className="text-sm text-gray-500">ID: {account.id}</p>

        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : '🔄'}
          </button>
          <button
            onClick={() => onDelete(account.id)}
            className="text-red-500 hover:text-red-700"
          >
            🗑️
          </button>
        </div>
      </div>

      {usageData && (
        <div className={`border-t pt-4 ${getUsageStatus(usageData) === 'error' ? 'border-red-200' : 'border-green-200'}`}>
          <h4 className="font-medium text-gray-700 mb-2">Latest Usage Data</h4>
          
          {usageData.success ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Updated:</strong> {formatTimestamp(usageData.timestamp)}
              </p>
              {usageData.data && usageData.data.Data && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-xs text-blue-600">Usage (5s)</p>
                      <p className="text-lg font-bold text-blue-800">
                        {usageData.data.Data.currentUsagePer5Seconds} / {usageData.data.Data.requestLimitPer5Seconds}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-xs text-green-600">Usage (Daily)</p>
                      <p className="text-lg font-bold text-green-800">
                        {usageData.data.Data.currentUsagePerDay} / {usageData.data.Data.requestLimitPerDay}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <button 
                      onClick={() => setShowRawData(!showRawData)}
                      className="flex items-center justify-between w-full text-left text-xs text-gray-500 mb-2 hover:text-gray-700 focus:outline-none"
                    >
                      <span>Raw Data:</span>
                      <span>{showRawData ? '▼' : '▶'}</span>
                    </button>
                    {showRawData && (
                      <pre className="whitespace-pre-wrap text-xs border-t border-gray-200 pt-2">
                        {JSON.stringify(usageData.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-600 text-sm">
              <p><strong>Error:</strong> {usageData.error}</p>
              <p><strong>Time:</strong> {formatTimestamp(usageData.timestamp)}</p>
            </div>
          )}
        </div>
      )}

      {!usageData && (
        <div className="text-gray-500 text-sm">
          No usage data available
        </div>
      )}
    </div>
  );
}

function AddAccountModal({ onClose, onSubmit, loading, account, setAccount }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add New Account</h2>
        
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Name
            </label>
            <input
              type="text"
              value={account.name}
              onChange={(e) => setAccount({ ...account, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter account name"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cookies
            </label>
            <textarea
              value={account.cookies}
              onChange={(e) => setAccount({ ...account, cookies: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 h-32"
              placeholder="Paste your ModelScope cookies here..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Include all required cookies: csrf_session, csrf_token, t, m_session_id, etc.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
