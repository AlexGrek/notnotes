import { RefreshCw, CheckCircle2, Loader2, Save, XCircle } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { type NoteNodeRepresentation, type NoteRecordRepresentation } from "~/models";
import { authFetch } from "~/utils";
import { BoldItalicUnderlineToggles, CodeToggle, CreateLink, DiffSourceToggleWrapper, headingsPlugin, InsertCodeBlock, InsertFrontmatter, InsertImage, InsertTable, InsertThematicBreak, listsPlugin, ListsToggle, markdownShortcutPlugin, MDXEditor, quotePlugin, tablePlugin, thematicBreakPlugin, toolbarPlugin, UndoRedo } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

// Define the possible synchronization states
type SyncState = 'synced' | 'unsaved' | 'saving' | 'error';

interface PathItem {
    id: string;
    name: string;
}

export interface NotesBrowserProps {
    noteOpen: NoteRecordRepresentation | null
}

// A new component to render the status icon based on the sync state
const SyncStatusIcon = ({ state }: { state: SyncState }) => {
    switch (state) {
        case 'synced':
            return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        case 'unsaved':
            return <Save className="w-5 h-5 text-yellow-500" />;
        case 'saving':
            return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
        case 'error':
            return <XCircle className="w-5 h-5 text-red-500" />;
        default:
            return null;
    }
};


export default function NotesBody({ noteOpen }: NotesBrowserProps) {
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState<NoteRecordRepresentation | null>(noteOpen);
    const [data, setData] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [syncState, setSyncState] = useState<SyncState>('synced');

    // Ref to prevent the debouncer from running on the initial data load
    const isInitialMount = useRef(true);

    const loadData = async () => {
        if (!noteOpen) return;
        try {
            setLoading(true);
            setError(null);
            setSyncState('synced'); // Reset sync state for the new note
            isInitialMount.current = true; // Set flag to prevent initial save trigger

            const response = await authFetch(`/api/v1/notes/nodes?id=${noteOpen.id.id}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const jsonData = await response.json();
            setNote(jsonData); // Also update the note object itself if needed
            setData(jsonData.data || ""); // Ensure data is not null
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
            setError(errorMessage);
            setSyncState('error');
            console.error('Failed to load notes:', err);
        } finally {
            setLoading(false);
        }
    };

    // Memoize sendData to ensure the debouncing effect has a stable reference
    const sendData = useCallback(async () => {
        if (!noteOpen) return;
        setSyncState('saving');
        try {
            const response = await authFetch(`/api/v1/notes/update_note`, {
                method: "POST",
                body: JSON.stringify({
                    id: noteOpen.id.id,
                    name: note?.name,
                    attachments: note?.attachments,
                    body: data,
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            setSyncState('synced');
        } catch (err) {
            setSyncState('error');
            console.error('Failed to save note:', err);
        }
    }, [noteOpen, note, data]);

    // Effect to handle the initial loading of a note
    useEffect(() => {
        if (noteOpen) {
            loadData();
        }
    }, [noteOpen]);


    // Debouncing effect for saving data after user edits
    useEffect(() => {
        // Don't run on the very first load/render
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // If there are changes, mark as unsaved
        setSyncState('unsaved');

        // Set up a timer to save the data after 1.5 seconds of inactivity
        const handler = setTimeout(() => {
            sendData();
        }, 1500); // 1.5-second delay

        // Cleanup function: clear the timeout if the user makes another change
        return () => {
            clearTimeout(handler);
        };
    }, [data, note?.name, sendData]); // Rerun whenever the content or title changes


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
        <div className="bg-neutral-900 text-gray-100 rounded-lg overflow-hidden min-h-96 flex flex-col">
            {note && (
                <div className="flex items-center gap-2 p-2 border-b border-gray-700">
                    <SyncStatusIcon state={syncState} />
                    <input
                        value={note.name}
                        onChange={(ev) => setNote({ ...note, name: ev.target.value })}
                        placeholder="Note title"
                        className="w-full bg-transparent text-lg font-semibold focus:outline-none"
                    />
                </div>
            )}
            <div className="flex-grow">
                <MDXEditor
                    className="dark-theme dark-editor"
                    markdown={data}
                    onChange={setData}
                    plugins={[
                        tablePlugin(),
                        toolbarPlugin({
                            toolbarContents: () => <>
                                <InsertTable />
                                <UndoRedo />
                                <BoldItalicUnderlineToggles />
                                <CodeToggle />
                                <CreateLink />
                                <InsertCodeBlock />
                                <InsertFrontmatter />
                                <InsertImage />
                                <ListsToggle />
                                <InsertThematicBreak />

                            </>
                        }),
                        headingsPlugin(),
                        listsPlugin(),
                        quotePlugin(),
                        thematicBreakPlugin(),
                        markdownShortcutPlugin()

                    ]}
                />
            </div>
        </div>
    );
}