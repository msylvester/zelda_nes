// Audio module barrel export

export {
  AudioContextManager,
  getAudioContextManager,
  resetAudioContextManager,
} from './AudioContext';
export type { AudioSystemState } from './AudioContext';

export {
  ToneGenerator,
  createPulseWave,
  createNoiseBuffer,
  clearToneCache,
} from './ToneGenerator';
export type {
  PulseDuty,
  NoiseMode,
  ChannelType,
  VolumeEnvelope,
  ToneConfig,
  NoiseConfig,
} from './ToneGenerator';

export {
  AudioManager,
  SOUND_EFFECTS,
  getAudioManager,
  resetAudioManager,
} from './AudioManager';
export type { SfxFrame, SoundEffect } from './AudioManager';
