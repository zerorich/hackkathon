package com.zehnai.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zehnai.student.data.api.ChallengeSummaryDto
import com.zehnai.student.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class TopicDetailViewModel(private val topicId: String) : ViewModel() {
    private val repo = defaultRepo()
    private val _state = MutableStateFlow<UiState<List<ChallengeSummaryDto>>>(UiState.Loading)
    val state: StateFlow<UiState<List<ChallengeSummaryDto>>> = _state

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.challenges(topicId) }
                .onSuccess { _state.value = UiState.Success(it) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }
}
