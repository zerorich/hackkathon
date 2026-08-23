package com.zehnai.student.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ApiEnvelope<T>(@Json(name = "data") val data: T? = null)

@JsonClass(generateAdapter = true)
data class ApiErrorResponse(@Json(name = "error") val error: ApiErrorDetail? = null)

@JsonClass(generateAdapter = true)
data class ApiErrorDetail(@Json(name = "code") val code: String? = null, @Json(name = "message") val message: String? = null)
