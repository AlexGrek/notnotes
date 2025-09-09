val ktor_version: String by project
val kotlin_version: String by project
val logback_version: String by project
val koin_version: String by project
val kmongo_version: String by project
val jbcrypt_version: String by project

plugins {
    kotlin("jvm") version "2.2.10"
    id("io.ktor.plugin") version "2.3.0"
    id("org.jetbrains.kotlin.plugin.serialization") version "2.2.10"
}

group = "org.notnotes"
version = "0.0.1"

repositories {
    mavenCentral()
}

application {
    applicationDefaultJvmArgs = listOf("--enable-native-access=ALL-UNNAMED")
}

application {
    mainClass.set("org.notnotes.MainKt")


    val isDevelopment: Boolean = project.ext.has("development")
    applicationDefaultJvmArgs = listOf("-Dio.ktor.development=$isDevelopment")
}

dependencies {
    // Ktor Core
    implementation("io.ktor:ktor-server-core-jvm")
    implementation("io.ktor:ktor-server-netty-jvm")
    implementation("io.ktor:ktor-server-status-pages")

    // Ktor Features
    implementation("io.ktor:ktor-server-content-negotiation-jvm")
    implementation("io.ktor:ktor-server-auth-jvm")
    implementation("io.ktor:ktor-server-auth-jwt-jvm")

    // Serialization
    implementation("io.ktor:ktor-serialization-kotlinx-json-jvm")

    // Database (KMongo for convenience with data classes)
    implementation("org.litote.kmongo:kmongo-coroutine:${kmongo_version}")

    implementation("com.github.jershell:kbson:0.5.0")

    // Dependency Injection
    implementation("io.insert-koin:koin-ktor:$koin_version")
    implementation("io.insert-koin:koin-logger-slf4j:$koin_version")

    // In build.gradle.kts
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.0")

    // Password Hashing
    implementation("org.mindrot:jbcrypt:$jbcrypt_version")

    // Logging
    implementation("ch.qos.logback:logback-classic:$logback_version")

    testImplementation("org.jetbrains.kotlin:kotlin-test-junit:$kotlin_version")
}
