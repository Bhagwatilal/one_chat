import { Voice } from '../types';

const ELEVENLABS_API_KEY = 'sk_8c2070a1b74a5622e8bdf4b9cbc29978d5dfc4b25c17acd9';

export async function textToSpeech(text: string, voice: Voice): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate speech');
  }

  return response.arrayBuffer();
}

export async function playAudio(audioData: ArrayBuffer) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(audioData);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start(0);
  return new Promise<void>((resolve) => {
    source.onended = () => resolve();
  });
}