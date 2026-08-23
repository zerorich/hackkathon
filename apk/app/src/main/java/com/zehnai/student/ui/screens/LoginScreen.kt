package com.zehnai.student.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.zehnai.student.ui.common.ErrorView
import com.zehnai.student.ui.common.LoadingView
import com.zehnai.student.ui.common.PrimaryButton
import com.zehnai.student.ui.common.UiState
import com.zehnai.student.ui.viewmodel.LoginViewModel

@Composable
fun LoginScreen(onLoggedIn: () -> Unit, vm: LoginViewModel = viewModel()) {
    var identifier by remember { mutableStateOf("student@example.com") }
    var password by remember { mutableStateOf("password") }
    val state by vm.state.collectAsState()
    when (val s = state) {
        is UiState.Loading -> LoadingView("Kirish...")
        is UiState.Error -> Column(Modifier.fillMaxSize().padding(24.dp)) {
            ErrorView(s.message) { vm.login(identifier, password, onLoggedIn) }
        }
        is UiState.Success -> Column(Modifier.fillMaxSize().padding(24.dp)) {
            Text("Zehn AI talaba ilovasiga xush kelibsiz")
            OutlinedTextField(email, { email = it }, Modifier.padding(top = 12.dp), label = { Text("Login (email yoki telefon)") })
            OutlinedTextField(password, { password = it }, Modifier.padding(top = 8.dp), label = { Text("Parol") })
            PrimaryButton("Kirish", onClick = { vm.login(identifier, password, onLoggedIn) }, modifier = Modifier.padding(top = 16.dp))
        }
    }
}
