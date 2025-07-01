import React, { useState, useEffect } from 'react';
import { CraneVisualization } from './components/3d/CraneVisualization';
import { SensorDashboard } from './components/dashboard/SensorDashboard';
import { AlertPanel } from './components/alerts/AlertPanel';
import { NavigationBar } from './components/navigation/NavigationBar';
import { WebSocketService } from './services/WebSocketService';
import { motion, AnimatePresence } from 'framer-motion';

// Loader component
function UniversalLoader({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 bg-opacity-90">
      <div className="mb-6">
        <svg className="animate-spin h-12 w-12 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to SCADA Verse</h2>
      <p className="text-lg text-blue-200 text-center max-w-md">{message}</p>
    </div>
  );
}

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sensorData, setSensorData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [webSocketService] = useState(() => new WebSocketService());
  const [loading, setLoading] = useState(true);
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    // Show a special message if backend takes long to respond
    const longWaitTimer = setTimeout(() => setLongWait(true), 12000);

    const handleSensorData = (data) => {
      setSensorData(data);
      setLoading(false);
      setLongWait(false);
    };

    const handleAlerts = (newAlerts) => {
      setAlerts((prev) => [...prev, ...newAlerts].slice(-50));
    };

    const handleConnected = () => {
      setIsConnected(true);
      webSocketService.subscribeTo([
        'control', 'environmental', 'lifting',
        'motor', 'movement', 'power',
        'safety', 'structural',
      ]);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    webSocketService.connect();
    webSocketService.on('sensor_data', handleSensorData);
    webSocketService.on('alerts', handleAlerts);
    webSocketService.on('connected', handleConnected);
    webSocketService.on('disconnected', handleDisconnected);

    // If no data received after 30s, stop loading anyway
    const maxWaitTimer = setTimeout(() => setLoading(false), 30000);

    return () => {
      clearTimeout(longWaitTimer);
      clearTimeout(maxWaitTimer);
      webSocketService.off('sensor_data', handleSensorData);
      webSocketService.off('alerts', handleAlerts);
      webSocketService.off('connected', handleConnected);
      webSocketService.off('disconnected', handleDisconnected);
      webSocketService.disconnect();
    };
  }, [webSocketService]);

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const handleAlertDismiss = (index) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {loading && (
        <UniversalLoader
          message={
            longWait
              ? "The backend is currently spinning up due to inactivity. This may take up to a minute. Please be patient while the backend service goes live."
              : "Fetching data from the backend. Please be patient while the backend service goes live."
          }
        />
      )}

      <NavigationBar 
        currentView={currentView}
        onViewChange={handleViewChange}
        isConnected={isConnected}
        alertCount={alerts.filter(alert => alert.type === 'critical' || alert.type === 'danger').length}
      />
      
      <main className="pt-16">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SensorDashboard sensorData={sensorData} />
            </motion.div>
          )}
          
          {currentView === '3d' && (
            <motion.div
              key="3d-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="h-screen"
            >
              <CraneVisualization sensorData={sensorData} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <AlertPanel 
        alerts={alerts}
        onDismiss={handleAlertDismiss}
      />
    </div>
  );
}

export default App;