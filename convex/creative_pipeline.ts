// ═══════════════════════════════════════════════════════════════════
// AUTOMATED CREATIVE PIPELINE - 24/7 Generation & Posting
// Barrel re-export — preserves api.creative_pipeline.* import paths
// ═══════════════════════════════════════════════════════════════════

export {
  FLYER_TEMPLATES,
  POSTER_TEMPLATES,
  VIDEO_TEMPLATES,
} from "./creative_pipeline/templates";

export {
  enablePipelineInternal,
  getPipelineStatus,
  togglePipeline,
  getPipelineStatusInternal,
  updatePipelineStatus,
} from "./creative_pipeline/status";

export {
  generateFlyer,
  generatePoster,
  generateVideo,
  saveFlyerInternal,
  savePosterInternal,
  saveVideoInternal,
  generateFlyerInternal,
  generatePosterInternal,
  generateVideoInternal,
} from "./creative_pipeline/generate";

export {
  generateFlyerInternalNoAuth,
  generatePosterInternalNoAuth,
  generateVideoInternalNoAuth,
} from "./creative_pipeline/internal_generate";

export {
  pipelineTick,
  batchGenerateForAllAgents,
  getGeneratedFlyers,
  getGeneratedPosters,
  getGeneratedVideos,
} from "./creative_pipeline/batch";
