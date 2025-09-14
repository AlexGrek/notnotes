package org.notnotes

class CompositeException(
    val exceptions: List<Throwable>,
    message: String = "Multiple exceptions occurred"
) : Exception(message) {

    override fun toString(): String {
        return buildString {
            appendLine(message ?: "CompositeException:")
            exceptions.forEachIndexed { index, exception ->
                appendLine("  ${index + 1}. ${exception.javaClass.simpleName}: ${exception.message}")
            }
        }
    }

    override fun printStackTrace() {
        super.printStackTrace()
        exceptions.forEachIndexed { index, exception ->
            println("\n--- Suppressed Exception ${index + 1} ---")
            exception.printStackTrace()
        }
    }
}