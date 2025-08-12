// api/sign-upload.js
const cloudinary = require('cloudinary').v2;

// IMPORTANT: These will be set as Environment Variables in Vercel
const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const api_key = process.env.CLOUDINARY_API_KEY;
const api_secret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({ cloud_name, api_key, api_secret });

export default function handler(request, response) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // The preset name you created in the Cloudinary dashboard
  const upload_preset = 'shopify_community_gallery'; 

  try {
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        upload_preset: upload_preset,
      },
      api_secret
    );

    response.status(200).json({
      signature,
      timestamp,
      api_key,
    });
  } catch (error) {
    console.error("Error signing upload request:", error);
    response.status(500).json({ error: 'Failed to sign request.' });
  }
}