package org.notnotes.auth

import com.auth0.jwt.JWT
import com.auth0.jwt.JWTVerifier
import com.auth0.jwt.algorithms.Algorithm
import org.notnotes.models.User
import io.ktor.server.config.*
import java.util.*

class JwtService(config: ApplicationConfig) {
    private val jwtConfig = config.config("jwt")
    private val secret = jwtConfig.property("secret").getString()
    private val issuer = jwtConfig.property("issuer").getString()
    private val audience = jwtConfig.property("audience").getString()
    private val expiration = jwtConfig.property("expiration").getString().toLong()
    private val algorithm = Algorithm.HMAC256(secret)

    val verifier: JWTVerifier = JWT
        .require(algorithm)
        .withAudience(audience)
        .withIssuer(issuer)
        .build()

    fun generateToken(user: User): String {
        return JWT.create()
            .withAudience(audience)
            .withIssuer(issuer)
            .withClaim("email", user.email)
            .withExpiresAt(Date(System.currentTimeMillis() + expiration))
            .sign(algorithm)
    }
}