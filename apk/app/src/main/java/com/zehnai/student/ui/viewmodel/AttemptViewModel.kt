package com.zehnai.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zehnai.student.data.api.AttemptDto
import com.zehnai.student.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AttemptViewModel(private val attemptId: String) : ViewModel() {
    private val repo = defaultRepo()
    private val _state = MutableStateFlow<UiState<AttemptDto>>(UiState.Loading)
    val state: StateFlow<UiState<AttemptDto>> = _state

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.getAttempt(attemptId) }
                .onSuccess { _state.value = UiState.Success(it) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }

    fun submitAnswer(questionId: String, optionId: String) {
        viewModelScope.launch {
            runCatching { repo.submitAnswer(attemptId, questionId, optionId) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }

    fun finish(onFinished: () -> Unit) {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.finishAttempt(attemptId) }
                .onSuccess { _state.value = UiState.Success(it); onFinished() }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }
}
