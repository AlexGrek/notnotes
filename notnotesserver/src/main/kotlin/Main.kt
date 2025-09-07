package org.notnotes

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