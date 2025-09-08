package org.notnotes.db

import org.bson.types.ObjectId
import org.litote.kmongo.Id
import org.notnotes.models.User
import org.litote.kmongo.coroutine.CoroutineCollection
import org.litote.kmongo.eq

class UserRepository(private val collection: CoroutineCollection<User>, private val notesRepository: NoteNodesRepository) {

    suspend fun findUserByEmail(email: String): User? {
        return collection.findOne(User::email eq email)
    }

    suspend fun findUserById(id: Id<User>): User? {
        return collection.findOneById(ObjectId(id.toString()))
    }

    suspend fun createUser(user: User): Boolean {
        // Check if user already exists before inserting
        val existingUser = findUserByEmail(user.email)
        if (existingUser != null) {
            return false // User already exists
        }

        val inserted = collection.insertOne(user)
        val id = user.id
        return inserted.wasAcknowledged() && notesRepository.createRootForUser(user.email)
    }
}
