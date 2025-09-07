package com.notnotes.di

import com.notnotes.auth.HashingService
import com.notnotes.auth.JwtService
import com.notnotes.db.DatabaseFactory
import com.notnotes.db.UserRepository
import org.koin.dsl.module

val appModule = module {
    single { DatabaseFactory(get()) }
    single { JwtService(get()) }
    single { HashingService() }
    single { UserRepository(get<DatabaseFactory>().getCollection()) }
}
