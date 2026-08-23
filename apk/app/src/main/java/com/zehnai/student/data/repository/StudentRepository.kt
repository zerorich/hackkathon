package com.zehnai.student.data.repository

import com.zehnai.student.data.api.*

interface StudentRepository {
    suspend fun login(identifier: String, password: String)
    suspend fun logout()
    suspend fun isLoggedIn(): Boolean
    suspend fun dashboard(): DashboardDto
    suspend fun stats(): StatsDto
    suspend fun subjects(classId: String): List<SubjectDto>
    suspend fun topics(subjectId: String): List<TopicDto>
    suspend fun challenges(topicId: String): List<ChallengeSummaryDto>
    suspend fun challenge(challengeId: String): ChallengeDetailDto
    suspend fun startAttempt(challengeId: String): StartAttemptDto
    suspend fun getAttempt(attemptId: String): AttemptDto
    suspend fun submitAnswer(attemptId: String, questionId: String, optionId: String)
    suspend fun finishAttempt(attemptId: String): AttemptDto
    suspend fun myDuels(): List<DuelSummaryDto>
    suspend fun duel(duelId: String): DuelDetailDto
    suspend fun previewDuel(code: String): DuelDetailDto
    suspend fun acceptDuel(code: String): DuelDetailDto
    suspend fun leaderboard(classId: String): LeaderboardDto
    suspend fun aiConversations(): List<AiConversationDto>
    suspend fun createAiConversation(): AiConversationDto
    suspend fun aiMessages(conversationId: String): List<AiMessageDto>
    suspend fun sendAiMessage(conversationId: String, content: String): AiMessageDto
}
