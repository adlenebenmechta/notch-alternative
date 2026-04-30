---
Task ID: 1
Agent: Main Agent
Task: Build AI Viral Carousel Machine feature

Work Log:
- Explored codebase - no existing carousel feature found (fresh Next.js project)
- Created auth-server.ts with VIP_EMAILS (novaamz@gmail.com, mecifmouhaned@gmail.com)
- Created /api/carousel/plan route with BOFU prompt for carousel plan generation
- Created /api/carousel/image route for 9:16 image generation using z-ai-web-dev-sdk
- Created AIViralCarouselMachine.tsx component with text overlay support
- Updated page.tsx to use the carousel machine component
- Tested all APIs successfully

Stage Summary:
- Carousel plan generation API works (POST /api/carousel/plan returns JSON plan)
- Image generation API works (POST /api/carousel/image returns base64 image at 768x1344)
- Frontend component handles null header_text/body_text correctly (no overlay when null)
- Text overlay displays properly when header_text/body_text are present
- All images generated in 9:16 vertical format
