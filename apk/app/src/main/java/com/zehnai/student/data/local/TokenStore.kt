package com.zehnai.student.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

private val Context.dataStore by preferencesDataStore(name = "auth_tokens")

class TokenStore(private val context: Context) {
    private val accessKey = stringPreferencesKey("access_token")
    private val refreshKey = stringPreferencesKey("refresh_token")

    val accessToken: Flow<String?> = context.dataStore.data.map { it[accessKey] }
    val refreshToken: Flow<String?> = context.dataStore.data.map { it[refreshKey] }

    suspend fun save(access: String, refresh: String) {
        context.dataStore.edit {
            it[accessKey] = access
            it[refreshKey] = refresh
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }

    fun accessTokenBlocking(): String? = runBlocking { accessToken.first() }
    fun refreshTokenBlocking(): String? = runBlocking { refreshToken.first() }
}
