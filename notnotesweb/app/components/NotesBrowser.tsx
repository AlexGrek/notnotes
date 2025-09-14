import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRight,
    ArrowUp,
    FileDown,
    FilePlus,
    FilePlus2,
    FileText,
    Folder,
    FolderPlus,
    Home,
    PlusSquare,
    RefreshCw,
    Trash2,
    Share2,
    Globe
} from "lucide-react";
import React, { useCallback, useMemo } from "react";
import { useEffect, useState } from "react";
import { isNoteRecordRepresentation, parseNoteRoot, type NoteNodeRepresentation, type NoteRecordRepresentation, type NoteRootRepresentation } from "~/models";
import { authFetch } from "~/utils";
import ConfirmationModal from "./ConfirmationModal";
import ShareMenu, { gatherContactsFromTree } from "./ShareMenu";


interface PathItem {
    id: string;
    name: string;
}

export interface NotesBrowserProps {
    onNoteClicked: (note: NoteRecordRepresentation | null) => void;
}


export default function NotesBrowser({ onNoteClicked }: NotesBrowserProps) {
    const [noteRoot, setNoteRoot] = useState<NoteRootRepresentation | null>(null);
    const [currentPath, setCurrentPath] = useState<PathItem[]>([]);
    const [currentNodes, setCurrentNodes] = useState<NoteNodeRepresentation[]>([]);
    const [loading, setLoading] = useState(true);
    const [nodeId, setNodeId] = useState<string | null>(null)
    const [currentOpenNode, setCurrentOpenNode] = useState<NoteNodeRepresentation | null>(null)
    const [error, setError] = useState<string | null>(null);

    const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const [publishMenuOpen, setPublishMenuOpen] = useState(false);


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

    const handleDelete = () => setDeleteMenuOpen(true)

    const findNodeById = (nodes: NoteNodeRepresentation[], id: string): NoteNodeRepresentation | null => {
        for (const node of nodes) {
            if (node.id.id === id) return node;
            const found = findNodeById(node.children, id);
            if (found) return found;
        }
        return null;
    };

    const post = async (url: string, body: any, method: string = "POST") => {
        try {
            const response = await authFetch(`/api/v1/${url}`, {
                method: method,
                body: body
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (err) {
            setError(String(err))
            console.error(err);
        }
    }

    const handleDeleteConfirmed = async () => {
        if (nodeId != null) {
            await post(`/notes/nodes?id=${nodeId}`, {}, "DELETE");
            handleGoUp()
        }
        setDeleteMenuOpen(false)
        onNoteClicked(null)
        loadData()
    }

    const handleShare = () => { setShareMenuOpen(!shareMenuOpen) }
    const handlePublish = () => { }

    const handleNodeClick = (node: NoteNodeRepresentation) => {
        setCurrentOpenNode(node);
        // If it's a note with content, notify the parent component to display it
        if (isNoteRecordRepresentation(node)) {
            onNoteClicked(node);
        }

        // Always treat the clicked node as a container and navigate into it.
        // If it has no children, the view will correctly show an empty state.
        setCurrentPath([...currentPath, { id: node.id.id, name: node.name }]);
        setCurrentNodes(node.children);
        setNodeId(node.id.id);
    };

    const handleGoUp = () => {
        if (currentPath.length === 0) return;

        const newPath = currentPath.slice(0, -1);
        setCurrentPath(newPath);

        if (newPath.length === 0) {
            // Back to root
            setNodeId(null);
            setCurrentOpenNode(null);
            setCurrentNodes(noteRoot?.rootNodes || []);
        } else {
            // Find the parent node
            const parentId = newPath[newPath.length - 1].id;
            setNodeId(parentId);
            const parentNode = findNodeById(noteRoot?.rootNodes || [], parentId);
            setCurrentOpenNode(parentNode);
            setCurrentNodes(parentNode?.children || []);
        }
    };

    const handleCreateDirectory = useCallback(async () => {
        // TODO: Implement directory creation logic
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
            setError(err instanceof Error ? err.message : 'Failed to create note');
            console.error('Failed to create note:', err);
        } finally {
            setLoading(false);
        }
    }, [currentPath, loadData])

    const handleGoToRoot = () => {
        setCurrentPath([]);
        setCurrentNodes(noteRoot?.rootNodes || []);
    };

    const contacts = useMemo(() => {
        if (noteRoot == null) {
            return []
        }
        return gatherContactsFromTree(noteRoot.rootNodes)
    }, [noteRoot])

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

    if (loading && currentNodes.length == 0) {
        return (
            <div className="bg-neutral-900 text-gray-100 p-6 rounded-lg min-h-96 flex items-center justify-center h-full">
                <div className="flex items-center space-x-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Loading notes...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-neutral-900 text-gray-100 p-6 rounded-lg min-h-96 h-full">
                <div className="text-red-400 mb-4">Error: {error}</div>
                <button
                    onClick={loadData}
                    className="px-4 py-2 bg-neutral-600 hover:bg-neutral-700 rounded-md transition-colors duration-200 flex items-center space-x-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry</span>
                </button>
            </div>
        );
    }

    return (
        <div className="h-full bg-neutral-900 text-gray-100 rounded-lg overflow-hidden">
            <ConfirmationModal isVisible={deleteMenuOpen} title="Delete node" message={`Are you sure you want to delete this item and all its child items? This cannot be undone.`} confirmText="Yes, delete" onCancel={() => setDeleteMenuOpen(false)} onConfirm={handleDeleteConfirmed} />
            {/* Header with path and navigation */}
            {!shareMenuOpen && <div className="bg-neutral-800 border-b border-neutral-700 p-2">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2 flex-wrap">
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
                        <button
                            onClick={handleCreateDirectory}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200"
                            title="Create directory"
                        >
                            <FolderPlus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleCreateNote}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200"
                            title="Create note here"
                        >
                            <FilePlus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleCreateNote}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200"
                            title="Create child note"
                        >
                            <FileDown className="w-4 h-4" />
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
                    </button>

                    {currentPath.map((pathItem, index) => (
                        <React.Fragment key={pathItem.id}>
                            <ArrowRight className="w-3 h-3 text-neutral-500" />
                            <button
                                onClick={() => handlePathClick(index)}
                                className="px-2 py-1 rounded hover:bg-neutral-700 transition-colors duration-200"
                            >
                                {pathItem.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            </div>}

            {shareMenuOpen && currentOpenNode != null && <ShareMenu item={currentOpenNode} contacts={contacts} onClose={() => setShareMenuOpen(false)} />}

            {/* Action Menu */}
            <div className="bg-neutral-800 border-b border-neutral-700 p-2 flex items-center space-x-2">
                <button
                    title="Delete"
                    onClick={handleDelete}
                    className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:hover:text-neutral-400"
                    disabled={!currentOpenNode} // Example disabled state
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                <button
                    title="Share"
                    onClick={handleShare}
                    className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-neutral-700 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:hover:text-neutral-400"
                    disabled={!currentOpenNode || shareMenuOpen}
                >
                    <Share2 className="w-4 h-4" />
                </button>
                <button
                    title="Publish"
                    onClick={handlePublish}
                    className="p-2 text-neutral-400 hover:text-green-400 hover:bg-neutral-700 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:hover:text-neutral-400"
                    disabled={!currentOpenNode}
                >
                    <Globe className="w-4 h-4" />
                </button>
            </div>

            {/* File browser content */}
            <div className="max-h-full scroll-auto p-3">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPath.map(p => p.id).join('/')}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2 max-h-full"
                    >
                        {currentNodes.length === 0 ? (
                            <div className="text-gray-500 text-center py-8">
                                This folder is empty
                                <div className="flex justify-center space-x-4 mt-4">
                                    <button onClick={handleCreateDirectory} className="flex flex-col items-center p-4 rounded-lg hover:bg-neutral-800 transition-colors duration-200">
                                        <FolderPlus className="w-8 h-8 mb-1" />
                                        <span>New Directory</span>
                                    </button>
                                    <button onClick={handleCreateNote} className="flex flex-col items-center p-4 rounded-lg hover:bg-neutral-800 transition-colors duration-200">
                                        <FilePlus2 className="w-8 h-8 mb-1" />
                                        <span>New Note</span>
                                    </button>
                                </div>
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
                                        <div className="font-medium truncate">{node.name || <span className="italic text-neutral-500">Untitled</span>}</div>
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
                        {currentPath.length == 0 && <>
                            <h3><Share2 />Shared</h3>
                            {noteRoot?.sharedNodes.map((node) => (
                                <motion.div
                                    key={node.id.id}
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleNodeClick(node)}
                                    className="flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-800"
                                >
                                    <p>{JSON.stringify(node)}</p>
                                    <div className="flex-shrink-0">
                                        {isNoteRecordRepresentation(node) ? (
                                            <FileText className="w-5 h-5 text-blue-400" />
                                        ) : (
                                            <Folder className="w-5 h-5 text-yellow-400" />
                                        )}
                                    </div>

                                    <div className="flex-grow min-w-0">
                                        <div className="font-medium truncate">{node.name || <span className="italic text-neutral-500">Untitled</span>}</div>
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
                            ))}
                        </>}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
