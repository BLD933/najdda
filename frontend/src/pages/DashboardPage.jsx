import React from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { 
  LogOut, 
  User as UserIcon, 
  Settings, 
  ChevronRight, 
  Activity as ActivityIcon, 
  ShieldAlert,
  MapPin 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const EMERGENCY_BY_COUNTRY = {
  Morocco: '150', Algeria: '14', Tunisia: '190', France: '15', USA: '911', Canada: '911', UK: '999', Spain: '112',
};

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const emergencyNumber = EMERGENCY_BY_COUNTRY[user?.profile?.country || 'Morocco'] || '112';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-100">
      {/* Precision Navigation */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl">S</div>
          <h1 className="text-xl font-black tracking-tighter uppercase">SHIFAA</h1>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Live</span>
          </div>
          
          <div className="flex items-center gap-6">
            <Link to="/settings" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-all group">
              <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Passport</span>
            </Link>
            <button onClick={logout} className="text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-700 transition-colors">
              Exit
            </button>
          </div>
        </div>
      </nav>
      
      <main className="p-8 max-w-7xl mx-auto grid grid-cols-12 gap-8">
        
        {/* Main Interface: Left 8 Columns */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Hero: The Thesis */}
          <div className="relative overflow-hidden bg-[#0F172A] rounded-[2rem] p-10 text-white shadow-2xl shadow-blue-900/20">
            <div className="relative z-10">
              <span className="text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-4 block">Medical Status: Stable</span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
                Salam, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-400">{user?.fullName?.split(' ')[0]}</span>.
              </h2>
              <p className="text-slate-400 mt-4 text-lg max-w-md font-medium leading-relaxed">
                Your AI-specialized hospital is ready. Select a service to begin your digital consultation.
              </p>
            </div>
            {/* Abstract Background Element */}
            <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Tool: Triage */}
            <button
              onClick={() => navigate('/chat')}
              className="group relative bg-white border-2 border-slate-100 p-8 rounded-[2rem] text-left hover:border-blue-600 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 overflow-hidden"
            >
              <div className="relative z-10">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <ActivityIcon size={32} />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2">Symptom Triage</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">Speak with our lead nurse about what you are feeling. Structured analysis for safe guidance.</p>
                <div className="mt-8 flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Open Service <ChevronRight size={14} />
                </div>
              </div>
              {/* Subtle background number */}
              <span className="absolute -bottom-4 -right-2 text-9xl font-black text-slate-50/50 pointer-events-none transition-colors group-hover:text-blue-50">01</span>
            </button>

            {/* Emergency Tool */}
            <button
              onClick={() => window.open(`tel:${emergencyNumber}`, '_self')}
              className="group relative bg-white border-2 border-slate-100 p-8 rounded-[2rem] text-left hover:border-red-600 hover:shadow-xl hover:shadow-red-900/5 transition-all duration-300 overflow-hidden"
            >
              <div className="relative z-10">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2 text-red-600">Emergency SOS</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">Instant first-aid, hospital locator, and emergency contact notification. No conversation required.</p>
                <div className="mt-8 flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Active Mode <ChevronRight size={14} />
                </div>
              </div>
              <span className="absolute -bottom-4 -right-2 text-9xl font-black text-slate-50/50 pointer-events-none transition-colors group-hover:text-red-50">02</span>
            </button>
          </div>
        </div>

        {/* Clinical Sidebar: Right 4 Columns */}
        <aside className="col-span-12 lg:col-span-4 space-y-8">
          
          {/* The Signature Instrument: Medical Snapshot */}
          <div className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Identity Snapshot</h3>
              <Link to="/settings" className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-all">
                <Settings size={12} />
              </Link>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Vitals Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Blood Group</span>
                  <span className="text-2xl font-black text-red-600 font-mono tracking-tighter">{user?.profile?.bloodType || '--'}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Current BMI</span>
                  <span className="text-2xl font-black text-slate-800 font-mono tracking-tighter">
                    {user?.profile?.weight && user?.profile?.height 
                      ? (user.profile.weight / Math.pow(user.profile.height/100, 2)).toFixed(1)
                      : '--'}
                  </span>
                </div>
              </div>

              {/* Conditions List */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                  <div className="w-1 h-1 bg-blue-600 rounded-full"></div> 
                  Chronic Registry
                </h4>
                <div className="flex flex-wrap gap-2">
                  {user?.profile?.chronicDiseases?.split(', ').map((d, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                      {d}
                    </span>
                  ))}
                  {(!user?.profile?.chronicDiseases || user?.profile?.chronicDiseases === 'None (Healthy)') && (
                    <span className="text-sm text-slate-400 italic">No recorded conditions.</span>
                  )}
                </div>
              </div>

              {/* Medication Readout */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                  <div className="w-1 h-1 bg-green-500 rounded-full"></div> 
                  Active Medication
                </h4>
                <div className="space-y-2">
                  {user?.profile?.medications?.slice(0, 3).map((m, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="font-black text-slate-700 uppercase tracking-tight truncate max-w-[150px]">{m.nom}</span>
                      <span className="font-mono text-slate-400">{m.dosage1}</span>
                    </div>
                  ))}
                  {(!user?.profile?.medications || user?.profile?.medications.length === 0) && (
                    <p className="text-sm text-slate-400 italic">None currently active.</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Clinical Footer */}
            <div className="bg-[#0F172A] px-6 py-4 text-white flex items-center justify-between">
               <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 leading-none">Last Updated</span>
                 <span className="text-[10px] font-mono font-bold leading-none mt-1">
                   {user?.profile?.updatedAt
                      ? new Date(user.profile.updatedAt).toLocaleDateString()
                      : 'Not yet saved'}
                 </span>
               </div>
               <ShieldAlert size={16} className="text-blue-500 opacity-50" />
            </div>
          </div>

          {/* Quick Hospital Card */}
          <div className="bg-blue-600 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-900/10">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Primary Hospital</span>
            <p className="mt-2 font-bold leading-tight truncate">{user?.profile?.preferredHospital || 'None set'}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="font-mono text-[10px] opacity-60">
                {user?.profile?.latitude
                  ? `${user.profile.latitude.toFixed(4)}, ${user.profile.longitude.toFixed(4)}`
                  : 'Not set — enable in Passport'}
              </div>
              <MapPin size={14} className="text-white opacity-80" />
            </div>
          </div>

        </aside>
      </main>
    </div>
  );
};

export default DashboardPage;
