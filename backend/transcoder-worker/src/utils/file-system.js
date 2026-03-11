import fs from 'fs-extra';
import path from 'path';

//Creates a unique folder in /temp for a specific video job.

export const createJobDirectory = async (videoId) =>{
    const jobDir = path.join(process.cwd(), 'temp', videoId);
    await fs.ensureDir(jobDir); // Creates /temp/videoId if it doesn't exist
    return jobDir;
};

// Safely deletes the entire job directory after upload or on error
export const cleanupJobDirectory =async (jobDir) =>{
    try {
        if (jobDir && jobDir.includes('temp')){
            await fs.remove(jobDir);
            console.log(` Cleaned up tem directory : ${jobDir}`)
        }
    } catch (error) {
        console.error(` Failed to cleanup ${jobDir}`, error.message);
    }
};