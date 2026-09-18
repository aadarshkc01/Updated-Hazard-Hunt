import React from 'react';
import { Download } from 'lucide-react';

export const UserAuditModal = ({ user, audit, loading, onClose, onDownload }) => {
  if (!user) return null;

  const records = audit?.records || [];
  const officialRecords = records
    .filter((record) => !record.isPracticeMode)
    .sort((left, right) => new Date(right.completedAt || 0) - new Date(left.completedAt || 0));
  const isEmployee = user.role === 'employee';
  const passedCount = officialRecords.filter((record) => record.passed).length;
  const falseClicks = officialRecords.reduce((sum, record) => sum + (record.falseClicksCount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mist-900/50 animate-fade-in">
      <div className="app-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-mist-200 dark:border-dark-border flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-primary-500">Account details</p>
            <h2 className="text-xl font-bold text-mist-900 dark:text-white mt-1">{user.name}</h2>
            <p className="text-xs text-mist-500 dark:text-dark-muted mt-1">@{user.username} · {user.role} · {user.department}</p>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-mist-600 dark:text-dark-muted border border-mist-300 dark:border-dark-border rounded-lg hover:border-primary-400 hover:text-primary-600">
            Close
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!isEmployee ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-mist-100 dark:bg-dark-surface rounded-lg p-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-mist-500 dark:text-dark-muted">Role</p>
                <p className="text-lg font-bold text-mist-900 dark:text-white mt-1">{user.role}</p>
              </div>
              <div className="bg-mist-100 dark:bg-dark-surface rounded-lg p-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-mist-500 dark:text-dark-muted">Created</p>
                <p className="text-lg font-bold text-mist-900 dark:text-white mt-1">{new Date(user.createdAt).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
          ) : loading ? (
            <div className="py-12 text-center text-sm text-mist-500 dark:text-dark-muted">Loading employee score history...</div>
          ) : audit ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Sessions', audit.totalAttempts ?? records.length],
                  ['Latest score', officialRecords[0]?.totalScore != null ? `${officialRecords[0].totalScore}%` : '—'],
                  ['Passed', passedCount],
                  ['False clicks', falseClicks],
                ].map(([label, value]) => (
                  <div key={label} className="bg-mist-100 dark:bg-dark-surface rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-mist-500 dark:text-dark-muted">{label}</p>
                    <p className="text-xl font-bold text-mist-900 dark:text-white mt-1">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-mist-900 dark:text-white">Score history</h3>
                <button onClick={onDownload} disabled={!officialRecords.length} className="app-action gap-1.5 bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-40 disabled:cursor-not-allowed">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
              </div>
              <div className="border border-mist-200 dark:border-dark-border rounded-lg divide-y divide-mist-200 dark:divide-dark-border">
                {records.slice(0, 10).map((record, index) => (
                  <div key={record._id || index} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-mist-900 dark:text-white">{record.isPracticeMode ? 'Practice session' : record.passed ? 'Passed official session' : 'Failed official session'}</p>
                      <p className="text-[10px] text-mist-500 dark:text-dark-muted mt-1">{new Date(record.completedAt).toLocaleString('en-GB')} · {record.falseClicksCount || 0} false clicks</p>
                    </div>
                    <span className={`text-sm font-bold ${record.isPracticeMode ? 'text-amber-600' : record.passed ? 'text-emerald-600' : 'text-red-600'}`}>{record.totalScore}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-mist-500 dark:text-dark-muted">No score history is available for this employee.</div>
          )}
        </div>
      </div>
    </div>
  );
};
