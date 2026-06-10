import asyncio
import edge_tts

async def generate():
    print("ENGAGENEERING™ — Hindi/Tamil Neural Audio Generator")
    print("==================================================")
    
    # Hindi question (Female voice: Swara, lower pitch)
    t_hi = edge_tts.Communicate(
        "कक्षा में जिज्ञासा कैसे जगाएं जब छात्र बिल्कुल रुचि नहीं दिखाते?", 
        voice="hi-IN-SwaraNeural", 
        pitch="-10Hz"
    )
    await t_hi.save("q06_hindi_audio.mp3")
    print("[OK] Hindi audio generated: q06_hindi_audio.mp3 (SwaraNeural, pitch: -10Hz)")

    # Tamil question (Female voice: Pallavi, lower pitch)
    t_ta = edge_tts.Communicate(
        "ஒரு மாணவன் கேட்கும் கேள்வி எப்படி ஆசிரியரையே மாற்றிவிடுகிறது?", 
        voice="ta-IN-PallaviNeural", 
        pitch="-10Hz"
    )
    await t_ta.save("q09_tamil_audio.mp3")
    print("[OK] Tamil audio generated: q09_tamil_audio.mp3 (PallaviNeural, pitch: -10Hz)")
    print("==================================================")
    print("Done.")

if __name__ == "__main__":
    asyncio.run(generate())