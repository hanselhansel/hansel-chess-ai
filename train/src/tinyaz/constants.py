N_PLANES = 19
CHANNELS = 64
N_BLOCKS = 8
POLICY_PLANES = 73
VALUE_CH = 8
VALUE_HIDDEN = 64
C_PUCT = 1.5
PLAY_VISITS = 64
TRAIN_VISITS = 256
SNAPSHOT_VISITS = 1
ONE_VISIT = 1
PARAM_CAP = 3_000_000
MODEL_NAME = "tinyaz-s"
BOARD = 8
SQUARES = 64

QUEEN_DIRS = (
    (0, 1),
    (1, 1),
    (1, 0),
    (1, -1),
    (0, -1),
    (-1, -1),
    (-1, 0),
    (-1, 1),
)
KNIGHT_DELTAS = (
    (1, 2),
    (2, 1),
    (2, -1),
    (1, -2),
    (-1, -2),
    (-2, -1),
    (-2, 1),
    (-1, 2),
)

SOURCE_RANDOM = 0
SOURCE_LICHESS_2013_01 = 1
SOURCE_SELFPLAY_64 = 2
SOURCE_NAMES = {
    SOURCE_RANDOM: "random",
    SOURCE_LICHESS_2013_01: "lichess-2013-01",
    SOURCE_SELFPLAY_64: "selfplay-64",
}


def flip_index(i: int) -> int:
    """Rank-flip only. Files stay put so kingside stays kingside."""
    return i ^ 56


def square_index(file: int, rank: int) -> int:
    return rank * 8 + file


def file_of(i: int) -> int:
    return i & 7


def rank_of(i: int) -> int:
    return i >> 3


def algebraic_to_index(sq: str) -> int:
    return square_index(ord(sq[0]) - 97, int(sq[1]) - 1)


def index_to_algebraic(i: int) -> str:
    return f"{chr(97 + file_of(i))}{rank_of(i) + 1}"


def param_count() -> int:
    stem = N_PLANES * CHANNELS * 9 + CHANNELS
    block = 2 * (CHANNELS * CHANNELS * 9 + CHANNELS)
    policy = CHANNELS * POLICY_PLANES + POLICY_PLANES
    vconv = CHANNELS * VALUE_CH + VALUE_CH
    fc1 = VALUE_CH * 64 * VALUE_HIDDEN + VALUE_HIDDEN
    fc2 = VALUE_HIDDEN + 1
    return stem + N_BLOCKS * block + policy + vconv + fc1 + fc2


def flops_per_eval() -> int:
    stem = CHANNELS * N_PLANES * 9 * 64
    block = 2 * CHANNELS * CHANNELS * 9 * 64
    policy = POLICY_PLANES * CHANNELS * 64
    vconv = VALUE_CH * CHANNELS * 64
    fc1 = VALUE_CH * 64 * VALUE_HIDDEN
    fc2 = VALUE_HIDDEN
    return stem + N_BLOCKS * block + policy + vconv + fc1 + fc2

