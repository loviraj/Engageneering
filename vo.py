from gtts import gTTS
# Hindi question
t = gTTS('कक्षा में जिज्ञासा कैसे जगाएं जब छात्र बिल्कुल रुचि नहीं दिखाते', lang='hi')
t.save('q06_hindi_audio.mp3')

# Tamil question  
t2 = gTTS('ஒரு மாணவன் கேட்கும் கேள்வி எப்படி ஆசிரியரையே மாற்றிவிடுகிறது', lang='ta')
t2.save('q09_tamil_audio.mp3')
print('Done')