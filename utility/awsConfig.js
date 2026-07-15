import "dotenv/config";
import AWS from "aws-sdk";

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const rawBucketName = process.env.AWS_BUCKET_NAME;

if (!rawBucketName) {
  throw new Error("AWS_BUCKET_NAME is not defined in environment variables");
}

let AWS_BUCKET_NAME = rawBucketName;
let AWS_BUCKET_PREFIX = "";

if (rawBucketName.includes("/")) {
  const parts = rawBucketName.split("/");
  AWS_BUCKET_NAME = parts.shift();
  AWS_BUCKET_PREFIX = parts.join("/") + "/";
}

const isAwsConfigured = !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);

let s3Client = null;
if (isAwsConfigured) {
  s3Client = new AWS.S3({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION,
    signatureVersion: "v4",
  });
  console.log(">>>>> AWS S3 configured successfully >>>>>");
} else {
  console.warn(
    "⚠️ AWS S3 credentials not found in env. S3 features will fail until credentials are set."
  );
}

export { AWS_BUCKET_NAME, AWS_BUCKET_PREFIX, s3Client, isAwsConfigured };
