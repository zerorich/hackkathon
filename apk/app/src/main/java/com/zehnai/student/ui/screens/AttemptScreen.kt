package com.zehnai.student.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.zehnai.student.ui.common.ErrorView
import com.zehnai.student.ui.common.LoadingView
import com.zehnai.student.ui.common.PrimaryButton
import com.zehnai.student.ui.common.UiState
import com.zehnai.student.ui.viewmodel.AttemptViewModel
import com.zehnai.student.ui.viewmodel.appViewModelFactory

@Composable
fun AttemptScreen(attemptId: String, onFinished: (String) -> Unit) {
    val vm: AttemptViewModel = viewModel(factory = appViewModelFactory { AttemptViewModel(attemptId) })
    val state by vm.state.collectAsState()
    when (val s = state) {
        is UiState.Loading -> LoadingView()
        is UiState.Error -> ErrorView(s.message) { vm.refresh() }
        is UiState.Success -> Column(Modifier.fillMaxSize().padding(16.dp)) {
            val q = s.data.challenge?.questions?.firstOrNull()
            Text("Urinish")
            if (q != null) {
                Text(q.text, Modifier.padding(vertical = 8.dp))
                q.options.forEach { opt ->
                    Card(Modifier.padding(top = 6.dp).clickable { vm.submitAnswer(q.id, opt.id) }) {
                        Text(opt.text, Modifier.padding(10.dp))
                    }
                }
            }
            PrimaryButton("Yakunlash", onClick = { vm.finish { onFinished(attemptId) } }, modifier = Modifier.padding(top = 16.dp))
        }
    }
}
