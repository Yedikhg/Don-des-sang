import unittest
from unittest.mock import patch
import chat_engine


class AssistantDemoTests(unittest.TestCase):
    def test_demo_never_confirms_medical_eligibility(self):
        history = [{"role": "assistant", "content": "question"}] * 8
        with patch.object(chat_engine, "GEMINI_API_KEY", ""):
            for message in ("oui", "non", "Je ne suis pas malade", "J ai 30 ans", "Je suis eligible ?", "urgence"):
                with self.subTest(message=message):
                    result = chat_engine.chat_with_donor(message, history)
                    self.assertIsNone(result["eligible"])
                    self.assertTrue(result["reply"])

    def test_health_question_is_referred_to_donation_center(self):
        with patch.object(chat_engine, "GEMINI_API_KEY", ""):
            result = chat_engine.chat_with_donor("Je prends un medicament")
        self.assertIn("centre de don", result["reply"])
        self.assertIsNone(result["eligible"])

    def test_remote_reply_is_not_a_medical_verdict(self):
        with patch.object(chat_engine, "_call_gemini", return_value="Vous etes eligible"):
            result = chat_engine.chat_with_donor("oui")
        self.assertIsNone(result["eligible"])


if __name__ == "__main__":
    unittest.main()
