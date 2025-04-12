import sys
import boto3
import json
from awsglue.context import GlueContext
from pyspark.context import SparkContext
from pyspark.sql import SparkSession
from urllib.parse import urlparse

# Initialize Spark and Glue contexts
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session

# ----- CONFIGURATION -----
source_bucket = "your-source-bucket"
source_prefix = "your/source/folder/"
target_bucket = "your-target-bucket"
target_prefix = "your/target/folder/"
new_client_id = "new-client-id"

# Initialize boto3 client
s3_client = boto3.client("s3")

# Get list of all source keys
def list_all_files(bucket, prefix):
    keys = []
    paginator = s3_client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            if not obj["Key"].endswith("/"):
                keys.append(obj["Key"])
    return keys

# Process single file: read → modify → write
def process_file(key):
    try:
        # Read JSON content
        obj = s3_client.get_object(Bucket=source_bucket, Key=key)
        content = json.loads(obj["Body"].read())

        # Update clientId
        content["clientId"] = new_client_id

        # Compose new key
        file_name = key.split("/")[-1]
        target_key = f"{target_prefix}{file_name}"

        # Write back to target S3
        s3_client.put_object(
            Bucket=target_bucket,
            Key=target_key,
            Body=json.dumps(content).encode("utf-8"),
            ContentType="application/json"
        )
        print(f"✅ Processed: {key}")
    except Exception as e:
        print(f"❌ Error processing {key}: {str(e)}")

# Main logic
if __name__ == "__main__":
    print("📂 Listing all files...")
    all_keys = list_all_files(source_bucket, source_prefix)
    print(f"🔢 Found {len(all_keys)} files.")

    # Parallelize file keys as RDD
    rdd = sc.parallelize(all_keys)

    # Apply function
    rdd.foreach(process_file)

    print("✅ Glue Spark Job Complete.")
