package com.zehnai.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zehnai.student.data.api.SubjectDto
import com.zehnai.student.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class SubjectsViewModel : ViewModel() {
    private val repo = defaultRepo()
    private val _state = MutableStateFlow<UiState<List<SubjectDto>>>(UiState.Loading)
    val state: StateFlow<UiState<List<SubjectDto>>> = _state

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching {
                val dash = repo.dashboard()
                val classId = dash.clazz?.id ?: "class-1"
                repo.subjects(classId).ifEmpty { dash.subjects }
            }.onSuccess { _state.value = UiState.Success(it) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }
}
