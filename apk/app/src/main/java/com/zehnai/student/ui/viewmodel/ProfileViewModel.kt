package com.zehnai.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zehnai.student.data.api.StatsDto
import com.zehnai.student.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ProfileViewModel : ViewModel() {
    private val repo = defaultRepo()
    private val _state = MutableStateFlow<UiState<StatsDto>>(UiState.Loading)
    val state: StateFlow<UiState<StatsDto>> = _state

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.stats() }
                .onSuccess { _state.value = UiState.Success(it) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }

    fun logout(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            repo.logout()
            onLoggedOut()
        }
    }
}
