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
import org.litote.kmongo.coroutine.CoroutineClient
import org.litote.kmongo.coroutine.CoroutineDatabase


class NoteNodesRepository(
    private val client: CoroutineClient,
    private val database: CoroutineDatabase
) {
    private val notesCollection = database.getCollection<NoteNode>()
    private val notesRootCollection = database.getCollection<NoteRoot>()

    suspend fun createNoteNodeTransactional(
        node: NoteNode,
        parent: Id<NoteNode>?,
        owner: Id<User>,
    ) {
        val session: ClientSession = client.startSession() // <-- from reactive driver
        try {
            session.startTransaction()

            notesCollection.insertOne(session, node)

            if (parent != null) {
                val parentNode = notesCollection.findOneById(parent)
                    ?: throw NoSuchElementException("Parent not found")
                parentNode.children += node.id
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
        parent: Id<NoteNode>?,
        owner: Id<User>,
    ) {
            if (parent != null) {
                val parentNode = notesCollection.findOneById(parent)
                    ?: throw NoSuchElementException("Parent $parent not found")
                parentNode.children += node.id
                notesCollection.updateOneById(parent, parentNode)
            } else {
                val root = notesRootCollection.findOne(NoteRoot::owner eq owner)
                    ?: throw NoSuchElementException("Root for $owner not found for user $owner")
                root.rootNodes += node.id
                notesRootCollection.updateOneById( root.id, root)
            }
        notesCollection.insertOne(node)
    }

    suspend fun getUserNotesRoot(user: Id<User>): NoteRoot? {
        return notesRootCollection.findOne(NoteRoot::owner eq user)
    }

    suspend fun getNodeById(id: Id<NoteNode>): NoteNode {
        println(id.javaClass)
        println("Expecting:")
        println(id)
        notesCollection.find().toList().listIterator().forEach {
            println(it.id)
            val req_id = it.id
            if (it.id == id) {
                println("Here is our hero!")
            }
            else if (it.id.toString() == id.toString()) {
                print("Here is out toString hero!")
            } else {
                println("$req_id != $id")
            }
        }
        return notesCollection.findOneById(id)
            ?: throw NoSuchElementException("Node with id $id not found")
    }

    suspend fun getNodeWithoutContentById(id: Id<NoteNode>): NoteNode {
        val projection = Projections.exclude("data", "history")
        return notesCollection
            .find(NoteNode::id eq id)
            .projection(projection)
            .first()
            ?: throw NoSuchElementException("Node with id $id not found")
    }

    suspend fun getUserNotesRootRepresentation(user: Id<User>, includeContent: Boolean): NoteRootRepresentation {
        val root = getUserNotesRoot(user) as NoteRoot
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

    suspend fun createRootForUser(user: Id<User>): Boolean {
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

    suspend fun insertChildToRoot(user: Id<User>, child: Id<NoteNode>, session: ClientSession): Boolean {
        val parentNode: NoteRoot = getUserNotesRoot(user) ?: throw NoSuchElementException("Root with user $user not found")
        parentNode.rootNodes += child
        return notesRootCollection.updateOneById(session, parentNode.id, parentNode).wasAcknowledged()
    }

    suspend fun updateNoteNode(node: NoteNode): Boolean {
        return notesCollection.updateOneById(node.id, node).wasAcknowledged()
    }
}