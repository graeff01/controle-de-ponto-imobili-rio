import { Bell, Search } from 'lucide-react';

export default function Header({ title, subtitle }) {
  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40">
      <div className="px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              {title}
            </h1>
            {subtitle && (
              <p className="text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all w-64"
              />
            </div>

            {/* Notifications Icon (placeholder) */}
            <button className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <Bell size={20} className="text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Current Date */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-right">
                <p className="text-xs text-slate-500">Hoje</p>
                <p className="text-sm font-semibold text-slate-700">
                  {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}