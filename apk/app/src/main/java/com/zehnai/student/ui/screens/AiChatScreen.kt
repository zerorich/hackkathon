package com.zehnai.student.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.zehnai.student.ui.viewmodel.AiChatViewModel

@Composable
fun AiChatScreen(vm: AiChatViewModel = viewModel()) {
    var input by remember { mutableStateOf("") }
    val state by vm.state.collectAsState()
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Zehn AI")
        when (val s = state) {
            is UiState.Loading -> LoadingView()
            is UiState.Error -> ErrorView(s.message) { vm.refresh() }
            is UiState.Success -> LazyColumn(Modifier.weight(1f)) {
                items(s.data) { msg -> Text("${msg.role}: ${msg.content}", Modifier.padding(vertical = 4.dp)) }
            }
        }
        OutlinedTextField(input, { input = it }, label = { Text("Xabar") })
        PrimaryButton("Yuborish", onClick = { vm.send(input); input = "" }, modifier = Modifier.padding(top = 8.dp))
    }
}
