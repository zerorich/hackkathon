package com.zehnai.student.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class LoginRequest(@Json(name = "identifier") val identifier: String, @Json(name = "password") val password: String)

@JsonClass(generateAdapter = true)
data class RefreshRequest(@Json(name = "refresh_token") val refreshToken: String)

@JsonClass(generateAdapter = true)
data class AuthTokensDto(
    @Json(name = "access_token") val accessToken: String,
    @Json(name = "refresh_token") val refreshToken: String,
    @Json(name = "token_type") val tokenType: String? = null,
)

@JsonClass(generateAdapter = true)
data class UserDto(
    @Json(name = "id") val id: String,
    @Json(name = "identifier") val identifier: String? = null,
    @Json(name = "full_name") val fullName: String? = null,
    @Json(name = "role") val role: String? = null,
)

@JsonClass(generateAdapter = true)
data class ClassDto(@Json(name = "id") val id: String, @Json(name = "name") val name: String, @Json(name = "grade") val grade: Int? = null)

@JsonClass(generateAdapter = true)
data class SubjectDto(@Json(name = "id") val id: String, @Json(name = "name") val name: String, @Json(name = "icon_key") val iconKey: String? = null)

@JsonClass(generateAdapter = true)
data class TopicDto(
    @Json(name = "id") val id: String,
    @Json(name = "title") val title: String,
    @Json(name = "subject_id") val subjectId: String? = null,
    @Json(name = "difficulty") val difficulty: String? = null,
)

@JsonClass(generateAdapter = true)
data class ChallengeSummaryDto(
    @Json(name = "id") val id: String,
    @Json(name = "title") val title: String? = null,
    @Json(name = "difficulty") val difficulty: String? = null,
    @Json(name = "question_count") val questionCount: Int? = null,
    @Json(name = "status") val status: String? = null,
)

@JsonClass(generateAdapter = true)
data class QuestionOptionDto(@Json(name = "id") val id: String, @Json(name = "text") val text: String)

@JsonClass(generateAdapter = true)
data class QuestionDto(
    @Json(name = "id") val id: String,
    @Json(name = "text") val text: String,
    @Json(name = "options") val options: List<QuestionOptionDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class ChallengeDetailDto(
    @Json(name = "id") val id: String,
    @Json(name = "title") val title: String? = null,
    @Json(name = "questions") val questions: List<QuestionDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class LevelProgressDto(
    @Json(name = "current_level_xp") val currentLevelXp: Int? = null,
    @Json(name = "next_level_xp") val nextLevelXp: Int? = null,
)

@JsonClass(generateAdapter = true)
data class RecommendedTopicDto(
    @Json(name = "topic_id") val topicId: String,
    @Json(name = "title") val title: String,
    @Json(name = "subject_id") val subjectId: String? = null,
)

@JsonClass(generateAdapter = true)
data class DashboardDto(
    @Json(name = "profile") val profile: UserDto? = null,
    @Json(name = "class") val clazz: ClassDto? = null,
    @Json(name = "total_xp") val totalXp: Int = 0,
    @Json(name = "level") val level: Int = 1,
    @Json(name = "level_progress") val levelProgress: LevelProgressDto? = null,
    @Json(name = "streak") val streak: Int = 0,
    @Json(name = "subjects") val subjects: List<SubjectDto> = emptyList(),
    @Json(name = "recommended_topic") val recommendedTopic: RecommendedTopicDto? = null,
    @Json(name = "recent_attempts") val recentAttempts: List<AttemptHistoryDto> = emptyList(),
    @Json(name = "active_duels") val activeDuels: List<DuelSummaryDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class AttemptHistoryDto(
    @Json(name = "id") val id: String,
    @Json(name = "status") val status: String? = null,
    @Json(name = "score") val score: Int? = null,
    @Json(name = "challenge") val challenge: ChallengeSummaryDto? = null,
)

@JsonClass(generateAdapter = true)
data class AttemptDto(
    @Json(name = "id") val id: String,
    @Json(name = "status") val status: String? = null,
    @Json(name = "challenge") val challenge: ChallengeDetailDto? = null,
    @Json(name = "answers") val answers: List<AttemptAnswerDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class AttemptAnswerDto(
    @Json(name = "question_id") val questionId: String,
    @Json(name = "selected_option_id") val selectedOptionId: String? = null,
)

@JsonClass(generateAdapter = true)
data class StartAttemptDto(
    @Json(name = "attempt_id") val attemptId: String,
    @Json(name = "challenge") val challenge: ChallengeDetailDto? = null,
)

@JsonClass(generateAdapter = true)
data class AnswerRequest(@Json(name = "selected_option_id") val selectedOptionId: String)

@JsonClass(generateAdapter = true)
data class PaginatedAttemptsDto(
    @Json(name = "items") val items: List<AttemptHistoryDto> = emptyList(),
    @Json(name = "next_cursor") val nextCursor: String? = null,
)

@JsonClass(generateAdapter = true)
data class DuelSummaryDto(
    @Json(name = "id") val id: String,
    @Json(name = "share_code") val shareCode: String? = null,
    @Json(name = "status") val status: String? = null,
)

@JsonClass(generateAdapter = true)
data class PaginatedDuelsDto(
    @Json(name = "items") val items: List<DuelSummaryDto> = emptyList(),
    @Json(name = "next_cursor") val nextCursor: String? = null,
)

@JsonClass(generateAdapter = true)
data class DuelDetailDto(
    @Json(name = "id") val id: String,
    @Json(name = "status") val status: String? = null,
    @Json(name = "share_code") val shareCode: String? = null,
)

@JsonClass(generateAdapter = true)
data class LeaderboardEntryDto(
    @Json(name = "rank") val rank: Int? = null,
    @Json(name = "user_id") val userId: String? = null,
    @Json(name = "full_name") val fullName: String? = null,
    @Json(name = "total_xp") val totalXp: Int? = null,
)

@JsonClass(generateAdapter = true)
data class LeaderboardDto(
    @Json(name = "entries") val entries: List<LeaderboardEntryDto> = emptyList(),
    @Json(name = "current_user_rank") val currentUserRank: Int? = null,
)

@JsonClass(generateAdapter = true)
data class StatsDto(
    @Json(name = "total_xp") val totalXp: Int = 0,
    @Json(name = "level") val level: Int = 1,
    @Json(name = "current_streak") val currentStreak: Int = 0,
    @Json(name = "average_accuracy") val averageAccuracy: Double = 0.0,
)

@JsonClass(generateAdapter = true)
data class AiConversationDto(@Json(name = "id") val id: String, @Json(name = "title") val title: String? = null)

@JsonClass(generateAdapter = true)
data class AiMessageDto(@Json(name = "id") val id: String? = null, @Json(name = "role") val role: String? = null, @Json(name = "content") val content: String? = null)

@JsonClass(generateAdapter = true)
data class SendAiMessageRequest(@Json(name = "content") val content: String)

@JsonClass(generateAdapter = true)
data class CreateDuelResponse(@Json(name = "duel_id") val duelId: String, @Json(name = "share_code") val shareCode: String? = null)
