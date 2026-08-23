package com.zehnai.student.data.repository

import com.zehnai.student.data.api.*
import com.zehnai.student.data.local.TokenStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.flow.first
import retrofit2.HttpException

class ApiStudentRepository(
    private val api: StudentApi,
    private val tokenStore: TokenStore,
) : StudentRepository {

    private val errorAdapter = Moshi.Builder().add(KotlinJsonAdapterFactory()).build().adapter(ApiErrorResponse::class.java)

    private fun <T> unwrap(envelope: ApiEnvelope<T>): T {
        envelope.data?.let { return it }
        throw ApiException("EMPTY", "Bo'sh javob")
    }

    private suspend fun <T> call(block: suspend () -> ApiEnvelope<T>): T = try {
        unwrap(block())
    } catch (e: HttpException) {
        val body = e.response()?.errorBody()?.string()
        val parsed = body?.let { runCatching { errorAdapter.fromJson(it) }.getOrNull() }
        throw ApiException(parsed?.error?.code, parsed?.error?.message ?: e.message(), e)
    }

    override suspend fun login(identifier: String, password: String) {
        val tokens = call { api.login(LoginRequest(identifier, password)) }
        tokenStore.save(tokens.accessToken, tokens.refreshToken)
    }

    override suspend fun logout() {
        runCatching { api.logout() }
        tokenStore.clear()
    }

    override suspend fun isLoggedIn(): Boolean = !tokenStore.accessToken.first().isNullOrBlank()

    override suspend fun dashboard(): DashboardDto = call { api.dashboard() }
    override suspend fun stats(): StatsDto = call { api.stats() }
    override suspend fun subjects(classId: String): List<SubjectDto> = call { api.classSubjects(classId) }
    override suspend fun topics(subjectId: String): List<TopicDto> = call { api.subjectTopics(subjectId) }
    override suspend fun challenges(topicId: String): List<ChallengeSummaryDto> = call { api.topicChallenges(topicId) }
    override suspend fun challenge(challengeId: String): ChallengeDetailDto = call { api.getChallenge(challengeId) }
    override suspend fun startAttempt(challengeId: String): StartAttemptDto = call { api.startAttempt(challengeId) }
    override suspend fun getAttempt(attemptId: String): AttemptDto = call { api.getAttempt(attemptId) }
    override suspend fun submitAnswer(attemptId: String, questionId: String, optionId: String) {
        call { api.submitAnswer(attemptId, questionId, AnswerRequest(optionId)) }
    }
    override suspend fun finishAttempt(attemptId: String): AttemptDto = call { api.finishAttempt(attemptId) }
    override suspend fun myDuels(): List<DuelSummaryDto> = call { api.myDuels() }.items
    override suspend fun duel(duelId: String): DuelDetailDto = call { api.getDuel(duelId) }
    override suspend fun previewDuel(code: String): DuelDetailDto = call { api.previewDuel(code) }
    override suspend fun acceptDuel(code: String): DuelDetailDto = call { api.acceptDuel(code) }
    override suspend fun leaderboard(classId: String): LeaderboardDto = call { api.leaderboard(classId) }
    override suspend fun aiConversations(): List<AiConversationDto> = call { api.aiConversations() }
    override suspend fun createAiConversation(): AiConversationDto = call { api.createAiConversation() }
    override suspend fun aiMessages(conversationId: String): List<AiMessageDto> = call { api.aiMessages(conversationId) }
    override suspend fun sendAiMessage(conversationId: String, content: String): AiMessageDto =
        call { api.sendAiMessage(conversationId, SendAiMessageRequest(content)) }
}
