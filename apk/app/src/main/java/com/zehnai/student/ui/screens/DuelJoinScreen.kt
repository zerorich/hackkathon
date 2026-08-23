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
import com.zehnai.student.ui.common.SecondaryButton
import com.zehnai.student.ui.common.UiState
import com.zehnai.student.ui.viewmodel.DuelJoinViewModel

@Composable
fun DuelJoinScreen(onAccepted: (String) -> Unit, vm: DuelJoinViewModel = viewModel()) {
    var code by remember { mutableStateOf("") }
    val state by vm.state.collectAsState()
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Duel kodi")
        OutlinedTextField(code, { code = it }, label = { Text("Kod") })
        PrimaryButton("Ko'rish", onClick = { vm.preview(code) }, modifier = Modifier.padding(top = 8.dp))
        SecondaryButton("Qabul qilish", onClick = { vm.accept(code, onAccepted) }, modifier = Modifier.padding(top = 8.dp))
        when (val s = state) {
            is UiState.Loading -> LoadingView()
            is UiState.Error -> ErrorView(s.message)
            is UiState.Success -> Text("Holat: ${s.data.status ?: "-"}", Modifier.padding(top = 12.dp))
        }
    }
}
