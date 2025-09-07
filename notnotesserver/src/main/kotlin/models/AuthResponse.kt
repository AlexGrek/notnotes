package org.notnotes.models
import kotlinx.serialization.Serializable

@Serializable
data class AuthResponse(val token: String)