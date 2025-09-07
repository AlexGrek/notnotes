package org.notnotes.models

import org.litote.kmongo.Id
import org.notnotes.auth.sha256Hex
import org.notnotes.db.NoteNodesRepository

class NotesManager(private val repo: NoteNodesRepository) {
    suspend fun fetchNotesTree(userId: Id<User>): NoteRootRepresentation {
        return repo.getUserNotesRootRepresentation(userId, false)
    }

    suspend fun fetchNoteBody(note: Id<NoteNode>, user: Id<User>): NoteNode {
        // todo: check access rights
        return repo.getNodeById(note)
    }

    suspend fun createNote(
        parent: Id<NoteNode>?,
        name: String,
        body: String,
        attachments: List<String>,
        owner: Id<User>
    ) {
        val newNode = NoteRecord(
            parent = parent,
            name = name,
            data = body,
            ownerId = owner,
            attachments = attachments
        )

        repo.createNoteNodeSimple(newNode, parent, owner)
    }

    suspend fun createDirectory(
        parent: Id<NoteNode>?,
        name: String,
        owner: Id<User>
    ) {
        val newNode = NoteDirectory(
            parent = parent,
            name = name,
            ownerId = owner
        )

        repo.createNoteNodeTransactional(newNode, parent, owner)
    }

    suspend fun updateNote(id: Id<NoteNode>, body: String, attachments: List<String>, user: Id<User>) {
        val node = fetchNoteBody(id, user) as? NoteRecord ?: throw NoSuchElementException("Note with id $id not found")
        checkAccessUpdate(node, user)
        node.data = body
        node.attachments = attachments
        node.sha256hex = sha256Hex(body)
        node.history += body
        repo.updateNoteNode(node)
    }

    private fun checkAccessUpdate(
        node: NoteRecord,
        user: Id<User>
    ) {
        // TODO: check access
    }
}
