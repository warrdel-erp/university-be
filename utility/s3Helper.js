import AWS from "aws-sdk";
import fs from "fs";
import path from "path";

import { AWS_BUCKET_NAME, AWS_BUCKET_PREFIX, s3Client as s3 } from "./awsConfig.js";

function ensureAwsConfigured() {
  if (!s3) {
    throw new Error(
      "AWS S3 is not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment variables."
    );
  }
}

/**
 * Generates a pre-signed PUT URL for uploading a file directly to S3.
 * @param {string} key - S3 object key (usually a UUID)
 * @param {string} mimeType - The expected MIME type of the file
 * @param {number} expiresSec - Number of seconds until the URL expires (default: 3600)
 * @returns {Promise<string>} Pre-signed upload URL
 */
export async function getUploadSignedUrl(key, mimeType, expiresSec = 3600) {
  ensureAwsConfigured();

  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: AWS_BUCKET_PREFIX + key,
    ContentType: mimeType,
    Expires: expiresSec,
  };

  return new Promise((resolve, reject) => {
    s3.getSignedUrl("putObject", params, (err, url) => {
      if (err) {
        console.error("Error generating S3 pre-signed URL:", err);
        return reject(err);
      }
      resolve(url);
    });
  });
}

/**
 * Generates a pre-signed GET URL for downloading/viewing a file from S3.
 * @param {string} key - S3 object key
 * @param {number} expiresSec - Number of seconds until the URL expires (default: 3600)
 * @returns {Promise<string>} Pre-signed download URL
 */
export async function getDownloadSignedUrl(key, expiresSec = 3600) {
  ensureAwsConfigured();

  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: AWS_BUCKET_PREFIX + key,
    Expires: expiresSec,
  };

  return new Promise((resolve, reject) => {
    s3.getSignedUrl("getObject", params, (err, url) => {
      if (err) {
        console.error("Error generating S3 pre-signed download URL:", err);
        return reject(err);
      }
      resolve(url);
    });
  });
}

/**
 * Verifies a file in S3 using HeadObject.
 * @param {string} key - S3 object key
 * @returns {Promise<{ size: number, mime: string }>} Object size and type
 */
export async function verifyFileInS3(key) {
  ensureAwsConfigured();

  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: AWS_BUCKET_PREFIX + key,
  };

  try {
    const data = await s3.headObject(params).promise();
    return {
      size: parseInt(data.ContentLength, 10),
      mime: data.ContentType,
    };
  } catch (error) {
    console.error(`Error executing S3 HeadObject for key ${key}:`, error);
    throw new Error(`File verification failed: File not found in storage or S3 error.`);
  }
}

/**
 * Downloads a file from S3 to a local file path.
 * @param {string} key - S3 object key
 * @param {string} localFilePath - Local destination file path
 */
export async function downloadFileFromS3(key, localFilePath) {
  ensureAwsConfigured();

  // Ensure parent directory exists for localFilePath
  fs.mkdirSync(path.dirname(localFilePath), { recursive: true });

  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: AWS_BUCKET_PREFIX + key,
  };

  const fileStream = fs.createWriteStream(localFilePath);
  return new Promise((resolve, reject) => {
    s3.getObject(params)
      .createReadStream()
      .on("error", (err) => {
        console.error(`S3 download error for key ${key}:`, err);
        reject(err);
      })
      .pipe(fileStream)
      .on("error", (err) => {
        console.error(`Write stream error during S3 download:`, err);
        reject(err);
      })
      .on("close", () => {
        resolve();
      });
  });
}

/**
 * Downloads a file from S3 directly into memory as a Buffer.
 * @param {string} key - S3 object key
 * @returns {Promise<Buffer>} The file buffer
 */
export async function getFileBufferFromS3(key) {
  ensureAwsConfigured();

  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: AWS_BUCKET_PREFIX + key,
  };

  try {
    const data = await s3.getObject(params).promise();
    return data.Body;
  } catch (error) {
    console.error(`Error downloading file buffer for key ${key}:`, error);
    throw new Error(`Failed to download file from S3.`);
  }
}

/**
 * Uploads a local file or buffer to S3.
 * @param {string|Buffer|Uint8Array} fileSource - Path to the local file, or direct Buffer/Uint8Array
 * @param {string} key - Target S3 object key
 * @param {string} mimeType - Content MIME type
 * @returns {Promise<string>} S3 object URL
 */
export async function uploadFileToS3(fileSource, key, mimeType) {
  ensureAwsConfigured();

  const fileBuffer = Buffer.isBuffer(fileSource) || fileSource instanceof Uint8Array
    ? fileSource
    : fs.readFileSync(fileSource);

  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: AWS_BUCKET_PREFIX + key,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  await s3.putObject(params).promise();
  return `https://${AWS_BUCKET_NAME}.s3.amazonaws.com/${AWS_BUCKET_PREFIX}${key}`;
}

/**
 * Lists all files in the S3 bucket.
 * @param {string} prefix - Optional prefix to filter files
 * @returns {Promise<Array>} List of objects in S3
 */
export async function listFilesInS3(prefix = "") {
  ensureAwsConfigured();

  const params = {
    Bucket: AWS_BUCKET_NAME,
    Prefix: AWS_BUCKET_PREFIX + prefix,
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    return data.Contents;
  } catch (error) {
    console.error("Error executing S3 ListObjectsV2:", error);
    throw new Error("Failed to list files from S3 storage.");
  }
}
