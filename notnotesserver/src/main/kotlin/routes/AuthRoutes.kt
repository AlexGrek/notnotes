package org.notnotes.routes

import org.notnotes.auth.HashingService
import org.notnotes.auth.JwtService
import org.notnotes.db.UserRepository
import org.notnotes.models.*
import org.notnotes.plugins.UserPrincipal
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.koin.ktor.ext.inject

fun Route.authRoutes() {
    val userRepo by inject<UserRepository>()
    val hashingService by inject<HashingService>()
    val jwtService by inject<JwtService>()

    post("/register") {
        val request = call.receive<RegisterRequest>()
        val hashedPassword = hashingService.hashPassword(request.password)
        val user = User(email = request.email.lowercase(), passwordHash = hashedPassword)

        val success = userRepo.createUser(user)
        if (success) {
            call.respond(HttpStatusCode.Created, mapOf("message" to "User registered successfully"))
        } else {
            call.respond(HttpStatusCode.Conflict, mapOf("error" to "User with this email already exists"))
        }
    }

    post("/login") {
        val request = call.receive<LoginRequest>()
        val user = userRepo.findUserByEmail(request.email.lowercase())

        if (user == null || !hashingService.checkPassword(request.password, user.passwordHash)) {
            return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Invalid credentials"))
        }

        val token = jwtService.generateToken(user)
        call.respond(AuthResponse(token = token))
    }

    // This is a protected route
    authenticate("jwt-auth") {
        get("/protected") {
            val principal = call.principal<UserPrincipal>()
            val userEmail = principal?.payload?.getClaim("email")?.asString()
            call.respondText("Hello, authenticated user: $userEmail!")
        }
    }

    authenticate("jwt-auth") {
        get("/whoami") {
            val principal = call.principal<UserPrincipal>()
            val userEmail = principal?.payload?.getClaim("email")?.asString()
            call.respond(WhoamiResponse(userEmail ?: "null"))
        }
    }
}