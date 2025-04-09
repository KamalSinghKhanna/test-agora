import boto3
import json
import concurrent.futures
import sys
import math
from urllib.parse import urlparse

# Job params from GUI
args = sys.argv
source_bucket = "your-source-bucket"
source_prefix = "your/source/folder/"
target_bucket = "your-target-bucket"
target_prefix = "your/target/folder/"
new_client_id = "new-client-id"

# Read job arguments
job_index = int(args[1]) if len(args) > 1 else 0
total_jobs = int(args[2]) if len(args) > 2 else 1

s3 = boto3.client('s3')

def list_all_files():
    keys = []
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=source_bucket, Prefix=source_prefix):
        for obj in page.get('Contents', []):
            if not obj['Key'].endswith('/'):
                keys.append(obj['Key'])
    return keys

def process_file(key):
    try:
        obj = s3.get_object(Bucket=source_bucket, Key=key)
        content = json.loads(obj['Body'].read())

        # Update clientId
        content['clientId'] = new_client_id

        # Write to target
        s3.put_object(
            Bucket=target_bucket,
            Key=target_prefix + key.split('/')[-1],
            Body=json.dumps(content).encode('utf-8'),
            ContentType='application/json'
        )
    except Exception as e:
        print(f"Error processing {key}: {e}")

# Step 1: List all files
all_keys = list_all_files()

# Step 2: Filter keys for this job only
# We'll use simple round-robin distribution
assigned_keys = [key for i, key in enumerate(all_keys) if i % total_jobs == job_index]

print(f"Processing {len(assigned_keys)} files for job index {job_index}...")

# Step 3: Process in parallel
with concurrent.futures.ThreadPoolExecutor(max_workers=150) as executor:
    executor.map(process_file, assigned_keys)

print("✅ Job complete")


# create multiple jobs with this parameter
--jobIndex    0
--totalJobs   5
