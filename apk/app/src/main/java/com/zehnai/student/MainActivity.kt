package com.zehnai.student

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.zehnai.student.ui.navigation.StudentApp
import com.zehnai.student.ui.theme.ZehnTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ZehnTheme { StudentApp() }
        }
    }
}
