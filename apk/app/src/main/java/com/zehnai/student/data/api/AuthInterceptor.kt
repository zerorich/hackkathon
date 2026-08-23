package com.zehnai.student.data.api

import com.zehnai.student.data.local.TokenStore
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val tokenStore: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenStore.accessTokenBlocking()
        val request = if (!token.isNullOrBlank()) {
            chain.request().newBuilder().addHeader("Authorization", "Bearer $token").build()
        } else chain.request()
        return chain.proceed(request)
    }
}
