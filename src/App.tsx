import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Shell } from './components/Shell';
import { FullPageSpinner } from './components/ui';
import CalendarPage from './pages/CalendarPage';
import ClassesPage from './pages/ClassesPage';
import ClassPage from './pages/ClassPage';
import ClassicPage from './pages/ClassicPage';
import DashboardPage from './pages/DashboardPage';
import DueWorkPage from './pages/DueWorkPage';
import FeedbackPage from './pages/FeedbackPage';
import LoginPage from './pages/LoginPage';
import NewsArticlePage from './pages/NewsArticlePage';
import NewsPage from './pages/NewsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import TimetablePage from './pages/TimetablePage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading && session) return <FullPageSpinner label="Loading your iLINQ…" />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="due-work" element={<DueWorkPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="news/:id" element={<NewsArticlePage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="classes/:id" element={<ClassPage />} />
        <Route path="classic/*" element={<ClassicPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
