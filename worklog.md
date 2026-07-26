---
Task ID: 1
Agent: Main Agent
Task: Fix "No frame uploaded" bug in AI Avatar Machine when using Custom Frames

Work Log:
- Explored the codebase and identified the project structure (Next.js app at /home/z/my-project/)
- Found the "No frame uploaded" error originates in auto-chain/route.ts:759 when `preUploadedFrameUrls[i]` is empty/falsy
- Identified root cause: **Index mapping mismatch** between `scenes` array and `scenesWithContent` array
  - `preUploadedFrameUrls` was built indexed by `scenes.length` (all scenes including empty ones)
  - `chainScenes` was built from `scenesWithContent` (only scenes with content)
  - When there are empty scenes, the indexes don't match, causing frame URLs to be placed at wrong positions or lost entirely
- Fixed both `startAutoChain` and `startFramesOnly` functions in AIAvatarMachine.tsx:
  - Changed `preUploadedFrameUrls` array size from `scenes.length` to `scenesWithContent.length`
  - Changed iteration from `scenes[i]` to `scenesWithContent[ci]` for both frame uploads and reference uploads
  - Added better error handling: now logs HTTP status and response text when upload fails
  - Added verification check after uploads to warn if some frames failed to upload
- Build verified successfully

Stage Summary:
- Root cause: Index mismatch between `scenes` and `scenesWithContent` arrays when building `preUploadedFrameUrls`
- Fixed in both `startAutoChain` and `startFramesOnly` callbacks
- Added better error logging for failed uploads
- Added post-upload verification warning

---
Task ID: schedule-real-api-fix
Agent: Main Agent
Task: Schedule Machine still showed 'Connect your Blotato account' after env fix — find the real root cause

Work Log:
- Re-cloned project_repo (had been cleared between sessions)
- Verified .env has BLOTATO_API_KEY and Dockerfile sources it correctly
- Tested api.blotato.com from sandbox: NXDOMAIN (even on 8.8.8.8 and 1.1.1.1)
- Tested api.postpeer.dev: reachable but rejects blt_ keys (expected)
- Fetched https://help.blotato.com/api/start (Blotato's official API docs)
- DISCOVERED the real API:
  * Base URL: https://backend.blotato.com/v2 (NOT api.blotato.com/v1/api)
  * Auth header: blotato-api-key: YOUR_API_KEY (NOT Bearer, NOT x-access-key)
  * List accounts: GET /v2/users/me/accounts
  * List posts: GET /v2/posts?limit=N
  * Create post: POST /v2/posts with body {post:{accountId,target,content}}
- VERIFIED LIVE with the user's actual API key:
  * GET /v2/users/me/accounts -> 200, returned real account:
    {id:'49043', platform:'tiktok', username:'armorayactiva'}
  * GET /v2/posts?limit=5 -> 200, returned {items:[]}
  * POST /v2/posts -> 201, returned {postSubmissionId:'uuid'}
  * Discovered required TikTok target fields: privacyLevel, disabledComments,
    disabledDuet, disabledStitch, isBrandedContent, isYourBrand, isAiGenerated
  * DELETE /v2/posts/{id} -> 404 (endpoint doesn't exist; v2 doesn't support delete)
- Completely rewrote src/lib/blotato.ts with correct base URL, auth header,
  and request/response schemas. All endpoints match the live API.
- Updated src/app/api/schedule/debug/route.ts to test the REAL endpoints
  (attempt 1 and 2) plus the old wrong endpoint (attempt 3, for comparison —
  expected to fail with NXDOMAIN, proving the old code was broken).
- Updated src/app/api/schedule/accounts/route.ts to strip surrounding quotes
  from the key defensively.
- TypeScript type-check passed (src/ is clean).
- Committed (02ec2c0) and pushed to GitHub. Railway will auto-redeploy.

Stage Summary:
- The root cause was that the previous BlotatoService used a non-existent
  API hostname (api.blotato.com — NXDOMAIN on every DNS resolver). The real
  hostname is backend.blotato.com.
- The user has 1 TikTok account connected: @armorayactiva (id: 49043).
- After Railway redeploys (~2-3 min), Schedule Machine should immediately
  show this account and the user can start scheduling posts.
- The /api/schedule/debug endpoint now provides a live diagnostic report
  with a clear summary and recommendation.
