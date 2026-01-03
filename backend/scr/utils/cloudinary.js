import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadOnCloudinary = async (localpath) => {
  try {
    cloudinary.config({ 
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
      api_key: process.env.CLOUDINARY_API_KEY, 
      api_secret: process.env.CLOUDINARY_API_SECRET 
    });

    if (!localpath) {
      console.error("❌ Cloudinary: No local path provided");
      return null;
    }

    // Convert relative path to absolute path
    let absolutePath = localpath;
    if (!path.isAbsolute(localpath)) {
      // If relative, resolve from project root (backend directory)
      absolutePath = path.resolve(process.cwd(), localpath);
    }

    // Normalize path separators (Windows backslashes to forward slashes)
    absolutePath = path.normalize(absolutePath);

    console.log("📤 Cloudinary: Uploading file from:", absolutePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      console.error("❌ Cloudinary: File does not exist at path:", absolutePath);
      return null;
    }

    const response = await cloudinary.uploader.upload(absolutePath, {
      resource_type: "auto"
    });

    console.log("✅ Cloudinary: File uploaded successfully:", response.url);
    
    // Delete local file after successful upload
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log("🗑️ Cloudinary: Local file deleted");
    }

    return response;
  }
  catch (error) {
    console.error("❌ Cloudinary upload error:", error.message);
    console.error("Error details:", error);
    
    // Try to clean up file if it exists
    try {
      let absolutePath = localpath;
      if (localpath && !path.isAbsolute(localpath)) {
        absolutePath = path.resolve(process.cwd(), localpath);
      }
      absolutePath = path.normalize(absolutePath);
      
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log("🗑️ Cloudinary: Cleaned up local file after error");
      }
    } catch (cleanupError) {
      console.error("❌ Error cleaning up file:", cleanupError.message);
    }
    
    return null;
  }
}

export { uploadOnCloudinary }