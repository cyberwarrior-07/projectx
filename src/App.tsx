import React from 'react';
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './lib/auth';
import { Layout } from './components/Layout';
import { MainLayout } from './components/MainLayout';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Services } from './pages/Services';
import { Contact } from './pages/Contact';
import { CourseList } from './pages/CourseList';
import { CourseView } from './pages/CourseView';
import { LessonView } from './pages/LessonView';
import { Dashboard } from './pages/Dashboard';
import Auth from './pages/Auth';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CourseManager } from './pages/admin/CourseManager';
import { CourseBuilder } from './pages/admin/CourseBuilder';
import { LessonManager } from './pages/admin/LessonManager';
import { UserManager } from './pages/admin/UserManager';
import { Analytics } from './pages/admin/Analytics';
import { MediaLibrary } from './pages/admin/MediaLibrary';
import { Calendar } from './pages/student/Calendar';
import { Gradebook } from './pages/student/Gradebook';
import { Settings } from './pages/admin/Settings';
import { AuthGuard } from './components/AuthGuard';

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/courses" element={<CourseList />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
        <Route path="/auth" element={<Auth />} />
        <Route element={<AuthGuard><Layout /></AuthGuard>}>
          <Route path="/courses/:courseId" element={<CourseView />} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonView />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/gradebook" element={<Gradebook />} />
        </Route>
        <Route path="/admin" element={<AuthGuard requiredRole="admin"><AdminLayout /></AuthGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="courses" element={<CourseManager />} />
          <Route path="courses/new" element={<CourseBuilder />} />
          <Route path="courses/:courseId" element={<CourseBuilder />} />
          <Route path="courses/:courseId/lessons" element={<LessonManager />} />
          <Route path="users" element={<UserManager />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;