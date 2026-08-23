from __future__ import annotations

FIXTURE_CHALLENGES: dict[str, dict] = {
    "default": {
        "title": "Practice Challenge",
        "questions": [
            {
                "prompt": "What is 2 + 2?",
                "type": "SINGLE_CHOICE",
                "explanation": "Basic addition.",
                "points": 1,
                "options": [
                    {"text": "3", "is_correct": False},
                    {"text": "4", "is_correct": True},
                    {"text": "5", "is_correct": False},
                ],
            },
            {
                "prompt": "The Earth orbits the Sun.",
                "type": "TRUE_FALSE",
                "explanation": "Earth revolves around the Sun.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Which is a prime number?",
                "type": "SINGLE_CHOICE",
                "explanation": "7 is only divisible by 1 and itself.",
                "points": 1,
                "options": [
                    {"text": "4", "is_correct": False},
                    {"text": "6", "is_correct": False},
                    {"text": "7", "is_correct": True},
                ],
            },
            {
                "prompt": "Water boils at 100°C at sea level.",
                "type": "TRUE_FALSE",
                "explanation": "Standard boiling point of water.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "What is the capital of Uzbekistan?",
                "type": "SINGLE_CHOICE",
                "explanation": "Tashkent is the capital.",
                "points": 1,
                "options": [
                    {"text": "Samarkand", "is_correct": False},
                    {"text": "Tashkent", "is_correct": True},
                    {"text": "Bukhara", "is_correct": False},
                ],
            },
        ],
    },
    "math": {
        "title": "Math Quick Practice",
        "questions": [
            {
                "prompt": "Solve: 5 × 6",
                "type": "SINGLE_CHOICE",
                "explanation": "5 times 6 equals 30.",
                "points": 1,
                "options": [
                    {"text": "25", "is_correct": False},
                    {"text": "30", "is_correct": True},
                    {"text": "35", "is_correct": False},
                ],
            },
            {
                "prompt": "A triangle has three sides.",
                "type": "TRUE_FALSE",
                "explanation": "By definition, a triangle has 3 sides.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "What is 15 − 7?",
                "type": "SINGLE_CHOICE",
                "explanation": "15 minus 7 equals 8.",
                "points": 1,
                "options": [
                    {"text": "6", "is_correct": False},
                    {"text": "8", "is_correct": True},
                    {"text": "9", "is_correct": False},
                ],
            },
            {
                "prompt": "Zero is a natural number in this quiz context.",
                "type": "TRUE_FALSE",
                "explanation": "Some definitions exclude zero; here we treat it as not natural.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": False},
                    {"text": "False", "is_correct": True},
                ],
            },
            {
                "prompt": "What is 3²?",
                "type": "SINGLE_CHOICE",
                "explanation": "3 squared is 9.",
                "points": 1,
                "options": [
                    {"text": "6", "is_correct": False},
                    {"text": "9", "is_correct": True},
                    {"text": "12", "is_correct": False},
                ],
            },
        ],
    },
    "fractions": {
        "title": "Fractions Practice",
        "questions": [
            {
                "prompt": "What is 1/2 + 1/4?",
                "type": "SINGLE_CHOICE",
                "explanation": "1/2 = 2/4, so 2/4 + 1/4 = 3/4.",
                "points": 1,
                "options": [
                    {"text": "2/4", "is_correct": False},
                    {"text": "3/4", "is_correct": True},
                    {"text": "1/6", "is_correct": False},
                ],
            },
            {
                "prompt": "3/5 is greater than 1/2.",
                "type": "TRUE_FALSE",
                "explanation": "3/5 = 0.6 and 1/2 = 0.5.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Which fraction equals 0.25?",
                "type": "SINGLE_CHOICE",
                "explanation": "1/4 = 0.25.",
                "points": 1,
                "options": [
                    {"text": "1/3", "is_correct": False},
                    {"text": "1/4", "is_correct": True},
                    {"text": "2/5", "is_correct": False},
                ],
            },
            {
                "prompt": "2/3 of 12 is 8.",
                "type": "TRUE_FALSE",
                "explanation": "12 × 2/3 = 8.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Simplify 4/8.",
                "type": "SINGLE_CHOICE",
                "explanation": "Divide numerator and denominator by 4.",
                "points": 1,
                "options": [
                    {"text": "1/4", "is_correct": False},
                    {"text": "1/2", "is_correct": True},
                    {"text": "2/3", "is_correct": False},
                ],
            },
        ],
    },
    "quadratic": {
        "title": "Quadratic Equations",
        "questions": [
            {
                "prompt": "What are the roots of x² − 5x + 6 = 0?",
                "type": "SINGLE_CHOICE",
                "explanation": "(x−2)(x−3)=0.",
                "points": 1,
                "options": [
                    {"text": "x = 1 and x = 6", "is_correct": False},
                    {"text": "x = 2 and x = 3", "is_correct": True},
                    {"text": "x = −2 and x = −3", "is_correct": False},
                ],
            },
            {
                "prompt": "The graph of y = x² is a parabola.",
                "type": "TRUE_FALSE",
                "explanation": "Quadratic functions graph as parabolas.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Discriminant of x² + 2x + 1 = 0 is:",
                "type": "SINGLE_CHOICE",
                "explanation": "b² − 4ac = 4 − 4 = 0.",
                "points": 1,
                "options": [
                    {"text": "0", "is_correct": True},
                    {"text": "4", "is_correct": False},
                    {"text": "−4", "is_correct": False},
                ],
            },
            {
                "prompt": "x² = −1 has real solutions.",
                "type": "TRUE_FALSE",
                "explanation": "No real number squared is negative.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": False},
                    {"text": "False", "is_correct": True},
                ],
            },
            {
                "prompt": "Vertex of y = (x − 1)² + 4 is at:",
                "type": "SINGLE_CHOICE",
                "explanation": "Vertex form (h, k) = (1, 4).",
                "points": 1,
                "options": [
                    {"text": "(1, 4)", "is_correct": True},
                    {"text": "(−1, 4)", "is_correct": False},
                    {"text": "(1, −4)", "is_correct": False},
                ],
            },
        ],
    },
    "linear": {
        "title": "Linear Functions",
        "questions": [
            {
                "prompt": "Slope of y = 3x − 2 is:",
                "type": "SINGLE_CHOICE",
                "explanation": "In y = mx + b, m is the slope.",
                "points": 1,
                "options": [
                    {"text": "3", "is_correct": True},
                    {"text": "−2", "is_correct": False},
                    {"text": "2", "is_correct": False},
                ],
            },
            {
                "prompt": "y = 2x + 1 passes through (0, 1).",
                "type": "TRUE_FALSE",
                "explanation": "When x=0, y=1.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Solve: 2x + 6 = 0",
                "type": "SINGLE_CHOICE",
                "explanation": "2x = −6, x = −3.",
                "points": 1,
                "options": [
                    {"text": "x = 3", "is_correct": False},
                    {"text": "x = −3", "is_correct": True},
                    {"text": "x = −6", "is_correct": False},
                ],
            },
            {
                "prompt": "Parallel lines have equal slopes.",
                "type": "TRUE_FALSE",
                "explanation": "Same slope, different intercepts.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "y-intercept of y = −x + 5 is:",
                "type": "SINGLE_CHOICE",
                "explanation": "Set x=0 to get y=5.",
                "points": 1,
                "options": [
                    {"text": "5", "is_correct": True},
                    {"text": "−1", "is_correct": False},
                    {"text": "0", "is_correct": False},
                ],
            },
        ],
    },
    "past_simple": {
        "title": "Past Simple Practice",
        "questions": [
            {
                "prompt": "Choose the correct form: She ___ to school yesterday.",
                "type": "SINGLE_CHOICE",
                "explanation": "Past simple of 'go' is 'went'.",
                "points": 1,
                "options": [
                    {"text": "go", "is_correct": False},
                    {"text": "went", "is_correct": True},
                    {"text": "gone", "is_correct": False},
                ],
            },
            {
                "prompt": "Past simple is used for completed actions in the past.",
                "type": "TRUE_FALSE",
                "explanation": "Past simple marks finished past events.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Which sentence is correct?",
                "type": "SINGLE_CHOICE",
                "explanation": "Regular verb: play → played.",
                "points": 1,
                "options": [
                    {"text": "I play football last week.", "is_correct": False},
                    {"text": "I played football last week.", "is_correct": True},
                    {"text": "I playing football last week.", "is_correct": False},
                ],
            },
            {
                "prompt": "'Did' is used with the base form of the verb.",
                "type": "TRUE_FALSE",
                "explanation": "Did you go? Not Did you went?",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Negative past simple of 'see':",
                "type": "SINGLE_CHOICE",
                "explanation": "Did not + base form.",
                "points": 1,
                "options": [
                    {"text": "didn't saw", "is_correct": False},
                    {"text": "didn't see", "is_correct": True},
                    {"text": "not seen", "is_correct": False},
                ],
            },
        ],
    },
    "present_perfect": {
        "title": "Present Perfect Practice",
        "questions": [
            {
                "prompt": "Choose: I ___ this book three times.",
                "type": "SINGLE_CHOICE",
                "explanation": "Present perfect: have/has + past participle.",
                "points": 1,
                "options": [
                    {"text": "read", "is_correct": False},
                    {"text": "have read", "is_correct": True},
                    {"text": "am reading", "is_correct": False},
                ],
            },
            {
                "prompt": "Present perfect connects past actions to the present.",
                "type": "TRUE_FALSE",
                "explanation": "Result or experience still relevant now.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "She has ___ to Paris.",
                "type": "SINGLE_CHOICE",
                "explanation": "Past participle of 'go' is 'been'.",
                "points": 1,
                "options": [
                    {"text": "went", "is_correct": False},
                    {"text": "been", "is_correct": True},
                    {"text": "goes", "is_correct": False},
                ],
            },
            {
                "prompt": "'Since' is often used with present perfect.",
                "type": "TRUE_FALSE",
                "explanation": "Since marks the starting point.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Which is correct?",
                "type": "SINGLE_CHOICE",
                "explanation": "Have/has + past participle.",
                "points": 1,
                "options": [
                    {"text": "They have finish.", "is_correct": False},
                    {"text": "They have finished.", "is_correct": True},
                    {"text": "They has finished.", "is_correct": False},
                ],
            },
        ],
    },
    "conditionals": {
        "title": "Conditionals Practice",
        "questions": [
            {
                "prompt": "First conditional: If it rains, we ___ at home.",
                "type": "SINGLE_CHOICE",
                "explanation": "If + present, will + base.",
                "points": 1,
                "options": [
                    {"text": "stay", "is_correct": False},
                    {"text": "will stay", "is_correct": True},
                    {"text": "stayed", "is_correct": False},
                ],
            },
            {
                "prompt": "Second conditional describes unreal present situations.",
                "type": "TRUE_FALSE",
                "explanation": "If I were rich, I would travel.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "If I ___ you, I would apologize.",
                "type": "SINGLE_CHOICE",
                "explanation": "Second conditional uses 'were' for all persons.",
                "points": 1,
                "options": [
                    {"text": "am", "is_correct": False},
                    {"text": "were", "is_correct": True},
                    {"text": "was", "is_correct": False},
                ],
            },
            {
                "prompt": "Zero conditional uses present in both clauses.",
                "type": "TRUE_FALSE",
                "explanation": "If you heat ice, it melts.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Third conditional refers to past unreal situations.",
                "type": "TRUE_FALSE",
                "explanation": "If I had known, I would have helped.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
        ],
    },
    "newton": {
        "title": "Newton's Laws",
        "questions": [
            {
                "prompt": "Newton's first law is also called the law of inertia.",
                "type": "TRUE_FALSE",
                "explanation": "Objects stay at rest or in motion unless acted upon.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "F = ma relates force, mass, and:",
                "type": "SINGLE_CHOICE",
                "explanation": "Second law: force equals mass times acceleration.",
                "points": 1,
                "options": [
                    {"text": "acceleration", "is_correct": True},
                    {"text": "velocity", "is_correct": False},
                    {"text": "energy", "is_correct": False},
                ],
            },
            {
                "prompt": "For every action there is an equal and opposite reaction.",
                "type": "TRUE_FALSE",
                "explanation": "Newton's third law.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Unit of force in SI is:",
                "type": "SINGLE_CHOICE",
                "explanation": "Newton (N).",
                "points": 1,
                "options": [
                    {"text": "Joule", "is_correct": False},
                    {"text": "Newton", "is_correct": True},
                    {"text": "Watt", "is_correct": False},
                ],
            },
            {
                "prompt": "Mass and weight are the same quantity.",
                "type": "TRUE_FALSE",
                "explanation": "Weight is force; mass is amount of matter.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": False},
                    {"text": "False", "is_correct": True},
                ],
            },
        ],
    },
    "motion": {
        "title": "Motion Practice",
        "questions": [
            {
                "prompt": "Speed is distance divided by time.",
                "type": "TRUE_FALSE",
                "explanation": "v = d/t.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "A car travels 100 km in 2 hours. Average speed is:",
                "type": "SINGLE_CHOICE",
                "explanation": "100/2 = 50 km/h.",
                "points": 1,
                "options": [
                    {"text": "25 km/h", "is_correct": False},
                    {"text": "50 km/h", "is_correct": True},
                    {"text": "200 km/h", "is_correct": False},
                ],
            },
            {
                "prompt": "Acceleration is the rate of change of velocity.",
                "type": "TRUE_FALSE",
                "explanation": "a = Δv/Δt.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Which is a vector quantity?",
                "type": "SINGLE_CHOICE",
                "explanation": "Velocity has direction.",
                "points": 1,
                "options": [
                    {"text": "Speed", "is_correct": False},
                    {"text": "Velocity", "is_correct": True},
                    {"text": "Distance", "is_correct": False},
                ],
            },
            {
                "prompt": "Uniform motion means constant speed in a straight line.",
                "type": "TRUE_FALSE",
                "explanation": "No acceleration in uniform motion.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
        ],
    },
    "energy": {
        "title": "Energy Practice",
        "questions": [
            {
                "prompt": "Kinetic energy depends on mass and speed.",
                "type": "TRUE_FALSE",
                "explanation": "KE = ½mv².",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Unit of energy in SI is:",
                "type": "SINGLE_CHOICE",
                "explanation": "Joule (J).",
                "points": 1,
                "options": [
                    {"text": "Newton", "is_correct": False},
                    {"text": "Joule", "is_correct": True},
                    {"text": "Pascal", "is_correct": False},
                ],
            },
            {
                "prompt": "Potential energy increases when an object is raised.",
                "type": "TRUE_FALSE",
                "explanation": "Gravitational PE = mgh.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Energy cannot be created or destroyed.",
                "type": "TRUE_FALSE",
                "explanation": "Law of conservation of energy.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
            {
                "prompt": "Power is energy per unit time.",
                "type": "TRUE_FALSE",
                "explanation": "P = E/t, measured in watts.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            },
        ],
    },
}

_TOPIC_MATCHERS: list[tuple[str, str]] = [
    ("fraction", "fractions"),
    ("quadratic", "quadratic"),
    ("linear function", "linear"),
    ("present perfect", "present_perfect"),
    ("past simple", "past_simple"),
    ("conditional", "conditionals"),
    ("newton", "newton"),
    ("motion", "motion"),
    ("energy", "energy"),
]

_SUBJECT_MATCHERS: list[tuple[str, str]] = [
    ("math", "math"),
    ("english", "past_simple"),
    ("physics", "motion"),
]


def resolve_fixture_key(
    *,
    subject_name: str | None = None,
    topic_name: str | None = None,
) -> str:
    haystack = " ".join(filter(None, [subject_name, topic_name])).lower()
    if topic_name:
        topic_lower = topic_name.lower()
        for needle, key in _TOPIC_MATCHERS:
            if needle in topic_lower and key in FIXTURE_CHALLENGES:
                return key
    if subject_name:
        subject_lower = subject_name.lower()
        for needle, key in _SUBJECT_MATCHERS:
            if needle in subject_lower and key in FIXTURE_CHALLENGES:
                return key
    return "default"


def get_fixture(
    *,
    subject_name: str | None = None,
    topic_name: str | None = None,
    question_count: int = 5,
) -> dict:
    key = resolve_fixture_key(subject_name=subject_name, topic_name=topic_name)
    data = FIXTURE_CHALLENGES[key]
    questions = data["questions"][:question_count]
    return {"title": data["title"], "questions": questions}
