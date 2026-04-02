import { motion } from 'framer-motion';
import logo from '../assets/logo.png';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="text-center">
        <motion.img
          initial={{ opacity: 0, scale: 0.88, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          src={logo}
          alt="AgriVision logo"
          className="mx-auto h-52 w-52 rounded-[2.8rem] bg-white p-4 object-contain shadow-[0_20px_48px_-28px_rgba(49,82,55,0.28)]"
        />
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-8 text-lg text-text-mid"
        >
          AI-powered crop intelligence for the modern farmer
        </motion.p>
      </div>
    </div>
  );
}

export default Splash;
