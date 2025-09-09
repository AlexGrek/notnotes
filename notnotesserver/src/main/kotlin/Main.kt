package org.notnotes

import io.ktor.http.HttpStatusCode
import org.notnotes.di.appModule
import org.notnotes.plugins.configureRouting
import org.notnotes.plugins.configureSecurity
import org.notnotes.plugins.configureSerialization
import io.ktor.server.application.*
import io.ktor.server.config.ApplicationConfig
import io.ktor.server.netty.*
import kotlinx.coroutines.runBlocking
import org.koin.dsl.module
import org.koin.ktor.ext.get
import org.koin.ktor.plugin.Koin
import org.notnotes.db.DatabaseFactory
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.respond

fun main(args: Array<String>): Unit = EngineMain.main(args)

fun Application.module() {
    install(Koin) {
        modules(appModule)

        modules(module {
            single<ApplicationConfig> { environment.config }
            single { environment } // ApplicationEnvironment
            single { log }         // Logger
        })
    }

    install(StatusPages) {
        // Handle cases where a resource is not found (e.g., user, note)
        exception<NoSuchElementException> { call, cause ->
            call.respond(HttpStatusCode.NotFound, mapOf("error" to (cause.message ?: "Resource not found")))
        }
        // Handle cases where the client provides invalid input (e.g., missing parameter)
        exception<IllegalArgumentException> { call, cause ->
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to (cause.message ?: "Bad request")))
        }
        // Catch-all for any other unexpected errors
        exception<Throwable> { call, cause ->
            // In a real production app, you would also log the 'cause' here
            call.respond(HttpStatusCode.InternalServerError, mapOf("error" to (cause.message ?: "An internal error occurred")))
        }
    }

    runBlocking {
        // Get the database instance from Koin and set up the index
        // This needs to be done *before* starting the rest of the app
        val dbFactory = get<DatabaseFactory>()
        dbFactory.setupDatabase()
    }

    // Configure essential Ktor plugins
    configureSecurity()
    configureSerialization()
    configureRouting()
}