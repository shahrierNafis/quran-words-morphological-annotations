import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

async function main() {
  // Create a single supabase client for interacting with your database
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const s3Client = new S3Client({
    forcePathStyle: true,

    endpoint: process.env.S3_Endpoint!,
    credentials: {
      accessKeyId: process.env.S3_Access_key_ID!,
      secretAccessKey: process.env.S3_Secret_access_key!,
    },

    region: process.env.REGION,
  });

  const { data, error } = await supabase.storage
    .from("bucket1")
    .list("wordImage", { limit: 78000 });
  console.log(data?.length, error);
  if (data) {
    let count = data.length;
    fs.readdir("./wordImage", {}, async (err, files) => {
      if (err) console.log(err);
      else {
        let time = Date.now();
        const durations: number[] = [];
        for (const file of files) {
          if (!data.some((i) => i.name == file)) {
            const image = await fs.promises.readFile("./wordImage/" + file);
            const uploadCommand = new PutObjectCommand({
              Bucket: "bucket1",
              Key: "wordImage/" + file,
              Body: image,
            });

            const result = await s3Client.send(uploadCommand);

            if (result.$metadata.httpStatusCode != 200) {
              main();
              break;
            }
            count++;
            const newTime = Date.now();
            durations.push(newTime - time);
            time = newTime;
            const meanDuration =
              durations
                .slice(Math.max(durations.length - 10, 0)) //last 10
                .reduce((a, b) => a + b, 0) / 10;
            console.log(
              "remaining time: " +
                new Date(meanDuration * (77429 - count))
                  .toISOString()
                  .slice(11, 19)
            );
            console.log(durations.slice(Math.max(durations.length - 10, 0)));

            console.log(file);
            console.log(count);
          }
        }
      }
    });
  }
}
main();
