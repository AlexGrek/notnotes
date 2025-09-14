import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { motion } from 'framer-motion';
import NotesBrowser from "~/components/NotesBrowser";
import type { NoteRecordRepresentation } from "~/models";
import NotesBody from "~/components/NotesBody";
import { useState, useEffect } from "react";
import { authFetch } from "~/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

const Home: React.FC = () => {
  const [noteOpen, setNoteOpen] = useState<NoteRecordRepresentation | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authFetch('/api/v1/auth/whoami');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.email || data.email === "null" || data.email === null) {
          navigate('/app');
          return;
        }
        
        setEmail(data.email);
        setIsLoading(false);
      } catch (error) {
        console.error('Authentication check failed:', error);
        navigate('/app');
      }
    };

    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-rows-[16px,1fr,16px] h-screen w-full p-1">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center py-1"
      >
        <div className="font-bold text-2xl tracking-tighter">NOTNOTES</div>
        <p>{email}</p>
        <nav>
          <Link
            to="/app"
            className="text-neutral-500 hover:text-neutral-200 transition-colors duration-200"
          >
            Exit
          </Link>
        </nav>
      </motion.header>
      {/* Main Content */}
      <main className="flex gap-2 h-full overflow-hidden">
        <div className="max-w-xs w-full h-full">
          <NotesBrowser onNoteClicked={setNoteOpen}></NotesBrowser>
        </div>
        <div className="flex-1 h-full">
          <NotesBody noteOpen={noteOpen}/>
        </div>
      </main>
      <div className="font-mono text-sm row-span-1"></div>
    </div>
  );
};

export default Home;