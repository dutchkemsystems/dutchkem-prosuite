// convex/social.ts — barrel re-export (original was 2585 lines, now split into modules)
// All exports preserved for backward compatibility

export { PLATFORM_CONFIGS, SUPPORTED_PLATFORMS, COMPOSIO_APP_MAP, TRYPOST_PLATFORMS } from "./social/platform-configs";
export { storeOAuthState, getOAuthState, deleteOAuthState } from "./social/oauth-helpers";
export {
  generateOAuthUrl, handleOAuthCallback, savePlatformConnection,
  postToPlatform, getConnectedPlatforms, diagnosticGetAllConnections,
  manualPost, getPlatformsFromDb, getConnectionForPlatform,
  disconnectPlatform, disconnectAllPlatforms, updatePostingSettings,
  logPost, getSocialStats, getPlatformAnalytics, getOAuthStatus,
} from "./social/core";
export {
  startComposioOAuth, handleComposioCallback, getOAuthProviderStatus,
  startTryPostOAuth, syncFromTryPost,
} from "./social/composio-trypost";
export {
  connectTelegramBot, connectBluesky,
  facebookUploadMedia, facebookGetComments, facebookReplyToComment, facebookDeletePost,
  instagramPublishPhoto, instagramPublishVideo, instagramPublishCarousel,
  instagramGetInsights, instagramGetComments, instagramSendDM,
  twitterUploadMedia, twitterGetUserInfo, twitterLikeTweet, twitterReplyToTweet, twitterSearchTweets,
  linkedinGetProfile, linkedinGetOrganizations,
  youtubeGetChannelInfo, youtubeListVideos, youtubeGetAnalytics, youtubeTrackPerformance,
  redditCreatePost, redditGetSubredditInfo,
  canvaDesignPublish, canvaListTemplates,
} from "./social/platform-actions";
export {
  refreshExpiredTokens, refreshFollowerCounts, getTokenStatus, manualRefreshToken,
} from "./social/token-management";
