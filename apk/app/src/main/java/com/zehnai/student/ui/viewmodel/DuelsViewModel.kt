package com.zehnai.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zehnai.student.data.api.DuelSummaryDto
import com.zehnai.student.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class DuelsViewModel : ViewModel() {
    private val repo = defaultRepo()
    private val _state = MutableStateFlow<UiState<List<DuelSummaryDto>>>(UiState.Loading)
    val state: StateFlow<UiState<List<DuelSummaryDto>>> = _state

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.myDuels() }
                .onSuccess { _state.value = UiState.Success(it) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }
}
