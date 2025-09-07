package org.notnotes.models
import kotlinx.serialization.Serializable
import org.bson.codecs.pojo.annotations.BsonId
import org.litote.kmongo.Id
import org.litote.kmongo.newId

@Serializable
data class User(
    @param:BsonId val id: Id<User> = newId(),
    val email: String,
    val passwordHash: String,
)