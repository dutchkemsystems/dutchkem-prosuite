// ═══════════════════════════════════════════════════════════════════
// COMPOSIO TOOLKIT CATALOG — Real tool data per popular toolkit
// ═══════════════════════════════════════════════════════════════════
// This is a curated list of the most-used tools from each toolkit.
// The full 10,000+ catalog is available via the live Composio API.
// This file gives the admin UI concrete tools to display + execute.

export type ToolSchema = {
  name: string;
  description: string;
  parameters: { name: string; type: string; required: boolean; description: string }[];
  returns?: string;
  category: "read" | "write" | "execute" | "search";
};

export type ToolkitDetail = {
  toolkit: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  tools: ToolSchema[];
};

const TOOLKIT_DETAILS: ToolkitDetail[] = [
  {
    toolkit: "github",
    name: "GitHub",
    icon: "🐙",
    category: "developer",
    description: "Source code, issues, PRs, actions, and project management for GitHub repositories.",
    tools: [
      { name: "create_issue", description: "Create a new issue in a repository", category: "write", parameters: [
        { name: "owner", type: "string", required: true, description: "Repository owner" },
        { name: "repo", type: "string", required: true, description: "Repository name" },
        { name: "title", type: "string", required: true, description: "Issue title" },
        { name: "body", type: "string", required: false, description: "Issue body in markdown" },
        { name: "labels", type: "string[]", required: false, description: "Labels to apply" },
      ]},
      { name: "list_pull_requests", description: "List pull requests in a repository", category: "read", parameters: [
        { name: "owner", type: "string", required: true, description: "Repository owner" },
        { name: "repo", type: "string", required: true, description: "Repository name" },
        { name: "state", type: "string", required: false, description: "open, closed, or all" },
      ]},
      { name: "create_pull_request", description: "Create a new pull request", category: "write", parameters: [
        { name: "owner", type: "string", required: true, description: "Repository owner" },
        { name: "repo", type: "string", required: true, description: "Repository name" },
        { name: "title", type: "string", required: true, description: "PR title" },
        { name: "head", type: "string", required: true, description: "Head branch" },
        { name: "base", type: "string", required: true, description: "Base branch" },
      ]},
      { name: "search_repositories", description: "Search for GitHub repositories", category: "search", parameters: [
        { name: "query", type: "string", required: true, description: "Search query" },
      ]},
      { name: "star_repository", description: "Star a repository for the authenticated user", category: "execute", parameters: [
        { name: "owner", type: "string", required: true, description: "Repository owner" },
        { name: "repo", type: "string", required: true, description: "Repository name" },
      ]},
      { name: "get_file_contents", description: "Get the contents of a file in a repository", category: "read", parameters: [
        { name: "owner", type: "string", required: true, description: "Repository owner" },
        { name: "repo", type: "string", required: true, description: "Repository name" },
        { name: "path", type: "string", required: true, description: "File path" },
      ]},
      { name: "create_comment", description: "Add a comment to an issue or PR", category: "write", parameters: [
        { name: "owner", type: "string", required: true, description: "Repository owner" },
        { name: "repo", type: "string", required: true, description: "Repository name" },
        { name: "issue_number", type: "number", required: true, description: "Issue/PR number" },
        { name: "body", type: "string", required: true, description: "Comment text" },
      ]},
    ],
  },
  {
    toolkit: "slack",
    name: "Slack",
    icon: "💬",
    category: "communication",
    description: "Send messages, manage channels, and interact with your Slack workspace.",
    tools: [
      { name: "send_message", description: "Post a message to a channel", category: "write", parameters: [
        { name: "channel", type: "string", required: true, description: "Channel ID or name" },
        { name: "text", type: "string", required: true, description: "Message text" },
        { name: "blocks", type: "any[]", required: false, description: "Block Kit blocks" },
      ]},
      { name: "list_channels", description: "List all channels in the workspace", category: "read", parameters: [] },
      { name: "send_direct_message", description: "Send a direct message to a user", category: "write", parameters: [
        { name: "user_id", type: "string", required: true, description: "Slack user ID" },
        { name: "text", type: "string", required: true, description: "Message text" },
      ]},
      { name: "add_reaction", description: "Add an emoji reaction to a message", category: "execute", parameters: [
        { name: "channel", type: "string", required: true, description: "Channel ID" },
        { name: "timestamp", type: "string", required: true, description: "Message timestamp" },
        { name: "name", type: "string", required: true, description: "Emoji name without colons" },
      ]},
      { name: "upload_file", description: "Upload a file to a channel", category: "write", parameters: [
        { name: "channel", type: "string", required: true, description: "Channel ID" },
        { name: "filename", type: "string", required: true, description: "File name" },
        { name: "content", type: "string", required: true, description: "File content" },
      ]},
      { name: "search_messages", description: "Search messages across the workspace", category: "search", parameters: [
        { name: "query", type: "string", required: true, description: "Search query" },
      ]},
    ],
  },
  {
    toolkit: "gmail",
    name: "Gmail",
    icon: "📧",
    category: "email",
    description: "Send, read, and manage emails via Gmail.",
    tools: [
      { name: "send_email", description: "Send a new email", category: "write", parameters: [
        { name: "to", type: "string", required: true, description: "Recipient(s)" },
        { name: "subject", type: "string", required: true, description: "Email subject" },
        { name: "body", type: "string", required: true, description: "Email body" },
        { name: "cc", type: "string", required: false, description: "CC recipients" },
        { name: "bcc", type: "string", required: false, description: "BCC recipients" },
      ]},
      { name: "list_messages", description: "List recent messages in the inbox", category: "read", parameters: [
        { name: "max_results", type: "number", required: false, description: "Max messages to return" },
        { name: "q", type: "string", required: false, description: "Search query" },
      ]},
      { name: "get_message", description: "Get a specific message by ID", category: "read", parameters: [
        { name: "message_id", type: "string", required: true, description: "Message ID" },
      ]},
      { name: "draft_email", description: "Create a draft email", category: "write", parameters: [
        { name: "to", type: "string", required: true, description: "Recipient" },
        { name: "subject", type: "string", required: true, description: "Subject" },
        { name: "body", type: "string", required: true, description: "Body" },
      ]},
      { name: "add_label", description: "Apply a label to a message", category: "execute", parameters: [
        { name: "message_id", type: "string", required: true, description: "Message ID" },
        { name: "label", type: "string", required: true, description: "Label name" },
      ]},
    ],
  },
  {
    toolkit: "google_calendar",
    name: "Google Calendar",
    icon: "📅",
    category: "productivity",
    description: "Create and manage calendar events.",
    tools: [
      { name: "create_event", description: "Create a new calendar event", category: "write", parameters: [
        { name: "summary", type: "string", required: true, description: "Event title" },
        { name: "start_time", type: "string", required: true, description: "ISO start time" },
        { name: "end_time", type: "string", required: true, description: "ISO end time" },
        { name: "description", type: "string", required: false, description: "Event description" },
      ]},
      { name: "list_events", description: "List upcoming events", category: "read", parameters: [
        { name: "max_results", type: "number", required: false, description: "Max events" },
        { name: "time_min", type: "string", required: false, description: "Earliest start time" },
      ]},
      { name: "delete_event", description: "Delete a calendar event", category: "execute", parameters: [
        { name: "event_id", type: "string", required: true, description: "Event ID" },
      ]},
    ],
  },
  {
    toolkit: "notion",
    name: "Notion",
    icon: "📝",
    category: "productivity",
    description: "Manage Notion pages, databases, and blocks.",
    tools: [
      { name: "create_page", description: "Create a new page", category: "write", parameters: [
        { name: "parent_id", type: "string", required: true, description: "Parent page or database ID" },
        { name: "title", type: "string", required: true, description: "Page title" },
        { name: "content", type: "string", required: false, description: "Page content" },
      ]},
      { name: "search", description: "Search for pages and databases", category: "search", parameters: [
        { name: "query", type: "string", required: true, description: "Search query" },
      ]},
      { name: "query_database", description: "Query a Notion database", category: "read", parameters: [
        { name: "database_id", type: "string", required: true, description: "Database ID" },
        { name: "filter", type: "any", required: false, description: "Filter object" },
      ]},
      { name: "update_page", description: "Update an existing page", category: "write", parameters: [
        { name: "page_id", type: "string", required: true, description: "Page ID" },
        { name: "properties", type: "any", required: true, description: "Properties to update" },
      ]},
    ],
  },
  {
    toolkit: "hubspot",
    name: "HubSpot",
    icon: "🟠",
    category: "crm",
    description: "Manage contacts, deals, and marketing campaigns in HubSpot.",
    tools: [
      { name: "create_contact", description: "Create a new contact", category: "write", parameters: [
        { name: "email", type: "string", required: true, description: "Contact email" },
        { name: "firstname", type: "string", required: false, description: "First name" },
        { name: "lastname", type: "string", required: false, description: "Last name" },
        { name: "phone", type: "string", required: false, description: "Phone number" },
      ]},
      { name: "list_contacts", description: "List contacts in your CRM", category: "read", parameters: [
        { name: "limit", type: "number", required: false, description: "Max results" },
      ]},
      { name: "create_deal", description: "Create a new deal", category: "write", parameters: [
        { name: "name", type: "string", required: true, description: "Deal name" },
        { name: "amount", type: "number", required: false, description: "Deal amount" },
        { name: "stage", type: "string", required: false, description: "Deal stage" },
      ]},
      { name: "send_email", description: "Send a marketing email", category: "write", parameters: [
        { name: "to", type: "string", required: true, description: "Recipient" },
        { name: "subject", type: "string", required: true, description: "Subject" },
        { name: "body", type: "string", required: true, description: "Body" },
      ]},
    ],
  },
  {
    toolkit: "salesforce",
    name: "Salesforce",
    icon: "☁️",
    category: "crm",
    description: "Manage Salesforce leads, opportunities, accounts, and custom objects.",
    tools: [
      { name: "create_lead", description: "Create a new lead", category: "write", parameters: [
        { name: "LastName", type: "string", required: true, description: "Last name" },
        { name: "Company", type: "string", required: true, description: "Company name" },
        { name: "Email", type: "string", required: false, description: "Email" },
      ]},
      { name: "query", description: "Run a SOQL query", category: "read", parameters: [
        { name: "soql", type: "string", required: true, description: "SOQL query string" },
      ]},
      { name: "create_opportunity", description: "Create a new opportunity", category: "write", parameters: [
        { name: "Name", type: "string", required: true, description: "Opportunity name" },
        { name: "StageName", type: "string", required: true, description: "Stage" },
        { name: "Amount", type: "number", required: false, description: "Amount" },
        { name: "CloseDate", type: "string", required: true, description: "Close date (YYYY-MM-DD)" },
      ]},
      { name: "update_record", description: "Update an existing record", category: "write", parameters: [
        { name: "object", type: "string", required: true, description: "Object name" },
        { name: "id", type: "string", required: true, description: "Record ID" },
        { name: "data", type: "any", required: true, description: "Fields to update" },
      ]},
    ],
  },
  {
    toolkit: "stripe",
    name: "Stripe",
    icon: "💳",
    category: "payments",
    description: "Process payments, manage customers, subscriptions, and invoices.",
    tools: [
      { name: "create_customer", description: "Create a new Stripe customer", category: "write", parameters: [
        { name: "email", type: "string", required: true, description: "Customer email" },
        { name: "name", type: "string", required: false, description: "Customer name" },
      ]},
      { name: "create_payment_intent", description: "Create a payment intent", category: "write", parameters: [
        { name: "amount", type: "number", required: true, description: "Amount in cents" },
        { name: "currency", type: "string", required: true, description: "Currency code (e.g. usd)" },
        { name: "customer", type: "string", required: false, description: "Customer ID" },
      ]},
      { name: "list_subscriptions", description: "List active subscriptions", category: "read", parameters: [
        { name: "customer", type: "string", required: false, description: "Customer ID" },
        { name: "status", type: "string", required: false, description: "active, past_due, canceled" },
      ]},
      { name: "refund_payment", description: "Refund a payment", category: "write", parameters: [
        { name: "payment_intent", type: "string", required: true, description: "Payment intent ID" },
        { name: "amount", type: "number", required: false, description: "Amount to refund in cents" },
      ]},
      { name: "create_invoice", description: "Create a new invoice", category: "write", parameters: [
        { name: "customer", type: "string", required: true, description: "Customer ID" },
        { name: "amount", type: "number", required: true, description: "Amount" },
      ]},
    ],
  },
  {
    toolkit: "shopify",
    name: "Shopify",
    icon: "🛒",
    category: "ecommerce",
    description: "Manage products, orders, and customers in your Shopify store.",
    tools: [
      { name: "list_products", description: "List products in the store", category: "read", parameters: [
        { name: "limit", type: "number", required: false, description: "Max products" },
      ]},
      { name: "create_product", description: "Create a new product", category: "write", parameters: [
        { name: "title", type: "string", required: true, description: "Product title" },
        { name: "price", type: "string", required: true, description: "Product price" },
        { name: "description", type: "string", required: false, description: "Product description" },
      ]},
      { name: "list_orders", description: "List recent orders", category: "read", parameters: [
        { name: "status", type: "string", required: false, description: "Order status" },
      ]},
      { name: "update_inventory", description: "Update product inventory", category: "write", parameters: [
        { name: "product_id", type: "string", required: true, description: "Product ID" },
        { name: "quantity", type: "number", required: true, description: "New quantity" },
      ]},
    ],
  },
  {
    toolkit: "twitter",
    name: "X (Twitter)",
    icon: "🐦",
    category: "social",
    description: "Post tweets, reply, like, and follow on X.",
    tools: [
      { name: "post_tweet", description: "Post a new tweet", category: "write", parameters: [
        { name: "text", type: "string", required: true, description: "Tweet text (≤280 chars)" },
        { name: "media_ids", type: "string[]", required: false, description: "Media IDs to attach" },
      ]},
      { name: "reply_to_tweet", description: "Reply to a tweet", category: "write", parameters: [
        { name: "tweet_id", type: "string", required: true, description: "Tweet ID to reply to" },
        { name: "text", type: "string", required: true, description: "Reply text" },
      ]},
      { name: "search_tweets", description: "Search recent tweets", category: "search", parameters: [
        { name: "query", type: "string", required: true, description: "Search query" },
        { name: "max_results", type: "number", required: false, description: "Max tweets" },
      ]},
      { name: "like_tweet", description: "Like a tweet", category: "execute", parameters: [
        { name: "tweet_id", type: "string", required: true, description: "Tweet ID" },
      ]},
    ],
  },
  {
    toolkit: "linkedin",
    name: "LinkedIn",
    icon: "💼",
    category: "social",
    description: "Post updates, share articles, and manage your professional network.",
    tools: [
      { name: "post_update", description: "Post an update to your feed", category: "write", parameters: [
        { name: "text", type: "string", required: true, description: "Post text" },
        { name: "media", type: "string", required: false, description: "Media URL" },
      ]},
      { name: "share_article", description: "Share an article with a comment", category: "write", parameters: [
        { name: "url", type: "string", required: true, description: "Article URL" },
        { name: "commentary", type: "string", required: false, description: "Your comment" },
      ]},
      { name: "get_profile", description: "Get your LinkedIn profile info", category: "read", parameters: [] },
    ],
  },
  {
    toolkit: "facebook",
    name: "Facebook",
    icon: "📘",
    category: "social",
    description: "Post to pages, manage ads, and engage with your audience.",
    tools: [
      { name: "post_to_page", description: "Post to a Facebook page", category: "write", parameters: [
        { name: "page_id", type: "string", required: true, description: "Page ID" },
        { name: "message", type: "string", required: true, description: "Post text" },
        { name: "link", type: "string", required: false, description: "Link to share" },
      ]},
      { name: "create_ad", description: "Create a Facebook ad campaign", category: "write", parameters: [
        { name: "name", type: "string", required: true, description: "Campaign name" },
        { name: "objective", type: "string", required: true, description: "Campaign objective" },
        { name: "budget", type: "number", required: true, description: "Daily budget" },
      ]},
    ],
  },
  {
    toolkit: "instagram",
    name: "Instagram",
    icon: "📸",
    category: "social",
    description: "Post photos, reels, and stories to Instagram Business accounts.",
    tools: [
      { name: "post_photo", description: "Post a photo", category: "write", parameters: [
        { name: "image_url", type: "string", required: true, description: "Image URL" },
        { name: "caption", type: "string", required: true, description: "Caption" },
      ]},
      { name: "post_reel", description: "Post a reel", category: "write", parameters: [
        { name: "video_url", type: "string", required: true, description: "Video URL" },
        { name: "caption", type: "string", required: false, description: "Caption" },
      ]},
      { name: "get_insights", description: "Get account insights", category: "read", parameters: [
        { name: "metric", type: "string", required: true, description: "impressions, reach, profile_views" },
      ]},
    ],
  },
  {
    toolkit: "youtube",
    name: "YouTube",
    icon: "📺",
    category: "social",
    description: "Upload videos, manage playlists, and check analytics.",
    tools: [
      { name: "upload_video", description: "Upload a video", category: "write", parameters: [
        { name: "title", type: "string", required: true, description: "Video title" },
        { name: "description", type: "string", required: false, description: "Description" },
        { name: "video_file", type: "string", required: true, description: "Video file or URL" },
        { name: "tags", type: "string[]", required: false, description: "Tags" },
      ]},
      { name: "list_videos", description: "List your channel's videos", category: "read", parameters: [
        { name: "max_results", type: "number", required: false, description: "Max videos" },
      ]},
      { name: "get_video_analytics", description: "Get analytics for a video", category: "read", parameters: [
        { name: "video_id", type: "string", required: true, description: "Video ID" },
      ]},
    ],
  },
  {
    toolkit: "discord",
    name: "Discord",
    icon: "💬",
    category: "communication",
    description: "Send messages, manage channels, and interact with Discord servers.",
    tools: [
      { name: "send_message", description: "Send a message to a channel", category: "write", parameters: [
        { name: "channel_id", type: "string", required: true, description: "Channel ID" },
        { name: "content", type: "string", required: true, description: "Message content" },
      ]},
      { name: "list_channels", description: "List all channels in a server", category: "read", parameters: [
        { name: "guild_id", type: "string", required: true, description: "Server ID" },
      ]},
      { name: "add_reaction", description: "Add a reaction to a message", category: "execute", parameters: [
        { name: "channel_id", type: "string", required: true, description: "Channel ID" },
        { name: "message_id", type: "string", required: true, description: "Message ID" },
        { name: "emoji", type: "string", required: true, description: "Emoji" },
      ]},
    ],
  },
  {
    toolkit: "telegram",
    name: "Telegram",
    icon: "✈️",
    category: "communication",
    description: "Send messages, manage channels, and interact with Telegram bots.",
    tools: [
      { name: "send_message", description: "Send a message via bot", category: "write", parameters: [
        { name: "chat_id", type: "string", required: true, description: "Chat ID" },
        { name: "text", type: "string", required: true, description: "Message text" },
      ]},
      { name: "send_photo", description: "Send a photo", category: "write", parameters: [
        { name: "chat_id", type: "string", required: true, description: "Chat ID" },
        { name: "photo", type: "string", required: true, description: "Photo URL or file_id" },
        { name: "caption", type: "string", required: false, description: "Photo caption" },
      ]},
      { name: "get_updates", description: "Get recent bot updates", category: "read", parameters: [
        { name: "limit", type: "number", required: false, description: "Max updates" },
      ]},
    ],
  },
  {
    toolkit: "openai",
    name: "OpenAI",
    icon: "🧠",
    category: "ai",
    description: "Access GPT models, DALL-E, Whisper, and embeddings.",
    tools: [
      { name: "chat_completion", description: "Generate a chat completion", category: "execute", parameters: [
        { name: "model", type: "string", required: true, description: "gpt-4o, gpt-4o-mini, gpt-3.5-turbo" },
        { name: "messages", type: "any[]", required: true, description: "Array of messages" },
        { name: "temperature", type: "number", required: false, description: "0-2" },
      ]},
      { name: "generate_image", description: "Generate an image with DALL-E", category: "execute", parameters: [
        { name: "prompt", type: "string", required: true, description: "Image description" },
        { name: "size", type: "string", required: false, description: "1024x1024, 1792x1024, 1024x1792" },
      ]},
      { name: "create_embeddings", description: "Create text embeddings", category: "execute", parameters: [
        { name: "input", type: "string", required: true, description: "Text to embed" },
        { name: "model", type: "string", required: false, description: "text-embedding-3-small" },
      ]},
      { name: "transcribe_audio", description: "Transcribe audio with Whisper", category: "execute", parameters: [
        { name: "file", type: "string", required: true, description: "Audio file URL" },
      ]},
    ],
  },
  {
    toolkit: "anthropic",
    name: "Anthropic",
    icon: "🤖",
    category: "ai",
    description: "Access Claude models for advanced reasoning and generation.",
    tools: [
      { name: "messages_create", description: "Create a message with Claude", category: "execute", parameters: [
        { name: "model", type: "string", required: true, description: "claude-3-5-sonnet, claude-3-haiku" },
        { name: "messages", type: "any[]", required: true, description: "Array of messages" },
        { name: "max_tokens", type: "number", required: true, description: "Max tokens to generate" },
      ]},
      { name: "create_completion", description: "Create a legacy completion", category: "execute", parameters: [
        { name: "model", type: "string", required: true, description: "Model name" },
        { name: "prompt", type: "string", required: true, description: "Prompt" },
      ]},
    ],
  },
];

export function getAllToolkitDetails(): ToolkitDetail[] {
  return TOOLKIT_DETAILS;
}

export function getToolkitDetail(toolkit: string): ToolkitDetail | null {
  return TOOLKIT_DETAILS.find((t) => t.toolkit === toolkit) ?? null;
}

export function searchTools(query: string, toolkitFilter?: string): { toolkit: string; toolkitName: string; icon: string; tool: ToolSchema }[] {
  const q = query.toLowerCase();
  const results: { toolkit: string; toolkitName: string; icon: string; tool: ToolSchema }[] = [];
  for (const tk of TOOLKIT_DETAILS) {
    if (toolkitFilter && tk.toolkit !== toolkitFilter) continue;
    for (const tool of tk.tools) {
      if (
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tk.name.toLowerCase().includes(q)
      ) {
        results.push({ toolkit: tk.toolkit, toolkitName: tk.name, icon: tk.icon, tool });
      }
    }
  }
  return results;
}
