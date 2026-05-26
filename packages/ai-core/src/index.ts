export {
  AudioRecorderService,
  audioRecorderService,
  type RecordingStatus,
  type RecordingState,
  type AudioFile,
} from './recording/audio-recorder.service';

export {
  AudioCompressorService,
  audioCompressorService,
  type CompressedAudio,
} from './recording/audio-compressor.service';

export {
  TranscriptionService,
  transcriptionService,
  type TranscricaoResult,
  type TranscricaoSegmento,
} from './transcription/transcription.service';

export {
  SoapNoteService,
  soapNoteService,
  type SoapNoteResult,
  type SoapJson,
  type CidSugestao,
} from './notes/soap-note.service';
