package org.notnotes.plugins

import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.contentnegotiation.*
import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.modules.SerializersModule
import org.litote.kmongo.Id
import org.litote.kmongo.id.WrappedObjectId
import org.litote.kmongo.toId
import org.notnotes.models.NoteNode

object ObjectIdSerializer : KSerializer<Id<*>> {
    override val descriptor = PrimitiveSerialDescriptor("ObjectId", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: Id<*>) {
        // Cast the value to WrappedObjectId to access its 'value' property
        val objectId = value as WrappedObjectId<*>
        encoder.encodeString(objectId.id.toHexString())
    }

    override fun deserialize(decoder: Decoder): Id<*> {
        return decoder.decodeString().toId<NoteNode>()
    }
}

val customJson = Json {
    serializersModule = SerializersModule {
        contextual(Id::class, ObjectIdSerializer)
    }
}


fun Application.configureSerialization() {
    install(ContentNegotiation) {
        json(customJson)
    }
}