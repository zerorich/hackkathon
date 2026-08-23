package com.zehnai.student.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface StudentApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): ApiEnvelope<AuthTokensDto>

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): ApiEnvelope<AuthTokensDto>

    @POST("auth/logout")
    suspend fun logout(): ApiEnvelope<Map<String, String?>>

    @GET("auth/me")
    suspend fun authMe(): ApiEnvelope<UserDto>

    @GET("me/dashboard")
    suspend fun dashboard(): ApiEnvelope<DashboardDto>

    @GET("me/stats")
    suspend fun stats(): ApiEnvelope<StatsDto>

    @GET("me/attempts")
    suspend fun myAttempts(@Query("limit") limit: Int = 20, @Query("cursor") cursor: String? = null): ApiEnvelope<PaginatedAttemptsDto>

    @GET("me/duels")
    suspend fun myDuels(@Query("limit") limit: Int = 20, @Query("cursor") cursor: String? = null): ApiEnvelope<PaginatedDuelsDto>

    @GET("classes/{classId}/subjects")
    suspend fun classSubjects(@Path("classId") classId: String): ApiEnvelope<List<SubjectDto>>

    @GET("subjects/{subjectId}/topics")
    suspend fun subjectTopics(@Path("subjectId") subjectId: String): ApiEnvelope<List<TopicDto>>

    @GET("topics/{topicId}/challenges")
    suspend fun topicChallenges(@Path("topicId") topicId: String): ApiEnvelope<List<ChallengeSummaryDto>>

    @GET("challenges/{challengeId}")
    suspend fun getChallenge(@Path("challengeId") challengeId: String): ApiEnvelope<ChallengeDetailDto>

    @POST("challenges/{challengeId}/attempts")
    suspend fun startAttempt(@Path("challengeId") challengeId: String): ApiEnvelope<StartAttemptDto>

    @GET("attempts/{attemptId}")
    suspend fun getAttempt(@Path("attemptId") attemptId: String): ApiEnvelope<AttemptDto>

    @PUT("attempts/{attemptId}/answers/{questionId}")
    suspend fun submitAnswer(
        @Path("attemptId") attemptId: String,
        @Path("questionId") questionId: String,
        @Body body: AnswerRequest,
    ): ApiEnvelope<Map<String, String?>>

    @POST("attempts/{attemptId}/finish")
    suspend fun finishAttempt(@Path("attemptId") attemptId: String): ApiEnvelope<AttemptDto>

    @POST("attempts/{attemptId}/duels")
    suspend fun createDuel(@Path("attemptId") attemptId: String): ApiEnvelope<CreateDuelResponse>

    @GET("duels/{duelId}")
    suspend fun getDuel(@Path("duelId") duelId: String): ApiEnvelope<DuelDetailDto>

    @GET("duels/code/{shareCode}")
    suspend fun previewDuel(@Path("shareCode") shareCode: String): ApiEnvelope<DuelDetailDto>

    @POST("duels/code/{shareCode}/accept")
    suspend fun acceptDuel(@Path("shareCode") shareCode: String): ApiEnvelope<DuelDetailDto>

    @GET("classes/{classId}/leaderboard")
    suspend fun leaderboard(@Path("classId") classId: String, @Query("period") period: String = "all"): ApiEnvelope<LeaderboardDto>

    @GET("ai/chat/conversations")
    suspend fun aiConversations(): ApiEnvelope<List<AiConversationDto>>

    @POST("ai/chat/conversations")
    suspend fun createAiConversation(): ApiEnvelope<AiConversationDto>

    @GET("ai/chat/conversations/{conversationId}/messages")
    suspend fun aiMessages(@Path("conversationId") conversationId: String): ApiEnvelope<List<AiMessageDto>>

    @POST("ai/chat/conversations/{conversationId}/messages")
    suspend fun sendAiMessage(@Path("conversationId") conversationId: String, @Body body: SendAiMessageRequest): ApiEnvelope<AiMessageDto>
}
