import { motion } from 'framer-motion';
import { Home, Briefcase, Wallet, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const FloatingNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/tasks', icon: Briefcase, label: 'Tasks' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/profile', icon: User, label: 'Profile' }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div
        className="backdrop-blur-2xl bg-black/60 border border-white/10 rounded-2xl shadow-2xl px-2 py-2"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
        }}
      >
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.9 }}
                whileHover={{ y: -2 }}
                className={`relative px-4 py-3 rounded-xl transition-all duration-300 ${
                  active
                    ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30'
                    : 'hover:bg-white/5'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                
                <div className="relative z-10">
                  <Icon
                    size={22}
                    className={active ? 'text-white' : 'text-gray-400'}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default FloatingNavbar;