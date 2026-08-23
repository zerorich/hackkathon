package com.zehnai.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.zehnai.student.AppContainer

inline fun <reified VM : ViewModel> appViewModelFactory(crossinline creator: () -> VM): ViewModelProvider.Factory =
    object : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(VM::class.java)) return creator() as T
            throw IllegalArgumentException("Unknown ViewModel ${modelClass.name}")
        }
    }

fun defaultRepo() = AppContainer.repository
