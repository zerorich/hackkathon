package com.zehnai.student.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.zehnai.student.ui.common.UiState
import com.zehnai.student.ui.viewmodel.SubjectDetailViewModel
import com.zehnai.student.ui.viewmodel.appViewModelFactory

@Composable
fun SubjectDetailScreen(subjectId: String, onTopic: (String) -> Unit) {
    val vm: SubjectDetailViewModel = viewModel(factory = appViewModelFactory { SubjectDetailViewModel(subjectId) })
    val state by vm.state.collectAsState()
    when (val s = state) {
        is UiState.Loading -> LoadingView()
        is UiState.Error -> ErrorView(s.message) { vm.refresh() }
        is UiState.Success -> LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
            item { Text("Mavzular") }
            items(s.data) { topic ->
                Card(Modifier.padding(top = 8.dp).clickable { onTopic(topic.id) }) {
                    Text(topic.title, Modifier.padding(12.dp))
                }
            }
        }
    }
}
