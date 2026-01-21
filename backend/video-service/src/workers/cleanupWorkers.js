import cron from 'node-cron';
import fs from 'fs';
import prisma from '../config/prisma';

// Runs every day at midnight
cron.schedule('0 0 * * *' , async()=> {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);


const videoToDelete = await prisma.video.findMany({
    where :{
        adminDeletedAt: {lte: fiveDaysAgo},
        status: 'TRASH'
    }
});

//Delete the physical file
for (const video of videoToDelete){
    const filePath = `./uploads/videos/${video.filename}`;
    if(fs.existsSync(filePath)){
        fs.unlinkSync(filePath);
    }

    await prisma.video.delete({where: {id: video.id}});

}
console.log(`Cleanup completed: ${videosToDelete.length} videos removed.`);
});