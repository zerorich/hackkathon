package com.zehnai.student.data.repository

import com.zehnai.student.data.api.*
import com.zehnai.student.data.local.TokenStore
import kotlinx.coroutines.flow.first

class MockStudentRepository(private val tokenStore: TokenStore) : StudentRepository {
    private val user = UserDto(id = "mock-1", email = "demo@zehn.uz", fullName = "Demo Talaba", role = "STUDENT")
    private val clazz = ClassDto(id = "class-1", name = "9-A", grade = 9)

    override suspend fun login(identifier: String, password: String) {
        tokenStore.save("mock-access", "mock-refresh")
    }

    override suspend fun logout() { tokenStore.clear() }

    override suspend fun isLoggedIn(): Boolean = !tokenStore.accessToken.first().isNullOrBlank()

    override suspend fun dashboard(): DashboardDto = DashboardDto(
        profile = user,
        clazz = clazz,
        totalXp = 1200,
        level = 3,
        streak = 5,
        subjects = listOf(SubjectDto("s1", "Matematika", "math"), SubjectDto("s2", "Fizika", "physics")),
        recommendedTopic = RecommendedTopicDto("t1", "Kvadrat tenglamalar", "s1"),
        recentAttempts = emptyList(),
        activeDuels = emptyList(),
    )

    override suspend fun stats(): StatsDto = StatsDto(totalXp = 1200, level = 3, currentStreak = 5, averageAccuracy = 82.5)
    override suspend fun subjects(classId: String): List<SubjectDto> = dashboard().subjects
    override suspend fun topics(subjectId: String): List<TopicDto> = listOf(TopicDto("t1", "Mavzu 1", subjectId), TopicDto("t2", "Mavzu 2", subjectId))
    override suspend fun challenges(topicId: String): List<ChallengeSummaryDto> = listOf(ChallengeSummaryDto("c1", "Test 1", "MEDIUM", 10, "READY"))
    override suspend fun challenge(challengeId: String): ChallengeDetailDto = ChallengeDetailDto(
        id = challengeId,
        title = "Demo test",
        questions = listOf(QuestionDto("q1", "2+2=?", listOf(QuestionOptionDto("o1", "3"), QuestionOptionDto("o2", "4")))),
    )
    override suspend fun startAttempt(challengeId: String): StartAttemptDto = StartAttemptDto("a1", challenge(challengeId))
    override suspend fun getAttempt(attemptId: String): AttemptDto = AttemptDto(attemptId, "IN_PROGRESS", challenge("c1"))
    override suspend fun submitAnswer(attemptId: String, questionId: String, optionId: String) = Unit
    override suspend fun finishAttempt(attemptId: String): AttemptDto = AttemptDto(attemptId, "COMPLETED", challenge("c1"))
    override suspend fun myDuels(): List<DuelSummaryDto> = listOf(DuelSummaryDto("d1", "ABC123", "WAITING"))
    override suspend fun duel(duelId: String): DuelDetailDto = DuelDetailDto(duelId, "ACTIVE", "ABC123")
    override suspend fun previewDuel(code: String): DuelDetailDto = DuelDetailDto("d-preview", "WAITING", code)
    override suspend fun acceptDuel(code: String): DuelDetailDto = DuelDetailDto("d-acc", "ACTIVE", code)
    override suspend fun leaderboard(classId: String): LeaderboardDto = LeaderboardDto(
        entries = listOf(LeaderboardEntryDto(1, user.id, user.fullName, 1200)),
        currentUserRank = 1,
    )
    override suspend fun aiConversations(): List<AiConversationDto> = listOf(AiConversationDto("ai1", "Yordam"))
    override suspend fun createAiConversation(): AiConversationDto = AiConversationDto("ai-new", "Yangi suhbat")
    override suspend fun aiMessages(conversationId: String): List<AiMessageDto> = listOf(AiMessageDto("m1", "assistant", "Salom! Qanday yordam bera olaman?"))
    override suspend fun sendAiMessage(conversationId: String, content: String): AiMessageDto = AiMessageDto("m2", "user", content)
}
