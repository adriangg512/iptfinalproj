from tastebot_data import QA_PAIRS
import re
from difflib import SequenceMatcher


def get_tastebot_reply(user_message: str) -> str:
  """
  Return the closest matching canned response for the given user message.
  Falls back to a generic beginner-friendly reply if nothing is close.
  """
  if not user_message:
    return (
      "Ingredients: (depends on the dish)\n"
      "Steps: 1. Tell me the main ingredient you want to use. "
      "2. I’ll suggest a simple beginner-friendly recipe.\n"
      "Difficulty: Easy\n"
      "Tips: Try to include what tools you have (pan, oven, rice cooker) so I can guide you better."
    )

  def normalize(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[\u2018\u2019]", "'", text)  # smart apostrophes → '
    text = re.sub(r"[^a-z0-9\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

  msg = normalize(user_message)

  best_item = None
  best_score = 0.0

  for item in QA_PAIRS:
    prompt = normalize(item["prompt"])
    score = SequenceMatcher(None, msg, prompt).ratio()
    if score > best_score:
      best_score = score
      best_item = item

  # If similarity is too low, do NOT guess—use a safe fallback.
  if not best_item or best_score < 0.55:
    return (
      "Ingredients: (depends on the dish)\n"
      "Steps: 1. Tell me the main ingredient you want to cook. "
      "2. Say if you want it fried, boiled, or baked. "
      "3. I’ll match you with an easy recipe from my list.\n"
      "Difficulty: Easy\n"
      "Tips: The more details you give (ingredients, tools, time), the better I can help."
    )

  return best_item["response"]


if __name__ == "__main__":
  # Tiny manual test
  while True:
    try:
      q = input("You: ")
    except (EOFError, KeyboardInterrupt):
      break
    print("TasteBot:", get_tastebot_reply(q))

