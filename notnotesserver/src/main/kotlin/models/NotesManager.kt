package org.notnotes.models

import kotlinx.datetime.Clock
import org.litote.kmongo.Id
import org.litote.kmongo.id.WrappedObjectId
import org.notnotes.auth.sha256Hex
import org.notnotes.db.NoteNodesRepository
import org.litote.kmongo.toId
import org.notnotes.utils.stringSimilarity

class NotesManager(private val repo: NoteNodesRepository) {
    suspend fun fetchNotesTree(user: User): NoteRootRepresentation {
        return repo.getUserNotesRootRepresentation(user, false)
    }

    suspend fun fetchNoteBody(note: String, user: String): NoteNode {
        // todo: check access rights
        return repo.getNodeByStringId(note)
    }

    suspend fun createNote(
        parent: String?,
        name: String,
        body: String,
        attachments: List<String>,
        owner: String
    ) {
        val newNode = NoteRecord(
            parent = null,
            name = name,
            data = body,
            ownerId = owner,
            attachments = attachments
        )

        repo.createNoteNodeSimple(newNode, parent, owner)
    }

    suspend fun createDirectory(
        parent: String?,
        name: String,
        owner: String
    ) {
        val newNode = NoteDirectory(
            parent = null,
            name = name,
            ownerId = owner
        )

        repo.createNoteNodeSimple(newNode, parent, owner)
    }

    suspend fun updateNote(id: String, body: String, name: String, attachments: List<String>, user: String) {
        val node = fetchNoteBody(id, user) as? NoteRecord ?: throw NoSuchElementException("Note with id $id not found")
        checkAccessUpdate(node, user)
        node.data = body
        node.name = name
        node.attachments = attachments
        node.sha256hex = sha256Hex(body)
        val lastInHistory = if (node.history.isNotEmpty()) node.history.last() else  ""
        if (lastInHistory != "" && body != "" && stringSimilarity(lastInHistory, body) > 0.2)
            node.history += body
        if (lastInHistory == "" && body.length > 3) {
            node.history += body
        }
        
        node.updateTimestamp = Clock.System.now()
        repo.updateNoteNode(node)
    }

    private fun checkAccessUpdate(
        node: NoteRecord,
        user: String
    ) {
        // TODO: check access
    }
}
