package com.zehnai.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zehnai.student.data.api.ChallengeDetailDto
import com.zehnai.student.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ChallengeViewModel(private val challengeId: String) : ViewModel() {
    private val repo = defaultRepo()
    private val _state = MutableStateFlow<UiState<ChallengeDetailDto>>(UiState.Loading)
    val state: StateFlow<UiState<ChallengeDetailDto>> = _state

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.challenge(challengeId) }
                .onSuccess { _state.value = UiState.Success(it) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }

    fun startAttempt(onStarted: (String) -> Unit) {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.startAttempt(challengeId).attemptId }
                .onSuccess { onStarted(it) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }
}
