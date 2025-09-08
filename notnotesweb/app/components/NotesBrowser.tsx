import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUp, FilePlus2, FileText, Folder, Home, PlusSquare, RefreshCw } from "lucide-react";
import React, { useCallback } from "react";
import { useEffect, useState } from "react";
import { isNoteRecordRepresentation, parseNoteRoot, type NoteNodeRepresentation, type NoteRecordRepresentation, type NoteRootRepresentation } from "~/models";
import { authFetch } from "~/utils";


interface PathItem {
    id: string;
    name: string;
}

export interface NotesBrowserProps {
    onNoteClicked: (note: NoteRecordRepresentation) => void;
}


export default function NotesBrowser({ onNoteClicked }: NotesBrowserProps) {
    const [noteRoot, setNoteRoot] = useState<NoteRootRepresentation | null>(null);
    const [currentPath, setCurrentPath] = useState<PathItem[]>([]);
    const [currentNodes, setCurrentNodes] = useState<NoteNodeRepresentation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await authFetch("/api/v1/notes/tree");

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const jsonData = await response.json();
            const parsedRoot = parseNoteRoot(jsonData);

            setNoteRoot(parsedRoot);
            setCurrentNodes(parsedRoot.rootNodes);
            setCurrentPath([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load notes');
            console.error('Failed to load notes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const findNodeById = (nodes: NoteNodeRepresentation[], id: string): NoteNodeRepresentation | null => {
        for (const node of nodes) {
            if (node.id.id === id) return node;
            const found = findNodeById(node.children, id);
            if (found) return found;
        }
        return null;
    };

    const handleNodeClick = (node: NoteNodeRepresentation) => {
        if (isNoteRecordRepresentation(node)) {
            onNoteClicked(node);
        }

        // Navigate into the node if it has children
        if (node.children.length > 0) {
            setCurrentPath([...currentPath, { id: node.id.id, name: node.name }]);
            setCurrentNodes(node.children);
        }
    };

    const handleGoUp = () => {
        if (currentPath.length === 0) return;

        const newPath = currentPath.slice(0, -1);
        setCurrentPath(newPath);

        if (newPath.length === 0) {
            // Back to root
            setCurrentNodes(noteRoot?.rootNodes || []);
        } else {
            // Find the parent node
            const parentId = newPath[newPath.length - 1].id;
            const parentNode = findNodeById(noteRoot?.rootNodes || [], parentId);
            setCurrentNodes(parentNode?.children || []);
        }
    };

    const handleCreateDirectory = useCallback(async () => {

    }, [currentPath])

    const handleCreateNote = useCallback(async () => {
        try {
            let parent = null;
            if (currentPath.length > 0) {
                parent = currentPath[currentPath.length - 1].id
            }
            const body = {
                "name": "",
                "body": "",
                "attachments": [],
                "parent": parent
            }

            setError(null);
            const response = await authFetch("/api/v1/notes/create_note", { method: 'POST', body: JSON.stringify(body) });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            loadData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load notes');
            console.error('Failed to load notes:', err);
        } finally {
            setLoading(false);
        }
    }, [currentPath, loadData])

    const handleGoToRoot = () => {
        setCurrentPath([]);
        setCurrentNodes(noteRoot?.rootNodes || []);
    };

    const handlePathClick = (index: number) => {
        if (index === -1) {
            handleGoToRoot();
            return;
        }

        const newPath = currentPath.slice(0, index + 1);
        setCurrentPath(newPath);

        const targetId = newPath[newPath.length - 1].id;
        const targetNode = findNodeById(noteRoot?.rootNodes || [], targetId);
        setCurrentNodes(targetNode?.children || []);
    };

    if (loading) {
        return (
            <div className="bg-gray-900 text-gray-100 p-6 rounded-lg min-h-96 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Loading notes...</span>
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
            {/* Header with path and navigation */}
            <div className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        {currentPath.length > 0 && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleGoUp}
                                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200"
                                title="Go up one level"
                            >
                                <ArrowUp className="w-4 h-4" />
                            </motion.button>
                        )}
                        <button
                            onClick={loadData}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Breadcrumb path */}
                <div className="flex items-center space-x-1 text-sm">
                    <button
                        onClick={() => handlePathClick(-1)}
                        className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-700 transition-colors duration-200"
                    >
                        <Home className="w-4 h-4" />
                        <span>Root</span>
                    </button>

                    {currentPath.map((pathItem, index) => (
                        <React.Fragment key={pathItem.id}>
                            <ArrowRight className="w-3 h-3 text-gray-500" />
                            <button
                                onClick={() => handlePathClick(index)}
                                className="px-2 py-1 rounded hover:bg-gray-700 transition-colors duration-200"
                            >
                                {pathItem.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* File browser content */}
            <div className="p-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPath.map(p => p.id).join('/')}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2"
                    >
                        {currentNodes.length === 0 ? (
                            <div className="text-gray-500 text-center py-8">
                                This folder is empty
                                <button onClick={handleCreateDirectory}><PlusSquare /></button>
                                <button onClick={handleCreateNote}><FilePlus2 /></button>
                            </div>
                        ) : (
                            currentNodes.map((node) => (
                                <motion.div
                                    key={node.id.id}
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleNodeClick(node)}
                                    className="flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-800"
                                >
                                    <div className="flex-shrink-0">
                                        {isNoteRecordRepresentation(node) ? (
                                            <FileText className="w-5 h-5 text-blue-400" />
                                        ) : (
                                            <Folder className="w-5 h-5 text-yellow-400" />
                                        )}
                                    </div>

                                    <div className="flex-grow min-w-0">
                                        <div className="font-medium truncate">{node.name}</div>
                                        <div className="text-xs text-gray-400 flex items-center space-x-2">
                                            <span>
                                                {isNoteRecordRepresentation(node) ? 'Note' : 'Directory'}
                                            </span>
                                            {node.children.length > 0 && (
                                                <span>• {node.children.length} item{node.children.length !== 1 ? 's' : ''}</span>
                                            )}
                                            {isNoteRecordRepresentation(node) && node.attachments && node.attachments.length > 0 && (
                                                <span>• {node.attachments.length} attachment{node.attachments.length !== 1 ? 's' : ''}</span>
                                            )}
                                        </div>
                                    </div>

                                    {node.children.length > 0 && (
                                        <ArrowRight className="w-4 h-4 text-gray-500" />
                                    )}
                                </motion.div>
                            ))
                        )}

                    </motion.div>
                </AnimatePresence>
                <button className="cursor-pointer flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-700 transition-colors duration-200" onClick={handleCreateDirectory}><PlusSquare /><p>New directory</p></button>
                <button className="cursor-pointer flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-700 transition-colors duration-200" onClick={handleCreateNote}><FilePlus2 /><p>New note</p></button>
            </div>
        </div>
    );
}
