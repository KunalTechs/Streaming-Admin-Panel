import { consumer } from "../config/kafka.js";
import { activeJobs } from "../services/ffmpeg.service.js";
import { processVideoJob } from "../workers/video.worker.js";

export const startTranscoderConsumer = async () =>{
    await consumer.connect();

    // Subscribe to the main topic from Video Service
    await consumer.subscribe({ topic: 'video-events', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ message }) =>{
            const payload =JSON.parse(message.value.toString());

            const videoId = payload.data.videoId;
            const s3Key = payload.data.fileKey;

            if (payload.event === 'VIDEO_UPLOADED') {
                console.log(` New Video Detected: ${videoId}`);


                try {
                    await processVideoJob(videoId, s3Key);
                } catch (error) {
                    console.error("❌ Transcoding failed:", error.message);
                }
            }
            else if (payload.event === 'VIDEO_DELETED'){
                
                if (activeJobs.has(videoId)){
                    console.log(`⚠️ Deletion requested for active job ${videoId}. Killing FFmpeg...`);
                    const command = activeJobs.get(videoId);
                    command.kill('SIGKILL'); // This stops FFmpeg immediately
                    activeJobs.delete(videoId);
                } else {
                    console.log(`🗑️ Video ${videoId} was deleted. Skipping transcode.`);
                }
            }
        }
    });
};