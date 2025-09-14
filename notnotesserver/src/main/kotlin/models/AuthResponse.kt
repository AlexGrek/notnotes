package org.notnotes.models
import kotlinx.serialization.Serializable

@Serializable
data class AuthResponse(val token: String)

@Serializable
data class WhoamiResponse(val email: String)