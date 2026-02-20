import React from 'react';

export interface ActivityLogEntry {
  id: number;
  timestamp: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ActivityLogProps {
  log: ActivityLogEntry[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ log }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg mt-8">
      <h2 className="text-lg font-semibold text-white mb-2">Registro de Actividad</h2>
      {log.length === 0 ? (
        <div className="text-gray-400 text-sm">No hay actividades registradas en esta sesión.</div>
      ) : (
        <ul className="divide-y divide-gray-700 max-h-64 overflow-y-auto">
          {log.slice().reverse().map(entry => (
            <li key={entry.id} className="py-2 flex items-start gap-2">
              <span className={`inline-block w-2 h-2 rounded-full mt-2 ${
                entry.type === 'success' ? 'bg-green-400' : entry.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
              }`} />
              <div>
                <span className="text-xs text-gray-400 mr-2">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span className="text-sm text-white">{entry.message}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ActivityLog;
