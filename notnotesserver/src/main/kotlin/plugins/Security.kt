package org.notnotes.plugins

import com.auth0.jwt.interfaces.Payload
import io.ktor.http.auth.parseAuthorizationHeader
import org.notnotes.auth.JwtService
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import org.koin.ktor.ext.inject

// Custom Principal to hold payload data
data class UserPrincipal(val payload: Payload) : Principal

fun Application.configureSecurity() {
    val jwtService by inject<JwtService>()
    val config = environment.config

    install(Authentication) {
        jwt("jwt-auth") {
            realm = config.property("jwt.realm").getString()
            verifier(jwtService.verifier)

            // Look for token in "Authorization: Bearer <token>" header
            authHeader { call ->
                parseAuthorizationHeader(call.request.headers["Authorization"].orEmpty())
            }

            // Also look for token in a cookie named "token"
            authSchemes("Bearer")
            challenge { _, _ ->
                // Custom challenge logic if needed
            }

            validate { credential ->
                // Additional validation logic if needed
                if (credential.payload.audience.contains(config.property("jwt.audience").getString())) {
                    UserPrincipal(credential.payload)
                } else {
                    null
                }
            }
        }
    }
}