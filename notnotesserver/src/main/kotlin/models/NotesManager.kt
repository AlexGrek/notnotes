package org.notnotes.models

import kotlinx.datetime.Clock
import org.litote.kmongo.Id
import org.litote.kmongo.id.WrappedObjectId
import org.notnotes.auth.sha256Hex
import org.notnotes.db.NoteNodesRepository
import org.litote.kmongo.toId
import org.notnotes.CompositeException
import org.notnotes.utils.stringSimilarity

class NotesManager(private val repo: NoteNodesRepository) {
    suspend fun fetchNotesTree(user: User): NoteRootRepresentation {
        return repo.getUserNotesRootRepresentation(user, false)
    }

    suspend fun fetchNoteBody(note: String, user: String): NoteNode {
        // todo: check access rights
        return repo.getNodeByStringId(note)
    }

    suspend fun shareNote(
        id: String,
        owner: String,
        sharedWith: Map<String, AccessLevel>
    ): Map<String, AccessLevel> {
        val item = repo.getNodeByStringId(id);
        if (item.sharedWith == sharedWith) {
            return item.sharedWith
        }

        val unshared = item.sharedWith.keys - sharedWith.keys
        val sharedNew = sharedWith.keys - item.sharedWith.keys

        val errors = mutableListOf<Throwable>()

        for (shareTo in unshared) {
            try {
                repo.removeFromShared(shareTo, item.id)
            } catch (e: Throwable) {
                errors.add(e)
            }
        }

        if (errors.isNotEmpty()) {
            throw CompositeException(errors)
        }

        val added = mutableMapOf<String, AccessLevel>()

        for (shareTo in sharedNew - owner) {
            try {
                repo.addToShared(shareTo, item.id)
                added[shareTo] = sharedWith[shareTo] !!
            } catch (e: Throwable) {
                errors.add(e)
            }
        }

        if (errors.isNotEmpty()) {
            try {
                repo.updateNoteNode(item)
                item.sharedWith += added
                return item.sharedWith
            } finally {
                throw CompositeException(errors)
            }
        }

        repo.updateNoteNode(item)
        item.sharedWith = sharedWith
        return item.sharedWith
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

    suspend fun deleteNode(
        id: String,
        owner: String
    ) {
        repo.deleteNodeCascade(id, owner)
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

    fun moveNode(id: String, target: String, user: String): Boolean {
        throw NotImplementedError()
    }
}
