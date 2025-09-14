package org.notnotes.models

import kotlinx.serialization.Contextual
import kotlinx.serialization.Serializable
import org.litote.kmongo.Id

@Serializable
data class CreateNoteRequest(val name: String, val body: String, val attachments: List<String> = listOf(),
    val parent: String?)

@Serializable
data class UpdateNoteRequest(val name: String, val body: String, val attachments: List<String> = listOf(),
                             val id: String
)

data class RenameNodeRequest(
    val name: String,
    val id: String)

data class MoveNodeRequest(
    val target: String,
    val id: String)

@Serializable
data class DeleteNodeRequest(val id: String)

@Serializable
data class ShareNoteRequest(val sharedWith: Map<String, AccessLevel>)
