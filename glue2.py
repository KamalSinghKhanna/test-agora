import sys
import boto3
import json
from pyspark.context import SparkContext
from awsglue.context import GlueContext

sc = SparkContext()
glueContext = GlueContext(sc)

# Job parameters
source_bucket = "your-source-bucket"
source_prefix = "your/source/folder/"
target_bucket = "your-target-bucket"
target_prefix = "your/target/folder/"
new_client_id = "new-client-id"

# List all source file keys from S3
def list_all_keys(bucket, prefix):
    s3 = boto3.client("s3")
    paginator = s3.get_paginator("list_objects_v2")
    keys = []
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            if not obj["Key"].endswith("/"):
                keys.append(obj["Key"])
    return keys

# Main function to update clientId and write file to target location
def process_file(key):
    import boto3
    import json

    s3 = boto3.client("s3")

    try:
        obj = s3.get_object(Bucket=source_bucket, Key=key)
        content = json.loads(obj["Body"].read())

        # Update clientId
        content["clientId"] = new_client_id

        # Create new key for target
        file_name = key.split("/")[-1]
        new_key = f"{target_prefix}{file_name}"

        s3.put_object(
            Bucket=target_bucket,
            Key=new_key,
            Body=json.dumps(content).encode("utf-8"),
            ContentType="application/json",
        )

        print(f"✅ Processed: {key} -> {new_key}")
    except Exception as e:
        print(f"❌ Error processing {key}: {e}")

# Step 1: List keys
print("📂 Listing all files...")
all_keys = list_all_keys(source_bucket, source_prefix)
print(f"🔍 Found {len(all_keys)} files")

# Step 2: Distribute the keys across Spark
rdd = sc.parallelize(all_keys)

# Step 3: Process each file in parallel
rdd.foreach(process_file)

print("✅ All files processed.")
