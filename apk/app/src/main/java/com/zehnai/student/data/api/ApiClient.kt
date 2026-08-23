package com.zehnai.student.data.api

import com.zehnai.student.BuildConfig
import com.zehnai.student.data.local.TokenStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    fun create(tokenStore: TokenStore): StudentApi {
        val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
        val authenticator = TokenAuthenticator(tokenStore, moshi)
        val client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(AuthInterceptor(tokenStore))
            .authenticator(authenticator)
            .addInterceptor(logging)
            .build()
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.ensureTrailingSlash())
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(StudentApi::class.java)
    }
}

private fun String.ensureTrailingSlash(): String = if (endsWith("/")) this else "$this/"
