// server/services/Jobs/mediaFileServices.js
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

class S3FolderCopy {
  constructor(config = {}) {
    this.s3 = new AWS.S3(config);
    this.copyStatuses = new Map();
  }

  async copyFolder({ sourceBucket, sourcePrefix, targetBucket, targetPrefix, taskId }) {
    const operationId = taskId || uuidv4();

    this.copyStatuses.set(operationId, {
      status: 'IN_PROGRESS',
      filesProcessed: 0,
      totalFiles: 0,
      percentComplete: 0,
    });

    try {
      const listedObjects = await this.s3.listObjectsV2({
        Bucket: sourceBucket,
        Prefix: sourcePrefix,
      }).promise();

      const files = listedObjects.Contents || [];
      const totalFiles = files.length;

      this.copyStatuses.get(operationId).totalFiles = totalFiles;

      const copyPromises = files.map(async (file, index) => {
        const sourceKey = file.Key;
        const destKey = sourceKey.replace(sourcePrefix, targetPrefix);

        await this.s3.copyObject({
          Bucket: targetBucket,
          CopySource: `${sourceBucket}/${sourceKey}`,
          Key: destKey,
        }).promise();

        const status = this.copyStatuses.get(operationId);
        status.filesProcessed += 1;
        status.percentComplete = Math.floor((status.filesProcessed / totalFiles) * 100);
      });

      await Promise.all(copyPromises);
      this.copyStatuses.set(operationId, {
        ...this.copyStatuses.get(operationId),
        status: 'COMPLETED',
        percentComplete: 100,
      });
    } catch (error) {
      this.copyStatuses.set(operationId, {
        status: 'FAILED',
        error: error.message,
        filesProcessed: 0,
        totalFiles: 0,
        percentComplete: 0,
      });
    }
  }

  getCopyStatus(taskId) {
    return this.copyStatuses.get(taskId);
  }
}

module.exports = { S3FolderCopy };
// server/services/Jobs/mediaFileServices.js
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

class S3FolderCopy {
  constructor(config = {}) {
    this.s3 = new AWS.S3(config);
    this.copyStatuses = new Map();
  }

  async copyFolder({ sourceBucket, sourcePrefix, targetBucket, targetPrefix, taskId }) {
    const operationId = taskId || uuidv4();

    this.copyStatuses.set(operationId, {
      status: 'IN_PROGRESS',
      filesProcessed: 0,
      totalFiles: 0,
      percentComplete: 0,
    });

    try {
      const listedObjects = await this.s3.listObjectsV2({
        Bucket: sourceBucket,
        Prefix: sourcePrefix,
      }).promise();

      const files = listedObjects.Contents || [];
      const totalFiles = files.length;

      this.copyStatuses.get(operationId).totalFiles = totalFiles;

      const copyPromises = files.map(async (file, index) => {
        const sourceKey = file.Key;
        const destKey = sourceKey.replace(sourcePrefix, targetPrefix);

        await this.s3.copyObject({
          Bucket: targetBucket,
          CopySource: `${sourceBucket}/${sourceKey}`,
          Key: destKey,
        }).promise();

        const status = this.copyStatuses.get(operationId);
        status.filesProcessed += 1;
        status.percentComplete = Math.floor((status.filesProcessed / totalFiles) * 100);
      });

      await Promise.all(copyPromises);
      this.copyStatuses.set(operationId, {
        ...this.copyStatuses.get(operationId),
        status: 'COMPLETED',
        percentComplete: 100,
      });
    } catch (error) {
      this.copyStatuses.set(operationId, {
        status: 'FAILED',
        error: error.message,
        filesProcessed: 0,
        totalFiles: 0,
        percentComplete: 0,
      });
    }
  }

  getCopyStatus(taskId) {
    return this.copyStatuses.get(taskId);
  }
}

module.exports = { S3FolderCopy };
