const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");

const pipelineAsync = promisify(pipeline);

// Initialize the S3 client
const s3Client = new S3Client({
  region: "",
  credentials: {
    accessKeyId: "",
    secretAccessKey: ""
  }
});

const targetS3Client = new S3Client({
region: "", // Set the target bucket's region
credentials: {
  accessKeyId: "",
  secretAccessKey: "",
},
});

async function downloadAsset(bucketName, key, downloadPath, retries = 3) {
    const getObjectParams = { Bucket: bucketName, Key: key };
    const command = new GetObjectCommand(getObjectParams);

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await s3Client.send(command);
            await pipelineAsync(response.Body, fs.createWriteStream(downloadPath));
            console.log(`Downloaded ${key} to ${downloadPath}`);
            return;
        } catch (error) {
            console.error(`Attempt ${attempt} to download ${key} failed:`, error.message);
            if (attempt === retries) throw new Error(`Failed to download ${key} after ${retries} attempts`);
        }
    }
}

async function uploadAsset(bucketName, key, filePath, retries = 3) {
    const fileStream = fs.createReadStream(filePath);
    const putObjectParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileStream
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await targetS3Client.send(new PutObjectCommand(putObjectParams));
            console.log(`Uploaded ${key} to ${bucketName}`);
            return;
        } catch (error) {
            console.error(`Attempt ${attempt} to upload ${key} failed:`, error.message);
            if (attempt === retries) throw new Error(`Failed to upload ${key} after ${retries} attempts`);
        }
    }
}

async function transferAssets(sourceBucket, targetBucket, keys) {
    const tempDir = path.join(__dirname, "tempDownloads");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    for (const key of keys) {
        const downloadPath = path.join(tempDir, path.basename(key));
        
        // Step 1: Download from source bucket
        await downloadAsset(sourceBucket, key, downloadPath);

        // Step 2: Upload to target bucket
        await uploadAsset(targetBucket, key, downloadPath);

        // Step 3: Clean up temporary download file
        await fs.promises.unlink(downloadPath).catch(console.error);
    }
}

// Usage
const sourceBucket = "";
const targetBucket = "";
const assetKeys = [
    // Add all the object keys in this array
]

transferAssets(sourceBucket, targetBucket, assetKeys)
    .then(() => console.log("Asset transfer completed."))
    .catch(error => console.error("Error during asset transfer:", error));
