const { execSync } = require('child_process');
const cwd = 'C:\\dutchkem-ventures-platform-overview';

// Test content generation
const args = JSON.stringify({
  headline: "Ace Your Next Assignment",
  description: "AI-powered thesis writing, research papers, and citations. APA/MLA formatting included. 100% plagiarism-free.",
  cta: "Start Writing",
  hashtags: ["#AcademicWriting", "#Thesis", "#Research", "#Students", "#Nigeria"],
  targetAudience: "students"
});

console.log("=== Testing Content Generation ===\n");
try {
  const result = execSync(`npx convex run adOrchestrator:generateContentInternal ${args}`, { encoding: 'utf-8', cwd });
  const parsed = JSON.parse(result);
  console.log("✅ Content generated!");
  console.log("Content ID:", parsed.contentId);
  console.log("Headline:", parsed.headline);
  console.log("\n--- Sample Twitter Post ---");
  console.log(parsed.socialPosts?.[0]?.platformPosts?.twitter || "N/A");
  console.log("\n--- Sample LinkedIn Post ---");
  console.log(parsed.socialPosts?.[0]?.platformPosts?.linkedin || "N/A");
  console.log("\n--- Sample Facebook Post ---");
  console.log(parsed.socialPosts?.[0]?.platformPosts?.facebook || "N/A");
} catch (err) {
  console.log("❌ Error:", err.message?.slice(0, 500));
}
