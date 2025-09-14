package org.notnotes.db

import com.mongodb.client.model.Projections
import org.litote.kmongo.Id
import org.litote.kmongo.coroutine.CoroutineCollection
import org.litote.kmongo.eq
import org.notnotes.models.NoteDirectory
import org.notnotes.models.NoteDirectoryRepresentation
import org.notnotes.models.NoteNode
import org.notnotes.models.NoteNodeRepresentation
import org.notnotes.models.NoteRecord
import org.notnotes.models.NoteRecordRepresentation
import org.notnotes.models.NoteRoot
import org.notnotes.models.NoteRootRepresentation
import org.notnotes.models.User
import com.mongodb.reactivestreams.client.ClientSession
import org.bson.types.ObjectId
import org.litote.kmongo.coroutine.CoroutineClient
import org.litote.kmongo.coroutine.CoroutineDatabase
import org.litote.kmongo.toId


class NoteNodesRepository(
    private val client: CoroutineClient,
    private val database: CoroutineDatabase
) {
    private val notesCollection = database.getCollection<NoteNode>()
    private val notesRootCollection = database.getCollection<NoteRoot>()

    suspend fun createNoteNodeTransactional(
        node: NoteNode,
        parent: String?,
        owner: String,
    ) {
        val session: ClientSession = client.startSession() // <-- from reactive driver
        try {
            session.startTransaction()

            notesCollection.insertOne(session, node)

            if (parent != null) {
                val parentNode = notesCollection.findOneById(ObjectId(parent.toId<NoteNode>().toString()))
                    ?: throw NoSuchElementException("Parent not found")
                parentNode.children += node.id
                node.parent = parentNode.id
                notesCollection.updateOneById(session, parent, parentNode)
            } else {
                val root = notesRootCollection.findOne(NoteRoot::owner eq owner)
                    ?: throw NoSuchElementException("Root not found")
                root.rootNodes += node.id
                notesRootCollection.updateOneById(session, root.id, root)
            }

            session.commitTransaction()
        } catch (e: Exception) {
            session.abortTransaction()
            throw e
        } finally {
            session.close()
        }
    }

    suspend fun createNoteNodeSimple(
        node: NoteNode,
        parent: String?,
        owner: String,
    ) {
            if (parent != null) {
                val parentId = ObjectId(parent.toId<NoteNode>().toString())
                val parentNode = notesCollection.findOneById(parentId)
                    ?: throw NoSuchElementException("Parent $parent not found")
                parentNode.children += node.id
                node.parent = parentNode.id
                notesCollection.updateOneById(parentId, parentNode)
            } else {
                val root = notesRootCollection.findOne(NoteRoot::owner eq owner)
                    ?: throw NoSuchElementException("Root for $owner not found for user $owner")
                root.rootNodes += node.id
                notesRootCollection.updateOneById( root.id, root)
            }
        notesCollection.insertOne(node)
    }

    suspend fun getUserNotesRoot(user: String): NoteRoot? {
        return notesRootCollection.findOne(NoteRoot::owner eq user)
    }

    suspend fun addToShared(user: String, id: Id<NoteNode>) {
        val root = getUserNotesRoot(user) ?: throw NoSuchElementException("Root for $user not found")
        root.sharedNodes += id
        println("Note shared with user $user")
        notesRootCollection.updateOneById( root.id, root)
    }

    suspend fun removeFromShared(user: String, id: Id<NoteNode>) {
        val root = getUserNotesRoot(user) ?: throw NoSuchElementException("Root for $user not found")
        root.sharedNodes -= id
        notesRootCollection.updateOneById( root.id, root)
    }

    suspend fun getNodeById(id: Id<NoteNode>): NoteNode {
        return notesCollection.findOneById(id)
            ?: throw NoSuchElementException("Node with id $id not found")
    }

    suspend fun getNodeByStringId(sid: String): NoteNode {
        return notesCollection.findOneById(ObjectId(sid.toId<NoteNode>().toString()))
            ?: throw NoSuchElementException("Node with id $sid not found")
    }

    suspend fun getNodeWithoutContentById(id: Id<NoteNode>): NoteNode {
        val projection = Projections.exclude("data", "history")
        return notesCollection
            .find(NoteNode::id eq id)
            .projection(projection)
            .first()
            ?: throw NoSuchElementException("Node with id $id not found")
    }

    suspend fun getUserNotesRootRepresentation(user: User, includeContent: Boolean): NoteRootRepresentation {
        val root = getUserNotesRoot(user.email) as NoteRoot
        val owned = traverseList(root.rootNodes, includeContent)
        val shared = traverseList(root.sharedNodes, includeContent)
        return NoteRootRepresentation(id = root.id, owner = root.owner, rootNodes = owned, shared)
    }

    suspend fun traverseList(nodeList: List<Id<NoteNode>>, includeContent: Boolean): List<NoteNodeRepresentation> {
        return nodeList.map {
            traverseNodeId(it, includeContent)
        }
    }

    suspend fun traverseNodeId(nodeId: Id<NoteNode>, includeContent: Boolean): NoteNodeRepresentation {
        val node = if (includeContent) getNodeById(nodeId) else getNodeWithoutContentById(nodeId)
        val children = traverseList(node.children, includeContent)
        if (node is NoteRecord) {
            return NoteRecordRepresentation(id = node.id, name = node.name, ownerId = node.ownerId, data = node.data, history = node.history, attachments = node.attachments, children = children, treeLastModTimestamp = node.treeLastModTimestamp, sharedWith = node.sharedWith,
                sha256hex = node.sha256hex)
        }
        else if (node is NoteDirectory) {
            return NoteDirectoryRepresentation(id = node.id, name = node.name, ownerId = node.ownerId, children = children, treeLastModTimestamp = node.treeLastModTimestamp, sharedWith = node.sharedWith)
        }
        throw Exception("Unknown type of note node")
    }

    suspend fun createRootForUser(user: String): Boolean {
        val root = NoteRoot(owner = user, rootNodes = listOf(), sharedNodes = listOf())
        return notesRootCollection.insertOne(root).wasAcknowledged()
    }

    suspend fun storeNoteNode(node: NoteNode, session: ClientSession): Boolean {
        return notesCollection.insertOne(session, node).wasAcknowledged()
    }

    suspend fun insertChild(parent: Id<NoteNode>, child: Id<NoteNode>, session: ClientSession): Boolean {
        val parentNode = getNodeById(parent)
        parentNode.children += child
        return notesCollection.updateOneById(session, parent, parentNode).wasAcknowledged()
    }

    suspend fun insertChildToRoot(userEmail: String, child: Id<NoteNode>, session: ClientSession): Boolean {
        val parentNode: NoteRoot = getUserNotesRoot(userEmail) ?: throw NoSuchElementException("Root with user $userEmail not found")
        parentNode.rootNodes += child
        return notesRootCollection.updateOneById(session, parentNode.id, parentNode).wasAcknowledged()
    }

    suspend fun updateNoteNode(node: NoteNode): Boolean {
        return notesCollection.updateOneById(node.id, node).wasAcknowledged()
    }

    private suspend fun deleteNodeAndChildren(id: Id<NoteNode>): Boolean {
        val node = getNodeWithoutContentById(id)
        node.children.forEach {
            deleteNodeAndChildren(it)
        }
        return notesCollection.deleteOneById(id).wasAcknowledged()
    }

    suspend fun deleteNodeCascade(id: String, ownerEmail: String): Boolean {
        val node = getNodeByStringId(id)
        if (node.parent != null) {
            val parent = getNodeByStringId(node.parent.toString())
            parent.children -= node.id
            updateNoteNode(parent)
        } else {
            val root = notesRootCollection.findOne(NoteRoot::owner eq ownerEmail)
                ?: throw NoSuchElementException("Root for $ownerEmail not found")
            root.rootNodes -= node.id
            notesRootCollection.updateOneById(root.id, root)
        }
        node.children.forEach {
            // do not care about parents as we are parent of all those children, and we will be deleted now
            deleteNodeAndChildren(it)
        }
        return notesCollection.deleteOneById(node.id).wasAcknowledged()
    }
}