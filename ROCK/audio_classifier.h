// audio_classifier.h — On-device audio classification via ST YAMNet-256
// Runs TFLite Micro inference on ESP32-S3 to classify environmental sounds.
//
// Pipeline: PCM audio → mel spectrogram (64×96) → YAMNet int8 → 10 ESC-10 classes
// Inference time: ~150-300ms on ESP32-S3 at 240MHz
//
// ESC-10 classes mapped to Maddi categories:
//   dog_bark → domestic     rain → nature        sea_waves → nature
//   baby_cry → domestic     clock_tick → domestic person_sneeze → domestic
//   helicopter → traffic    chainsaw → traffic    rooster → nature
//   fire_crackling → nature

#pragma once

#include <cstdint>
#include <cmath>
#include <arduinoFFT.h>

// ── ESC-10 class labels and category mapping ──

constexpr int NUM_CLASSES = 10;

const char* const ESC10_LABELS[NUM_CLASSES] = {
  "dog_bark", "rain", "sea_waves", "baby_cry", "clock_tick",
  "person_sneeze", "helicopter", "chainsaw", "rooster", "fire_crackling"
};

const char* const ESC10_CATEGORIES[NUM_CLASSES] = {
  "domestic", "nature", "nature", "domestic", "domestic",
  "domestic", "traffic", "traffic", "nature", "nature"
};

// ── Mel spectrogram parameters ──

constexpr int MEL_SAMPLE_RATE = 16000;
constexpr int MEL_WINDOW_SIZE = 400;     // 25ms at 16kHz
constexpr int MEL_HOP_SIZE = 160;        // 10ms at 16kHz
constexpr int MEL_FFT_SIZE = 512;        // next power of 2
constexpr int MEL_N_MELS = 64;
constexpr int MEL_N_FRAMES = 96;
constexpr int MEL_AUDIO_SAMPLES = MEL_HOP_SIZE * (MEL_N_FRAMES - 1) + MEL_WINDOW_SIZE;  // ~15,760 samples = ~0.985s

// ── Mel filterbank (precomputed for 64 bins, 125-7500Hz, 512-point FFT) ──

struct MelFilter {
  int start_bin;    // first FFT bin for this mel band
  int end_bin;      // last FFT bin (exclusive)
  float weights[32]; // filter weights (max 32 bins per mel band)
};

// Forward declarations
void initMelFilterbank();
bool computeMelSpectrogram(const int16_t* audio, int numSamples, int8_t* output, float inputScale, int inputZeroPoint);

// ── Classification result ──

struct AudioClassResult {
  const char* label;      // e.g. "dog_bark"
  const char* category;   // e.g. "domestic"
  float confidence;       // 0.0 - 1.0
  int classIndex;         // 0-9

  // Top-3 for richer context
  const char* labels[3];
  float scores[3];
};

// ── Global state ──

static MelFilter melFilters[MEL_N_MELS];
static bool melFilterbankReady = false;
static ArduinoFFT<float> fft;

// ── Mel filterbank initialization ──

static float hzToMel(float hz) {
  return 2595.0f * log10f(1.0f + hz / 700.0f);
}

static float melToHz(float mel) {
  return 700.0f * (powf(10.0f, mel / 2595.0f) - 1.0f);
}

void initMelFilterbank() {
  if (melFilterbankReady) return;

  const float fMin = 125.0f;
  const float fMax = 7500.0f;
  const float melMin = hzToMel(fMin);
  const float melMax = hzToMel(fMax);
  const float melStep = (melMax - melMin) / (MEL_N_MELS + 1);
  const float binWidth = (float)MEL_SAMPLE_RATE / MEL_FFT_SIZE;

  float melPoints[MEL_N_MELS + 2];
  for (int i = 0; i < MEL_N_MELS + 2; i++) {
    melPoints[i] = melToHz(melMin + i * melStep);
  }

  for (int m = 0; m < MEL_N_MELS; m++) {
    float fCenter = melPoints[m + 1];
    float fLow = melPoints[m];
    float fHigh = melPoints[m + 2];

    int startBin = (int)(fLow / binWidth);
    int endBin = (int)(fHigh / binWidth) + 1;
    if (startBin < 0) startBin = 0;
    if (endBin > MEL_FFT_SIZE / 2) endBin = MEL_FFT_SIZE / 2;

    melFilters[m].start_bin = startBin;
    melFilters[m].end_bin = min(endBin, startBin + 32);

    for (int k = startBin; k < melFilters[m].end_bin; k++) {
      float freq = k * binWidth;
      float weight = 0;
      if (freq >= fLow && freq <= fCenter) {
        weight = (freq - fLow) / (fCenter - fLow + 1e-6f);
      } else if (freq > fCenter && freq <= fHigh) {
        weight = (fHigh - freq) / (fHigh - fCenter + 1e-6f);
      }
      melFilters[m].weights[k - startBin] = weight;
    }
  }

  melFilterbankReady = true;
  Serial.println("[YAMNet] Mel filterbank initialized (64 bins, 125-7500Hz)");
}

