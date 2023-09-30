import AWS from "aws-sdk";
import fs from "fs";

export async function downloadFromS3(fileKey: string): Promise<string | null> {
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

    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: fileKey,
    };

    const { Body } = await s3.getObject(params).promise();

    const fileName = `/tmp/pdf-${Date.now()}.pdf`;
    if (!fs.existsSync("/tmp")) {
      fs.mkdirSync("/tmp");
    }
    fs.writeFileSync(fileName, Body as Buffer);
    return fileName;
  } catch (error) {
    console.error(error);
    return null;
  }
}
