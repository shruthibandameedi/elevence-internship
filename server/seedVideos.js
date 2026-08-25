import video from "./Modals/video.js";

export async function seedSampleVideos() {
  try {
    // Automatically update any existing video records in database with expired/blocked gtv-videos-bucket URLs
    await video.updateMany(
      { filepath: /gtv-videos-bucket/i },
      { $set: { filepath: "https://www.w3schools.com/html/mov_bbb.mp4" } }
    );

    const count = await video.countDocuments();
    if (count === 0) {
      console.log("Database is empty. Seeding sample videos for development/demo...");
      const sampleVideos = [
        {
          videotitle: "Sample YouTube Video - Big Buck Bunny",
          filename: "BigBuckBunny.mp4",
          filetype: "video/mp4",
          filepath: "https://www.w3schools.com/html/mov_bbb.mp4",
          filesize: "15MB",
          videochanel: "Blender Open Studio",
          Like: 1420,
          views: 35200,
          uploader: "demo_user_1",
        },
        {
          videotitle: "Nature Documentary & Wildlife",
          filename: "2025-06-25T06-09-29.296Z-vdo.mp4",
          filetype: "video/mp4",
          filepath: "uploads/2025-06-25T06-09-29.296Z-vdo.mp4",
          filesize: "1MB",
          videochanel: "Nature Channel",
          Like: 890,
          views: 18400,
          uploader: "nature_doc",
        },
        {
          videotitle: "Sintel - Animated Short",
          filename: "Sintel.mp4",
          filetype: "video/mp4",
          filepath: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
          filesize: "22MB",
          videochanel: "Open Cinema",
          Like: 2310,
          views: 49800,
          uploader: "animator_guy",
        },
        {
          videotitle: "Flower Showcase - Tech & Nature",
          filename: "Flower.mp4",
          filetype: "video/mp4",
          filepath: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
          filesize: "10MB",
          videochanel: "Tech World",
          Like: 670,
          views: 12300,
          uploader: "tech_reviewer",
        },
      ];

      await video.insertMany(sampleVideos);
      console.log(`Seeded ${sampleVideos.length} sample videos successfully!`);
    } else {
      console.log(`Database already has ${count} video(s). Preserved existing database.`);
    }
  } catch (error) {
    console.error("Error seeding sample videos:", error);
  }
}

