package org.notnotes.utils

import kotlin.math.max
import kotlin.math.min

/**
 * Calculates string similarity using Levenshtein distance
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @return Float between 0.0 (completely different) and 1.0 (identical)
 */
fun stringSimilarity(str1: String, str2: String): Float {
    if (str1 == str2) return 1.0f
    if (str1.isEmpty() || str2.isEmpty()) return 0.0f

    val maxLength = max(str1.length, str2.length)
    val distance = levenshteinDistance(str1, str2)

    return 1.0f - (distance.toFloat() / maxLength)
}

/**
 * Calculates the Levenshtein distance between two strings
 */
private fun levenshteinDistance(str1: String, str2: String): Int {
    val len1 = str1.length
    val len2 = str2.length

    // Create a matrix to store distances
    val matrix = Array(len1 + 1) { IntArray(len2 + 1) }

    // Initialize first row and column
    for (i in 0..len1) matrix[i][0] = i
    for (j in 0..len2) matrix[0][j] = j

    // Fill the matrix
    for (i in 1..len1) {
        for (j in 1..len2) {
            val cost = if (str1[i - 1] == str2[j - 1]) 0 else 1
            matrix[i][j] = min(
                min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1),
                matrix[i - 1][j - 1] + cost
            )
        }
    }

    return matrix[len1][len2]
}

fun String.limitTo24(): String {
    return if (this.length > 24) {
        this.take(21) + "..."
    } else {
        this
    }
}
