N_PLANES = 19
CHANNELS = 64
N_BLOCKS = 8
POLICY_PLANES = 73
VALUE_CH = 8
VALUE_HIDDEN = 64
C_PUCT = 1.5
PLAY_VISITS = 64
PARAM_CAP = 3_000_000
MODEL_NAME = "tinyaz-s"

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

def flip_index(i: int) -> int:
    """Rank-flip only. Files stay put so kingside stays kingside."""
    return i ^ 56
