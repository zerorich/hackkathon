package com.zehnai.student.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.SportsMma
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.zehnai.student.AppContainer
import com.zehnai.student.ui.screens.*

private val bottomRoutes = setOf(Routes.HOME, Routes.SUBJECTS, Routes.AI, Routes.LEADERBOARD, Routes.DUELS, Routes.PROFILE)

@Composable
fun StudentApp() {
    val nav = rememberNavController()
    var bootstrapped by remember { mutableStateOf(false) }
    var loggedIn by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        loggedIn = AppContainer.repository.isLoggedIn()
        bootstrapped = true
    }
    if (!bootstrapped) return

    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val showBottomBar = currentRoute in bottomRoutes

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    val tabs = listOf(
                        Triple(Routes.HOME, "Bosh sahifa", Icons.Filled.Home),
                        Triple(Routes.SUBJECTS, "Fanlar", Icons.Filled.MenuBook),
                        Triple(Routes.AI, "Zehn AI", Icons.Filled.Psychology),
                        Triple(Routes.LEADERBOARD, "Reyting", Icons.Filled.EmojiEvents),
                        Triple(Routes.DUELS, "Duellar", Icons.Filled.SportsMma),
                        Triple(Routes.PROFILE, "Profil", Icons.Filled.Person),
                    )
                    tabs.forEach { (route, label, icon) ->
                        NavigationBarItem(
                            selected = currentRoute == route,
                            onClick = { nav.navigate(route) { launchSingleTop = true } },
                            icon = { Icon(icon, contentDescription = label) },
                            label = { Text(label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = nav,
            startDestination = if (loggedIn) Routes.HOME else Routes.LOGIN,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.LOGIN) {
                LoginScreen(onLoggedIn = {
                    loggedIn = true
                    nav.navigate(Routes.HOME) { popUpTo(Routes.LOGIN) { inclusive = true } }
                })
            }
            composable(Routes.HOME) {
                HomeScreen(onOpenTopic = { nav.navigate(Routes.topicDetail(it)) })
            }
            composable(Routes.SUBJECTS) {
                SubjectsScreen(onSubject = { nav.navigate(Routes.subjectDetail(it)) })
            }
            composable(Routes.AI) { AiChatScreen() }
            composable(Routes.LEADERBOARD) { LeaderboardScreen() }
            composable(Routes.DUELS) {
                DuelsScreen(
                    onDuel = { nav.navigate(Routes.duelDetail(it)) },
                    onJoin = { nav.navigate(Routes.DUEL_JOIN) },
                )
            }
            composable(Routes.PROFILE) {
                ProfileScreen(onLogout = {
                    loggedIn = false
                    nav.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                })
            }
            composable(Routes.SUBJECT_DETAIL, arguments = listOf(navArgument("subjectId") { type = NavType.StringType })) { entry ->
                SubjectDetailScreen(entry.arguments?.getString("subjectId").orEmpty(), onTopic = { nav.navigate(Routes.topicDetail(it)) })
            }
            composable(Routes.TOPIC_DETAIL, arguments = listOf(navArgument("topicId") { type = NavType.StringType })) { entry ->
                TopicDetailScreen(entry.arguments?.getString("topicId").orEmpty(), onChallenge = { nav.navigate(Routes.challenge(it)) })
            }
            composable(Routes.CHALLENGE, arguments = listOf(navArgument("challengeId") { type = NavType.StringType })) { entry ->
                ChallengeScreen(entry.arguments?.getString("challengeId").orEmpty(), onAttemptStarted = { nav.navigate(Routes.attempt(it)) })
            }
            composable(Routes.ATTEMPT, arguments = listOf(navArgument("attemptId") { type = NavType.StringType })) { entry ->
                AttemptScreen(entry.arguments?.getString("attemptId").orEmpty(), onFinished = { nav.navigate(Routes.attemptResult(it)) })
            }
            composable(Routes.ATTEMPT_RESULT, arguments = listOf(navArgument("attemptId") { type = NavType.StringType })) { entry ->
                AttemptResultScreen(entry.arguments?.getString("attemptId").orEmpty())
            }
            composable(Routes.DUEL_JOIN) {
                DuelJoinScreen(onAccepted = { nav.navigate(Routes.duelDetail(it)) })
            }
            composable(Routes.DUEL_DETAIL, arguments = listOf(navArgument("duelId") { type = NavType.StringType })) { entry ->
                DuelDetailScreen(entry.arguments?.getString("duelId").orEmpty())
            }
        }
    }
}
