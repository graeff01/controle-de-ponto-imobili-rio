import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <Sidebar />
      
      <div className="ml-[280px] transition-all duration-300">
        <Header title={title} subtitle={subtitle} />
        
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}