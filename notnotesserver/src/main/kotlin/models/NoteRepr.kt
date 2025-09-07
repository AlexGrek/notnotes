package org.notnotes.models

import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.serialization.Contextual
import kotlinx.serialization.Serializable
import org.bson.codecs.pojo.annotations.BsonId
import org.litote.kmongo.Id
import org.litote.kmongo.newId
import org.notnotes.auth.sha256Hex
import kotlin.collections.emptyMap

@Serializable
data class NoteRoot(
    @param:BsonId
    @Contextual
    val id: String = newId<NoteRoot>().toString(),
    @Contextual
                    val owner: Id<User>,
    @Contextual
                    var rootNodes: List<Id<NoteNode>>,
    @Contextual
                    var sharedNodes: List<Id<NoteNode>>)

@Serializable
data class NoteRootRepresentation(@param:BsonId
                                  @Contextual
                                  val id: String,
                                  @Contextual
                    val owner: Id<User>,
                                  @Contextual
                    val rootNodes: List<NoteNodeRepresentation>,
                                  @Contextual
                                  val sharedNodes: List<NoteNodeRepresentation>)

@Serializable
sealed class NoteNodeRepresentation {
    @Contextual
    abstract val id: Id<NoteNode>
    abstract val name: String
    abstract val ownerId: Id<User>
    abstract val sharedWith: Map<String, AccessLevel>
    abstract val children: List<NoteNodeRepresentation>
    abstract val treeLastModTimestamp: Instant
};

@Serializable
data class NoteRecordRepresentation(
    @Contextual
    override val id: Id<NoteNode> = newId(),
    override val children: List<NoteNodeRepresentation> = emptyList(),
    override val name: String,
    @Contextual
    override val ownerId: Id<User>,
    override val sharedWith: Map<String, AccessLevel> = emptyMap(),
    override val treeLastModTimestamp: Instant = Clock.System.now(),

    // NoteRecord-specific fields
    val data: String? = null, // The actual markdown content
    val history: List<String> = emptyList(), // List of previous versions of 'data'
    val attachments: List<String> = emptyList(), // List of attachment identifiers
    val updateTimestamp: Instant = Clock.System.now(), // Timestamp of the note's own content modification
    val sha256hex: String = sha256Hex(data ?: "")
) : NoteNodeRepresentation()

@Serializable
data class NoteDirectoryRepresentation(
    @Contextual
    override val id: Id<NoteNode> = newId(),
    override val children: List<NoteNodeRepresentation> = emptyList(),
    override val name: String,
    @Contextual
    override val ownerId: Id<User>,
    override val sharedWith: Map<String, AccessLevel> = emptyMap(),
    override val treeLastModTimestamp: Instant = Clock.System.now()
) : NoteNodeRepresentation()
