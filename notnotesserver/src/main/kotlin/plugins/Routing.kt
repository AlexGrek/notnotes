package org.notnotes.plugins

import org.notnotes.routes.authRoutes
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.notnotes.routes.notesRoutes

fun Application.configureRouting() {
    routing {
        get("/") {
            call.respondText("Welcome to NotNotes Sync Server!")
        }
        // Group all API routes under /api/v1
        route("/api/v1/auth") {
            authRoutes()
        }
        route("/api/v1/notes") {
            notesRoutes()
        }
    }
}