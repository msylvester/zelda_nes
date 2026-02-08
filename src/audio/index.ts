// Audio module barrel export

export {
  AudioContextManager,
  AudioSystemState,
  getAudioContextManager,
  resetAudioContextManager,
} from './AudioContext';

export {
  ToneGenerator,
  PulseDuty,
  NoiseMode,
  ChannelType,
  VolumeEnvelope,
  ToneConfig,
  NoiseConfig,
  createPulseWave,
  createNoiseBuffer,
  clearToneCache,
} from './ToneGenerator';

export {
  AudioManager,
  SfxFrame,
  SoundEffect,
  SOUND_EFFECTS,
  getAudioManager,
  resetAudioManager,
} from './AudioManager';
