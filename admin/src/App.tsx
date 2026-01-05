import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { InboxPage } from './pages/InboxPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { MessagesPage } from './pages/MessagesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/inbox" replace />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
