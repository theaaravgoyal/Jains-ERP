import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, Settings } from 'lucide-react';
import * as Icons from 'lucide-react';
import { ROUTES } from '../constants/Routes';

// Reusable Dynamic Icon Renderer mapping string name to Lucide components
const DynamicIcon = ({ name, size = 20, className = '' }) => {
  const IconComponent = Icons[name] || Icons.HelpCircle;
  return <IconComponent size={size} className={className} />;
};

const navItems = [
  { name: 'Dashboard', path: ROUTES.DASHBOARD, Icon: LayoutDashboard },
  { name: 'Modules',   path: ROUTES.MODULES,   Icon: LayoutGrid },
  { name: 'Settings',  path: ROUTES.SETTINGS,  Icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside
      className="
        fixed left-4 top-1/2 -translate-y-1/2 z-50
        flex flex-col items-center gap-1
        bg-white/90 backdrop-blur-md
        border border-slate-200
        rounded-2xl
        shadow-xl shadow-slate-100/50
        px-5 py-5
        w-[4.25rem]
        h-[min(70vh,37.5rem)]
      "
    >
      {/* Nav items */}
      <nav className="flex flex-col items-center w-full gap-5 flex-1 pb-2">
        {navItems.map(({ name, path, Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              title={name}
              className={`
                relative group flex flex-col items-center justify-center
                w-9 h-9 rounded-xl shrink-0
                transition-all duration-200
                ${name === 'Settings' ? 'mt-auto' : ''}
                ${isActive
                  ? 'bg-slate-100 border border-slate-200 shadow-sm shadow-slate-150/60 text-brand-red'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-650 border border-transparent hover:border-slate-200'
                }
              `}
            >

              <Icon
                size={19}
                className={`
                  transition-transform duration-200
                  ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                `}
              />

              {/* Tooltip label on hover */}
              <span
                className="
                  pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2
                  px-2.5 py-1 rounded-lg
                  bg-slate-800 text-white text-xs font-medium
                  opacity-0 group-hover:opacity-100
                  translate-x-[-4px] group-hover:translate-x-0
                  transition-all duration-200
                  whitespace-nowrap shadow-lg
                  z-50
                "
              >
                {name}
                {/* Arrow */}
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
export { DynamicIcon };
