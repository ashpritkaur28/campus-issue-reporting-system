import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { DocumentationView } from './components/DocumentationView';
import { MlClassifierView } from './components/MlClassifierView';
import { Navbar } from './components/Navbar';
import { StudentComplaintForm } from './components/StudentComplaintForm';
import { AppView, IssueCategory } from './types/complaint';

const FALLBACK_CATEGORIES: IssueCategory[] = [
  'Network & Wi-Fi',
  'IT & Lab Equipment',
  'Electrical & Lighting',
  'Plumbing & Water',
  'Cleanliness & Sanitation',
  'Infrastructure & Furniture',
  'Hostel & Mess',
  'Library & Academic',
  'Security & Safety',
];

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('report');
  const [categories, setCategories] = useState<IssueCategory[]>(FALLBACK_CATEGORIES);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch(() => {
        // Fallback categories already loaded
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar activeView={activeView} onNavigate={setActiveView} />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {activeView === 'report' && <StudentComplaintForm categories={categories} />}
        {activeView === 'admin' && (
          <AdminDashboard
            categories={categories}
            token={adminToken}
            onTokenChange={setAdminToken}
          />
        )}
        {activeView === 'ml' && <MlClassifierView />}
        {activeView === 'docs' && <DocumentationView />}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Campus Issue Reporting System · Software Engineering [CS3CO40]</span>
          <span>Student Complaint Portal & Administrator Analytics</span>
        </div>
      </footer>
    </div>
  );
}
