// Enum for access levels (inferred from Kotlin model)
export enum AccessLevel {
  READ = "READ",
  WRITE = "WRITE",
  ADMIN = "ADMIN"
}

export interface TypeId {
    type: string,
    id: string
}

// Base interface for all note nodes
export interface NoteNodeRepresentation {
  type: string;
  id: TypeId;
  name: string;
  ownerId: string;
  sharedWith?: Record<string, AccessLevel>;
  children: NoteNodeRepresentation[];
  treeLastModTimestamp: string; // ISO 8601 timestamp
}

// Note record representation (for actual notes with content)
export interface NoteRecordRepresentation extends NoteNodeRepresentation {
  type: "org.notnotes.models.NoteRecordRepresentation";
  data?: string; // The actual markdown content
  history?: string[]; // List of previous versions of 'data'
  attachments?: string[]; // List of attachment identifiers
  updateTimestamp: string; // ISO 8601 timestamp
  sha256hex: string;
}

// Note directory representation (for folders/directories)
export interface NoteDirectoryRepresentation extends NoteNodeRepresentation {
  type: "org.notnotes.models.NoteDirectoryRepresentation";
}

// Root representation containing the entire note structure
export interface NoteRootRepresentation {
  id: string;
  owner: string;
  rootNodes: NoteNodeRepresentation[];
  sharedNodes: NoteNodeRepresentation[];
}

// Type guard functions for runtime type checking
export function isNoteRecordRepresentation(node: NoteNodeRepresentation): node is NoteRecordRepresentation {
  return node.type === "org.notnotes.models.NoteRecordRepresentation";
}

export function isNoteDirectoryRepresentation(node: NoteNodeRepresentation): node is NoteDirectoryRepresentation {
  return node.type === "org.notnotes.models.NoteDirectoryRepresentation";
}

// Example usage and type assertions
export function processNoteNode(node: NoteNodeRepresentation): void {
  if (isNoteRecordRepresentation(node)) {
    // TypeScript knows this is a NoteRecordRepresentation
    console.log(`Note: ${node.name}, SHA: ${node.sha256hex}`);
    if (node.attachments) {
      console.log(`Attachments: ${node.attachments.join(", ")}`);
    }
  } else if (isNoteDirectoryRepresentation(node)) {
    // TypeScript knows this is a NoteDirectoryRepresentation
    console.log(`Directory: ${node.name}`);
  }
}

export function parseNoteRoot(jsonData: any): NoteRootRepresentation {
  return {
    id: jsonData.id,
    owner: jsonData.owner,
    rootNodes: jsonData.rootNodes.map(parseNoteNode),
    sharedNodes: jsonData.sharedNodes.map(parseNoteNode)
  };
}

export function parseNoteNode(nodeData: any): NoteNodeRepresentation {
  // Recursively parse children first
  const children = nodeData.children ? nodeData.children.map(parseNoteNode) : [];
  
  // Create base node properties
  const baseNode = {
    type: nodeData.type,
    id: nodeData.id,
    name: nodeData.name,
    ownerId: nodeData.ownerId,
    sharedWith: nodeData.sharedWith || {},
    children,
    treeLastModTimestamp: nodeData.treeLastModTimestamp
  };

  // Determine specific type and add type-specific properties
  switch (nodeData.type) {
    case "org.notnotes.models.NoteRecordRepresentation":
      return {
        ...baseNode,
        type: "org.notnotes.models.NoteRecordRepresentation",
        data: nodeData.data,
        history: nodeData.history || [],
        attachments: nodeData.attachments || [],
        updateTimestamp: nodeData.updateTimestamp,
        sha256hex: nodeData.sha256hex
      } as NoteRecordRepresentation;

    case "org.notnotes.models.NoteDirectoryRepresentation":
      return {
        ...baseNode,
        type: "org.notnotes.models.NoteDirectoryRepresentation"
      } as NoteDirectoryRepresentation;

    default:
      throw new Error(`Unknown node type: ${nodeData.type}`);
  }
}


// Convenience function to parse from JSON string
export function parseNoteRootFromJson(jsonString: string): NoteRootRepresentation {
  try {
    const rawData = JSON.parse(jsonString);
    return parseNoteRoot(rawData);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

