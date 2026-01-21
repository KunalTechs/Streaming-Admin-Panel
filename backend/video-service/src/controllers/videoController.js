import prisma from "../config/prisma.js";
import fs from 'fs';
import path from 'path';


//UploadVideo
export const uploadVideo = async (req, res) => {
  try {
    const { title, adminId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "no video file uplaoded" });
    }

    // Save metadata to MySQL using Prisma
    const newVideo = await prisma.video.create({
      data: {
        title: title,
        filename: file.filename,
        url: `/uploads/videos/${file.filename}`,
        author: {
          connect: { id: adminId.replace(/"/g, "") },
        },
      },
    });

    res
      .status(200)
      .json({ message: "video Upload successfully", video: newVideo });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete Video
export const deleteVideo = async (req, res) =>{
    try {
        const {id}= req.params;

        //Find video to get the filename
        const video  = await prisma.video.findUnique({where: {id}});
        if(!video) return res.status(404).json({error: "Video not found"});

        //Delete file from local storage
        //for temparary untill file service not made and minIO not implement
        const filePath = path.join(process.cwd(), 'uploads/videos', video.filename);
        if(fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        //Delete from Database
        await prisma.video.delete({where: {id}});

        res.status(200).json({message:"Video Deleted Successfully"});

    } catch (error) {
        res.status(500).json({error:"Delete Failed"});
        
    }
};

// Update Video
export const updateVideo = async (req,res) =>{
    try {
        const {id} = req.params;
        const {title, description} = req.body;

        const updatedVideo = await prisma.video.update({
            where: {id},
            data:{
                title: title?.replace(''),
                description
            }
        })
        res.status(200).json("video update successfully",updatedVideo);
    } catch (error) {
        res.status(500).json({error: "Update failed"});
    }
};

export const getVideos = async (req,res) =>{
  try {
    const { id: adminId, role } = req.user;
    const {page =1, limit =10, search=""} = req.query;

    const queryFilter = {
      title: { contains: search },
      ...(role !== 'SUPERADMIN' && { authorId: adminId }) 
    };

    const videos =await prisma.findMany({
      where: queryFilter,
      take: parseInt(limit),// Limit results
      skip: (page-1)* limit,
    include: {
        author: {
          select: { username: true, email: true } // SuperAdmin can see who uploaded what
        }
      },
      orderBy: {createdAt: 'desc'}
    });

    const total = await prisma.video.count({ where: queryFilter });

    res.json({
      videos,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({error: "failed to fetch videos"});
  }
}


