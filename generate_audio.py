"""
ENGAGENEERING™ — Native Language Audio Generator
================================================
Run this on your Windows laptop (requires internet for gTTS).

SETUP (run once in Command Prompt):
    pip install gtts pydub

USAGE:
    python generate_audio.py

OUTPUT:
    Creates audio/ folder with all MP3 files ready to upload back to Claude.

FILES GENERATED:
    German  (de) — q_de_recursion_audio.mp3
    Punjabi (pa) — q_pu_motivation_audio.mp3  + a_pu_motivation_audio.mp3

    NOTE: Spanish added here for future use if needed.
"""

from gtts import gTTS
import os

os.makedirs("audio", exist_ok=True)

AUDIOS = [

    # ── GERMAN ──────────────────────────────────────────────────
    {
        "file":     "audio/q_de_recursion_audio.mp3",
        "lang":     "de",
        "label":    "German QUESTION — Recursion (Emma, Student)",
        "text":     (
            "Wie erklärt man Rekursion jemandem, "
            "der noch nie in seinem Leben einen einzigen Code geschrieben hat? "
            "Ich brauche ein klares Beispiel aus dem Alltag, "
            "ohne technische Begriffe."
        ),
    },
    {
        "file":     "audio/a_de_recursion_audio.mp3",
        "lang":     "de",
        "label":    "German ANSWER — Recursion (Mr. Marcus, Teacher)",
        "text":     (
            "Stell dir vor, du stehst zwischen zwei Spiegeln, die sich gegenüberstehen. "
            "Du siehst dein Spiegelbild — ein Spiegelbild eines Spiegelbildes — "
            "immer weiter, bis es zu klein ist, um es zu sehen. "
            "Jeder Spiegel macht genau dasselbe: Er spiegelt, was vor ihm ist. "
            "Weil vor ihm ein weiterer Spiegel steht, der dasselbe tut, entsteht Tiefe. "
            "Der Spiegel braucht keine besonderen Anweisungen für das hundertste Spiegelbild. "
            "Er macht einfach seine eine Aufgabe. "
            "Rekursion in der Programmierung ist genau das. "
            "Du schreibst eine Funktion, die sich selbst mit einer kleineren Version "
            "des gleichen Problems aufruft — "
            "bis das Problem so einfach ist, dass es direkt gelöst werden kann. "
            "Zwei Spiegel. Eine Regel. Unendliche Tiefe."
        ),
    },

    # ── PUNJABI ──────────────────────────────────────────────────
    {
        "file":     "audio/q_pu_motivation_audio.mp3",
        "lang":     "pa",
        "label":    "Punjabi QUESTION — Motivation vs Discipline (Gurpreet Sir)",
        "text":     (
            "ਪ੍ਰੇਰਣਾ ਅਤੇ ਅਨੁਸ਼ਾਸਨ ਵਿੱਚ ਅਸਲ ਫ਼ਰਕ ਕੀ ਹੈ? "
            "ਅਤੇ ਸਾਨੂੰ ਅਸਲ ਵਿੱਚ ਕਿਹੜੀ ਚੀਜ਼ ਆਪਣੇ ਅੰਦਰ "
            "ਅਤੇ ਆਪਣੇ ਵਿਦਿਆਰਥੀਆਂ ਵਿੱਚ ਬਣਾਉਣੀ ਚਾਹੀਦੀ ਹੈ?"
        ),
    },
    {
        "file":     "audio/a_pu_motivation_audio.mp3",
        "lang":     "pa",
        "label":    "Punjabi ANSWER — Motivation vs Discipline (Gurpreet Sir)",
        "text":     (
            "ਪ੍ਰੇਰਣਾ ਉਹ ਭਾਵਨਾ ਹੈ ਜੋ ਤੁਹਾਨੂੰ ਸ਼ੁਰੂ ਕਰਦੀ ਹੈ। "
            "ਅਨੁਸ਼ਾਸਨ ਉਹ ਪ੍ਰਣਾਲੀ ਹੈ ਜੋ ਤੁਹਾਨੂੰ ਜਾਰੀ ਰੱਖਦੀ ਹੈ "
            "ਜਦੋਂ ਭਾਵਨਾ ਚਲੀ ਜਾਂਦੀ ਹੈ। "
            "ਬਹੁਤ ਸਾਰੇ ਲੋਕਾਂ ਦੀ ਗਲਤੀ ਇਹ ਹੈ ਕਿ ਉਹ ਆਪਣੀ ਜ਼ਿੰਦਗੀ "
            "ਪ੍ਰੇਰਣਾ ਦੇ ਆਧਾਰ ਤੇ ਬਣਾਉਂਦੇ ਹਨ। "
            "ਉਹ ਉਦੋਂ ਤੱਕ ਉਡੀਕ ਕਰਦੇ ਹਨ ਜਦੋਂ ਤੱਕ ਉਹਨਾਂ ਨੂੰ "
            "ਕੁਝ ਕਰਨ ਦਾ ਮਨ ਨਹੀਂ ਕਰਦਾ। "
            "ਪਰ ਭਾਵਨਾਵਾਂ ਮੌਸਮ ਵਰਗੀਆਂ ਹਨ। ਉਹ ਬਿਨਾਂ ਚੇਤਾਵਨੀ ਦੇ ਬਦਲ ਜਾਂਦੀਆਂ ਹਨ। "
            "ਅਨੁਸ਼ਾਸਨ ਇੱਕ ਢਾਂਚਾ ਹੈ। ਇਹ ਪਰਵਾਹ ਨਹੀਂ ਕਰਦਾ ਕਿ ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰਦੇ ਹੋ। "
            "ਇੱਕ ਪੇਸ਼ੇਵਰ ਲੇਖਕ ਉਹਨਾਂ ਦਿਨਾਂ ਵਿੱਚ ਵੀ ਲਿਖਦਾ ਹੈ "
            "ਜਦੋਂ ਉਹ ਲਿਖਣਾ ਨਹੀਂ ਚਾਹੁੰਦਾ। "
            "ਪ੍ਰਣਾਲੀ ਬਣਾਓ। ਭਾਵਨਾ ਪਿੱਛੇ ਆਵੇਗੀ। "
            "ਜਾਂ ਨਹੀਂ ਆਵੇਗੀ। ਅਤੇ ਤੁਸੀਂ ਕੰਮ ਕਰੋਗੇ ਫਿਰ ਵੀ।"
        ),
    },

    # ── SPANISH (bonus — for future videos) ──────────────────────
    {
        "file":     "audio/bonus_es_motivation_audio.mp3",
        "lang":     "es",
        "label":    "Spanish BONUS — Motivation vs Discipline",
        "text":     (
            "La motivación es el sentimiento que te hace querer empezar. "
            "La disciplina es el sistema que te hace continuar cuando ese sentimiento desaparece. "
            "El error que comete la mayoría de las personas es construir su vida "
            "alrededor de la motivación. "
            "Esperan hasta sentir ganas de ir al gimnasio. "
            "Esperan hasta sentirse inspirados para estudiar. "
            "Pero los sentimientos son como el clima. Cambian sin previo aviso. "
            "La disciplina es infraestructura. No le importa cómo te sientes. "
            "Un escritor profesional escribe los días que odia escribir. "
            "Construye el sistema. El sentimiento vendrá después. "
            "O no vendrá. Y de todas formas harás el trabajo."
        ),
    },

]

print("ENGAGENEERING™ — Generating native language audio files")
print("=" * 55)

for item in AUDIOS:
    print(f"\n{item['label']}")
    print(f"  Language: {item['lang'].upper()}")
    print(f"  Output:   {item['file']}")
    try:
        tts = gTTS(text=item["text"], lang=item["lang"], slow=False)
        tts.save(item["file"])
        size = os.path.getsize(item["file"])
        print(f"  ✓ Saved  ({size//1024}KB)")
    except Exception as e:
        print(f"  ✗ Error: {e}")

print("\n" + "=" * 55)
print("Done. Upload all files in the audio/ folder back to Claude.")
print("\nFiles generated:")
for f in os.listdir("audio"):
    path = f"audio/{f}"
    print(f"  {f}  ({os.path.getsize(path)//1024}KB)")
