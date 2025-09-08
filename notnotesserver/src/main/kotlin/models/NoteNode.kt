package org.notnotes.models

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.serialization.Contextual
import kotlinx.serialization.Serializable
import org.bson.codecs.pojo.annotations.BsonId
import org.bson.types.ObjectId
import org.litote.kmongo.Id
import org.litote.kmongo.newId
import org.notnotes.auth.sha256Hex

@Serializable
enum class AccessLevel {
    READ,
    EDIT,
    ADMIN
}

/**
 * A base sealed class for all nodes in the notes tree.
 * With the modern driver, @Serializable on a sealed class is enough
 * to enable polymorphism. The @BsonPolymorphic annotation is not needed.
 */
@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "type"
)
@JsonSubTypes(
    JsonSubTypes.Type(value = NoteRecord::class, name = "NoteRecord"),
    JsonSubTypes.Type(value = NoteDirectory::class, name = "NoteDirectory")
)
@Serializable
sealed class NoteNode {
    @get:BsonId
    abstract val id: Id<NoteNode>
    // ... rest of the sealed class is the same
    abstract var parent: Id<NoteNode>?
    @Contextual
    abstract var children: List<Id<NoteNode>>
    abstract var name: String
    @Contextual
    abstract val ownerId: String
    abstract var sharedWith: Map<String, AccessLevel>
    abstract var treeLastModTimestamp: Instant
}

/**
 * Represents a note with content (data). It can also have children, acting as a directory.
 */
@Serializable
data class NoteRecord(
    @param:BsonId
    override val id: Id<NoteNode> = newId(),
    override var parent: Id<NoteNode>? = null,
    @Contextual
    override var children: List<Id<NoteNode>> = emptyList(),
    override var name: String,
    @Contextual
    override val ownerId: String,
    override var sharedWith: Map<String, AccessLevel> = emptyMap(),
    override var treeLastModTimestamp: Instant = Clock.System.now(),

    // NoteRecord-specific fields
    var data: String? = null, // The actual markdown content
    var history: List<String> = emptyList(), // List of previous versions of 'data'
    var attachments: List<String> = emptyList(), // List of attachment identifiers
    var updateTimestamp: Instant = Clock.System.now(), // Timestamp of the note's own content modification
    var sha256hex: String = sha256Hex(data ?: "")
) : NoteNode()

/**
 * Represents a directory. It cannot have a body ('data') but can contain other nodes.
 */
@Serializable
data class NoteDirectory(
    @param:BsonId
    override val id: Id<NoteNode> = newId(),
    override var parent: Id<NoteNode>? = null,
    @Contextual
    override var children: List<Id<NoteNode>> = emptyList(),
    override var name: String,
    override val ownerId: String,
    override var sharedWith: Map<String, AccessLevel> = emptyMap(),
    override var treeLastModTimestamp: Instant = Clock.System.now()
) : NoteNode()
