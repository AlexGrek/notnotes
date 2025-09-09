package org.notnotes.routes

import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.receive
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.koin.ktor.ext.inject
import org.notnotes.db.UserRepository
import org.notnotes.models.CreateNoteRequest
import org.notnotes.models.MoveNodeRequest
import org.notnotes.models.NotesManager
import org.notnotes.models.UpdateNoteRequest
import org.notnotes.plugins.UserPrincipal

fun Route.notesRoutes() {
    val userRepo by inject<UserRepository>()
    val manager by inject<NotesManager>()

    authenticate("jwt-auth") {
        // A helper function to get the authenticated user or throw an exception
        suspend fun ApplicationCall.getAuthenticatedUser(): org.notnotes.models.User {
            val principal = principal<UserPrincipal>()
                ?: throw IllegalStateException("Principal not found in authenticated route.")
            val userEmail = principal.payload.getClaim("email").asString()
                ?: throw IllegalStateException("No 'email' claim in JWT payload.")
            return userRepo.findUserByEmail(userEmail)
                ?: throw NoSuchElementException("User with email $userEmail not found or is disabled.")
        }

        get("/tree") {
            val user = call.getAuthenticatedUser()
            val tree = manager.fetchNotesTree(user)
            call.respond(tree)
        }

        post("/create_note") {
            val request = call.receive<CreateNoteRequest>()
            val user = call.getAuthenticatedUser()
            val tree = manager.createNote(request.parent, request.name, request.body, request.attachments, owner = user.email)
            call.respond(tree)
        }

        post("/update_note") {
            val request = call.receive<UpdateNoteRequest>()
            val user = call.getAuthenticatedUser()
            val tree = manager.updateNote(request.id, request.body, request.name, request.attachments, user = user.email)
            call.respond(tree)
        }

        get("/nodes") {
            val user = call.getAuthenticatedUser()
            val id = call.request.queryParameters["id"]
                ?: throw IllegalArgumentException("Missing required 'id' query parameter.")
            val body = manager.fetchNoteBody(id, user.id.toString())
            call.respond(body)
        }

        delete("/nodes") {
            val user = call.getAuthenticatedUser()
            val id = call.request.queryParameters["id"]
                ?: throw IllegalArgumentException("Missing required 'id' query parameter.")
            val body = manager.deleteNode(id, user.id.toString())
            call.respond(body)
        }

        post("/move_node") {
            val request = call.receive<MoveNodeRequest>()
            val user = call.getAuthenticatedUser()
            val body = manager.moveNode(request.id, request.target, user.id.toString())
            call.respond(body)
        }
    }
}