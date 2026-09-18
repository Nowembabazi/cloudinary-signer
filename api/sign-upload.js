// api/sign-upload.js
//
// Backend for the Finishers Wall. Cloudinary is the shared image store —
// every visitor who hits GET sees the same set of bibs, tagged with
// CLOUDINARY_TAG. Uploads go live immediately (no moderation step).
//
// Required environment variables (set these in Vercel):
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
//   CLOUDINARY_TAG            e.g. "finisher_wall_2026"
//   ADMIN_DELETE_PASSCODE     shared secret checked server-side before any delete
//
// Routes:
//   POST   /api/sign-upload   -> sign upload params for a new bib
//   GET    /api/sign-upload   -> list all bibs currently tagged CLOUDINARY_TAG
//   DELETE /api/sign-upload   -> remove one bib (admin only, passcode required)

const cloudinary = require('cloudinary').v2;

const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
  const admin_passcode = process.env.ADMIN_DELETE_PASSCODE;

  if (!cloud_name || !api_key || !api_secret) {
    return response.status(500).json({ error: 'Cloudinary environment variables not set.' });
  }

  cloudinary.config({ cloud_name, api_key, api_secret });

  try {
    // ------------------------------------------------------------
    // POST — sign the params for a new upload. No moderation flag,
    // so the asset is public and live the moment the upload succeeds.
    // ------------------------------------------------------------
    if (request.method === 'POST') {
      const body = request.body;
      const paramsToSign = body.paramsToSign;

      if (!paramsToSign) {
        return response.status(400).json({ error: 'Missing parameters to sign.' });
      }

      const signature = cloudinary.utils.api_sign_request(paramsToSign, api_secret);

      return response.status(200).json({
        signature,
        timestamp: paramsToSign.timestamp,
        api_key
      });
    }

    // ------------------------------------------------------------
    // GET — return every bib currently tagged, with its context
    // metadata (name, country, date, challengeType, mileGoal) so
    // the wall can render without a separate database.
    // ------------------------------------------------------------
    if (request.method === 'GET') {
      const { resources } = await cloudinary.api.resources_by_tag(tag, {
        context: true,
        max_results: 500
      });

      return response.status(200).json({ resources });
    }

    // ------------------------------------------------------------
    // DELETE — admin-only bib removal. The passcode is checked here,
    // server-side, against an environment variable — not against
    // anything shipped to the browser. This is the real enforcement
    // point; the client's "admin mode" is just a UI convenience that
    // decides whether to show delete buttons and prompt for this code.
    // ------------------------------------------------------------
    if (request.method === 'DELETE') {
      const body = request.body || {};
      const { public_id, passcode } = body;

      if (!public_id) {
        return response.status(400).json({ error: 'Missing public_id.' });
      }
      if (!admin_passcode || passcode !== admin_passcode) {
        return response.status(401).json({ error: 'Invalid admin passcode.' });
      }

      const result = await cloudinary.uploader.destroy(public_id);
      return response.status(200).json({ result });
    }

    return response.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Error in Cloudinary handler:', error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
}

export default allowCors(handler);
