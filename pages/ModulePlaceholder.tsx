
import React from 'react';

interface ModulePlaceholderProps {
  title: string;
}

const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 bg-white border border-dashed border-slate-300 rounded-2xl">
      <div className="w-20 h-20 mb-6 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">{title} Module</h2>
      <p className="text-slate-500 text-center max-w-md">
        This module is currently under development. In a real application, you would find full database records, CRUD operations, and advanced reporting features here.
      </p>
      <button className="mt-8 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
        Go Back Home
      </button>
    </div>
  );
};

export default ModulePlaceholder;
