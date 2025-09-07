package org.notnotes.di

import org.notnotes.auth.HashingService
import org.notnotes.auth.JwtService
import org.notnotes.db.DatabaseFactory
import org.notnotes.db.UserRepository
import org.koin.dsl.module
import org.notnotes.db.NoteNodesRepository
import org.notnotes.models.NotesManager

val appModule = module {
    single { DatabaseFactory(get()) }
    single { JwtService(get()) }
    single { HashingService() }
    single { UserRepository(get<DatabaseFactory>().getCollectionUser(), get<NoteNodesRepository>()) }
    single { NoteNodesRepository(get<DatabaseFactory>().getCoroutineClient(), get<DatabaseFactory>().getDb()) }
    single { NotesManager(get<NoteNodesRepository>()) }
}
