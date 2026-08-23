package com.zehnai.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zehnai.student.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class LoginViewModel : ViewModel() {
    private val repo = defaultRepo()
    private val _state = MutableStateFlow<UiState<Boolean>>(UiState.Success(false))
    val state: StateFlow<UiState<Boolean>> = _state

    fun login(identifier: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.login(identifier, password) }
                .onSuccess { _state.value = UiState.Success(true); onSuccess() }
                .onFailure { _state.value = UiState.Error(it.message ?: "Kirish muvaffaqiyatsiz") }
        }
    }
}
