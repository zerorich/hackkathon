package com.zehnai.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zehnai.student.data.api.AiMessageDto
import com.zehnai.student.ui.common.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AiChatViewModel : ViewModel() {
    private val repo = defaultRepo()
    private var conversationId: String? = null
    private val _state = MutableStateFlow<UiState<List<AiMessageDto>>>(UiState.Loading)
    val state: StateFlow<UiState<List<AiMessageDto>>> = _state

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching {
                val conv = conversationId ?: repo.aiConversations().firstOrNull()?.id ?: repo.createAiConversation().id
                conversationId = conv
                repo.aiMessages(conv)
            }.onSuccess { _state.value = UiState.Success(it) }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }

    fun send(text: String) {
        val conv = conversationId ?: return
        viewModelScope.launch {
            runCatching { repo.sendAiMessage(conv, text) }
                .onSuccess { refresh() }
                .onFailure { _state.value = UiState.Error(it.message ?: "Xatolik") }
        }
    }
}
