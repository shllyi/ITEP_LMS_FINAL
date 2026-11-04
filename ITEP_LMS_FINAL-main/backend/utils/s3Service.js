const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

const hasAwsCredentials = () => Boolean(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  !process.env.AWS_ACCESS_KEY_ID.includes('YOUR_KEY')
);

const createS3Client = () => new S3Client({
  region: process.env.AWS_S3_BUCKET_REGION || process.env.AWS_REGION || 'ap-southeast-2',
  followRegionRedirects: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Generate a SigV4 presigned GET URL for viewing or downloading private S3 objects.
 * Defaults to 7 days expiration (maximum permitted for SigV4).
 */
async function getPresignedViewUrl(s3Key, fileName = 'presentation', expiresInSeconds = 604800) {
  if (!s3Key || !hasAwsCredentials()) return '';
  try {
    const bucket = process.env.AWS_S3_BUCKET || 'project-lms-files';
    const s3Client = createS3Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ResponseContentDisposition: `inline; filename="${fileName}"`,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    console.warn('getPresignedViewUrl error:', err.message);
    return '';
  }
}

module.exports = {
  hasAwsCredentials,
  createS3Client,
  getPresignedViewUrl,
};

