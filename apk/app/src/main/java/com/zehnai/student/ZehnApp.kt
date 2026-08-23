package com.zehnai.student

import android.app.Application

class ZehnApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AppContainer.init(this)
    }
}
