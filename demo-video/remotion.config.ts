import {Config} from '@remotion/cli/config';

// H.264, silent, presentation quality. JPEG intermediates keep renders fast;
// a low CRF keeps the glass gradients free of banding.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setMuted(true);
Config.setOverwriteOutput(true);
