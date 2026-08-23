package com.zehnai.student.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Button(onClick = onClick, modifier = modifier.fillMaxWidth(), enabled = enabled) { Text(text) }
}

@Composable
fun SecondaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    OutlinedButton(onClick = onClick, modifier = modifier.fillMaxWidth(), enabled = enabled) { Text(text) }
}

@Composable
fun LoadingView(message: String = "Yuklanmoqda...") {
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        CircularProgressIndicator()
        Text(message, Modifier.padding(top = 12.dp))
    }
}

@Composable
fun ErrorView(message: String, onRetry: (() -> Unit)? = null) {
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(message, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.error)
        if (onRetry != null) {
            PrimaryButton(text = "Qayta urinish", onClick = onRetry, modifier = Modifier.padding(top = 16.dp))
        }
    }
}

@Composable
fun EmptyState(title: String, subtitle: String, actionLabel: String? = null, action: (() -> Unit)? = null) {
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, style = MaterialTheme.typography.titleLarge)
        Text(subtitle, Modifier.padding(top = 8.dp), textAlign = TextAlign.Center)
        if (actionLabel != null && action != null) {
            PrimaryButton(text = actionLabel, onClick = { action() }, modifier = Modifier.padding(top = 16.dp))
        }
    }
}
