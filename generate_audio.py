"""
ENGAGENEERING(TM) -- Native Language Audio Generator (edge-tts version)
==================================================================
Generates high-quality low-pitched neural female voices for German, Punjabi, and Spanish.

NOTE: pa-IN (Punjabi) voices are not available on edge-tts servers.
      The Punjabi entries use hi-IN-SwaraNeural as the closest South Asian neural
      female voice. The original Gurmukhi script text is preserved unchanged.

SETUP (run in Command Prompt):
    pip install edge-tts

USAGE:
    python generate_audio.py
"""

import asyncio
import edge_tts
import os

AUDIOS = [
    # -- GERMAN ----------------------------------------------------------
    {
        "file":     "audio/q_de_recursion_audio.mp3",
        "voice":    "de-DE-KatjaNeural",
        "pitch":    "-10Hz",
        "label":    "German QUESTION -- Recursion (KatjaNeural, pitch: -10Hz)",
        "text":     (
            "Wie erkl\u00e4rt man Rekursion jemandem, "
            "der noch nie in seinem Leben einen einzigen Code geschrieben hat? "
            "Ich brauche ein klares Beispiel aus dem Alltag, "
            "ohne technische Begriffe."
        ),
    },
    {
        "file":     "audio/a_de_recursion_audio.mp3",
        "voice":    "de-DE-KatjaNeural",
        "pitch":    "-10Hz",
        "label":    "German ANSWER -- Recursion (KatjaNeural, pitch: -10Hz)",
        "text":     (
            "Stell dir vor, du stehst zwischen zwei Spiegeln, die sich gegen\u00fcberstehen. "
            "Du siehst dein Spiegelbild \u2014 ein Spiegelbild eines Spiegelbildes \u2014 "
            "immer weiter, bis es zu klein ist, um es zu sehen. "
            "Jeder Spiegel macht genau dasselbe: Er spiegelt, was vor ihm ist. "
            "Weil vor ihm ein weiterer Spiegel steht, der dasselbe tut, entsteht Tiefe. "
            "Der Spiegel braucht keine besonderen Anweisungen f\u00fcr das hundertste Spiegelbild. "
            "Er macht einfach seine eine Aufgabe. "
            "Rekursion in der Programmierung ist genau das. "
            "Du schreibst eine Funktion, die sich selbst mit einer kleineren Version "
            "des gleichen Problems aufruft \u2014 "
            "bis das Problem so einfach ist, dass es direkt gel\u00f6st werden kann. "
            "Zwei Spiegel. Eine Regel. Unendliche Tiefe."
        ),
    },

    # -- PUNJABI (Gurmukhi script - original text preserved) ----------------
    # Note: pa-IN voices are unavailable on edge-tts; using hi-IN-SwaraNeural
    # as the closest available South Asian neural female voice.
    {
        "file":     "audio/q_pu_motivation_audio.mp3",
        "voice":    "hi-IN-SwaraNeural",
        "pitch":    "-10Hz",
        "label":    "Punjabi QUESTION -- Motivation vs Discipline (original Gurmukhi text)",
        "text":     (
            "\u0a2a\u0a4d\u0a30\u0a47\u0a30\u0a23\u0a3e \u0a05\u0a24\u0a47 \u0a05\u0a28\u0a41\u0a38\u0a3c\u0a3e\u0a38\u0a28 \u0a35\u0a3f\u0a71\u0a1a \u0a05\u0a38\u0a32 \u0a2b\u0a3c\u0a30\u0a15 \u0a15\u0a40 \u0a39\u0a48? "
            "\u0a05\u0a24\u0a47 \u0a38\u0a3e\u0a28\u0a42\u0a70 \u0a05\u0a38\u0a32 \u0a35\u0a3f\u0a71\u0a1a \u0a15\u0a3f\u0a39\u0a5c\u0a40 \u0a1a\u0a40\u0a1c\u0a3c \u0a06\u0a2a\u0a23\u0a47 \u0a05\u0a70\u0a26\u0a30 "
            "\u0a05\u0a24\u0a47 \u0a06\u0a2a\u0a23\u0a47 \u0a35\u0a3f\u0a26\u0a3f\u0a06\u0a30\u0a25\u0a40\u0a06\u0a70 \u0a35\u0a3f\u0a71\u0a1a \u0a2c\u0a23\u0a3e\u0a09\u0a23\u0a40 \u0a1a\u0a3e\u0a39\u0a40\u0a26\u0a40 \u0a39\u0a48?"
        ),
    },
    {
        "file":     "audio/a_pu_motivation_audio.mp3",
        "voice":    "hi-IN-SwaraNeural",
        "pitch":    "-10Hz",
        "label":    "Punjabi ANSWER -- Motivation vs Discipline (original Gurmukhi text)",
        "text":     (
            "\u0a2a\u0a4d\u0a30\u0a47\u0a30\u0a23\u0a3e \u0a09\u0a39 \u0a2d\u0a3e\u0a35\u0a28\u0a3e \u0a39\u0a48 \u0a1c\u0a4b \u0a24\u0a41\u0a39\u0a3e\u0a28\u0a42\u0a70 \u0a38\u0a3c\u0a41\u0a30\u0a42 \u0a15\u0a30\u0a26\u0a40 \u0a39\u0a48\u0964 "
            "\u0a05\u0a28\u0a41\u0a38\u0a3c\u0a3e\u0a38\u0a28 \u0a09\u0a39 \u0a2a\u0a4d\u0a30\u0a23\u0a3e\u0a32\u0a40 \u0a39\u0a48 \u0a1c\u0a4b \u0a24\u0a41\u0a39\u0a3e\u0a28\u0a42\u0a70 \u0a1c\u0a3e\u0a30\u0a40 \u0a30\u0a71\u0a16\u0a26\u0a40 \u0a39\u0a48 "
            "\u0a1c\u0a26\u0a4b\u0a02 \u0a2d\u0a3e\u0a35\u0a28\u0a3e \u0a1a\u0a32\u0a40 \u0a1c\u0a3e\u0a02\u0a26\u0a40 \u0a39\u0a48\u0964 "
            "\u0a2c\u0a39\u0a41\u0a24 \u0a38\u0a3e\u0a30\u0a47 \u0a32\u0a4b\u0a15\u0a3e\u0a02 \u0a26\u0a40 \u0a17\u0a32\u0a24\u0a40 \u0a07\u0a39 \u0a39\u0a48 \u0a15\u0a3f \u0a09\u0a39 \u0a06\u0a2a\u0a23\u0a40 \u0a1c\u0a3c\u0a3f\u0a70\u0a26\u0a17\u0a40 "
            "\u0a2a\u0a4d\u0a30\u0a47\u0a30\u0a23\u0a3e \u0a26\u0a47 \u0a06\u0a27\u0a3e\u0a30 \u0a24\u0a47 \u0a2c\u0a23\u0a3e\u0a09\u0a02\u0a26\u0a47 \u0a39\u0a28\u0964 "
            "\u0a09\u0a39 \u0a09\u0a26\u0a4b\u0a02 \u0a24\u0a71\u0a15 \u0a09\u0a21\u0a40\u0a15 \u0a15\u0a30\u0a26\u0a47 \u0a39\u0a28 \u0a1c\u0a26\u0a4b\u0a02 \u0a24\u0a71\u0a15 \u0a09\u0a39\u0a28\u0a3e\u0a02 \u0a28\u0a42\u0a70 "
            "\u0a15\u0a41\u0a1d \u0a15\u0a30\u0a28 \u0a26\u0a3e \u0a2e\u0a28 \u0a28\u0a39\u0a40\u0a02 \u0a15\u0a30\u0a26\u0a3e\u0964 "
            "\u0a2a\u0a30 \u0a2d\u0a3e\u0a35\u0a28\u0a3e\u0a35\u0a3e\u0a02 \u0a2e\u0a4c\u0a38\u0a2e \u0a35\u0a30\u0a17\u0a40\u0a06\u0a02 \u0a39\u0a28\u0964 \u0a09\u0a39 \u0a2c\u0a3f\u0a28\u0a3e\u0a70 \u0a1a\u0a47\u0a24\u0a3e\u0a35\u0a28\u0a40 \u0a26\u0a47 \u0a2c\u0a26\u0a32 \u0a1c\u0a3e\u0a02\u0a26\u0a40\u0a06\u0a02 \u0a39\u0a28\u0964 "
            "\u0a05\u0a28\u0a41\u0a38\u0a3c\u0a3e\u0a38\u0a28 \u0a07\u0a71\u0a15 \u0a22\u0a3e\u0a02\u0a1a\u0a3e \u0a39\u0a48\u0964 \u0a07\u0a39 \u0a2a\u0a30\u0a35\u0a3e\u0a39 \u0a28\u0a39\u0a40\u0a02 \u0a15\u0a30\u0a26\u0a3e \u0a15\u0a3f \u0a24\u0a41\u0a38\u0a40\u0a02 \u0a15\u0a3f\u0a35\u0a47\u0a02 \u0a2e\u0a39\u0a3f\u0a38\u0a42\u0a38 \u0a15\u0a30\u0a26\u0a47 \u0a39\u0a4b\u0964 "
            "\u0a07\u0a71\u0a15 \u0a2a\u0a47\u0a38\u0a3c\u0a47\u0a35\u0a30 \u0a32\u0a47\u0a16\u0a15 \u0a09\u0a39\u0a28\u0a3e\u0a02 \u0a26\u0a3f\u0a28\u0a3e\u0a02 \u0a35\u0a3f\u0a71\u0a1a \u0a35\u0a40 \u0a32\u0a3f\u0a16\u0a26\u0a3e \u0a39\u0a48 "
            "\u0a1c\u0a26\u0a4b\u0a02 \u0a09\u0a39 \u0a32\u0a3f\u0a16\u0a23\u0a3e \u0a28\u0a39\u0a40\u0a02 \u0a1a\u0a3e\u0a39\u0a41\u0a70\u0a26\u0a3e\u0964 "
            "\u0a2a\u0a4d\u0a30\u0a23\u0a3e\u0a32\u0a40 \u0a2c\u0a23\u0a3e\u0a13\u0964 \u0a2d\u0a3e\u0a35\u0a28\u0a3e \u0a2a\u0a3f\u0a71\u0a1b\u0a47 \u0a06\u0a35\u0a47\u0a17\u0a40\u0964 "
            "\u0a1c\u0a3e\u0a02 \u0a28\u0a39\u0a40\u0a02 \u0a06\u0a35\u0a47\u0a17\u0a40\u0964 \u0a05\u0a24\u0a47 \u0a24\u0a41\u0a38\u0a40\u0a02 \u0a15\u0a70\u0a2e \u0a15\u0a30\u0a4b\u0a17\u0a47 \u0a2b\u0a3f\u0a30 \u0a35\u0a40\u0964"
        ),
    },

    # -- SPANISH ----------------------------------------------------------
    {
        "file":     "audio/bonus_es_motivation_audio.mp3",
        "voice":    "es-ES-ElviraNeural",
        "pitch":    "-10Hz",
        "label":    "Spanish BONUS -- Motivation vs Discipline (ElviraNeural, pitch: -10Hz)",
        "text":     (
            "La motivaci\u00f3n es el sentimiento que te hace querer empezar. "
            "La disciplina es el sistema que te hace continuar cuando ese sentimiento desaparece. "
            "El error que comete la mayor\u00eda de las personas es construir su vida "
            "alrededor de la motivaci\u00f3n. "
            "Esperan hasta sentir ganas de ir al gimnasio. "
            "Esperan hasta sentirse inspirados para estudiar. "
            "Pero los sentimientos son como el clima. Cambian sin previo aviso. "
            "La disciplina es infraestructura. No le importa c\u00f3mo te sientes. "
            "Un escritor profesional escribe los d\u00edas que odia escribir. "
            "Construye el sistema. El sentimiento vendr\u00e1 despu\u00e9s. "
            "O no vendr\u00e1. Y de todas formas har\u00e1s el trabajo."
        ),
    },
]

async def generate():
    print("ENGAGENEERING(TM) -- Multi-lingual Neural Audio Generator")
    print("=" * 60)
    os.makedirs("audio", exist_ok=True)

    for item in AUDIOS:
        print(f"\nProcessing: {item['label']}")
        print(f"  Target: {item['file']}")
        try:
            communicate = edge_tts.Communicate(item["text"], item["voice"], pitch=item["pitch"])
            await communicate.save(item["file"])
            size = os.path.getsize(item["file"])
            print(f"  [OK] Saved ({size // 1024} KB)")
        except Exception as e:
            print(f"  [ERR] Error: {e}")

    print("\n" + "=" * 60)
    print("Done.")

if __name__ == "__main__":
    asyncio.run(generate())
