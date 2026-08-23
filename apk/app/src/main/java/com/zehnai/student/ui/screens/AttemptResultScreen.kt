package com.zehnai.student.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.zehnai.student.ui.common.ErrorView
import com.zehnai.student.ui.common.LoadingView
import com.zehnai.student.ui.common.UiState
import com.zehnai.student.ui.viewmodel.AttemptResultViewModel
import com.zehnai.student.ui.viewmodel.appViewModelFactory

@Composable
fun AttemptResultScreen(attemptId: String) {
    val vm: AttemptResultViewModel = viewModel(factory = appViewModelFactory { AttemptResultViewModel(attemptId) })
    val state by vm.state.collectAsState()
    when (val s = state) {
        is UiState.Loading -> LoadingView()
        is UiState.Error -> ErrorView(s.message) { vm.refresh() }
        is UiState.Success -> Column(Modifier.fillMaxSize().padding(16.dp)) {
            Text("Natija")
            Text("Holat: ${s.data.status ?: "-"}")
        }
    }
}
