// api/sign-upload.js
const cloudinary = require('cloudinary').v2;

// --- Helper function to set CORS headers ---
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or your specific Shopify domain
  // res.setHeader('Access-Control-Allow-Origin', 'https://shop.runtheedge.com'); // More secure
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // This is a pre-flight request. Browser sends it to check permissions.
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// --- Your original function logic ---
function signUploadHandler(request, response) {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  cloudinary.config({ cloud_name, api_key, api_secret });

  const timestamp = Math.round(new Date().getTime() / 1000);
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

// --- Wrap your handler with the CORS helper ---
export default allowCors(signUploadHandler);
