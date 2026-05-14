/**
 * Generate an 8-second product video from an uploaded image
 * Using KIE.ai Veo API (Image-to-Video pipeline)
 * 
 * Pipeline: Upload Image → Generate Video with Prompt → Poll → Download
 */

import fs from 'fs';
import path from 'path';

const KIE_API_KEY = 'e80261e40f242ed38ce14f4beb6e6f15';
const UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-base64-upload';
const VIDEO_GENERATE_URL = 'https://api.kie.ai/api/v1/veo/generate';
const VIDEO_STATUS_URL = 'https://api.kie.ai/api/v1/veo/record-info';

const PRODUCT_IMAGE_PATH = '/home/z/my-project/upload/2- tarte Big Stick Energy duo – shape tape concealer stick & brush.png';
const OUTPUT_VIDEO_PATH = '/home/z/my-project/download/tarte-product-video.mp4';

// ─── Product Video Prompt (Image-to-Video) ──────────────────────────────
// This prompt describes MOTION, CAMERA, and ENVIRONMENT only.
// The product itself comes from the uploaded image.
const PRODUCT_VIDEO_PROMPT = 
  "Professional product showcase video. The product slowly rotates on a clean matte white surface, " +
  "revealing every angle and detail. Soft studio lighting from the upper left creates gentle shadows " +
  "and subtle reflections on the surface. The camera performs a smooth 360-degree orbit around the product " +
  "at eye level, maintaining sharp focus on the product label and branding throughout. " +
  "Background is a clean gradient from light gray to white with no distractions. " +
  "Cinematic depth of field with gentle bokeh. The rotation is smooth and elegant, " +
  "showing the full product from all sides over 8 seconds. Photorealistic, commercial quality. " +
  "NO text overlays, NO transitions, NO fade-in, NO fade-out. Start instantly at full brightness.";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Step 1: Upload image to KIE.ai
async function uploadImage(imagePath) {
  console.log('📤 Step 1: Uploading product image to KIE.ai...');
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Data = imageBuffer.toString('base64');
  
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64Data: base64Data,
      fileName: path.basename(imagePath),
      uploadPath: 'images',
    }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error('Image upload failed: ' + (json.msg || JSON.stringify(json)));
  }
  
  const downloadUrl = json.data?.downloadUrl;
  if (!downloadUrl) {
    throw new Error('Upload succeeded but no downloadUrl returned');
  }
  
  console.log('✅ Image uploaded successfully!');
  console.log('🔗 URL:', downloadUrl);
  return downloadUrl;
}

// Step 2: Submit video generation
async function submitVideoGeneration(imageUrl) {
  console.log('\n🎬 Step 2: Submitting video generation request...');
  console.log('📝 Prompt:', PRODUCT_VIDEO_PROMPT.slice(0, 100) + '...');
  console.log('🖼️ Image URL:', imageUrl.slice(0, 80) + '...');
  console.log('📐 Model: veo3_lite | Aspect: 9:16');
  
  const res = await fetch(VIDEO_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: PRODUCT_VIDEO_PROMPT,
      imageUrls: [imageUrl],
      model: 'veo3_lite',
      aspect_ratio: '9:16',
      enableTranslation: false,
    }),
  });

  const json = await res.json();
  if (json.code !== 200) {
    throw new Error('Video submit failed: ' + (json.msg || JSON.stringify(json)));
  }
  
  const taskId = json.data?.taskId;
  if (!taskId) {
    throw new Error('No taskId for video generation');
  }
  
  console.log('✅ Video generation submitted!');
  console.log('🆔 Task ID:', taskId);
  return taskId;
}

// Step 3: Poll for video result
async function pollVideoResult(taskId) {
  console.log('\n⏳ Step 3: Waiting for video generation (this takes 5-15 minutes)...');
  
  const url = `${VIDEO_STATUS_URL}?taskId=${taskId}`;
  const startTime = Date.now();
  
  for (let i = 0; i < 180; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${KIE_API_KEY}` }
      });
      const json = await res.json();
      
      if (json.code === 200) {
        const d = json.data;
        
        // Check for success
        if (d?.successFlag === 1 || d?.status === 'success' || d?.state === 'success') {
          let resp = d.response || d.result || d;
          if (typeof resp === 'string') {
            try { resp = JSON.parse(resp); } catch {}
          }
          let videoUrl = resp?.resultUrls?.[0] || resp?.originUrls?.[0] || resp?.url || 
                        d.resultUrls?.[0] || d.videoUrl || d.video_url;
          
          if (!videoUrl && typeof resp?.resultUrls === 'string') {
            try { videoUrl = JSON.parse(resp.resultUrls)[0]; } catch {}
          }
          
          if (videoUrl) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(`\n✅ Video ready! (took ${elapsed}s)`);
            console.log('🎬 Video URL:', videoUrl);
            return videoUrl;
          }
          throw new Error('Video ready but no URL found');
        }
        
        // Check for failure
        if (d?.successFlag === 2 || d?.successFlag === 3 || d?.status === 'failed' || d?.state === 'fail') {
          throw new Error('Video generation failed: ' + (d?.errorMessage || d?.error || d?.failMsg || 'unknown'));
        }
      }
      
      // Progress update every 30 seconds
      if (i % 6 === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const status = d?.status || d?.state || 'processing';
        console.log(`  ⏳ Still processing... [${elapsed}s elapsed] (status: ${status})`);
      }
    } catch (err) {
      const msg = err.message;
      if (msg.includes('generation failed') || msg.includes('no URL')) throw err;
      console.warn(`  ⚠️ Poll ${i} error:`, msg);
    }
    
    await sleep(5000);
  }
  
  throw new Error('Video generation timed out after 15 minutes');
}

// Step 4: Download video
async function downloadVideo(videoUrl, outputPath) {
  console.log('\n📥 Step 4: Downloading video...');
  
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  
  const buffer = Buffer.from(await res.arrayBuffer());
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, buffer);
  const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
  
  console.log(`✅ Video downloaded! (${sizeMB} MB)`);
  console.log('📁 Saved to:', outputPath);
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('🎨 BOF Videos Machine — Product Video Generation');
  console.log('=' .repeat(60));
  console.log('📦 Product: Tarte Big Stick Energy Duo');
  console.log('⏱️ Duration: ~8 seconds');
  console.log('🔄 Pipeline: Image → Upload → Image-to-Video → Download');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Upload image
    const imageUrl = await uploadImage(PRODUCT_IMAGE_PATH);
    
    // Step 2: Submit video generation
    const taskId = await submitVideoGeneration(imageUrl);
    
    // Step 3: Poll for result
    const videoUrl = await pollVideoResult(taskId);
    
    // Step 4: Download video
    await downloadVideo(videoUrl, OUTPUT_VIDEO_PATH);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! Product video generated!');
    console.log('📁 File:', OUTPUT_VIDEO_PATH);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
