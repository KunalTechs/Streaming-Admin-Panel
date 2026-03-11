import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs-extra";
import {exec} from "child_process";
import util from "util";
const execPromise = util.promisify(exec);

// Key: videoId, Value: ffmpeg command instance
export const activeJobs = new Map();

export const transcodeHLS = async (videoId, inputPath, outputDir) => {
  await fs.ensureDir(outputDir);

  return new Promise((resolve, reject) => {

    const command = ffmpeg(inputPath);

    activeJobs.set(videoId, command);

    command
      // Configuration for 360p, 480p, and 720p
      .output(path.join(outputDir, "360.m3u8"))
      .videoFilters("scale=w=640:h=360:force_original_aspect_ratio=decrease")
      .videoCodec("libx264")
      .addOptions([
        "-b:v 800k",
        "-maxrate 856k",
        "-bufsize 1200k",
        "-hls_time 10",
        "-hls-list-size 0",
      ])

      .output(path.join(outputDir, "480p.m3u8"))
      .videoFilters("scale=w=854:h=480:force_original_aspect_ratio=decrease")
      .videoCodec("libx264")
      .addOptions([
        "-b:v 1400k",
        "-maxrate 1498k",
        "-bufsize 2100k",
        "-hls_time 10",
        "-hls_list_size 0",
      ])

      .output(path.join(outputDir, "720p.m3u8"))
      .videoFilters("scale=w=1280:h=720:force_original_aspect_ratio=decrease")
      .videoCodec("libx264")
      .addOptions([
        "-b:v 2800k",
        "-maxrate 2996k",
        "-bufsize 4200k",
        "-hls_time 10",
        "-hls_list_size 0",
      ])

      .output(path.join(outputDir, "1080p.m3u8"))
      .videoFilters("scale=w=1920:h=1080:force_original_aspect_ratio=decrease")
      .videoCodec("libx264")
      .addOptions([
        "-b:v 5000k",
        "-maxrate 5350k",
        "-bufsize 7500k",
        "-hls_time 10",
        "-hls_list_size 0",
      ])

      .on('start', (command) => console.log('FFmpeg started', command))
      .on('progress',(progress) =>{
        if(progress.percent) {
            console.log(` processing: ${Math.round(progress.percent)}% done`);
        }
      })
      .on('end', async () =>{
        activeJobs.delete(videoId); //Remove from map when finished
        console.log(` Individual varients generated. Creating master playlist...`);
        try {
            await createMasterPlaylist(outputDir);
            resolve();
        } catch (error) {
            reject(error);
        }
      })
      .on('error',(err)=>{
        activeJobs.delete(videoId); // ✅ Clean up map on error/kill
      })
      .run();
  });
};

/**
 * Manually creates the master.m3u8 file that links the resolutions.
 */
const createMasterPlaylist = async (outputDir) =>{
    const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8`;

await fs.writeFile(path.join(outputDir, 'master.m3u8'), masterContent);
}

export const validateVideoFile = async (filePath) => {
  try {
    // We add -select_streams v:0 to specifically look for video
    const command = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -show_format "${filePath}"`;

    const { stdout } = await execPromise(command);

    // 1. Check if it actually contains a video stream
    const hasVideo = stdout.includes("codec_type=video");
    // 2. Check if it has a duration
    const hasDuration = stdout.includes("duration=");

    if (!hasVideo || !hasDuration) {
      throw new Error("File is missing a valid video stream or duration.");
    }

    console.log("🔍 File Validation Passed.");
    return true;
  } catch (error) {
    console.error("❌ FFprobe Validation Failed:", error.message);
    return false;
  }
}