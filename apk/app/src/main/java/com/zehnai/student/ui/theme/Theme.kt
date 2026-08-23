package com.zehnai.student.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(primary = PurplePrimary, secondary = PurpleDark)
private val DarkColors = darkColorScheme(primary = Color(0xFFD0BCFF), secondary = PurplePrimary)

@Composable
fun ZehnTheme(darkTheme: Boolean = false, content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (darkTheme) DarkColors else LightColors, content = content)
}
