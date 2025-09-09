import { Link } from "react-router";
import type { Route } from "./+types/home";
import { motion } from 'framer-motion';
import NotesBrowser from "~/components/NotesBrowser";
import type { NoteRecordRepresentation } from "~/models";
import NotesBody from "~/components/NotesBody";
import { useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

const Home: React.FC = () => {

    const [noteOpen, setNoteOpen] = useState<NoteRecordRepresentation | null>(null)

  return (
    <div className="max-h-screen bg-neutral-950 text-neutral-200 font-sans p-1">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center py-1"
      >
        <div className="font-bold text-2xl tracking-tighter">NOTNOTES</div>
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
        <div className="max-w-xs w-full h-full"><NotesBrowser onNoteClicked={(note) => setNoteOpen(note)}></NotesBrowser></div>
        <div className="flex-1 h-full"><NotesBody noteOpen={noteOpen}/></div>
      </main>
    </div>
  );
};

export default Home;