// api/sign-upload.js
//
// Backend for the Finishers Wall (and any other wall sharing this backend).
// Cloudinary is the shared image store. Uploads go live immediately.
//
// Required environment variables (set these in Vercel, then REDEPLOY):
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
//   CLOUDINARY_TAG            default tag used when GET has no ?tag=
//   ADMIN_DELETE_PASSCODE     shared secret checked server-side before any delete
//
// Routes:
//   POST   /api/sign-upload              -> sign upload params
//   GET    /api/sign-upload?tag=<tag>    -> list bibs with that tag
//   DELETE /api/sign-upload              -> remove one bib (passcode required)

const cloudinary = require('cloudinary').v2;

// Tags a client is allowed to request via ?tag=. Add your other walls' tags here.
const EXTRA_ALLOWED_TAGS = ['finisher_wall_2026'];

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
  const envTag = (process.env.CLOUDINARY_TAG || '').trim();
  const admin_passcode = process.env.ADMIN_DELETE_PASSCODE;

  if (!cloud_name || !api_key || !api_secret) {
    return response.status(500).json({ error: 'Cloudinary environment variables not set.' });
  }

  cloudinary.config({ cloud_name, api_key, api_secret });

  try {
    // POST — sign the params for a new upload.
    if (request.method === 'POST') {
      const body = request.body || {};
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

    // GET — list every bib with the requested tag (paginated past 500).
    if (request.method === 'GET') {
      const allowedTags = [envTag].concat(EXTRA_ALLOWED_TAGS).filter(Boolean);
      const requested = request.query && request.query.tag
        ? String(request.query.tag).trim()
        : '';

      if (requested && allowedTags.indexOf(requested) === -1) {
        return response.status(400).json({ error: 'Tag not allowed.' });
      }

      const listTag = requested || envTag;
      if (!listTag) {
        return response.status(500).json({ error: 'No tag specified and CLOUDINARY_TAG is not set.' });
      }

      let resources = [];
      let next_cursor;
      do {
        const page = await cloudinary.api.resources_by_tag(listTag, {
          context: true,
          max_results: 500,
          next_cursor
        });
        resources = resources.concat(page.resources || []);
        next_cursor = page.next_cursor;
      } while (next_cursor);

      response.setHeader('Cache-Control', 'no-store');
      // "tag" and "count" make it obvious which tag was actually read.
      return response.status(200).json({ tag: listTag, count: resources.length, resources });
    }

    // DELETE — admin-only, passcode checked server-side.
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
