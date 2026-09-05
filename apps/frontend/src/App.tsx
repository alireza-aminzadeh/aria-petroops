import { Navigate, Route, Routes } from 'react-router-dom';
import { getToken } from './lib/api';
import { Shell } from './layout/Shell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssetsPage } from './pages/AssetsPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { WorkOrderDetailPage } from './pages/WorkOrderDetailPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { AiPage } from './pages/AiPage';
import { AlarmsPage } from './pages/AlarmsPage';
import { EnergyPage } from './pages/EnergyPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Shell />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="work-orders" element={<WorkOrdersPage />} />
        <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="alarms" element={<AlarmsPage />} />
        <Route path="energy" element={<EnergyPage />} />
        <Route path="ai" element={<AiPage />} />
      </Route>
    </Routes>
  );
}
