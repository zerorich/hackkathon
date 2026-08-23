package com.zehnai.student.ui.navigation

object Routes {
    const val LOGIN = "login"
    const val MAIN = "main"
    const val HOME = "home"
    const val SUBJECTS = "subjects"
    const val AI = "ai"
    const val LEADERBOARD = "leaderboard"
    const val DUELS = "duels"
    const val PROFILE = "profile"
    const val SUBJECT_DETAIL = "subject/{subjectId}"
    const val TOPIC_DETAIL = "topic/{topicId}"
    const val CHALLENGE = "challenge/{challengeId}"
    const val ATTEMPT = "attempt/{attemptId}"
    const val ATTEMPT_RESULT = "attempt_result/{attemptId}"
    const val DUEL_JOIN = "duel_join"
    const val DUEL_DETAIL = "duel/{duelId}"

    fun subjectDetail(id: String) = "subject/$id"
    fun topicDetail(id: String) = "topic/$id"
    fun challenge(id: String) = "challenge/$id"
    fun attempt(id: String) = "attempt/$id"
    fun attemptResult(id: String) = "attempt_result/$id"
    fun duelDetail(id: String) = "duel/$id"
}
