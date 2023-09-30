import AWS from "aws-sdk";

export async function uploadToS3(file: File) {
  try {
    AWS.config.update({
      accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
    });

    const s3 = new AWS.S3({
      params: {
        Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
      },
      region: "ap-southeast-2",
    });

    const file_key =
      "uploads/" + Date.now().toString() + file.name.replace(/ /g, "-");

    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
      Key: file_key,
      Body: file,
    } as AWS.S3.PutObjectRequest; // This type assertion ensures that params matches the expected type

    const upload = s3
      .putObject(params)
      .on("httpUploadProgress", (evt) => {
        console.log(
          `Uploading to s3...: ${Math.round((evt.loaded / evt.total) * 100)}%`
        );
      })
      .promise();

    await upload.then(() => {
      console.log("File uploaded to s3", file_key);
    });
    return Promise.resolve({
      file_key,
      file_name: file.name,
    });
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error; // Re-throw the error for further handling
  }
}

export function getS3Url(file_key: string) {
  const url = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.ap-southeast-2.amazonaws.com/${file_key}`;
  return url;
}
