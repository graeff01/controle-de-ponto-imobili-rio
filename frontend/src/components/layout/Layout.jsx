import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, title, subtitle }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="md:ml-[280px] transition-all duration-300 ml-0">
        <Header
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}