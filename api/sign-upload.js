// NEW CODE AFTER FIXING MODERATION

// api/sign-upload.js
const cloudinary = require('cloudinary').v2;

const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

async function handler(request, response) {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  const tag = process.env.CLOUDINARY_TAG;

  if (!cloud_name || !api_key || !api_secret) {
    return response.status(500).json({ error: 'Cloudinary environment variables not set.' });
  }

  cloudinary.config({ cloud_name, api_key, api_secret });

  try {
    if (request.method === 'POST') {
      // --- Upload Signing ---
      const body = request.body;
      const paramsToSign = body.paramsToSign;

      if (!paramsToSign) {
        return response.status(400).json({ error: 'Missing parameters to sign.' });
      }

      // Always enforce moderation: "manual"
      paramsToSign.moderation = 'manual';

      const signature = cloudinary.utils.api_sign_request(paramsToSign, api_secret);

      return response.status(200).json({
        signature,
        timestamp: paramsToSign.timestamp,
        api_key
      });
    }

    if (request.method === 'GET') {
      // --- Fetch Approved Images ---
      const { resources } = await cloudinary.api.resources_by_tag(tag, {
        moderation_status: "approved",
        max_results: 500
      });

      return response.status(200).json({ resources });
    }

    return response.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error("Error in Cloudinary handler:", error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
}

export default allowCors(handler);


// // NEW CODE AFTER ADDING LOCATION 
// // api/sign-upload.js
// const cloudinary = require('cloudinary').v2;

// const allowCors = fn => async (req, res) => {
//   res.setHeader('Access-Control-Allow-Credentials', true);
//   res.setHeader('Access-Control-Allow-Origin', '*'); // Or your specific Shopify domain
//   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
//   if (req.method === 'OPTIONS') {
//     res.status(200).end();
//     return;
//   }
//   return await fn(req, res);
// };

// async function signUploadHandler(request, response) {
//   if (request.method !== 'POST') {
//     return response.status(405).json({ error: 'Method Not Allowed' });
//   }

//   const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
//   const api_key = process.env.CLOUDINARY_API_KEY;
//   const api_secret = process.env.CLOUDINARY_API_SECRET;

//   if (!cloud_name || !api_key || !api_secret) {
//       return response.status(500).json({ error: 'Cloudinary environment variables not set.' });
//   }

//   cloudinary.config({ cloud_name, api_key, api_secret });
  
//   try {
//     const body = request.body;
//     const paramsToSign = body.paramsToSign;

//     if (!paramsToSign) {
//       return response.status(400).json({ error: 'Missing parameters to sign.' });
//     }

//     // Generate the signature using the parameters from the request
//     const signature = cloudinary.utils.api_sign_request(paramsToSign, api_secret);

//     // Return the signature AND the public data needed for the upload
//     response.status(200).json({
//       signature: signature,
//       timestamp: paramsToSign.timestamp,
//       api_key: api_key
//     });

//   } catch (error) {
//     console.error("Error signing upload request:", error);
//     response.status(500).json({ error: 'Failed to sign request.' });
//   }
// }

// export default allowCors(signUploadHandler);
// // END NEW CODE 

// // // api/sign-upload.js
// // const cloudinary = require('cloudinary').v2;

// // // --- Helper function to set CORS headers ---
// // const allowCors = fn => async (req, res) => {
// //   res.setHeader('Access-Control-Allow-Credentials', true);
// //   res.setHeader('Access-Control-Allow-Origin', '*'); // Or your specific Shopify domain
// //   // res.setHeader('Access-Control-Allow-Origin', 'https://shop.runtheedge.com'); // More secure
// //   res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
// //   res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
// //   // This is a pre-flight request. Browser sends it to check permissions.
// //   if (req.method === 'OPTIONS') {
// //     res.status(200).end();
// //     return;
// //   }
// //   return await fn(req, res);
// // };

// // // --- Your original function logic ---
// // function signUploadHandler(request, response) {
// //   const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
// //   const api_key = process.env.CLOUDINARY_API_KEY;
// //   const api_secret = process.env.CLOUDINARY_API_SECRET;

// //   cloudinary.config({ cloud_name, api_key, api_secret });

// //   const timestamp = Math.round(new Date().getTime() / 1000);
// //   const upload_preset = 'shopify_community_gallery'; 

// //   try {
// //     const signature = cloudinary.utils.api_sign_request(
// //       {
// //         timestamp: timestamp,
// //         upload_preset: upload_preset,
// //       },
// //       api_secret
// //     );

// //     response.status(200).json({
// //       signature,
// //       timestamp,
// //       api_key,
// //     });
// //   } catch (error) {
// //     console.error("Error signing upload request:", error);
// //     response.status(500).json({ error: 'Failed to sign request.' });
// //   }
// // }

// // // --- Wrap your handler with the CORS helper ---
// // export default allowCors(signUploadHandler);



