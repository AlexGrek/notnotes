import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUp, FileText, Folder, Home, RefreshCw } from "lucide-react";
import React from "react";
import { useEffect, useState } from "react";
import { isNoteRecordRepresentation, parseNoteRoot, type NoteNodeRepresentation, type NoteRecordRepresentation, type NoteRootRepresentation } from "~/models";
import { authFetch } from "~/utils";
import { MDXEditor } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'


interface PathItem {
    id: string;
    name: string;
}

export interface NotesBrowserProps {
    noteOpen: NoteRecordRepresentation | null
}


export default function NotesBody({ noteOpen }: NotesBrowserProps) {
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState(noteOpen);
    const [data, setData] = useState("");
    const [error, setError] = useState<string | null>(null);


    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const id = noteOpen?.id.id || "";
            const response = await authFetch(`/api/v1/notes/nodes?id=${id}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const jsonData = await response.json();
            setData(jsonData.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load notes');
            console.error('Failed to load notes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (noteOpen != null)
            loadData();
    }, [noteOpen]);

    const findNodeById = (nodes: NoteNodeRepresentation[], id: string): NoteNodeRepresentation | null => {
        for (const node of nodes) {
            if (node.id.id === id) return node;
            const found = findNodeById(node.children, id);
            if (found) return found;
        }
        return null;
    };

    if (loading) {
        return (
            <div className="bg-gray-900 text-gray-100 p-6 rounded-lg min-h-96 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Loading note {noteOpen?.name || 'unknown'}...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gray-900 text-gray-100 p-6 rounded-lg min-h-96">
                <div className="text-red-400 mb-4">Error: {error}</div>
                <button
                    onClick={loadData}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200 flex items-center space-x-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry</span>
                </button>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 text-gray-100 rounded-lg overflow-hidden min-h-96">
            {note && <div><input value={note.name} onChange={(ev) => setNote({ ...note, name: ev.target.value })} placeholder="Note title" /></div>}
            {data != null && <MDXEditor className="dark-theme dark-editor" markdown={data} />}
        </div>
    );
}
