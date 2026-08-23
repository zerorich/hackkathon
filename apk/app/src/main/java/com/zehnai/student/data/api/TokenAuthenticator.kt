package com.zehnai.student.data.api

import com.zehnai.student.data.local.TokenStore
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.zehnai.student.BuildConfig

class TokenAuthenticator(
    private val tokenStore: TokenStore,
    private val moshi: Moshi,
) : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null
        val refresh = tokenStore.refreshTokenBlocking() ?: return null
        val refreshApi = Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.ensureTrailingSlash())
            .client(OkHttpClient.Builder().build())
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(StudentApi::class.java)
        val tokens = runBlocking {
            try {
                refreshApi.refresh(RefreshRequest(refresh)).data
            } catch (_: Exception) {
                null
            }
        } ?: run {
            runBlocking { tokenStore.clear() }
            return null
        }
        runBlocking { tokenStore.save(tokens.accessToken, tokens.refreshToken) }
        return response.request.newBuilder()
            .header("Authorization", "Bearer ${tokens.accessToken}")
            .build()
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}

private fun String.ensureTrailingSlash(): String = if (endsWith("/")) this else "$this/"
