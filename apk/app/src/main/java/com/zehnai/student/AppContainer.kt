package com.zehnai.student

import android.content.Context
import com.zehnai.student.data.api.ApiClient
import com.zehnai.student.data.local.TokenStore
import com.zehnai.student.data.repository.ApiStudentRepository
import com.zehnai.student.data.repository.MockStudentRepository
import com.zehnai.student.data.repository.StudentRepository

object AppContainer {
    const val USE_LIVE_API: Boolean = true

    lateinit var tokenStore: TokenStore
        private set
    lateinit var repository: StudentRepository
        private set

    fun init(context: Context) {
        val appContext = context.applicationContext
        tokenStore = TokenStore(appContext)
        repository = if (USE_LIVE_API) {
            ApiStudentRepository(ApiClient.create(tokenStore), tokenStore)
        } else {
            MockStudentRepository(tokenStore)
        }
    }
}
