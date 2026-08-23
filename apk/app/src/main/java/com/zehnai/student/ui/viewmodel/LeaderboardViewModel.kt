package com.zehnai.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zehnai.student.data.api.LeaderboardDto
import com.zehnai.student.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class LeaderboardViewModel : ViewModel() {
    private val repo = defaultRepo()
    private val _state = MutableStateFlow<UiState<LeaderboardDto>>(UiState.Loading)
    val state: StateFlow<UiState<LeaderboardDto>> = _state

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching {
                val classId = repo.dashboard().clazz?.id ?: "class-1"
                repo.leaderboard(classId)
            }.onSuccess { _state.value = UiState.Success(it) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }
}
