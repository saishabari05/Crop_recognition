import { Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Button from './Button';
import logo from '../assets/logo.png';

function Navbar({ onOpenMenu }) {
  return (
    <div className="sticky top-4 z-30 page-wrap">
      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass flex items-center justify-between px-6 py-5"
      >
        <Link to="/" className="flex items-center gap-4 rounded-3xl bg-white/80 px-4 py-2.5 ring-1 ring-[#ebe3d7]">
          <img src={logo} alt="AgriVision logo" className="h-12 w-12 rounded-2xl bg-[#fbf7ef] p-1.5 object-contain shadow-sm" />
          <div className="leading-none">
            <p className="text-[2rem] font-semibold tracking-[-0.035em] text-text-dark">AgriVision</p>
            <p className="mt-1.5 text-[0.68rem] uppercase tracking-[0.24em] text-text-muted">Crop Intelligence Platform</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-3 lg:flex">
          {[
            ['#features', 'Features'],
            ['#workflow', 'How it Works'],
            ['#start', 'Get Started'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-4 py-2 text-sm font-medium text-text-mid transition hover:bg-white/80 hover:text-text-dark"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden sm:block">
            <Button variant="secondary" className="px-5 py-2.5">Login</Button>
          </Link>
          <Link to="/login" className="hidden lg:block">
            <Button className="px-6 py-2.5">Get Started</Button>
          </Link>
          <button onClick={onOpenMenu} className="rounded-full bg-moss-pale p-3 text-moss lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </motion.header>
    </div>
  );
}

export default Navbar;
