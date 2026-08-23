package com.zehnai.student.data.api

class ApiException(val code: String?, message: String?, cause: Throwable? = null) : Exception(message, cause)
