import { Link } from "react-router";
import type { Route } from "./+types/home";
import { motion } from 'framer-motion';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-6">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center py-4"
      >
        <div className="font-bold text-2xl tracking-tighter">NOTNOTES</div>
        <nav>
          <Link
            to="/app"
            className="text-neutral-500 hover:text-neutral-200 transition-colors duration-200"
          >
            Sign In
          </Link>
        </nav>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <motion.h1
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-5xl md:text-7xl font-bold mb-4 tracking-tight"
        >
          Not your average notes app.
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-lg md:text-2xl text-neutral-400 mb-8 max-w-2xl"
        >
          Effortlessly sync, securely share, and trace every change with our
          tree-like history. Your knowledge, structured and always accessible.
        </motion.p>
        <div className="flex space-x-4">
          <motion.a
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            href="#"
            className="px-6 py-3 bg-neutral-200 text-neutral-950 font-medium rounded-lg hover:bg-neutral-400 transition-colors"
          >
            Download NOTNOTES
          </motion.a>
          <motion.a
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            href="/app"
            className="px-6 py-3 border border-neutral-600 text-neutral-200 font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Open Web App
          </motion.a>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-neutral-600 py-4">
        <p className="text-sm">
          © {new Date().getFullYear()} NOTNOTES. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
};

export default Home;