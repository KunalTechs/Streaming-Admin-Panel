import path from "path";
import {
  downloadVideoFromS3,
  uploadFolderToS3,
  deleteFileFromS3,
} from "../services/s3.service.js";
import { transcodeHLS, validateVideoFile } from "../services/ffmpeg.service.js";
import {
  cleanupJobDirectory,
  createJobDirectory,
} from "../utils/file-system.js";
import { emitTranscoderEvent } from "../events/transcoder.producer.js";

export const processVideoJob = async (videoId, s3Key) => {
  console.log(`Starting Job: ${videoId}`);

  // 1. Setup local workspace
  const jobDir = await createJobDirectory(videoId);
  const inputPath = path.join(jobDir, "input.mp4");
  const outputDir = path.join(jobDir, "hls_output");

  try {
    // 2. Download raw video from S3
    console.log(`Downloading raw video: ${s3Key}...`);
    await downloadVideoFromS3(inputPath, s3Key);

    //3.VALIDATE (The Guard)
    const isValid = await validateVideoFile(inputPath);
    if(!isValid){
        // If it's a fake/corrupt file, notify the Video Service and stop
        await emitTranscoderEvent("TRANSCODING_FAILED",{
           videoId: videoId,
        reason: "FFprobe validation failed: Not a valid video file."
        });
        throw new Error("Invalid video file -aborting job.");
    }

    // 4. Transcode to multi-resolution HLS
    console.log(` Transcoding ${videoId} to HLS (360p, 480p, 720p, 1080p)...`);
    await transcodeHLS(videoId, inputPath, outputDir);

    // 5. Upload the HLS folder back to S3
    // We store it in a dedicated folder: processed/videoId/
    const destinationFolder = `processed/${videoId}`;
    console.log(`Uploading Hls segments to S3: ${destinationFolder}...`);
    await uploadFolderToS3(outputDir, destinationFolder);

    // 6. Success! Now delete the original raw file from S3 to save space
    console.log(`Cleaning up S3: Deleting raw file...`);
    await deleteFileFromS3(s3Key);

    // 7. Notify Video Service
    const masterPlaylistKey = `${destinationFolder}/master.m3u8`;
    
    console.log(`📢 Emitting Finish Event for ${videoId}`);
    
    await emitTranscoderEvent("TRANSCODING_FINISHED", {
      videoId: videoId,
      hlsKey: masterPlaylistKey,
    });

    console.log(`Success! Video ${videoId} is now available in HLS.`);

    // 8. Final Return
    return masterPlaylistKey;

  } catch (error) {
    console.error(`❌ Job Failed for Video ${videoId}:`, error.message);
    throw error;
  } finally {
    // 6. ALWAYS cleanup local Windows temp files, even if it failed
    await cleanupJobDirectory(jobDir);
  }
};