// ── Compute mel spectrogram from PCM audio ──

bool computeMelSpectrogram(const int16_t* audio, int numSamples, int8_t* output, float inputScale, int inputZeroPoint) {
  if (!melFilterbankReady) {
    initMelFilterbank();
  }

  if (numSamples < MEL_AUDIO_SAMPLES) {
    Serial.printf("[YAMNet] Audio too short: %d samples, need %d\n", numSamples, MEL_AUDIO_SAMPLES);
    return false;
  }

  float vReal[MEL_FFT_SIZE];
  float vImag[MEL_FFT_SIZE];
  float magnitudes[MEL_FFT_SIZE / 2];

  for (int frame = 0; frame < MEL_N_FRAMES; frame++) {
    int offset = frame * MEL_HOP_SIZE;

    // Apply Hann window + load FFT input
    for (int i = 0; i < MEL_WINDOW_SIZE; i++) {
      float window = 0.5f * (1.0f - cosf(2.0f * M_PI * i / (MEL_WINDOW_SIZE - 1)));
      vReal[i] = (float)audio[offset + i] / 32768.0f * window;
    }
    // Zero-pad
    for (int i = MEL_WINDOW_SIZE; i < MEL_FFT_SIZE; i++) {
      vReal[i] = 0;
    }
    for (int i = 0; i < MEL_FFT_SIZE; i++) {
      vImag[i] = 0;
    }

    // FFT
    fft.windowing(vReal, MEL_FFT_SIZE, FFT_WIN_TYP_RECTANGLE, FFT_FORWARD);
    fft.compute(vReal, vImag, MEL_FFT_SIZE, FFT_FORWARD);

    // Compute magnitudes
    for (int k = 0; k < MEL_FFT_SIZE / 2; k++) {
      magnitudes[k] = vReal[k] * vReal[k] + vImag[k] * vImag[k];
    }

    // Apply mel filterbank + log scaling + quantize to int8
    for (int m = 0; m < MEL_N_MELS; m++) {
      float sum = 0;
      for (int k = melFilters[m].start_bin; k < melFilters[m].end_bin; k++) {
        sum += magnitudes[k] * melFilters[m].weights[k - melFilters[m].start_bin];
      }
      float logMel = logf(sum + 1e-6f);

      // Quantize to int8 using model's input quantization parameters
      int quantized = (int)roundf(logMel / inputScale) + inputZeroPoint;
      if (quantized < -128) quantized = -128;
      if (quantized > 127) quantized = 127;

      output[frame * MEL_N_MELS + m] = (int8_t)quantized;
    }
  }

  return true;
}

// ── Classify: run inference and return result ──
// Note: actual TFLite inference is called externally since it needs
// the interpreter which is set up in the main sketch.
// This function just processes the raw output tensor.

AudioClassResult processClassificationOutput(const int8_t* outputData, float outputScale, int outputZeroPoint) {
  AudioClassResult result = {};

  // Dequantize and find top-3
  float scores[NUM_CLASSES];
  for (int i = 0; i < NUM_CLASSES; i++) {
    scores[i] = (outputData[i] - outputZeroPoint) * outputScale;
  }

  // Softmax (scores may already be softmax'd, but normalize just in case)
  float maxScore = scores[0];
  for (int i = 1; i < NUM_CLASSES; i++) {
    if (scores[i] > maxScore) maxScore = scores[i];
  }
  float sumExp = 0;
  for (int i = 0; i < NUM_CLASSES; i++) {
    scores[i] = expf(scores[i] - maxScore);
    sumExp += scores[i];
  }
  for (int i = 0; i < NUM_CLASSES; i++) {
    scores[i] /= sumExp;
  }

  // Find top-3
  int topIdx[3] = {0, 0, 0};
  float topScores[3] = {-1, -1, -1};
  for (int t = 0; t < 3; t++) {
    for (int i = 0; i < NUM_CLASSES; i++) {
      bool already = false;
      for (int j = 0; j < t; j++) {
        if (topIdx[j] == i) { already = true; break; }
      }
      if (!already && scores[i] > topScores[t]) {
        topScores[t] = scores[i];
        topIdx[t] = i;
      }
    }
  }

  result.classIndex = topIdx[0];
  result.label = ESC10_LABELS[topIdx[0]];
  result.category = ESC10_CATEGORIES[topIdx[0]];
  result.confidence = topScores[0];

  for (int i = 0; i < 3; i++) {
    result.labels[i] = ESC10_LABELS[topIdx[i]];
    result.scores[i] = topScores[i];
  }

  return result;
}
