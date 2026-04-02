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
          className="mx-auto h-36 w-36 rounded-[2.4rem] bg-white p-3 object-contain shadow-[0_18px_40px_-28px_rgba(49,82,55,0.28)]"
        />
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-8 text-6xl text-text-dark"
        >
          AgriVision
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-4 text-lg text-text-mid"
        >
          AI-powered crop intelligence for the modern farmer
        </motion.p>
      </div>
    </div>
  );
}

export default Splash;
