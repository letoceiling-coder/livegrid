import { Outlet } from 'react-router-dom';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';

/**
 * Single shell for public site: redesign header + page content + shared footer.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-background">
      <RedesignHeader />
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
      <FooterSection />
    </div>
  );
}
