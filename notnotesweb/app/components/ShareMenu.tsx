import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown, Mail, Trash2, Save, Loader2, AlertCircle, Cross, StopCircle } from 'lucide-react';
import type { NoteNodeRepresentation } from '~/models';
import { authFetch } from '~/utils';


enum AccessLevel {
    READ = "READ",
    WRITE = "WRITE",
    ADMIN = "ADMIN"
}

interface ShareMenuProps {
    item: NoteNodeRepresentation;
    contacts: string[];
    onClose: () => void;
}

interface ShareEntry {
    email: string;
    accessLevel: AccessLevel;
    isNew?: boolean;
}

// Utility function to gather all contacts from a tree of NoteNodeRepresentation
export const gatherContactsFromTree = (nodes: NoteNodeRepresentation[]): string[] => {
    const contacts = new Set<string>();

    const processNode = (node: NoteNodeRepresentation) => {
        if (node.sharedWith) {
            Object.keys(node.sharedWith).forEach(email => {
                contacts.add(email);
            });
        }

        if (node.children && node.children.length > 0) {
            node.children.forEach(processNode);
        }
    };

    nodes.forEach(processNode);
    return Array.from(contacts);
};

const ShareMenu: React.FC<ShareMenuProps> = ({ item, contacts, onClose }) => {
    const [shareEntries, setShareEntries] = useState<ShareEntry[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [showContactsDropdown, setShowContactsDropdown] = useState(false);
    const [isLoading, setSaving] = useState(false);
    const [error, setError] = useState<string>('');
    const emailInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Initialize entries from existing sharedWith data
    useEffect(() => {
        if (item.sharedWith) {
            const entries = Object.entries(item.sharedWith).map(([email, accessLevel]) => ({
                email,
                accessLevel
            }));
            setShareEntries(entries);
        }
    }, [item.sharedWith]);


    const filteredContacts = contacts.filter(contact =>
        contact.toLowerCase().includes(newEmail.toLowerCase()) &&
        !shareEntries.some(entry => entry.email === contact)
    );

    const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const addShareEntry = (email: string, accessLevel: AccessLevel = AccessLevel.READ) => {
        if (!isValidEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (shareEntries.some(entry => entry.email === email)) {
            setError('This email is already shared');
            return;
        }

        setShareEntries([...shareEntries, { email, accessLevel, isNew: true }]);
        setNewEmail('');
        setError('');
        setShowContactsDropdown(false);
    };

    const removeShareEntry = (emailToRemove: string) => {
        setShareEntries(shareEntries.filter(entry => entry.email !== emailToRemove));
    };

    const updateAccessLevel = (email: string, newAccessLevel: AccessLevel) => {
        setShareEntries(shareEntries.map(entry =>
            entry.email === email ? { ...entry, accessLevel: newAccessLevel } : entry
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');

        try {
            const sharedWith: Record<string, AccessLevel> = {};
            shareEntries.forEach(entry => {
                sharedWith[entry.email] = entry.accessLevel;
            });

            const response = await authFetch(`/api/v1/notes/share?id=${item.id.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sharedWith }),
            });

            if (!response.ok) {
                throw new Error('Failed to update sharing settings');
            }

            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newEmail.trim()) {
            addShareEntry(newEmail.trim());
        }
    };

    return (
        <div className="bg-black/50 flex items-center justify-center">
            <div className="bg-neutral-900 w-full max-w-md p-2 max-h-[80vh] overflow-hidden">

                {/* Content */}
                <div className="max-h-96 overflow-y-auto">
                    {/* Add new email */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-300">
                            Add people
                        </label>
                        <div className="relative" ref={dropdownRef}>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    ref={emailInputRef}
                                    type="email"
                                    placeholder="Enter email address"
                                    value={newEmail}
                                    onChange={(e) => {
                                        setNewEmail(e.target.value);
                                        setShowContactsDropdown(true);
                                        setError('');
                                    }}
                                    onKeyPress={handleKeyPress}
                                    onFocus={() => setShowContactsDropdown(true)}
                                    className="w-full pl-9 pr-10 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    onClick={() => newEmail.trim() && addShareEntry(newEmail.trim())}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {/* Contacts dropdown */}
                            {showContactsDropdown && filteredContacts.length > 0 && (
                                <div className="absolute space-y-2 z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                    {filteredContacts.map((contact, index) => (
                                        <button
                                            key={index}
                                            onClick={() => addShareEntry(contact)}
                                            className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 transition-colors"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <Mail size={14} className="text-gray-400" />
                                                <div>
                                                    <div className="font-medium">{contact}</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Current shares */}
                    {shareEntries.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">
                                People with access
                            </label>
                            <div className="space-y-2">
                                {shareEntries.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded-md">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <Mail size={16} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-white text-sm truncate">{entry.email}</span>
                                            {entry.isNew && (
                                                <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2 flex-shrink-0">
                                            <div className="relative">
                                                <select
                                                    value={entry.accessLevel}
                                                    onChange={(e) => updateAccessLevel(entry.email, e.target.value as AccessLevel)}
                                                    className="appearance-none bg-gray-700 text-white px-3 py-1 rounded-md text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                                                >
                                                    <option value={AccessLevel.READ}>Read</option>
                                                    <option value={AccessLevel.WRITE}>Write</option>
                                                    <option value={AccessLevel.ADMIN}>Admin</option>
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                            </div>
                                            <button
                                                onClick={() => removeShareEntry(entry.email)}
                                                className="text-gray-400 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="flex space-y-1 items-center space-x-2 p-3 bg-red-900/50 border border-red-700 rounded-md">
                            <AlertCircle size={16} className="text-red-400" />
                            <span className="text-red-300 text-sm">{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-end space-y-2">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex w-full items-center m-2 space-x-2 px-4 py-2 bg-neutral-700 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg cursor-pointer transition-colors h-8"
                    >
                        <StopCircle size={16} />
                        <span>Cancel</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="flex w-full items-center m-2 space-x-2 px-4 py-2 bg-neutral-700 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg cursor-pointer transition-colors h-8"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Save</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareMenu;