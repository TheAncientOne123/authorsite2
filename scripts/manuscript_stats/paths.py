from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE_DIR.parent.parent
DEFAULT_CONFIG = PACKAGE_DIR / "config" / "necromancia-medianoche.json"
SITE_DATA_DIR = REPO_ROOT / "src" / "data"
MANUSCRIPT_STATS_JSON = SITE_DATA_DIR / "necromancia-manuscript-stats.json"
SUMMARY_STATS_JSON = SITE_DATA_DIR / "necromancia-a-medianoche-stats.json"
DEBUG_OUTPUT_DIR = PACKAGE_DIR / "output"
