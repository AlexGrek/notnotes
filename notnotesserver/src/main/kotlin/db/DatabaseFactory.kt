package org.notnotes.db

import ch.qos.logback.core.net.server.Client
import com.mongodb.client.model.IndexOptions
import com.mongodb.client.model.Indexes
import org.notnotes.models.User
import com.typesafe.config.ConfigFactory
import io.ktor.server.config.*
import org.litote.kmongo.coroutine.CoroutineClient
import org.litote.kmongo.coroutine.CoroutineCollection
import org.litote.kmongo.coroutine.CoroutineDatabase
import org.litote.kmongo.coroutine.coroutine
import org.litote.kmongo.reactivestreams.KMongo
import org.notnotes.models.NoteNode
import org.notnotes.models.NoteRoot

class DatabaseFactory(config: ApplicationConfig) {
    private val db: CoroutineDatabase
    private val client: CoroutineClient

    init {
        val dbConfig = config.config("mongodb")
        val connectionString = dbConfig.property("connectionString").getString()
        val databaseName = dbConfig.property("databaseName").getString()

        client = KMongo.createClient(connectionString).coroutine
        db = client.getDatabase(databaseName)
    }

    fun getCoroutineClient() = client
    fun getDb() = db
    fun getCollectionUser() = db.getCollection<User>()

    suspend fun setupDatabase() {
        val collection = db.getCollection<User>()
        val indexOptions = IndexOptions().unique(true)
        collection.createIndex(Indexes.ascending(User::email.name), indexOptions)

        val collectionRoot = db.getCollection<NoteRoot>()
        val indexOptionsRoot = IndexOptions().unique(true)
        collectionRoot.createIndex(Indexes.ascending(NoteRoot::owner.name), indexOptionsRoot)
    }
}
