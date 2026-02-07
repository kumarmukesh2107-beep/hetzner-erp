
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nexus<span className="text-indigo-600">ERP</span></h1>
          <p className="mt-2 text-sm text-slate-500">Enter your credentials to access your portal</p>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 mt-1 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="admin@nexus.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 mt-1 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="relative flex justify-center w-full px-4 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <svg className="w-5 h-5 mr-3 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            Sign In
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-center text-slate-400 uppercase tracking-widest font-semibold">Demo Access</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
             <button 
                onClick={() => {setEmail('admin@nexus.com'); setPassword('admin123')}}
                className="p-2 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-md border border-indigo-100 hover:bg-indigo-100"
             >
                Admin Credentials
             </button>
             <button 
                onClick={() => {setEmail('staff@nexus.com'); setPassword('staff123')}}
                className="p-2 text-xs font-medium text-slate-700 bg-slate-50 rounded-md border border-slate-200 hover:bg-slate-100"
             >
                Staff Credentials
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
