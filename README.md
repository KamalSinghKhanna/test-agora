import boto3
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

# ---- Config ----
SOURCE_BUCKET = 'your-source-bucket'
SOURCE_PREFIX = 'your/source/prefix/'  # trailing slash
TARGET_BUCKET = 'your-target-bucket'
TARGET_PREFIX = 'your/target/prefix/'  # trailing slash
NEW_CLIENT_ID = 'new-client-id-1234'

MAX_WORKERS = 100  # Adjust based on job capacity (100–200 for high memory job)

s3 = boto3.client('s3')


# ---- List All Files in Batches ----
def list_all_files(bucket, prefix):
    paginator = s3.get_paginator('list_objects_v2')
    page_iterator = paginator.paginate(Bucket=bucket, Prefix=prefix)
    for page in page_iterator:
        for obj in page.get('Contents', []):
            if not obj['Key'].endswith('/'):
                yield obj['Key']


# ---- Process One File ----
def process_file(key):
    try:
        obj = s3.get_object(Bucket=SOURCE_BUCKET, Key=key)
        content = obj['Body'].read().decode('utf-8')

        data = json.loads(content)

        if 'clientId' not in data:
            print(f"[SKIP] No clientId in {key}")
            return

        data['clientId'] = NEW_CLIENT_ID
        updated_content = json.dumps(data)

        # Same filename
        relative_path = key[len(SOURCE_PREFIX):]
        target_key = os.path.join(TARGET_PREFIX, relative_path)

        s3.put_object(
            Bucket=TARGET_BUCKET,
            Key=target_key,
            Body=updated_content.encode('utf-8'),
            ContentType='application/json'
        )

        print(f"[OK] {key} → {target_key}")

    except Exception as e:
        print(f"[ERROR] {key}: {str(e)}")


# ---- Parallel Batch Runner ----
def run_parallel(file_keys, max_workers=MAX_WORKERS):
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_file, key): key for key in file_keys}
        for future in as_completed(futures):
            pass  # already logged inside process_file


# ---- Main ----
def main():
    batch = []
    batch_size = 1000  # Tune based on memory
    count = 0

    print("Starting to list and process files...")

    for key in list_all_files(SOURCE_BUCKET, SOURCE_PREFIX):
        batch.append(key)
        if len(batch) >= batch_size:
            print(f"[Batch] Processing {len(batch)} files...")
            run_parallel(batch)
            count += len(batch)
            batch.clear()

    if batch:
        print(f"[Batch] Processing final {len(batch)} files...")
        run_parallel(batch)
        count += len(batch)

    print(f"✅ Finished processing {count} files.")


main()