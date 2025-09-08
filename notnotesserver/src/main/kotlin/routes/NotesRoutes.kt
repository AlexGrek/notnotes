package org.notnotes.routes

import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.receive
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.bson.types.ObjectId
import org.koin.ktor.ext.inject
import org.litote.kmongo.Id
import org.litote.kmongo.toId
import org.notnotes.db.UserRepository
import org.notnotes.models.CreateNoteRequest
import org.notnotes.models.LoginRequest
import org.notnotes.models.NoteNode
import org.notnotes.models.NotesManager
import org.notnotes.models.UpdateNoteRequest
import org.notnotes.models.User
import org.notnotes.plugins.UserPrincipal

fun Route.notesRoutes() {
    val userRepo by inject<UserRepository>()
    val manager by inject<NotesManager>()

    authenticate("jwt-auth") {
        get("/tree") {
            val principal = call.principal<UserPrincipal>()
            val userEmail = principal?.payload?.getClaim("email")?.asString() ?: throw Exception("No user email in claims")
            val user = userRepo.findUserByEmail(userEmail) ?: throw Exception("User not found or disabled")
            val tree = manager.fetchNotesTree(user)
            call.respond(tree)
        }

        post("/create_note") {
            val request = call.receive<CreateNoteRequest>()
            val principal = call.principal<UserPrincipal>()
            val userEmail = principal?.payload?.getClaim("email")?.asString() ?: throw Exception("No user email in claims")
            val user = userRepo.findUserByEmail(userEmail) ?: throw Exception("User not found or disabled")
            val tree = manager.createNote(request.parent, request.name, request.body, request.attachments, owner = user.email)
            call.respond(tree)
        }

        post("/update_note") {
            val request = call.receive<UpdateNoteRequest>()
            val principal = call.principal<UserPrincipal>()
            val userEmail = principal?.payload?.getClaim("email")?.asString() ?: throw Exception("No user email in claims")
            val user = userRepo.findUserByEmail(userEmail) ?: throw Exception("User not found or disabled")
            val tree = manager.updateNote(request.id, request.body, request.name, request.attachments, user = user.email)
            call.respond(tree)
        }

        get("/nodes") {
            val principal = call.principal<UserPrincipal>()
            val id = call.request.queryParameters["id"] ?: throw Exception("No ?id parameter")
            val userEmail = principal?.payload?.getClaim("email")?.asString() ?: throw Exception("No user email in claims")
            val user = userRepo.findUserByEmail(userEmail) ?: throw Exception("User not found or disabled")
            val body = manager.fetchNoteBody(id, user.id.toString())
            call.respond(body)
        }
    }
}