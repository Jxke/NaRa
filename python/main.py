import speech_recognition as sr

def listen_and_recognize():
    # Initialize the recognizer
    recognizer = sr.Recognizer()

    # Get input from the microphone
    with sr.Microphone() as source:
        print("\n🎤 Adjusting for ambient noise...")
        # Automatically adjust to ambient noise level (improves recognition accuracy)
        recognizer.adjust_for_ambient_noise(source, duration=1)
        
        print("🗣️ Please speak now! (Listening...)")
        try:
            # Record audio (stops automatically when you stop speaking)
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
            print("⏳ Analyzing audio...")

            # Convert to text using Google's free Speech Recognition API
            text = recognizer.recognize_google(audio, language="en-US")
            return text

        except sr.WaitTimeoutError:
            return "Error: No speech detected (Timeout)"
        except sr.UnknownValueError:
            return "Error: Could not understand the audio"
        except sr.RequestError as e:
            return f"Error: Network error occurred ({e})"

def main():
    while True:
        # Capture speech
        user_text = listen_and_recognize()
        print(f"👉 Recognized text: {user_text}")
        
        # If there is no "Error", pass the text to the LLM!
        if "Error:" not in user_text:
            print("🚀 Sending this to the LLM as a prompt!\n")
            # Example: response = client.messages.create(..., messages=[{"role": "user", "content": user_text}])
            
        input("Press Enter to start the next recognition (Ctrl+C to exit): ")

if __name__ == "__main__":
    main()