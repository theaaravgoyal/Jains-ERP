import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, ArrowRight } from 'lucide-react';
import Card from '../../components/Card';
import { DynamicIcon } from '../../components/Sidebar';
import { COLORS } from '../../constants/Colors';
import { PERMISSIONS } from '../../constants/Permissions';

const Modules = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dynamically load permitted modules lists from user profile claims and filter unknown ones
  const permittedModules = (user?.permissions || []).filter(mod => 
    Object.values(PERMISSIONS).includes(mod.code)
  );

  // A helper map to assign specific accent color gradients for card aesthetics
  const colorSchemes = {
    [PERMISSIONS.ACCESS_ATTENDANCE]: {
      from: '#8cbbf2',
      to: '#6da4eb',
      shadow: 'shadow-[#8cbbf2]/10',
      border: 'border-white/10'
    },
    [PERMISSIONS.ACCESS_FEES]: {
      from: '#f5b849',
      to: '#f79331',
      shadow: 'shadow-[#f79331]/10',
      border: 'border-white/10'
    },
    [PERMISSIONS.ACCESS_LEADS]: {
      from: '#f09a96',
      to: '#e67570',
      shadow: 'shadow-[#e67570]/10',
      border: 'border-white/10'
    },
    [PERMISSIONS.ACCESS_CERTIFICATES]: {
      from: '#7bd48a',
      to: '#5bbd6c',
      shadow: 'shadow-[#5bbd6c]/10',
      border: 'border-white/10'
    }
  };

  const defaultColorScheme = {
    from: '#8cbbf2',
    to: '#6da4eb',
    shadow: 'shadow-[#8cbbf2]/10',
    border: 'border-white/10'
  };

  const descriptions = {
    [PERMISSIONS.ACCESS_ATTENDANCE]: 'Track personnel logs, manage check-ins/outs, and generate real-time attendance reports.',
    [PERMISSIONS.ACCESS_FEES]: 'Oversee accounts receivables, client billing profiles, receipts, and outstanding dues.',
    [PERMISSIONS.ACCESS_LEADS]: 'Monitor website inquiries, track counseling logs, and optimize marketing source conversions.',
    [PERMISSIONS.ACCESS_CERTIFICATES]: 'Generate authentic student certificates, verify enrollment IDs, and manage graduation credentials.'
  };

  const defaultDescription = 'Manage administration, process reports, and execute role activities.';

  return (
    <div className="flex flex-col min-h-[70vh] justify-center space-y-8 font-sans py-8 w-full">
      {/* Grid of Module Cards */}
      <div className="flex flex-col flex-1 justify-center space-y-8">
        <div className="flex-shrink-0 text-center">
          <h2 className="text-[32px] font-black text-brand-red tracking-tight">Your Modules</h2>
          <p className="text-xs text-slate-450 mt-1.5 font-semibold">Select an active module card below to begin administrative tasks.</p>
        </div>

        {permittedModules.length === 0 ? (
          <Card className="text-center py-12 bg-rose-50/50 border-rose-100">
            <p className="text-slate-400 font-medium">No permitted modules found for your role profile.</p>
          </Card>
        ) : (
          <div className="flex flex-nowrap gap-6 h-full w-full px-4">
            {permittedModules.map((mod, index) => {
              const scheme = colorSchemes[mod.code] || defaultColorScheme;
              const desc = descriptions[mod.code] || defaultDescription;

              // Combined background logic (radial gradient for rings + linear gradient for color)
              const gradientStyle = {
                backgroundImage: `radial-gradient(circle at 100% 100%, transparent 35%, rgba(255,255,255,0.06) 36%, rgba(255,255,255,0.06) 37%, transparent 38%, transparent 55%, rgba(255,255,255,0.06) 56%, rgba(255,255,255,0.06) 57%, transparent 58%, transparent 75%, rgba(255,255,255,0.06) 76%, rgba(255,255,255,0.06) 77%, transparent 78%), linear-gradient(to bottom right, ${scheme.from}, ${scheme.to})`
              };

              return (
                <div
                  key={index}
                  onClick={() => navigate(mod.route)}
                  style={gradientStyle}
                  className={`relative overflow-hidden flex flex-col justify-between p-6 rounded-[28px] border ${scheme.border} ${scheme.shadow} h-[55vh] cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl active:scale-98 group`}
                >
                  {/* Top Block: Status and Icon */}
                  <div className="flex justify-between items-start w-full">
                    <span className="inline-block text-[10px] font-extrabold uppercase bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-lg tracking-wider">
                      Active
                    </span>

                    {/* Glassmorphic 3D-Like Icon Box */}
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md border border-white/30 rounded-[22px] shadow-lg flex items-center justify-center transform rotate-12 group-hover:rotate-6 transition-all duration-300 group-hover:scale-105 pointer-events-none overflow-hidden">
                      <div className="absolute top-0 left-0 w-8 h-8 bg-white/30 blur-md pointer-events-none rounded-full" />
                      <DynamicIcon name={mod.icon} size={36} className="text-white drop-shadow-md transition-transform group-hover:translate-y-[-1.5px] duration-300" />
                    </div>
                  </div>

                  {/* Middle Block: Content (Vertically Centered) */}
                  <div className="flex-1 flex flex-col justify-center my-6 space-y-3.5">
                    <h3 className="text-xl font-extrabold text-white tracking-tight leading-tight">
                      {mod.module}
                    </h3>
                    <p className="text-[13px] text-white/95 leading-relaxed font-semibold line-clamp-8">
                      {desc}
                    </p>
                  </div>

                  {/* Bottom Block: Action Button */}
                  <div className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs font-bold transition-all shadow-md active:scale-95 w-fit">
                    <span>Visit site</span>
                    <ArrowRight size={13} className="text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modules;
