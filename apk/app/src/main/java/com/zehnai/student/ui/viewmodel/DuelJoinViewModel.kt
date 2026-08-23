package com.zehnai.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zehnai.student.data.api.DuelDetailDto
import com.zehnai.student.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class DuelJoinViewModel : ViewModel() {
    private val repo = defaultRepo()
    private val _state = MutableStateFlow<UiState<DuelDetailDto>>(UiState.Success(DuelDetailDto("", null, null)))
    val state: StateFlow<UiState<DuelDetailDto>> = _state

    fun preview(code: String) {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.previewDuel(code) }
                .onSuccess { _state.value = UiState.Success(it) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }

    fun accept(code: String, onAccepted: (String) -> Unit) {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.acceptDuel(code) }
                .onSuccess { onAccepted(it.id) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }
}
